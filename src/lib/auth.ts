import type { NextAuthOptions } from "next-auth";
import type { User as PrismaUser } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { modulosPorDefecto } from "./modulos";
import { registrarAuditoria } from "./audit";
import { normalizarTelefono } from "./telefono";
import { verificarLimite } from "./rate-limit";
import {
  MENSAJE_EMAIL_NO_VERIFICADO,
  MENSAJE_MFA_REQUERIDO,
  MENSAJE_MFA_CODIGO_INVALIDO,
  MENSAJE_CAMPESINO_REQUIERE_CODIGO,
} from "./auth-shared";
import { leerCookieDispositivo, DISPOSITIVO_VIGENCIA_DIAS } from "./campesino-vinculacion";
import { hashToken } from "./tokens";
import { desencriptarSecreto, verificarCodigoTOTP, verificarYConsumirCodigoRespaldo } from "./mfa";
import {
  crearSesion,
  sesionEsValida,
  revocarSesionPorRawId,
  SESION_MAX_AGE_SEGUNDOS,
  SESION_REVALIDACION_STALENESS_MS,
} from "./sesiones";
import { rolLegacyARolIam } from "./authz/policies";

/**
 * Claims comunes que van al JWT/sesión — extraído del authorize() original
 * (login email/contraseña) para que el provider de celular (modo Campesino,
 * sin contraseña) y el de Google compartan exactamente el mismo cálculo de
 * esOwner/modulosPermitidos sin duplicar lógica. Extracción pura: mismo
 * orden de queries, mismo resultado que antes para el login existente.
 */
async function resolverClaimsSesion(user: PrismaUser) {
  // esOwner: ¿tiene alguna Membresia con rol OWNER? Determina si ve el
  // panel "Equipo" (Fase 2) — igual que esSuperAdmin, es un hint para
  // el JWT/UI, no la autorización real (esa se re-verifica en la API).
  const esOwner = await db.membresia.findFirst({
    where: { userId: user.id, rol: "OWNER", aceptada: true, activa: true },
    select: { id: true },
  });

  // ADR-011 Sprint 2 — membresías IAM embebidas en el JWT, para
  // `usePermission()` (src/lib/authz/use-permission.ts): el hook de cliente
  // evalúa `can()` con esto, sin ida y vuelta al servidor. Mismo criterio que
  // `requireAccess()` (src/lib/authz.ts): se recalcula con
  // `rolLegacyARolIam()` a partir de `rol`/`organizacion.tipo` en cada login,
  // no se lee ninguna columna "sombra" (`rolesIam`) que Equipo todavía no
  // mantiene sincronizada. Compacto a propósito (son las membresías de UN
  // usuario — normalmente 1, rara vez más de 2-3 — no las de una
  // organización entera).
  const membresiasActivas = await db.membresia.findMany({
    where: { userId: user.id, aceptada: true, activa: true },
    select: { organizacionId: true, rol: true, organizacion: { select: { tipo: true } } },
  });
  const membresias = membresiasActivas.flatMap((m) =>
    rolLegacyARolIam(m.rol, m.organizacion.tipo).map((rol) => ({
      rol,
      organizacionId: m.organizacionId,
      estado: "ACTIVA" as const,
    }))
  );

  // modulosPermitidos: qué menús del dashboard ve este usuario (capa
  // adicional de UX/navegación sobre el RBAC por recurso de authz.ts —
  // ver src/lib/modulos.ts). Dueño y Super Admin ven todo. Un
  // colaborador/administrador de finca ve lo que el dueño configuró en
  // su FincaAcceso (MVP: se asume un solo FincaAcceso activo relevante
  // por persona, igual que el resto del panel Equipo).
  let modulosPermitidos: string[] | "ALL" = "ALL";
  if (!user.esSuperAdmin && !esOwner) {
    const acceso = await db.fincaAcceso.findFirst({
      where: { userId: user.id },
      select: { rol: true, modulos: true },
      orderBy: { createdAt: "desc" },
    });
    modulosPermitidos = acceso
      ? acceso.modulos.length > 0
        ? acceso.modulos
        : modulosPorDefecto(acceso.rol)
      : [];
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    esSuperAdmin: user.esSuperAdmin,
    esOwner: !!esOwner,
    modulosPermitidos,
    membresias,
    // ADR-011 Sprint 6 — para el aviso "activa MFA" en el shell del
    // dashboard (Super Admin sin MFA todavía). No es la fuente de verdad de
    // si el login LO EXIGIÓ (eso ya se resolvió en authorize() antes de
    // llegar acá) — es solo el estado actual de la cuenta, para la UI.
    mfaHabilitado: user.mfaHabilitado,
  };
}

/** IP real del cliente detrás del proxy de Vercel — `x-forwarded-for` trae
 * una lista separada por comas (cliente, luego proxies intermedios); el
 * primer valor es el del cliente. Sin ese header (dev local sin proxy),
 * cae a un valor fijo — el rate limit sigue funcionando, solo agrupa a
 * todo el tráfico local bajo la misma clave, que es aceptable en dev.
 * Exportada (ADR-011 Sprint 5) — registrarAuditoria() (src/lib/audit.ts) la
 * reusa para ipAddress/userAgent, ahí con headers() de "next/headers" en vez
 * del req.headers/req de un provider de NextAuth. */
export function obtenerIp(headers: Record<string, string> | Headers | undefined): string {
  const valor =
    headers instanceof Headers
      ? headers.get("x-forwarded-for")
      : headers?.["x-forwarded-for"];
  return valor?.split(",")[0]?.trim() || "ip-desconocida";
}

/** User-Agent real del cliente — mismo criterio de "headers puede venir en
 * dos formas" que obtenerIp() de arriba. Se guarda tal cual (sin parsear
 * dispositivo/navegador) en Sesion.userAgent — ver ADR-011 Sprint 1.
 * Exportada (ADR-011 Sprint 5) — ver comentario de obtenerIp(). */
export function obtenerUserAgent(headers: Record<string, string> | Headers | undefined): string | undefined {
  const valor = headers instanceof Headers ? headers.get("user-agent") : headers?.["user-agent"];
  return valor ?? undefined;
}

export const authOptions: NextAuthOptions = {
  // maxAge explícito (ADR-011 Sprint 1) — mismo valor que NextAuth ya usaba
  // por default (30 días), ahora escrito en vez de heredado en silencio.
  // Diferenciar sesión más corta para roles privilegiados: Sprint 6 (MFA).
  session: { strategy: "jwt", maxAge: SESION_MAX_AGE_SEGUNDOS },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        // ADR-011 Sprint 6 — opcional: solo lo manda el formulario en el
        // segundo submit, después de que este mismo authorize() ya rechazó
        // el primero con MENSAJE_MFA_REQUERIDO (ver LoginEstandarForm.tsx).
        codigoMfa: { label: "Código de verificación", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Complementa (no reemplaza) el lockout por cuenta de abajo: ese
        // frena a alguien insistiendo contra UN email; esto frena a alguien
        // probando MUCHOS emails distintos desde la misma IP (relleno de
        // credenciales/enumeración), que el lockout por cuenta no cubre.
        await verificarLimite("loginPassword", `${obtenerIp(req?.headers)}:${credentials.email}`);

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.password) return null;

        // Fuerza bruta (OWASP A07) — antes no existía ningún contador, así
        // que un ataque de diccionario contra este mismo endpoint podía
        // reintentar sin límite. 5 intentos fallidos bloquean la cuenta 15
        // minutos; no revela al atacante si el email existe o no (mismo
        // mensaje "credenciales inválidas" que NextAuth ya usa por defecto).
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          const intentos = user.failedLoginAttempts + 1;
          const bloqueada = intentos >= 5;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: intentos,
              lockedUntil: bloqueada ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
          });
          if (bloqueada) {
            await registrarAuditoria({
              actorId: user.id,
              actorEmail: user.email,
              accion: "auth.cuenta_bloqueada",
              detalle: { intentosFallidos: intentos },
            });
          }
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        // Self-signup (Fase 1 SaaS, Tanda 2) — cuentas creadas por el
        // formulario de registro público no pueden entrar hasta confirmar
        // el correo. Cuentas viejas (creadas por Equipo/backfill, antes de
        // que existiera esta verificación) tienen emailVerificado
        // backfilleado a su createdAt en el propio db push — nunca se
        // bloquean retroactivamente por un campo que no existía cuando se
        // crearon.
        if (!user.emailVerificado) {
          throw new Error(MENSAJE_EMAIL_NO_VERIFICADO);
        }

        // ADR-011 Sprint 6 — MFA obligatorio SOLO para quien ya lo activó
        // (una vez encendido, siempre se exige). Para Super Admin sin MFA
        // todavía, decisión explícita de producto: "aviso primero, bloqueo
        // después" — no se bloquea el login acá, se avisa en el dashboard
        // (ver mfaHabilitado en resolverClaimsSesion()). Google/Campesino no
        // pasan por este challenge (ver docs/ADR-011-notas-de-implementacion.md).
        if (user.mfaHabilitado) {
          // Defensa en profundidad — hallazgo de QA real (2026-09-23):
          // next-auth serializa un `undefined` en el body de signIn() como
          // el STRING "undefined", no como ausente (ver el comentario
          // gemelo en LoginEstandarForm.tsx, ya corregido ahí). Si algún
          // otro caller repitiera ese error, esto evita que "undefined" se
          // trate como un código real en vez de "no llegó ninguno".
          const codigoMfa = credentials.codigoMfa?.trim();
          if (!codigoMfa || codigoMfa === "undefined") {
            throw new Error(MENSAJE_MFA_REQUERIDO);
          }

          // Mismo criterio que loginPassword: frena fuerza bruta contra el
          // código de 6 dígitos, ya con la contraseña confirmada.
          await verificarLimite("mfaVerificacion", `${obtenerIp(req?.headers)}:${credentials.email}`);

          let mfaValido = false;
          if (user.mfaSecret) {
            mfaValido = await verificarCodigoTOTP(desencriptarSecreto(user.mfaSecret), codigoMfa);
          }
          if (!mfaValido) {
            const { valido, codigosRestantes } = verificarYConsumirCodigoRespaldo(user.mfaBackupCodes, codigoMfa);
            if (valido) {
              mfaValido = true;
              await db.user.update({ where: { id: user.id }, data: { mfaBackupCodes: codigosRestantes } });
            }
          }
          if (!mfaValido) {
            throw new Error(MENSAJE_MFA_CODIGO_INVALIDO);
          }
        }

        const claims = await resolverClaimsSesion(user);
        // ADR-011 Sprint 1 — se crea acá (no en jwt()) porque acá SÍ hay
        // `req` con headers reales; el `sid` crudo viaja dentro del objeto
        // que NextAuth pasa como `user` al jwt() de abajo, mismo mecanismo
        // que ya usaba este archivo para esOwner/modulosPermitidos.
        const { sid } = await crearSesion(user.id, { ip: obtenerIp(req?.headers), userAgent: obtenerUserAgent(req?.headers) });
        return { ...claims, sid };
      },
    }),
    // Login "modo Campesino" — sin contraseña: el campesino escribe su
    // celular y, si esa cuenta ya requiere vinculación, entra solo desde un
    // dispositivo de confianza (se vincula UNA vez con un código del dueño,
    // ver /api/campesino/vincular). Las cuentas anteriores a esa protección
    // siguen abiertas por número hasta que el dueño les genere un código
    // (requiereVinculacion = false). `id` explícito
    // porque next-auth asigna "credentials" por defecto al primer provider
    // Credentials, y necesitamos distinguirlos desde el formulario de login.
    CredentialsProvider({
      id: "telefono-campesino",
      name: "Celular",
      credentials: {
        telefono: { label: "Celular", type: "tel" },
      },
      async authorize(credentials, req) {
        if (!credentials?.telefono) return null;

        // Este provider NO tiene lockout por cuenta (a diferencia del de
        // arriba) — el rate limit por IP+teléfono es la primera defensa; la
        // segunda es el dispositivo de confianza de más abajo.
        await verificarLimite("loginTelefono", `${obtenerIp(req?.headers)}:${credentials.telefono}`);

        // Normalizado a solo dígitos — el celular se guarda normalizado
        // (ver crearCuentaCampesino) así que da igual si el campesino lo
        // escribe con espacios/guiones/paréntesis, siempre que los dígitos
        // coincidan. Ver src/lib/telefono.ts.
        const user = await db.user.findUnique({
          where: { telefono: normalizarTelefono(credentials.telefono) },
        });

        // Defensa en profundidad: aunque la UI solo muestre este formulario
        // bajo "Campesino", este provider nunca debe autenticar una cuenta
        // ESTANDAR aunque alguien adivine su número. Respuesta UNIFORME con
        // "número desconocido": ambos piden el código (que luego falla con
        // un mensaje genérico en /api/campesino/vincular) — así este login
        // no revela qué celulares existen.
        if (!user || user.experiencia !== "CAMPESINO") {
          throw new Error(MENSAJE_CAMPESINO_REQUIERE_CODIGO);
        }

        // Login Campesino seguro — el dueño genera un código de un solo uso
        // y el celular queda como dispositivo de confianza (cookie
        // httpOnly, fijada por /api/campesino/vincular: authorize() no puede
        // fijar cookies, solo leerlas). Las cuentas anteriores a esto
        // (requiereVinculacion = false) siguen entrando exactamente como
        // antes hasta que el dueño les genere su primer código.
        if (user.requiereVinculacion) {
          const cookie = leerCookieDispositivo((req?.headers as Record<string, string> | undefined)?.cookie);
          const dispositivo = cookie
            ? await db.dispositivoConfianza.findUnique({ where: { tokenHash: hashToken(cookie) } })
            : null;
          const vigente =
            dispositivo && dispositivo.userId === user.id && !dispositivo.revocadoEn && dispositivo.expiraEn > new Date();
          if (!vigente) throw new Error(MENSAJE_CAMPESINO_REQUIERE_CODIGO);

          // Vigencia deslizante: cada entrada renueva los 180 días.
          await db.dispositivoConfianza.update({
            where: { id: dispositivo.id },
            data: { ultimoUsoEn: new Date(), expiraEn: new Date(Date.now() + DISPOSITIVO_VIGENCIA_DIAS * 24 * 60 * 60 * 1000) },
          });
        }

        const claims = await resolverClaimsSesion(user);
        const { sid } = await crearSesion(user.id, { ip: obtenerIp(req?.headers), userAgent: obtenerUserAgent(req?.headers) });
        return { ...claims, sid };
      },
    }),
    // Exclusivo del perfil "Otro rol" — el Campesino nunca ve este botón.
    // Sin PrismaAdapter (sesión 100% JWT, sin tablas Account/Session): el
    // signIn()/jwt() de abajo interceptan manualmente para (a) prohibir
    // autoregistro y (b) inyectar los mismos claims custom que ya produce
    // resolverClaimsSesion().
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true; // credentials sin cambios

      if (!user.email) return false;
      const existente = await db.user.findUnique({ where: { email: user.email } });
      // Sin autoregistro (decisión de producto) + defensa en profundidad:
      // Google jamás autentica una cuenta Campesino, aunque no se le muestre
      // el botón.
      if (!existente || existente.experiencia === "CAMPESINO") return false;

      return true;
    },
    async jwt({ token, user, account }) {
      // Google: rama que YA solo corre en el login inicial — `account`
      // viene poblado únicamente en el handshake OAuth, nunca en lecturas
      // posteriores del mismo token. Es el punto exacto para crear la
      // sesión (ADR-011 Sprint 1), igual que `user` lo es para los
      // providers Credentials de abajo. Sin ip/user-agent acá — no hay
      // `req` con headers reales dentro de este callback; quedan null.
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.user.findUnique({ where: { email: token.email } });
        if (dbUser) {
          const claims = await resolverClaimsSesion(dbUser);
          Object.assign(token, claims);
          const { sid } = await crearSesion(dbUser.id);
          token.sid = sid;
          token.sidValid = true;
          token.sidCheckedAt = Date.now();
        }
        return token;
      }
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.esSuperAdmin = (user as any).esSuperAdmin ?? false;
        token.esOwner = (user as any).esOwner ?? false;
        token.modulosPermitidos = (user as any).modulosPermitidos ?? "ALL";
        token.membresias = (user as any).membresias ?? [];
        token.mfaHabilitado = (user as any).mfaHabilitado ?? false;
        // sid ya viene creado desde adentro de authorize() (ahí sí hay
        // headers reales) — acá solo se copia al token, mismo patrón que
        // el resto de los claims de esta rama.
        token.sid = (user as any).sid;
        token.sidValid = true;
        token.sidCheckedAt = Date.now();
        return token;
      }

      // Lectura posterior (ni login inicial ni Google) — revalida contra
      // Sesion solo si pasó la ventana de staleness (ver sesiones.ts): la
      // inmensa mayoría de los requests de una sesión activa NO tocan la
      // base acá, se confía en lo que ya quedó cacheado en el propio JWT.
      // Tokens emitidos ANTES de este cambio no tienen `sid` — quedan
      // vivos como siempre (no se expulsa a nadie el día del deploy), solo
      // que no son revocables hasta que vuelvan a loguearse.
      if (token.sid) {
        const ultimoChequeo = (token.sidCheckedAt as number | undefined) ?? 0;
        if (Date.now() - ultimoChequeo > SESION_REVALIDACION_STALENESS_MS) {
          token.sidValid = await sesionEsValida(token.sid as string);
          token.sidCheckedAt = Date.now();
        }
      }
      return token;
    },
    session({ session, token }) {
      // sidValid es undefined (token viejo, sin sid) o true → sesión
      // normal. Solo false (sesión revocada o vencida, confirmado contra
      // la base) deja session.user.id sin llenar — el resto de la app ya
      // trata eso exactamente como "no autenticado"
      // (`if (!session?.user?.id) ...`, ~60 rutas), sin tocar ninguna.
      if (token && session.user && token.sidValid !== false) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).esSuperAdmin = token.esSuperAdmin ?? false;
        (session.user as any).esOwner = token.esOwner ?? false;
        (session.user as any).modulosPermitidos = token.modulosPermitidos ?? "ALL";
        (session.user as any).membresias = token.membresias ?? [];
        (session.user as any).mfaHabilitado = token.mfaHabilitado ?? false;
      }
      return session;
    },
  },
  events: {
    // Cierre de sesión normal (signOut() del cliente) también limpia la
    // fila de Sesion — ADR-011 Sprint 1. Confirmado en los tipos instalados
    // de next-auth: en estrategia JWT este evento recibe `token`, no
    // `session`.
    async signOut({ token }) {
      if (token?.sid) await revocarSesionPorRawId(token.sid as string);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

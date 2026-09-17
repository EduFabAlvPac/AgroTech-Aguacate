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
import { MENSAJE_EMAIL_NO_VERIFICADO } from "./auth-shared";

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
  };
}

/** IP real del cliente detrás del proxy de Vercel — `x-forwarded-for` trae
 * una lista separada por comas (cliente, luego proxies intermedios); el
 * primer valor es el del cliente. Sin ese header (dev local sin proxy),
 * cae a un valor fijo — el rate limit sigue funcionando, solo agrupa a
 * todo el tráfico local bajo la misma clave, que es aceptable en dev. */
function obtenerIp(headers: Record<string, string> | Headers | undefined): string {
  const valor =
    headers instanceof Headers
      ? headers.get("x-forwarded-for")
      : headers?.["x-forwarded-for"];
  return valor?.split(",")[0]?.trim() || "ip-desconocida";
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
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

        return resolverClaimsSesion(user);
      },
    }),
    // Login "modo Campesino" — solo número de celular, sin contraseña, sin
    // OTP por ahora (decisión explícita de producto para el MVP, documentada
    // como riesgo aceptado: cualquiera que sepa el celular de un campesino
    // podría entrar a su cuenta — revisar más adelante). `id` explícito
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
        // arriba) — para el login Campesino, esta es la ÚNICA defensa
        // contra fuerza bruta, no un complemento.
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
        // ESTANDAR aunque alguien adivine su número.
        if (!user || user.experiencia !== "CAMPESINO") return null;

        return resolverClaimsSesion(user);
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
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.user.findUnique({ where: { email: token.email } });
        if (dbUser) {
          const claims = await resolverClaimsSesion(dbUser);
          Object.assign(token, claims);
        }
        return token;
      }
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.esSuperAdmin = (user as any).esSuperAdmin ?? false;
        token.esOwner = (user as any).esOwner ?? false;
        token.modulosPermitidos = (user as any).modulosPermitidos ?? "ALL";
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).esSuperAdmin = token.esSuperAdmin ?? false;
        (session.user as any).esOwner = token.esOwner ?? false;
        (session.user as any).modulosPermitidos = token.modulosPermitidos ?? "ALL";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

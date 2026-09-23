import Link from "next/link";
import { getServerSession } from "next-auth";
import { CheckCircle2, XCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { AuthCard } from "@/components/auth/AuthCard";
import { AceptarInvitacionForm } from "@/components/auth/AceptarInvitacionForm";

const ROL_LABEL: Record<string, string> = {
  ORG_OWNER: "dueño de la organización",
  ORG_ADMIN: "administrador de la organización",
  FARM_OWNER: "dueño de finca",
  FARM_ADMIN: "administrador de finca",
  FARM_COLLABORATOR: "colaborador",
  INVESTOR: "inversionista",
  BUYER: "comprador",
};

/**
 * /invitacion/[token] — Server Component de SOLO LECTURA (ADR-011 Sprint 3):
 * mira el estado de la invitación y decide qué mostrar. La aceptación en sí
 * es un POST (ver AceptarInvitacionForm.tsx / api/invitaciones/[token]/aceptar),
 * mismo criterio que /verificar/[token] — nunca escribir nada solo por abrir
 * el enlace (filtros de seguridad de correo lo "previsualizan").
 */
export default async function InvitacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  const invitacion = await db.invitacion.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      emailOCelular: true,
      rol: true,
      expiraEn: true,
      aceptadaEn: true,
      organizacion: { select: { nombre: true } },
    },
  });

  if (!invitacion) {
    return (
      <AuthCard titulo="Enlace no válido">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <XCircle size={40} className="text-red-500" />
          <p className="text-[13px] text-[var(--text-secondary)]">
            Este enlace de invitación no existe o ya no es válido.
          </p>
          <Link href="/login" className="text-[13px] font-medium text-agro-600 hover:text-agro-800">
            Ir a iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (invitacion.aceptadaEn) {
    return (
      <AuthCard titulo="Invitación ya aceptada">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <CheckCircle2 size={40} className="text-agro-600" />
          <p className="text-[13px] text-[var(--text-secondary)]">Esta invitación ya fue aceptada. Ya puedes iniciar sesión.</p>
          <Link
            href="/login"
            className="w-full text-center py-2.5 bg-agro-600 hover:bg-agro-800 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (invitacion.expiraEn < new Date()) {
    return (
      <AuthCard titulo="El enlace venció">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <XCircle size={40} className="text-red-500" />
          <p className="text-[13px] text-[var(--text-secondary)]">
            Esta invitación de <strong>{invitacion.organizacion.nombre}</strong> ya venció. Pídele a quien te invitó que te
            mande una nueva.
          </p>
          <Link href="/login" className="text-[13px] font-medium text-agro-600 hover:text-agro-800">
            Ir a iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );
  }

  const rolLabel = ROL_LABEL[invitacion.rol] ?? invitacion.rol;
  const usuarioExistente = await db.user.findUnique({ where: { email: invitacion.emailOCelular }, select: { id: true } });

  // Ya tiene cuenta pero no está logueado con ese correo — no creamos nada
  // ni aceptamos nada por su cuenta; que inicie sesión y vuelva a abrir el
  // enlace (más simple y seguro que intentar encadenar un callbackUrl).
  if (usuarioExistente && session?.user?.email !== invitacion.emailOCelular) {
    return (
      <AuthCard titulo="Confirma tu identidad">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <p className="text-[13px] text-[var(--text-secondary)]">
            <strong>{invitacion.organizacion.nombre}</strong> te invita como {rolLabel}. Ya existe una cuenta con este
            correo — inicia sesión con <strong>{invitacion.emailOCelular}</strong> y vuelve a abrir este enlace para
            aceptar.
          </p>
          <Link
            href="/login"
            className="w-full text-center py-2.5 bg-agro-600 hover:bg-agro-800 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo={`${invitacion.organizacion.nombre} te invita`} subtitulo={`Como ${rolLabel}`}>
      <AceptarInvitacionForm
        token={token}
        email={invitacion.emailOCelular}
        yaTieneCuenta={!!usuarioExistente}
      />
    </AuthCard>
  );
}

import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { tokenExpirado } from "@/lib/tokens";
import { AuthCard } from "@/components/auth/AuthCard";
import { ConfirmarVerificacion } from "@/components/auth/ConfirmarVerificacion";

/**
 * /verificar/[token] — Server Component de SOLO LECTURA: mira el estado del
 * enlace y, si sigue pendiente, muestra el botón que verifica (POST, ver
 * ConfirmarVerificacion.tsx). Antes esta página verificaba directamente en el
 * render y borraba el token, así que cualquier "previsualización" del enlace
 * (filtros de seguridad de correos de empresa) dejaba a la persona con
 * "Enlace inválido" pese a tener la cuenta ya verificada.
 */
export default async function VerificarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const user = await db.user.findUnique({
    where: { tokenVerificacion: token },
    select: { tokenVerificacionExpira: true, emailVerificado: true },
  });

  if (user?.emailVerificado) {
    return (
      <AuthCard titulo="Correo verificado">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <CheckCircle2 size={40} className="text-agro-600" />
          <p className="text-[13px] text-[var(--text-secondary)]">Este correo ya estaba verificado. Ya puedes iniciar sesión.</p>
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

  if (user && !tokenExpirado(user.tokenVerificacionExpira)) {
    return (
      <AuthCard titulo="Confirma tu correo">
        <ConfirmarVerificacion token={token} />
      </AuthCard>
    );
  }

  const expirado = !!user;
  return (
    <AuthCard titulo={expirado ? "El enlace venció" : "Enlace no válido"}>
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <XCircle size={40} className="text-red-500" />
        <p className="text-[13px] text-[var(--text-secondary)]">
          {expirado
            ? "Este enlace de verificación ya venció. Inicia sesión con tu correo y contraseña para pedir uno nuevo."
            : "Este enlace no corresponde a ningún correo pendiente. Puede que ya hayas verificado tu cuenta, o que hayas abierto un correo anterior: inicia sesión para comprobarlo o pedir uno nuevo."}
        </p>
        <Link href="/login" className="text-[13px] font-medium text-agro-600 hover:text-agro-800">
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthCard>
  );
}

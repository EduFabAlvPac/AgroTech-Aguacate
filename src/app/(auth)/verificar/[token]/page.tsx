import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { tokenExpirado } from "@/lib/tokens";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * /verificar/[token] — Server Component: hace la verificación directo
 * contra la BD en el propio render (no llama a /api/auth/verificar/[token]
 * por HTTP — evitaría un round-trip extra sin ganar nada, ya que esta
 * página no necesita reintentar ni mostrar estados de carga). La ruta de
 * API se mantiene para cuando haga falta invocarlo sin renderizar una
 * página completa (ver reenviar-verificacion.ts, que no la usa, pero deja
 * la puerta abierta).
 */
export default async function VerificarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const user = await db.user.findUnique({
    where: { tokenVerificacion: token },
    select: { id: true, tokenVerificacionExpira: true, emailVerificado: true },
  });

  let resultado: "ok" | "ya-verificado" | "invalido" | "expirado";
  if (!user) {
    resultado = "invalido";
  } else if (user.emailVerificado) {
    resultado = "ya-verificado";
  } else if (tokenExpirado(user.tokenVerificacionExpira)) {
    resultado = "expirado";
  } else {
    await db.user.update({
      where: { id: user.id },
      data: { emailVerificado: new Date(), tokenVerificacion: null, tokenVerificacionExpira: null },
    });
    resultado = "ok";
  }

  if (resultado === "ok" || resultado === "ya-verificado") {
    return (
      <AuthCard titulo="Correo verificado">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <CheckCircle2 size={40} className="text-agro-600" />
          <p className="text-[13px] text-[var(--text-secondary)]">
            {resultado === "ok" ? "Tu cuenta ya está activa." : "Este correo ya estaba verificado."} Ya puedes iniciar sesión.
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
    <AuthCard titulo={resultado === "expirado" ? "El enlace venció" : "Enlace inválido"}>
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <XCircle size={40} className="text-red-500" />
        <p className="text-[13px] text-[var(--text-secondary)]">
          {resultado === "expirado"
            ? "Este enlace de verificación ya venció. Inicia sesión con tu correo y contraseña para pedir uno nuevo."
            : "Este enlace no es válido. Revisa que copiaste la URL completa del correo."}
        </p>
        <Link href="/login" className="text-[13px] font-medium text-agro-600 hover:text-agro-800">
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthCard>
  );
}

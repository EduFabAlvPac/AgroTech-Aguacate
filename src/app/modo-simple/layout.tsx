import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ModoSimpleShell } from "@/components/modo-simple/ModoSimpleShell";

/**
 * Grupo de rutas (modo-simple) — Fase 2 (ADR-006). Shell de presentación
 * mobile-first para las 6 pantallas del mockup aprobado, separado a
 * propósito del grupo (dashboard) (sidebar de escritorio) — cero cambios
 * a ese layout. Vive fuera de /dashboard/* para que sea evidente que es un
 * área de revisión temporal (ver checkpoint de Fase 2), no la forma
 * definitiva de navegar a "modo simple" — eso es Fase 3
 * (selector por rol/preferencia, vistaPreferida).
 */
export default async function ModoSimpleLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const nombre = session.user.name ?? session.user.email ?? "Usuario";
  const inicial = nombre.trim().charAt(0).toUpperCase();

  return (
    <SessionProvider session={session}>
      <ModoSimpleShell nombre={nombre} inicial={inicial}>
        {children}
      </ModoSimpleShell>
    </SessionProvider>
  );
}

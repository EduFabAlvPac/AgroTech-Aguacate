import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { obtenerExperienciaUsuario } from "@/lib/experiencia";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ModoCampesinoShell } from "@/components/modo-campesino/ModoCampesinoShell";
import { UbicacionCampesinoClient } from "@/components/modo-campesino/UbicacionCampesinoClient";

/**
 * Árbol de rutas propio, hermano de (dashboard) — no anidado (ver plan §4).
 * Evita tocar (dashboard)/layout.tsx más allá de la guarda de salida que ya
 * tiene. Guarda simétrica acá: si por alguna razón una cuenta ESTANDAR llega
 * a /campesino, se manda de vuelta a /dashboard.
 */
export default async function CampesinoLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const experiencia = await obtenerExperienciaUsuario(session.user.id);
  if (experiencia !== "CAMPESINO") redirect("/dashboard");

  const nombre = session.user.name ?? "Campesino";

  return (
    <SessionProvider session={session}>
      <UbicacionCampesinoClient />
      <ModoCampesinoShell nombre={nombre}>{children}</ModoCampesinoShell>
    </SessionProvider>
  );
}

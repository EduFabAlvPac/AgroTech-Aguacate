import { Header } from "@/components/layout/Header";
import { InversionistasClient } from "@/components/inversionistas/InversionistasClient";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Inversionistas" };
export const dynamic = "force-dynamic";

export default async function InversionistasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  // Decisión de producto explícita (Fase 3): solo el dueño gestiona
  // inversionistas, todavía no hay delegación a ADMIN_FINCA/COLABORADOR ni
  // login de inversionista — no pasa por el sistema de módulos genérico
  // (ver src/lib/modulos.ts). esSuperAdmin también puede entrar (soporte).
  if (!session.user.esOwner && !session.user.esSuperAdmin) redirect("/dashboard");

  const [inversionistas, cultivos] = await Promise.all([
    db.inversionista.findMany({
      where: { userId: session.user.id },
      include: {
        inversiones: {
          include: {
            cultivo: { select: { id: true, especie: true, variedad: true, lote: { select: { nombre: true } } } },
            retornos: { orderBy: { fecha: "desc" } },
          },
          orderBy: { fechaAporte: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.cultivo.findMany({
      where: { lote: { finca: { userId: session.user.id } } },
      select: { id: true, especie: true, variedad: true, lote: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <Header
        title="Inversionistas"
        subtitle="Aportes de capital por cultivo, retornos y rentabilidad"
      />
      <main className="page-scroll">
        <InversionistasClient inversionistas={inversionistas as any} cultivos={cultivos} />
      </main>
    </>
  );
}

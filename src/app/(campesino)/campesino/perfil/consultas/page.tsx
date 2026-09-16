import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Mis consultas — GermIA" };
export const dynamic = "force-dynamic";

const RIESGO_LABEL: Record<string, { texto: string; color: string; bg: string }> = {
  alta: { texto: "Alto", color: "var(--color-negative)", bg: "var(--color-negative-bg)" },
  media: { texto: "Medio", color: "var(--color-amber)", bg: "var(--color-amber-bg)" },
  baja: { texto: "Bajo", color: "var(--color-positive)", bg: "var(--color-positive-bg)" },
};

export default async function MisConsultasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const consultas = await db.consultaDiagnosticoCampesino.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="px-4 pt-4 pb-8">
      <h1 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Mis consultas</h1>

      {consultas.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-[13px] text-[var(--text-muted)]">
            Todavía no has hecho ningún diagnóstico. Ve a la sección Diagnóstico y toma una foto de tu cultivo.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {consultas.map((c) => {
            const riesgo = c.confianza ? RIESGO_LABEL[c.confianza] : null;
            return (
              <div key={c.id} className="p-3.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {c.especieNombre} · {formatDate(c.createdAt, true)}
                  </p>
                  {riesgo && (
                    <span
                      className="text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
                      style={{ background: riesgo.bg, color: riesgo.color }}
                    >
                      Riesgo {riesgo.texto}
                    </span>
                  )}
                </div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)] mt-1">{c.diagnostico}</p>
                {c.recomendacion && (
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed">{c.recomendacion}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

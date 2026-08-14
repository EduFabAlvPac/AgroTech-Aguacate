import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";

export const metadata = { title: "Auditoría — Admin" };
export const dynamic = "force-dynamic";

const ETIQUETAS_ACCION: Record<string, string> = {
  "auth.cuenta_bloqueada": "🔒 Cuenta bloqueada (fuerza bruta)",
  "cuenta.eliminar": "🗑️ Cuenta eliminada",
  "cuenta.solicitar_eliminacion": "📩 Solicitud de eliminación",
  "cuenta.exportar": "⬇️ Datos exportados",
  "equipo.invitar": "➕ Colaborador invitado",
  "equipo.editar": "✏️ Colaborador editado",
  "equipo.remover": "➖ Colaborador removido",
};

export default async function AuditoriaAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Chequeo fresco contra BD (no solo el JWT) — mismo patrón que el panel
  // de fichas técnicas, ver src/lib/authz.ts.
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { esSuperAdmin: true } });
  if (!user?.esSuperAdmin) redirect("/dashboard");

  const registros = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <Header
        title="Auditoría"
        subtitle="Últimas 200 acciones sensibles — eliminación/exportación de cuentas, cambios de equipo, bloqueos de login"
      />
      <main className="page-scroll">
        <div className="max-w-4xl mx-auto">
          {registros.length === 0 ? (
            <div className="card p-8 text-center text-[13px] text-[var(--text-muted)]">
              Todavía no hay eventos registrados.
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Quién</th>
                    <th className="px-4 py-3 font-medium">Acción</th>
                    <th className="px-4 py-3 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                        {r.createdAt.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{r.actorEmail ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {ETIQUETAS_ACCION[r.accion] ?? r.accion}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[var(--text-muted)] max-w-xs truncate" title={r.detalle ? JSON.stringify(r.detalle) : ""}>
                        {r.detalle ? JSON.stringify(r.detalle) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

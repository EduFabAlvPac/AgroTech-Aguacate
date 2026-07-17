import { Users, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCOP } from "@/lib/utils";

interface BuyersPreviewProps {
  userId: string;
}

const TIPO_LABELS: Record<string, string> = {
  COOPERATIVA: "Cooperativa",
  EXPORTADOR: "Exportador",
  MAYORISTA: "Mayorista",
  SUPERMERCADO: "Supermercado",
  PLAZA_MERCADO: "Plaza de mercado",
  RESTAURANTE: "Restaurante",
  OTRO: "Otro",
};

export async function BuyersPreview({ userId }: BuyersPreviewProps) {
  const compradores = await db.comprador.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const bgColors = ["bg-blue-50 text-blue-600", "bg-amber-50 text-amber-700", "bg-teal-50 text-teal-700"];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[var(--text-muted)]" />
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Red de compradores
          </h2>
          <span className="badge badge-neutral">{compradores.length} contactos</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/compradores"
            className="text-[12px] text-[var(--text-secondary)] hover:text-agro-600 flex items-center gap-1"
          >
            Ver todos <ArrowRight size={13} />
          </Link>
          <Link
            href="/dashboard/compradores"
            className="flex items-center gap-1.5 text-[12px] font-medium text-white bg-agro-400 hover:bg-agro-600 px-3 py-1.5 rounded-[var(--radius-md)] transition-colors"
          >
            <Plus size={14} />
            Agregar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {compradores.map((c, i) => (
          <Link
            key={c.id}
            href="/dashboard/compradores"
            className="flex flex-col gap-2 p-3.5 border border-[var(--border-subtle)] rounded-[var(--radius-lg)] hover:border-agro-100 hover:bg-agro-50 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ${bgColors[i % bgColors.length]}`}
              >
                {initials(c.nombre)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                  {c.nombre}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {TIPO_LABELS[c.tipo]} · {c.ciudad}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {c.precioKg && (
                <div>
                  <div className="text-[var(--text-muted)]">Precio/kg</div>
                  <div className="font-semibold text-agro-600">
                    {formatCOP(c.precioKg)}
                  </div>
                </div>
              )}
              {c.capacidadTon && (
                <div>
                  <div className="text-[var(--text-muted)]">Capacidad</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {c.capacidadTon} t/mes
                  </div>
                </div>
              )}
            </div>

            <span
              className={`badge text-[10px] self-start ${
                c.estado === "ACTIVO" ? "badge-success" : "badge-warning"
              }`}
            >
              {c.estado}
            </span>
          </Link>
        ))}

        {/* Add new CTA */}
        <Link
          href="/dashboard/compradores"
          className="flex flex-col items-center justify-center gap-2 p-3.5 border-2 border-dashed border-[var(--border-default)] rounded-[var(--radius-lg)] hover:border-agro-200 hover:bg-agro-50 text-[var(--text-muted)] hover:text-agro-400 transition-all min-h-[100px]"
        >
          <Plus size={20} />
          <span className="text-[12px]">Buscar compradores</span>
        </Link>
      </div>
    </div>
  );
}

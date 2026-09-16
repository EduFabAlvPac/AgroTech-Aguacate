import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { HeaderSeccion } from "@/components/modo-campesino/HeaderSeccion";
import { GRADIENTE_SECCION } from "@/lib/campesino-gradientes";
import type { CommodityMercado, TendenciaPrecio } from "@prisma/client";

export const metadata = { title: "Precios del mercado — GermIA" };
export const dynamic = "force-dynamic";

const COMMODITIES: { valor: CommodityMercado; nombre: string; emoji: string }[] = [
  { valor: "CAFE", nombre: "Café pergamino seco", emoji: "☕" },
  { valor: "CACAO", nombre: "Cacao seco", emoji: "🍫" },
  { valor: "AGUACATE", nombre: "Aguacate Hass", emoji: "🥑" },
  { valor: "CITRICOS", nombre: "Naranja Valencia", emoji: "🍊" },
];

const TENDENCIA_UI: Record<TendenciaPrecio, { icon: typeof TrendingUp; color: string; label: string }> = {
  SUBIO: { icon: TrendingUp, color: "var(--color-positive)", label: "Subió" },
  BAJO: { icon: TrendingDown, color: "var(--color-negative)", label: "Bajó" },
  IGUAL: { icon: Minus, color: "var(--text-muted)", label: "Se mantiene" },
};

export default async function PreciosMercadoPage() {
  const ultimos = await Promise.all(
    COMMODITIES.map((c) =>
      db.precioMercado.findFirst({
        where: { commodity: c.valor, activo: true },
        orderBy: { fecha: "desc" },
      })
    )
  );

  const masReciente = ultimos.filter(Boolean).sort((a, b) => (b!.fecha.getTime() - a!.fecha.getTime()))[0];

  return (
    <div className="flex flex-col min-h-full" style={{ background: "white" }}>
      <HeaderSeccion titulo="Precios del mercado" gradiente={GRADIENTE_SECCION.precios} />
      <div className="px-4 pt-4 pb-8">
        <p className="text-[12px] text-[var(--text-muted)] mb-5">
          Precios actualizados hoy
          {masReciente && ` · ${formatDate(masReciente.fecha, true)}`}
        </p>

        <div className="space-y-2.5">
          {COMMODITIES.map((c, i) => {
            const precio = ultimos[i];
            const tendencia = precio ? TENDENCIA_UI[precio.tendencia] : null;
            const Icon = tendencia?.icon;
            return (
              <div key={c.valor} className="flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
                <span style={{ fontSize: 30 }}>{c.emoji}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{c.nombre}</p>
                  {precio ? (
                    <p className="text-[15px] font-bold text-[var(--text-primary)]">
                      ${precio.precioKg.toLocaleString("es-CO")} / {precio.unidad}
                    </p>
                  ) : (
                    <p className="text-[12px] text-[var(--text-muted)]">Sin precio cargado todavía</p>
                  )}
                </div>
                {tendencia && Icon && (
                  <div className="flex items-center gap-1" style={{ color: tendencia.color }}>
                    <Icon size={16} />
                    <span className="text-[11px] font-semibold">{tendencia.label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

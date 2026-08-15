"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, TrendingUp, TrendingDown, X } from "lucide-react";
import toast from "react-hot-toast";
import { CATEGORIA_LABELS } from "@/types";
import { formatCOPFull, formatDate } from "@/lib/utils";
import { crearGasto, eliminarGasto, type GastoActionState } from "@/app/(dashboard)/dashboard/finanzas/gasto-actions";
import { crearIngreso, eliminarIngreso, type IngresoActionState } from "@/app/(dashboard)/dashboard/finanzas/ingreso-actions";
import type { CategoriaGasto, Comprador, Cultivo, Gasto, Lote } from "@prisma/client";
import type { IngresoWithRelations } from "@/types";

type GastoConRelaciones = Gasto & { cultivo: (Cultivo & { lote: Lote }) | null; lote: Lote | null };
type CultivoConLote = Cultivo & { lote: Lote };

interface FinanzasSimpleClientProps {
  gastos: GastoConRelaciones[];
  ingresos: IngresoWithRelations[];
  cultivos: CultivoConLote[];
  compradores: Comprador[];
}

type Movimiento = {
  id: string;
  tipo: "ingreso" | "gasto";
  concepto: string;
  categoria: string | null;
  monto: number;
  fecha: Date;
};

type Filtro = "todos" | "ingreso" | "gasto";

const initialGastoState: GastoActionState = {};
const initialIngresoState: IngresoActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full py-3 rounded-full text-[13px] font-semibold disabled:opacity-60" style={{ background: "var(--color-brand)", color: "white" }}>
      {pending ? "Guardando..." : label}
    </button>
  );
}

export function FinanzasSimpleClient({ gastos, ingresos, cultivos, compradores }: FinanzasSimpleClientProps) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [showNuevo, setShowNuevo] = useState(false);
  const [, startTransition] = useTransition();
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const movimientos: Movimiento[] = useMemo(() => {
    const g: Movimiento[] = gastos.map((x) => ({ id: x.id, tipo: "gasto", concepto: x.concepto, categoria: CATEGORIA_LABELS[x.categoria], monto: x.monto, fecha: new Date(x.fecha) }));
    const i: Movimiento[] = ingresos.map((x) => ({ id: x.id, tipo: "ingreso", concepto: x.concepto, categoria: x.comprador?.nombre ?? null, monto: x.monto, fecha: new Date(x.fecha) }));
    return [...g, ...i].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }, [gastos, ingresos]);

  const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const balance = totalIngresos - totalGastos;

  const visibles = filtro === "todos" ? movimientos : movimientos.filter((m) => m.tipo === filtro);

  const eliminarMovimiento = (m: Movimiento) => {
    setEliminandoId(m.id);
    startTransition(async () => {
      try {
        const result = m.tipo === "gasto" ? await eliminarGasto({}, m.id) : await eliminarIngreso({}, m.id);
        if (result.error) { toast.error(result.error); return; }
        toast.success(m.tipo === "gasto" ? "Gasto eliminado" : "Ingreso eliminado");
        router.refresh();
      } finally {
        setEliminandoId(null);
      }
    });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-extrabold" style={{ color: "var(--text-primary)" }}>Finanzas</h1>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{movimientos.length} movimiento{movimientos.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowNuevo(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold"
          style={{ background: "var(--color-brand)", color: "white" }}
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {/* ── Balance ── */}
      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #4FA987, #387A6E)" }}>
        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.85)" }}>Balance</div>
        <div className="text-[24px] font-extrabold text-white mb-3">{formatCOPFull(balance)}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.85)" }}><TrendingUp size={11} /> Ingresos</div>
            <div className="text-[14px] font-bold text-white">{formatCOPFull(totalIngresos)}</div>
          </div>
          <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.85)" }}><TrendingDown size={11} /> Gastos</div>
            <div className="text-[14px] font-bold text-white">{formatCOPFull(totalGastos)}</div>
          </div>
        </div>
      </div>

      {/* ── Filtro ── */}
      <div className="flex gap-2">
        {([["todos", "Todos"], ["ingreso", "Ingreso"], ["gasto", "Gasto"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold"
            style={filtro === id ? { background: "var(--text-primary)", color: "white" } : { background: "var(--surface-page)", color: "var(--text-secondary)" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Lista / vacío ── */}
      {visibles.length === 0 ? (
        <div className="rounded-2xl px-4 py-10 text-center" style={{ background: "var(--surface-page)" }}>
          <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Sin movimientos todavía</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>Toca &quot;+ Nuevo&quot; para registrar el primero.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibles.map((m) => (
            <div key={`${m.tipo}-${m.id}`} className="flex items-center gap-3 rounded-2xl p-3" style={{ border: "1px solid var(--border-subtle)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: m.tipo === "ingreso" ? "var(--color-positive-bg)" : "var(--color-negative-bg)" }}>
                {m.tipo === "ingreso" ? <TrendingUp size={16} style={{ color: "var(--color-positive)" }} /> : <TrendingDown size={16} style={{ color: "var(--color-negative)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {m.concepto}{m.categoria ? ` · ${m.categoria}` : ""}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{formatDate(m.fecha, true)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[13px] font-bold" style={{ color: m.tipo === "ingreso" ? "var(--color-positive)" : "var(--color-negative)" }}>
                  {m.tipo === "ingreso" ? "+" : "-"}{formatCOPFull(m.monto)}
                </div>
                <button
                  onClick={() => eliminarMovimiento(m)}
                  disabled={eliminandoId === m.id}
                  className="text-[11px] disabled:opacity-50"
                  style={{ color: "var(--text-muted)" }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNuevo && (
        <NuevoMovimientoModal
          cultivos={cultivos}
          compradores={compradores}
          onClose={() => setShowNuevo(false)}
          onCreated={() => { setShowNuevo(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function NuevoMovimientoModal({
  cultivos,
  compradores,
  onClose,
  onCreated,
}: {
  cultivos: CultivoConLote[];
  compradores: Comprador[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tipo, setTipo] = useState<"gasto" | "ingreso">("gasto");
  const today = new Date().toISOString().split("T")[0];

  // Gasto
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaGasto>("INSUMOS");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(today);

  // Ingreso — cultivoId parte pre-seleccionado en el primer cultivo (si
  // existe) para que un ingreso sin comprador siga siendo visible en el
  // resumen financiero: Ingreso no tiene fincaId propio, getFinanzasResumen
  // (Fase 1) solo puede ubicarlo vía cultivo o comprador.
  const [compradorId, setCompradorId] = useState("");
  const [cultivoId, setCultivoId] = useState(cultivos[0]?.id ?? "");

  const [gastoState, gastoFormAction] = useActionState(crearGasto, initialGastoState);
  const [ingresoState, ingresoFormAction] = useActionState(crearIngreso, initialIngresoState);

  useEffect(() => {
    if (gastoState.error) toast.error(gastoState.error);
    if (gastoState.gasto) { toast.success("Gasto registrado"); onCreated(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastoState]);

  useEffect(() => {
    if (ingresoState.error) toast.error(ingresoState.error);
    if (ingresoState.ingreso) { toast.success("Ingreso registrado"); onCreated(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingresoState]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5 space-y-4" style={{ maxWidth: 540, background: "white", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Nuevo movimiento</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTipo("gasto")} className="flex-1 py-2 rounded-full text-[13px] font-semibold" style={tipo === "gasto" ? { background: "var(--color-negative-bg)", color: "var(--color-negative)" } : { background: "var(--surface-page)", color: "var(--text-secondary)" }}>Gasto</button>
          <button onClick={() => setTipo("ingreso")} className="flex-1 py-2 rounded-full text-[13px] font-semibold" style={tipo === "ingreso" ? { background: "var(--color-positive-bg)", color: "var(--color-positive)" } : { background: "var(--surface-page)", color: "var(--text-secondary)" }}>Ingreso</button>
        </div>

        {tipo === "gasto" ? (
          <form action={gastoFormAction} onSubmit={(e) => { if (!concepto.trim() || !monto) { e.preventDefault(); toast.error("Concepto y monto son requeridos"); } }} className="space-y-3">
            <input type="hidden" name="concepto" value={concepto.trim()} />
            <input type="hidden" name="categoria" value={categoria} />
            <input type="hidden" name="monto" value={monto} />
            <input type="hidden" name="fecha" value={fecha} />

            <Campo label="Concepto *"><input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Fertilizante" className={inputClass} /></Campo>
            <Campo label="Categoría">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)} className={inputClass}>
                {Object.entries(CATEGORIA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Monto (COP) *"><input type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" className={inputClass} /></Campo>
              <Campo label="Fecha"><input type="date" value={fecha} max={today} onChange={(e) => setFecha(e.target.value)} className={inputClass} /></Campo>
            </div>
            <SubmitButton label="Registrar gasto" />
          </form>
        ) : (
          <form action={ingresoFormAction} onSubmit={(e) => { if (!concepto.trim() || !monto) { e.preventDefault(); toast.error("Concepto y monto son requeridos"); } }} className="space-y-3">
            <input type="hidden" name="concepto" value={concepto.trim()} />
            <input type="hidden" name="monto" value={monto} />
            <input type="hidden" name="fecha" value={fecha} />
            <input type="hidden" name="compradorId" value={compradorId} />
            <input type="hidden" name="cultivoId" value={cultivoId} />

            <Campo label="Concepto *"><input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Venta de cosecha" className={inputClass} /></Campo>
            {cultivos.length > 0 && (
              <Campo label="Cultivo asociado">
                <select value={cultivoId} onChange={(e) => setCultivoId(e.target.value)} className={inputClass}>
                  <option value="">Sin cultivo</option>
                  {cultivos.map((c) => <option key={c.id} value={c.id}>{c.lote.nombre} · {c.variedad}</option>)}
                </select>
              </Campo>
            )}
            {compradores.length > 0 && (
              <Campo label="Comprador">
                <select value={compradorId} onChange={(e) => setCompradorId(e.target.value)} className={inputClass}>
                  <option value="">Sin comprador</option>
                  {compradores.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Campo>
            )}
            {cultivos.length === 0 && compradores.length === 0 && (
              <p className="text-[11px]" style={{ color: "var(--color-amber)" }}>
                ⚠️ Sin cultivos ni compradores registrados — este ingreso no podrá asociarse a tu finca todavía.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Monto (COP) *"><input type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" className={inputClass} /></Campo>
              <Campo label="Fecha"><input type="date" value={fecha} max={today} onChange={(e) => setFecha(e.target.value)} className={inputClass} /></Campo>
            </div>
            <SubmitButton label="Registrar ingreso" />
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass = "w-full h-11 px-3 rounded-xl text-[14px]";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div style={{ border: "1px solid var(--border-default)", borderRadius: 12 }}>{children}</div>
    </div>
  );
}

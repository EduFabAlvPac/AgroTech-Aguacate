"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { PiggyBank } from "lucide-react";
import { CATEGORIA_LABELS } from "@/types";
import { formatCOPFull } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Presupuesto } from "@prisma/client";
import { guardarPresupuesto, type PresupuestoActionState } from "@/app/(dashboard)/dashboard/finanzas/presupuesto-actions";

interface PresupuestoFormProps {
  presupuestos: Presupuesto[];
  onSuccess: (presupuestos: Presupuesto[]) => void;
}

const initialState: PresupuestoActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      <PiggyBank size={14} />
      Guardar presupuesto
    </Button>
  );
}

export function PresupuestoForm({ presupuestos, onSuccess }: PresupuestoFormProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const anio = new Date().getFullYear();

  const [state, formAction] = useActionState(guardarPresupuesto, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.presupuestos) {
      toast.success("Presupuesto guardado");
      onSuccess(state.presupuestos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const entradas = Object.entries(form)
    .filter(([, v]) => v && Number(v) > 0)
    .map(([categoria, monto]) => ({ categoria, montoPlaneado: Number(monto) }));

  return (
    <div className="card p-5">
      <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
        Presupuesto anual {anio} por categoría
      </h3>
      <form action={formAction}>
        <input type="hidden" name="anio" value={anio} />
        <input type="hidden" name="entradas" value={JSON.stringify(entradas)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(CATEGORIA_LABELS).map(([cat, label]) => {
            const existing = presupuestos.find((p) => p.categoria === cat);
            return (
              <div key={cat}>
                <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">{label}</label>
                <input
                  type="number"
                  className="w-full h-9 px-3 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white"
                  placeholder={existing ? formatCOPFull(existing.montoPlaneado) : "0"}
                  value={form[cat] ?? (existing?.montoPlaneado?.toString() || "")}
                  onChange={(e) => setForm((prev) => ({ ...prev, [cat]: e.target.value }))}
                  min="0"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

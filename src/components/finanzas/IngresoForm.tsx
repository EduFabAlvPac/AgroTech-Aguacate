"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { ingresoFormSchema } from "@/lib/validations";
import { formatCOP } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Comprador, Cultivo, Lote } from "@prisma/client";
import type { IngresoWithRelations } from "@/types";
import { crearIngreso, type IngresoActionState } from "@/app/(dashboard)/dashboard/finanzas/ingreso-actions";

type CultivoConLote = Cultivo & { lote: Lote };

interface IngresoFormProps {
  cultivos: CultivoConLote[];
  compradores: Comprador[];
  onSuccess: (ingreso: IngresoWithRelations) => void;
  onCancel: () => void;
}

const today = new Date().toISOString().split("T")[0];
const initialState: IngresoActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>Guardar ingreso</Button>;
}

export function IngresoForm({ cultivos, compradores, onSuccess, onCancel }: IngresoFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    concepto: "",
    monto: "",
    cantidadKg: "",
    fecha: today,
    compradorId: "",
    cultivoId: cultivos[0]?.id ?? "",
    notas: "",
  });

  const precioKgCalc = useMemo(() => {
    const kg = Number(form.cantidadKg);
    const monto = Number(form.monto);
    if (kg > 0 && monto > 0) return (monto / kg).toFixed(0);
    return null;
  }, [form.cantidadKg, form.monto]);

  const [state, formAction] = useActionState(crearIngreso, initialState);

  useEffect(() => {
    if (state.fieldErrors) setErrors(state.fieldErrors);
    if (state.error) toast.error(state.error);
    if (state.ingreso) {
      toast.success("Ingreso registrado");
      onSuccess(state.ingreso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const validateClientSide = (): boolean => {
    const result = ingresoFormSchema.safeParse({
      concepto: form.concepto,
      monto: form.monto ? Number(form.monto) : undefined,
      cantidadKg: form.cantidadKg ? Number(form.cantidadKg) : undefined,
      fecha: form.fecha,
      compradorId: form.compradorId || undefined,
      cultivoId: form.cultivoId || undefined,
      notas: form.notas || undefined,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  return (
    <form
      action={formAction}
      onSubmit={(e) => { if (!validateClientSide()) e.preventDefault(); }}
      className="space-y-4"
    >
      <input type="hidden" name="concepto" value={form.concepto} />
      <input type="hidden" name="monto" value={form.monto} />
      <input type="hidden" name="cantidadKg" value={form.cantidadKg} />
      <input type="hidden" name="fecha" value={form.fecha} />
      <input type="hidden" name="compradorId" value={form.compradorId} />
      <input type="hidden" name="cultivoId" value={form.cultivoId} />
      <input type="hidden" name="notas" value={form.notas} />

      <Input
        label="Concepto"
        value={form.concepto}
        onChange={(e) => { setForm({ ...form, concepto: e.target.value }); if (errors.concepto) setErrors((p) => ({ ...p, concepto: "" })); }}
        placeholder="Ej: Venta aguacate Hass"
        error={errors.concepto}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Monto total (COP)" type="number" value={form.monto} onChange={(e) => { setForm({ ...form, monto: e.target.value }); if (errors.monto) setErrors((p) => ({ ...p, monto: "" })); }} placeholder="0" min="1" error={errors.monto} />
        <Input label="Cantidad (kg)" type="number" value={form.cantidadKg} onChange={(e) => setForm({ ...form, cantidadKg: e.target.value })} placeholder="Opcional" min="0" />
      </div>
      {precioKgCalc && (
        <p className="text-[12px] text-agro-600 bg-agro-50 px-3 py-2 rounded-[var(--radius-md)]">
          Precio calculado: <strong>{formatCOP(Number(precioKgCalc))}/kg</strong>
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Fecha" type="date" value={form.fecha} max={today} onChange={(e) => setForm({ ...form, fecha: e.target.value })} error={errors.fecha} />
        <Select label="Cultivo asociado" value={form.cultivoId} onChange={(e) => setForm({ ...form, cultivoId: e.target.value })} options={cultivos.map((c) => ({ value: c.id, label: `${c.lote.nombre} · ${c.variedad}` }))} placeholder="Sin asociar" />
      </div>
      {compradores.length > 0 && (
        <Select label="Comprador" value={form.compradorId} onChange={(e) => setForm({ ...form, compradorId: e.target.value })} options={compradores.map((c) => ({ value: c.id, label: c.nombre }))} placeholder="Sin comprador" />
      )}
      <Textarea label="Notas (opcional)" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Detalles adicionales..." rows={2} />
      <div className="flex gap-3 justify-end pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <SubmitButton />
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { CATEGORIA_LABELS, TIPO_GASTO_LABELS } from "@/types";
import { gastoFormSchema } from "@/lib/validations";
import { formatCOP, formatCOPFull } from "@/lib/utils";
import toast from "react-hot-toast";
import type { CategoriaGasto, Cultivo, Lote, TipoGasto } from "@prisma/client";
import { crearGasto, actualizarGasto, type GastoActionState, type GastoConRelaciones } from "@/app/(dashboard)/dashboard/finanzas/gasto-actions";

type GastoWithRelations = GastoConRelaciones;
type CultivoConLote = Cultivo & { lote: Lote };

interface GastoFormProps {
  gasto?: GastoWithRelations | null;
  cultivos: CultivoConLote[];
  lotes: { id: string; nombre: string; areaHa: number }[];
  onSuccess: (gasto: GastoConRelaciones) => void;
  onCancel: () => void;
}

const today = new Date().toISOString().split("T")[0];
const initialState: GastoActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>Guardar gasto</Button>;
}

export function GastoForm({ gasto, cultivos, lotes, onSuccess, onCancel }: GastoFormProps) {
  const isEditing = !!gasto;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    concepto: gasto?.concepto ?? "",
    categoria: (gasto?.categoria ?? "INSUMOS") as CategoriaGasto,
    tipoGasto: (gasto?.tipoGasto ?? "VARIABLE") as TipoGasto,
    monto: gasto?.monto?.toString() ?? "",
    fecha: gasto ? new Date(gasto.fecha).toISOString().split("T")[0] : today,
    proveedor: gasto?.proveedor ?? "",
    notas: gasto?.notas ?? "",
    cultivoId: gasto?.cultivoId ?? "",
    loteId: gasto?.loteId ?? "",
    subcategoria: gasto?.subcategoria ?? "",
    cantidad: gasto?.cantidad?.toString() ?? "",
    unidad: gasto?.unidad ?? "",
    precioUnitario: gasto?.precioUnitario?.toString() ?? "",
  });

  // Auto-calcular monto desde cantidad × precioUnitario — misma lógica que
  // tenía FinanzasClient.tsx antes de extraer este componente.
  const montoCalc = useMemo(() => {
    const cant = Number(form.cantidad);
    const precio = Number(form.precioUnitario);
    if (cant > 0 && precio > 0) return (cant * precio).toString();
    return null;
  }, [form.cantidad, form.precioUnitario]);

  const cultivosFiltrados = useMemo(() => {
    if (!form.loteId) return cultivos;
    return cultivos.filter((c) => c.loteId === form.loteId);
  }, [form.loteId, cultivos]);

  const action = isEditing ? actualizarGasto.bind(null, gasto.id) : crearGasto;
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.fieldErrors) setErrors(state.fieldErrors);
    if (state.error) toast.error(state.error);
    if (state.gasto) {
      toast.success(isEditing ? "Gasto actualizado" : "Gasto registrado");
      onSuccess(state.gasto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Validación de cliente para feedback inmediato — misma zod schema que
  // corre en el servidor dentro de la Server Action.
  const validateClientSide = (): boolean => {
    const montoFinal = montoCalc || form.monto;
    const result = gastoFormSchema.safeParse({
      ...form,
      monto: montoFinal ? Number(montoFinal) : undefined,
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
      <input type="hidden" name="categoria" value={form.categoria} />
      <input type="hidden" name="tipoGasto" value={form.tipoGasto} />
      <input type="hidden" name="monto" value={montoCalc || form.monto} />
      <input type="hidden" name="fecha" value={form.fecha} />
      <input type="hidden" name="proveedor" value={form.proveedor} />
      <input type="hidden" name="notas" value={form.notas} />
      <input type="hidden" name="cultivoId" value={form.cultivoId} />
      <input type="hidden" name="loteId" value={form.loteId} />
      <input type="hidden" name="subcategoria" value={form.subcategoria} />
      <input type="hidden" name="cantidad" value={form.cantidad} />
      <input type="hidden" name="unidad" value={form.unidad} />
      <input type="hidden" name="precioUnitario" value={form.precioUnitario} />

      <Input
        label="Concepto del gasto"
        value={form.concepto}
        onChange={(e) => { setForm({ ...form, concepto: e.target.value }); if (errors.concepto) setErrors((p) => ({ ...p, concepto: "" })); }}
        placeholder="Ej: Plántulas Hass certificadas"
        error={errors.concepto}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Categoría" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaGasto })} options={Object.entries(CATEGORIA_LABELS).map(([v, l]) => ({ value: v, label: l }))} error={errors.categoria} />
        <Select label="Tipo de gasto" value={form.tipoGasto} onChange={(e) => setForm({ ...form, tipoGasto: e.target.value as TipoGasto })} options={Object.entries(TIPO_GASTO_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
      </div>

      <Input label="Subcategoría (opcional)" value={form.subcategoria} onChange={(e) => setForm({ ...form, subcategoria: e.target.value })} placeholder="Ej: Fungicida, Jornal poda" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Lote (opcional)" value={form.loteId} onChange={(e) => setForm({ ...form, loteId: e.target.value, cultivoId: "" })} options={lotes.map((l) => ({ value: l.id, label: `${l.nombre} (${l.areaHa} ha)` }))} placeholder="Sin asignar" />
        <Select label="Cultivo (opcional)" value={form.cultivoId} onChange={(e) => setForm({ ...form, cultivoId: e.target.value })} options={cultivosFiltrados.map((c) => ({ value: c.id, label: `${c.lote.nombre} · ${c.variedad}` }))} placeholder="Sin asociar" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input label="Cantidad" type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} placeholder="Ej: 10" min="0" />
        <Input label="Unidad" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="kg, litros, jornales" />
        <Input label="Precio unitario" type="number" value={form.precioUnitario} onChange={(e) => setForm({ ...form, precioUnitario: e.target.value })} placeholder="$/unidad" min="0" />
      </div>

      {montoCalc && (
        <p className="text-[12px] text-agro-600 bg-agro-50 px-3 py-2 rounded-[var(--radius-md)]">
          Monto calculado: <strong>{formatCOPFull(Number(montoCalc))}</strong> ({form.cantidad} × {formatCOP(Number(form.precioUnitario))})
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Monto total (COP)" type="number" value={montoCalc || form.monto} onChange={(e) => { setForm({ ...form, monto: e.target.value }); if (errors.monto) setErrors((p) => ({ ...p, monto: "" })); }} placeholder="0" min="0" error={errors.monto} disabled={!!montoCalc} />
        <Input label="Fecha" type="date" value={form.fecha} max={today} onChange={(e) => setForm({ ...form, fecha: e.target.value })} error={errors.fecha} />
      </div>

      <Input label="Proveedor (opcional)" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} placeholder="Nombre del proveedor" />

      <Textarea label="Notas (opcional)" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Detalles adicionales..." rows={2} />

      <div className="flex gap-3 justify-end pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <SubmitButton />
      </div>
    </form>
  );
}

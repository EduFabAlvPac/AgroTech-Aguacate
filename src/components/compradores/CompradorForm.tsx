"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { TIPO_COMPRADOR_LABELS } from "@/types";
import { compradorFormSchema } from "@/lib/validations";
import toast from "react-hot-toast";
import type { Comprador, TipoComprador } from "@prisma/client";
import { crearComprador, actualizarComprador, type CompradorActionState } from "@/app/(dashboard)/dashboard/compradores/comprador-actions";

interface CompradorFormProps {
  comprador?: Comprador | null;
  especiesDisponibles: string[];
  onSuccess: (comprador: Comprador) => void;
  onCancel: () => void;
}

const initialState: CompradorActionState = {};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>{isEditing ? "Guardar cambios" : "Crear comprador"}</Button>;
}

export function CompradorForm({ comprador, especiesDisponibles, onSuccess, onCancel }: CompradorFormProps) {
  const isEditing = !!comprador;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    nombre: comprador?.nombre ?? "",
    tipo: (comprador?.tipo ?? "COOPERATIVA") as TipoComprador,
    ciudad: comprador?.ciudad ?? "",
    departamento: comprador?.departamento ?? "",
    contacto: comprador?.contacto ?? "",
    email: comprador?.email ?? "",
    telefono: comprador?.telefono ?? "",
    capacidadTon: comprador?.capacidadTon?.toString() ?? "",
    precioKg: comprador?.precioKg?.toString() ?? "",
    notas: comprador?.notas ?? "",
    estado: comprador?.estado ?? "ACTIVO",
    especiesInteres: comprador?.especiesInteres ?? ([] as string[]),
  });

  const action = isEditing ? actualizarComprador.bind(null, comprador.id) : crearComprador;
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.fieldErrors) setErrors(state.fieldErrors);
    if (state.error) toast.error(state.error);
    if (state.comprador) {
      toast.success(isEditing ? "Comprador actualizado" : "Comprador creado");
      onSuccess(state.comprador);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const validateClientSide = (): boolean => {
    const payload = {
      ...form,
      capacidadTon: form.capacidadTon ? Number(form.capacidadTon) : undefined,
      precioKg: form.precioKg ? Number(form.precioKg) : undefined,
    };
    const result = compradorFormSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
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
      <input type="hidden" name="nombre" value={form.nombre} />
      <input type="hidden" name="tipo" value={form.tipo} />
      <input type="hidden" name="ciudad" value={form.ciudad} />
      <input type="hidden" name="departamento" value={form.departamento} />
      <input type="hidden" name="contacto" value={form.contacto} />
      <input type="hidden" name="email" value={form.email} />
      <input type="hidden" name="telefono" value={form.telefono} />
      <input type="hidden" name="capacidadTon" value={form.capacidadTon} />
      <input type="hidden" name="precioKg" value={form.precioKg} />
      <input type="hidden" name="notas" value={form.notas} />
      <input type="hidden" name="estado" value={form.estado} />
      <input type="hidden" name="especiesInteres" value={JSON.stringify(form.especiesInteres)} />

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input
            label="Nombre o razón social"
            value={form.nombre}
            onChange={(e) => { setForm({ ...form, nombre: e.target.value }); if (errors.nombre) setErrors((p) => ({ ...p, nombre: "" })); }}
            placeholder="Ej: CoopAgroNS"
            error={errors.nombre}
          />
        </div>
        <Select
          label="Tipo"
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoComprador })}
          options={Object.entries(TIPO_COMPRADOR_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          error={errors.tipo}
        />
        <Select
          label="Estado"
          value={form.estado}
          onChange={(e) => setForm({ ...form, estado: e.target.value })}
          options={[
            { value: "ACTIVO", label: "Activo" },
            { value: "PROSPECTO", label: "Prospecto" },
            { value: "INACTIVO", label: "Inactivo" },
          ]}
          error={errors.estado}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Ciudad" value={form.ciudad} onChange={(e) => { setForm({ ...form, ciudad: e.target.value }); if (errors.ciudad) setErrors((p) => ({ ...p, ciudad: "" })); }} placeholder="Cúcuta" error={errors.ciudad} />
        <Input label="Departamento" value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} placeholder="Norte de Santander" error={errors.departamento} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Precio/kg (COP)" type="number" value={form.precioKg} onChange={(e) => setForm({ ...form, precioKg: e.target.value })} placeholder="3200" error={errors.precioKg} />
        <Input label="Capacidad (ton/mes)" type="number" value={form.capacidadTon} onChange={(e) => setForm({ ...form, capacidadTon: e.target.value })} placeholder="10" error={errors.capacidadTon} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+57 300 000 0000" error={errors.telefono} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }} placeholder="contacto@empresa.co" error={errors.email} />
      </div>

      <Input label="Persona de contacto" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del contacto" error={errors.contacto} />

      {especiesDisponibles.length > 0 && (
        <div>
          <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Cultivos que compra</label>
          <div className="flex flex-wrap gap-2">
            {especiesDisponibles.map((especie) => {
              const checked = form.especiesInteres.includes(especie);
              return (
                <button
                  key={especie}
                  type="button"
                  onClick={() => setForm({ ...form, especiesInteres: checked ? form.especiesInteres.filter((e) => e !== especie) : [...form.especiesInteres, especie] })}
                  className={`px-3 py-1.5 rounded-full border text-[12px] transition-colors ${checked ? "border-brand-400 bg-brand-50 text-brand-600 font-medium" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-agro-200"}`}
                >
                  {especie}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Textarea label="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Condiciones de compra, horarios, requisitos especiales..." rows={2} error={errors.notas} />

      <div className="flex gap-3 justify-end pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}

"use client";

import { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { ETAPA_LABELS, ESTADO_CULTIVO_LABELS } from "@/types";
import toast from "react-hot-toast";
import type { Cultivo, EtapaCultivo, EstadoCultivo } from "@prisma/client";
import {
  crearCultivo,
  actualizarCultivo,
  type CultivoActionState,
} from "@/app/(dashboard)/dashboard/cultivos/cultivo-actions";

const OTRO_CULTIVO = "__otro__";

interface CatalogoFicha {
  id: string;
  version: number;
}

interface CatalogoVariedad {
  id: string;
  nombre: string;
  fichas: CatalogoFicha[];
}

interface CatalogoEspecie {
  id: string;
  nombre: string;
  variedades: CatalogoVariedad[];
}

interface CatalogoOpcion {
  variedadId: string;
  label: string;
}

interface CultivoFormProps {
  loteId: string;
  loteAreaHa?: number;
  cultivo?: Cultivo | null;
  onSuccess: (cultivo: Cultivo) => void;
  onCancel: () => void;
}

// Extended cultivo type for fields that may not be in the base Prisma type yet
type CultivoExtended = Cultivo & {
  sistemaSiembra?: string | null;
  distanciaSiembra?: string | null;
  proveedorMaterial?: string | null;
  observaciones?: string | null;
};

const ETAPA_OPTIONS = Object.entries(ETAPA_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const ESTADO_OPTIONS = Object.entries(ESTADO_CULTIVO_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const initialState: CultivoActionState = {};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {isEditing ? "Actualizar" : "Crear cultivo"}
    </Button>
  );
}

export function CultivoForm({ loteId, loteAreaHa, cultivo: rawCultivo, onSuccess, onCancel }: CultivoFormProps) {
  const cultivo = rawCultivo as CultivoExtended | null | undefined;
  const isEditing = !!cultivo;

  // Section 1 — Información básica
  const [especie, setEspecie] = useState(cultivo?.especie ?? "");
  const [variedad, setVariedad] = useState(cultivo?.variedad ?? "");
  const [estado, setEstado] = useState<EstadoCultivo>(cultivo?.estado ?? "ACTIVO");

  // Motor de fichas técnicas (RF5) — catálogo especie+variedad en vez de
  // texto libre. Si el cultivo editado ya tiene variedadId, se preselecciona;
  // si no, arranca en modo manual (compatibilidad con cultivos legacy).
  const [catalogo, setCatalogo] = useState<CatalogoOpcion[]>([]);
  const [variedadId, setVariedadId] = useState<string>(cultivo?.variedadId ?? "");
  const [modoManual, setModoManual] = useState(!variedadId);

  useEffect(() => {
    fetch("/api/cultivos/vincular-especie")
      .then((res) => res.json())
      .then(({ data }: { data: CatalogoEspecie[] }) => {
        const opciones: CatalogoOpcion[] = [];
        for (const especieItem of data ?? []) {
          for (const variedadItem of especieItem.variedades ?? []) {
            if (variedadItem.fichas.length > 0) {
              opciones.push({ variedadId: variedadItem.id, label: `${especieItem.nombre} ${variedadItem.nombre}` });
            }
          }
        }
        setCatalogo(opciones);
      })
      .catch(() => {
        // Si falla, el usuario sigue pudiendo crear el cultivo en modo manual.
        setModoManual(true);
      });
  }, []);

  const handleCatalogoChange = (value: string) => {
    if (value === OTRO_CULTIVO) {
      setModoManual(true);
      setVariedadId("");
      return;
    }
    setModoManual(false);
    setVariedadId(value);
    const opcion = catalogo.find((o) => o.variedadId === value);
    if (opcion) {
      // Se muestran de referencia; el servidor resuelve los valores finales.
      const [especieBase, ...resto] = opcion.label.split(" ");
      setEspecie(especieBase);
      setVariedad(resto.join(" "));
    }
  };

  // Section 2 — Siembra
  const [fechaSiembra, setFechaSiembra] = useState(
    cultivo?.fechaSiembra ? new Date(cultivo.fechaSiembra).toISOString().split("T")[0] : ""
  );
  const [cantidadPlantas, setCantidadPlantas] = useState(
    cultivo?.cantidadPlantas?.toString() ?? ""
  );
  const [densidadHa, setDensidadHa] = useState(
    cultivo?.densidadHa?.toString() ?? ""
  );
  const [sistemaSiembra, setSistemaSiembra] = useState(cultivo?.sistemaSiembra ?? "");
  const [distanciaSiembra, setDistanciaSiembra] = useState(cultivo?.distanciaSiembra ?? "");
  // Proveedor de plántulas: para poder comparar a futuro qué proveedor da
  // los mejores árboles (seguimiento de calidad de material vegetal por
  // vivero/proveedor a lo largo de varios cultivos).
  const [proveedorMaterial, setProveedorMaterial] = useState(cultivo?.proveedorMaterial ?? "");

  // Section 3 — Ciclo y etapa
  const [etapa, setEtapa] = useState<EtapaCultivo>(cultivo?.etapa ?? "PREPARACION");
  const [observaciones, setObservaciones] = useState(cultivo?.observaciones ?? "");

  // Auto-calculate density when cantidadPlantas changes and loteAreaHa is available
  useEffect(() => {
    if (cantidadPlantas && loteAreaHa && loteAreaHa > 0) {
      const calculated = Math.round(Number(cantidadPlantas) / loteAreaHa);
      if (calculated > 0) {
        setDensidadHa(calculated.toString());
      }
    }
  }, [cantidadPlantas, loteAreaHa]);

  // Server Action (Fase 1, ADR-006) — useActionState reemplaza el
  // fetch+useState(loading) manual.
  const action = isEditing ? actualizarCultivo.bind(null, cultivo.id) : crearCultivo;
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.cultivo) {
      toast.success(isEditing ? "Cultivo actualizado" : "Cultivo registrado correctamente");
      onSuccess(state.cultivo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!especie.trim()) {
          e.preventDefault();
          toast.error("La especie es requerida");
        }
      }}
      className="space-y-6"
    >
      <input type="hidden" name="loteId" value={loteId} />
      <input type="hidden" name="variedadId" value={!modoManual && variedadId ? variedadId : ""} />
      <input type="hidden" name="especie" value={especie.trim()} />
      <input type="hidden" name="variedad" value={variedad.trim()} />
      <input type="hidden" name="estado" value={estado} />
      <input type="hidden" name="fechaSiembra" value={fechaSiembra} />
      <input type="hidden" name="cantidadPlantas" value={cantidadPlantas} />
      <input type="hidden" name="densidadHa" value={densidadHa} />
      <input type="hidden" name="sistemaSiembra" value={sistemaSiembra.trim()} />
      <input type="hidden" name="distanciaSiembra" value={distanciaSiembra.trim()} />
      <input type="hidden" name="proveedorMaterial" value={proveedorMaterial.trim()} />
      <input type="hidden" name="etapa" value={etapa} />
      <input type="hidden" name="observaciones" value={observaciones.trim()} />
      {/* Section 1 — Información básica */}
      <div>
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          Información básica
        </h3>
        {catalogo.length > 0 && (
          <div className="mb-3">
            <Select
              label="Cultivo y variedad *"
              value={modoManual ? OTRO_CULTIVO : variedadId}
              onChange={(e) => handleCatalogoChange(e.target.value)}
              options={[
                ...catalogo.map((o) => ({ value: o.variedadId, label: o.label })),
                { value: OTRO_CULTIVO, label: "Otro cultivo (especificar manualmente)" },
              ]}
            />
            {!modoManual && variedadId && (
              <p className="text-[11px] text-agro-600 bg-agro-50 px-2 py-1.5 rounded mt-1.5">
                ✅ Se activará automáticamente la ficha técnica de {especie} {variedad} (calendario, riego, nutrición y alertas).
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Especie *"
            value={especie}
            onChange={(e) => setEspecie(e.target.value)}
            placeholder="Ej: Aguacate, Cítrico, Café"
            required
            disabled={!modoManual}
          />
          <Input
            label="Variedad"
            value={variedad}
            onChange={(e) => setVariedad(e.target.value)}
            placeholder="Ej: Hass, Papelillo, Grand Nain, Castillo"
            disabled={!modoManual}
          />
          <Select
            label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoCultivo)}
            options={ESTADO_OPTIONS}
          />
        </div>
      </div>

      {/* Section 2 — Siembra */}
      <div>
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          Siembra
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Fecha de siembra"
            type="date"
            value={fechaSiembra}
            onChange={(e) => setFechaSiembra(e.target.value)}
          />
          <Input
            label="Cantidad de plantas"
            type="number"
            min={0}
            value={cantidadPlantas}
            onChange={(e) => setCantidadPlantas(e.target.value)}
            placeholder="Ej: 160"
          />
          <Input
            label={`Densidad plantas/ha${loteAreaHa ? " (auto)" : ""}`}
            type="number"
            min={0}
            value={densidadHa}
            onChange={(e) => setDensidadHa(e.target.value)}
            placeholder="Ej: 160"
          />
          <Input
            label="Sistema de siembra"
            value={sistemaSiembra}
            onChange={(e) => setSistemaSiembra(e.target.value)}
            placeholder="Ej: Cuadrado 8x8m, Tresbolillo 7x7m"
          />
          <Input
            label="Distancia de siembra"
            value={distanciaSiembra}
            onChange={(e) => setDistanciaSiembra(e.target.value)}
            placeholder="Ej: 8x8m, 7x7m, 6x8m"
          />
          <Input
            label="Proveedor de plántulas"
            value={proveedorMaterial}
            onChange={(e) => setProveedorMaterial(e.target.value)}
            placeholder="Ej: Vivero Agropaltas, ICA certificado"
          />
        </div>
      </div>

      {/* Section 3 — Ciclo y etapa */}
      <div>
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          Ciclo y etapa
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <Select
            label="Etapa actual"
            value={etapa}
            onChange={(e) => setEtapa(e.target.value as EtapaCultivo)}
            options={ETAPA_OPTIONS}
          />
          <Textarea
            label="Observaciones técnicas"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas técnicas adicionales sobre el cultivo..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2 border-t border-[var(--border-subtle)]">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}

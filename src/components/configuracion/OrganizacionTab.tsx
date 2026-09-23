"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import type { OrganizacionResumen } from "@/lib/data/configuracion";
import { actualizarOrganizacion } from "@/app/(dashboard)/dashboard/configuracion/organizacion-actions";

/**
 * Pestaña "Organización" de Configuración (ADR-011 Sprint 3) — primer lugar
 * de la app donde se puede editar la `Organizacion` después de crearse en el
 * registro. Solo la ve el OWNER (gateado en ConfigClient.tsx/page.tsx, esta
 * pestaña ni se renderiza para nadie más).
 *
 * `tipo`/`plan` son de solo lectura acá a propósito — cambiar el tipo de una
 * organización (ej. a COOPERATIVA) implica trial/límites que este formulario
 * no maneja (ver docs/ADR-011-notas-de-implementacion.md, Sprint 3).
 */

const TIPO_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  COOPERATIVA: "Cooperativa",
  GREMIO: "Gremio",
  ASOCIACION_CAMPESINA: "Asociación campesina",
  FUNDACION: "Fundación",
  GOBIERNO: "Gobierno",
  UNIVERSIDAD: "Universidad",
  ONG: "ONG",
  EMPRESA_PRIVADA: "Empresa privada",
  CRECIAGRO_INTERNAL: "CrecIAgro (interno)",
};

const PLAN_LABELS: Record<string, string> = {
  GRATUITO: "Gratuito",
  PRODUCTOR: "Productor",
  COOPERATIVA: "Cooperativa",
  ENTERPRISE: "Enterprise",
  SEMILLA_TRIAL: "Semilla (prueba)",
  FINCA_PRO: "Finca Pro",
  COLECTIVO: "Colectivo",
  EMPRESARIAL: "Empresarial",
  GERMIAMIGO_INDIVIDUAL: "GermIAmigo",
  GERMIAMIGO_SEMILLA: "GermIAmigo Semilla",
};

interface OrganizacionTabProps {
  organizacion: OrganizacionResumen;
}

export function OrganizacionTab({ organizacion: inicial }: OrganizacionTabProps) {
  const [, startTransition] = useTransition();
  const [organizacion, setOrganizacion] = useState(inicial);
  const [form, setForm] = useState({
    nombre: inicial.nombre,
    nit: inicial.nit ?? "",
    ciudad: inicial.ciudad ?? "",
    departamento: inicial.departamento ?? "",
    emailContacto: inicial.emailContacto ?? "",
    celularContacto: inicial.celularContacto ?? "",
  });
  const [guardando, setGuardando] = useState(false);

  const guardar = () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    setGuardando(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("nombre", form.nombre);
        fd.set("nit", form.nit);
        fd.set("ciudad", form.ciudad);
        fd.set("departamento", form.departamento);
        fd.set("emailContacto", form.emailContacto);
        fd.set("celularContacto", form.celularContacto);

        const result = await actualizarOrganizacion({}, fd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.organizacion) setOrganizacion(result.organizacion);
        toast.success("Organización actualizada");
      } finally {
        setGuardando(false);
      }
    });
  };

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Datos de tu organización</h2>
        <p className="text-[12px] text-[var(--text-muted)]">
          Esta información identifica a tu organización dentro de GermIA — nombre, NIT y datos de contacto.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-agro-600 bg-agro-50 border border-agro-100 rounded-full px-2.5 py-1">
          {TIPO_LABELS[organizacion.tipo] ?? organizacion.tipo}
        </span>
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-page)] border border-[var(--border-default)] rounded-full px-2.5 py-1">
          Plan {PLAN_LABELS[organizacion.plan] ?? organizacion.plan}
        </span>
      </div>

      <div className="space-y-4">
        <Input
          label="Nombre *"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Finca Álvarez Pacheco"
        />
        <Input
          label="NIT"
          value={form.nit}
          onChange={(e) => setForm({ ...form, nit: e.target.value })}
          placeholder="900.123.456-7"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ciudad"
            value={form.ciudad}
            onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            placeholder="Ocaña"
          />
          <Input
            label="Departamento"
            value={form.departamento}
            onChange={(e) => setForm({ ...form, departamento: e.target.value })}
            placeholder="Norte de Santander"
          />
        </div>
        <div className="border-t border-[var(--border-subtle)] pt-4 space-y-4">
          <h3 className="text-[13px] font-medium text-[var(--text-secondary)]">Contacto de la organización</h3>
          <Input
            label="Correo de contacto"
            type="email"
            value={form.emailContacto}
            onChange={(e) => setForm({ ...form, emailContacto: e.target.value })}
            placeholder="contacto@tuorganizacion.co"
          />
          <Input
            label="Celular de contacto"
            value={form.celularContacto}
            onChange={(e) => setForm({ ...form, celularContacto: e.target.value })}
            placeholder="+57 300 000 0000"
          />
        </div>
      </div>

      <Button onClick={guardar} loading={guardando} className="w-full">
        <Save size={15} />
        Guardar organización
      </Button>
    </div>
  );
}

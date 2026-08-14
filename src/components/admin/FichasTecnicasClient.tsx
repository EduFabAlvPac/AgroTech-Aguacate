"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Leaf, ChevronRight, FileText } from "lucide-react";
import { Button, Modal, Input, EmptyState } from "@/components/ui";
import { ESTADO_FICHA_LABELS } from "@/types";
import toast from "react-hot-toast";
import type { EstadoFicha } from "@prisma/client";
import { crearEspecie, crearVariedad, crearFicha } from "@/app/(dashboard)/dashboard/admin/fichas-tecnicas/ficha-actions";

interface FichaResumen {
  id: string;
  version: number;
  estado: EstadoFicha;
  publicadaEn: Date | string | null;
}

interface VariedadConFichas {
  id: string;
  nombre: string;
  slug: string;
  fichas: FichaResumen[];
  _count: { cultivos: number };
}

interface EspecieConVariedades {
  id: string;
  slug: string;
  nombre: string;
  familia: string | null;
  variedades: VariedadConFichas[];
}

// Mismo mapa de color que ETAPA_COLORS en CultivosList.tsx — pill rounded-full
// con color de fondo/texto inline en vez de las clases badge-* genéricas.
const ESTADO_COLORS: Record<EstadoFicha, { bg: string; color: string }> = {
  BORRADOR: { bg: "var(--color-surface-gray)", color: "var(--color-text-soft)" },
  PUBLICADA: { bg: "var(--color-brand-bg)", color: "var(--color-brand-dark)" },
  ARCHIVADA: { bg: "var(--color-amber-bg)", color: "#8A5E20" },
};

const emptyEspecieForm = { nombre: "", slug: "", familia: "" };
const emptyVariedadForm = { nombre: "", slug: "" };

export function FichasTecnicasClient({ especies: initial }: { especies: EspecieConVariedades[] }) {
  const [especies, setEspecies] = useState(initial);
  const [showEspecieModal, setShowEspecieModal] = useState(false);
  const [especieForm, setEspecieForm] = useState(emptyEspecieForm);
  const [loadingEspecie, setLoadingEspecie] = useState(false);

  const [variedadModalEspecieId, setVariedadModalEspecieId] = useState<string | null>(null);
  const [variedadForm, setVariedadForm] = useState(emptyVariedadForm);
  const [loadingVariedad, setLoadingVariedad] = useState(false);

  const [creandoFichaVariedadId, setCreandoFichaVariedadId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // Server Action nativa (Fase 1, ADR-006) en vez de fetch — llamada
  // directa dentro de startTransition. No se usa useActionState: estos
  // modales manejan su propio "loading" local por handler, como el resto
  // de módulos donde la mutación no está atada a un <form> con submit
  // nativo (mismo criterio que Equipo/Compradores).
  const handleCrearEspecie = () => {
    if (!especieForm.nombre.trim()) return toast.error("El nombre es requerido");
    const slug = especieForm.slug.trim() || slugify(especieForm.nombre);
    setLoadingEspecie(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("nombre", especieForm.nombre.trim());
        fd.set("slug", slug);
        if (especieForm.familia.trim()) fd.set("familia", especieForm.familia.trim());

        const result = await crearEspecie({}, fd);
        if (result.error || !result.especie) {
          toast.error(result.error || "Error al crear especie");
          return;
        }
        setEspecies((prev) => [...prev, { ...result.especie!, variedades: [] }].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        toast.success("Especie creada");
        setShowEspecieModal(false);
        setEspecieForm(emptyEspecieForm);
      } finally {
        setLoadingEspecie(false);
      }
    });
  };

  const handleCrearVariedad = () => {
    if (!variedadModalEspecieId) return;
    if (!variedadForm.nombre.trim()) return toast.error("El nombre es requerido");
    const slug = variedadForm.slug.trim() || slugify(variedadForm.nombre);
    const especieId = variedadModalEspecieId;
    setLoadingVariedad(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("nombre", variedadForm.nombre.trim());
        fd.set("slug", slug);

        const result = await crearVariedad(especieId, {}, fd);
        if (result.error || !result.variedad) {
          toast.error(result.error || "Error al crear variedad");
          return;
        }
        setEspecies((prev) =>
          prev.map((e) =>
            e.id === especieId
              ? { ...e, variedades: [...e.variedades, { ...result.variedad!, fichas: [], _count: { cultivos: 0 } }] }
              : e
          )
        );
        toast.success("Variedad creada");
        setVariedadModalEspecieId(null);
        setVariedadForm(emptyVariedadForm);
      } finally {
        setLoadingVariedad(false);
      }
    });
  };

  const handleCrearFicha = (variedadId: string, clonarDeId?: string) => {
    setCreandoFichaVariedadId(variedadId);
    startTransition(async () => {
      const result = await crearFicha(variedadId, clonarDeId);
      if (result.error || !result.ficha) {
        toast.error(result.error || "Error al crear ficha técnica");
        setCreandoFichaVariedadId(null);
        return;
      }
      window.location.href = `/dashboard/admin/fichas-tecnicas/${result.ficha.id}`;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowEspecieModal(true)}>
          <Plus size={16} /> Nueva especie
        </Button>
      </div>

      {especies.length === 0 ? (
        <EmptyState
          icon={<Leaf size={24} />}
          title="Sin especies en el catálogo"
          description="Crea la primera especie (ej. Aguacate, Café, Cacao) para empezar a construir fichas técnicas."
        />
      ) : (
        <div className="space-y-3">
          {especies.map((especie) => (
            <div key={especie.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-agro-50 flex items-center justify-center flex-shrink-0">
                    <Leaf size={18} className="text-agro-400" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{especie.nombre}</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {especie.slug}
                      {especie.familia ? ` · ${especie.familia}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setVariedadModalEspecieId(especie.id);
                    setVariedadForm(emptyVariedadForm);
                  }}
                >
                  <Plus size={14} /> Variedad
                </Button>
              </div>

              {especie.variedades.length === 0 ? (
                <p className="text-[12px] text-[var(--text-muted)] italic">Sin variedades todavía.</p>
              ) : (
                <div className="space-y-2">
                  {especie.variedades.map((variedad) => {
                    const fichaActual = variedad.fichas[0];
                    return (
                      <div
                        key={variedad.id}
                        className="flex items-center justify-between px-3 py-2 bg-[var(--surface-page)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">{variedad.nombre}</span>
                          {fichaActual ? (
                            <span
                              className="badge text-[10px] font-medium rounded-full px-2 py-0.5"
                              style={{ background: ESTADO_COLORS[fichaActual.estado].bg, color: ESTADO_COLORS[fichaActual.estado].color }}
                            >
                              v{fichaActual.version} · {ESTADO_FICHA_LABELS[fichaActual.estado]}
                            </span>
                          ) : (
                            <span className="badge badge-neutral">Sin ficha</span>
                          )}
                          {variedad._count.cultivos > 0 && (
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {variedad._count.cultivos} cultivo(s) usándola
                            </span>
                          )}
                        </div>

                        {fichaActual ? (
                          <Link
                            href={`/dashboard/admin/fichas-tecnicas/${fichaActual.id}` as any}
                            className="flex items-center gap-1 text-[12px] font-medium text-agro-600 hover:text-agro-400"
                          >
                            <FileText size={14} /> Editar ficha <ChevronRight size={14} />
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={creandoFichaVariedadId === variedad.id}
                            onClick={() => handleCrearFicha(variedad.id)}
                          >
                            Crear ficha técnica
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: nueva especie */}
      <Modal isOpen={showEspecieModal} onClose={() => setShowEspecieModal(false)} title="Nueva especie">
        <div className="space-y-3">
          <p className="text-[12px] text-[var(--text-muted)] -mt-1">
            Nombre genérico del cultivo, sin variedad — la variedad se agrega después con
            "+ Variedad" dentro de la especie (ej. Hass, Papelillo, Choquette bajo "Aguacate").
          </p>
          <Input
            label="Nombre *"
            value={especieForm.nombre}
            onChange={(e) => setEspecieForm({ ...especieForm, nombre: e.target.value })}
            placeholder="Ej: Aguacate, Café, Cacao, Limón"
          />
          <Input
            label="Slug"
            value={especieForm.slug}
            onChange={(e) => setEspecieForm({ ...especieForm, slug: e.target.value })}
            placeholder="Se genera automáticamente si lo dejas vacío"
          />
          <Input
            label="Familia botánica"
            value={especieForm.familia}
            onChange={(e) => setEspecieForm({ ...especieForm, familia: e.target.value })}
            placeholder="Ej: Lauraceae"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEspecieModal(false)}>Cancelar</Button>
            <Button loading={loadingEspecie} onClick={handleCrearEspecie}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: nueva variedad */}
      <Modal isOpen={!!variedadModalEspecieId} onClose={() => setVariedadModalEspecieId(null)} title="Nueva variedad">
        <div className="space-y-3">
          <Input
            label="Nombre *"
            value={variedadForm.nombre}
            onChange={(e) => setVariedadForm({ ...variedadForm, nombre: e.target.value })}
            placeholder="Ej: Papelillo"
          />
          <Input
            label="Slug"
            value={variedadForm.slug}
            onChange={(e) => setVariedadForm({ ...variedadForm, slug: e.target.value })}
            placeholder="Se genera automáticamente si lo dejas vacío"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setVariedadModalEspecieId(null)}>Cancelar</Button>
            <Button loading={loadingVariedad} onClick={handleCrearVariedad}>Crear</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

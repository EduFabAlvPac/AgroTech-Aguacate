"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Leaf, ChevronRight, FileText } from "lucide-react";
import { Button, Modal, Input, EmptyState } from "@/components/ui";
import { ESTADO_FICHA_LABELS } from "@/types";
import toast from "react-hot-toast";
import type { EstadoFicha } from "@prisma/client";

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

const ESTADO_BADGE: Record<EstadoFicha, string> = {
  BORRADOR: "badge-neutral",
  PUBLICADA: "badge-success",
  ARCHIVADA: "badge-warning",
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

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const handleCrearEspecie = async () => {
    if (!especieForm.nombre.trim()) return toast.error("El nombre es requerido");
    const slug = especieForm.slug.trim() || slugify(especieForm.nombre);
    setLoadingEspecie(true);
    try {
      const res = await fetch("/api/admin/especies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: especieForm.nombre.trim(), slug, familia: especieForm.familia.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear especie");
      setEspecies((prev) => [...prev, { ...json.data, variedades: [] }].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      toast.success("Especie creada");
      setShowEspecieModal(false);
      setEspecieForm(emptyEspecieForm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear especie");
    } finally {
      setLoadingEspecie(false);
    }
  };

  const handleCrearVariedad = async () => {
    if (!variedadModalEspecieId) return;
    if (!variedadForm.nombre.trim()) return toast.error("El nombre es requerido");
    const slug = variedadForm.slug.trim() || slugify(variedadForm.nombre);
    setLoadingVariedad(true);
    try {
      const res = await fetch(`/api/admin/especies/${variedadModalEspecieId}/variedades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: variedadForm.nombre.trim(), slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear variedad");
      setEspecies((prev) =>
        prev.map((e) =>
          e.id === variedadModalEspecieId
            ? { ...e, variedades: [...e.variedades, { ...json.data, fichas: [], _count: { cultivos: 0 } }] }
            : e
        )
      );
      toast.success("Variedad creada");
      setVariedadModalEspecieId(null);
      setVariedadForm(emptyVariedadForm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear variedad");
    } finally {
      setLoadingVariedad(false);
    }
  };

  const handleCrearFicha = async (variedadId: string, clonarDeId?: string) => {
    setCreandoFichaVariedadId(variedadId);
    try {
      const res = await fetch("/api/admin/fichas-tecnicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variedadId, clonarEtapasDeVersionId: clonarDeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear ficha técnica");
      window.location.href = `/dashboard/admin/fichas-tecnicas/${json.data.id}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear ficha técnica");
      setCreandoFichaVariedadId(null);
    }
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
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{especie.nombre}</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {especie.slug}
                    {especie.familia ? ` · ${especie.familia}` : ""}
                  </p>
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
                            <span className={`badge ${ESTADO_BADGE[fichaActual.estado]}`}>
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
          <Input
            label="Nombre *"
            value={especieForm.nombre}
            onChange={(e) => setEspecieForm({ ...especieForm, nombre: e.target.value })}
            placeholder="Ej: Aguacate Lorena"
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

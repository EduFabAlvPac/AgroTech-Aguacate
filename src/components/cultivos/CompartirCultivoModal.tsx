"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Share2, Ban, RotateCcw, Link as LinkIcon } from "lucide-react";
import { Button, Modal, Select, Textarea, Input } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface CompradorOption {
  id: string;
  nombre: string;
}

interface EnlaceData {
  id: string;
  token: string;
  nota: string | null;
  revocado: boolean;
  expiraEn: string | null;
  vistas: number;
  createdAt: string;
  comprador: { nombre: string } | null;
}

interface CompartirCultivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cultivoId: string;
  cultivoLabel: string;
}

function urlPublica(token: string): string {
  if (typeof window === "undefined") return `/portal/${token}`;
  return `${window.location.origin}/portal/${token}`;
}

export function CompartirCultivoModal({ isOpen, onClose, cultivoId, cultivoLabel }: CompartirCultivoModalProps) {
  const [enlaces, setEnlaces] = useState<EnlaceData[]>([]);
  const [compradores, setCompradores] = useState<CompradorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({ compradorId: "", nota: "", expiraEn: "" });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [enlacesRes, compradoresRes] = await Promise.all([
        fetch(`/api/enlaces?cultivoId=${cultivoId}`),
        fetch("/api/compradores"),
      ]);
      const enlacesJson = await enlacesRes.json();
      const compradoresJson = await compradoresRes.json();
      if (enlacesRes.ok) setEnlaces(enlacesJson.data ?? []);
      if (compradoresRes.ok) setCompradores((compradoresJson.data ?? []).map((c: any) => ({ id: c.id, nombre: c.nombre })));
    } catch {
      toast.error("Error al cargar los enlaces");
    } finally {
      setLoading(false);
    }
  }, [cultivoId]);

  useEffect(() => {
    if (isOpen) cargar();
  }, [isOpen, cargar]);

  const handleCrear = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/enlaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cultivoId,
          compradorId: form.compradorId || undefined,
          nota: form.nota || undefined,
          expiraEn: form.expiraEn || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear el enlace");
      setEnlaces((prev) => [json.data, ...prev]);
      setForm({ compradorId: "", nota: "", expiraEn: "" });
      toast.success("Enlace creado — cópialo y compártelo con el comprador");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear el enlace");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRevocado = async (enlace: EnlaceData) => {
    try {
      const res = await fetch(`/api/enlaces/${enlace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocado: !enlace.revocado }),
      });
      if (!res.ok) throw new Error();
      setEnlaces((prev) => prev.map((e) => (e.id === enlace.id ? { ...e, revocado: !e.revocado } : e)));
      toast.success(enlace.revocado ? "Enlace reactivado" : "Enlace desactivado");
    } catch {
      toast.error("Error al actualizar el enlace");
    }
  };

  const copiar = async (token: string) => {
    try {
      await navigator.clipboard.writeText(urlPublica(token));
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar — copia el enlace manualmente");
    }
  };

  const compartirWhatsApp = (token: string, nombreComprador?: string | null) => {
    const saludo = nombreComprador ? `Hola ${nombreComprador}, ` : "Hola, ";
    const texto = `${saludo}te comparto el estado de mi cultivo (${cultivoLabel}) en GermIA: ${urlPublica(token)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compartir con un comprador" size="lg">
      <div className="space-y-4">
        <p className="text-[12px] text-[var(--text-muted)] -mt-1">
          Genera un enlace de solo lectura para que un comprador vea el estado de <strong>{cultivoLabel}</strong> sin
          necesidad de crear una cuenta — etapa, proyección de cosecha y fotos recientes. No incluye costos ni datos
          financieros de tu finca.
        </p>

        {/* Nuevo enlace */}
        <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Comprador (opcional)"
              value={form.compradorId}
              onChange={(e) => setForm({ ...form, compradorId: e.target.value })}
              options={[{ value: "", label: "Sin asignar" }, ...compradores.map((c) => ({ value: c.id, label: c.nombre }))]}
            />
            <Input
              label="Expira (opcional)"
              type="date"
              value={form.expiraEn}
              onChange={(e) => setForm({ ...form, expiraEn: e.target.value })}
            />
          </div>
          <Textarea
            label="Mensaje para el comprador (opcional)"
            value={form.nota}
            onChange={(e) => setForm({ ...form, nota: e.target.value })}
            placeholder="Ej: Cosecha disponible desde marzo, escríbeme para coordinar."
            rows={2}
          />
          <div className="flex justify-end">
            <Button size="sm" loading={creating} onClick={handleCrear}>
              <LinkIcon size={14} />
              Generar enlace
            </Button>
          </div>
        </div>

        {/* Enlaces existentes */}
        <div>
          <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">
            Enlaces generados {enlaces.length > 0 && `(${enlaces.length})`}
          </div>
          {loading ? (
            <p className="text-[12px] text-[var(--text-muted)]">Cargando...</p>
          ) : enlaces.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">Aún no has generado ningún enlace para este cultivo.</p>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {enlaces.map((e) => (
                <div key={e.id} className={`card p-3 ${e.revocado ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                        {e.comprador?.nombre ?? "Enlace general"}
                        {e.revocado && <span className="badge badge-neutral text-[10px] ml-2">Desactivado</span>}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {formatDate(e.createdAt, true)} · {e.vistas} vista{e.vistas !== 1 ? "s" : ""}
                        {e.expiraEn && ` · expira ${formatDate(e.expiraEn, true)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!e.revocado && (
                        <>
                          <button
                            onClick={() => copiar(e.token)}
                            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-agro-50"
                            aria-label="Copiar enlace"
                            title="Copiar enlace"
                          >
                            <Copy size={13} className="text-[var(--text-muted)] hover:text-agro-500" />
                          </button>
                          <button
                            onClick={() => compartirWhatsApp(e.token, e.comprador?.nombre)}
                            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-agro-50"
                            aria-label="Compartir por WhatsApp"
                            title="Compartir por WhatsApp"
                          >
                            <Share2 size={13} className="text-[var(--text-muted)] hover:text-agro-500" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleToggleRevocado(e)}
                        className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50"
                        aria-label={e.revocado ? "Reactivar" : "Desactivar"}
                        title={e.revocado ? "Reactivar" : "Desactivar"}
                      >
                        {e.revocado ? (
                          <RotateCcw size={13} className="text-[var(--text-muted)] hover:text-agro-500" />
                        ) : (
                          <Ban size={13} className="text-[var(--text-muted)] hover:text-negative-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
}

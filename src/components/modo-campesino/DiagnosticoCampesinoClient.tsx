"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShoppingCart, Info, ArrowLeft, MoreVertical, Camera, Image as ImageIcon, ChevronDown } from "lucide-react";
import { compressImage } from "@/components/ui/PhotoCapture";
import { Button } from "@/components/ui";
import { ESPECIES_CAMPESINO, FOTO_ESPECIE_CAMPESINO as FOTO_ESPECIE, esEspecieCampesinoValida } from "@/lib/campesino-especies";
import type { DiagnosticoResultado } from "@/lib/diagnostico-ia";

const RIESGO_LABEL: Record<NonNullable<DiagnosticoResultado["confianza"]>, { texto: string; color: string }> = {
  alta: { texto: "Alto", color: "var(--color-negative)" },
  media: { texto: "Medio", color: "#C89142" },
  baja: { texto: "Bajo", color: "var(--color-positive)" },
};

const VERDE_HEADER = "linear-gradient(135deg, #4FA987 0%, #2F6E52 100%)";

type Paso = "captura" | "analizando" | "resultado";

/**
 * Rediseño 2026-08-29 (feedback directo del usuario, con referencia exacta
 * a calcar): selección de cultivo + captura de foto se FUSIONARON en una
 * sola pantalla (antes eran dos pasos separados con navegación entre
 * ellos) — menos toques, todo visible de una vez. Header propio verde
 * (barra sólida, título centrado, ver ModoCampesinoShell — esta ruta
 * oculta el header compartido) en vez del header blanco genérico.
 *
 * El mecanismo de captura (label+input oculto con `capture="environment"`,
 * NUNCA `ref.click()`) se preserva igual que en PhotoCapture.tsx — es el
 * fix real de un bug de producción (2026-08-15, "Tomar foto"/"Galería" no
 * abrían nada en modo simple), solo cambia el estilo visual de los
 * botones, no el mecanismo. `compressImage` se reusa tal cual de ahí.
 *
 * `especiesSeleccionadas` (2026-08-29, propuesta aceptada por el usuario):
 * si en /campesino/cultivos ya eligió qué maneja, acá se ve solo eso —
 * menos que escoger. Nunca lo deja sin nada: sin selección todavía, se ven
 * las 4. "Ver los demás cultivos" evita encerrarlo si necesita revisar algo
 * fuera de lo suyo (le mostraron una mata de un vecino, por ejemplo).
 */
export function DiagnosticoCampesinoClient({
  especieInicial,
  especiesSeleccionadas = [],
}: {
  especieInicial?: string;
  especiesSeleccionadas?: string[];
}) {
  const router = useRouter();
  const camaraId = useId();
  const galeriaId = useId();
  const [paso, setPaso] = useState<Paso>("captura");
  const [mostrarTodos, setMostrarTodos] = useState(especiesSeleccionadas.length === 0);
  // Atajo desde /campesino/cultivos ("Revisar salud" de un cultivo puntual)
  // — preselecciona la especie sin que el usuario tenga que tocarla de nuevo.
  const [especie, setEspecie] = useState<(typeof ESPECIES_CAMPESINO)[number] | null>(() =>
    (especieInicial && esEspecieCampesinoValida(especieInicial) && ESPECIES_CAMPESINO.find((e) => e.slug === especieInicial)) || null
  );
  const [foto, setFoto] = useState<string | null>(null);
  const [resultado, setResultado] = useState<DiagnosticoResultado | null>(null);
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);

  const exigirEspecie = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (!especie) {
      e.preventDefault();
      toast.error("Primero elige qué cultivo vas a revisar");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!file || !especie) return;

    setProcesandoArchivo(true);
    let dataUrl: string;
    try {
      dataUrl = await compressImage(file, 800, 0.7);
    } catch {
      const reader = new FileReader();
      dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } finally {
      setProcesandoArchivo(false);
    }

    setFoto(dataUrl);
    setPaso("analizando");
    try {
      const res = await fetch("/api/campesino/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: dataUrl, especieSlug: especie.slug }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "No pudimos analizar la foto. Intenta de nuevo.");
        setPaso("captura");
        return;
      }
      setResultado(json.data.diagnostico as DiagnosticoResultado);
      setPaso("resultado");
    } catch {
      toast.error("No pudimos analizar la foto. Revisa tu conexión e intenta de nuevo.");
      setPaso("captura");
    }
  };

  const reiniciar = () => {
    setEspecie(null);
    setFoto(null);
    setResultado(null);
    setPaso("captura");
  };

  const especiesAMostrar = mostrarTodos
    ? ESPECIES_CAMPESINO
    : ESPECIES_CAMPESINO.filter((e) => especiesSeleccionadas.includes(e.slug));
  const hayMasCultivosOcultos = !mostrarTodos && especiesAMostrar.length < ESPECIES_CAMPESINO.length;

  // Recomendación de diagnostico-ia.ts viene como texto libre (varias
  // frases en un solo párrafo, ver el prompt ahí) — se parte en oraciones
  // para mostrarla como lista con viñetas, sin tocar el prompt/modelo.
  const recomendacionEnViñetas = (texto: string): string[] =>
    texto
      .split(/(?<=[.!])\s+/)
      .map((s) => s.trim().replace(/\.$/, ""))
      .filter((s) => s.length > 3);

  return (
    <div className="flex flex-col min-h-full" style={{ background: "#FAF8F0" }}>
      {/* Header propio verde — título cambia según el paso */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" style={{ background: VERDE_HEADER }}>
        <button
          type="button"
          onClick={() => (paso === "resultado" ? reiniciar() : router.push("/campesino"))}
          aria-label="Volver"
          className="w-9 h-9 -ml-1.5 flex items-center justify-center"
        >
          <ArrowLeft size={22} color="white" />
        </button>
        <p className="text-white text-[17px] font-bold">{paso === "resultado" ? "Diagnóstico" : "Salud del cultivo"}</p>
        <button type="button" aria-label="Más información" className="w-9 h-9 -mr-1.5 flex items-center justify-center">
          {paso === "resultado" ? <MoreVertical size={20} color="white" /> : <Info size={20} color="white" />}
        </button>
      </div>

      {paso === "captura" && (
        <div className="px-4 pt-4 pb-6">
          <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">¿Qué cultivo vas a revisar?</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {especiesAMostrar.map((e) => {
              const seleccionada = especie?.slug === e.slug;
              return (
                <button
                  key={e.slug}
                  type="button"
                  onClick={() => setEspecie(e)}
                  className="rounded-2xl p-2 border-2 transition-all text-left"
                  style={{
                    borderColor: seleccionada ? "#2F6E52" : "transparent",
                    background: "white",
                    boxShadow: seleccionada ? "0 3px 12px rgba(47,110,82,0.25)" : "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
                    <img src={FOTO_ESPECIE[e.slug]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <p className="mt-2 text-center text-[14px] font-bold" style={{ color: "#1F3D2A" }}>
                    {e.nombre}
                  </p>
                </button>
              );
            })}
          </div>

          {hayMasCultivosOcultos ? (
            <button
              type="button"
              onClick={() => setMostrarTodos(true)}
              className="flex items-center gap-1 mb-6 text-[12.5px] font-semibold"
              style={{ color: "#2F6E52" }}
            >
              Ver los demás cultivos <ChevronDown size={15} />
            </button>
          ) : (
            <div className="mb-3" />
          )}

          <p className="text-[15px] font-bold text-[var(--text-primary)] mb-0.5">¿Cómo está tu cultivo?</p>
          <p className="text-[13px] text-[var(--text-secondary)] mb-4">Toma una foto de la planta o la hoja</p>

          {/* Mismo mecanismo que PhotoCapture.tsx (label+input oculto,
              capture="environment" solo en el de cámara) — estilo propio. */}
          <label
            htmlFor={camaraId}
            onClick={exigirEspecie}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white text-[15px] font-bold cursor-pointer transition-transform active:scale-[0.98]"
            style={{ background: "#2F6E52", opacity: procesandoArchivo ? 0.7 : 1, pointerEvents: procesandoArchivo ? "none" : "auto" }}
          >
            <Camera size={19} /> {procesandoArchivo ? "Procesando..." : "Tomar foto"}
          </label>
          <label
            htmlFor={galeriaId}
            onClick={exigirEspecie}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 mt-2.5 rounded-2xl text-[15px] font-bold cursor-pointer transition-transform active:scale-[0.98]"
            style={{ background: "var(--color-brand-bg)", color: "#2F6E52" }}
          >
            <ImageIcon size={18} /> Elegir de galería
          </label>

          <input id={camaraId} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          <input id={galeriaId} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
      )}

      {paso === "analizando" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: "#BFE3C4", borderTopColor: "#2F6E52" }} />
          <p className="text-[14px] text-[var(--text-secondary)]">Analizando tu foto...</p>
        </div>
      )}

      {paso === "resultado" && resultado && especie && (
        <div className="flex-1">
          {foto && <img src={foto} alt="Foto analizada" className="w-full object-cover" style={{ height: 220 }} />}

          <div className="px-5 pt-5 pb-6">
            {!resultado.imagenValida ? (
              <div className="text-center py-6">
                <p className="text-[14px] text-[var(--text-primary)] font-medium mb-4">{resultado.diagnostico}</p>
                <Button onClick={() => setPaso("captura")}>Tomar otra foto</Button>
              </div>
            ) : (
              <>
                <p className="text-[12.5px] text-[var(--text-muted)] mb-1">Posible problema detectado</p>
                <h2 className="text-[22px] font-bold mb-2" style={{ color: "#2F6E52" }}>
                  {resultado.diagnostico}
                </h2>
                <p className="text-[14px] font-semibold mb-5">
                  Nivel de riesgo:{" "}
                  <span style={{ color: RIESGO_LABEL[resultado.confianza ?? "media"].color }}>
                    {RIESGO_LABEL[resultado.confianza ?? "media"].texto}
                  </span>
                </p>

                <p className="text-[15px] font-bold text-[var(--text-primary)] mb-2">Recomendaciones</p>
                <ul className="mb-6 space-y-1.5">
                  {recomendacionEnViñetas(resultado.recomendacion).map((linea, i) => (
                    <li key={i} className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed pl-4 relative">
                      <span className="absolute left-0" style={{ color: "#2F6E52" }}>
                        •
                      </span>
                      {linea}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => router.push("/campesino/tienda")}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-[15px] font-bold transition-transform active:scale-[0.98]"
                  style={{ background: "#2F6E52" }}
                >
                  <ShoppingCart size={18} /> Ver productos recomendados
                </button>
                <button type="button" onClick={reiniciar} className="w-full text-center text-[12.5px] text-[var(--text-muted)] underline mt-4 mb-2">
                  Revisar otro cultivo
                </button>

                <p className="text-[11.5px] text-[var(--text-muted)] text-center leading-relaxed">
                  Esta recomendación no reemplaza la visita de un experto.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

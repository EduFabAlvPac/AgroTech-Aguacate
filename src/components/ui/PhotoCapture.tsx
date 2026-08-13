"use client";

import { useId, useState } from "react";
import { Camera, X, Image as ImageIcon } from "lucide-react";

interface PhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
  onRemove: () => void;
  preview?: string | null;
  label?: string;
}

/**
 * Mobile-first photo capture component — dos botones separados en vez de
 * uno solo ambiguo:
 *   1. "Tomar foto" → input con `capture="environment"`, abre la cámara
 *      directo en Android; en iOS ofrece "Tomar foto" en el menú nativo.
 *   2. "Galería" → input sin `capture`, siempre abre el selector de
 *      archivos/galería.
 *
 * Antes era un solo botón que disparaba `inputRef.current.click()` sobre un
 * único input con `capture` — en el celular varios usuarios reportaron que
 * solo se podía "subir" una foto ya guardada, nunca abrir la cámara
 * directamente. Dos causas reales combinadas:
 *   - Un solo input con `capture` + `accept="image/*"` deja que el propio
 *     navegador decida qué mostrar primero en su selector nativo (en varias
 *     versiones de Android/iOS termina priorizando la galería sobre la
 *     cámara, sin dar una opción "solo cámara" explícita).
 *   - Disparar el picker con `ref.click()` desde JS es menos confiable en
 *     algunos navegadores móviles que un `<label htmlFor>` nativo — un click
 *     real de usuario sobre una `<label>` es el patrón recomendado para
 *     abrir selectores nativos de archivo/cámara de forma consistente.
 * Separar en dos inputs/labels explícitos elimina la ambigüedad: cada botón
 * hace una sola cosa, y ambos usan `<label>` en vez de refs.
 */
export function PhotoCapture({ onCapture, onRemove, preview, label }: PhotoCaptureProps) {
  const camaraId = useId();
  const galeriaId = useId();
  const [processing, setProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const compressed = await compressImage(file, 800, 0.7);
      onCapture(compressed);
    } catch {
      // If compression fails, read raw (smaller phones)
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setProcessing(false);
      // Reset input so the same file (or the same photo again) can be re-selected
      e.target.value = "";
    }
  };

  return (
    <div>
      {label && (
        <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">
          {label}
        </div>
      )}

      {/* Preview */}
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Foto de soporte"
            className="w-24 h-24 object-cover rounded-[var(--radius-md)] border border-[var(--border-default)]"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
            aria-label="Eliminar foto"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Tomar foto — abre la cámara directamente */}
          <label
            htmlFor={camaraId}
            className="flex-1 flex items-center gap-2.5 p-3 border-2 border-dashed border-[var(--border-default)] rounded-[var(--radius-md)] hover:border-agro-200 hover:bg-agro-50 transition-all cursor-pointer"
            style={{ minHeight: 64, opacity: processing ? 0.6 : 1, pointerEvents: processing ? "none" : "auto" }}
          >
            <div className="w-9 h-9 rounded-full bg-agro-50 flex items-center justify-center flex-shrink-0">
              {processing ? (
                <div className="w-4 h-4 border-2 border-agro-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={18} className="text-agro-400" />
              )}
            </div>
            <div className="text-[12px] font-medium text-[var(--text-primary)]">
              📸 Tomar foto
            </div>
          </label>

          {/* Galería — selector de archivos, sin cámara */}
          <label
            htmlFor={galeriaId}
            className="flex-1 flex items-center gap-2.5 p-3 border-2 border-dashed border-[var(--border-default)] rounded-[var(--radius-md)] hover:border-agro-200 hover:bg-agro-50 transition-all cursor-pointer"
            style={{ minHeight: 64, opacity: processing ? 0.6 : 1, pointerEvents: processing ? "none" : "auto" }}
          >
            <div className="w-9 h-9 rounded-full bg-agro-50 flex items-center justify-center flex-shrink-0">
              <ImageIcon size={18} className="text-agro-400" />
            </div>
            <div className="text-[12px] font-medium text-[var(--text-primary)]">
              🖼️ Galería
            </div>
          </label>
        </div>
      )}

      {/* Inputs ocultos — cada uno asociado a su <label> por id, no por ref */}
      <input
        id={camaraId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        id={galeriaId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

/**
 * Compress an image file to a target max dimension and quality.
 * Returns a data URL string.
 */
export function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

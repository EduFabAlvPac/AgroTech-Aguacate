"use client";

import { useRef, useState } from "react";
import { Camera, X, Image as ImageIcon } from "lucide-react";

interface PhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
  onRemove: () => void;
  preview?: string | null;
  label?: string;
}

/**
 * Mobile-first photo capture component.
 * Opens native camera on mobile devices or file picker on desktop.
 * Compresses the image to max 800px width and ~80% quality for field use.
 */
export function PhotoCapture({ onCapture, onRemove, preview, label }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="flex items-center gap-3 w-full p-4 border-2 border-dashed border-[var(--border-default)] rounded-[var(--radius-md)] hover:border-agro-200 hover:bg-agro-50 transition-all text-left"
          style={{ minHeight: 64 }}
        >
          <div className="w-12 h-12 rounded-full bg-agro-50 flex items-center justify-center flex-shrink-0">
            {processing ? (
              <div className="w-5 h-5 border-2 border-agro-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={20} className="text-agro-400" />
            )}
          </div>
          <div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">
              📸 Tomar foto de soporte
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Evidencia para cuaderno de campo BPA-ICA
            </div>
          </div>
        </button>
      )}

      {/* Hidden file input — accepts camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Compress an image file to a target max dimension and quality.
 * Returns a data URL string.
 */
function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
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

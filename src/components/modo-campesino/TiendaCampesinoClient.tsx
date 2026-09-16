"use client";

import { useMemo, useState } from "react";
import { Search, Sprout, Wheat, FlaskConical, SprayCan, Leaf, Tractor } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CategoriaProducto } from "@prisma/client";

interface ProductoData {
  id: string;
  categoria: CategoriaProducto;
  nombre: string;
  precio: number | null;
  unidadPrecio: string | null;
  imagenUrl: string | null;
  urlExterna: string;
  destacado: boolean;
}

// Clasificación real del portal web (CrecIAgro), calcada por pedido del
// usuario (2026-08-29) — 6 categorías, con "Semillas" reincorporada
// (2026-08-30). Historial de intentos de imagen para estas insignias
// (ver memoria del proyecto, 2026-08-30): primero tarjeta-foto grande
// ("se ve horrible, un desastre") y luego foto en zoom-recorte circular
// ("se pierde por completo la imagen") — ambos fallaron porque las fotos
// del usuario son escenas "hero" con texto/marca horneado, no objetos
// aislados. El usuario eligió explícitamente volver a ícono de línea
// simple sobre chip de color, que es además el estilo del mockup de
// referencia original (círculos pálidos con ícono). Sin foto de por
// medio: nítido a cualquier tamaño, cero recorte que perder.
const CATEGORIA_UI: Record<CategoriaProducto, { label: string; icon: LucideIcon; color: string }> = {
  FERTILIZANTES: { label: "Fertilizantes", icon: Sprout, color: "#3E8F6C" },
  SEMILLAS: { label: "Semillas", icon: Wheat, color: "#B45309" },
  BIOINSUMOS: { label: "Bioinsumos", icon: FlaskConical, color: "#6D3FC2" },
  AGROQUIMICOS: { label: "Agroquímicos", icon: SprayCan, color: "#D97706" },
  NUTRICION_VEGETAL: { label: "Nutrición Vegetal", icon: Leaf, color: "#0D9488" },
  RIEGO_MAQUINARIA: { label: "Riego & Maquinaria", icon: Tractor, color: "#3B5B73" },
};

const CATEGORIAS = Object.keys(CATEGORIA_UI) as CategoriaProducto[];

/** Insignia circular: chip translúcido del color de la categoría (mismo
 * lenguaje visual que el resto del modo Campesino, ver home v3) con el
 * ícono de línea encima — nunca flotando solo en color plano. */
function InsigniaCategoria({ Icon, color, activa }: { Icon: LucideIcon; color: string; activa: boolean }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 transition-all"
      style={{
        width: 56,
        height: 56,
        background: activa ? color : `${color}1F`,
        boxShadow: activa ? `0 0 0 2.5px ${color}` : "0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <Icon size={24} color={activa ? "#FFFFFF" : color} strokeWidth={2} />
    </div>
  );
}

export function TiendaCampesinoClient({ productos }: { productos: ProductoData[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<CategoriaProducto | null>(null);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const coincideTexto = !q || p.nombre.toLowerCase().includes(q);
      const coincideCategoria = !categoria || p.categoria === categoria;
      return coincideTexto && coincideCategoria;
    });
  }, [productos, busqueda, categoria]);

  const hayFiltroActivo = busqueda.trim() !== "" || categoria !== null;
  const destacados = productosFiltrados.filter((p) => p.destacado);

  return (
    <div className="px-4 pt-4 pb-8">
      {/* Buscador */}
      <div className="relative mb-6">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="¿Qué buscas hoy?"
          className="w-full pl-10 pr-4 py-3 text-[14px] rounded-full border border-[var(--border-default)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
        />
      </div>

      {/* Categorías — insignias chicas, 3 columnas, mismo tamaño/orden que
          el mockup de referencia ya validado. */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-5 mb-7">
        {CATEGORIAS.map((cat) => {
          const { label, icon, color } = CATEGORIA_UI[cat];
          const activa = categoria === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoria(activa ? null : cat)}
              className="flex flex-col items-center gap-1.5"
            >
              <InsigniaCategoria Icon={icon} color={color} activa={activa} />
              <span
                className="text-[10.5px] font-medium text-center leading-tight px-0.5"
                style={{ color: activa ? color : "var(--text-secondary)" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {productos.length === 0 ? (
        <p className="text-[13px] text-[var(--text-muted)] text-center py-10">
          Todavía no hay productos cargados. Vuelve pronto.
        </p>
      ) : productosFiltrados.length === 0 ? (
        <p className="text-[13px] text-[var(--text-muted)] text-center py-10">
          No encontramos productos con eso. Intenta con otra palabra o categoría.
        </p>
      ) : (
        <>
          <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-2.5">
            {hayFiltroActivo ? "Resultados" : destacados.length > 0 ? "Productos destacados" : "Productos"}
          </p>
          <div className="space-y-2.5">
            {productosFiltrados.map((p) => {
              const { icon: Icon, color } = CATEGORIA_UI[p.categoria];
              return (
                <a
                  key={p.id}
                  href={p.urlExterna}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] hover:border-agro-300 transition-colors"
                >
                  {p.imagenUrl ? (
                    <div className="relative rounded-[var(--radius-md)] overflow-hidden flex-shrink-0" style={{ width: 56, height: 56 }}>
                      <img src={p.imagenUrl} alt={p.nombre} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                      style={{ width: 56, height: 56, background: `${color}1F` }}
                    >
                      <Icon size={24} color={color} strokeWidth={2} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{p.nombre}</p>
                    {p.unidadPrecio && <p className="text-[11px] text-[var(--text-muted)]">{p.unidadPrecio}</p>}
                    {p.precio != null && (
                      <p className="text-[13px] font-bold" style={{ color: "#2F6E52" }}>
                        ${p.precio.toLocaleString("es-CO")}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-white rounded-full px-3 py-1.5 flex-shrink-0" style={{ background: "#2F6E52" }}>
                    Ver producto
                  </span>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

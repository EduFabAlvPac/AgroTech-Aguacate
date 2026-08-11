import type { Metadata } from "next";
import { Leaf, MapPin, Sprout, Calendar, Scale, MessageSquare } from "lucide-react";
import { getPortalData } from "@/lib/portal";
import { ETAPA_LABELS } from "@/types";
import { formatCOP } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Enlace público no listado — no debe indexarse en buscadores (cualquiera
// con el link puede verlo, pero no debe aparecer en resultados de Google).
export const metadata: Metadata = {
  title: "Estado del cultivo — AgroTech",
  robots: { index: false, follow: false },
};

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPortalData(token);

  if (!data) {
    return (
      <div className="portal-shell">
        <div className="portal-card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: "#1A2B14", marginBottom: 6 }}>
            Enlace no disponible
          </h1>
          <p style={{ fontSize: 13, color: "#5F5E5A", lineHeight: 1.6 }}>
            Este enlace venció, fue desactivado por el productor, o la dirección no es correcta.
            Solicita un nuevo enlace directamente al productor.
          </p>
        </div>
      </div>
    );
  }

  const { finca, cultivo, proyeccion, fotos, nota, precioAcordadoKg } = data;
  const fechaCosecha = proyeccion
    ? new Date(proyeccion.fechaEstimada).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="portal-shell">
      {/* Header */}
      <div className="portal-header">
        <div className="portal-logo">
          <Leaf size={16} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#639922" }}>AgroTech</div>
          <div style={{ fontSize: 10, color: "#8A8880" }}>Estado del cultivo · enlace compartido</div>
        </div>
      </div>

      {/* Finca card */}
      <div className="portal-card">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <MapPin size={14} color="#639922" />
          <h1 style={{ fontSize: 16, fontWeight: 700, color: "#1A2B14" }}>{finca.nombre}</h1>
        </div>
        <p style={{ fontSize: 12, color: "#5F5E5A" }}>
          {finca.municipio}, {finca.departamento}
          {finca.altitud ? ` · ${finca.altitud.toLocaleString()} msnm` : ""}
        </p>
      </div>

      {/* Cultivo card */}
      <div className="portal-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sprout size={18} color="#639922" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2B14" }}>
                {cultivo.especie} {cultivo.variedad}
              </div>
              <div style={{ fontSize: 11, color: "#8A8880" }}>Lote {cultivo.lote}</div>
            </div>
          </div>
          <span className="portal-badge">{ETAPA_LABELS[cultivo.etapa as keyof typeof ETAPA_LABELS] ?? cultivo.etapa}</span>
        </div>

        <div className="portal-stats-grid">
          <div className="portal-stat">
            <div className="portal-stat-value">{cultivo.cantidadPlantas?.toLocaleString() ?? "—"}</div>
            <div className="portal-stat-label">Plantas</div>
          </div>
          <div className="portal-stat">
            <div className="portal-stat-value">{cultivo.densidadHa ?? "—"}</div>
            <div className="portal-stat-label">Plantas/ha</div>
          </div>
          <div className="portal-stat">
            <div className="portal-stat-value">
              {cultivo.fechaSiembra ? new Date(cultivo.fechaSiembra).toLocaleDateString("es-CO", { month: "short", year: "numeric" }) : "—"}
            </div>
            <div className="portal-stat-label">Siembra</div>
          </div>
        </div>
      </div>

      {/* Proyección de cosecha */}
      {proyeccion && (
        <div className="portal-card" style={{ background: "#EAF3DE", border: "1px solid #C0DD97" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Calendar size={14} color="#3B6D11" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#3B6D11" }}>Cosecha estimada</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2B14", textTransform: "capitalize" }}>
            {fechaCosecha}
          </div>
          {proyeccion.volumenEstimadoKg && (
            <div style={{ fontSize: 12, color: "#3B6D11", marginTop: 2 }}>
              ~{proyeccion.volumenEstimadoKg.toLocaleString("es-CO")} kg estimados
            </div>
          )}
        </div>
      )}

      {/* Precio acordado */}
      {precioAcordadoKg && (
        <div className="portal-card" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Scale size={16} color="#639922" />
          <div>
            <div style={{ fontSize: 11, color: "#8A8880" }}>Precio acordado</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B14" }}>{formatCOP(precioAcordadoKg)}/kg</div>
          </div>
        </div>
      )}

      {/* Fotos recientes */}
      {fotos.length > 0 && (
        <div className="portal-card">
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2B14", marginBottom: 8 }}>Fotos recientes</div>
          <div className="portal-photos-grid">
            {fotos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="Foto del cultivo" className="portal-photo" />
            ))}
          </div>
        </div>
      )}

      {/* Nota del productor */}
      {nota && (
        <div className="portal-card">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <MessageSquare size={14} color="#639922" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2B14" }}>Mensaje del productor</span>
          </div>
          <p style={{ fontSize: 13, color: "#3A3A36", lineHeight: 1.6 }}>{nota}</p>
        </div>
      )}

      <p className="portal-footer">
        Generado con AgroTech — plataforma de gestión agrícola para productores colombianos.
      </p>
    </div>
  );
}

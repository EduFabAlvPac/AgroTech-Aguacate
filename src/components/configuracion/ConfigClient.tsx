"use client";

import { useState } from "react";
import { User, MapPin, Bell, Save, RefreshCw } from "lucide-react";
import { Button, Input } from "@/components/ui";
import toast from "react-hot-toast";

interface ConfigClientProps {
  user: { name: string | null; email: string; telefono: string | null };
  prefs: {
    tempMinAlert: number; tempMaxAlert: number;
    rainAlertMm: number; windAlertKmh: number;
    droughtDays: number; emailAlerts: boolean; pushAlerts: boolean;
  } | null;
  finca: {
    nombre: string; municipio: string; departamento: string;
    lat: number | null; lng: number | null; areaTotal: number | null;
  } | null;
}

type Tab = "profile" | "finca" | "alertas";

export function ConfigClient({ user, prefs, finca }: ConfigClientProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [generatingAlerts, setGeneratingAlerts] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    telefono: user?.telefono ?? "",
    currentPassword: "",
    newPassword: "",
  });

  const [fincaForm, setFincaForm] = useState({
    nombre: finca?.nombre ?? "",
    municipio: finca?.municipio ?? "",
    departamento: finca?.departamento ?? "",
    lat: finca?.lat?.toString() ?? "7.9273",
    lng: finca?.lng?.toString() ?? "-72.5078",
    areaTotal: finca?.areaTotal?.toString() ?? "2",
  });

  const [alertaForm, setAlertaForm] = useState({
    tempMinAlert: prefs?.tempMinAlert ?? 12,
    tempMaxAlert: prefs?.tempMaxAlert ?? 32,
    rainAlertMm: prefs?.rainAlertMm ?? 30,
    windAlertKmh: prefs?.windAlertKmh ?? 40,
    droughtDays: prefs?.droughtDays ?? 5,
    emailAlerts: prefs?.emailAlerts ?? true,
    pushAlerts: prefs?.pushAlerts ?? true,
  });

  const save = async (section: Tab, data: any) => {
    setSaving(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      toast.success("Configuración guardada");
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAlerts = async () => {
    setGeneratingAlerts(true);
    try {
      const res = await fetch("/api/alertas/generate", { method: "POST" });
      const { data } = await res.json();
      toast.success(data?.message ?? "Alertas generadas");
    } catch {
      toast.error("Error al generar alertas");
    } finally {
      setGeneratingAlerts(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "finca", label: "Finca", icon: MapPin },
    { id: "alertas", label: "Alertas", icon: Bell },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-[var(--surface-page)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-md)] text-[13px] font-medium transition-all ${
              tab === id
                ? "bg-white text-agro-600 shadow-card border border-agro-100"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      {tab === "profile" && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
              Información personal
            </h2>
            <p className="text-[12px] text-[var(--text-muted)]">
              {user?.email}
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Nombre completo"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              placeholder="Eduard Álvarez Pacheco"
            />
            <Input
              label="Teléfono"
              value={profileForm.telefono}
              onChange={(e) => setProfileForm({ ...profileForm, telefono: e.target.value })}
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">
              Cambiar contraseña (opcional)
            </h3>
            <div className="space-y-3">
              <Input
                label="Contraseña actual"
                type="password"
                value={profileForm.currentPassword}
                onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
              />
              <Input
                label="Nueva contraseña"
                type="password"
                value={profileForm.newPassword}
                onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
              />
            </div>
          </div>

          <Button
            onClick={() => save("profile", profileForm)}
            loading={saving}
            className="w-full"
          >
            <Save size={15} />
            Guardar perfil
          </Button>
        </div>
      )}

      {/* ── Finca ───────────────────────────────────────────────────────── */}
      {tab === "finca" && (
        <div className="card p-6 space-y-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Datos de la finca
          </h2>

          <div className="space-y-4">
            <Input
              label="Nombre de la finca"
              value={fincaForm.nombre}
              onChange={(e) => setFincaForm({ ...fincaForm, nombre: e.target.value })}
              placeholder="Finca Álvarez Pacheco"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Municipio"
                value={fincaForm.municipio}
                onChange={(e) => setFincaForm({ ...fincaForm, municipio: e.target.value })}
                placeholder="Norte de Santander"
              />
              <Input
                label="Departamento"
                value={fincaForm.departamento}
                onChange={(e) => setFincaForm({ ...fincaForm, departamento: e.target.value })}
                placeholder="Norte de Santander"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Latitud"
                type="number"
                value={fincaForm.lat}
                onChange={(e) => setFincaForm({ ...fincaForm, lat: e.target.value })}
                step="0.0001"
              />
              <Input
                label="Longitud"
                type="number"
                value={fincaForm.lng}
                onChange={(e) => setFincaForm({ ...fincaForm, lng: e.target.value })}
                step="0.0001"
              />
              <Input
                label="Área total (ha)"
                type="number"
                value={fincaForm.areaTotal}
                onChange={(e) => setFincaForm({ ...fincaForm, areaTotal: e.target.value })}
                step="0.1"
              />
            </div>
          </div>

          <div className="p-3 bg-agro-50 rounded-[var(--radius-md)] text-[12px] text-agro-600">
            💡 Las coordenadas GPS se usan para el mapa interactivo y las alertas climáticas.
            Puedes obtenerlas desde Google Maps haciendo clic derecho en tu finca.
          </div>

          <Button
            onClick={() => save("finca", fincaForm)}
            loading={saving}
            className="w-full"
          >
            <Save size={15} />
            Guardar datos de la finca
          </Button>
        </div>
      )}

      {/* ── Alertas ─────────────────────────────────────────────────────── */}
      {tab === "alertas" && (
        <div className="space-y-4">
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
                Umbrales de alertas climáticas
              </h2>
              <p className="text-[12px] text-[var(--text-muted)]">
                Define los valores límite para generar alertas automáticas basadas en el pronóstico.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  key: "tempMinAlert",
                  label: "Temperatura mínima para alerta de helada (°C)",
                  hint: "Recomendado: 12°C para plántulas, 8°C para plantas establecidas",
                  min: 0, max: 20, step: 1,
                },
                {
                  key: "tempMaxAlert",
                  label: "Temperatura máxima para alerta de calor (°C)",
                  hint: "Recomendado: 32°C",
                  min: 25, max: 45, step: 1,
                },
                {
                  key: "rainAlertMm",
                  label: "Precipitación diaria para alerta de lluvia excesiva (mm)",
                  hint: "Recomendado: 30 mm/día",
                  min: 10, max: 100, step: 5,
                },
                {
                  key: "windAlertKmh",
                  label: "Velocidad del viento para alerta (km/h)",
                  hint: "Recomendado: 40 km/h",
                  min: 20, max: 100, step: 5,
                },
                {
                  key: "droughtDays",
                  label: "Días consecutivos sin lluvia para alerta de sequía",
                  hint: "Recomendado: 5 días",
                  min: 2, max: 15, step: 1,
                },
              ].map(({ key, label, hint, min, max, step }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                      {label}
                    </label>
                    <span className="text-[13px] font-semibold text-agro-600 bg-agro-50 px-2 py-0.5 rounded-full">
                      {alertaForm[key as keyof typeof alertaForm]}
                      {key.includes("Mm") ? " mm" : key.includes("Kmh") ? " km/h" : key.includes("Days") ? " días" : "°C"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={Number(alertaForm[key as keyof typeof alertaForm])}
                    onChange={(e) =>
                      setAlertaForm({ ...alertaForm, [key]: Number(e.target.value) })
                    }
                    className="w-full h-2 appearance-none bg-agro-100 rounded-full outline-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #639922 0%, #639922 ${
                        ((Number(alertaForm[key as keyof typeof alertaForm]) - min) / (max - min)) * 100
                      }%, #EAF3DE ${
                        ((Number(alertaForm[key as keyof typeof alertaForm]) - min) / (max - min)) * 100
                      }%, #EAF3DE 100%)`,
                    }}
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{hint}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
              <h3 className="text-[13px] font-medium text-[var(--text-secondary)]">
                Notificaciones
              </h3>
              {[
                { key: "emailAlerts", label: "Alertas por email" },
                { key: "pushAlerts", label: "Notificaciones en la app" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() =>
                      setAlertaForm({ ...alertaForm, [key]: !alertaForm[key as keyof typeof alertaForm] })
                    }
                    className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                      alertaForm[key as keyof typeof alertaForm] ? "bg-agro-400" : "bg-[var(--border-default)]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        alertaForm[key as keyof typeof alertaForm] ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </div>
                  <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
                </label>
              ))}
            </div>

            <Button
              onClick={() => save("alertas", alertaForm)}
              loading={saving}
              className="w-full"
            >
              <Save size={15} />
              Guardar umbrales
            </Button>
          </div>

          {/* Generate alerts now */}
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
              Generar alertas ahora
            </h3>
            <p className="text-[12px] text-[var(--text-muted)] mb-4">
              Analiza el pronóstico climático de los próximos 5 días y crea alertas si se superan los umbrales configurados.
            </p>
            <Button
              variant="secondary"
              onClick={handleGenerateAlerts}
              loading={generatingAlerts}
              className="w-full"
            >
              <RefreshCw size={15} />
              Ejecutar análisis climático
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

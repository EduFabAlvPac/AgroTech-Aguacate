"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, MapPin, Bell, Save, RefreshCw, ShieldCheck, Download, Trash2 } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import toast from "react-hot-toast";
import type { VistaPreferida } from "@prisma/client";
import { generarAlertas } from "@/app/(dashboard)/dashboard/alertas/alerta-actions";
import {
  actualizarPerfil,
  actualizarFinca,
  actualizarAlertas,
  exportarMisDatos,
  eliminarCuenta,
} from "@/app/(dashboard)/dashboard/configuracion/config-actions";
import { VistaPreferidaSwitch } from "@/components/shared/VistaPreferidaSwitch";

interface ConfigClientProps {
  user: { name: string | null; email: string; telefono: string | null; vistaPreferida?: VistaPreferida };
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

type Tab = "profile" | "finca" | "alertas" | "privacidad";
const TABS_VALIDOS: Tab[] = ["profile", "finca", "alertas", "privacidad"];

export function ConfigClient({ user, prefs, finca }: ConfigClientProps) {
  // ?tab= — aditivo, para que SalidaModoCompleto.tsx (Fase 5, ADR-006)
  // pueda aterrizar en la sección exacta (ej. "alertas" o "privacidad") en
  // vez de siempre "profile". Sin el parámetro, comportamiento idéntico al
  // de antes.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const tabInicial = tabParam && TABS_VALIDOS.includes(tabParam) ? tabParam : "profile";
  const [tab, setTab] = useState<Tab>(tabInicial);
  const [saving, setSaving] = useState(false);
  const [generatingAlerts, setGeneratingAlerts] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [passwordEliminar, setPasswordEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [, startTransition] = useTransition();

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
    lat: finca?.lat?.toString() ?? "8.320589",
    lng: finca?.lng?.toString() ?? "-73.337551",
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

  // Server Actions nativas (Fase 1, ADR-006) en vez de fetch a
  // /api/configuracion — llamadas directas dentro de startTransition. No
  // se usa useActionState: cada tab guarda su propia sección con un botón
  // suelto (no un <form> con submit nativo), mismo criterio que
  // Equipo/Compradores/Alertas/Fichas técnicas.
  const saveProfile = () => {
    setSaving(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", profileForm.name);
        fd.set("telefono", profileForm.telefono);
        if (profileForm.currentPassword) fd.set("currentPassword", profileForm.currentPassword);
        if (profileForm.newPassword) fd.set("newPassword", profileForm.newPassword);

        const result = await actualizarPerfil({}, fd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Configuración guardada");
      } finally {
        setSaving(false);
      }
    });
  };

  const saveFinca = () => {
    setSaving(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("nombre", fincaForm.nombre);
        fd.set("municipio", fincaForm.municipio);
        fd.set("departamento", fincaForm.departamento);
        fd.set("lat", fincaForm.lat);
        fd.set("lng", fincaForm.lng);
        fd.set("areaTotal", fincaForm.areaTotal);

        const result = await actualizarFinca({}, fd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Configuración guardada");
      } finally {
        setSaving(false);
      }
    });
  };

  const saveAlertas = () => {
    setSaving(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("tempMinAlert", String(alertaForm.tempMinAlert));
        fd.set("tempMaxAlert", String(alertaForm.tempMaxAlert));
        fd.set("rainAlertMm", String(alertaForm.rainAlertMm));
        fd.set("windAlertKmh", String(alertaForm.windAlertKmh));
        fd.set("droughtDays", String(alertaForm.droughtDays));
        fd.set("emailAlerts", String(alertaForm.emailAlerts));
        fd.set("pushAlerts", String(alertaForm.pushAlerts));

        const result = await actualizarAlertas({}, fd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Configuración guardada");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleGenerateAlerts = () => {
    setGeneratingAlerts(true);
    startTransition(async () => {
      try {
        const result = await generarAlertas();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message ?? "Alertas generadas");
      } finally {
        setGeneratingAlerts(false);
      }
    });
  };

  const handleExportar = () => {
    setExportando(true);
    startTransition(async () => {
      try {
        const result = await exportarMisDatos();
        if (result.error || !result.json) {
          toast.error(result.error || "No se pudo generar el archivo");
          return;
        }
        const blob = new Blob([result.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename ?? `agrotech-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Descarga iniciada");
      } finally {
        setExportando(false);
      }
    });
  };

  const handleEliminarCuenta = () => {
    if (!passwordEliminar) return toast.error("Ingresa tu contraseña para confirmar");
    setEliminando(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("password", passwordEliminar);
        const result = await eliminarCuenta({}, fd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.eliminadaDeInmediato) {
          toast.success("Tu cuenta fue eliminada");
          await signOut({ callbackUrl: "/login" });
        } else {
          toast.success("Solicitud registrada");
          setShowEliminar(false);
          setPasswordEliminar("");
          window.alert(result.mensaje);
        }
      } finally {
        setEliminando(false);
      }
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "finca", label: "Finca", icon: MapPin },
    { id: "alertas", label: "Alertas", icon: Bell },
    { id: "privacidad", label: "Privacidad", icon: ShieldCheck },
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
            onClick={saveProfile}
            loading={saving}
            className="w-full"
          >
            <Save size={15} />
            Guardar perfil
          </Button>
        </div>
      )}

      {/* ── Vista de la aplicación (Fase 3, ADR-006) ───────────────────────
          Mismo componente que Perfil (modo simple) — ver VistaPreferidaSwitch.tsx.
          No es una pestaña propia, vive dentro de "Perfil" porque es una
          preferencia de la persona, no de la finca ni de las alertas. */}
      {tab === "profile" && (
        <div className="card p-6 space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
              Vista de la aplicación
            </h2>
            <p className="text-[12px] text-[var(--text-muted)]">
              Simple: pantallas móviles simplificadas. Completa: el panel de escritorio
              actual. Automático: elige según el tamaño de tu pantalla.
            </p>
          </div>
          <VistaPreferidaSwitch vistaActual={user?.vistaPreferida ?? "AUTO"} />
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
            onClick={saveFinca}
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
                  hint: "Recibirás alerta cuando la temperatura nocturna baje de este valor. Para plántulas de aguacate recién sembradas se recomienda 12°C.",
                  min: 0, max: 20, step: 1,
                },
                {
                  key: "tempMaxAlert",
                  label: "Temperatura máxima para alerta de calor (°C)",
                  hint: "Temperatura máxima antes de que el aguacate sufra estrés calórico. A más de 30°C aumenta el riesgo de ácaros y caída de flores.",
                  min: 25, max: 45, step: 1,
                },
                {
                  key: "rainAlertMm",
                  label: "Precipitación diaria para alerta de lluvia excesiva (mm)",
                  hint: "Lluvia acumulada en un día que activa la alerta de encharcamiento y riesgo de Phytophthora. Valor seguro: 30 mm.",
                  min: 10, max: 100, step: 5,
                },
                {
                  key: "windAlertKmh",
                  label: "Velocidad del viento para alerta (km/h)",
                  hint: "Velocidad del viento que puede dañar ramas y flores. El aguacate es muy sensible al viento mecánico.",
                  min: 20, max: 100, step: 5,
                },
                {
                  key: "droughtDays",
                  label: "Días consecutivos sin lluvia para alerta de sequía",
                  hint: "Días consecutivos sin lluvia antes de alertar por sequía. Importante en la época seca (ene-feb y jul-ago).",
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
                      background: `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${
                        ((Number(alertaForm[key as keyof typeof alertaForm]) - min) / (max - min)) * 100
                      }%, var(--color-brand-bg) ${
                        ((Number(alertaForm[key as keyof typeof alertaForm]) - min) / (max - min)) * 100
                      }%, var(--color-brand-bg) 100%)`,
                    }}
                  />
                  <p className="text-[var(--text-muted)] mt-1" style={{ fontSize: 11, lineHeight: 1.5 }}>{hint}</p>
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
              onClick={saveAlertas}
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

      {/* ── Privacidad (Ley 1581 de 2012) ──────────────────────────────────── */}
      {tab === "privacidad" && (
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Tus datos
            </h2>
            <p className="text-[12px] text-[var(--text-muted)]">
              Puedes descargar una copia de todo lo que has registrado en GermIA (finca, cultivos, bitácora,
              gastos, ingresos, compradores) en cualquier momento.
            </p>
            <Button variant="secondary" onClick={handleExportar} loading={exportando} className="w-full">
              <Download size={15} />
              Descargar mis datos
            </Button>
          </div>

          <div className="card p-6 space-y-3 border-negative-100">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Eliminar mi cuenta
            </h2>
            <p className="text-[12px] text-[var(--text-muted)]">
              Elimina tu cuenta y tus datos de GermIA de forma permanente. Si tu finca tiene colaboradores o
              inversionistas activos, primero registramos tu solicitud para coordinar la transferencia antes de
              borrar nada — no perderán acceso sin avisarles.
            </p>
            <Button variant="danger" onClick={() => setShowEliminar(true)} className="w-full">
              <Trash2 size={15} />
              Eliminar mi cuenta
            </Button>
          </div>
        </div>
      )}

      <Modal isOpen={showEliminar} onClose={() => setShowEliminar(false)} title="Confirma la eliminación" size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Esta acción no se puede deshacer. Ingresa tu contraseña para confirmar que quieres eliminar tu cuenta
            de GermIA.
          </p>
          <Input
            label="Contraseña"
            type="password"
            value={passwordEliminar}
            onChange={(e) => setPasswordEliminar(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setShowEliminar(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleEliminarCuenta} loading={eliminando}>
              Sí, eliminar mi cuenta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

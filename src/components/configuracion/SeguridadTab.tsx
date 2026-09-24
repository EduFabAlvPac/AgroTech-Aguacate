"use client";

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { ShieldCheck, ShieldOff, KeyRound, RefreshCw, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal } from "@/components/ui";
import {
  iniciarActivacionMfa,
  confirmarActivacionMfa,
  desactivarMfa,
  regenerarCodigosRespaldo,
} from "@/app/(dashboard)/dashboard/configuracion/mfa-actions";

/**
 * Pestaña "Seguridad" de Configuración (ADR-011 Sprint 6) — verificación en
 * dos pasos (TOTP) y sus códigos de respaldo. A diferencia de "Organización"
 * (solo OWNER), esta la ve cualquier usuario autenticado: es una preferencia
 * de la cuenta de la persona, igual que el cambio de contraseña en "Perfil".
 *
 * Flujo de alta en dos pasos, a propósito (ver mfa-actions.ts):
 * 1) iniciarActivacionMfa() genera el secreto y el QR, pero NO activa MFA
 *    todavía — evita dejar la cuenta "protegida" sin que el usuario haya
 *    confirmado que su app realmente genera el código correcto.
 * 2) confirmarActivacionMfa(codigo) verifica ese primer código real, activa
 *    MFA y entrega los 10 códigos de respaldo EN CLARO una sola vez.
 */

type Paso = "inactivo" | "generando" | "confirmando" | "mostrando-codigos" | "activo";

interface SeguridadTabProps {
  mfaHabilitado: boolean;
}

export function SeguridadTab({ mfaHabilitado }: SeguridadTabProps) {
  const [, startTransition] = useTransition();
  const [habilitado, setHabilitado] = useState(mfaHabilitado);
  const [paso, setPaso] = useState<Paso>(mfaHabilitado ? "activo" : "inactivo");
  const [cargando, setCargando] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secretoManual, setSecretoManual] = useState<string | null>(null);
  const [codigoConfirmar, setCodigoConfirmar] = useState("");
  const [codigosRespaldo, setCodigosRespaldo] = useState<string[] | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [showDesactivar, setShowDesactivar] = useState(false);
  const [showRegenerar, setShowRegenerar] = useState(false);
  const [passwordConfirmar, setPasswordConfirmar] = useState("");

  const iniciarActivacion = () => {
    setCargando(true);
    startTransition(async () => {
      try {
        const result = await iniciarActivacionMfa();
        if (result.error || !result.uriQR || !result.secreto) {
          toast.error(result.error || "No se pudo generar el código QR");
          return;
        }
        const dataUrl = await QRCode.toDataURL(result.uriQR);
        setQrDataUrl(dataUrl);
        setSecretoManual(result.secreto);
        setPaso("confirmando");
      } finally {
        setCargando(false);
      }
    });
  };

  const confirmarActivacion = () => {
    if (!codigoConfirmar.trim()) {
      toast.error("Ingresa el código de 6 dígitos");
      return;
    }
    setCargando(true);
    startTransition(async () => {
      try {
        const result = await confirmarActivacionMfa(codigoConfirmar);
        if (result.error || !result.codigosRespaldo) {
          toast.error(result.error || "No se pudo confirmar");
          return;
        }
        setCodigosRespaldo(result.codigosRespaldo);
        setPaso("mostrando-codigos");
        setHabilitado(true);
        setCodigoConfirmar("");
        toast.success("Verificación en dos pasos activada");
      } finally {
        setCargando(false);
      }
    });
  };

  const terminarActivacion = () => {
    setCodigosRespaldo(null);
    setQrDataUrl(null);
    setSecretoManual(null);
    setPaso("activo");
  };

  const confirmarDesactivar = () => {
    if (!passwordConfirmar) return toast.error("Ingresa tu contraseña para confirmar");
    setCargando(true);
    startTransition(async () => {
      try {
        const result = await desactivarMfa(passwordConfirmar);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Verificación en dos pasos desactivada");
        setHabilitado(false);
        setPaso("inactivo");
        setShowDesactivar(false);
        setPasswordConfirmar("");
      } finally {
        setCargando(false);
      }
    });
  };

  const confirmarRegenerar = () => {
    if (!passwordConfirmar) return toast.error("Ingresa tu contraseña para confirmar");
    setCargando(true);
    startTransition(async () => {
      try {
        const result = await regenerarCodigosRespaldo(passwordConfirmar);
        if (result.error || !result.codigosRespaldo) {
          toast.error(result.error || "No se pudo regenerar");
          return;
        }
        setCodigosRespaldo(result.codigosRespaldo);
        setShowRegenerar(false);
        setPasswordConfirmar("");
        setPaso("mostrando-codigos");
      } finally {
        setCargando(false);
      }
    });
  };

  const copiarCodigos = async () => {
    if (!codigosRespaldo) return;
    try {
      await navigator.clipboard.writeText(codigosRespaldo.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar — anótalos a mano");
    }
  };

  // ── Panel de códigos de respaldo (se muestran una sola vez) ─────────────
  if (paso === "mostrando-codigos" && codigosRespaldo) {
    return (
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Guarda tus códigos de respaldo</h2>
          <p className="text-[12px] text-[var(--text-muted)]">
            Cada código sirve una sola vez y te permite entrar si pierdes acceso a tu app de autenticación. Guárdalos
            en un lugar seguro — esta es la única vez que se muestran en claro.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-[var(--surface-page)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-4 font-mono text-[13px]">
          {codigosRespaldo.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>

        <Button variant="secondary" onClick={copiarCodigos} className="w-full">
          {copiado ? <Check size={15} /> : <Copy size={15} />}
          {copiado ? "Copiado" : "Copiar códigos"}
        </Button>

        <Button onClick={terminarActivacion} className="w-full">
          Ya los guardé
        </Button>
      </div>
    );
  }

  // ── Paso 2: confirmar el primer código real ──────────────────────────────
  if (paso === "confirmando" && qrDataUrl) {
    return (
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Escanea el código QR</h2>
          <p className="text-[12px] text-[var(--text-muted)]">
            Ábrelo con Google Authenticator, Authy o una app similar, y escribe el código de 6 dígitos que te muestre
            para confirmar.
          </p>
        </div>

        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Código QR para activar la verificación en dos pasos" width={200} height={200} />
        </div>

        {secretoManual && (
          <p className="text-[11px] text-center text-[var(--text-muted)]">
            ¿No puedes escanear? Ingresa este código manualmente: <span className="font-mono">{secretoManual}</span>
          </p>
        )}

        <Input
          label="Código de 6 dígitos"
          value={codigoConfirmar}
          onChange={(e) => setCodigoConfirmar(e.target.value)}
          placeholder="123456"
          autoFocus
        />

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPaso("inactivo")} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={confirmarActivacion} loading={cargando} className="flex-1">
            Confirmar
          </Button>
        </div>
      </div>
    );
  }

  // ── Estado normal: activo o inactivo ─────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-3">
          {habilitado ? (
            <ShieldCheck size={20} className="text-agro-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldOff size={20} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
          )}
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
              Verificación en dos pasos {habilitado && <span className="text-agro-600">· Activa</span>}
            </h2>
            <p className="text-[12px] text-[var(--text-muted)]">
              Además de tu contraseña, pide un código de tu celular al iniciar sesión — protege tu cuenta aunque
              alguien más descubra tu contraseña.
            </p>
          </div>
        </div>

        {!habilitado ? (
          <Button onClick={iniciarActivacion} loading={cargando} className="w-full">
            <ShieldCheck size={15} />
            Activar verificación en dos pasos
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setShowRegenerar(true)} className="flex-1">
              <RefreshCw size={15} />
              Regenerar códigos de respaldo
            </Button>
            <Button variant="danger" onClick={() => setShowDesactivar(true)} className="flex-1">
              <KeyRound size={15} />
              Desactivar
            </Button>
          </div>
        )}
      </div>

      <Modal isOpen={showDesactivar} onClose={() => setShowDesactivar(false)} title="Desactivar verificación en dos pasos" size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Tu cuenta quedará protegida solo con tu contraseña. Ingresa tu contraseña para confirmar.
          </p>
          <Input
            label="Contraseña"
            type="password"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setShowDesactivar(false)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmarDesactivar} loading={cargando}>
              Sí, desactivar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showRegenerar} onClose={() => setShowRegenerar(false)} title="Regenerar códigos de respaldo" size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Tus códigos actuales dejarán de servir y se generarán 10 nuevos. Ingresa tu contraseña para confirmar.
          </p>
          <Input
            label="Contraseña"
            type="password"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setShowRegenerar(false)}>Cancelar</Button>
            <Button onClick={confirmarRegenerar} loading={cargando}>
              Regenerar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

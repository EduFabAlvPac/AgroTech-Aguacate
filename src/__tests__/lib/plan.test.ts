import { describe, it, expect } from "vitest";
import {
  estadoEfectivoOrg, puedeEscribir, diasRestantesTrial, limiteAsociados, puedeAgregarAsociado,
  finDeTrial, avisoPendiente, nuevoFinTrial, TRIAL_DIAS, type OrgPlanInfo,
} from "@/lib/plan";

const AHORA = new Date("2026-10-01T12:00:00Z");
const dias = (n: number) => new Date(AHORA.getTime() + n * 24 * 60 * 60 * 1000);
const org = (over: Partial<OrgPlanInfo> = {}): OrgPlanInfo => ({
  esTrial: false, trialFinEn: null, estadoPlan: "ACTIVA", trialMaxAsociados: 5, limiteAsociadosPlan: null, ...over,
});

describe("estadoEfectivoOrg / puedeEscribir", () => {
  it("una organización existente (sin trial, ACTIVA) sigue escribiendo — cero cambio para los usuarios actuales", () => {
    expect(estadoEfectivoOrg(org(), AHORA)).toBe("ACTIVA");
    expect(puedeEscribir(org(), AHORA)).toBe(true);
  });

  it("trial vigente escribe; trial vencido queda en modo lectura", () => {
    expect(estadoEfectivoOrg(org({ esTrial: true, trialFinEn: dias(10) }), AHORA)).toBe("EN_TRIAL");
    expect(puedeEscribir(org({ esTrial: true, trialFinEn: dias(10) }), AHORA)).toBe(true);
    expect(estadoEfectivoOrg(org({ esTrial: true, trialFinEn: dias(-1) }), AHORA)).toBe("TRIAL_VENCIDO");
    expect(puedeEscribir(org({ esTrial: true, trialFinEn: dias(-1) }), AHORA)).toBe(false);
  });

  it("el estado sale de las FECHAS: sigue vencido aunque el cron no haya cambiado estadoPlan", () => {
    expect(estadoEfectivoOrg(org({ esTrial: true, trialFinEn: dias(-3), estadoPlan: "EN_TRIAL" }), AHORA)).toBe("TRIAL_VENCIDO");
  });

  it("trial sin fecha de fin (dato incompleto) no bloquea", () => {
    expect(puedeEscribir(org({ esTrial: true, trialFinEn: null }), AHORA)).toBe(true);
  });

  it("un plan pagado se bloquea solo si alguien lo suspendió/canceló", () => {
    expect(puedeEscribir(org({ estadoPlan: "SUSPENDIDA_PAGO" }), AHORA)).toBe(false);
    expect(puedeEscribir(org({ estadoPlan: "CANCELADA" }), AHORA)).toBe(false);
    expect(puedeEscribir(org({ estadoPlan: "MOROSA" }), AHORA)).toBe(true);
  });

  it("al activar el plan (esTrial false, ACTIVA) se libera el bloqueo aunque trialFinEn siga en el pasado", () => {
    expect(puedeEscribir(org({ esTrial: false, trialFinEn: dias(-30), estadoPlan: "ACTIVA" }), AHORA)).toBe(true);
  });
});

describe("diasRestantesTrial", () => {
  it("cuenta días completos hacia arriba y nunca baja de 0", () => {
    expect(diasRestantesTrial(org({ esTrial: true, trialFinEn: dias(7) }), AHORA)).toBe(7);
    expect(diasRestantesTrial(org({ esTrial: true, trialFinEn: new Date(AHORA.getTime() + 3600_000) }), AHORA)).toBe(1);
    expect(diasRestantesTrial(org({ esTrial: true, trialFinEn: dias(-5) }), AHORA)).toBe(0);
  });
  it("null si no es trial", () => {
    expect(diasRestantesTrial(org(), AHORA)).toBeNull();
  });
});

describe("límite de asociados", () => {
  it("trial: 5 por defecto; el 6º no entra", () => {
    const t = org({ esTrial: true, trialFinEn: dias(5), trialMaxAsociados: null });
    expect(limiteAsociados(t)).toBe(5);
    expect(puedeAgregarAsociado(t, 4)).toBe(true);
    expect(puedeAgregarAsociado(t, 5)).toBe(false);
  });
  it("plan pagado: limiteAsociadosPlan; null = sin límite (también las organizaciones actuales)", () => {
    expect(puedeAgregarAsociado(org({ limiteAsociadosPlan: 50 }), 49)).toBe(true);
    expect(puedeAgregarAsociado(org({ limiteAsociadosPlan: 50 }), 50)).toBe(false);
    expect(puedeAgregarAsociado(org(), 10_000)).toBe(true);
  });
});

describe("finDeTrial", () => {
  it("son 30 días exactos", () => {
    expect(finDeTrial(AHORA).getTime() - AHORA.getTime()).toBe(TRIAL_DIAS * 24 * 60 * 60 * 1000);
  });
});

describe("avisoPendiente (cron diario)", () => {
  it("no manda nada si faltan más de 7 días", () => {
    expect(avisoPendiente(20, [])).toBeNull();
  });
  it("manda el de 7, 3, 1 y 0 en su día, una sola vez", () => {
    expect(avisoPendiente(7, [])?.enviar).toBe(7);
    expect(avisoPendiente(7, [7])).toBeNull();
    expect(avisoPendiente(3, [7])?.enviar).toBe(3);
    expect(avisoPendiente(1, [7, 3])?.enviar).toBe(1);
    expect(avisoPendiente(0, [7, 3, 1])?.enviar).toBe(0);
    expect(avisoPendiente(0, [7, 3, 1, 0])).toBeNull();
  });
  it("si el cron se saltó días manda UN correo y marca todos los umbrales cruzados", () => {
    const r = avisoPendiente(2, []);
    expect(r?.enviar).toBe(3);
    expect(r?.marcar.sort()).toEqual([3, 7]);
  });
});

describe("nuevoFinTrial (extender la prueba)", () => {
  it("si el trial sigue vigente, suma desde su fin actual", () => {
    expect(nuevoFinTrial(dias(10), 15, AHORA).getTime()).toBe(dias(25).getTime());
  });
  it("si ya venció, suma desde HOY (no queda vencido de nuevo)", () => {
    const nuevo = nuevoFinTrial(dias(-40), 15, AHORA);
    expect(nuevo.getTime()).toBe(dias(15).getTime());
    expect(puedeEscribir(org({ esTrial: true, trialFinEn: nuevo }), AHORA)).toBe(true);
  });
  it("sin fecha previa suma desde hoy", () => {
    expect(nuevoFinTrial(null, 7, AHORA).getTime()).toBe(dias(7).getTime());
  });
});

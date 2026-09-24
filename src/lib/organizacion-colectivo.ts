/**
 * Alta de una organización Colectivo/Cooperativa en trial (ADR-011 §6.1).
 * Compartido por el registro público (persona nueva) y por "crear cooperativa"
 * de una persona que ya tiene cuenta (segunda organización → activa el
 * selector de contexto).
 */
import type { Prisma } from "@prisma/client";
import { finDeTrial, TRIAL_MAX_ASOCIADOS } from "./plan";

export interface DatosColectivo {
  nombreOrganizacion: string;
  nit: string;
  celularContacto: string;
  emailContacto: string;
  ciudad?: string;
  departamento?: string;
}

/** Normaliza el NIT para comparar/guardar ("900.123.456-7" y "9001234567" son
 * el mismo). Solo dígitos y el dígito de verificación no se separa. */
export function normalizarNit(nit: string): string {
  return nit.replace(/[^0-9kK]/g, "").toUpperCase();
}

export async function crearOrganizacionColectivo(
  tx: Prisma.TransactionClient,
  userId: string,
  datos: DatosColectivo,
  opciones: { slug: string; esRolPrimario: boolean; ahora?: Date }
) {
  const ahora = opciones.ahora ?? new Date();
  const organizacion = await tx.organizacion.create({
    data: {
      nombre: datos.nombreOrganizacion,
      slug: opciones.slug,
      tipo: "COOPERATIVA",
      plan: "COLECTIVO",
      estadoPlan: "EN_TRIAL",
      esTrial: true,
      trialInicioEn: ahora,
      trialFinEn: finDeTrial(ahora),
      trialMaxAsociados: TRIAL_MAX_ASOCIADOS,
      planIniciadoEn: ahora,
      nit: normalizarNit(datos.nit),
      ciudad: datos.ciudad || null,
      departamento: datos.departamento || null,
      emailContacto: datos.emailContacto,
      celularContacto: datos.celularContacto,
    },
  });
  await tx.membresia.create({
    data: {
      userId,
      organizacionId: organizacion.id,
      rol: "OWNER",
      rolesIam: ["ORG_OWNER"],
      esRolPrimario: opciones.esRolPrimario,
      aceptadoEn: ahora,
    },
  });
  return organizacion;
}

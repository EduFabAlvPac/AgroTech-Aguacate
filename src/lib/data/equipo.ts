/**
 * Capa de datos de Equipo — Fase 1 (ADR-006). Reemplaza las queries que
 * vivían inline en equipo/page.tsx. El chequeo de "es OWNER de su
 * organización" se queda en la page (implica un redirect(), es un
 * concern de la ruta, no de lectura de datos).
 */
import { db } from "@/lib/db";
import { obtenerPlantillaModulos, type PlantillasModulos } from "@/lib/modulos";
import type { RolOrganizacion } from "@prisma/client";

export interface FincaOption {
  id: string;
  nombre: string;
}

export interface FincaAccesoData {
  fincaId: string;
  nombre: string;
  rol: string;
  modulos: string[];
}

export interface MiembroData {
  id: string;
  nombre: string | null;
  email: string;
  rol: RolOrganizacion;
  activa: boolean;
  fincas: FincaAccesoData[];
}

export interface CuentaCampesinoData {
  id: string;
  nombre: string | null;
  telefono: string | null;
  createdAt: Date;
  // Login Campesino seguro — ver campesino-vinculacion.ts. `requiereVinculacion`
  // false = cuenta anterior a la protección (sigue entrando solo con el número).
  requiereVinculacion: boolean;
  dispositivosActivos: number;
}

export interface EquipoResumen {
  miembros: MiembroData[];
  fincas: FincaOption[];
  plantillas: PlantillasModulos;
  cuentasCampesino: CuentaCampesinoData[];
}

export async function getEquipoResumen(organizacionId: string, ownerId: string): Promise<EquipoResumen> {
  const [miembros, fincas, plantillas, cuentasCampesino] = await Promise.all([
    db.membresia.findMany({
      where: { organizacionId, rol: { not: "OWNER" } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.finca.findMany({ where: { organizacionId }, select: { id: true, nombre: true } }),
    obtenerPlantillaModulos(organizacionId),
    // Sin Membresia (decisión de producto, ver campesino-actions.ts) — se
    // scopea por creadoPorId (el OWNER que las dio de alta) en vez de
    // organizacionId, para no listar cuentas Campesino de otros tenants.
    db.user.findMany({
      where: { experiencia: "CAMPESINO", creadoPorId: ownerId },
      select: {
        id: true, name: true, telefono: true, createdAt: true, requiereVinculacion: true,
        _count: { select: { dispositivosConfianza: { where: { revocadoEn: null, expiraEn: { gt: new Date() } } } } },
      },
      orderBy: { createdAt: "desc" },
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id, nombre: r.name, telefono: r.telefono, createdAt: r.createdAt,
        requiereVinculacion: r.requiereVinculacion,
        dispositivosActivos: r._count.dispositivosConfianza,
      }))
    ),
  ]);

  const accesos = await db.fincaAcceso.findMany({
    where: { fincaId: { in: fincas.map((f) => f.id) }, userId: { in: miembros.map((m) => m.userId) } },
    select: { userId: true, fincaId: true, rol: true, modulos: true },
  });

  const miembrosConAcceso: MiembroData[] = miembros.map((m) => ({
    id: m.id,
    nombre: m.user.name,
    email: m.user.email,
    rol: m.rol,
    activa: m.activa,
    fincas: accesos
      .filter((a) => a.userId === m.userId)
      .map((a) => ({ fincaId: a.fincaId, nombre: fincas.find((f) => f.id === a.fincaId)?.nombre ?? "?", rol: a.rol, modulos: a.modulos })),
  }));

  return { miembros: miembrosConAcceso, fincas, plantillas, cuentasCampesino };
}

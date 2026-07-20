import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// This route runs on Node.js runtime (NOT edge) so it can use Prisma
// It provides dynamic farm context for AgroIA to personalize responses

export type FarmContext = {
  finca: {
    nombre: string;
    municipio: string;
    departamento: string;
    areaTotal: number | null;
  } | null;
  cultivos: {
    especie: string;
    variedad: string;
    etapa: string;
    lote: string;
    diasDesdeSiembra: number | null;
    cantidadPlantas: number | null;
  }[];
  alertasActivas: {
    tipo: string;
    titulo: string;
    severidad: string;
  }[];
  finanzas: {
    ultimosGastos: { concepto: string; monto: number; categoria: string; fecha: string }[];
    ultimosIngresos: { concepto: string; monto: number; fecha: string }[];
    totalGastosMes: number;
  };
  clima: {
    disponible: boolean;
    resumen?: string;
  };
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parallel fetch: finca+cultivos, alertas, gastos recientes, ingresos recientes
    const [finca, alertas, gastosRecientes, ingresosRecientes, gastosMesAgg] = await Promise.all([
      db.finca.findFirst({
        where: { userId },
        select: {
          nombre: true,
          municipio: true,
          departamento: true,
          areaTotal: true,
          lotes: {
            select: {
              nombre: true,
              areaHa: true,
              altitud: true,
              cultivos: {
                where: { estado: "ACTIVO" },
                select: {
                  especie: true,
                  variedad: true,
                  etapa: true,
                  fechaSiembra: true,
                  cantidadPlantas: true,
                },
                take: 1,
              },
            },
          },
        },
      }),
      db.alertaClimatica.findMany({
        where: { activa: true, leida: false },
        select: { tipo: true, titulo: true, severidad: true },
        orderBy: { fechaInicio: "desc" },
        take: 5,
      }),
      db.gasto.findMany({
        where: { cultivo: { lote: { finca: { userId } } } },
        select: { concepto: true, monto: true, categoria: true, fecha: true },
        orderBy: { fecha: "desc" },
        take: 3,
      }),
      db.ingreso.findMany({
        where: {
          OR: [
            { cultivo: { lote: { finca: { userId } } } },
            { comprador: { userId } },
          ],
        },
        select: { concepto: true, monto: true, fecha: true },
        orderBy: { fecha: "desc" },
        take: 3,
      }),
      db.gasto.aggregate({
        where: {
          cultivo: { lote: { finca: { userId } } },
          fecha: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { monto: true },
      }),
    ]);

    // Build cultivos array with days since planting
    const cultivos = (finca?.lotes ?? []).flatMap((lote) =>
      lote.cultivos.map((c) => ({
        especie: c.especie,
        variedad: c.variedad,
        etapa: c.etapa,
        lote: lote.nombre,
        diasDesdeSiembra: c.fechaSiembra
          ? Math.floor((Date.now() - new Date(c.fechaSiembra).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        cantidadPlantas: c.cantidadPlantas,
      }))
    );

    const context: FarmContext = {
      finca: finca
        ? {
            nombre: finca.nombre,
            municipio: finca.municipio,
            departamento: finca.departamento,
            areaTotal: finca.areaTotal,
          }
        : null,
      cultivos,
      alertasActivas: alertas.map((a) => ({
        tipo: a.tipo,
        titulo: a.titulo,
        severidad: a.severidad,
      })),
      finanzas: {
        ultimosGastos: gastosRecientes.map((g) => ({
          concepto: g.concepto,
          monto: g.monto,
          categoria: g.categoria,
          fecha: g.fecha.toISOString().split("T")[0],
        })),
        ultimosIngresos: ingresosRecientes.map((i) => ({
          concepto: i.concepto,
          monto: i.monto,
          fecha: i.fecha.toISOString().split("T")[0],
        })),
        totalGastosMes: gastosMesAgg._sum.monto ?? 0,
      },
      clima: {
        disponible: !!process.env.OPENWEATHER_API_KEY,
      },
    };

    return NextResponse.json({ data: context });
  } catch (error) {
    console.error("[GET /api/chat/context]", error);
    return NextResponse.json({ error: "Error al obtener contexto" }, { status: 500 });
  }
}

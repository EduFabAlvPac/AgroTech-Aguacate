import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/configuracion
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [user, prefs, finca] = await Promise.all([
      db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, telefono: true, role: true },
      }),
      db.userPreferences.findUnique({ where: { userId: session.user.id } }),
      db.finca.findFirst({
        where: { userId: session.user.id },
        select: { id: true, nombre: true, municipio: true, departamento: true, lat: true, lng: true, areaTotal: true },
      }),
    ]);

    return NextResponse.json({ data: { user, prefs, finca } });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/configuracion
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { section, data } = body;

    if (section === "profile") {
      const updates: any = {
        name: data.name,
        telefono: data.telefono,
      };
      if (data.newPassword && data.currentPassword) {
        const user = await db.user.findUnique({ where: { id: session.user.id } });
        const valid = user?.password
          ? await bcrypt.compare(data.currentPassword, user.password)
          : false;
        if (!valid) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
        updates.password = await bcrypt.hash(data.newPassword, 12);
      }
      const updated = await db.user.update({ where: { id: session.user.id }, data: updates });
      return NextResponse.json({ data: { id: updated.id, name: updated.name } });
    }

    if (section === "finca") {
      const existing = await db.finca.findFirst({ where: { userId: session.user.id } });
      if (!existing) return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
      const updated = await db.finca.update({
        where: { id: existing.id },
        data: {
          nombre: data.nombre,
          municipio: data.municipio,
          departamento: data.departamento,
          lat: data.lat ? Number(data.lat) : undefined,
          lng: data.lng ? Number(data.lng) : undefined,
          areaTotal: data.areaTotal ? Number(data.areaTotal) : undefined,
        },
      });
      return NextResponse.json({ data: updated });
    }

    if (section === "alertas") {
      const updated = await db.userPreferences.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          tempMinAlert: Number(data.tempMinAlert ?? 12),
          tempMaxAlert: Number(data.tempMaxAlert ?? 32),
          rainAlertMm: Number(data.rainAlertMm ?? 30),
          windAlertKmh: Number(data.windAlertKmh ?? 40),
          droughtDays: Number(data.droughtDays ?? 5),
          emailAlerts: data.emailAlerts ?? true,
          pushAlerts: data.pushAlerts ?? true,
        },
        update: {
          tempMinAlert: Number(data.tempMinAlert ?? 12),
          tempMaxAlert: Number(data.tempMaxAlert ?? 32),
          rainAlertMm: Number(data.rainAlertMm ?? 30),
          windAlertKmh: Number(data.windAlertKmh ?? 40),
          droughtDays: Number(data.droughtDays ?? 5),
          emailAlerts: data.emailAlerts ?? true,
          pushAlerts: data.pushAlerts ?? true,
        },
      });
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: "Sección no válida" }, { status: 400 });
  } catch (error) {
    console.error("[PUT /api/configuracion]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

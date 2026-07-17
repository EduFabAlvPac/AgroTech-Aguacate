import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCurrentWeather,
  getForecast,
  groupForecastByDay,
} from "@/lib/weather";
import { db } from "@/lib/db";

// GET /api/weather?type=current|forecast|daily
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "current";

    // Get user's finca coordinates
    const finca = await db.finca.findFirst({
      where: { userId: session.user.id },
      select: { lat: true, lng: true, municipio: true },
    });

    const lat = finca?.lat ?? 7.9273;
    const lng = finca?.lng ?? -72.5078;

    if (type === "forecast" || type === "daily") {
      const forecast = await getForecast(lat, lng);
      if (!forecast) {
        return NextResponse.json({ error: "No se pudo obtener el pronóstico" }, { status: 503 });
      }

      if (type === "daily") {
        return NextResponse.json({ data: groupForecastByDay(forecast) });
      }

      return NextResponse.json({ data: forecast });
    }

    // Default: current weather
    const current = await getCurrentWeather(lat, lng);
    if (!current) {
      return NextResponse.json({ error: "No se pudo obtener el clima" }, { status: 503 });
    }

    return NextResponse.json({ data: current });
  } catch (error) {
    console.error("[GET /api/weather]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumirCuotaIA, CuotaExcedidaError } from "@/lib/ia-cuota";

/**
 * Transcripción de voz (RF14) — ver CLAUDE.md §3 y docs/REQUERIMIENTOS.md §1.3.
 * Mismo GROQ_API_KEY que el asistente/diagnóstico, endpoint de audio de Groq
 * (confirmado en su documentación, agosto 2026): whisper-large-v3-turbo,
 * $0.04/hora, acepta webm directo — que es justo lo que produce
 * MediaRecorder en el navegador sin conversión.
 */

// Margen amplio para una nota de voz típica de campo (unos pocos minutos).
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await consumirCuotaIA(session.user.id, "VOZ");

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });

    const formData = await req.formData();
    const audio = formData.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Se requiere un archivo de audio" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "El audio es demasiado largo" }, { status: 413 });
    }

    const groqForm = new FormData();
    groqForm.append("file", audio, "nota.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("language", "es");
    groqForm.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "Error del servicio de transcripción" }, { status: 502 });
    }

    const texto = typeof data.text === "string" ? data.text.trim() : "";
    return NextResponse.json({ data: { texto } });
  } catch (error) {
    if (error instanceof CuotaExcedidaError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/transcribir]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

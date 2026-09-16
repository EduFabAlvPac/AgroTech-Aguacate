import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sprout, ShoppingBag, BarChart3, CloudSun, Bell, ChevronRight, Camera } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentWeather, iconToEmoji } from "@/lib/weather";
import { obtenerConsejoDelDia } from "@/lib/consejo-del-dia";

export const metadata = { title: "GermIA — Campesino" };
export const dynamic = "force-dynamic";

// v2 del home (2026-08-28) — rediseño tras feedback directo del usuario:
// la v1 (grid 2x2 uniforme, ícono de línea flotando en un rectángulo de
// color plano) se sentía "genérica, tipo dashboard armado con IA". Esta
// versión: 1 tarjeta protagonista (Diagnóstico, la función insignia) con
// gradiente + ícono decorativo de fondo, 3 tarjetas compañeras más
// compactas, y una franja de clima real (no decorativa) que llena el
// espacio que antes quedaba en blanco al final de la pantalla.
const COMPANERAS = [
  { href: "/campesino/tienda", titulo: "Tienda", icon: ShoppingBag, from: "#F0932B", to: "#D97706" },
  { href: "/campesino/precios", titulo: "Precios", icon: BarChart3, from: "#8B5CF6", to: "#6D28D9" },
  { href: "/campesino/clima", titulo: "Clima", icon: CloudSun, from: "#3B82C4", to: "#1D5A96" },
] as const;

function saludoPorHora(): string {
  const horaBogota = Number(
    new Intl.DateTimeFormat("es-CO", { hour: "numeric", hour12: false, timeZone: "America/Bogota" }).format(new Date())
  );
  if (horaBogota < 12) return "Buenos días";
  if (horaBogota < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function CampesinoHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const nombre = (session.user.name ?? "Campesino").split(" ")[0];
  const saludo = saludoPorHora();

  // Misma ubicación real (o default de Ocaña) que /campesino/clima — ver
  // UbicacionCampesinoClient.tsx, montado en el layout.
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { ubicacionLat: true, ubicacionLng: true } });
  const clima = user?.ubicacionLat != null && user?.ubicacionLng != null
    ? await getCurrentWeather(user.ubicacionLat, user.ubicacionLng)
    : await getCurrentWeather();
  const consejo = obtenerConsejoDelDia(clima);
  // La franja es un adelanto corto — el consejo completo (que suele ser
  // UNA sola oración larga con un "—" en medio, ver consejo-del-dia.ts) se
  // ve completo en /campesino/clima. Acá solo la cláusula principal, antes
  // del guion, con tope de caracteres como respaldo.
  const consejoCorto = (() => {
    const clausulaPrincipal = consejo.split(" — ")[0];
    return clausulaPrincipal.length > 70 ? `${clausulaPrincipal.slice(0, 68).trimEnd()}…` : clausulaPrincipal;
  })();

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-[22px] font-bold text-[var(--text-primary)] leading-tight">
          ¡{saludo}, {nombre}!
        </h1>
        <Link
          href="/campesino/notificaciones"
          aria-label="Notificaciones"
          className="w-9 h-9 -mr-1.5 flex items-center justify-center flex-shrink-0"
        >
          <Bell size={22} className="text-[var(--text-primary)]" />
        </Link>
      </div>
      <p className="text-[15px] text-[var(--text-secondary)] mb-5">¿Qué necesitas hoy?</p>

      {/* Tarjeta protagonista — Diagnóstico es la función insignia (RF15),
          se lo gana con tamaño y jerarquía, no comparte protagonismo con
          las otras 3. Gradiente diagonal + ícono grande semi-transparente
          "sangrando" fuera del borde (profundidad real, no un ícono
          flotando en el vacío) + chip translúcido con el ícono real. */}
      <Link
        href="/campesino/diagnostico"
        className="relative overflow-hidden rounded-[22px] p-5 flex items-center gap-4 transition-transform active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #56B08A 0%, #2F6E52 100%)", minHeight: 124, boxShadow: "0 6px 20px rgba(47,110,82,0.35)" }}
      >
        <Sprout size={148} strokeWidth={1} className="absolute -right-8 -bottom-10 text-white/[0.14]" />
        <div
          className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          <Camera size={26} color="white" strokeWidth={1.75} />
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <p className="text-white/75 text-[11px] font-bold uppercase tracking-wide mb-0.5">Función principal</p>
          <p className="text-white text-[19px] font-bold leading-tight">Salud del cultivo</p>
          <p className="text-white/85 text-[12.5px] mt-0.5">Toma una foto y te digo qué tiene</p>
        </div>
        <ChevronRight size={20} className="relative z-10 text-white/70 flex-shrink-0" />
      </Link>

      {/* Tarjetas compañeras — chip translúcido con el ícono (no flotando
          solo en el rectángulo), gradiente diagonal propio por tarjeta. */}
      <div className="grid grid-cols-3 gap-2.5 mt-3">
        {COMPANERAS.map(({ href, titulo, icon: Icon, from, to }) => (
          <Link
            key={href}
            href={href}
            className="relative overflow-hidden rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-transform active:scale-[0.98]"
            style={{ background: `linear-gradient(160deg, ${from}, ${to})`, minHeight: 104, boxShadow: "0 3px 10px rgba(0,0,0,0.14)" }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.22)" }}>
              <Icon size={19} color="white" strokeWidth={1.9} />
            </div>
            <p className="text-white text-[12px] font-bold leading-tight">{titulo}</p>
          </Link>
        ))}
      </div>

      {/* Franja de clima real — llena con contenido útil el espacio que
          antes quedaba en blanco al final de la pantalla, en vez de
          decoración vacía. Mismo dato/consejo que /campesino/clima. */}
      {clima && (
        <Link
          href="/campesino/clima"
          className="mt-3 flex items-center gap-3 p-3.5 rounded-2xl transition-transform active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #EAF3FB, #DCEBF7)" }}
        >
          <span style={{ fontSize: 30 }}>{iconToEmoji(clima.icon)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-bold" style={{ color: "#1E3A5F" }}>
              {clima.temp}° en {clima.city} — {consejoCorto}
            </p>
            <p className="text-[11.5px]" style={{ color: "#5A7897" }}>
              Toca para ver el clima completo
            </p>
          </div>
          <ChevronRight size={18} style={{ color: "#5A7897" }} className="flex-shrink-0" />
        </Link>
      )}

      <Link
        href="/campesino/hablar"
        className="mt-3 flex items-center gap-3 p-3.5 rounded-2xl transition-transform active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #EFF6EA, #E4F0DC)" }}
      >
        <img
          src="/img-app/icono-amigo.jpeg"
          alt=""
          className="w-11 h-11 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold" style={{ color: "#1F3D2A" }}>
            ¿Tienes dudas?
          </p>
          <p className="text-[12px]" style={{ color: "#4B6B57" }}>
            Pregúntale a GermIAmigo
          </p>
        </div>
        <ChevronRight size={18} style={{ color: "#4B6B57" }} className="flex-shrink-0" />
      </Link>
    </div>
  );
}

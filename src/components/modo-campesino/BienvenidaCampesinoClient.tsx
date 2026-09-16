"use client";

import { useRouter } from "next/navigation";

// Assets reales subidos por el usuario 2026-08-27 (public/img-app/).
// logo-germiamigo.png (reemplazó a logo-germiamigo.jpeg, que tenía el
// tablero de "transparencia" horneado en los píxeles — no era transparente
// de verdad porque JPEG no soporta canal alfa): PNG con alfa real
// verificado (RGBA, 0-255), así que ahora sí puede flotar directo sobre el
// cielo de la ilustración, igual que en el mockup de referencia.
const LOGO = "/img-app/logo-germiamigo.png";
// bienvenida.jpeg ya trae, horneado en la propia foto, el arranque del
// panel crema (~rgb(234,241,223)) en su cuarto inferior — por eso el panel
// de texto de abajo usa ese mismo color, para que no se note la costura.
const ILUSTRACION = "/img-app/bienvenida.jpeg";
const PANEL_BG = "#EAF1DF";

/**
 * Splash de bienvenida — se muestra UNA vez, justo después de un login
 * exitoso en modo Campesino (ver LoginCampesinoForm.tsx), antes de llegar a
 * /campesino. Pantalla completa, sin header/nav (ver ModoCampesinoShell).
 * Calcado del mockup de referencia (2026-08-27): logo flotando sobre el
 * cielo de la ilustración, panel con saludo + botón "Comenzar" — solo el
 * botón avanza, sin auto-avance ni tap-anywhere (así es el mockup, sin
 * ambigüedad).
 */
export function BienvenidaCampesinoClient() {
  const router = useRouter();
  const continuar = () => router.replace("/campesino");

  return (
    <div className="h-full flex flex-col" style={{ background: PANEL_BG }}>
      {/* Ilustración, con el logo flotando encima (PNG con alfa real) */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src={ILUSTRACION}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 15%" }}
        />
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-9 px-10">
          <img src={LOGO} alt="GermIAmigo — Tu amigo en el campo" className="w-full max-w-[260px] h-auto" />
        </div>
      </div>

      {/* Panel inferior — mismo color crema que ya trae la foto, para que no se note la costura */}
      <div className="px-6 pt-6 pb-8 text-center" style={{ background: PANEL_BG }}>
        <p className="text-[20px] font-bold" style={{ color: "#1F3D2A" }}>
          ¡Hola, amigo!
        </p>
        <p className="text-[14px] mt-1.5 mb-5" style={{ color: "#4B6B57" }}>
          Estoy aquí para ayudarte a cuidar tu cultivo.
        </p>
        <button
          type="button"
          onClick={continuar}
          className="w-full py-3.5 rounded-full text-white text-[15px] font-bold transition-transform active:scale-[0.98]"
          style={{ background: "#3E8F6C" }}
        >
          Comenzar
        </button>
      </div>
    </div>
  );
}

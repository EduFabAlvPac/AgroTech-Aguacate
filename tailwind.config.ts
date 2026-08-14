import type { Config } from "tailwindcss";

// ─── Paleta CampoApp (unificación aprobada — ver docs de la migración) ───────
// Reemplaza la paleta verde/ámbar anterior (agro/teal/harvest). Los nombres
// de familia se mantienen (agro/teal/harvest/earth) para no obligar a
// renombrar cientos de clases ya usadas en el código — lo que cambia son los
// VALORES hex, que ahora salen de la tabla de tokens de marca aprobada:
//
//   agro    → brand      (#3E8F6C / #2F6E52 dark / #E9F7F0 bg)
//   teal    → brand       también — antes era un verde decorativo sin
//                          significado fijo (variedad visual en timelines/
//                          KPIs); la paleta nueva no trae un "segundo verde",
//                          así que colapsa al mismo brand (decisión del
//                          fundador, no un valor inventado).
//   harvest → amber       (#D6A159 / #FCF4CC bg)
//   earth   → neutrales   (texto/borde/superficie de la tabla nueva)
//
// positive/negative/info son familias NUEVAS (no existían antes como escala
// con rampa completa) — ver globals.css para los tokens semánticos planos
// (--color-brand, --color-positive, etc.) que consume el resto de la app
// fuera de Tailwind (SVG, Leaflet, PDF).
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          50: "#E9F7F0",
          100: "#C9EBDC",
          200: "#A0DBC3",
          300: "#77CBA9",
          400: "#3E8F6C",
          500: "#368066",
          600: "#2F6E52",
          700: "#275A44",
          800: "#1F4736",
          900: "#163326",
        },
        teal: {
          50: "#E9F7F0",
          100: "#C9EBDC",
          200: "#A0DBC3",
          300: "#77CBA9",
          400: "#3E8F6C",
          500: "#368066",
          600: "#2F6E52",
          700: "#275A44",
          800: "#1F4736",
          900: "#163326",
        },
        harvest: {
          50: "#FCF4CC",
          100: "#F5E2A8",
          200: "#EDCF85",
          400: "#D6A159",
          500: "#C89142",
          600: "#B37A2E",
          800: "#8A5E20",
        },
        earth: {
          50: "#F5F5F5",
          100: "#E7E7E7",
          200: "#D4D4D4",
          400: "#9CA3AF",
          600: "#6B7280",
          800: "#374151",
          900: "#111111",
        },
        // Nuevas familias semánticas — antes se usaban clases sueltas de la
        // paleta default de Tailwind (red-*/blue-*/green-*) sin consistencia.
        positive: {
          50: "#EFFDF3",
          100: "#D8F5DF",
          400: "#4CA154",
          600: "#3D8143",
          800: "#2C5E31",
        },
        negative: {
          50: "#FCEEEC",
          100: "#F7D4D0",
          400: "#CA3A32",
          600: "#A82E27",
          800: "#7D231D",
        },
        info: {
          50: "#F1F6FE",
          100: "#DCE8FC",
          400: "#4A7FE0",
          600: "#3A66BA",
          800: "#2A4C8A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-in": "slideIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(-4px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

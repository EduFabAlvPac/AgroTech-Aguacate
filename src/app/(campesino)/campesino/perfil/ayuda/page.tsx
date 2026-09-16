import { Stethoscope, ShoppingBag, LineChart, CloudSun, Mic } from "lucide-react";

export const metadata = { title: "Ayuda — GermIA" };

const ITEMS = [
  {
    icon: Stethoscope,
    titulo: "Diagnóstico",
    texto: "Elige tu cultivo, toma una foto de la hoja o la planta, y GermIA te dice qué problema tiene y cómo tratarlo.",
  },
  {
    icon: ShoppingBag,
    titulo: "Tienda",
    texto: "Mira los productos recomendados. Al tocar uno, te lleva a la tienda para que lo consigas.",
  },
  {
    icon: LineChart,
    titulo: "Precios",
    texto: "Consulta el precio de hoy de café, cacao, aguacate y cítricos, y si subió, bajó o se mantuvo.",
  },
  {
    icon: CloudSun,
    titulo: "Clima y consejos",
    texto: "Mira el clima de hoy y un consejo para tu cultivo. Toca 'Escuchar' para que te lo lean en voz alta.",
  },
  {
    icon: Mic,
    titulo: "Hablar con GermIAmigo",
    texto: "Toca el micrófono verde en cualquier pantalla para hablar con GermIAmigo — te escucha y te responde hablando, como una llamada.",
  },
];

export default function AyudaCampesinoPage() {
  return (
    <div className="px-4 pt-4 pb-8">
      <h1 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Ayuda</h1>
      <div className="space-y-3">
        {ITEMS.map(({ icon: Icon, titulo, texto }) => (
          <div key={titulo} className="flex gap-3 p-3.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
            <div className="w-9 h-9 rounded-full bg-agro-50 flex items-center justify-center flex-shrink-0">
              <Icon size={17} className="text-agro-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{titulo}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{texto}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

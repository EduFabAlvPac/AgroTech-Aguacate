"use client";

import { Printer } from "lucide-react";

export function ImprimirBoton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-md bg-agro-600 text-white text-[14px] font-medium hover:bg-agro-800 print:hidden"
    >
      <Printer size={16} /> Imprimir o guardar como PDF
    </button>
  );
}

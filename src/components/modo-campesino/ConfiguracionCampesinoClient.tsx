"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Input, Button } from "@/components/ui";
import { actualizarNombreCampesino } from "@/app/(campesino)/campesino/perfil/configuracion/config-actions";

export function ConfiguracionCampesinoClient({ nombreInicial, telefono }: { nombreInicial: string; telefono: string | null }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const guardar = () => {
    setLoading(true);
    startTransition(async () => {
      const result = await actualizarNombreCampesino(nombre);
      if (result.error) toast.error(result.error);
      else toast.success("Nombre actualizado");
      setLoading(false);
    });
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <h1 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Configuración</h1>

      <div className="space-y-4">
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input label="Número de celular" value={telefono ?? ""} disabled />
        <p className="text-[11px] text-[var(--text-muted)] -mt-2">
          Si necesitas cambiar tu número de celular, pídele a tu asesor que lo actualice.
        </p>
        <Button loading={loading} onClick={guardar} className="w-full">
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

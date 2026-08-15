import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AsistenteIASimpleClient } from "@/components/modo-simple/AsistenteIASimpleClient";

export const metadata = { title: "Asistente IA — modo simple" };
export const dynamic = "force-dynamic";

// Sin capa de datos propia: ChatInterface.tsx (modo completo) recibe un prop
// `historial` (ChatMessage[] leído inline en dashboard/asistente/page.tsx)
// que en realidad nunca se usa dentro del componente (no inicializa el
// estado de mensajes) — confirmado leyendo el componente completo antes de
// replicar nada. No se arrastra esa lectura muerta aquí.
export default async function AsistenteIASimplePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return <AsistenteIASimpleClient />;
}

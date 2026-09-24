import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RegistroColectivoForm } from "@/components/auth/RegistroColectivoForm";

export const metadata = { title: "Registra tu cooperativa" };
export const dynamic = "force-dynamic";

export default async function RegistrarseColectivoPage() {
  // Con sesión abierta la persona ya tiene cuenta: solo se piden los datos de
  // la cooperativa, que se suma como su segunda organización.
  const session = await getServerSession(authOptions);
  return <RegistroColectivoForm sesionActiva={!!session?.user?.id} />;
}

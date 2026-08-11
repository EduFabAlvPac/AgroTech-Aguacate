import { Header } from "@/components/layout/Header";
import { ChatInterface } from "@/components/asistente/ChatInterface";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { tieneModulo } from "@/lib/modulos";

export const metadata = { title: "Asistente IA" };

export default async function AsistentePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!tieneModulo(session.user.modulosPermitidos, "asistente")) redirect("/dashboard");

  const params = await searchParams;

  const historial = await db.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <>
      <Header
        title="Asistente AgroIA"
        subtitle="Aguacate, café y cacao · Norte de Santander"
      />
      <div className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        <ChatInterface
          historial={historial.reverse() as any}
          initialQuery={params.q}
        />
      </div>
    </>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Settings, HelpCircle, ChevronRight, MapPin } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CerrarSesionCampesinoButton } from "@/components/modo-campesino/CerrarSesionCampesinoButton";

export const metadata = { title: "Mi perfil — GermIA" };
export const dynamic = "force-dynamic";

const MENU = [
  { href: "/campesino/perfil/consultas", label: "Mis consultas", icon: ClipboardList },
  { href: "/campesino/perfil/configuracion", label: "Configuración", icon: Settings },
  { href: "/campesino/perfil/ayuda", label: "Ayuda", icon: HelpCircle },
] as const;

export default async function PerfilCampesinoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, telefono: true },
  });

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
          <img src="/img-app/icono-amigo.jpeg" alt="" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-[16px] font-bold text-[var(--text-primary)]">{user?.name ?? "Campesino"}</p>
          <p className="text-[12px] text-[var(--text-muted)]">Campesino</p>
          {user?.telefono && (
            <p className="text-[12px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
              <MapPin size={11} /> {user.telefono}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mb-6">
        {MENU.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] hover:border-agro-200 transition-colors"
          >
            <Icon size={18} className="text-[var(--text-muted)]" />
            <span className="flex-1 text-[14px] font-medium text-[var(--text-primary)]">{label}</span>
            <ChevronRight size={16} className="text-[var(--text-muted)]" />
          </Link>
        ))}
      </div>

      <CerrarSesionCampesinoButton />
    </div>
  );
}

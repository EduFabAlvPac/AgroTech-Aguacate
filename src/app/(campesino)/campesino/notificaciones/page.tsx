import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Bell, TrendingUp, TrendingDown, Camera } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getNotificacionesCampesino, type NotificacionCampesino } from "@/lib/data/campesino-notificaciones";

export const metadata = { title: "Notificaciones — GermIA" };
export const dynamic = "force-dynamic";

const ESTILO_TIPO: Record<NotificacionCampesino["tipo"], { icon: typeof Bell; bg: string; color: string }> = {
  "precio-subio": { icon: TrendingUp, bg: "var(--color-positive-bg)", color: "var(--color-positive)" },
  "precio-bajo": { icon: TrendingDown, bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
  recordatorio: { icon: Camera, bg: "var(--color-brand-bg)", color: "#2F6E52" },
};

export default async function NotificacionesCampesinoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const notificaciones = await getNotificacionesCampesino(session.user.id);

  return (
    <div className="px-4 pt-4 pb-8">
      <h1 className="text-[18px] font-bold text-[var(--text-primary)] mb-6">Notificaciones</h1>

      {notificaciones.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-[13px] text-[var(--text-muted)]">
            Por ahora no tienes notificaciones. Cuando haya novedades sobre tu cultivo, las vas a ver aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notificaciones.map((n) => {
            const { icon: Icon, bg, color } = ESTILO_TIPO[n.tipo];
            return (
              <Link
                key={n.id}
                href={n.href as Route}
                className="flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--border-subtle)] transition-transform active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-[var(--text-primary)] leading-snug">{n.titulo}</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{n.subtitulo}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAccess, AuthzError } from "@/lib/authz";
import { getExpediente } from "@/lib/data/seguros";
import { RIESGO_LABELS, ESTADO_SINIESTRO_LABELS, TIPO_REGISTRO_LABELS } from "@/types";
import { formatCOPFull } from "@/lib/utils";
import { fmtFecha } from "@/components/seguros/seguros-util";
import { riesgoDesdeAlerta } from "@/lib/seguros";
import { ImprimirBoton } from "@/components/seguros/ImprimirBoton";

export const metadata = { title: "Expediente de siniestro" };
export const dynamic = "force-dynamic";

function Fila({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-[13px] border-b border-gray-100">
      <div className="w-44 flex-shrink-0 text-gray-500">{k}</div>
      <div className="font-medium text-gray-900">{v ?? "—"}</div>
    </div>
  );
}

function Seccion({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="text-[15px] font-semibold text-gray-900 border-b-2 border-gray-800 pb-1 mb-2">{n}. {titulo}</h2>
      {children}
    </section>
  );
}

export default async function ExpedientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const exp = await getExpediente(id);
  if (!exp) notFound();
  const { siniestro: s, alertas, registros, ventana } = exp;

  try {
    await requireAccess(session, "siniestro", "read", { fincaId: s.fincaId });
  } catch (e) {
    if (e instanceof AuthzError) notFound(); // no revelar que existe
    throw e;
  }

  const p = s.poliza;
  const hoy = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
  const relevantes = alertas.filter((a) => riesgoDesdeAlerta(a.tipo) === s.tipo);
  const otras = alertas.filter((a) => riesgoDesdeAlerta(a.tipo) !== s.tipo);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 shadow-sm print:shadow-none print:p-0">
        <div className="flex items-start justify-between gap-4 mb-6 print:mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">GermIA · Expediente de siniestro</div>
            <h1 className="text-[22px] font-bold text-gray-900 leading-tight">{RIESGO_LABELS[s.tipo]} — {s.cultivo.especie} {s.cultivo.variedad}</h1>
            <div className="text-[12px] text-gray-500">Generado el {hoy} · Referencia {s.id}</div>
          </div>
          <ImprimirBoton />
        </div>

        <Seccion n={1} titulo="Datos de la finca y el cultivo">
          <Fila k="Organización" v={s.finca.organizacion?.nombre} />
          <Fila k="Finca" v={s.finca.nombre} />
          <Fila k="Ubicación" v={`${s.finca.municipio}, ${s.finca.departamento}`} />
          <Fila k="Altitud" v={s.finca.altitud != null ? `${s.finca.altitud} msnm` : null} />
          <Fila k="Coordenadas de la finca" v={s.finca.lat != null && s.finca.lng != null ? `${s.finca.lat.toFixed(5)}, ${s.finca.lng.toFixed(5)}` : null} />
          <Fila k="Lote" v={`${s.cultivo.lote.nombre} (${s.cultivo.lote.areaHa} ha)`} />
          <Fila k="Cultivo" v={`${s.cultivo.especie} ${s.cultivo.variedad}`} />
          <Fila k="Fecha de siembra" v={s.cultivo.fechaSiembra ? fmtFecha(s.cultivo.fechaSiembra) : null} />
          <Fila k="Plantas" v={s.cultivo.cantidadPlantas} />
        </Seccion>

        <Seccion n={2} titulo="Póliza">
          {p ? (
            <>
              <Fila k="Aseguradora" v={p.aseguradora} />
              <Fila k="Número de póliza" v={p.numeroPoliza} />
              <Fila k="Riesgos cubiertos" v={p.riesgos.map((r) => RIESGO_LABELS[r]).join(", ")} />
              <Fila k="Vigencia" v={`${fmtFecha(p.fechaInicio)} → ${fmtFecha(p.fechaFin)}`} />
              <Fila k="Suma asegurada" v={p.sumaAsegurada != null ? formatCOPFull(p.sumaAsegurada) : null} />
              <Fila k="Deducible" v={p.deduciblePct != null ? `${p.deduciblePct}%` : null} />
              <Fila k="Contacto para reclamos" v={p.contacto} />
            </>
          ) : (
            <p className="text-[13px] text-gray-600">Este siniestro se registró sin póliza asociada (solo como evidencia).</p>
          )}
        </Seccion>

        <Seccion n={3} titulo="Descripción del evento">
          <Fila k="Tipo de evento" v={RIESGO_LABELS[s.tipo]} />
          <Fila k="Fecha del evento" v={fmtFecha(s.fechaEvento)} />
          <Fila k="Registrado en GermIA" v={s.createdAt.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" })} />
          <Fila k="Área afectada" v={s.areaAfectadaHa != null ? `${s.areaAfectadaHa} ha` : null} />
          <Fila k="Daño estimado" v={s.porcentajeDanio != null ? `${s.porcentajeDanio}%` : null} />
          <Fila k="Pérdida estimada" v={s.perdidaEstimada != null ? formatCOPFull(s.perdidaEstimada) : null} />
          <p className="mt-2 text-[13px] text-gray-800 whitespace-pre-wrap">{s.descripcion}</p>
          {s.notas && <p className="mt-1 text-[12px] text-gray-500 whitespace-pre-wrap">Notas: {s.notas}</p>}
        </Seccion>

        <Seccion n={4} titulo="Evidencia climática (alertas de GermIA)">
          <p className="text-[12px] text-gray-500 mb-2">
            Alertas generadas por GermIA para esta finca entre el {fmtFecha(ventana.desde)} y el {fmtFecha(ventana.hasta)} (±7 días del evento).
            Son <b>pronósticos</b> basados en OpenWeather, no mediciones de una estación oficial: si la aseguradora exige certificación (por ejemplo IDEAM), solicítala aparte.
          </p>
          {alertas.length === 0 ? (
            <p className="text-[13px] text-gray-600">GermIA no emitió alertas para esta finca en ese período.</p>
          ) : (
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-300">
                  <th className="py-1 pr-2 font-medium">Fecha</th><th className="pr-2 font-medium">Alerta</th><th className="pr-2 font-medium">Severidad</th><th className="font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {[...relevantes, ...otras].map((a) => (
                  <tr key={a.id} className={`border-b border-gray-100 align-top ${relevantes.includes(a) ? "font-medium" : "text-gray-500"}`}>
                    <td className="py-1 pr-2 whitespace-nowrap">{fmtFecha(a.fechaInicio)}</td>
                    <td className="pr-2">{a.titulo}</td>
                    <td className="pr-2">{a.severidad}</td>
                    <td>{a.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Seccion>

        <Seccion n={5} titulo="Manejo del cultivo (registros del cuaderno de campo)">
          {registros.length === 0 ? (
            <p className="text-[13px] text-gray-600">Sin registros de actividad en los 30 días previos al evento.</p>
          ) : (
            <ul className="text-[12px] space-y-1">
              {registros.map((r) => (
                <li key={r.id}><span className="text-gray-500">{fmtFecha(r.fecha)}</span> · <b>{TIPO_REGISTRO_LABELS[r.tipo]}</b> — {r.descripcion}</li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion n={6} titulo="Fotografías">
          {s.imagenes.length === 0 ? (
            <p className="text-[13px] text-gray-600">No se adjuntaron fotos.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {s.imagenes.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`Foto ${i + 1} del daño`} className="w-full aspect-[4/3] object-cover border border-gray-200" />
              ))}
            </div>
          )}
        </Seccion>

        <Seccion n={7} titulo="Estado del reclamo">
          <Fila k="Estado" v={ESTADO_SINIESTRO_LABELS[s.estado]} />
          <Fila k="Número de reclamo" v={s.numeroReclamo} />
          <Fila k="Reportado a la aseguradora" v={s.fechaReporteAseguradora ? fmtFecha(s.fechaReporteAseguradora) : null} />
          <Fila k="Monto indemnizado" v={s.montoIndemnizado != null ? formatCOPFull(s.montoIndemnizado) : null} />
        </Seccion>

        <p className="text-[10px] text-gray-400 border-t border-gray-200 pt-2 mt-8">
          Documento generado por GermIA con la información registrada por el productor. No constituye peritaje ni certificación; la decisión sobre el reclamo corresponde a la aseguradora.
        </p>
      </div>
    </div>
  );
}

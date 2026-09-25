/**
 * Etiquetas legibles de `AuditLog.accion` — compartidas entre el panel de
 * Super Admin (`/dashboard/admin/auditoria`, global) y la pestaña
 * "Auditoría" de Equipo (ADR-011 Sprint 5, por organización). Antes vivía
 * solo en el panel de Super Admin, y le faltaban las acciones agregadas en
 * los Sprints 3 y 5 de ADR-011 (rendían el string crudo, ej. "organizacion.editar").
 */
export const ETIQUETAS_ACCION: Record<string, string> = {
  "auth.cuenta_bloqueada": "🔒 Cuenta bloqueada (fuerza bruta)",
  "cuenta.eliminar": "🗑️ Cuenta eliminada",
  "cuenta.solicitar_eliminacion": "📩 Solicitud de eliminación",
  "cuenta.exportar": "⬇️ Datos exportados",
  "equipo.invitar": "➕ Colaborador agregado",
  "equipo.editar": "✏️ Colaborador editado",
  "equipo.remover": "➖ Colaborador removido",
  "equipo.editar_plantilla_rol": "🛠️ Plantilla de rol editada",
  "equipo.invitacion_enviada": "✉️ Invitación enviada",
  "equipo.invitacion_aceptada": "✅ Invitación aceptada",
  "campesino.crear_cuenta": "📱 Cuenta Campesino creada",
  "campesino.eliminar_cuenta": "📱 Cuenta Campesino eliminada",
  "campesino.generar_codigo": "🔑 Código de acceso generado (Campesino)",
  "campesino.vincular_dispositivo": "📲 Celular vinculado (Campesino)",
  "campesino.revocar_dispositivos": "🚫 Dispositivos quitados (Campesino)",
  "organizacion.editar_admin": "✏️ Organización editada (Super Admin)",
  "organizacion.suspender": "⏸️ Organización suspendida",
  "organizacion.reactivar": "▶️ Organización reactivada",
  "organizacion.eliminar": "🗑️ Organización eliminada",
  "organizacion.restaurar": "♻️ Organización restaurada",
  "finca.eliminar": "🗑️ Finca eliminada",
  "lote.eliminar": "🗑️ Lote eliminado",
  "cultivo.eliminar": "🗑️ Cultivo eliminado",
  "gasto.eliminar": "🗑️ Gasto eliminado",
  "ingreso.eliminar": "🗑️ Ingreso eliminado",
  "comprador.eliminar": "🗑️ Comprador eliminado",
  "organizacion.crear": "🏢 Organización creada",
  "organizacion.extender_trial": "⏳ Prueba extendida (Super Admin)",
  "organizacion.activar_plan": "✅ Plan Colectivo activado (Super Admin)",
  "organizacion.editar": "🏢 Organización editada",
  "mfa.activar": "🔐 Verificación en dos pasos activada",
  "mfa.desactivar": "🔓 Verificación en dos pasos desactivada",
  "mfa.regenerar_codigos": "🔁 Códigos de respaldo regenerados",
  "sesion.revocar_otras": "🚪 Todas las demás sesiones cerradas",
  "sesion.revocar": "🚪 Sesión cerrada desde otro dispositivo",
};

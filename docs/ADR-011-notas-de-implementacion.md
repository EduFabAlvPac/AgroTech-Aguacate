# ADR-011 — Notas de implementación

> Complementa [`ADR-011-Modelo-Identidad-Roles-Permisos.md`](ADR-011-Modelo-Identidad-Roles-Permisos.md) (estado: **PROPUESTO**). Registra cómo se fusionó el schema IAM con el existente, en qué se apartó del documento y por qué, y qué queda por sprint. No reemplaza al ADR: si algo aquí lo contradice, es una desviación deliberada y está justificada abajo.

## 1. Qué se entregó (y qué no)

| Entregado | No entregado (a propósito) |
|---|---|
| `prisma/schema.prisma` **único** con el IAM integrado, 100 % aditivo | — |
| `src/lib/authz/permissions.ts` + `policies.ts` (matriz §4 + evaluador puro) con 41 tests | — |
| `prisma/sql/2026-09-adr011-iam-aditivo.sql` para producción (PR #50) | — |
| **Sprint 1**: `Sesion` (lista de revocación sobre JWT), `TokenAuth` con hash reemplazando los tokens en texto plano, `prisma/backfill-iam.ts` idempotente | — |
| **Sprint 2**: `requireAccess()` decide con `can()`/`MATRIZ` extendida (55 call sites sin tocar), `usePermission()` cliente, tests de aislamiento cross-tenant | `middleware.ts` (omitido a propósito, ver §5ter) · activar INVESTOR/BUYER de punta a punta (`CLAUDE.md §7`) |
| **Sprint 3 (acotado — "lo útil ya")**: pestaña Organización en Configuración (editar nombre/NIT/contacto) · invitaciones por correo (modelo `Invitacion`, sin uso desde el PR #50, ahora conectado) con correos de confirmación al aceptar (a la persona y al dueño) · botón "Avisarle por WhatsApp" en cuentas Campesino (puente `wa.me`, no es el Magic Link real) | Migración del `@@unique` de `Membresia` · registro de organizaciones Colectivo/Cooperativa · selector de contexto multi-organización · unificación de `FincaAcceso` — ver §5quater |
| **Sprint 5**: `AuditLog` con encadenamiento hash SHA-256 por organización (transacción serializable + reintento ante conflicto) · `organizacionId`/`recurso`/`recursoId` poblados en las 14 llamadas reales que ya tenían ese dato en scope · panel "Auditoría" para el dueño (Equipo) + exportar CSV (últimos 30 días) · panel de Super Admin con las etiquetas completas — ver §5quinquies | Alertas automáticas por patrones sospechosos (A.8.16 del ADR) · reconstruir el índice `[actorId]` → `[actorId, createdAt]` (se difiere hasta que haya volumen real) |

Consecuencia: **el login/sesión (Sprint 1), la decisión de autorización (Sprint 2), una primera capa de gestión de organización/invitaciones (Sprint 3 acotado) el rastro de auditoría verificable (Sprint 5) y el MFA por TOTP (Sprint 6, sin trial — ver §5sexies) ya corren sobre el modelo nuevo**, pero el comportamiento visible para el usuario sigue siendo idéntico al anterior donde no se tocó nada — mismo flujo, mismas pantallas para quien no usa las funciones nuevas, mismos permisos reales (verificado por un test de equivalencia contra la matriz vieja, ver §5ter). Lo que falta para que el ADR-011 esté "vivo" de punta a punta: el resto del Sprint 3 (multi-membresía real, Colectivo), Magic Link (Sprint 4, bloqueado por cuenta de Meta + firma del fundador), MFA (Sprint 6), impersonación (Sprint 7).

## 2. Estrategia de fusión: evolucionar, no reemplazar

`schema-iam.prisma` no se podía concatenar: `User` y `AuditLog` ya existían con otra forma, y el ADR nombra las entidades en inglés (`Organization`, `Membership`, `Farm`) mientras el código usa `Organizacion`, `Membresia`, `Finca`. Un reemplazo por los nombres del ADR tocaba ~150 líneas en ~40 archivos y exigía una migración destructiva sobre Neon. Se optó por **conservar los nombres actuales y extenderlos** — el criterio que ya fija `CLAUDE.md §6` ("extender lo existente sobre reescribir").

El original quedó archivado en [`docs/anexos/ADR-011-schema-iam.original.prisma`](anexos/ADR-011-schema-iam.original.prisma).

### Equivalencias ADR → schema actual

| ADR | Schema actual | Nota |
|---|---|---|
| `User.passwordHash` | `User.password` | ya existía |
| `User.nombreCompleto` | `User.name` | ya existía |
| `User.fotoUrl` | `User.avatarUrl` | ya existía |
| `User.celular` (E.164) | `User.telefono` | ya existía y ya es único; hoy guarda solo dígitos. La normalización a E.164 llega con el Magic Link (Sprint 4). **No se creó una 2ª columna de teléfono.** |
| `User.emailVerificadoEn` | `User.emailVerificado` | Tanda 2 |
| `User.celularVerificadoEn` | `User.telefonoVerificadoEn` | **nuevo** |
| `User.bloqueadoHasta` / `intentosFallidos` | `lockedUntil` / `failedLoginAttempts` | ya existían |
| `User.consentimientoDatosEn` | `User.terminosAceptadosEn` | Tanda 2; se suma `consentimientoVersion` |
| `User.perfilUI` (CAMPESINO/TECNIFICADO/AUTO) | `User.experiencia` + `User.vistaPreferida` | ver §3.1 |
| `User.eliminadoEn` | **nuevo**, junto a `eliminacionSolicitadaEn` | solicitud ≠ baja efectuada |
| `Organization` | `Organizacion` | + `tipo`, `nit`, plan/trial/límites, branding, `eliminadoEn` |
| `PlanTipo` | `PlanOrganizacion` (extendido) | un solo enum; los 4 valores originales se conservan |
| `Membership` | `Membresia` | + `fincaId`, `estado`, `esRolPrimario`, `rolesIam`, campos de revocación |
| `Rol` | enum `Rol` **nuevo** + `Membresia.rolesIam` | el viejo `RolOrganizacion` sigue mandando hasta el cutover; ver corrección de diseño en §5bis |
| `AuditLog` | `AuditLog` (extendido) | los 29 call sites de `registrarAuditoria()` no cambian |
| `Sesion`, `TokenAuth`, `Invitacion`, `Facturacion`, `Impersonacion` | **nuevas** | con los ajustes de §3 |
| — (no está en el ADR) | `FincaAcceso`, `RolModulosDefault` | se conservan; gating de módulos de UI, se unifican en el Sprint 3 |

## 3. Desviaciones deliberadas del schema del ADR

1. **Sin `perfilUI`.** El código ya distingue tres experiencias: `experiencia` (asignada por un admin: ESTANDAR/CAMPESINO, decide si el usuario vive en `/campesino`) y `vistaPreferida` (elegida por el usuario: SIMPLE/COMPLETA/AUTO, dentro de `/dashboard`). Un `perfilUI` de 3 valores perdería la vista Simple y sería un tercer campo solapado.
2. **Sin `Membership.cultivosScope`.** Duplicaría `InversionCultivo`, que ya es la fuente de verdad de qué cultivos financia cada inversionista, y podría divergir. En su lugar: `Inversionista.cuentaUserId` (el login del inversionista; el modelo ya lo anticipaba en un comentario). Hoy `Inversionista.userId` es el **dueño que lo registró**, no el inversionista — por eso no se puede reusar.
3. **Sin `MetodoAuth.BUYER_TOKEN` ni `TipoToken.BUYER_SHARE_LINK`.** Un comprador no tiene `User`; el ADR le daba `TokenAuth.userId` obligatorio (contradictorio). `EnlaceCompartido` + `/portal/[token]` ya lo resuelven. Se agregó `MetodoAuth.GOOGLE` (el login con Google ya existe y el ADR no lo contemplaba).
4. **`TokenAuth.tokenHash` es `@unique`** (el ADR traía solo `@@index`): la consulta natural es por hash.
5. **`Invitacion.invitadaPor` e `Impersonacion.soporte/target` con `onDelete: Cascade`** (el ADR no lo definía → Postgres usa Restrict). Con Restrict, borrar a alguien que alguna vez invitó o fue impersonado quedaría bloqueado por la FK — incluido el derecho al olvido (Ley 1581). El rastro real vive en `AuditLog`, que no tiene FK y sobrevive.
6. **`AuditLog` gana `soporteUserId`, `targetUserId`, `esImpersonacion`** que el ADR exige en §6.5 pero su schema no traía. No se agregó FK a `User` (ya estaba documentado: el log debe sobrevivir a la baja de la cuenta). Se conservó el índice `[actorId]` en vez de reemplazarlo por `[actorId, createdAt]` para no generar un `DROP INDEX`.
7. **`Organizacion.planIniciadoEn` y `planVigenteHasta` son opcionales** (el ADR los pedía obligatorios): las organizaciones existentes no tienen fecha de plan. `estadoPlan` arranca en `ACTIVA` (no `EN_TRIAL`) por la misma razón.
8. **Sin índices redundantes** (`@@index([email])`, `[celular]`, `[slug]`): ya los cubre `@unique`. Typo corregido: `ciclosFacturacion` → `cicloFacturacion`. `EstadoMembership` → `EstadoMembresia` (mismo idioma que el modelo).

## 4. Diferido a propósito

**El `@@unique([userId, organizacionId, rol, farmId])` del ADR no se aplicó; `Membresia` conserva `@@unique([userId, organizacionId])`.** El código usa ese unique como llave compuesta `userId_organizacionId` (`authz.ts` y ~12 archivos más); cambiarlo obligaba a tocar el login/RBAC. Se hace en el **Sprint 3**, y con una precaución que el ADR no menciona: con `farmId` **NULL**, ese unique **no evita duplicados** (en Postgres `NULL ≠ NULL`), así que dos filas `ORG_OWNER` idénticas serían válidas. Usar una **columna centinela** (`fincaKey String @default("")`) en lugar de un índice parcial con SQL crudo, que `prisma db push` podría eliminar.

## 5. Hallazgos de la revisión del ADR

Ordenados por impacto. Los marcados ⚠️ cambian cómo hay que construir algo.

1. ⚠️ **`Sesion` en BD + NextAuth v4 Credentials no es viable como está escrito.** En `next-auth/core/routes/callback.js` el provider Credentials **siempre** emite un JWT; NextAuth define incluso un error `UnsupportedStrategy` (`CALLBACK_CREDENTIALS_JWT_ERROR`) para credentials + estrategia `database`. La tabla `Sesion` debe funcionar como **lista de revocación**: el JWT lleva un `sesionId`, y en cada request se valida que la fila exista, no esté revocada ni vencida. (El ADR §10 Sprint 1 dice "refactor NextAuth Credentials con adaptador Prisma".)
2. ⚠️ **Matriz §4 incompleta:** falta la columna `PLATFORM_SUPPORT` (es el 9.º rol), el `*` no se define en ningún lado, e "Impersonar usuario" figura solo para SUPER_ADMIN mientras §6.5 lo inicia PLATFORM_SUPPORT. Además §2.2 dice "lectura" pero §7 (A.8.2) dice "sin acceso persistente". Se adoptó la lectura más restrictiva (ver `permissions.ts`, "INTERPRETACIONES") — **confirmar al firmar**.
3. ⚠️ **Migrar roles no es 1:1.** `OWNER` actual ≠ `ORG_OWNER`: el ADR le da solo *lectura* de "Actividad de campo", así que un dueño de org individual perdería la capacidad de registrar actividades. Regla adoptada (`rolLegacyARolIam`): en org `INDIVIDUAL`, `OWNER → ORG_OWNER + FARM_OWNER`. `ADMIN_FINCA → FARM_ADMIN` (no `ORG_ADMIN`: está atado a fincas concretas vía `FincaAcceso`).
4. **Hash-chain de `AuditLog` con concurrencia.** Con escrituras simultáneas (serverless) una cadena global se rompe (dos escritores leen el mismo `hashPrevio`). Cadena **por organización** + transacción serializable (Sprint 5).
5. ✅ **Tokens en texto plano hoy.** `User.tokenVerificacion` y `tokenResetPassword` (Tanda 2) se guardaban sin hash; el ADR pide SHA-256. **Resuelto en el Sprint 1**: los 5 archivos que los leían/escribían (`registro`, `recuperar`, `restablecer`, `reenviar-verificacion`, `verificar/[token]` — ruta y página) pasaron a `TokenAuth` con `tokenHash` (SHA-256 vía `hashToken()`, `src/lib/tokens.ts`). Las columnas viejas de `User` no se borraron (mismo criterio de nunca-`DROP`), quedan sin uso.
6. **MFA obligatorio para `ORG_OWNER`** afecta a los dueños actuales de producción → enrolamiento con periodo de gracia. El "cifrado a nivel de aplicación" de `documentoIdentidad` y `mfaSecret` no define gestión de llaves (`ENCRYPTION_KEY`, rotación).
7. **Cron de §8.1 "cada 6 horas":** Vercel **Hobby** solo permite una ejecución diaria. O se acepta diario, o se necesita plan Pro.
8. **§7.1 (Ley 1581) — verificar con abogado, no lo doy por cierto:** el ADR dice que el registro ante la SIC es obligatorio al superar 100.000 *titulares*. Mi entendimiento (Decreto 090 de 2018) es que el umbral del RNBD es por **activos totales (100.000 UVT)**, no por número de titulares. Si es así, la alerta de "80.000 titulares" mide otra cosa.
9. ✅ **Migración de datos existentes:** `metodoAuthPreferido` quedaba en `EMAIL_PASSWORD` para todos hasta correr el backfill. Resuelto — `prisma/backfill-iam.ts` (Sprint 1) lo recalcula para cuentas existentes; sigue sin ser leído por ninguna ruta todavía (Sprint 2+).
10. Menores: los enums de §5.2 están truncados en el .docx (manda el `.prisma`); `Facturacion` se solapa con ADR-012 (pendiente); `propietarioTemp` de §6.2 no existe ni hace falta (`Invitacion.fincaId`); §6.2 y §5.3 usan `Farm`/`Organization` donde el código dice `Finca`/`Organizacion`.

## 5bis. Corrección de diseño detectada al construir el Sprint 1: `rolIam` → `rolesIam`

El PR #50 dejó `Membresia.rolIam: Rol?` (singular). Al conectar `rolLegacyARolIam()` (hallazgo 3 de §5) para el backfill, resultó que esa función devuelve **un arreglo**, no un solo valor: en una organización `INDIVIDUAL`, un `OWNER` es a la vez `ORG_OWNER` y `FARM_OWNER` en el modelo nuevo — son dos roles simultáneos que hoy no se pueden modelar como dos filas de `Membresia` (el `@@unique([userId, organizacionId])` actual lo impide hasta el Sprint 3, ver §4).

Se agregó `Membresia.rolesIam Rol[] @default([])` (columna nueva, aditiva) y `rolIam` quedó **sin usar**, documentado en el propio schema. Mismo criterio que los 4 valores viejos de `PlanOrganizacion`: nunca se hace `DROP` de una columna que ya se envió, aunque el error se detecte al día siguiente. El backfill (`prisma/backfill-iam.ts`) llena `rolesIam`, no `rolIam`.

## 5ter. Sprint 2 — extensión de `MATRIZ`, `requireAccess()` sobre `can()`, y por qué no hay `middleware.ts`

**Auditoría previa** (dos agentes de exploración, antes de tocar código): las ~19 rutas de API que NO llaman a `requireAccess()` (equipo, inversionistas, cuenta, fincas/activa, reportes/finagro, chat/weather/campesino) ya estaban todas bien scoped por otro mecanismo (`membresiaOwner()`, cadenas de ownership Prisma, `fincaIdsAccesibles()`/`resolverFincaActiva()`, o no son recursos tenant-scoped) — no había un gap urgente que forzar en este sprint. El flujo Comprador vía `EnlaceCompartido`/`/portal/[token]` también resultó seguro y ya corresponde 1:1 con la condición `via_enlace_compartido` del catálogo — su enforcement real sigue viviendo ahí, no se movió a `requireAccess`.

**Extensión de `MATRIZ` (`src/lib/authz/permissions.ts`), no mapeo forzado.** La matriz §4 del ADR (15 recursos) no cubre 11 recursos que `src/lib/authz.ts` ya usaba en producción (`registroCultivo`, `membresia`, `analisisSuelo`, `gasto`, `ingreso`, `presupuesto`, `jornal`, `alerta`, `comprador`, `fichaTecnica`, `enlaceCompartido`). Probar un mapeo "limpio" hacia las categorías del ADR (ej. `gasto`/`ingreso` → `finanzasEditar`) reveló una regresión real: `finanzasEditar` es `NADA` para `FARM_COLLABORATOR` en el ADR, pero hoy `COLABORADOR` sí puede crear/leer `gasto`/`ingreso` — mapear así le habría quitado esa capacidad a colaboradores reales el día del deploy. Se optó por **agregar esos 11 recursos como filas propias de `MATRIZ`**, portadas 1:1 desde `MATRIZ_ORGANIZACION` (que se conserva exportada, sin usar en tiempo de ejecución, exclusivamente como referencia — mismo criterio de nunca-borrar).

**Verificación de no-regresión, no solo revisión manual.** `src/__tests__/lib/authz-equivalencia-legacy.test.ts` recorre EXHAUSTIVAMENTE (no muestreado con `fast-check`: el dominio es chico y finito, un recorrido completo es más preciso) cada combinación `(rol legacy, recurso, acción)` de `MATRIZ_ORGANIZACION` y prueba que `can()` la sigue permitiendo. Encontró y dejó documentadas 3 diferencias reales, todas revisadas y sin call site que las ejerza hoy (`grep -rn 'requireAccess([a-zA-Z]*, "<recurso>"' src/app/`):
- `ADMIN_FINCA × organizacion:read` y `INVERSIONISTA × fichaTecnica:read`: la matriz nueva es MÁS restrictiva (se dejaron así a propósito — ver comentarios en el test y en `permissions.ts`, ninguna ruta las usa).
- `COLABORADOR × cultivo:create`: la matriz nueva es MÁS permisiva (ya lo era desde el PR #50, el ADR le da `create` a `FARM_COLLABORATOR` sobre `cultivo` — no se restringió para igualar a la matriz vieja, es una decisión ya transcrita del documento del ADR, no un invento de este sprint).

**`requireAccess()` — refactor interno, firma y 55 call sites sin tocar.** OWNER sigue resolviéndose con bypass total ANTES de llegar a `can()` (sin cambios) — no por desconfianza en la matriz nueva, sino porque OWNER es el único rol legacy que se traduce a DOS roles IAM (`rolLegacyARolIam` → `[ORG_OWNER, FARM_OWNER]` en una org individual) y ese caso nunca se ejercita en esta función. Para ADMIN_FINCA/COLABORADOR/INVERSIONISTA/COMPRADOR, `rolesIam`/`estado` se recalculan en cada llamada con `rolLegacyARolIam()` sobre `rol`/`aceptada`/`activa` — **no se leen las columnas "sombra" `rolesIam`/`estado` de `Membresia`**, porque Equipo (`editarMiembro`/`toggleActivaMiembro`) todavía no las mantiene sincronizadas al cambiar rol o inactivar a alguien (son escritas una sola vez por el backfill del Sprint 1, después quedan viejas); `rol`/`aceptada`/`activa` sí son la fuente de verdad hoy, como ya documenta el propio schema. El chequeo de `FincaAcceso`/`MATRIZ_FINCA` sigue exactamente igual, después de `can()`.

`Membresia.fincaId` tampoco se puebla todavía (Sprint 3) — para los roles FARM_*, se usa el `fincaId` del `ctx` de la llamada como scope de esa membresía; el límite real entre fincas de una misma organización lo sigue imponiendo `FincaAcceso`, sin cambios (ni más ni menos de lo que ya hacía `MATRIZ_ORGANIZACION`, que tampoco distinguía fincas a este nivel).

**`middleware.ts`: omitido a propósito, no un olvido.** El ADR (§10, Sprint 2) lo pide, pero el propio código ya tiene una decisión explícita anterior en contra, documentada en `src/app/(dashboard)/layout.tsx`: *"Alternativa evaluada y descartada (agregar middleware.ts...) — más robusta pero más pieza de infraestructura nueva de la que el usuario prefirió prescindir."* Las páginas ya se protegen en cada `layout.tsx` (con sesión y BD completas ahí) y las rutas de API ya se protegen con `requireAccess()`/chequeos ad hoc — middleware de Next.js corre en Edge sin la sesión completa, y agregarlo forzaría una consulta extra por request sin reemplazar el enforcement fino que ya vive server-side.

**`usePermission()` (`src/lib/authz/use-permission.ts`, nuevo)**: hook de cliente que evalúa `can()` contra un array compacto de membresías IAM que `resolverClaimsSesion()` (`src/lib/auth.ts`) embebe en el JWT al loguearse (mismo lugar que ya arma `esOwner`/`modulosPermitidos`) — sin ida y vuelta al servidor. Es UX (ocultar botones), nunca la autorización real: la API sigue decidiendo con `requireAccess()` en cada request. Ningún componente existente lo usa todavía — no hay hoy ningún condicional de rol en la UI que migrar (confirmado por auditoría); queda listo para la próxima función que lo necesite.

## 5quater. Sprint 3 — alcance acotado ("lo útil ya") y lo que se dejó fuera a propósito

El Sprint 3 del roadmap del ADR es en realidad **5 piezas bastante independientes**: migración del `@@unique` de `Membresia`, UI para editar la `Organizacion`, registro de cooperativas (plan Colectivo), invitaciones reales, y un selector de contexto para membresía múltiple. Dos agentes de exploración (antes de tocar código) confirmaron que **ninguna de las 5 existía** y que la migración del unique es más chica de lo que decía este mismo documento (**4 referencias reales a `userId_organizacionId`**, no ~13: 1 bloqueo real en `requireAccess()`, 2 chequeos de duplicado triviales de reescribir, 1 test). El usuario eligió explícitamente construir solo lo que sirve **ya**, con una sola organización — sin tocar el `@@unique` de `Membresia` ni construir cooperativas/selector de contexto, que esperan a que haya un cliente cooperativo real y a que WhatsApp (Sprint 4) esté listo.

**Entregado** (dos PRs independientes, sin cambios de schema — `Organizacion` e `Invitacion` ya tenían todos los campos necesarios desde el PR #50):
- Pestaña "Organización" en Configuración (nombre, NIT, ciudad, departamento, contacto) — primer lugar de la app donde se edita la `Organizacion` después del registro. Solo el OWNER la ve (`membresiaOwner()`, mismo patrón que Equipo — no pasa por `requireAccess()` porque el OWNER siempre la bypassa).
- Invitaciones por correo (`Invitacion`, modelo del PR #50, **cero referencias en el código hasta este sprint**) — alternativa nueva (no obligatoria) al flujo de "crear cuenta con contraseña temporal y compartirla por WhatsApp". Mismo patrón de token con hash que `TokenAuth` del Sprint 1.
  - **Hallazgo de diseño corregido antes de construir**: el enum IAM (`Rol`) no distingue OPERARIO de LECTURA (ambos son `FARM_COLLABORATOR`) — guardar solo esa columna en `Invitacion.rol` y reconstruir el rol de finca al aceptar habría arriesgado que alguien invitado como "solo lectura" terminara con permisos de escritura. Se acotó `invitarMiembroSchema` a 2 roles (Administrador/Colaborador, sin "Solo lectura") — el dueño puede ajustar a "Solo lectura" después desde "Editar".

**Ajustes tras QA real del usuario en producción** (no bugs — huecos de experiencia encontrados al probar de verdad, no en los tests):
- **Correos de confirmación al aceptar una invitación** — ni la persona ni el dueño recibían ninguna confirmación. Se agregaron dos correos (`enviarEmailInvitacionAceptada`/`enviarEmailInvitacionAceptadaAlDueno`, `src/lib/email.ts`) que cierran el círculo **sin** mandar contraseñas por correo — eso sería la práctica insegura que la invitación por enlace ya evita. La persona invitada ya sabe su contraseña porque la escribió ella misma.
- **Botón "Avisarle por WhatsApp" en cuentas Campesino** — al crear una cuenta Campesino (nombre + celular, sin contraseña, sin invitación por correo posible porque no tiene email real) no había forma de notificarle nada. Se agregó un enlace `wa.me` (público, sin cuenta de Meta Business ni plantillas aprobadas — no es el WhatsApp Business API del Sprint 4) que abre el WhatsApp del dueño con el mensaje ya redactado, listo para mandar con un toque. Es un puente deliberadamente simple, no un Magic Link automático — cuando el Sprint 4 esté listo, este botón se puede retirar.

**Diferido, sin construir todavía** (candidatos para cuando haya una necesidad real, no antes):
- Migración del `@@unique([userId, organizacionId])` de `Membresia` — sin un consumidor real hoy (cooperativas/Sprint 4), tocar el corazón del login/RBAC no se justifica.
- Registro de organizaciones Colectivo/Cooperativa (trial, límite de asociados).
- Selector de contexto para membresía múltiple.
- Unificación de `FincaAcceso` dentro de `Membresia`.

## 5quinquies. Sprint 5 — hash-chain, y por qué se rescató antes de construir el panel

El schema ya traía todas las columnas para esto desde el PR #50 (`AuditLog.hashPrevio`/`hashActual`, `organizacionId`, `recurso`/`recursoId`, `resultado`, `ipAddress`, `userAgent`), con el diseño de concurrencia ya decidido en su propio comentario: *"una cadena GLOBAL se rompe con escrituras concurrentes (serverless) → una cadena por organizacionId + transacción serializable"*. `registrarAuditoria()` solo escribía `actorId`/`actorEmail`/`accion`/`detalle` — todo lo demás quedaba `null` en las 13 llamadas reales del código. Auditoría previa confirmó además que ya existía un panel parcial (`/dashboard/admin/auditoria`, solo Super Admin, sin scope de organización, sin CSV) — no se construyó desde cero, se completó y se sumó uno scoped para el dueño.

**`registrarAuditoria()` (reescrito, `src/lib/audit.ts`)**: firma nueva con todos los campos de la matriz opcionales — ningún caller se rompe. `ipAddress`/`userAgent` se capturan DENTRO de la función con `headers()` de `"next/headers"` (funciona igual en Route Handlers y Server Actions), así que ningún caller cambia por eso. Hash-chain solo cuando hay `organizacionId` — los eventos de una cuenta sin organización (`cuenta.eliminar`, `cuenta.exportar`, `auth.cuenta_bloqueada`) quedan sin encadenar, mismo estado que ya toleran los registros previos a este sprint. Reintento acotado (3 veces) ante conflicto de serialización de Postgres (Prisma `P2034`); si se agotan, escribe igual sin encadenar en vez de perder el evento — nunca lanza, mismo contrato de siempre.

**Hallazgo real de QA en local, no en los tests (los tests usan objetos en memoria, nunca tocan Postgres):** `jsonb` de Postgres **no conserva el orden de inserción de las claves de un objeto** — las reordena al guardar. Hashear con `JSON.stringify` normal hacía que el hash calculado al escribir una fila nunca volviera a coincidir al verificarla (sobre el mismo objeto releído de la BD, con las claves reordenadas) — `verificarCadena()` reportaba manipulación en filas intactas. Se corrigió con una serialización canónica (claves ordenadas recursivamente antes de `JSON.stringify`) y se agregaron tests que reproducen el síntoma exacto sin tocar Postgres (`src/__tests__/lib/audit-hash.test.ts`).

**`filasACSV()` — otro hallazgo real, esta vez de TypeScript/Next.js, no de Postgres:** un archivo con la directiva `"use server"` solo puede exportar funciones **async** (cada export se vuelve una Server Action) — la construcción del CSV es una función síncrona pura, así que no podía vivir en `auditoria-actions.ts`; se separó a `src/lib/auditoria-csv.ts`.

**Panel del dueño**: nueva pestaña "Auditoría" en Equipo, gateada por la propia página (`equipo/page.tsx` ya redirige a quien no sea OWNER antes de renderizar nada — no hace falta un chequeo aparte). Últimos 100 eventos en pantalla, CSV de los últimos 30 días completos (sin ese límite) — coincide literal con el entregable del ADR ("ORG_OWNER descarga CSV de accesos últimos 30 días"). El mapa de etiquetas de acción (`ETIQUETAS_ACCION`) se extrajo a `src/lib/auditoria-labels.ts`, compartido entre este panel y el de Super Admin (antes vivía solo ahí, incompleto).

## 5sexies. Sprint 6 — MFA (TOTP), sin trial: por qué se acotó así

**Alcance real vs. el del ADR.** El ADR (§3) pide MFA obligatorio para SUPER_ADMIN, ORG_OWNER e INVESTOR, más expiración de trial. Se entregó MFA completo (activación con QR, códigos de respaldo, verificación en el login) disponible para **cualquier** usuario, con enforcement real (bloqueo del login sin código) solo para quien ya lo activó — nunca obligatorio de entrada para nadie. La expiración de trial quedó **fuera** (ver abajo). Dos recortes deliberados, ambos por la misma razón de fondo que ya aplicó Sprint 3 a Colectivo/Cooperativa: no construir sobre un caso que hoy no existe.

**"Aviso primero, bloqueo después" para Super Admin — decisión explícita del usuario, no un relajamiento silencioso del ADR.** Hoy hay una sola cuenta Super Admin real en producción — la del propio dueño. Bloquear su login de entrada el día del deploy, sin margen de error en el enrolamiento, arriesgaba dejarlo fuera de su propia cuenta sin vía de recuperación distinta a una intervención manual en Neon. Se implementó en su lugar: un banner persistente (`MfaAvisoSuperAdmin.tsx`, en el shell de `(dashboard)/layout.tsx`) que invita a activar MFA mientras `esSuperAdmin && !mfaHabilitado`, sin bloquear nada — y **una vez que el usuario activa MFA voluntariamente, `auth.ts` sí lo exige siempre** en cada login futuro, sin excepción de rol. El bloqueo duro de entrada (nadie Super Admin puede pasar sin haberlo activado primero) queda como una iteración futura, a decidir cuando haya más de una cuenta Super Admin real o se quiera endurecer.

**ORG_OWNER/INVESTOR no obligatorios.** INVESTOR no tiene ningún camino de login real hoy (confirmado en la exploración previa a este sprint — ningún flujo de la app crea o autentica una cuenta con ese rol todavía), así que exigirle MFA sería una regla sin nadie a quien aplicarse. Forzarlo en ORG_OWNER afectaría directamente la cuenta piloto real en producción sin que nada lo esté pidiendo hoy. Ambos roles pueden activar MFA voluntariamente desde la misma pestaña "Seguridad" — la infraestructura ya los cubre, solo no está *forzada*.

**Gap deliberado: el challenge de MFA solo corre en el provider de credenciales (email+contraseña).** El login con Google (`GoogleProvider`) y el de celular sin contraseña (`telefono-campesino`, modo Campesino) NO piden código MFA aunque la cuenta lo tenga activo — ninguna cuenta privilegiada usa esos dos caminos hoy (Google es exclusivo del perfil "Otro rol" para cuentas ya existentes sin autoregistro; Campesino nunca es Super Admin/OWNER). Extender el challenge a esos dos providers es sencillo si algún día hace falta (mismo patrón: revisar `mfaHabilitado` antes de completar `resolverClaimsSesion()`), pero no tiene ningún caso real que lo ejercite todavía.

**Hallazgo de QA real: next-auth serializa `undefined` como el string `"undefined"`.** El primer intento de QA end-to-end (login con MFA activo) reveló que `signIn("credentials", { codigoMfa: undefined, ... })` no omite la clave del body — la manda como el texto literal `"undefined"`, que es *truthy* en JS. Eso saltaba directo al mensaje "código inválido" en el primer submit (antes de que el usuario viera el campo de código), en vez de "ingresa tu código". Nunca lo habría mostrado un test unitario del núcleo de MFA (ese está bien, probado y pasa) — solo apareció al ejercitar el flujo real de `signIn()` del cliente contra `authorize()`. Fix en dos capas: `LoginEstandarForm.tsx` arma el objeto de `signIn()` **sin la clave `codigoMfa`** cuando no aplica (spread condicional, no `codigoMfa: undefined`); `auth.ts` además trata el string literal `"undefined"` igual que ausente, como defensa en profundidad si algún otro caller repitiera el mismo error.

**Cifrado de `mfaSecret`, no hash.** A diferencia de un token de un solo uso, el secreto TOTP hay que poder leerlo de vuelta en cada login (para generar el código esperado y compararlo) — no puede guardarse hasheado como los códigos de respaldo o `TokenAuth`. `src/lib/mfa.ts` usa AES-256-GCM con el `crypto` nativo de Node (mismo módulo que ya usan `audit.ts`/`tokens.ts`), clave en `MFA_ENCRYPTION_KEY` (nueva env var, mismo nivel de criticidad que `NEXTAUTH_SECRET`: perderla o rotarla deja sin poder validar el login de cualquier cuenta que ya tenga MFA activo, sin forma de recuperar el secreto cifrado con la clave vieja).

**`otplib` cambió de API entre mayores — no es la que documenta la mayoría de tutoriales.** La versión instalada (13.x) reescribió la librería: ya no existe el singleton `authenticator` de las versiones 10-12 (`authenticator.generateSecret()`/`.verify()` síncrono) que sigue apareciendo en casi toda la documentación de terceros — la API actual es un set de funciones (`generateSecret`, `generateURI`, `verify`), y `verify` es **async**. Se confirmó leyendo los `.d.ts` instalados en vez de asumir la API vieja, y `verificarCodigoTOTP()`/los tres call sites que la usan (`mfa-actions.ts`, `auth.ts`) son async por esto.

**Gestión de sesiones (segunda mitad del sprint).** Pestaña "Seguridad" → "Sesiones activas": lista las sesiones vivas de la cuenta (dispositivo legible a partir del User-Agent, IP, fecha), marca "Esta sesión", permite cerrar una o "todas las demás". Todo se acota a `session.user.id` (`revocarSesionPorId(id, userId)`: adivinar el id de la sesión de otra persona no sirve, probado). La sesión en curso se identifica con `sesionHash` (SHA-256 del `sid`, nunca el `sid` crudo) que el callback `session()` agrega a la sesión de NextAuth; los tokens anteriores al Sprint 1 (sin `sid`) no muestran "esta sesión" ni permiten "cerrar todas las demás" (mejor no hacer nada que cerrar la propia por error). Limitación conocida y avisada en la UI: cerrar una sesión ajena tarda hasta 5 min en aplicarse en ese dispositivo (`SESION_REVALIDACION_STALENESS_MS`, trade-off del Sprint 1).

**Trial (`Organizacion.esTrial`/`trialFinEn`/etc.) — fuera de alcance, no solo diferido.** No existe hoy ninguna forma de crear una organización en trial: el flujo de registro Colectivo/Cooperativa que la produciría sigue diferido desde el Sprint 3 (§5quater, en el PR #61 aún no mergeado al momento de este sprint). Construir el cron de expiración y su enforcement ahora sería infraestructura sin ningún caso real que la dispare — mismo criterio ya aplicado repetidamente en este ADR. Se retoma junto con (o después de) el registro Colectivo.

## 5septies. Login Campesino seguro — código del dueño + dispositivo de confianza

**Problema.** El login `telefono-campesino` entraba solo con el número de celular; su única defensa era el rate limit (riesgo aceptado y documentado en Sprint 1): cualquiera que supiera un número podía entrar a esa cuenta.

**Solución (decidida con el usuario, sin costo de SMS/WhatsApp Business — Sprint 4 sigue bloqueado por la cuenta de Meta).** El dueño genera desde Equipo un **código de 6 dígitos de un solo uso (24 h)** y se lo pasa por WhatsApp (`wa.me`, ya existente) o llamada. El campesino lo escribe **una vez**; su celular queda como **dispositivo de confianza** (cookie httpOnly `germia_dispositivo`, 180 días deslizantes) y no vuelve a pedir nada. Celular nuevo o "Quitar dispositivos" → otro código.

**Piezas y por qué así:**
- **Cookie propia + tabla `DispositivoConfianza`, no la sesión JWT.** NextAuth no deja fijar cookies desde `authorize()`; el código se canjea en un Route Handler propio (`POST /api/campesino/vincular`) que fija la cookie, y `authorize()` solo la lee. `Sesion` (30 días, lista de revocación) obligaría a re-vincular cada mes.
- **Tablas nuevas (`CodigoVinculacion`, `DispositivoConfianza`) en vez de `TokenAuth`:** su `tokenHash` es `@unique` global y un código de 6 dígitos colisionaría entre usuarios; además evita tocar el enum `TipoToken`. 100 % aditivo (`prisma/sql/2026-09-campesino-vinculacion.sql`, generado con `migrate diff`).
- **Defensa de un código corto = tope de intentos, no el hash:** 5 fallos por código lo invalidan + rate limit `vincularCodigo` por IP+teléfono. Guardado como HMAC-SHA256(`NEXTAUTH_SECRET`, `userId:código`); comparación en tiempo constante; consumo atómico (`updateMany ... usadoEn: null`, `count === 1`).
- **Migración no disruptiva:** `User.requiereVinculacion` (default `false`). Las cuentas Campesino **existentes** siguen entrando por número hasta que el dueño les genere un código (la tarjeta muestra "Sin protección"); las **nuevas** nacen protegidas y al crearlas se genera el primer código de una vez.
- **Respuesta uniforme:** un número desconocido recibe el mismo paso "escribe tu código" que uno real y solo falla al canjear, con un mensaje genérico — el login no revela qué celulares existen (para cuentas que aún no requieren vinculación, sí es distinguible: es el costo de la transición).
- El código nunca se escribe en la auditoría (`campesino.generar_codigo`/`vincular_dispositivo`/`revocar_dispositivos`).

**Limitaciones conocidas:** una cookie = un campesino por celular (vincular a otro en el mismo teléfono sobrescribe); si el dueño no está disponible y el campesino pierde el celular, espera un código nuevo hasta que exista la recuperación autónoma por WhatsApp (Sprint 4).

## 5octies. Colectivo/Cooperativa (1/3) — contexto de organización (multi-organización)

**Hallazgo que acota el trabajo.** `Membresia @@unique([userId, organizacionId])` **ya permite** que una persona esté en dos organizaciones *distintas* (solo prohíbe dos roles en la *misma*), así que **no se toca el índice único** (sigue diferido: nada lo necesita). Lo que faltaba era el *contexto*: unos 47 usos en ~20 archivos elegían "la" organización con `findFirst OWNER` sin `orderBy` (arbitrario con dos). `requireAccess()` y `cuenta-datos.ts` ya autorizaban bien por recurso.

**Diseño (espejo de la "finca activa"):** cookie `germia_org_activa` (httpOnly, 1 año), revalidada contra las membresías en cada lectura; `elegirOrganizacionActiva()` es una función **pura** (cookie válida → esa; si no, la marcada primaria, luego la de OWNER más antigua, luego la más antigua; determinístico, una cookie ajena se ignora). `membresiaOwner()` pasó a leer la cookie internamente → **los ~22 call sites de Equipo/Configuración/Fincas no cambiaron**; con una sola organización se comporta idéntico a antes. `membresiaOwnerSinContexto()` queda para flujos sin sesión (canje del código Campesino). `fincaIdsAccesibles()` restringe a la organización activa **solo con 2+ organizaciones**. `esOwner`/`modulosPermitidos` del JWT son globales y quedan cacheados hasta el próximo login: el layout y las páginas los recalculan **para la organización activa, en el servidor** (`getContextoUsuario`, memoizado por request).

**UI:** `OrganizacionSelector` (sidebar y Perfil en modo simple) **solo aparece con 2+ organizaciones** → cero cambio visual para los usuarios actuales. `POST /api/organizaciones/activa` rechaza (403) una organización de la que la persona no es miembro.

**Asociados por organización:** nueva columna `User.creadoEnOrganizacionId` (nullable; sin FK a propósito) para contar los asociados Campesino por organización (límite del trial). Las cuentas anteriores (null) se atribuyen al dueño que las creó — todos los dueños de entonces tenían una sola organización.

**Limitación conocida (deliberada):** el **Super Admin** sigue viendo *todas* las fincas de todas las organizaciones (`fincaIdsAccesibles` devuelve `"ALL"` antes de aplicar el contexto): es un operador de plataforma, no un miembro. El selector le cambia el contexto de Equipo/Configuración/Organización, no el listado de fincas.

## 5novies. Colectivo/Cooperativa (2/3) — registro, trial de 30 días, límite de asociados y modo lectura

**Registro.** `/registrarse-colectivo` (página propia, como pide el ADR §6.1, para no tocar el registro individual en producción): persona nueva → `POST /api/auth/registro-colectivo` crea `User` + `Organizacion(tipo COOPERATIVA, plan COLECTIVO, estadoPlan EN_TRIAL, esTrial, trialFinEn +30 d, trialMaxAsociados 5)` + `Membresia(OWNER, rolesIam [ORG_OWNER], esRolPrimario)` + `TokenAuth VERIFY_EMAIL`, con auditoría `organizacion.crear`. Persona **con sesión** → la misma página pide solo los datos de la cooperativa y la suma como **segunda organización** (`POST /api/organizaciones/colectivo`; conserva su organización primaria y activa la nueva) — así el selector del PR A se puede probar de punta a punta. NIT normalizado (`900.123.456-7` ≡ `9001234567`) y duplicado → 409 (`nit` es `@unique`).

**El estado del trial se calcula de las fechas, no del cron** (`src/lib/plan.ts`, puro y testeado): `estadoEfectivoOrg` → `ACTIVA | EN_TRIAL | TRIAL_VENCIDO | SUSPENDIDA`. Un día sin cron no deja a nadie escribiendo de más. Las organizaciones existentes (sin trial, `estadoPlan ACTIVA`) **no cambian de comportamiento**. Al activar el plan (`esTrial = false`) el bloqueo se libera aunque `trialFinEn` siga en el pasado.

**Modo lectura.** `requireAccess()` (`src/lib/authz.ts`) rechaza `create/update/delete` de **todos** los roles de la organización, dueño incluido, con un mensaje claro; los GET nunca; Super Admin exento. Los caminos que saltan `requireAccess` (Equipo: agregar/invitar/editar/plantillas, Campesino: crear/generar código, Inversionistas, `vincular-especie`) llaman a `motivoBloqueoEscritura*` (`src/lib/plan-guard.ts`). **Exentas a propósito:** acciones personales (configuración, MFA, sesiones, chat, cuenta) y las que **reducen** acceso (quitar un colaborador/asociado o un dispositivo) — un dueño con la prueba vencida debe poder seguir protegiendo su organización.

**Límite de asociados.** Asociado = cuenta Campesino de la organización (`creadoEnOrganizacionId`, con fallback legacy). El 6º recibe el CTA "Contacta a GermIA para activar el plan Colectivo" (ADR §6.2). Solo aplica con trial (5) o si el plan define `limiteAsociadosPlan`; `null` = sin límite (organizaciones actuales).

**Avisos.** Banner `TrialAviso` (solo con ≤ 7 días o vencido; no se puede cerrar), bloque "Tu plan" en Configuración → Organización (días, asociados `x de 5`) y cron diario `/api/cron/trial-avisos` (`CRON_SECRET`, cabe en Hobby): correo a 7/3/1 días y el día que vence, **idempotente** (`Organizacion.configuracion.trialAvisos`; si el cron se saltó días manda UN correo y marca todos los umbrales cruzados) y marca `SUSPENDIDA_PAGO` al vencer para el Super Admin. Los datos se conservan; la retención de 90 días del ADR §9 **no se automatiza** todavía (sin borrado).

**Supuesto documentado:** los Campesinos de una cooperativa vencida **siguen usando** su app (diagnóstico/consultas son personales); el bloqueo es a la administración de la organización. Se puede endurecer.

## 6. Mapa de sprints → código real

| Sprint | Alcance del ADR | Qué implica en ESTE código | Bloqueos |
|---|---|---|---|
| **S1** ✅ | Login/sesiones | `Sesion` como lista de revocación (JWT + `sid`, revalidado cada 5 min, ver §5.1) · tokens de `User` migrados a `TokenAuth` con hash (`hashToken`) · `Sesion` se revoca en `signOut` y al inactivar/remover a alguien de Equipo (antes, ninguna de las dos cosas le hacía nada a una sesión ya iniciada) · **`prisma/backfill-iam.ts`** idempotente: `estado` ← `aceptada/activa`, `rolesIam` ← `rolLegacyARolIam()` (ver corrección §5bis), `esRolPrimario` ← membresía más antigua, `metodoAuthPreferido` ← `experiencia`/`password`, `Organizacion.planIniciadoEn` ← `createdAt` | — |
| **S2** ✅ | Guards + `usePermission()` | `requireAccess` (`src/lib/authz.ts`) decide con `can()`/`MATRIZ` extendida (ver §5ter), mismos 55 call sites · `usePermission()` cliente (`src/lib/authz/use-permission.ts`) · **tests de aislamiento cross-tenant** (`src/__tests__/lib/authz.test.ts`, cierra el pendiente de `CLAUDE.md §7`) · `middleware.ts` **omitido a propósito** (§5ter) | — |
| **S3** 🟡 acotado | UI Equipo/orgs | **Hecho**: pestaña Organización, invitaciones por correo + correos de confirmación, botón WhatsApp puente para Campesino (ver §5quater). **Diferido**: cambio del unique de `Membresia` (§4, solo 4 referencias reales, no ~13) · selector de contexto · registro de org Colectivo · unificar `FincaAcceso` | Sin bloqueo técnico — diferido por elección del usuario (sin consumidor real todavía) |
| **S4** | Magic Link WhatsApp | Emisor enchufable con fallback a log (mismo patrón que `src/lib/email.ts` y `rate-limit.ts`) · normalizar `telefono` a E.164 · requiere cuenta Meta WhatsApp Business + plantillas aprobadas | **Firma** (canal único) + cuenta Meta |
| **S5** ✅ | Auditoría | Hash-chain SHA-256 por organización, transacción serializable + reintento (ver §5quinquies) · `organizacionId`/`recurso`/`recursoId` poblados en 14 llamadas reales · panel "Auditoría" para el dueño (Equipo) + CSV últimos 30 días · panel de Super Admin con etiquetas completas | — |
| **S6** ✅ | MFA + trial | TOTP (`otplib` 13, API async — ver §5sexies) · `mfaSecret` cifrado AES-256-GCM (`MFA_ENCRYPTION_KEY`) · códigos de respaldo hasheados · challenge en el login de credenciales, "aviso primero, bloqueo después" para Super Admin · gestión desde pestaña "Seguridad" · **trial NO entregado** (§5sexies: sin Colectivo/Cooperativa no hay org en trial que expire) | — |
| **S7** | Impersonación | Usa `Impersonacion` (ya creada, sin uso) | **Firma** (mecanismo de consentimiento) |

## 7. Aplicar a producción (Neon)

Mismo patrón que `telefono` y `tokenVerificacion`: el build de Vercel corre `prisma db push` **sin** `--accept-data-loss` (a propósito, ver `scripts/db-push-produccion.mjs`) y esta migración agrega un índice único (`organizaciones.nit`), así que fallaría al primer intento. Se evita aplicando el SQL **antes** de mergear:

1. Neon → SQL Editor → pegar **todo** [`prisma/sql/2026-09-adr011-iam-aditivo.sql`](../prisma/sql/2026-09-adr011-iam-aditivo.sql) → Run.
2. Verificar (solo lectura) que las 5 tablas nuevas existen y están vacías — debe devolver 5 filas, todas con `0`:
   ```sql
   select 'sesiones' as tabla, count(*) from sesiones
   union all select 'tokens_auth', count(*) from tokens_auth
   union all select 'invitaciones', count(*) from invitaciones
   union all select 'facturacion', count(*) from facturacion
   union all select 'impersonaciones', count(*) from impersonaciones;
   ```
3. Mergear el PR. `db push` encuentra la base ya sincronizada y el deploy pasa.

El script es **puramente aditivo** (verificado: sin `DROP`, `RENAME`, `TRUNCATE`, `DELETE FROM`, `SET NOT NULL` ni `ALTER COLUMN`; todo `NOT NULL` nuevo lleva `DEFAULT`) y no toca ninguna fila existente. Se probó en local: aplicado en una sola transacción sobre la base del pilotaje, `prisma db push` reportó *"The database is already in sync"*. **No requiere backfill** para que la app funcione (nada lee aún las columnas nuevas).

## 8. Para la firma del ADR (§13)

- Confirmar la interpretación de **PLATFORM_SUPPORT** y de los **`*`** (hallazgo 2).
- Impersonación (S7), WhatsApp como canal único (S4) y residencia de datos siguen **sin implementarse** hasta la firma.
- Revisar con abogado el umbral de registro ante la SIC (hallazgo 8).

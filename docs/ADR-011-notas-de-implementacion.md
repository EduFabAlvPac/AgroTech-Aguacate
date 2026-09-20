# ADR-011 — Notas de implementación

> Complementa [`ADR-011-Modelo-Identidad-Roles-Permisos.md`](ADR-011-Modelo-Identidad-Roles-Permisos.md) (estado: **PROPUESTO**). Registra cómo se fusionó el schema IAM con el existente, en qué se apartó del documento y por qué, y qué queda por sprint. No reemplaza al ADR: si algo aquí lo contradice, es una desviación deliberada y está justificada abajo.

## 1. Qué se entregó (y qué no)

| Entregado | No entregado (a propósito) |
|---|---|
| `prisma/schema.prisma` **único** con el IAM integrado, 100 % aditivo | Ninguna ruta, login ni pantalla usa todavía el modelo nuevo |
| `src/lib/authz/permissions.ts` + `policies.ts` (matriz §4 + evaluador puro) con 41 tests | `src/lib/authz.ts` (el RBAC vigente) **no se tocó** |
| `prisma/sql/2026-09-adr011-iam-aditivo.sql` para producción | Backfill de datos (Sprint 1), sesiones, MFA, Magic Link, impersonación |

Consecuencia: el comportamiento de la app es **idéntico** al anterior. Todo lo nuevo es infraestructura dormida.

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
| `Membership` | `Membresia` | + `fincaId`, `estado`, `esRolPrimario`, `rolIam`, campos de revocación |
| `Rol` | enum `Rol` **nuevo** + `Membresia.rolIam` | el viejo `RolOrganizacion` sigue mandando hasta el cutover |
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
5. **Tokens en texto plano hoy.** `User.tokenVerificacion` y `tokenResetPassword` (Tanda 2) se guardan sin hash; el ADR pide SHA-256. Migrarlos a `TokenAuth` en el Sprint 1.
6. **MFA obligatorio para `ORG_OWNER`** afecta a los dueños actuales de producción → enrolamiento con periodo de gracia. El "cifrado a nivel de aplicación" de `documentoIdentidad` y `mfaSecret` no define gestión de llaves (`ENCRYPTION_KEY`, rotación).
7. **Cron de §8.1 "cada 6 horas":** Vercel **Hobby** solo permite una ejecución diaria. O se acepta diario, o se necesita plan Pro.
8. **§7.1 (Ley 1581) — verificar con abogado, no lo doy por cierto:** el ADR dice que el registro ante la SIC es obligatorio al superar 100.000 *titulares*. Mi entendimiento (Decreto 090 de 2018) es que el umbral del RNBD es por **activos totales (100.000 UVT)**, no por número de titulares. Si es así, la alerta de "80.000 titulares" mide otra cosa.
9. **Migración de datos existentes:** `metodoAuthPreferido` quedará en `EMAIL_PASSWORD` para los Campesino actuales hasta el backfill (nada lo lee todavía).
10. Menores: los enums de §5.2 están truncados en el .docx (manda el `.prisma`); `Facturacion` se solapa con ADR-012 (pendiente); `propietarioTemp` de §6.2 no existe ni hace falta (`Invitacion.fincaId`); §6.2 y §5.3 usan `Farm`/`Organization` donde el código dice `Finca`/`Organizacion`.

## 6. Mapa de sprints → código real

| Sprint | Alcance del ADR | Qué implica en ESTE código | Bloqueos |
|---|---|---|---|
| **S1** | Login/sesiones | `Sesion` como lista de revocación (JWT + `sesionId`, ver §5.1) · migrar tokens de `User` a `TokenAuth` con hash · **`prisma/backfill-iam.ts`** idempotente: `estado` ← `aceptada/activa`, `rolIam` ← `rolLegacyARolIam()`, `esRolPrimario` ← membresía más antigua, `metodoAuthPreferido` ← `experiencia`, `Organizacion.tipo/planIniciadoEn` | — |
| **S2** | Guards + `usePermission()` | Hacer que `requireAccess` (`src/lib/authz.ts`) se apoye en `ROLE_PERMISSIONS`/`can()` · `middleware.ts` (hoy no existe) · hook cliente · **tests de aislamiento cross-tenant** (pendiente desde `CLAUDE.md §7`) | — |
| **S3** | UI Equipo/orgs | Cambio del unique de `Membresia` (§4) y de las ~13 llamadas a `userId_organizacionId` · selector de contexto · invitaciones · registro de org Colectivo · unificar `FincaAcceso` | — |
| **S4** | Magic Link WhatsApp | Emisor enchufable con fallback a log (mismo patrón que `src/lib/email.ts` y `rate-limit.ts`) · normalizar `telefono` a E.164 · requiere cuenta Meta WhatsApp Business + plantillas aprobadas | **Firma** (canal único) + cuenta Meta |
| **S5** | Auditoría | Hash-chain por organización (§5.4) · export CSV | — |
| **S6** | MFA + trial | TOTP (`otplib`) · llaves de cifrado · job de vencimiento de trial | Cron diario en Hobby (§5.7) |
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

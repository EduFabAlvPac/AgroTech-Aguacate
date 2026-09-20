## CrecIAgro S.A.S.

GermIA PRO · GermIA Móvil (GermIAmigo)

## Modelo de Identidad, Roles y Permisos ADR-011

Identity & Access Management (IAM) para plataforma multi-tenant

Estado: PROPUESTO

Versión: 1.0

Fecha: 19 de septiembre de 2026

Bogotá, Colombia

Autor

Eduard Fabian Álvarez Pacheco

Co-fundador · Arquitecto Empresarial Master


## Metadata del ADR

| Campo | Valor |
| --- | --- |
| ID | ADR-011 |
| Título | Modelo de Identidad, Roles y Permisos (IAM) |
| Estado | PROPUESTO — pendiente aprobación del comité fundador |
| Fecha | 2026-09-19 |
| Autor | Eduard Fabian Álvarez Pacheco |
| Revisores | Fabián Álvarez, Néstor Barreto (co-fundadores) |
| ADRs relacionados | ADR-001 (RBAC inicial), ADR-004 (Modelo multi-rol), ADR-005 (Deshabilitación |
|   | PWA), ADR-006 (Vista preferida) |
| Dependencia técnica | Fase técnica 2 del roadmap (RBAC real) |
| Impacto | ALTO — módulo transversal a toda la plataforma |
| Reversibilidad | BAJA — cambios de schema requieren migración compleja |


## 1. Contexto

CrecIAgro S.A.S. opera dos productos sobre una misma base tecnológica: GermIA PRO (interfaz web responsive completa) y GermIA Móvil / GermIAmigo (interfaz móvil simplificada para campesinos). El modelo comercial definido en el Plan Estratégico v2 y en la nueva propuesta de precios (ADR-012, en curso) requiere un modelo de identidad, autenticación y autorización capaz de soportar cinco escenarios simultáneos:

- Productor individual tecnificado — autenticación por email + password, rol de dueño de finca, plan Productor o Finca Pro.

- Cooperativa/gremio/asociación/fundación (plan Colectivo) —múltiples usuarios (coordinador, técnicos, asociados), invitación masiva, dashboard agregado, patrocinio del acceso móvil de sus asociados.

- Campesino asociado a organización — autenticación por WhatsApp Magic Link (sin email ni contraseña), rol de dueño de finca con scope reducido, vista simplificada GermIAmigo.

- Inversionista de agronegocio (Fase 3) — acceso a cultivos financiados específicos, sin acceso operativo a la finca completa.

- Comprador de producción (Fase 4) — acceso por enlace único firmado, sin cuenta registrada.

El diagrama de entendimiento inicial provisto por el fundador contempla solo 3 roles (Administrador, Dueño de Finca, Consulta) y confunde tipos de organización (Gremio, Cooperativa, Gobierno) con roles funcionales. Esta simplificación es insuficiente para soportar el modelo comercial y contradice los 6 roles ya definidos en ADR-001 y ADR-004. El presente ADR reemplaza y consolida esos ADRs previos, elevando el modelo a un IAM formal de 5 capas conforme a mejores prácticas de la industria (NIST SP 800-162 ABAC, OWASP ASVS v4, ISO/IEC 27001:2022).

## 1.1 Restricciones y directrices del fundador

- Autenticación campesino: exclusivamente WhatsApp Magic Link. No se implementará OTP por SMS como fallback (decisión explícita del fundador, 2026-09-19).

- Memberships múltiples: autorizadas. Un mismo User puede tener varios roles activos en distintas organizaciones y/o fincas.

- Trial plan Colectivo: 30 días, máximo 5 asociados de prueba.

- Impersonación por soporte: autorizada, condicionada a consentimiento explícito del usuario objetivo mediante token de autorización con expiración.

- Modelo de permisos: definidos en código TypeScript (no en base de datos), por type-safety y menor superficie de ataque.

- Residencia de datos: operación inicial en Neon (AWS us-east) y Vercel es legalmente aceptable bajo Ley 1581/2012 con cláusula de transferencia internacional. Migración a GCP región sudamérica se planifica cuando se supere el 70% del límite de almacenamiento free-tier, con alerta automática.


## 2. Decisión

Se adopta un modelo IAM de cinco capas (Identity, Tenant, Membership, Role, Permission) con las siguientes características:

## 2.1 Arquitectura de cinco capas

| Capa | Entidad | Responsabilidad |
| --- | --- | --- |
| 1. Identity | User | ¿Quién eres? Credenciales, MFA, canales verificados |
| 2. Tenant | Organization | ¿A qué organización perteneces? Cooperativa, gremio, individual, |
|   |   | etc. |
| 3. | Membership | ¿Cuál es tu vínculo? Une User + Organization + Rol + scope |
| Membership |   |   |
| 4. Role | Rol (enum) | ¿Qué rol tienes ahí? 9 roles definidos |
| 5. Permission | código TS | ¿Qué puedes hacer sobre qué recurso? |

Principio clave: un mismo User puede tener varias Memberships activas simultáneamente. Ejemplo: un ingeniero agrónomo puede ser FARM_OWNER de su propia finca personal y a la vez FARM_COLLABORATOR en tres fincas de una cooperativa. En login, elige (o se aplica) el rol primario; puede cambiar de contexto sin cerrar sesión.

## 2.2 Taxonomía de roles

Roles de plataforma (transversales a CrecIAgro)

| Rol | Alcance | Uso típico |
| --- | --- | --- |
| SUPER_ADMIN | Toda la plataforma | Fundadores CrecIAgro (Eduard + 2 |
|   |   | hermanos). Máx 5 personas. |
| PLATFORM_SUPPORT | Toda la plataforma (lectura + | Equipo de soporte técnico. |
|   | impersonación con consentimiento) |   |

## Roles de organización (dentro de un tenant)

| Rol | Alcance | Uso típico |
| --- | --- | --- |
| ORG_OWNER | Organización completa | Gerente de cooperativa, director de |
|   |   | gremio, coordinador de programa. |
|   |   | Contrata plan, gestiona facturación, invita |
|   |   | usuarios. |
| ORG_ADMIN | Organización completa | Coordinador operativo que administra |
|   |   | usuarios y fincas sin acceso a |
|   |   | facturación. |

## Roles de finca (scoped a una finca específica)

| Rol | Alcance | Uso típico |
| --- | --- | --- |
| FARM_OWNER | Una finca | Productor tecnificado individual O |
|   |   | campesino asociado que recibe acceso |
|   |   | patrocinado. Es el rol más común. |


| Rol | Alcance | Uso típico |
| --- | --- | --- |
| FARM_ADMIN | Una finca | Delegado del dueño con permisos |
|   |   | operativos plenos, sin poder eliminar la |
|   |   | finca ni cambiar el dueño. |
| FARM_COLLABORATOR | Una finca | Técnico agrónomo, empleado de campo. |
|   |   | Registra actividades pero no accede a |
|   |   | finanzas. |

## Roles funcionales (transversales por invitación)

| Rol | Alcance | Uso típico |
| --- | --- | --- |
| INVESTOR | Uno o varios cultivos financiados | Persona natural o jurídica que invierte en |
|   |   | cultivos específicos (Fase 3). |
| BUYER | Enlaces compartidos específicos | Comprador que recibe enlace único. No |
|   |   | requiere registro (Fase 4). |

## Modificador ortogonal: perfil de UI

Independiente del rol, cada User tiene un campo perfilUI con tres valores posibles: CAMPESINO (fuerza vista simplificada GermIAmigo), TECNIFICADO (fuerza vista PRO Web), o AUTO (detecta por dispositivo). Esto respeta ADR-006 y la tesis del Plan v2: un campesino puede ser FARM_OWNER técnicamente, pero ver la interfaz de GermIAmigo. Rol y presentación son ortogonales.


## 3. Modelo de autenticación multi-canal

| Canal | Perfil objetivo | Método | Costo/turno MFA |
| --- | --- | --- | --- |
| Email + Password ORG_OWNER, |   | NextAuth Credentials + | $0 TOTP obligatorio |
|   | ORG_ADMIN, | bcrypt(12) | para |
|   | INVESTOR, técnicos |   | SUPER_ADMIN, |
|   |   |   | ORG_OWNER, |
|   |   |   | INVESTOR |
| WhatsApp Magic | Campesino (único | Token único vía | ~$5-10 COP No aplica (fricción |
| Link | método autorizado) | WhatsApp Business API, | excesiva) |
|   |   | expiración 15 min |   |
| Enlace único (JWT) BUYER |   | Token firmado en URL, | $0 No aplica |
|   |   | sin registro |   |
| SAML SSO | Gobierno, | NextAuth SAML | Setup por Delegado al IdP |
|   | universidades grandes |   | convenio corporativo |

## 3.1 Flujo WhatsApp Magic Link (crítico para adopción)

- 1. La cooperativa/organización invita al campesino ingresando su número de celular en formato colombiano (+57).

- 2. El sistema genera token único (32 bytes aleatorios, hash SHA-256 almacenado), lo guarda en TokenAuth con expiración de 15 minutos.

- 3. Se envía mensaje por WhatsApp Business API con el enlace de acceso a germia.creciagro.com/entrar?t=<token>.

- 4. El campesino abre el enlace desde WhatsApp, se abre la PWA GermIAmigo directamente en su finca asignada.

- 5. El sistema crea sesión de larga duración (30 días) con cookie httpOnly + SameSite=Lax. En cada acceso posterior, no se requiere nuevo token mientras la sesión sea válida.

- 6. Cuando expire la sesión, la próxima visita a la app dispara un nuevo Magic Link automáticamente al mismo número.

## 3.2 Riesgo identificado y mitigación

La decisión de usar WhatsApp Magic Link como único canal sin SMS de fallback introduce dependencia crítica del servicio de Meta. Escenarios de riesgo:

- Caída de WhatsApp Business API: el campesino no puede iniciar sesión. Mitigación: la sesión activa dura 30 días, cubriendo caídas cortas. Para caídas prolongadas, el ORG_OWNER puede generar un enlace de recuperación asistida y compartirlo por otro canal (mensaje presencial, otra app).

- Número sin WhatsApp instalado: el mensaje no llega. Mitigación: validación previa al momento de la invitación mediante WhatsApp Business API check-number endpoint. Si falla, se marca la invitación como no entregable y se notifica al ORG_OWNER.

- Cambio de número del campesino: pierde acceso. Mitigación: proceso de recuperación asistida por ORG_OWNER que valida presencialmente al asociado y actualiza el número.


## 4. Matriz de permisos por rol

Los permisos se expresan como tuplas <acción:recurso, scope>. La matriz siguiente resume el catálogo por rol. Leyenda: C=Crear, R=Leer, U=Actualizar, D=Eliminar, — = no aplica.

| Recurso / Acción SUPER |   | ORG | ORG | FARM | FARM | FARM | INVES | BUYER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|   | ADMIN | OWNER | ADMIN | OWNER | ADMIN | COLLAB | TOR |   |
| Organization | CRUD | RU | R | — | — | — | — | — |
| Billing / Plan | CRUD | CRUD | R | CRUD* — |   | — | — | — |
| User invite | CRUD | CRUD | CRU | CRU* | CRU* | — | — | — |
| Farm | CRUD | CRUD | CRUD | RU | RU | R | — | — |
| Lote | CRUD | CRUD | CRUD | CRUD | CRUD | RU | — | — |
| Cultivo | CRUD | CRUD | CRUD | CRUD | CRUD | CRU | R* | R* |
| Actividad campo | CRUD | R | R | CRUD | CRUD | CRU | — | — |
| Finanzas (ver) | CRUD | R | R | R | R | — | R* | — |
| Finanzas (editar) | CRUD | CRUD | R | CRUD | CRUD | — | — | — |
| Diagnóstico IA | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | — | — |
| Inversionista | CRUD | CRUD | R | CRU | — | — | — | — |
| Comprador (link) | CRUD | CRUD | CRUD | CRUD | CRUD | — | — | — |
| Reportes | CRUD | R | R | — | — | — | — | — |
| agregados org |   |   |   |   |   |   |   |   |
| Audit log | CRUD | R | R | R* | R* | — | — | — |
| Impersonar usuario CRUD |   | — | — | — | — | — | — | — |


## 5. Modelo de datos (Prisma)

El schema completo se entrega como archivo adjunto (schema-iam.prisma). A continuación se resumen las entidades principales:

## 5.1 Entidades principales

| Entidad | Propósito | Cardinalidad clave |
| --- | --- | --- |
| User | Identidad única (email o celular) | 1..N Memberships, 1..N Sesiones |
| Organization | Tenant: cooperativa, gremio, individual, etc. | 1..N Memberships, 1..N Fincas, 1..N |
|   |   | Facturación |
| Membership | Vínculo User ↔ Organization con rol y scope N..1 User, N..1 Org, N..0..1 Farm |   |
| Sesion | Sesión activa (token cookie) | N..1 User |
| TokenAuth | Tokens de un solo uso (magic link, reset) | N..1 User |
| Invitacion | Pending: invitación por email o WhatsApp | N..1 Organization |
| AuditLog | Registro inmutable de acciones | N..0..1 User, N..0..1 Org |
| Impersonacion | Sesión de soporte con consentimiento | N..1 soporte, N..1 target |

## 5.2 Enumeraciones críticas

enum Rol { SUPER_ADMIN, PLATFORM_SUPPORT, ORG_OWNER, ORG_ADMIN, FARM_OWNER, FARM_ADMIN, FARM_COLLABORATOR, INVESTOR, BUYER }

enum TipoOrg { INDIVIDUAL, COOPERATIVA, GREMIO, ASOCIACION_CAMPESINA,

UNIVERSIDAD, ONG, EMPRESA_PRIVADA,

enum PlanTipo { SEMILLA_TRIAL, PRODUCTOR, FINCA_PRO, COLECTIVO, GERMIAMIGO_INDIVIDUAL, GERMIAMIGO_SEMILLA } enumMetodoAuth { EMAIL_PASSWORD, WHATSAPP_MAGIC_LINK, enum PerfilUI { CAMPESINO, TECNIFICADO, AUTO }

FUNDACION, GOBIERNO,

CRECIAGRO_INTERNAL }

## 5.3 Índices críticos (performance)

- User: índices únicos en email y celular.

- Membership: índice compuesto (organizationId, rol, estado) — soporta el dashboard agregado de cooperativa.

- Membership: índice único (userId, organizationId, rol, farmId) — evita duplicados.

- AuditLog: índices por (userId, createdAt) y (organizationId, createdAt) — soporta consultas de auditoría paginadas.

- Sesion: índice por expiraEn — soporta job de limpieza de sesiones expiradas.

EMPRESARIAL,

SAML_SSO, BUYER_TOKEN }


## 6. Escenarios end-to-end

## 6.1 Onboarding cooperativa (plan Colectivo, trial 30 días)

- 1. La cooperativa "El Común de Ocaña" se registra en creciagro.com/registrarse-colectivo. El coordinador ingresa: nombre, NIT, email, celular, tipo=COOPERATIVA.

- 2. Se crea User(coordinador) con MetodoAuth=EMAIL_PASSWORD y perfilUI=TECNIFICADO. Se envía email de verificación.

- 3. Se crea Organization(tipo=COOPERATIVA, plan=COLECTIVO, esTrial=true, trialMaxAsociados=5, trialFinEn=+30 días).

- 4. Se crea Membership(userId=coordinador, orgId=coop, rol=ORG_OWNER, esRolPrimario=true).

- 5. Se registra AuditLog(accion="ORG.CREATE", metadata={plan, trial}).

## 6.2 Invitación de 5 asociados (trial)

- 1. El coordinador entra al módulo Equipo → Invitar asociados. Ingresa: nombre, celular de cada campesino.

- 2. Por cada uno, el sistema crea Farm(propietarioTemp=<campesino>, orgId=coop), Invitacion(rol=FARM_OWNER, canalEnvio=WHATSAPP, expiraEn=+7 días), y envía WhatsApp Magic Link.

- 3. El sistema valida que trialMaxAsociados (5) no sea excedido — al invitar al 6º se muestra CTA "Comprar plan Colectivo para invitar más asociados".

- 4. El campesino recibe el mensaje: "Hola Pedro, la cooperativa El Común te invita a GermIA. Toca aquí para entrar → [link]".

- 5. Al abrir el link, se crea User(celular=+573001234567, perfilUI=CAMPESINO, MetodoAuth=WHATSAPP_MAGIC_LINK), Membership(rol=FARM_OWNER, farmId=X). Se redirige a GermIAmigo con su finca ya cargada.

## 6.3 Membership múltiple (caso real esperado)

Escenario: Juan es asociado de la cooperativa (FARM_OWNER en cooperativa) pero además tiene una parcela personal separada donde quiere gestionar aparte.

- 1. Juan ya tiene User(celular=+57...) creado desde la cooperativa.

- 2. Juan quiere plan Cosecha (\$12.900/mes) para su parcela personal → se crea Organization(tipo=INDIVIDUAL, plan=GERMIAMIGO_INDIVIDUAL, ownerId=Juan).

- 3. Se crea segunda Membership(userId=Juan, orgId=orgPersonal, rol=FARM_OWNER, esRolPrimario=false).

- 4. Al iniciar sesión, Juan ve un selector de contexto: "Mi Finca Personal" | "Cooperativa El Común - Parcela 12". Puede cambiar sin cerrar sesión.

## 6.4 Revocación de asociado

Escenario: Un campesino deja la cooperativa.

- 1. ORG_OWNER navega a Equipo → selecciona al asociado → Revocar acceso.

- 2. Se actualiza Membership.estado=REVOCADA, motivoRevocacion, revocadoPorId, revocadoEn.


- 3. Todas las sesiones activas del usuario en esa organización se invalidan (Sesion.revocadaEn=now()).

- 4. El User conserva su cuenta y otras Memberships (no se elimina).

- 5. Se registra AuditLog(accion="MEMBERSHIP.REVOKE", metadata={motivo, revocadoPor}).

- 6. La finca queda en estado "sin propietario activo" y puede ser reasignada o archivada por el ORG_OWNER.

## 6.5 Impersonación por soporte

Escenario: Un ORG_OWNER reporta un bug que solo se reproduce en su cuenta. Soporte necesita ver la interfaz como él.

- 1. PLATFORM_SUPPORT abre panel de soporte → busca al usuario → clic en "Solicitar impersonación", ingresa motivo declarado.

- 2. Se crea Impersonacion(estado=PENDIENTE_CONSENTIMIENTO, expiraEn=+2h, tokenConsentimiento).

- 3. Al usuario objetivo le llega notificación in-app y email/WhatsApp: "Soporte de CrecIAgro solicita acceso temporal a tu cuenta para diagnosticar el problema #12345 que reportaste. Motivo: <motivo>. [Autorizar] [Denegar]".

- 4. Si autoriza, Impersonacion.estado=ACTIVA, consentimientoDadoEn=now(). Soporte puede actuar como el usuario por máximo 2 horas.

- 5. Cada acción ejecutada durante la impersonación se registra en AuditLog con soporteUserId + targetUserId + esImpersonacion=true.

- 6. La banda de estado en la UI del soporte muestra permanentemente: "IMPERSONANDO A <nombre> — finaliza automáticamente a las <hora>".


## 7. Cumplimiento ISO 27001:2022

Los siguientes controles del Anexo A de ISO/IEC 27001:2022 aplicables al módulo IAM se implementan como se describe:

| Control | Título | Implementación |
| --- | --- | --- |
| A.5.15 | Control de acceso | RBAC + ABAC híbrido con 5 capas. Permisos declarativos en código. |
| A.5.16 | Gestión de identidad User único por email/celular verificado. Ciclo de vida completo (alta, |   |
|   |   | modificación, baja). |
| A.5.17 | Autenticación | MFA TOTP obligatorio para roles privilegiados. WhatsApp Magic Link con |
|   |   | token de un solo uso. |
| A.5.18 | Derechos de acceso Membership por rol + scope. Revocación inmediata. Revisión trimestral |   |
|   |   | automatizada. |
| A.8.2 | Privilegios de acceso PLATFORM_SUPPORT sin acceso persistente; impersonación requiere |   |
|   |   | consentimiento y expira. |
| A.8.3 | Restricción de | Middleware de autorización a nivel de ruta API y componente cliente. Deny |
|   | acceso | by default. |
| A.8.5 | Autenticación segura bcrypt(12), rate limiting, lockout tras 5 intentos, Cloudflare Turnstile en |   |
|   |   | login. |
| A.8.15 | Registro (logging) | AuditLog inmutable con encadenamiento hash SHA-256 (append-only). |
| A.8.16 | Actividades de | Alertas por: login desde nueva ubicación, escalada de privilegios, |
|   | monitoreo | revocación masiva. |
| A.8.24 | Uso de criptografía | TLS 1.3 obligatorio, HSTS, secretos en variables de entorno + Vercel |
|   |   | Secrets, MFA secrets cifrados. |

## 7.1 Cumplimiento Ley 1581/2012 (Colombia)

- Aviso de privacidad versionado: campo consentimientoVersion en User. Al cambiar el aviso, se solicita re-aceptación.

- Consentimiento explícito: campo consentimientoDatosEn con timestamp. Sin este campo, el usuario no puede completar el onboarding.

- Derecho al olvido: soft delete via User.eliminadoEn. Job programado elimina físicamente datos personales tras 30 días, conservando AuditLog anonimizado.

- Transferencia internacional: declarada en aviso de privacidad (datos alojados en AWS us-east vía Neon, Vercel). Legalmente aceptable con esta declaración.

- Registro ante SIC: obligatorio una vez se supere el umbral de 100.000 titulares. Alerta automática en dashboard interno al llegar a 80.000.


## 8. Residencia de datos y estrategia de migración

Aclaración legal importante: la Ley 1581/2012 y su Decreto 1377/2013 NO exigen almacenamiento físico en Colombia. Exigen: (a) consentimiento informado, (b) tratamiento con nivel adecuado de protección, y (c) declaración de transferencia internacional en el aviso de privacidad. Neon (AWS us- east) y Vercel son plenamente aceptables bajo este marco.

Sin embargo, por resiliencia operativa y latencia (usuarios en Colombia), se planifica migración a GCP región southamerica-east1 (São Paulo) cuando se cumpla al menos uno de estos umbrales:

- Almacenamiento: al alcanzar el 70% del límite del plan Pro de Neon (150 GB de 200 GB). Alerta automática vía métricas + notificación al fundador.

- Latencia: p95 > 800ms sostenido durante 7 días consecutivos.

- Volumen de usuarios: ≥ 5.000 usuarios activos mensuales.

- Contrato institucional: un contrato con entidad pública o gremio que exija residencia en Sudamérica o Colombia.

## 8.1 Alerta automatizada de almacenamiento

Se implementará job programado (Vercel Cron, cada 6 horas) que consulte el API de Neon para verificar el uso del schema, y notifique vía email + WhatsApp al fundador cuando se supere el 70%, 85% y 95% del límite. Esto se documentará en un ADR complementario (ADR-013 · Estrategia de escalamiento y migración de infraestructura).


## 9. Riesgos y mitigación

| Riesgo | Prob. | Impacto Mitigación |   |
| --- | --- | --- | --- |
| Caída de WhatsApp Business API | BAJA | ALTO | Sesiones de 30 días absorben caídas cortas. |
| bloquea acceso de campesinos |   |   | Recuperación asistida por ORG_OWNER para |
|   |   |   | casos prolongados. |
| Números sin WhatsApp instalado en | MEDIA MEDIO |   | Validación previa vía check-number API. |
| invitación |   |   | Notificación al ORG_OWNER si falla. |
| Cambio de número de celular del | MEDIA MEDIO |   | Proceso de recuperación asistida presencial |
| campesino |   |   | por ORG_OWNER. |
| Fuga de credenciales de | BAJA | ALTO | MFA obligatorio. Alerta ante login desde |
| ORG_OWNER (impacto masivo) |   |   | nueva ubicación. Sesión limitada a 24h para |
|   |   |   | roles privilegiados. |
| Abuso de impersonación por | BAJA | ALTO | Consentimiento explícito obligatorio, |
| soporte |   |   | expiración 2h, audit log inmutable, revisión |
|   |   |   | trimestral. |
| Escalada de plan Colectivo trial → | MEDIA MEDIO |   | Downgrade automático a modo lectura al |
| pago falla |   |   | vencer trial. Datos conservados 90 días. |
|   |   |   | Notificación 7, 3, 1 días antes. |
| Cumplimiento Ley 1581 al | ALTA | MEDIO | Alerta a los 80.000 titulares para iniciar |
| escalar >100k titulares |   |   | registro SIC (proceso ~30 días). |
| Modelo de permisos en código | MEDIA | BAJO | Compensado por type-safety y auditabilidad. |
| dificulta cambios rápidos |   |   | Cambios de permisos van con PR + review. |


## 10. Roadmap de implementación

| Sprint Duración Alcance |   | Salida verificable |
| --- | --- | --- |
| Sprint 1 2 | Migración schema Prisma. Seed de roles. | Login email/password funcional con |
| semanas | Refactor NextAuth Credentials con | nuevo modelo. |
|   | adaptador Prisma. Middleware de sesión. |   |
| Sprint 2 2 | Middleware de autorización. Guards por ruta | Ruta protegida bloquea sin rol; hook |
| semanas | API (Next.js Route Handlers). Hook | oculta botones sin permiso. |
|   | usePermission() cliente. Deny by default. |   |
| Sprint 3 3 | UI de gestión de organizaciones, usuarios, | ORG_OWNER puede invitar 5 usuarios y |
| semanas | invitaciones, memberships. Selector de | ver dashboard agregado. |
|   | contexto para membership múltiple. |   |
| Sprint 4 2 | Integración WhatsApp Business API. Flujo | Campesino accede a GermIAmigo con |
| semanas | Magic Link end-to-end. Sesiones de 30 | enlace WhatsApp. |
|   | días. |   |
| Sprint 5 2 | AuditLog completo con hash chain. Panel | ORG_OWNER descarga CSV de accesos |
| semanas | de auditoría para ORG_OWNER. Reportes | últimos 30 días. |
|   | de acceso. |   |
| Sprint 6 2 | MFA TOTP. Recuperación de cuenta. | SUPER_ADMIN con MFA obligatorio. |
| semanas | Gestión de sesiones múltiples. Trial | Trial expira y bloquea escritura. |
|   | Colectivo (30d, máx 5 asoc.). |   |
| Sprint 7 2 | Flujo de impersonación con consentimiento. | Soporte impersona con audit visible. |
| semanas | Migraciones y limpieza. Documentación |   |
|   | operativa. |   |

Total: aproximadamente 15 semanas para módulo IAM completo, alineado con Fase técnica 2 del roadmap general (RBAC real + Voz).


## 11. Alternativas consideradas y descartadas

## 11.1 Auth0 / Clerk (BaaS de autenticación)

Rechazado. Ventajas: implementación rápida, MFA out-of-the-box. Desventajas: costo mensual creciente con usuarios (Clerk \$25/mes hasta 10k MAU, luego \$0.02/MAU), dependencia externa crítica, dificultad para modelar Memberships múltiples y multi-tenant con permisos scoped complejos, envío de datos personales de campesinos colombianos a servicios extranjeros que complica declaración Ley 1581.

## 11.2 Permisos en base de datos (RBAC dinámico)

Rechazado. Ventajas: cambios sin deploy. Desventajas: mayor superficie de ataque SQL, imposible obtener type-safety en TypeScript, complejidad de UI para administración, riesgo de escalada de privilegios si se compromete la BD. La estabilidad de nuestro dominio de permisos justifica hard- coding.

## 11.3 SMS OTP como fallback de WhatsApp

Rechazado por decisión explícita del fundador. Costo 10x mayor (\$50-80 COP vs \$5-10 COP por mensaje), y agrega superficie de código a mantener. Se acepta el riesgo de canal único.

## 11.4 Modelo de un rol por usuario (sin Membership)

Rechazado. Contradice el caso real de un ingeniero agrónomo que es dueño de su finca personal y colaborador en cooperativa. Simplificar aquí bloqueará el crecimiento a partir del Sprint 3.


## 12. Consecuencias

## 12.1 Positivas

- Modelo escalable a los 5 escenarios comerciales sin refactor mayor.

- Type-safety end-to-end en TypeScript reduce bugs de autorización.

- Cumplimiento ISO 27001 y Ley 1581 desde el diseño.

- Auditabilidad completa: cada acción sensible queda registrada con encadenamiento hash.

- Membership múltiple habilita casos de uso complejos sin duplicar cuentas.

- Separación clara Rol vs Perfil de UI respeta la tesis dual PRO/Móvil del Plan v2.

## 12.2 Negativas

- Complejidad de la matriz de permisos requiere disciplina en revisión de PRs.

- Cambios de permisos requieren deploy (mitigado por CI/CD rápido de Vercel).

- Dependencia única de WhatsApp Business API para campesinos.

- ~15 semanas de implementación bloquean parcialmente otras funcionalidades (mitigado por trabajo paralelo del equipo).

## 12.3 Neutrales

- Requiere migración de datos de usuarios existentes (~pocos en fase piloto, riesgo bajo).

- Introduce el concepto de Organization donde antes había solo Farm — requiere entrenamiento del equipo.


## 13. Aprobaciones requeridas

Antes de iniciar Sprint 1, se requiere aprobación explícita de:

| Rol | Nombre | Aprobación | Fecha | Firma |
| --- | --- | --- | --- | --- |
| Co-fundador · Producto | Eduard Fabian Álvarez | Aprobado Con | __________ __________ |   |
| y Arquitectura | Pacheco | observaciones |   |   |
| Co-fundador | Fabián Álvarez | Aprobado Con | __________ __________ |   |
|   |   | observaciones |   |   |
| Co-fundador | Néstor Barreto | Aprobado Con | __________ __________ |   |
|   |   | observaciones |   |   |

## 13.1 Decisiones que requieren firma explícita adicional

- Impersonación por soporte: aprobar el mecanismo de consentimiento por token con expiración 2h.

- Autenticación campesino canal único: aceptar el riesgo residual de dependencia de WhatsApp Business API sin fallback SMS.

- Residencia de datos: aceptar operación inicial en AWS us-east vía Neon con declaración Ley 1581, y roadmap de migración a GCP São Paulo al 70% de uso.


## Anexo A · Glosario

| Término | Definición |
| --- | --- |
| IAM | Identity & Access Management. Disciplina de gestionar identidades digitales y su |
|   | acceso a recursos. |
| RBAC | Role-Based Access Control. Modelo donde los permisos se asignan a roles y los |
|   | roles a usuarios. |
| ABAC | Attribute-Based Access Control. Modelo donde los permisos se evalúan a partir de |
|   | atributos (usuario, recurso, contexto). |
| Multi-tenancy | Arquitectura donde múltiples organizaciones (tenants) comparten la misma |
|   | instancia de software con aislamiento de datos. |
| Membership | Vínculo tripartito entre User, Organization y Rol. Es la unidad de autorización en |
|   | este modelo. |
| Magic Link | Enlace único de un solo uso enviado por canal alternativo (WhatsApp, email) para |
|   | autenticar sin contraseña. |
| MFA / TOTP | Multi-Factor Authentication con Time-based One-Time Password (Google |
|   | Authenticator, Authy). |
| Impersonación | Capacidad de un usuario de soporte de actuar como otro usuario, con |
|   | consentimiento y auditoría. |
| Scope | Alcance de aplicación de un permiso (una finca específica, una organización, la |
|   | plataforma completa). |
| Tenant | Organización cliente en el modelo multi-tenant. |

## Anexo B · Archivos entregables

- ADR-011-Modelo-Identidad-Roles-Permisos.docx (este documento)

- schema-iam.prisma (módulo IAM del schema Prisma, listo para migración)

- Pendiente para implementación: src/lib/authz/permissions.ts (catálogo de permisos en código)

- Pendiente para implementación: src/lib/authz/policies.ts (funciones can/cannot por rol)

- Pendiente para implementación: middleware.ts actualizado con guards de autorización

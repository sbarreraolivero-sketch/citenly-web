# Citenly — Guía para Claude

SaaS para clínicas estéticas y salones de belleza. Permite agendar citas vía WhatsApp con un AI agent, gestionar pacientes, enviar recordatorios y encuestas, gestionar campañas masivas, CRM de prospectos y motor de retención.

**Nicho:** Clínicas de estética, salones de belleza, centros de medicina estética. Los "pacientes" son clientes humanos — NO hay mascotas, tutores, ni lógica veterinaria.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript, Radix UI, Tailwind |
| Backend | Supabase (PostgreSQL + Auth + Storage + ~32 Edge Functions) |
| AI | OpenAI GPT-4o / GPT-4o-mini + OpenRouter + Gemini (routing híbrido) |
| WhatsApp | YCloud — inbound/outbound via webhook |
| Email | (pendiente configurar Resend) |
| Pagos Chile | MercadoPago (suscripciones + créditos AI) |
| Pagos Internacional | LemonSqueezy |
| Deploy | Vercel (frontend) + Supabase (edge functions) |

---

## IDs críticos

```
Supabase project_id = "hubjqllcmbzoojyidgcu"
HQ_ID = "00000000-0000-0000-0000-000000000000"  (fila HQ en clinic_settings)
```

**Nota sobre el MCP:** El MCP de Supabase conecta por defecto a `ehmncwawzdciajvuallg` (proyecto Vetly). Para queries directas a Citenly usar scripts Node.js con las keys del `.env` local o el Supabase CLI apuntando a `hubjqllcmbzoojyidgcu`.

---

## Arquitectura de Edge Functions

### AI Agent principal
**`ycloud-whatsapp-webhook`** — ~2088 líneas, core del producto.

Flujo por mensaje entrante:
1. Recibe payload YCloud (WhatsApp inbound)
2. Debounce (agrupa mensajes rápidos del mismo usuario)
3. Deduplicación: si llegó un mensaje más nuevo mientras esperaba, aborta
4. Routing de modelo: `callAI()` → prueba OpenAI → fallback OpenRouter → fallback Gemini
5. Loop de tool calls (máx 5): `check_availability`, `create_appointment`, `get_services`, `get_knowledge`, `escalate_to_human`, `reschedule_appointment`, `tag_patient`, `confirm_appointment`
6. Verificación de créditos AI antes de responder
7. Respuesta vía YCloud API

**Estado actual del webhook (mayo 2026):**
- Usa imports modernizados (`jsr:`, `npm:`)
- Tiene `callGemini`, `callOpenRouter`, `callOpenAI` (routing híbrido sin `selectModelTier` formal)
- **Sin HMAC per-clínica** — pendiente implementar (ver Tareas pendientes)
- **Modificado localmente** pero no deployado — `git status` muestra `M supabase/functions/ycloud-whatsapp-webhook/index.ts`

### Sistema de créditos AI
- `ai_credits_used`: contador acumulado del ciclo actual
- `ai_credits_limit`: cupo mensual del plan (no cambia, la recarga resetea `used` a 0)
- `ai_credits_extra`: créditos extra comprados (se conservan entre ciclos)
- `ai_credits_balance`: saldo calculado disponible
- El AI se silencia cuando `ai_credits_used >= ai_credits_limit + ai_credits_extra`

**Bug crítico resuelto (mayo 2026):** `cron-monthly-credit-recharge` acumulaba `ai_credits_limit` en vez de resetear `ai_credits_used`. Corregido: ahora hace `ai_credits_used = 0` y conserva el límite.

**Caso Elizabeth Microblading:** créditos desbordados → AI silenciada. Fix: resetear `ai_credits_used = 0` manualmente. Clínica real: ID `1ab32091-210c-4525-a7e1-e6a7dca1c8c6`. Hay 2 registros duplicados de esta clínica que se deben eliminar manualmente.

### Otras Edge Functions relevantes

| Función | Rol | verify_jwt |
|---|---|---|
| `ai-simulator` | Simulador del AI agent para el dashboard | false |
| `chat-agent` | Chat ventas/soporte del sitio citenly.com | false |
| `cron-monthly-credit-recharge` | Resetea `ai_credits_used=0` el día de aniversario de cada clínica | false |
| `cron-process-reminders` | Recordatorios de citas (24h y 2h antes) | false |
| `cron-process-surveys` | Encuestas post-cita vía WhatsApp template | false |
| `cron-process-upsell` | Campañas de upsell automático | — |
| `cron-retention-compute` / `cron-retention-execute` | Motor de retención preventivo | — |
| `send-whatsapp-message` | Envío manual de mensajes (API key server-side) | — |
| `send-whatsapp-campaign` | Campañas masivas manuales | — |
| `send-whatsapp-reminder` | Recordatorio individual manual | — |
| `send-whatsapp-survey` | Encuesta individual manual | — |
| `mercadopago-webhook` | Procesa pagos y activa suscripciones | false |
| `signup-handler` | Crea clinic_settings al registrarse | — |

---

## Páginas del frontend (`src/pages/`)

`Dashboard`, `Appointments`, `Patients`, `Messages`, `CRM`, `Campaigns`, `Finance`, `RetentionEngine`, `Loyalty`, `KnowledgeBase`, `Templates`, `Settings`, `AICredits`

**HQ** (`src/pages/hq/`): `AdminDashboard`, `AdminCalendar`, `AdminMessages`, `AdminClinics`, `AdminSettings`, `AdminLogin`

**Settings** (`src/pages/settings/`): `Team`, `MyProfile`

---

## Patrones críticos a respetar

### Modelo de datos — Citenly vs Vetly
En Citenly los "pacientes" son clientes humanos directos (no hay tutores). La tabla es `patients` (o `crm_prospects` para leads). No existe tabla `tutors` ni lógica de mascotas. Cualquier operación de contacto (WhatsApp, recordatorios, campañas) va directo al `phone_number` del paciente o prospecto.

### Sistema de tags
- `tags` — tabla de etiquetas por clínica
- `patient_tags` — junction table `patient_id + tag_id`
- El webhook `tagPatient` debe insertar en `patient_tags` (no en tablas inexistentes)
- La tabla `tags` tiene RLS habilitada — verificar que tenga políticas activas

### RLS — patrón estándar
Las políticas de RLS usan `clinic_users` (o `clinic_members` dependiendo de la tabla) para soportar multi-sucursal:
```sql
clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
```
Si un usuario no ve datos, verificar que tenga filas activas en `clinic_users`.

### Envío de mensajes WhatsApp — NUNCA desde el frontend
La API key de YCloud **nunca debe llegar al browser**. Todo envío debe pasar por el Edge Function `send-whatsapp-message`, que autentica al usuario por JWT y hace el API call server-side.

### Knowledge base
La tabla `knowledge_base` se consulta dentro del webhook. Si se implementa cache (pendiente), debe ser un `Map<clinicId, {docs, fetchedAt}>` con TTL de 5 min a nivel de módulo.

### ai-simulator — mantener sincronizado con el webhook
Los tools disponibles en el simulador deben coincidir con los del webhook principal. El simulador usa la API **deprecada** `functions`/`function_call` — pendiente migrar a `tools`/`tool_choice`.

### Seguridad del webhook
- CORS actual: `*` — pendiente restringir a `https://ycloud.com` (o manejar para simulador)
- **Sin HMAC per-clínica** — pendiente implementar `verifyYCloudSignature` donde el secret se lee de `clinic_settings.ycloud_webhook_secret` (columna a crear)
- **Formato HMAC YCloud (crítico):** header `t={timestamp},s={hex}`, payload `{timestamp}.{rawBody}`, clave = `encoder.encode(secret)` (el string completo `whsec_...` como UTF-8, NO decodificar base64)
- El simulador detectado por ausencia de `p.whatsappInboundMessage` → bypass de verificación

### Plans — IDs actuales
Citenly usa `essence` / `radiance` / `prestige` como IDs de plan en la DB. El frontend también acepta `core`, `starter`, `pro`, `enterprise` (para migración futura). Usar `normalizePlanId()` si existe, o comparar ambos sets.

### LemonSqueezy — precios variables
Para productos de precio variable (créditos, recordatorios), usar `custom_price` en centavos USD en `checkoutAttributes`. **Nunca `quantity`** — la API de LS lo rechaza con 400.

---

## Cambios realizados — mayo 2026 (sesión 1, diagnóstico y correcciones urgentes)

### Elizabeth Microblading — AI silenciada (bug resuelto)
- **Causa raíz:** `ai_credits_used (14519) >= ai_credits_limit (2000) + ai_credits_extra (12500) = 14500`
- **Fix:** reset manual `ai_credits_used = 0` en la clínica `1ab32091-210c-4525-a7e1-e6a7dca1c8c6`
- **Bug de raíz:** `cron-monthly-credit-recharge` nunca reseteaba el contador, solo acumulaba el límite
- **Pendiente:** eliminar las 2 clínicas duplicadas de Elizabeth de la DB

### cron-monthly-credit-recharge — 3 bugs corregidos
1. Columna `name` inexistente → `clinic_name`
2. Acumulaba `ai_credits_limit` en vez de `ai_credits_used = 0`
3. Clínicas creadas el día 29-31 nunca recibían recarga → ahora usan el último día del mes

### cron-process-surveys — bug de campo `from` corregido
El payload de YCloud no incluía `from: ycloud_phone_number` → error HTTP 400/500. Corregido.

### Seguridad — API key YCloud movida al servidor
- Nuevo Edge Function `send-whatsapp-message` (server-side, autenticado por JWT)
- `Messages.tsx` actualizado para llamar al Edge Function (no a YCloud directamente)
- La YCloud API key ya no llega al browser en ningún flujo

### Deuda técnica resuelta
- `flowType: 'implicit'` → `'pkce'` en `src/lib/supabase.ts`
- Clave hardcodeada MercadoPago eliminada de `Register.tsx`
- `AICreditsPage` movido a `lazy()` en `App.tsx` (code splitting)
- `.limit(500)` añadido en fetch de conversaciones de `Messages.tsx`
- `Settings.valid.tsx` (3544 líneas de código muerto) eliminado
- `pg` eliminado de `package.json` (cliente PostgreSQL de Node.js sin sentido en browser)

### Cambios realizados — mayo 2026 (sesión 2)

#### Landing.tsx — rediseño completo (dark theme)
- Título: "Tu Centro Estético Lleno Mientras Tú Atiendes"
- Subtitle badge: "Agente IA para centros de estética y belleza"
- Sección "Todo lo que necesitas" reescrita al estilo Vetly adaptada a Citenly
- Sección de referidos agregada
- Planes en USD con copy adaptado a estética (core/starter/pro/enterprise)
- Banderas de países disponibles
- Committed y pushed

#### Login.tsx / ForgotPassword.tsx — dark theme
- Panel izquierdo: `bg-[#0A0A0F]`, inputs oscuros, botón `#FF2E88`
- Panel derecho: `bg-[#0D0D17]` con mockup WhatsApp (Login) o cards de seguridad (ForgotPassword)
- Committed y pushed

#### AISettings.tsx — light theme + banner sky
- Completamente reescrito: theme claro (`bg-white`, `bg-gray-50`, `text-gray-900`)
- Banner: `bg-gradient-to-br from-sky-500 to-sky-700` con label "AGENTE IA"
- Committed y pushed

#### Integrations.tsx — light theme + banner sky
- Completamente reescrito con theme claro
- Banner: `bg-gradient-to-br from-sky-500 to-sky-700` con label "AGENTE IA"
- Committed y pushed

#### Settings.tsx — limpieza de tabs AI/Integraciones
- Removidas tabs "Inteligencia Artificial" y "Integraciones" del sidebar (ahora son páginas propias)
- Removidas 555+ líneas de JSX de los tabs eliminados (bloque AI y bloque Integraciones)
- Removidas funciones huérfanas: copyWebhookUrl, handleBuyCredits, saveIntegrations, openWebhookModal, closeWebhookModal, handleSaveWebhook, handleDeleteWebhook, handleToggleWebhook, handleTestWebhook, toggleWebhookEvent, handleSaveAI
- Removidos state setters huérfanos del fetchSettings (AI/webhook setters)
- Conservado `paymentRegion` state (usado en tab Suscripción)
- Build TypeScript limpio (0 errores)

#### lemonsqueezy-create-checkout/index.ts — paridad con Vetly
- Agregados plan IDs: core, starter, pro, enterprise + aliases de retrocompatibilidad (essence→starter, radiance→pro, prestige→enterprise)
- Agregados tipos: reminders (per-unit), reminders_50, reminders_350, reminders_unlimited, campaign_credits
- Lógica custom_price: recordatorios = units×15 cents, campañas = credits×15 cents
- Variant IDs de recordatorios/campañas vacíos — deben configurarse en LS dashboard de Citenly

#### src/lib/lemonsqueezy.ts — actualización de packs recordatorios
- ReminderPackId: `'reminders_50' | 'reminders_350' | 'reminders_unlimited'` (antes `reminder_100/300/500`)
- REMINDER_PACKS: Pack Básico $9/50, Pack Estándar $19/350, Pack Ilimitado $29/9999
- Agregada función `redirectToLemonCampaignCreditsCheckout`

#### Reminders.tsx — fix IDs y display
- Actualizado clpPrice mapping a nuevos IDs
- Display de créditos: `∞` para packs ilimitados

---

## Estado actual de configuración

### verify_jwt en supabase/config.toml
```
ycloud-whatsapp-webhook: false   (webhook externo)
mercadopago-webhook: false       (webhook externo)
ycloud-templates: false
get-ycloud-templates: false
create-ycloud-template: false
chat-agent: false                (llamado desde browser)
ai-simulator: false              (llamado desde browser)
cron-process-reminders: false    (invocado por pg_cron)
cron-process-surveys: false      (invocado por pg_cron)
```

**Regla permanente:** cualquier Edge Function invocada por un webhook externo (YCloud, MercadoPago, LemonSqueezy) o por pg_cron necesita `verify_jwt = false`. Si no está configurado en `config.toml`, Supabase bloquea las requests con 401 antes de que lleguen al código y **no aparecen en los logs de la función**.

---

## Tareas pendientes

### Alta prioridad — seguridad
- [ ] **HMAC per-clínica en webhook:** implementar `verifyYCloudSignature(rawBody, header, secret)` donde el secret viene de `clinic_settings.ycloud_webhook_secret`. Requiere migración DB (`ALTER TABLE clinic_settings ADD COLUMN ycloud_webhook_secret TEXT`) y campo en Settings → WhatsApp.
- [ ] **Deploar webhook modificado** — `ycloud-whatsapp-webhook/index.ts` tiene cambios locales sin deployar (`M` en git status)
- [ ] **Deploar** `send-whatsapp-message` (nuevo Edge Function creado pero no deployado)
- [ ] **Deploar** `cron-monthly-credit-recharge` (corregido, no deployado)
- [ ] **Deploar** `cron-process-surveys` (corregido, no deployado)
- [ ] **Auditar tablas sin políticas RLS** — verificar en `information_schema` que todas las tablas con RLS habilitada tengan al menos una política SELECT

### Alta prioridad — bugs
- [ ] **ai-simulator** — migrar de API deprecada `functions`/`function_call` a `tools`/`tool_choice`
- [ ] **cron-process-reminders** — verificar si usa `.maybeSingle()` en check de idempotencia (bug que afectó a Vetly — causa duplicados)
- [ ] **reminder_settings** — cambiar `DEFAULT true` a `DEFAULT false` en columnas de recordatorios para nuevas clínicas
- [ ] **CRM kanban** — primera columna debe capturar también `stage_id === null` como red de seguridad
- [ ] **Loyalty Magic Link** — `copyReferralLink` copia URL interna `/r/{code}` que no existe. Generar `https://wa.me/{ycloud_phone}?text=...` en su lugar
- [ ] **Eliminar** 2 registros duplicados de Elizabeth Microblading de la DB

### Media prioridad — UX/diseño
- [ ] **Banners degradado pendientes** — agregar banner estilo Vetly (label sección + título H1 + stats) a las páginas restantes:
  - Sky (`from-sky-500 to-sky-700`): Dashboard, Mensajes, Plantillas, KnowledgeBase ← ya hecho en AISettings e Integrations
  - Pink (`from-[#FF2E88] to-[#c0236a]`): Patients/Contactos, CRM, Appointments, Reminders, RetentionEngine, Finance
  - Violet (`from-violet-500 to-violet-700`): Campaigns, Loyalty
  - Amber (`from-amber-500 to-amber-700`): Settings
- [ ] **Dashboard** — tarjetas con cabecera de degradado coloreada por área
- **Colores de sección del DashboardLayout** (para banners):
  - Principal/Citas/Pacientes/Mensajes: `from-sky-500 to-sky-700`
  - Clínica/CRM/Pacientes/Citas/Recordatorios: `from-[#FF2E88] to-[#c0236a]`
  - Marketing/Campañas/Fidelización: `from-violet-500 to-violet-700`
  - Finanzas: `from-emerald-500 to-emerald-700`
  - Configuración: `from-amber-500 to-amber-700`

### Media prioridad — monetización
- [ ] **Subscription `manually_active`** — columna para clínicas que pagan por transferencia bancaria (`UPDATE subscriptions SET manually_active = true WHERE clinic_id = '...'`)
- [ ] **CRM auto-cierre** — `pg_cron` que mueve prospectos con `appointment_date < NOW()` al stage "Cerrado" (diariamente 06:00 UTC)
- [ ] **Packs de créditos de campaña** — sistema de compra via LemonSqueezy (`campaign_credits_balance` en subscriptions)

### Baja prioridad — deuda técnica
- [ ] **Modernizar imports** en Edge Functions restantes (las que aún usen `deno.land/std@0.168.0` o `esm.sh` en lugar de `jsr:` / `npm:`)
- [ ] **Eliminar** `console.log` de producción (~299 en el webhook)
- [ ] **`getConversations()`** en `supabase.ts` — carga todos los mensajes sin paginación (función no usada actualmente pero podría serlo)
- [ ] **React Query** — infraestructura lista en `main.tsx` (`QueryClientProvider`), pendiente adoptar en fetches de componentes
- [ ] **`switchClinic()`** en `AuthContext.tsx` usa `window.location.reload()` — reemplazar por reset de estado limpio
- [ ] **Configurar Resend** para emails transaccionales

---

## Arquitectura HQ

Las rutas `/hq/*` están completamente aisladas de `AuthProvider` (usan `AdminAuthProvider` separado).

### Páginas HQ
- `AdminDashboard` — métricas globales de todas las clínicas
- `AdminCalendar` — calendario de demos/reuniones
- `AdminMessages` — mensajes HQ
- `AdminClinics` — gestión de clínicas registradas
- `AdminSettings` — configuración del agente de ventas y sistema

### Agente HQ (pendiente implementar para Citenly)
El `chat-agent` existe pero es un chat de ventas básico. Vetly implementó un agente completo con:
- Tool `agendar_videollamada` — agenda demos y notifica al fundador por WhatsApp
- Tool `registrar_lead` / `escalar_lead_caliente`
- Prompt editable desde DB (sin redesploy)
- `cron-system-health` — monitoreo cada 6h, alerta por WhatsApp si hay problemas
Adaptar para Citenly cuando se requiera escalar ventas.

---

## Notas de desarrollo

### Supabase MCP
El MCP conecta al proyecto `ehmncwawzdciajvuallg` (Vetly), **no a Citenly** (`hubjqllcmbzoojyidgcu`). Para queries directas a producción de Citenly, usar scripts Node.js con `.env` o el CLI de Supabase:
```bash
supabase db execute --project-ref hubjqllcmbzoojyidgcu -f query.sql
```

### Deploy de Edge Functions
```bash
supabase functions deploy <nombre-funcion> --project-ref hubjqllcmbzoojyidgcu
```
Para funciones que necesiten `verify_jwt = false`, asegurarse de tener la entrada en `supabase/config.toml` antes de deployar.

### Variables de entorno requeridas en Edge Functions
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` — modelo principal
- `OPENROUTER_API_KEY` — fallback
- `GOOGLE_AI_API_KEY` — fallback Gemini
- `YCLOUD_API_KEY` — para funciones que envían mensajes directamente
- `MERCADOPAGO_ACCESS_TOKEN` — webhook de pagos
- `LEMONSQUEEZY_SECRET_KEY` — webhook de pagos internacional

### Regla de negocios en KB, no en código
Las reglas de **negocio** (precios, horarios, protocolos de servicio) van en documentos de `knowledge_base`. El campo `ai_behavior_rules` en `clinic_settings` solo debe contener reglas **técnicas a nivel app** (cómo usar tools, formato de respuesta, restricciones del sistema). No duplicar lógica de negocio entre ambos.

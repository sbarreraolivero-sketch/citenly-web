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
- **Deployado** en producción (sesión 5) — incluye filtro franja horaria, fix AM/PM, flujo de pago condicional y soporte `ai_credits_unlimited`

### Sistema de créditos AI

**Columnas en `clinic_settings`:**
- `ai_credits_used`: contador acumulado del ciclo actual (siempre se incrementa, incluso para unlimited)
- `ai_credits_limit`: cupo mensual del plan (no cambia entre ciclos)
- `ai_credits_extra`: créditos extra vigentes (comprados o cargados desde HQ)
- `ai_credits_extra_expires_at`: fecha de vencimiento de los extras (NULL = sin vencimiento)
- `ai_credits_balance`: saldo calculado disponible (solo para clínicas no-unlimited)
- `ai_credits_unlimited`: boolean DEFAULT false — si `true`, la IA nunca se silencia por créditos
- `parent_clinic_id`: UUID autorreferencial — si está seteado, la clínica es sucursal y comparte el pool de créditos del padre

**Lógica del check (en el webhook):**
1. Si la clínica tiene `parent_clinic_id`, cargar la clínica padre como `creditPool`
2. Si `creditPool.ai_credits_unlimited = true` → no hay corte, continuar
3. Si `creditPool.ai_credits_extra_expires_at < NOW()` → tratar extras como 0 y limpiarlos en background
4. Si `creditPool.ai_credits_used >= ai_credits_limit + extraBalance` → silenciar IA
5. Siempre actualizar `ai_credits_used` en el pool (incluso si unlimited — para tracking)
6. Insertar registro en `ai_credit_transactions` con `source_clinic_id` si es sucursal

**Expiración de créditos extra (30 días):**
- Al comprar un pack (MP o LS): `ai_credits_extra_expires_at = NOW() + 30 días`
- Al cargar desde HQ: ídem — mismo comportamiento que compra real
- `cron-expire-extra-credits`: corre diariamente, zeroes out extras vencidos y registra transacción `adjustment`

**Cron mensual:** `cron-monthly-credit-recharge` resetea `ai_credits_used = 0` el día de aniversario de cada clínica. No toca `ai_credits_extra` (los extras tienen su propio ciclo de 30 días).

**Tabla `ai_credit_transactions`:** registra consumos (type=`usage`), recargas (type=`monthly_refill`), compras (type=`purchase`), ajustes/expiraciones (type=`adjustment`). Tiene RLS SELECT para `clinic_members`. El desglose por modelo (tier 1/2/3) en `AISettings.tsx` se calcula desde esta tabla.

**Pool multi-sucursal:** configurar con `UPDATE clinic_settings SET parent_clinic_id = '<id_padre>' WHERE id = '<id_sucursal>'`. Los créditos se leen y descontan siempre del padre.

**Caso Elizabeth Microblading:** ID `1ab32091-210c-4525-a7e1-e6a7dca1c8c6`. Clínica de la esposa del fundador — `ai_credits_unlimited = true` permanente. `ai_credits_extra = 0`, `ai_credits_extra_balance = 0` (limpiados en sesión 5). Hay 2 registros duplicados pendientes de eliminar.

### Otras Edge Functions relevantes

| Función | Rol | verify_jwt |
|---|---|---|
| `ai-simulator` | Simulador del AI agent para el dashboard | false |
| `chat-agent` | Chat ventas/soporte del sitio citenly.com | false |
| `cron-monthly-credit-recharge` | Resetea `ai_credits_used=0` el día de aniversario de cada clínica | false |
| `cron-process-reminders` | Recordatorios de citas (24h y 2h antes) | false |
| `cron-process-surveys` | Encuestas post-cita vía WhatsApp template | false |
| `cron-expire-extra-credits` | Zeroes out ai_credits_extra vencidos, registra adjustment | false |
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

### Cambios realizados — mayo 2026 (sesión 3)

#### Landing.tsx — fix módulos
- Eliminada línea "Todas estas funcionalidades incluidas desde el Plan Core · US$39/mes" (Plan Core no incluye todas las funciones listadas)

#### Reminders.tsx — toggle Confirmación
- Agregado toggle "Confirmación" que reutiliza el campo DB `reminder_1h_before` con label semántico distinto
- Agregada TemplateSelector para plantilla de confirmación (`template_1h`)
- Banner actualizado: "WhatsApp automático: 24h antes, 2h antes y solicitud de confirmación."
- Los 3 toggles activos: `reminder_24h_before`, `reminder_2h_before` (confirmación 24/2h), `reminder_1h_before` (confirmación de cita)

#### Finance.tsx — rediseño completo
- **Tab Resumen:** barras de proporción ingresos/gastos, ganancia neta, margen %, citas cobradas — reemplaza placeholder "Próximamente"
- **Tab Transacciones:** filtro "Bloqueo de Agenda" aplicado al cargar datos (centralizado en `setTransactions`), edición inline de monto (ícono lápiz → input con Enter/Escape), botón "Cobrar" en lugar de "Registrar Pago"
- **Tab Gastos / Otros Ingresos:** filas card-style con avatar icon, badge categoría, botón trash; acceso rápido "Nuevo Gasto"/"Nuevo Ingreso" en headers
- **Modal Ingresos:** selector de clienta con autocomplete (debounced 250ms, consulta tabla `patients`); nombre de clienta guardado en campo `description` como `"${desc} — Clienta: ${nombre}"` (la tabla `incomes` no tiene `patient_id`)
- **Modal Gastos:** rediseñado al mismo estilo moderno (`bg-black/50`, `z-[9999]`, `rounded-2xl`, tema rojo)
- **Patrón de filtro:** `setTransactions((data || []).filter(tx => tx.patient_name !== 'Bloqueo de Agenda'))` — aplicar UNA SOLA VEZ al cargar, no repetir en el JSX
- Usa `financeService.updateTransactionPrice(appointmentId, price)` para edición inline de montos

#### HQ AdminClinics.tsx — dark theme + créditos IA universales
- **Tema oscuro completo:** todas las cards usan `bg-gray-800`, `border-gray-700`, `text-white`, compatible con `bg-gray-950` del AdminLayout
- **Títulos de sección:** `text-white font-bold` con ícono `#FF2E88` — antes eran `text-gray-500` ilegibles sobre fondo oscuro
- **AdminAIUsage reescrito:** una sola barra universal `Usados / (Límite Plan + Extra)` — elimina split mini/GPT-4o
- **Métricas universales:** Créditos Usados · Límite Plan · Extra · Disponibles en una fila
- **Carga manual unificada:** actualiza `ai_credits_extra` + `ai_credits_extra_balance` (ambas columnas para compatibilidad)
- **Fetch extendido:** incluye `ai_credits_used`, `ai_credits_limit`, `ai_credits_extra` + fallback a `ai_credits_monthly_limit`, `ai_credits_extra_balance`
- `planLabels` incluye `essence/radiance/prestige/basic` para clínicas con planes legacy

### Cambios realizados — mayo 2026 (sesión 4)

#### AuthContext.tsx — fix pantalla en blanco al entrar a la app
- **Bug:** `clinics` state inicializaba con `null` (en vez de `[]`) cuando no había caché en localStorage
- **Causa del crash:** `BranchSwitcher.tsx` llama `.find()`, `.some()` y `.map()` sobre `clinics` sin null check → TypeError → React mostraba pantalla en blanco
- **Fix:** `return cached ? JSON.parse(cached) : null` → `return cached ? JSON.parse(cached) : []`
- **Patrón:** al refrescar funcionaba porque la segunda carga ya tenía clínicas en localStorage (pobladas en la carga anterior antes del crash)

#### ycloud-whatsapp-webhook — filtro de franja horaria (mañana/tarde)
- **Problema:** servicios con slots de 15 minutos (ej: evaluaciones) generaban 30+ horarios de golpe, confundiendo a la clienta
- **Fix código:** `checkAvail` acepta nuevo parámetro `timeOfDay?: string`; filtra slots `< 13:00` para `morning` y `>= 13:00` para `afternoon` ANTES del `.map()` de formato
- **Fix tool:** `check_availability` tiene nuevo parámetro `time_of_day: "morning" | "afternoon"` (opcional, con enum)
- **Fix processFunc:** pasa `args.time_of_day` al llamar `checkAvail`
- **Fix prompt (universal — todas las clínicas):** nueva regla en el flujo de reserva: preguntar "¿Prefieres mañana o tarde?" ANTES de llamar `check_availability` si el paciente no lo especificó. Si ya lo indicó (ej: "después de las 4"), usarlo directamente sin preguntar.

#### ycloud-whatsapp-webhook — fix flujo de pago (no hardcodear abono)
- **Problema:** el paso de reserva mencionaba "abono de $10.000" para todas las clínicas, pero eso es exclusivo de Elizabeth Microblading
- **Fix prompt:** el paso de confirmación/pago ahora es condicional sobre `clinic.transfer_details`:
  - Si tiene `transfer_details` → instrucción de pago con los datos reales
  - Si no → solo confirma la cita al paciente sin mencionar pago
- **Letras de pasos corregidas:** a) Franja horaria, b) Slots, c) Selección/Nombre, d) Registro (`create_appointment`), e) Confirmación/Pago

#### ycloud-whatsapp-webhook — fix parser AM/PM en `createAppt`
- **Síntoma:** `create_appointment` fallaba silenciosamente → agente decía "el horario se acaba de ocupar"
- **Causa raíz:** regex `/\d{1,2}:\d{2}/` extraía `"5:00"` de `"5:00 PM"` e ignoraba el PM → padding → `"05:00"` (5 AM). `requestedTimeLabel` = `"5:00 AM"` ≠ slot disponible `"5:00 PM"` → `isTimeAvailable = false` → `success: false`
- **Fix:** nuevo regex `/(\d{1,2}):(\d{2})\s*(AM|PM|a\.m\.|p\.m\.)?/i` que convierte correctamente: `"5:00 PM"` → `"17:00"`, `"12:00 AM"` → `"00:00"`, `"17:00"` → `"17:00"` (sin cambios)
- **Cobertura:** maneja `"5:00 PM"`, `"5:00 p.m."`, `"17:00"`, `"17:00 PM"`, `"12:00 AM"`, `"9:00 AM"` → siempre produce `HH:MM` en 24h

### Cambios realizados — mayo 2026 (sesión 5)

#### AISettings.tsx — fix consumo de créditos (bug crítico)
- **Bug:** el código calculaba `totalUsed` contando mensajes por `ai_model` (`'4o_standard'`, `'mini'`, etc.), pero esos strings no coincidían con los valores reales que guarda el webhook → siempre mostraba 0
- **Fix:** ahora lee `ai_credits_used` directamente de `clinic_settings` (fuente de verdad)
- Eliminadas las 3 queries de conteo de mensajes por modelo (lentas e incorrectas)
- Nuevo bloque de métricas: **Usados · Límite Plan · Extra · Disponibles** (4 cards)
- Alerta roja cuando `creditsAvailable <= 0` explicando que el agente está en pausa
- Si `ai_credits_unlimited = true`: muestra badge violeta "Ilimitado" y vista simplificada (Usados / ∞)

#### AdminClinics.tsx (HQ) — soporte ai_credits_unlimited + refresh
- Fetch REST incluye `ai_credits_unlimited` en el select
- `AdminAIUsage`: nuevo estado `liveUsed` + función `refreshData()` que relee `ai_credits_used` desde la DB sin recargar toda la página; botón ↻ junto al porcentaje
- Cuando `unlimited = true`: banner violeta, métricas con `∞`, barra 100% violeta, texto explicativo

#### Sistema ai_credits_unlimited — implementación completa
- **DB:** `ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS ai_credits_unlimited boolean DEFAULT false`
- **Webhook:** check de créditos envuelto en `if (!clinic.ai_credits_unlimited)` — si es `true`, salta corte y no decrementa `ai_credits_used`. El cron mensual sigue reseteando el contador para todas las clínicas.
- **Elizabeth Microblading:** `ai_credits_unlimited = true`, `ai_credits_extra = 0`, `ai_credits_extra_balance = 0`
- **Webhook deployado** a producción con todos los cambios acumulados de sesiones 4 y 5

#### Notas de desarrollo — corrección sintaxis CLI
- `supabase db query --linked "<SQL>"` es la sintaxis correcta para queries remotas
- `supabase db execute --project-ref` **no existe** en la versión instalada

### Cambios realizados — mayo 2026 (sesión 6)

#### Sistema de créditos AI — refactor completo
- **RLS `ai_credit_transactions`:** tabla tenía RLS activo sin políticas → frontend recibía array vacío. Fix: `CREATE POLICY clinic_members_select FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid()))`
- **`AISettings.tsx` — fix consumo real:** contaba mensajes por `ai_model` (siempre 0). Fix: lee `ai_credits_used` de `clinic_settings`. Para cuentas unlimited, `totalUsed` se calcula desde transacciones (`t1×1 + t2×8 + t3×60`)
- **Desglose por modelo:** nueva sección "Consumo por Modelo" con cards por tier (Mini ×1, Standard ×8, Pro ×60) leyendo `ai_credit_transactions` desde el 1 del mes en UTC
- **Tracking siempre activo:** webhook siempre incrementa `ai_credits_used` aunque sea unlimited (solo omite decrementar `ai_credits_balance`)
- **`ai_credits_unlimited`:** flag boolean en DB + webhook + frontend (badge violeta + vista ∞)

#### Expiración de créditos extra (30 días)
- **DB:** `ai_credits_extra_expires_at timestamptz DEFAULT NULL`
- **Webhook:** verifica expiración antes del check; si vencido trata extras=0 y limpia en background
- **`mercadopago-webhook` + `lemonsqueezy-webhook`:** al activar pack → `ai_credits_extra_expires_at = NOW()+30d` + insert en `ai_credit_transactions` type=`purchase`
- **`cron-expire-extra-credits`:** nueva función diaria; limpia extras vencidos + registra `adjustment`
- **HQ AdminClinics `handleAddCredits`:** también setea `expires_at = NOW()+30d` (créditos por transferencia = mismas reglas que compra)
- **UI HQ:** muestra "Vence DD MMM" o "Sin vencimiento" bajo el contador de extras

#### Pool multi-sucursal (`parent_clinic_id`)
- **DB:** `parent_clinic_id UUID REFERENCES clinic_settings(id) DEFAULT NULL`
- **Webhook `getClinic()`:** si detecta `parent_clinic_id`, carga el padre y lo almacena en `_creditSource`; el check, el update y el insert en transacciones operan sobre el pool (padre)
- **`AISettings.tsx`:** si la clínica tiene `parent_clinic_id`, hace segunda query al padre para mostrar créditos del pool compartido
- **Activar sucursal:** `UPDATE clinic_settings SET parent_clinic_id = '<id_padre>' WHERE id = '<id_sucursal>'`

### Cambios realizados — mayo 2026 (sesión 8)

#### Historial de créditos integrado en AISettings
- **Ruta `/app/ai-credits` eliminada** de `App.tsx` — la página `AICredits.tsx` ya no está en el router
- **`AITransactionHistory` integrado al final de `AISettings.tsx`** — el historial ahora vive dentro de Ajustes IA
- **Selector de mes** (últimos 6 meses) con re-fetch automático al cambiar
- **Cards de resumen** por mes: Créditos usados · Mensajes IA · Recargado · Ajustes

#### Fix de inconsistencia en el total de créditos consumidos
- **Bug:** `totalUsed` para cuentas unlimited multiplicaba conteos de tier por costos fijos (`t3 × 60`), dando 8,610 cuando el real era diferente
- **Fix 1:** `tierBreakdown` ahora acumula costos reales (`c1`, `c2`, `c3`, `total`) desde el campo `amount` de la DB, no desde multiplicación de conteos
- **Fix 2:** `totalUsed = tierBreakdown.total` — suma de `abs(amount)` de **todas** las transacciones del mes, incluyendo las que no tienen `metadata.tier`
- Resultado: "Usados este ciclo" en Ajustes IA y "Créditos usados" en el historial muestran el mismo número

#### Fix resumen historial — query sin límite para totales
- **Bug:** el historial tenía `.limit(200)` en la query, lo que hacía que las cards de resumen sumaran solo las 200 transacciones más recientes (incompleto si hay más)
- **Fix:** dos queries separadas — una **sin límite** para los totales del resumen, otra con `.limit(200)` para la tabla de display
- Footer ahora muestra **"Mostrando N de M transacciones de \{mes\}"** dejando claro que la tabla es un subset

### Cambios realizados — mayo 2026 (sesión 7, cierre)

#### Deployos pendientes ejecutados
- `send-whatsapp-message`, `cron-monthly-credit-recharge`, `cron-process-surveys` — todos deployados

#### pg_cron `cron-expire-extra-credits` configurado
- Job ID 16, schedule `0 2 * * *`, llama a la función sin Authorization header (verify_jwt=false)
- Comando: `SELECT net.http_post(url := 'https://hubjqllcmbzoojyidgcu.supabase.co/functions/v1/cron-expire-extra-credits', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)`

#### Auditoría RLS completada
- Tablas sin políticas encontradas: `demo_requests` (tabla HQ interna, se deja bloqueada) y `dental_procedures`
- Fix: `CREATE POLICY clinic_members_select ON dental_procedures FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid()))`

#### reminder_settings — defaults corregidos
- `reminder_24h_before` y `reminder_2h_before`: `DEFAULT true` → `DEFAULT false` en tabla `reminder_settings`
- Las clínicas nuevas ya no tendrán recordatorios activos por defecto

#### Bugs verificados como ya resueltos
- **CRM kanban:** línea 613 ya tiene `p.stage_id === stage.id || (stageIdx === 0 && !p.stage_id)` ✓
- **Loyalty Magic Link:** `copyReferralLink` ya genera `https://wa.me/{phone}?text=...` cuando hay `ycloud_phone_number` ✓
- **Elizabeth duplicados:** solo existe 1 registro activo (ID `1ab32091-210c-4525-a7e1-e6a7dca1c8c6`) — los duplicados ya no estaban ✓
- **cron-process-reminders idempotencia:** ya usa `.limit(1)` en lugar de `.maybeSingle()`, con comentario explícito ✓

---

## Estado actual de configuración

### verify_jwt en supabase/config.toml
```
ycloud-whatsapp-webhook: false       (webhook externo)
mercadopago-webhook: false           (webhook externo)
ycloud-templates: false
get-ycloud-templates: false
create-ycloud-template: false
chat-agent: false                    (llamado desde browser)
ai-simulator: false                  (llamado desde browser)
cron-process-reminders: false        (invocado por pg_cron)
cron-process-surveys: false          (invocado por pg_cron)
cron-expire-extra-credits: false     (invocado por pg_cron)
```

**Regla permanente:** cualquier Edge Function invocada por un webhook externo (YCloud, MercadoPago, LemonSqueezy) o por pg_cron necesita `verify_jwt = false`. Si no está configurado en `config.toml`, Supabase bloquea las requests con 401 antes de que lleguen al código y **no aparecen en los logs de la función**.

---

## Tareas pendientes

### Media prioridad — monetización
- [ ] **Subscription `manually_active`** — columna para clínicas que pagan por transferencia bancaria (`UPDATE subscriptions SET manually_active = true WHERE clinic_id = '...'`)
- [ ] **CRM auto-cierre** — `pg_cron` que mueve prospectos con `appointment_date < NOW()` al stage "Cerrado" (diariamente 06:00 UTC)
- [ ] **Packs de créditos de campaña** — sistema de compra via LemonSqueezy (`campaign_credits_balance` en subscriptions); la función `redirectToLemonCampaignCreditsCheckout` ya existe en `lemonsqueezy.ts`, falta el balance en DB

### Baja prioridad — deuda técnica
- [ ] **Eliminar** `console.log` de producción (~299 en el webhook)
- [ ] **`getConversations()`** en `supabase.ts` — carga todos los mensajes sin paginación (función no usada actualmente pero podría serlo)
- [ ] **React Query** — infraestructura lista en `main.tsx` (`QueryClientProvider`), pendiente adoptar en fetches de componentes
- [ ] **`switchClinic()`** en `AuthContext.tsx` usa `window.location.reload()` — reemplazar por reset de estado limpio
- [ ] **Configurar Resend** — `send-invite-email` ya llama a Resend, solo falta configurar `RESEND_API_KEY` como secret en Supabase y verificar dominio de envío

## Tareas completadas (verificadas en sesión 9)

- [x] **HMAC per-clínica en webhook** — `verifyYCloudSignature` implementado; permissive onboarding si no hay secret configurado
- [x] **ai-simulator migrar a tools/tool_choice** — ya usa `tools` array y `tool_choice: "auto"`
- [x] **Banners degradado en todas las páginas** — todas las páginas tienen banners con gradientes
- [x] **Dashboard tarjetas con cabecera degradado** — cards con `bg-gradient-to-br` por área
- [x] **Créditos IA por plan** (sesión 9) — Starter: 4.000, Pro: 8.000, Enterprise: 16.000 en `Landing.tsx`, `mercadopago.ts` y `lemonsqueezy.ts`
- [x] **Bug columna créditos** (sesión 9) — `signup-handler`, `mercadopago-webhook` y `lemonsqueezy-webhook` escribían en `ai_credits_monthly_limit` (columna incorrecta); corregido a `ai_credits_limit` que es la que lee el cron y el frontend. Valores actualizados a 4000/8000/16000 con soporte para IDs legacy (essence/radiance/prestige)
- [x] **Cron tabla incorrecta** (sesión 9) — `cron-monthly-credit-recharge` insertaba en `ai_credits_ledger`; corregido a `ai_credit_transactions` con `type: 'monthly_refill'`
- [x] **Imports modernizados** (sesión 9) — `chat-agent`, `send-whatsapp-campaign`, `send-whatsapp-message` migrados de `deno.land/std@0.168.0`/`esm.sh` a `jsr:`/`npm:` y `Deno.serve`

### Nota sobre deploy de sesión 9
Las siguientes funciones fueron modificadas y requieren deploy:
- `signup-handler` — nueva columna `ai_credits_limit`, valores nuevos
- `mercadopago-webhook` — nueva columna `ai_credits_limit`, valores nuevos
- `lemonsqueezy-webhook` — nueva columna `ai_credits_limit`, valores nuevos
- `cron-monthly-credit-recharge` — tabla corregida a `ai_credit_transactions`
- `send-whatsapp-message` — imports modernizados
- `send-whatsapp-campaign` — imports modernizados
- `chat-agent` — imports modernizados

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
# Query directo (el proyecto debe estar linked)
supabase db query --linked "<SQL>"

# Script Node.js con service role key
node -e "require('dotenv').config({path:'.env'}); ..."
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

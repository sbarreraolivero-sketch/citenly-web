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

**Estado actual del webhook (junio 2026):**
- Usa imports modernizados (`jsr:`, `npm:`)
- Tiene `callGemini`, `callOpenRouter`, `callOpenAI` (routing híbrido sin `selectModelTier` formal)
- **Sin HMAC per-clínica** — pendiente implementar (ver Tareas pendientes)
- **Deployado** en producción (sesión 15) — incluye auto-cancelación silenciosa en `requires_human`, fix `rescheduleAppt` con `pending_deposit`, regla 9.5 de cancelaciones en prompt

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

**Tabla `ai_credit_transactions`:** registra consumos (type=`usage`), recargas (type=`monthly_refill`), compras (type=`purchase`), ajustes/expiraciones (type=`adjustment`). Tiene RLS SELECT para `clinic_members`. El desglose por modelo en `AISettings.tsx` se calcula desde esta tabla.

**Costos por tier (TIER_COSTS en webhook):**
- Tier 1 — GPT-4o Mini: **×1 crédito** — saludos, consultas simples, confirmaciones
- Tier 2 — GPT-4o Pro: **×8 créditos** — agendamientos, disponibilidad, ventas
- Tier 3 — GPT-4o Pro: **×15 créditos** — imágenes, verificación de pago, casos complejos (era ×60 antes de sesión 14)

**Display en AISettings.tsx:** 2 cards (Mini + Pro). Tier 2 y Tier 3 se muestran combinados como "GPT-4o Pro" (mensajes = t2+t3, créditos = c2+c3). El routing híbrido sigue usando 3 tiers internamente.

**Referencia real:** 4.000 créditos ≈ 200–250 conversaciones/mes (dato calculado desde cuenta Elizabeth Microblading, 1.548 conversaciones históricas, promedio 16,2 créditos/conversación).

**Pool multi-sucursal:** configurar con `UPDATE clinic_settings SET parent_clinic_id = '<id_padre>' WHERE id = '<id_sucursal>'`. Los créditos se leen y descontan siempre del padre.

**Caso Elizabeth Microblading:** ID `1ab32091-210c-4525-a7e1-e6a7dca1c8c6`. Clínica de la esposa del fundador — `ai_credits_unlimited = true` permanente. `ai_credits_extra = 0`, `ai_credits_extra_balance = 0` (limpiados en sesión 5). Los duplicados verificados en sesión 7 ya no existían — solo hay 1 registro activo.

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

### Concurrencia — el debounce no basta por sí solo (sesión 31)
El webhook espera 15 s antes de procesar y ahí comprueba "¿soy el último mensaje?". Pero **generar la respuesta tarda varios segundos más** (modelo + tools), y en esa ventana puede llegar otro mensaje del cliente: la respuesta ya construida se envía igual, con contexto incompleto, y aparecen dos respuestas seguidas que se contradicen. Basta 1 segundo de diferencia para que ocurra (caso `+56962662379`, 26-jul).

**Regla:** toda respuesta debe re-verificar **justo antes de enviarse** que no llegó un inbound más nuevo; si llegó, se descarta y responde la ejecución que tiene el contexto completo. Cualquier trabajo asíncrono largo que termine en un envío al cliente necesita ese segundo chequeo, no solo el de entrada.

**Corolario:** un historial con la misma frase repetida arrastra al modelo a repetirla otra vez, incluso ignorando lo que el cliente acaba de elegir. Por eso existe también el candado que impide reenviar un texto idéntico al último outbound: corta el bucle antes de que se realimente.

### Servicios — el nombre es funcional, no cosmético (sesión 31)
`createAppt` y `checkAvail` resuelven el servicio con `ilike %nombre%` + `.limit(1)` **sin `order by`**. Si dos servicios de la misma clínica hacen match con el texto que pasó la IA, el elegido es **indeterminado** — y como `createAppt` toma el `price` del servicio, una cita puede quedar registrada con el precio equivocado. Al crear servicios con nombres que se solapan (variantes, promociones, duplicados por duración), **verificar el `ilike` contra producción antes de darlos por buenos**, y exigir en el prompt el nombre exacto de la lista de Servicios OFICIALES.

Corolario: cualquier servicio con precio especial que no deba ofrecerse a todo el mundo necesita un **candado de código**, no solo una regla de prompt — la tabla `services` completa se inyecta al system prompt y `get_services` la devuelve entera. Ver `isPromoService()` en el webhook.

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
Citenly usa `core` / `starter` / `pro` / `enterprise` como IDs de plan en el frontend y en los webhooks de pago. Los IDs legacy `essence` / `radiance` / `prestige` aún pueden existir en la DB para clínicas antiguas — usar `normalizePlanId()` que mapea `essence→starter`, `radiance→pro`, `prestige→enterprise`.

**Precios vigentes (junio 2026):**
| Plan | USD/mes | CLP/mes | USD anual | Créditos IA |
|---|---|---|---|---|
| Core | $39 | $33.000 | — | 0 |
| Starter | $97 | $92.000 | $931 | 4.000 |
| Pro | $167 | $159.000 | $1.603 | 8.000 |
| Enterprise | $297 | $282.000 | $2.851 | 20.000 |

**Créditos vs citas (aclaración del fundador, sesión 25):** los **créditos IA son finitos** en todos los planes (Starter 4.000 · Pro 8.000 · Enterprise 20.000). Lo **ilimitado en Pro/Enterprise son las CITAS** (`monthlyAppointmentsMonthly: -1`), no los créditos. NO usar "Conversaciones ilimitadas" en el copy de Enterprise — consume créditos finitos. Única excepción de créditos ilimitados: clínicas con `ai_credits_unlimited = true` seteado manualmente (ej: Elizabeth).

**Orden de presentación en UI:** Enterprise → Pro → Starter → Core (efecto de anclaje).
**Descuento anual:** 20% (2 meses gratis). `getPrice()` usa `base * 0.8` para el mensual en modo anual.

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

### Cambios realizados — junio 2026 (sesión 12)

#### Fix: carga de créditos extra desde HQ no persistía en DB

**Síntoma:** al cargar créditos a una clínica desde `AdminClinics.tsx`, el alert decía "cargados correctamente" y el contador se actualizaba visualmente, pero al refrescar la página volvía al valor anterior.

**Causa raíz:** `handleAddCredits` usaba `supabase.from('clinic_settings').update()` — el cliente JS con el JWT del admin HQ. Las RLS policies de `clinic_settings` solo permiten escritura al miembro de esa clínica, no al admin HQ. Supabase silencia el fallo: retorna `{ error: null }` aunque actualice 0 filas, así que el código nunca detectaba el problema y actualizaba el estado local igual.

**Fix en `AdminClinics.tsx`:**
- `handleAddCredits` ahora usa `fetch()` con método `PATCH` directo a la REST API (mismo patrón que `fetchClinics`)
- Si el servidor retorna status no-OK, lanza error real con el body
- Después del PATCH llama `refreshData()` para leer el valor desde la DB y confirmar que realmente se guardó
- `refreshData` también migrado al patrón REST para consistencia
- Agregado estado `liveExpiresAt` (antes era solo prop sin estado local) — ahora la fecha de vencimiento se actualiza visualmente al cargar créditos sin recargar página

#### Fix: `CreditWarningBanner` aparecía para clínicas con créditos ilimitados

**Síntoma:** Elizabeth Microblading (`ai_credits_unlimited = true`) veía el banner "¡Citenly Credits agotados! La IA ha dejado de responder" aunque la IA nunca se apaga para cuentas unlimited.

**Causa raíz:** `CreditWarningBanner.tsx` no consultaba `ai_credits_unlimited`. Calculaba el porcentaje `used/totalLimit` y mostraba el banner si superaba 90%, sin importar si la clínica era unlimited. Con `ai_credits_used` alto y `ai_credits_limit` bajo, el porcentaje siempre disparaba la alerta.

**Fix en `CreditWarningBanner.tsx`:**
- La query ahora incluye `ai_credits_unlimited` en el select
- Si `settings.ai_credits_unlimited === true`, hace `setWarning(null)` y retorna inmediatamente — el banner nunca aparece
- El comportamiento para clínicas normales (`unlimited = false`) no cambia

### Cambios realizados — junio 2026 (sesión 13)

#### Revisión de seguridad — 3 fixes en webhooks y crons

##### Fix: `verifyYCloudSignature` — protección contra replay attacks

**Vulnerabilidad:** el timestamp incluido en el header `ycloud-signature` (`t={ts},s={hex}`) se extraía y usaba para construir el payload HMAC, pero nunca se comparaba contra la hora actual. Un atacante con acceso a un webhook válido capturado (logs, proxy) podía reenviarlo horas o días después y pasaba la verificación.

**Fix en `ycloud-whatsapp-webhook/index.ts`:**
- Después de extraer `timestamp`, se verifica `abs(Date.now()/1000 - parseInt(timestamp)) > 300`
- Si la diferencia supera 5 minutos → `return false` (rechazado)
- La ventana de 5 min es estándar en la industria (Stripe, Twilio, YCloud usan el mismo valor)

##### Fix: `lemonsqueezy-webhook` — fail closed sin secret

**Vulnerabilidad:** `verifySignature` retornaba `!LEMONSQUEEZY_WEBHOOK_SECRET`, lo que equivalía a `true` si el secret no estaba configurado. Con el secret ausente en producción, cualquier POST sin firma era aceptado — un atacante podía crear suscripciones o añadir créditos sin pagar.

**Fix en `lemonsqueezy-webhook/index.ts`:**
- `return !LEMONSQUEEZY_WEBHOOK_SECRET` → `return false`
- El webhook ahora falla cerrado en ambos casos: sin firma Y sin secret configurado

##### Fix: `cron-cancel-pending-deposits` — header secreto compartido

**Vulnerabilidad:** `verify_jwt = false` (requerido por pg_cron) combinado con CORS `*` dejaba el endpoint invocable por cualquiera que conociera la URL, pudiendo disparar cancelaciones masivas de citas `pending_deposit`.

**Fix en `cron-cancel-pending-deposits/index.ts`:**
- Lee `CRON_SECRET` desde env vars
- Si el secret está seteado, valida que el header `x-cron-secret` coincida exactamente; de lo contrario retorna 401
- El check es condicional (`if (CRON_SECRET)`) — si el secret no está configurado, la función sigue operando sin bloquear el cron (fail-open intencional para no romper producción antes de setear el secreto)

**Pasos de activación requeridos:**
1. `supabase secrets set CRON_SECRET=<valor> --project-ref hubjqllcmbzoojyidgcu`
2. Actualizar Job ID 17 en pg_cron para incluir `"x-cron-secret":"<valor>"` en el `headers` JSON
3. Deploy de las 3 funciones

**Nota:** los fixes #1 (mercadopago-webhook sin verificación de firma) y #4 (AdminClinics URL injection teórico) quedaron pendientes de esta sesión — ver Tareas pendientes.

---

### Cambios realizados — junio 2026 (sesión 11)

#### Sistema de abono previo configurable (`require_deposit_first`)

**Problema:** el agente creaba la cita con `status: pending` y luego pedía el comprobante, lo que hacía parecer que la cita estaba confirmada antes del pago. Clientes desconfiaban.

**DB — migración `20260603000001_require_deposit_first.sql`:**
- `require_deposit_first BOOLEAN DEFAULT false` en `clinic_settings`
- Nuevo valor `'pending_deposit'` en el CHECK constraint de `appointments.status`
- Índice `idx_appointments_pending_deposit` para que el cron sea eficiente
- Elizabeth Microblading activada con `require_deposit_first = true` en producción

**Webhook `ycloud-whatsapp-webhook` — cambios:**
- `getFunctions(requireDepositFirst)` reemplaza el check hardcodeado `isElizabeth` — ahora el comportamiento se activa por DB flag
- `createAppt` acepta `requireDepositFirst`: cuando es `true`, crea con `status: 'pending_deposit'` y retorna mensaje claro "reservado provisionalmente por 2h"
- `confirmAppt` busca también en `status = 'pending_deposit'`
- Auto-reschedule detection incluye `pending_deposit`
- Prompt paso e): cuando `require_deposit_first = true`, el flujo es: mostrar datos de pago → ESPERAR imagen → verificar visualmente → `confirm_appointment` = `confirmed`
- Eliminado bloque muerto de fetch del email del owner (ya no se necesita para `getFunctions`)
- Deployado a producción

**Nueva Edge Function `cron-cancel-pending-deposits`:**
- Cancela citas `pending_deposit` creadas hace más de 2 horas sin comprobante recibido
- Job pg_cron ID 17, schedule `0 * * * *` (cada hora)
- `verify_jwt = false` en config.toml

**Frontend:**
- `utils.ts`: nuevo `badge-deposit` (naranja) para `getStatusColor` y `'Pend. Abono'` en `getStatusLabel`
- `index.css`: clase `.badge-deposit` color naranja
- `Appointments.tsx`: status `pending_deposit` en el tipo, nueva tab "Pend. Abono", ícono `Banknote`, botones "Confirmar Abono" / "Cancelar" en ambas vistas (tabla y tarjeta)
- `KnowledgeBase.tsx`: toggle "Requerir abono antes de confirmar cita" junto a los datos de transferencia; guarda `require_deposit_first` en `clinic_settings`

**Nuevo flujo para clínicas con `require_deposit_first = true`:**
1. Cliente elige servicio y horario
2. `create_appointment` → `status: pending_deposit` (slot bloqueado)
3. IA: "Tu horario está **reservado** por 2h. Para confirmarlo, envía el comprobante de $X.XXX"
4. Cliente envía imagen → IA la ve con visión → si es válida, llama `confirm_appointment` → `confirmed`
5. Si no llega comprobante en 2h → cron cancela automáticamente

#### Fix: `min_time` en `check_availability` para restricciones horarias exactas

**Problema:** cuando el cliente decía "después de las 5" o "solo a partir de las 6", el agente usaba `time_of_day='afternoon'` (corte fijo en 13:00) y mostraba slots desde las 4 PM, ignorando la restricción real.

**Fix:**
- Nuevo parámetro `min_time: string` (formato `HH:MM` 24h) en `checkAvail` y en el schema del tool
- El filtro aplica `slot_time >= min_time` sobre los slots ya filtrados por `time_of_day`
- Prompt actualizado: cuando el paciente menciona una hora mínima ("después de las 5", "a partir de las 6 PM", "solo después de las 4:30"), el agente debe pasar `min_time` en formato 24h. Ejemplos: `"después de las 5"` → `min_time='17:00'`; `"a partir de las 6 PM"` → `min_time='18:00'`

#### Fix: `confirmAppt` devuelve fecha/hora exacta — evita confusión con múltiples citas

**Problema:** cuando un cliente tenía más de una cita activa (ej: una de hoy confirmada por recordatorio + una pending_deposit para mañana), al responder "Sí, confirmo", `confirmAppt` actualizaba la cita correcta en la DB pero devolvía solo `"¡Cita confirmada! 😊"` sin datos. El agente entonces buscaba la fecha en el historial del chat y confundía las citas, respondiendo con la fecha incorrecta.

**Fix:** `confirmAppt` ahora devuelve:
```json
{
  "message": "¡Cita confirmada! 😊",
  "confirmed_appointment": {
    "date": "miércoles, 3 de junio",
    "time": "6:00 PM",
    "service": "Evaluación de Microblading",
    "instruction": "IMPORTANTE: usa EXACTAMENTE estos datos — NO uses fechas de otros mensajes del chat."
  }
}
```
El campo `instruction` dentro del resultado del tool obliga al agente a usar los datos correctos y no inferirlos del contexto.

### Cambios realizados — mayo 2026 (sesión 10)

#### Sistema de permisos individuales por miembro de equipo

**Motivación:** el sistema anterior solo tenía permisos globales por rol en `clinic_settings.staff_permissions`; no era posible darle accesos distintos a dos profesionales del mismo equipo.

**DB — migración `20260528000001_member_permissions.sql`:**
- Columna `permissions JSONB DEFAULT NULL` en `clinic_members`. `NULL` = usar defaults del rol (sin cambio de comportamiento para miembros existentes).
- RPC `update_member_permissions(p_member_id UUID, p_permissions JSONB)` con `SECURITY DEFINER`:
  - Valida que el caller sea owner/admin activo de la clínica
  - Bloquea modificar permisos de owners y admins (server-side)
  - Aplicada directamente en producción vía `supabase db query --linked`

**`src/lib/permissions.ts` (archivo nuevo):**
- Tipos `PageKey` (15 páginas), `ActionKey` (8 acciones), `MemberPermissions`
- Defaults por rol: `professional` (8 páginas: dashboard/messages/templates/patients/appointments/reminders/knowledge_base/ai_settings; 5 acciones: no eliminar, no exportar); `receptionist` (7 páginas: +crm, -knowledge_base/-ai_settings; 6 acciones: +appointments_delete)
- `getEffectivePermissions(role, stored)`: owner/admin → full; stored null → defaults del rol; si no → los almacenados
- `PAGE_SECTIONS` y `ACTION_SECTIONS` exportados para la UI del modal

**`src/hooks/usePermissions.ts` (archivo nuevo):**
- `canAccess(page)`: normaliza `knowledge-base` → `knowledge_base` automáticamente; fail-open (retorna `true`) mientras el auth context carga; owner/admin siempre `true`
- `can(action)`: misma lógica sobre `ActionKey`
- Lee `member.permissions` del contexto de auth — no hace fetch propio

**`DashboardLayout.tsx` — simplificación:**
- Eliminado el state `staffPermissions` + el useEffect que leía `clinic_settings.staff_permissions` en cada carga
- `getVisibleItems()` ahora llama `canAccess(pageKey)` del hook, una sola línea

**`Team.tsx` — UI de permisos individuales:**
- Botón **Permisos** (`SlidersHorizontal`) en columna de acciones, visible para admin/owner en filas que no sean owner/admin
- Badge **Personalizado** (ámbar) junto al nombre del miembro si `permissions != null`
- Modal `PermissionsModal`: header con nombre + badge de rol + botón "Restaurar defaults del rol"; body scrollable con dos grupos de toggles (Acceso a secciones / Acciones permitidas); guarda vía RPC `update_member_permissions`; actualiza estado local sin reload
- Sección de permisos por rol renombrada a "Permisos por Defecto por Rol" con descripción aclaratoria

**`teamService.ts`:**
- Campo `permissions?: MemberPermissions | null` en `ClinicMember`
- Método `updateMemberPermissions(memberId, permissions)` usando el RPC

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

### Acción pendiente del fundador — revertir evaluación online al pausar el anuncio (sesión 30)
- [ ] **Elizabeth Microblading:** cuando el fundador pause el anuncio antiguo que ofrece "evaluación gratis", avisar para revertir la regla 3 de `ai_behavior_rules` y el punto 3️⃣ del documento "Servicios" (`knowledge_base`) a la versión sin modalidad online — solo evaluación presencial $10.000. Ver detalle en sesión 30. **No revertir sin que el fundador lo confirme explícitamente.**

### Acción pendiente del fundador — revertir la promo $69.000 al pausar el remarketing (sesión 31)
- [ ] **Elizabeth Microblading:** cuando se pause la campaña de remarketing, avisar para revertir: (1) `node scripts/promo-ads.cjs remove <adId>` para vaciar `promo_ad_ids`; (2) eliminar/desactivar los servicios `Promo Publicidad - Cejas` y `Promo Publicidad - Delineado de Ojos` de `services` — **verificar antes que no tengan citas futuras**; (3) quitar la regla 2.5 de `ai_behavior_rules` y las menciones al $69.000 en las reglas 2, 3 y 4 d); (4) quitar el bloque "🎁 PROMOCIÓN PUBLICIDAD" de los docs "Servicios" y "Precios/Valores" en `knowledge_base`. **No revertir sin confirmación explícita del fundador.**
- [ ] **Observar en vivo la primera reserva con las reglas 6/9 alineadas** (sesión 31): confirmar el orden `create_appointment` → datos de transferencia → comprobante → `confirm_appointment`, y que el candado de abono ya no tenga que intervenir. Consultar con `messages.ai_function_called` / `ai_function_result` del chat.
- [ ] **Cargar el ad ID del anuncio de remarketing** en cuanto empiece a correr: `node scripts/promo-ads.cjs list` → `node scripts/promo-ads.cjs add <adId>`. Sin eso, la detección determinista no opera y solo quedan el mensaje predefinido y el $69.000 en el copy como señales.

### Pendiente de verificar en producción (sesión 29)
- [ ] **Confirmar la cadena de agendamiento end-to-end** tras los fixes de la sesión 29: (1) una reserva de **tarde** de un servicio corto (Evaluación, 15 min) completándose sin el falso "ya no está disponible"; (2) un recordatorio de **24h llegando con botones**; (3) un recordatorio de **2h a una cita en :15/:30/:45**. Los tres estaban rotos y los fixes están desplegados, pero al cierre de la sesión ninguno se había observado ocurriendo en vivo.

### Riesgo conocido no cubierto (sesión 29)
- [ ] **La IA promete un horario antes de llamar `create_appointment`** — mismo patrón del incidente Clara (sesión 26). Los candados actuales bloquean soltar datos bancarios o afirmar "cita confirmada" sin reserva, pero no el compromiso verbal previo ("agendaremos tu cita para las 5:45, dame tu nombre"). Evaluar un candado adicional o reforzar el flujo.

### ✅ RESUELTO (sesión 28) — `professional_id` obligatorio en creación manual de citas
Citas creadas desde el dashboard sin seleccionar profesional quedaban con `professional_id: NULL` y eran invisibles para el chequeo de disponibilidad (`get_professional_available_slots` filtra por `professional_id = p_member_id`), causando doble-booking. Caso real: Yasna Cancino (manual, sin profesional) vs Sofia Arcos Valencia (IA) agendadas en el mismo horario.
- [x] `Appointments.tsx` — `handleSaveAppointment` bloquea el guardado con `toast.error` si la clínica tiene profesionales activos y no se seleccionó ninguno; select muestra asterisco + placeholder "Selecciona un profesional"

### ✅ RESUELTO (sesión 27) — FIX INCIDENTE CLARA DESPLEGADO
Los 4 cambios anti-incidente se **desplegaron a producción el 23-jun-2026** (paquete `d01f7fe`):
- [x] **`ycloud-whatsapp-webhook` v162** — candados de abono/confirmación + manejo determinista de botones + escalada a Tier 2 en selección de horario (todo scopeado a `clinic.id !== HQ_ID`)
- [x] **`cron-cancel-pending-deposits`** — corte 2h → 30 min
- [x] **`cron-process-reminders`** (confirmación única en 24h, 1h eliminado) + **`ycloud-templates`** (fix borrado por wabaId) — mismo paquete
- [x] **pg_cron Job 17 en `*/15 * * * *`** (ya estaba; confirmado) → el "cupo 30 min" se respeta
- [ ] **PENDIENTE OPERATIVO — clienta Clara Cecilia Barros Mora** (`56978916921`, RUT 12.964.503-2): pagó el abono de $10.000 por un cupo que nunca se reservó. Devolverle el dinero o reagendar + disculpa.

### Alta prioridad — renovar la key de Google AI (sesión 31)
- [ ] **`GOOGLE_AI_API_KEY` suspendida** (`403 … has been suspended`, verificado 25-jul). Con ella caída solo hay 2 proveedores de IA efectivos: si OpenAI y OpenRouter fallan el mismo turno, la conversación se pierde con "tuve un problema técnico" (ya costó una venta). El código para usar Gemini como tercer respaldo ya está desplegado — basta con renovar la key en Google Cloud Console y hacer `supabase secrets set GOOGLE_AI_API_KEY=<nueva>`, sin tocar código.
- [ ] **Contactar a Claudia Ximena Muñoz Romero** (`56945445191`): quería retoque el lunes 27 a las 10:00 y se fue tras dos fallos técnicos del agente. El cupo estaba libre.
- [ ] **Contactar a `+56962662379`** (26-jul): insistió tres veces con el viernes 31 por la tarde y recibió cuatro respuestas repetidas sin poder agendar. **Ese día tenía cupo libre a las 10:00 AM** — la franja pedida ocultaba el resto del día (ya corregido en código).

### Pendiente de verificar en vivo (sesión 31)
- [ ] **Los seis fixes de código de la sesión no se han observado operando en producción.** Verificables así: (1) una reserva promocional completa `create_appointment` → transferencia → comprobante → `confirm_appointment`; (2) que ante una franja sin cupos se ofrezca el mismo día en otra franja en vez de saltar de día; (3) que dos mensajes seguidos del cliente produzcan **una** sola respuesta; (4) que un fallo de proveedor de IA se resuelva por reintento en vez de "tuve un problema técnico" (el detalle del error queda ahora en `debug_logs`).

### Alta prioridad — pasos manuales bloqueantes (sesión 20)
- [ ] **`LS_VARIANT_CAMPAIGN_CREDITS` secret** — el botón "Comprar créditos de campaña" llama a LemonSqueezy con un variant de precio variable. Necesita que el variant ID esté seteado: `supabase secrets set LS_VARIANT_CAMPAIGN_CREDITS=<variant_id> --project-ref hubjqllcmbzoojyidgcu` y luego `supabase functions deploy lemonsqueezy-create-checkout --project-ref hubjqllcmbzoojyidgcu`
- [ ] **`LEMONSQUEEZY_WEBHOOK_SECRET` en producción** — el `lemonsqueezy-webhook` falla cerrado sin este secret (fix sesión 13). Verificar que esté seteado: `supabase secrets list --project-ref hubjqllcmbzoojyidgcu`. Si no está: `supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=<valor> --project-ref hubjqllcmbzoojyidgcu`
- [ ] **`CRON_SECRET` en producción** — guard `x-cron-secret` para `cron-cancel-pending-deposits` implementado en sesión 13 pero nunca activado. Pasos: (1) `supabase secrets set CRON_SECRET=<valor> --project-ref hubjqllcmbzoojyidgcu`, (2) actualizar Job ID 17 en pg_cron para incluir `"x-cron-secret":"<valor>"` en el `headers` JSON, (3) `supabase functions deploy cron-cancel-pending-deposits --project-ref hubjqllcmbzoojyidgcu`
- [ ] **Créditos de campaña vía MercadoPago (clínicas CLP)** — actualmente solo se pueden comprar créditos de campaña vía LemonSqueezy (USD). Elizabeth y clínicas chilenas necesitan un path en MercadoPago. Implementar en `mercadopago-webhook` y agregar botón de compra en `Campaigns.tsx` cuando `paymentProvider === 'mercadopago'`

### Media prioridad — monetización
- [ ] **Subscription `manually_active`** — columna para clínicas que pagan por transferencia bancaria (`UPDATE subscriptions SET manually_active = true WHERE clinic_id = '...'`)
- [ ] **CRM auto-cierre** — `pg_cron` que mueve prospectos con `appointment_date < NOW()` al stage "Cerrado" (diariamente 06:00 UTC)

### Media prioridad — seguridad
- [ ] **`mercadopago-webhook` sin verificación de firma** — `x-signature` se lee pero nunca se valida. MP usa formato `ts=...,v1=...`; implementar HMAC SHA-256 con `MERCADOPAGO_WEBHOOK_SECRET`. Sin esto, cualquier actor puede forjar pagos apuntando a un `clinic_id` conocido.

### Baja prioridad — deuda técnica
- [ ] **Eliminar** `console.log` de producción (~299 en el webhook)
- [ ] **`getConversations()`** en `supabase.ts` — carga todos los mensajes sin paginación (función no usada actualmente pero podría serlo)
- [ ] **React Query** — infraestructura lista en `main.tsx` (`QueryClientProvider`), pendiente adoptar en fetches de componentes
- [ ] **`switchClinic()`** en `AuthContext.tsx` usa `window.location.reload()` — reemplazar por reset de estado limpio
- [ ] **Configurar Resend** — `send-invite-email` ya llama a Resend, solo falta configurar `RESEND_API_KEY` como secret en Supabase y verificar dominio de envío

## Tareas completadas (sesión 13)

- [x] **Replay attack en `verifyYCloudSignature`** — check `abs(now - timestamp) > 300s` agregado
- [x] **`lemonsqueezy-webhook` fail-open sin secret** — cambiado `return !LEMONSQUEEZY_WEBHOOK_SECRET` → `return false`
- [x] **`cron-cancel-pending-deposits` sin auth** — guard `x-cron-secret` con `CRON_SECRET` env var (pendiente activar en producción)

## Tareas completadas (verificadas en sesión 10)

- [x] **Sistema de permisos individuales por miembro** (sesión 10) — `permissions JSONB` en `clinic_members`, RPC `update_member_permissions`, `lib/permissions.ts`, `hooks/usePermissions.ts`, modal en `Team.tsx`, sidebar usa `canAccess()`

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
Las siguientes funciones fueron modificadas en sesión 9 — verificar si ya fueron deployadas antes de modificar de nuevo:
- `signup-handler` — nueva columna `ai_credits_limit`, valores nuevos
- `mercadopago-webhook` — nueva columna `ai_credits_limit`, valores nuevos
- `lemonsqueezy-webhook` — nueva columna `ai_credits_limit`, valores nuevos
- `cron-monthly-credit-recharge` — tabla corregida a `ai_credit_transactions`
- `send-whatsapp-message` — imports modernizados
- `send-whatsapp-campaign` — imports modernizados
- `chat-agent` — imports modernizados

### Cambios realizados — junio 2026 (sesión 21)

#### Elizabeth Microblading — fix `ai_behavior_rules`: regla retoque y métodos de abono

**Cambio 1 — Retoque: obligatorio preguntar tiempo transcurrido antes de cotizar**

**Problema:** cuando una clienta decía "yo ya me hice el tratamiento", el agente asumía automáticamente que aplica retoque y cotizaba $50.000 sin preguntar cuánto tiempo hacía. Caso reportado: clienta con tratamiento de hace 4 años cobrada a $50.000 en vez de $89.000.

**Causa raíz:** la Regla 2 "REGLA IMPORTANTE DE TRABAJOS PREVIOS" describía qué precio aplicar según el tiempo, pero no instruía al agente a **preguntar** primero — el modelo infería el precio sin datos.

**Fix en `ai_behavior_rules`:**
- Regla 2: agregado "**PASO OBLIGATORIO — PREGUNTAR ANTES DE COTIZAR**": el agente DEBE preguntar "¿Hace cuánto tiempo te realizaste el tratamiento?" antes de mencionar cualquier precio. Solo después de la respuesta determina retoque ($50.000, menos de 1 año) o sesión inicial ($89.000, más de 1 año).
- Regla 4 Microblading paso b): cuando NO es primera vez → preguntar cuánto tiempo lleva antes de cotizar.
- Regla 4 Micropigmentación de Ojos paso b): ídem.

**Cambio 2 — Abono: solo transferencia o CajaVecina, nunca en persona**

**Problema:** cuando clientas decían que no podían o no sabían hacer transferencias, el agente respondía "no hay ningún problema" — implicando que podían pagar en la oficina al llegar.

**Fix en `ai_behavior_rules`:**
- Regla 6: agregado bloque "**MÉTODOS DE PAGO DEL ABONO — REGLA ESTRICTA**": el abono se acepta ÚNICAMENTE por transferencia bancaria o depósito en CajaVecina (nombre "Elizabeth Hernández" / RUT 18.342.131-k). NUNCA indicar que puede pagarse en la clínica al llegar. Si la clienta no sabe transferir → ofrecer CajaVecina y guiarla.

**Aplicado directamente en producción** vía PATCH REST a `clinic_settings` (sin deploy de edge functions necesario).

---

### Cambios realizados — junio 2026 (sesión 20)

#### Normalización de planes legacy — fix múltiple síntoma

**Problema (3 síntomas, 1 causa):** Elizabeth Microblading mostraba "Plan Prestige", precio "US$USD/mes" vacío, y el Revenue Control Center bloqueado con badge Premium, todo a la vez.

**Causa raíz:** `subscription.plan` llegaba de la DB como `'prestige'` (ID legacy) y nunca se normalizaba. `PremiumFeature` hacía `plans.indexOf('prestige')` → `-1` → bloqueaba todo. Settings.tsx no encontraba el plan en el mapeo de precios → precio vacío.

**DB — migración `20260618120000_normalize_subscription_plans.sql` (aplicada en producción):**
- Extendió CHECK constraint `subscriptions_plan_check` para incluir IDs nuevos (`core`, `starter`, `pro`, `enterprise`) junto a los legacy
- Migró datos: `prestige→enterprise`, `radiance→pro`, `essence→starter`, `freemium→core`
- Verificado: Elizabeth quedó con `plan = 'enterprise'`

**`src/contexts/AuthContext.tsx`:**
- Importa `normalizePlanId` de `@/lib/mercadopago`
- En `fetchSubscription()`, normaliza solo si el plan es legacy (`LEGACY_PLAN_IDS = ['essence', 'radiance', 'prestige', 'freemium']`); planes válidos y `trial` se dejan intactos
- Fix impacta automáticamente: Settings (nombre + precio), PremiumFeature (bloqueos), RetentionEngine (Revenue Control Center)

**`src/components/common/PremiumFeature.tsx`:**
- Normaliza defensivamente con `normalizePlanId()` antes de hacer `indexOf`

**`src/pages/RetentionEngine.tsx`:**
- Texto fallback cambiado de "Disponible en Radiance+" → "Disponible en Pro+"
- `PremiumFeature requiredPlan="pro"` — Motor de Retención ahora accesible desde Pro (antes solo Enterprise)

**Listas de features de planes actualizadas** (`mercadopago.ts`, `lemonsqueezy.ts`, `Pricing.tsx`, `Landing.tsx`):
- Plan Pro: agregado `'Motor de Retención de Ingresos (IA)'`

#### Fix Fidelización — doble conteo de puntos y bonos de referido muertos

**Problema:** al sumar +500 puntos el saldo subía +1000; al restar −500 bajaba −1000. Los bonos de referido (acreditar al referente y al nuevo cliente) nunca se ejecutaban pese a estar configurados.

**DB — migración `20260618130000_fix_loyalty_balance_and_referral.sql` (aplicada en producción):**
- Eliminó trigger duplicado `trg_loyalty_balance_sync` que corría en paralelo con `trg_sync_loyalty_log_to_patient`, causando doble aplicación
- Nueva función `award_referral_bonus()` y triggers `trg_award_referral_bonus_ins` / `trg_award_referral_bonus_upd` sobre `patients`: acredita `loyalty_referral_bonus` al referente + incrementa `referral_count` + acredita `loyalty_welcome_bonus` al referido

**`src/pages/Loyalty.tsx`:**
- Guard de saldo negativo en `handleAdjustPoints`: bloquea quitar más puntos de los disponibles con `toast.error`

**Nota sobre saldos históricos:** los balances previos al fix quedaron inflados por el doble conteo. No se recalcularon automáticamente — hacerlo requeriría revisar caso por caso ya que parte de los puntos vienen de fuentes sin transacción registrada.

#### Campañas — habilitación completa (paridad con Vetly)

**DB — migración `20260618140000_campaign_credits_balance.sql` (aplicada en producción):**
- Columna `campaign_credits_balance INTEGER NOT NULL DEFAULT 0` en `subscriptions`

**`supabase/functions/send-whatsapp-campaign/index.ts` (deployado):**
- Bloque de deducción de créditos al final del loop de envío: descuenta `doneCount` del `campaign_credits_balance` de la suscripción

**`supabase/functions/lemonsqueezy-webhook/index.ts` (deployado):**
- Handler para `purchaseType === 'campaign_credits'` en `order_created`: lee saldo actual, suma `customData.quantity`, actualiza `subscriptions.campaign_credits_balance`

**`src/pages/Campaigns.tsx` (reescrito completamente):**
- Eliminado placeholder "Motor de Campañas 2.0"
- Estado `campaignCredits` cargado desde `subscriptions.campaign_credits_balance`
- `handleBuyCredits()` usa `redirectToLemonCampaignCreditsCheckout` (USD, LemonSqueezy)
- Detecta `?payment=success` en URL para refrescar créditos post-compra
- Validación antes de lanzar: si `campaign.total_target > campaignCredits` → warning + botón deshabilitado
- Modal 2 pasos: paso 1 (nombre + tags inclusión/exclusión + estimador de audiencia), paso 2 (selector de plantilla)
- Tags por texto (patrón Citenly, no UUIDs como Vetly)
- Cards con badge de estado, estadísticas de entrega, botón "Ver Reporte" → modal con `campaign_deliveries`

**⚠️ Pasos manuales requeridos para que las compras funcionen:**
1. `supabase secrets set LS_VARIANT_CAMPAIGN_CREDITS=<variant_id> --project-ref hubjqllcmbzoojyidgcu`
2. Deploy `lemonsqueezy-create-checkout` si se modificó el variant
3. Clínicas CLP (MercadoPago) no tienen path de compra aún — ver Tareas pendientes

#### Dashboard — réplica exacta de Vetly (teal)

**`supabase/migrations/20260618150000_create_satisfaction_surveys.sql` (aplicada en producción):**
- Tabla `satisfaction_surveys` con RLS scopeada por clínica (`clinic_members WHERE status = 'active'`)
- Triggers `update_satisfaction_surveys_updated_at`, índices por `appointment_id`, `patient_id`, `clinic_id`
- Reemplaza la tabla anterior que nunca se aplicó a producción y rompía el `Promise.all` del Dashboard

**`src/pages/Dashboard.tsx` (reescrito completamente):**
- **6 stat-cards teal:** Citas Agendadas por IA (`Calendar`), Conversaciones Únicas (`Target`), Mensajes de IA (`MessageSquare`), Recordatorios (`Clock`), Citas Canceladas (`Minus`), Tiempo Ahorrado (`TrendingUp`)
- **`ChangeBadge`:** componente inline que muestra % vs período anterior con flechas de color
- **`MiniCalendar`:** selector de rango personalizado con hover highlighting y colores teal
- **16 queries en paralelo** en `Promise.all`: período actual + período anterior para 5 métricas comparables
- **`getPreviousDateRange()` local:** helper que replica la lógica de `getDateRange` para el período previo (Citenly's `useClinicTimezone` no lo expone)
- **Cards analytics:** Próximas Citas (`from-teal-500 to-teal-700`), Mensajes Recientes (sky), Top Servicios (amber + Crown), Conversión (emerald), NPS/Satisfacción (violet + Star)
- **Adaptaciones Citenly vs Vetly:** `phone_number` (no `contact_phone`), `patients` (no `tutors`), sin columna `status` en `messages`, filtro `status IN ('pending','confirmed','pending_deposit')` en upcoming
- Build verificado: `✓ built in 13.31s`, 0 errores TypeScript

---

### Cambios realizados — junio 2026 (sesión 19) — Auditoría incidente Bárbara Orellana

#### Incidente 1: la IA canceló la cita de Bárbara Orellana por iniciativa propia
- Mensaje "Hola sabes que estoy afuera pero está cerrado" (clienta llegando a su cita de las 12:00) fue manejado por **gpt-4o-mini (Tier 1)** — ninguna keyword lo subía de tier
- El mini interpretó "no podrá asistir", llamó `confirm_appointment(no)` 3 veces y alucinó "su cita ha sido cancelada ya que la clínica está cerrada"
- **Fixes:** regla 9.5 reescrita — cancelación en DOS PASOS (preguntar "¿Confirmas que deseas cancelar...?" y solo cancelar tras "sí" explícito); nueva regla 9.6 anti-invención (nunca afirmar estados del local, derivar con `escalate_to_human`); descripciones del tool `confirm_appointment` endurecidas (ambas variantes); keywords de cancelación/retraso agregadas a `n2Keywords` para que nunca las maneje el mini

#### Incidente 2: cita de Carolina Gaona cancelada por keyword-matching ciego
- Audio transcrito contenía la pregunta "¿Voy a tener que cancelarla ahora?" mientras intentaba llegar → el substring `"cancelar"` disparó la auto-cancelación silenciosa de sesión 15 (`requires_human` + keywords)
- **Fix:** auto-cancelación ELIMINADA. En modo humano ya NUNCA se cancela automáticamente — si hay señales de cancelación se inserta una notificación `possible_cancellation` para que la clínica decida

#### Incidente 3: comprobante de $89.000 (tratamiento completo) rechazado como "monto no coincide"
- El prompt ordenaba rechazar montos distintos al abono — Bárbara pagó el tratamiento completo y fue rechazada
- **Fix (regla de negocio confirmada por el fundador):** monto IGUAL al abono → agradecer + `confirm_appointment(yes)`; monto MAYOR → SOLO agradecer + `escalate_to_human` interno (nunca rechazar ni mencionar que no coincide); monto MENOR → pedir completar el abono
- **Red de seguridad en `cron-cancel-pending-deposits`:** si el cliente envió una imagen (probable comprobante) después de crear la cita, NO se cancela — se notifica `deposit_review` para verificación manual

#### Incidente 4: recordatorios 24h NUNCA llegaban (marcados como "enviados")
- La plantilla `recordatorio_oficial_24hrs` tiene **4 placeholders** ({{1}},{{3}},{{4}},{{5}} — sin {{2}}) pero el cron enviaba **5 params hardcodeados** → WhatsApp rechazaba con error 132000. YCloud responde 200 al POST y el fallo llega después por evento `whatsapp.message.updated` que el webhook ignoraba → todo quedaba como "sent"
- Además los recordatorios 2h/confirmación que SÍ llegaban salían con el texto desordenado (params posicionales en orden equivocado)
- **Fix cron:** helper `buildTemplateParams()` — lee la plantilla real vía API YCloud, extrae sus placeholders y los llena con numeración semántica (1=paciente, 2=especialista, 3=fecha, 4=servicio, 5=clínica). Aplicado a los 3 bloques (24h/2h/1h)
- **Fix webhook:** nuevo handler de `whatsapp.message.updated` con `status: failed` — marca `messages.ycloud_status = 'failed'`, corrige `reminder_logs` y notifica `reminder_failed` a la clínica

#### Incidente 5: inconsistencia de precios $99.000 vs $89.000
- **Causa:** los precios viven en TRES lugares y la sesión 17/18 solo limpió dos. La tabla `services` seguía con "Microblading de cejas" a $99.000, ofertas de mayo expiradas y servicios descontinuados — y esa tabla se inyecta al system prompt y fija el `price` de las citas en `createAppt`
- **Fix datos (producción):** Microblading de cejas y Micropigmentación de Ojos → $89.000; eliminados los 4 servicios obsoletos (3 "Oferta ... Mayo" + "Micropigmentación de labios") y sus filas en `service_professionals`; cita de Ester Godoy corregida a $89.000
- **REGLA PERMANENTE:** los precios viven en `services` (tabla) + `knowledge_base` + `ai_behavior_rules`. Cualquier cambio de precio DEBE actualizar los tres. La tabla `services` es la que manda en el prompt y en el price de las citas

#### Limitación documentada: borrar mensajes de la IA "para todos" en WhatsApp
- No es bug de Citenly: los mensajes enviados vía API (YCloud) no se pueden revocar "para todos" desde la app de WhatsApp Business (solo "eliminar para mí"). El "antes se podía" correspondía a mensajes enviados manualmente desde la app dentro de la ventana de ~2,5 días

**Deployadas:** `ycloud-whatsapp-webhook`, `cron-process-reminders`, `cron-cancel-pending-deposits`

**Acciones manuales pendientes (Elizabeth):** contactar a Bárbara Orellana (pagó $89.000 y quedó sin cita — reagendar y registrar pago) y a Carolina Gaona (cita cancelada por el sistema mientras intentaba llegar)

---

### Cambios realizados — junio 2026 (sesión 22)

#### Página `/demo` — rediseño progresivo + optimización móvil

**`src/pages/Demo.tsx` (reescrito en sesión 20, pulido en sesión 22):**

**Logo y visual:**
- Logo `citenly-icon.png` reemplaza el ícono Sparkles (panel izquierdo + nav móvil)
- Badge "30 min · sin compromiso": `text-white bg-black/30 border-white/30` — visible sobre fotos
- Tag especialidad testimonios: `text-[#FF2E88]` sólido + `bg-[#FF2E88]/20 border-[#FF2E88]/50`

**Optimización móvil:**
- Wrapper raíz: `flex` → `lg:flex overflow-x-hidden` (evita body overflow horizontal)
- Right panel: `flex-1` → `w-full lg:flex-1` (ancho explícito en móvil)
- Nav móvil: `h-12` compacto, contador en pill centrado, texto "Ingresar →"
- Progress bar: `pt-3` (antes `pt-5`)
- Form area: `px-5 pt-5` sin max-width en móvil
- Grid tipo negocio: `grid-cols-1 sm:grid-cols-2` (antes siempre 2 cols = apretado en móvil)
- Botones opción: `py-3 whitespace-normal` — `whitespace-normal` necesario porque iOS Safari aplica `white-space: nowrap` a `<button>` en su user-agent stylesheet
- Header pregunta: `text-xl mb-5` (más compacto)
- Carrusel testimonios móvil: elimina `-mx-5` que causaba overflow horizontal. Nuevo patrón: `overflow-x-auto > div.flex.w-max.px-5` sin negative margin
- Fotos testimonios: altura `h-44` (antes `h-24`), `object-[center_15%]` para mostrar el rostro

**Fotos testimonios actualizadas:**
- Sofia: `sofia%20ibañez.png` → `sofia-yanez-3.jpg` (nombre sin `ñ` — macOS guarda en NFD, URL esperaba NFC → imagen no cargaba)
- Carolina: `carolina-rojas-paineman.png` → `carolina-rojas-paineman-2.jpg`

**Regla permanente — imágenes con caracteres especiales:** macOS guarda `ñ`, `á`, `é` etc. en NFD (descompuesto). Los navegadores y servidores Linux esperan NFC. Para evitar que imágenes no carguen en producción, **siempre usar nombres de archivo sin caracteres especiales** (sin tildes, ñ, espacios). Si el archivo original tiene ñ, copiarlo con nombre ASCII antes de commitear.

**`public/micropigmentadoras.html`:**
- Logo actualizado a `<img src="/citenly-icon.png">`
- Foto Sofia → `sofia-yanez-3.jpg`
- Foto Carolina → `carolina-rojas-paineman-2.jpg`

**`src/components/layout/DashboardLayout.tsx` y `src/pages/Dashboard.tsx`:**
- Badge "IA Activa" dinámico en sidebar Y en el header del Dashboard — consulta DB cada 60s
- Estado `active` (teal/rosa pulsante) / `paused` (ámbar) / `no_credits` (rojo)
- Lógica: `ai_auto_respond === false` → paused; `ai_credits_unlimited` → active; créditos agotados → no_credits
- Resuelve `parent_clinic_id` para sucursales (lee créditos del pool padre)
- Al refrescar la página el estado se refleja inmediatamente (fetch en mount, no solo en el interval de 60s)

---

### Cambios realizados — junio 2026 (sesión 23)

#### `confirmAppt` — nueva máquina de estados para abono verificado

**Cambio:** cuando una clienta envía el comprobante de abono y el agente llama `confirm_appointment(yes)` sobre una cita en `status = 'pending_deposit'`, la cita ahora pasa a **`pending`** (NO a `confirmed`).

**Razón de negocio (confirmada por el fundador):** el abono solo aparta el cupo en el calendario. La confirmación definitiva (`confirmed`) o la cancelación (`cancelled`) la hace el **template de confirmación de 24h** (`confirmacion_cita` con botones), que es el único responsable de mover la cita a su estado final. A la clienta se le comunica igualmente "¡Cita confirmada! 😊" — esa confirmación de palabra significa que se le apartó el espacio, no que la cita esté en `confirmed`.

**Máquina de estados en `confirmAppt` ([ycloud-whatsapp-webhook](supabase/functions/ycloud-whatsapp-webhook/index.ts)):**
- `response === "no"` → `cancelled`
- `response === "yes"` y `appt.status === "pending_deposit"` → **`pending`** (abono recién verificado, espera template de 24h)
- `response === "yes"` en cualquier otro caso (`pending` / `confirmed`, p.ej. respuesta al botón de confirmación) → `confirmed`

**Supersede a:** sesión 11 paso e) y sesión 19 incidente 3, que documentaban `confirm_appointment(yes)` sobre abono → `confirmed`. Ese ya NO es el comportamiento.

**Dependencia crítica del diseño:** para que la cita salga de `pending` alguna vez, la clínica DEBE tener `reminder_settings.request_confirmation = true` y `template_confirmation` configurado. Si no, la cita pagada queda atascada en `pending` permanentemente (ningún recordatorio le envía el flujo de botones). Verificado en producción: Elizabeth tiene `request_confirmation = true` + `template_confirmation = 'confirmacion_cita'` + los 3 recordatorios activos. **Antes de activar `require_deposit_first` en cualquier otra clínica, verificar que tenga `request_confirmation` activo.**

**Riesgo residual conocido (no corregido por decisión):** reservas con abono el mismo día a <1h de la cita pueden quedar en `pending` si ningún recordatorio (24h/2h/1h) alcanza a dispararse o la clienta no toca el botón. Borde poco frecuente — se dejó como está.

#### Precios del anuncio de Meta — el agente repetía ofertas obsoletas ($79.000 / $109.000)

**Síntoma:** el agente de Elizabeth cotizaba precios distintos en chats del mismo día ($79.000, $89.000, $109.000), pese a que las 3 fuentes de precio (`services`, `knowledge_base`, `ai_behavior_rules`) estaban limpias y correctas en $89.000.

**Causa raíz (CUARTA fuente de facto de precios):** el webhook inyecta el **cuerpo completo del anuncio de Meta** como texto del mensaje entrante ([ycloud-whatsapp-webhook/index.ts:1866-1871](supabase/functions/ycloud-whatsapp-webhook/index.ts#L1866-L1871)): `[Mensaje desde Anuncio: "..." - <body>]`. El creativo de Meta seguía promocionando una oferta vencida ("Precio Normal: $109.000 / Precio Final: $79.000"). Ese copy entra al historial de la conversación y el modelo lo repite. Verificado en DB: los contactos cuyo payload de anuncio traía la oferta recibieron "$79.000"; el que no la traía recibió correctamente "$89.000".

**Fix (regla en el prompt, PATCH a `ai_behavior_rules`, sin deploy):** se agregó a la Regla 2 (Precios) el bloque **"PRECIOS DEL ANUNCIO — IGNORAR SIEMPRE"**: el agente nunca cotiza precios que aparezcan dentro de `[Mensaje desde Anuncio: ...]`; el único precio válido es el de la KB ($89.000 / $50.000 / $10.000). Ignora cualquier "$79.000", "$109.000" u "oferta/descuento" del texto del anuncio.

**Extiende la regla de sesión 19 incidente 5:** los precios no solo viven en `services` + `knowledge_base` + `ai_behavior_rules` — el copy del anuncio de Meta es una **cuarta fuente de facto** que llega por el contexto del mensaje entrante. NO está en la DB de Citenly: se corrige con la regla del prompt **y** actualizando/pausando el creativo en Meta (acción del fundador).

---

### Cambios realizados — junio 2026 (sesión 24) — Landing micropigmentistas + tracking para ads

#### `public/micropigmentadoras.html` — primera sección portada a la estructura de `Landing.tsx`
- **Banner blanco** (`.trust-banner`) reemplaza el trust-bar oscuro; mismo look que la landing principal.
- **Hero estilo Landing:** badge con ícono Sparkles, h1 más grande (`clamp(38–58px)`), `.hero-sub` con color más visible (`var(--muted)` 0.5 → `rgba(236,237,250,0.85)`), trust line con banderas LATAM. Se conservó el simulador de WhatsApp animado (columna derecha) y los `niche-tags`.

#### Banner de anuncio en una sola línea en móvil (ambas páginas) — patrón
- **Regla:** el banner blanco superior debe quedar en **1 sola línea en móvil** (en 2 líneas abarcaba mucho espacio).
- `micropigmentadoras.html`: `.trust-banner-text` con `white-space:nowrap`; en ≤640px se oculta la cola larga (`.tb-extra`) y baja a 12px.
- `Landing.tsx`: `text-xs sm:text-sm` + `whitespace-nowrap`; la cola "— el equipo de Citenly configura todo." pasa a `hidden sm:inline`.

#### Nav sin fugas para landing de tráfico pago (CRO) — regla permanente
- Una landing que recibe **tráfico pago de Meta** no debe tener fugas del embudo. En `micropigmentadoras.html` el navbar quedó **solo logo (→ `#hero`, no sale del sitio) + CTA "Agendar Reunión Demo"**.
- Removidos: links del nav (El Producto / Cómo funciona / Testimonios), "Iniciar sesión" y el botón secundario "Ver cómo funciona". CSS muerto limpiado.
- Todos los CTA siguen apuntando a `citenly.com/demo` (conversión = agendar demo, evento `fbq('track','Lead')`).

#### Microsoft Clarity (heatmaps + grabaciones) — solo marketing
- Snippet en el `<head>` de `index.html` y `public/micropigmentadoras.html`. **Project ID `x9mkqjwvdy`** (un solo proyecto).
- **Gate de privacidad en `index.html`:** envuelto en `if (!window.location.pathname.startsWith('/app')) { ... }` para **NO inicializar Clarity dentro del panel logueado `/app/*`** (datos de pacientes). Corre solo en marketing público (`/`, `/demo`, `/login`).
- `micropigmentadoras.html` lo carga sin condición (100% marketing).
- Ver heatmap de la landing del ad: Clarity → Heatmaps → `https://citenly.com/micropigmentadoras`; filtrar grabaciones por URL para aislar el tráfico del anuncio.

#### Estrategia del anuncio Meta (definida, pendiente de ejecutar)
- **Ángulo del creativo:** dolor del **no-show que roba la tarde** + diferenciador **abono antes de separar la hora**. El hook del ad debe ≈ el headline del hero para message match. Conecta con la regla de sesión 18: el copy del anuncio entra al prompt — mantener precios fuera del creativo.
- **Slide-in de captura de WhatsApp (exit/abandon):** PENDIENTE a propósito — se evaluará con datos de Clarity si hay drop alto sin conversión. Mecánica: trigger por tiempo+scroll (no exit-intent clásico, no aplica en móvil) + oferta step-down (capturar WhatsApp, no repetir "agenda demo").

---

### Cambios realizados — junio 2026 (sesión 25) — Correo de marca (Cloudflare) + Agente de ventas IA de HQ

#### Fix créditos Enterprise (16.000 → 20.000) + copy correcto
- Aclaración del fundador: los **créditos IA son finitos en todos los planes** (Starter 4.000 · Pro 8.000 · Enterprise 20.000). Lo **ilimitado en Pro/Enterprise son las CITAS** (`monthlyAppointmentsMonthly: -1`), no los créditos.
- Enterprise estaba inconsistente: frontend `aiCreditsLimit: -1` + "Conversaciones ilimitadas", backend `16000`. Corregido a **20.000 finitos** en `signup-handler`, `mercadopago-webhook`, `lemonsqueezy-webhook` (deployados), `mercadopago.ts`, `lemonsqueezy.ts`, `Pricing.tsx`, `Landing.tsx` (reemplazado "Conversaciones ilimitadas" → "20.000 créditos IA/mes"). Pro ya estaba bien (8.000).
- Única Enterprise en DB = Elizabeth (`ai_credits_unlimited=true`, caso especial — no se tocó). El `chat-agent` del sitio aún tiene precios viejos (Essence/Radiance/Prestige) — **pendiente** corregir.

#### Burbuja de WhatsApp en `public/micropigmentadoras.html`
- Botón flotante `.wa-bubble` (#25D366) abajo-derecha → `wa.me/56962303576` con mensaje pre-cargado + `fbq('track','Contact')`. Atendido por persona/agente de ventas. Responsive (pill desktop / ícono móvil).

#### Correo de marca `ventas@citenly.com` — migración DNS a Cloudflare
- **Dominio:** registrado en **Namecheap**; **sitio en Vercel** (A `@` → 76.76.21.21, CNAME `www` → cname.vercel-dns.com). Antes sin correo (MX vacío).
- Se movió el **DNS (nameservers) a Cloudflare** (registrador sigue en Namecheap). NS: `chin.ns.cloudflare.com` / `tim.ns.cloudflare.com`. Registros Vercel quedaron **DNS only (gris)** — NO proxied (rompe SSL con Vercel).
- ⚠️ **Resend ya estaba configurado** para envío de la app (MX `feedback-smtp.sa-east-1.amazonses.com` en `send.citenly.com` + DKIM `resend._domainkey` + SPF `send`) — **conservados**.
- **Cloudflare Email Routing** activado → `ventas@citenly.com` reenvía a `citenly@gmail.com`. La regla de routing es la que publica los MX `route1/2/3.mx.cloudflare.net` (Status debe quedar **Enabled**; ojo: crear la regla NO basta, hay que activar el routing).
- Con ese correo se creó la cuenta de **YCloud** para el número de ventas (YCloud no acepta Gmail).

#### Fix diseño HQ — títulos legibles
- `AdminDashboard.tsx` y `AdminSettings.tsx`: títulos `text-gray-900` (negros) sobre fondo oscuro → cambiados a `text-white` + subtítulos `text-gray-400`. (Los `text-gray-900` de `AdminMessages` están dentro de tarjetas blancas → se dejan.)

#### Nueva sección HQ: Base de Conocimiento
- `src/pages/hq/AdminKnowledge.tsx` (espejo enfocado de la KB de clientes, tema oscuro): CRUD sobre `knowledge_base` scopeada a `HQ_ID` + búsqueda + filtro por categoría. Ruta `/hq/knowledge`, ítem "Conocimiento" en `AdminLayout`.
- **RLS:** política `"Platform admins manage HQ knowledge base"` en `knowledge_base` (FOR ALL, `clinic_id = HQ_ID AND auth.uid() IN (SELECT id FROM platform_admins)`). `knowledge_base.status` default `'active'` (los docs nuevos los lee el agente automáticamente).

#### 🤖 Agente de ventas IA de HQ por WhatsApp (núcleo de la sesión)
- **Número de ventas:** `+56962303576` registrado en la fila HQ (`clinic_settings` id `00000000-...`) con `ycloud_phone_number`, `ycloud_api_key` (seteada por SQL en el SQL Editor) y `ai_credits_unlimited = true` (no debe silenciarse).
- **Webhook URL para YCloud:** `https://hubjqllcmbzoojyidgcu.supabase.co/functions/v1/ycloud-whatsapp-webhook` (mismo webhook que las clínicas).
- **Rama de "modo ventas" en `ycloud-whatsapp-webhook`** (cambio quirúrgico y condicional por `clinic.id === HQ_ID`; el flujo de agendamiento de clínicas queda INTACTO):
  - `buildSalesPrompt(knowledgeSummary)` — **persona "Sofía"**, consultiva: descubre la realidad del prospecto con preguntas y recomienda EL plan que calza + su valor en ese momento. **Cero tecnicismos** (lista negra: créditos IA, tokens, tier, modelo, GPT, API, webhook, prompt). No agresiva (ofrece la videollamada UNA vez). Ángulo **meta-demo** (revelar en el momento justo: "así como te atiendo, atenderá tu asistente a tus clientas"). Dice **"inasistencias"** (NUNCA "no-shows") y sabe que la IA **reagenda** citas.
  - **Tools de ventas** (`getSalesFunctions`): `get_knowledge`, `registrar_lead`, `agendar_videollamada` (inserta en `demo_requests` + notifica al fundador vía `sendWA` a `DEMO_NOTIFY_PHONE`), `escalar_lead_caliente`. Implementados antes de `processFunc`; reúsan `callAI`, `sendWA` y el loop existentes.
  - Condicionales en el flujo: el system prompt y `dynamicFns` cambian a versión ventas solo si `clinic.id === HQ_ID`.
- **KB de HQ sembrada:** 16 documentos activos en `knowledge_base` (clinic_id HQ_ID), 100% lenguaje de cliente (qué es, dolores, asistente WhatsApp, agenda/reagenda, recordatorios, abono, reactivación, campañas, CRM, fidelización, finanzas, planes con precios, garantía, objeciones, demo, rubros). Editables en HQ → Conocimiento.
- **Diseño conversacional (decisiones del fundador):** meta-demo revelado en el momento justo; precios **consultivos** (descubrir → recomendar plan + valor al instante); persona con nombre cálido ("Sofía"); jamás técnico.

#### ⚠️ Issue conocido — primer mensaje al número HQ llega como "unsupported" (error 131060)
- Al probar, el inbound al `+56962303576` llegó al webhook pero con `whatsappInboundMessage.type = "unsupported"` y error **131060 "This message is unavailable"** → el webhook lo ignora (`validTypes = [text, audio, image, interactive, button]`).
- **Causa:** típico del **primer mensaje** tras conectar un número WABA, o mensajes reenviados / de una sola vista / no descifrables. NO es bug de código ni de OpenAI (las clínicas responden OK con el mismo webhook/keys).
- **Fix:** reenviar un **texto plano nuevo**. Si persiste con texto plano, revisar el estado del número en YCloud (provisioning WABA). Mejora futura opcional: que el webhook responda un fallback amable ante `type: "unsupported"`.

#### Pendientes Fase 2 (builds aparte)
- [x] **Sección Plantillas de HQ** (espejo de `Templates`) — HECHO sesión 27 (`AdminTemplates.tsx`, `/hq/templates`).
- [x] **Sección Integraciones de HQ** — HECHO sesión 27: panel "Configurar conexión de YCloud" (número + API key por UI) en `AdminIntegrations.tsx`.
- **Webhook secret (HMAC) para HQ** — la columna `ycloud_webhook_secret` NO existe en `clinic_settings`; el webhook corre permisivo sin secret. Crear columna + wiring = mejora de seguridad opcional.

---

### Cambios realizados — junio 2026 (sesión 27) — Ads en marcha: CTA WhatsApp, recordatorios de demos, deploy fix Clara

#### Landings de ads — WhatsApp como CTA primario + evento Lead
- Tras analizar **Clarity** (100 sesiones de los ads: ~50% rebote en ≤3s, ~0 clics a CTA), se diagnosticó que el rebote venía de **peso de página** (ya optimizado) + **objetivo Tráfico** (trae clics de baja intención). El fundador pausó Tráfico y movió presupuesto a **Conversiones (Lead) + Click-to-WhatsApp**.
- **`micropigmentadoras.html`, `estetica.html`, `tatuadores.html`:** el hero invierte la jerarquía → **WhatsApp verde sólido = CTA primario** (`.btn-wa`, `order:1`), "Agendar demo" = secundario ghost (`.btn-ghost`, `order:2`). En móvil quedan apilados con WhatsApp arriba.
- **Alineación del evento de optimización:** el botón de WhatsApp ahora dispara `fbq('track','Contact')` **+ `fbq('track','Lead')`** (hero + burbuja, las 3 landings), para que la campaña de Conversiones (optimizada por `Lead`) persiga el CTA primario real. Todo el tracking (Pixel demo+WhatsApp + CAPI de Sofía) unificado en `Lead`.

#### Verificación de dominio en Meta — `citenly.com`
- Meta etiqueta `facebook-domain-verification` (content `sz8ez3edrcg6ivmpgk59wxebek5dx6`) insertada en el `<head>` de `index.html` + las 3 landings. Dominio **verificado** en Business → Seguridad de marca → Dominios. Habilita atribución/priorización de eventos `Lead`/`Schedule`.
- **Dataset "Citenly Pixel" `1010227561873487`:** Pixel funcionando (PageView/Lead/Contact por Navegador). CAPI (eventos de servidor) configurado pero **solo dispara con tráfico real de anuncios CTWA** (necesita `ctwa_clid`).

#### Motor de Sofía — verificado end-to-end (ya guarda y agenda)
- El bug "leads no se guardaban" (email NOT NULL) estaba **arreglado y desplegado** (commit `5111ef6`, en v160 del 22-jun). Test fallido de "Carla" (20-jun) fue **antes** del fix.
- **Test en vivo OK:** Sofía agendó videollamada → fila en `demo_requests` con `scheduled_at` ISO correcto (normalización "mañana 4 PM" → `2026-06-24 20:00 UTC`) + notificación al fundador.
- **`DEMO_NOTIFY_PHONE` seteado** = `56929935817` (los avisos de demo agendada llegan ahí). La función toma el secret sin redeploy.

#### Sección Plantillas de HQ (`/hq/templates`, `AdminTemplates.tsx`)
- Espejo dark de `Templates`: lista/crea/elimina plantillas de YCloud del número de ventas vía `retentionService` con `HQ_ID` (las 3 funciones `*-ycloud-template[s]` resuelven la key por `clinic_id`, `verify_jwt=false`). Detección de variables `{{n}}` + ejemplos para aprobación de Meta.
- **Fix categoría:** el selector era cosmético — `createRemoteTemplate` no enviaba `category` → caía en `MARKETING` por defecto. Ahora el servicio acepta/reenvía `category` (y la página pasa la opción). `create-ycloud-template` ya aceptaba el campo.
- **Plantilla `recordatorio_videollamada`** creada y **aprobada por Meta** (quedó MARKETING · ES — Meta re-clasifica por contenido; se dejó así, sirve para este volumen). Vars: `{{1}}`=nombre, `{{2}}`=fecha, `{{3}}`=hora.

#### HQ → Integraciones — gestión de la conexión YCloud por UI
- Panel "Configurar conexión de YCloud" en `AdminIntegrations.tsx`: editar **número** + **API key** (campo password; vacío = no cambiar) vía REST PATCH + política "Platform admins can update clinic settings". Ya no hace falta SQL para la key.

#### Recordatorios de videollamadas — `cron-demo-reminders` (Pieza 2)
- Nueva edge function: recuerda al **prospecto** su videollamada **24h y 2h antes** vía plantilla `recordatorio_videollamada` desde el número HQ; ping best-effort al fundador (`DEMO_NOTIFY_PHONE`).
- **Migración** `20260623000000_demo_reminders.sql`: `reminder_24h_sent` / `reminder_2h_sent` en `demo_requests` (anti-duplicado).
- `config.toml`: `verify_jwt=false`. **pg_cron Job 18** `*/15 * * * *`. Probado en vivo (`sent24=1`). Formato fecha/hora en `America/Santiago`.

#### Fix CRM/Calendario HQ — RLS de `demo_requests`
- **Causa:** `demo_requests` tenía RLS activa **sin políticas** → el CRM y el Calendario del HQ (leen con el JWT del admin) recibían 0 filas, pese a que el webhook (service role) sí guardaba. Por eso "Sofía no aparecía en el CRM".
- **Fix** (`20260623000001_demo_requests_admin_rls.sql`): políticas `SELECT` y `UPDATE` para `auth.uid() IN (SELECT id FROM platform_admins)`. La tabla sigue cerrada al resto.

#### Deploy deliberado del fix incidente Clara (`d01f7fe`)
- Desplegadas las 4 funciones (`ycloud-whatsapp-webhook` v162, `cron-process-reminders`, `cron-cancel-pending-deposits`, `ycloud-templates`) tras revisar cada diff. Job 17 confirmado en `*/15`. Ver "✅ RESUELTO (sesión 27)" en Tareas pendientes.

#### Revisión de seguridad de la sesión (2 fixes aplicados + desplegados)
- **[MEDIA — IDOR] Funciones de plantillas YCloud** (`get-ycloud-templates`, `create-ycloud-template`, `ycloud-templates`): autenticaban (usuario logueado) pero NO verificaban que el usuario perteneciera al `clinic_id` → cualquier usuario logueado podía gestionar plantillas de otra clínica (incl. `HQ_ID`, que es `0000…` adivinable: borrar `recordatorio_videollamada` o crear spam en el número de ventas). **Fix:** check de membresía tras `getUser()` en las 3 funciones — `clinic_members` para clínicas, `platform_admins` si `clinic_id === HQ_ID`. Quitado el fallback inseguro "proceeding with caution" de `get-ycloud-templates`. **Importante:** en Citenly la tabla de membresía es **`clinic_members`** (`clinic_users` NO existe — eso es de Vetly). El admin HQ (`sbarrera.olivero@gmail.com`) está en `platform_admins`.
- **[BAJA — exposición de secreto] `ycloud_api_key` al navegador:** `AdminIntegrations` hacía `.select('… ycloud_api_key')` aunque solo usaba un booleano. **Fix:** RPC `clinic_has_ycloud_key(uuid)` (SECURITY DEFINER, devuelve solo boolean, GRANT a `authenticated`) — migración `20260623000002`. El frontend ya no trae el valor de la key.
- **[BAJA / opcional — NO aplicado] `cron-demo-reminders` sin `CRON_SECRET`:** consistente con los otros crons; impacto bajo (idempotente, sin PII en la respuesta). Endurecimiento opcional pendiente.
- Resto de la sesión: **limpio** (landings estáticas sin input de usuario, secrets por env vars nunca hardcodeados, código nuevo saneado, sin SQL injection).

---

### Cambios realizados — junio 2026 (sesión 26) — Agente "Sofía" consultivo, tracking Meta CTWA, calendario HQ

#### Agente de ventas "Sofía" — rediseño conversacional consultivo (`buildSalesPrompt` en `ycloud-whatsapp-webhook`)
- **Persona "Sofía"**, consultiva: descubre la realidad del prospecto con preguntas (rubro, equipo, sedes, dolor) → recomienda EL plan que calza + su valor **en ese momento**. NO agresiva (ofrece la videollamada UNA vez).
- **Cero tecnicismos** (lista negra: créditos IA, tokens, tier, modelo, GPT, API, webhook, prompt). Dice **"inasistencias"** (nunca "no-shows"). Sabe que la IA **reagenda**.
- **Meta-demo:** revela en el momento justo que **ella misma es una IA** ("así como te atiendo, atenderá tu asistente a tus clientas"); menciona/demuestra que **entiende notas de voz** (el webhook ya transcribe audios con Whisper, `transcribeAudioData`).
- **Videollamada con el fundador Sebastián Barrera** (mencionado al ofrecer/confirmar; el tool `agendar_videollamada` lo devuelve).
- **Fecha ISO exacta:** se inyecta `FECHA Y HORA ACTUAL (Chile)` al prompt; el tool pide `preferred_datetime` en ISO 8601 con offset `-04:00`; `agendarVideollamada` normaliza a ISO → cae en su día en el calendario HQ.
- **KB sembrada:** 16 documentos activos en `knowledge_base` (clinic_id HQ_ID), lenguaje 100% de cliente. Editables en HQ → Conocimiento.

#### Fixes del agente
- **`ai_auto_respond = false` en HQ** → el agente no respondía (webhook retorna `ai_disabled`). Activado en la fila HQ. **Toggle ON/OFF agregado en HQ → Integraciones.**
- **Leads no se guardaban:** `demo_requests` tiene `email`/`clinic_name`/`name` como **NOT NULL**; `findOrCreateLead` no los enviaba → INSERT fallaba en silencio. Corregido (incluye defaults + loguea errores). Ahora los leads de Sofía entran al CRM.
- **Issue "unsupported" (error 131060):** el primer mensaje a un número WABA recién conectado llega como `type: "unsupported"` y el webhook lo ignora (`validTypes`). NO es bug — reenviar texto plano. Documentado.

#### Nuevas secciones HQ + rediseño
- **HQ → Integraciones** (`AdminIntegrations.tsx`): tarjeta del Asistente de Ventas WhatsApp con número + badge de estado + **toggle del agente** (`ai_auto_respond` vía REST PATCH, política "Platform admins can update clinic settings"). Ruta `/hq/integrations`.
- **Rediseño dark** de Activaciones (`AdminDashboard`) y Configuración (`AdminSettings`): fuera cajas blancas → `bg-gray-800/border-gray-700`. Fix padding móvil (las páginas ya no duplican el `p-4 md:p-6` del `<main>` del AdminLayout).
- **Calendario HQ** (`/hq/calendar`, antes "Demos"): nuevo `src/components/hq/HQCalendar.tsx` (vista mensual **dark responsive** — chips en desktop, puntos + agenda del día en móvil, color por estado, usa `date-fns`). `AdminCalendar.tsx` tiene **toggle Calendario/Lista** (calendario por defecto), mapea `demo_requests` + `hq_appointments` a eventos, modal de detalle con acciones de estado, y sección **"Por coordinar"** para fechas en texto libre. Menú: "Demos" → "Calendario".

#### Landing micropigmentistas — WhatsApp como 2º CTA
- Botón secundario **"Escríbenos por WhatsApp"** (verde, jerarquía bajo el primario rosa) en el hero, junto a "Agendar Reunión Demo". Justificado ahora que Sofía responde 24/7. Trackea `fbq('track','Contact')`.

#### Tracking de Meta — Conversions API para Click-to-WhatsApp (CTWA)
- **Webhook:** `sendMetaCAPI()` reporta a Meta los eventos reales del chat: `registrar_lead` → **`Lead`**, `agendar_videollamada` → **`Schedule`**. Recupera el `ctwa_clid` del primer mensaje del anuncio (guardado en `messages.payload`) y lo envía al dataset vía `graph.facebook.com/v21.0/{dataset}/events` (`action_source: business_messaging`, `messaging_channel: whatsapp`). Gated tras env vars.
- **Setup en Meta (hecho):** dataset **"Citenly Pixel" = `1010227561873487`**; **system user "Conversions API System User"**; **app "Citenly App"** (developers.facebook.com, caso de uso "API de marketing", permiso `ads_management`); token generado del system user.
- **Secrets en Supabase (seteados):** `META_CAPI_DATASET_ID=1010227561873487`, `META_CAPI_ACCESS_TOKEN`.
- **Solo dispara con anuncios CTWA** (el `wa.me` de la landing NO trae `ctwa_clid`; ahí solo está el clic vía Pixel). El webhook loguea `Meta CAPI error: ...` si Meta rechaza el formato.

#### Otros
- **Debounce del webhook 30s → 15s** (rolling/auto-reset: cada mensaje espera 15s desde su llegada; el más nuevo resetea y solo el último procesa). Global (todas las clínicas).

#### Pendientes (en orden)
1. **Sección Plantillas de HQ** (espejo de `Templates`) — para mensajes proactivos/seguimiento.
2. **HMAC (webhook secret)** — crear columna `ycloud_webhook_secret` + wiring en `verifyYCloudSignature`.
3. **Repaso móvil** del resto de páginas HQ (Mensajes, CRM, Clínicas).
4. (Opcional) **DST del offset de Chile** en el agendamiento ISO de Sofía (hoy hardcodeado `-04:00`, correcto en invierno; revisar en verano).

---

### Cambios realizados — junio 2026 (sesión 26) — Incidente Clara Barros: abono cobrado por cupo nunca reservado

> ✅ **ESTADO: DESPLEGADO a producción el 23-jun-2026 (sesión 27, webhook v162).** Los candados de abono/confirmación y el corte de 30 min ya están vivos para las clínicas. Queda solo la acción operativa con la clienta (ver "RESUELTO (sesión 27)" en Tareas pendientes).

#### El incidente
Clienta **Clara Cecilia Barros Mora** (`56978916921`) en Elizabeth Microblading. La IA le ofreció lunes 22 jun a las 4 PM, le pidió abono de $10.000, ella transfirió y envió comprobante, y luego la IA le dijo que ese horario ya estaba ocupado. Clara (que creía tener cita confirmada) se enfureció y amenazó con funar a Elizabeth.

#### Causa raíz (verificada en DB de producción)
**La IA entregó los datos de transferencia del abono SIN haber llamado antes a `create_appointment`. El cupo del lunes 22 a las 4 PM nunca se bloqueó.** Confirmado: `appointments` no tenía ninguna fila para el teléfono de Clara. El horario quedó libre y ~8h después **Ana Gaete** (cita `489b9738…`, `2026-06-18T17:00 UTC`) lo reservó legítimamente (confirmed). Cuando Clara volvió ~39h más tarde a pagar, el cupo ya estaba ocupado → conflicto.

`check_availability` NO falló: cuando ofreció las 4 PM (18 jun 09:08 UTC) el cupo estaba realmente libre. El error fue prometer/confirmar sin reservar nunca.

**Cadena de fallas:**
1. **Ruteo de modelo defectuoso:** el mensaje de selección "A las 4 podría ser" no contiene ninguna keyword de `classifyMessage` (`n2Keywords`/`n3Keywords`) → cayó en **Tier 1 (gpt-4o-mini)**, que se saltó pedir nombre + `create_appointment` y fue directo a dar el abono.
2. **Alucinaciones agravantes:** la IA dijo "horario reservado provisionalmente" (no existía cita) y luego, tras `confirm_appointment` devolver "No encontré una cita pendiente", igual respondió "Tu cita está confirmada" — violando la regla 7 del prompt.

**Nota estructural:** aun reservando bien, el `cron-cancel-pending-deposits` (2h) habría liberado el cupo antes de que Clara pagara (39h después). Pero eso es comportamiento de negocio defendible si se le avisa; el daño real fue cobrar por algo nunca reservado.

#### Decisión del fundador sobre el cupo
El cupo debe quedar claro que **solo se asegura al recibir el comprobante**. Enfoque elegido: **"apartar corto + ser honesta"** → guardar el cupo 30 min (antes 2h) PERO la IA comunica explícitamente que solo queda asegurado con el comprobante y que si no llega se libera.

#### Los 4 cambios implementados (en local)
**`supabase/functions/ycloud-whatsapp-webhook/index.ts`:**
1. **Ruteo (escalada por selección de horario)** (~L2414-2429): si el último mensaje outbound de la IA ofreció horarios (regex de horas `\d{1,2}:\d{2} AM/PM` o "disponibilidad/horarios disponibles/podemos agendar"), se fuerza `tier = 2` para el mensaje actual. Así el paso de agendamiento nunca lo maneja el mini. `const tier` → `let tier`. Guardado con `clinic.id !== HQ_ID`.
2. **Candado de abono** (~L2519-2524): antes de enviar, si la respuesta contiene datos bancarios (detecta líneas con dígitos de `clinic.transfer_details` dentro de `finalReply`) pero NO existe cita activa en DB (`pending/pending_deposit/confirmed`) para el teléfono → bloquea y reemplaza por un mensaje que pide nombre + horario para registrar primero.
3. **Candado de confirmación** (~L2504-2530): si la respuesta afirma "confirmada/reservada/agendada" (participios, NO infinitivos; excluye frases negativas tipo "no tienes ninguna cita reservada") pero NO hay cita activa en DB → reemplaza por mensaje honesto ("no logré dejar tu cita registrada…"). Ambos candados son a nivel sistema, no dependen de que el modelo obedezca. `const finalReply` → `let finalReply`.
4. **Mensaje honesto + 30 min:** prompt del flujo `require_deposit_first` (~L2300-2301) y mensaje de retorno de `createAppt` para `pending_deposit` (~L756) reescritos: "GUARDADO temporalmente por 30 min, asegurado solo con el comprobante, si no llega se libera".

**`supabase/functions/cron-cancel-pending-deposits/index.ts`:** cutoff 2h → **30 min** (`30 * 60 * 1000`).

#### Cómo consultar la DB de Citenly (recordatorio, el MCP apunta a Vetly)
Script Node con keys del `.env` local (`VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) y `@supabase/supabase-js`. Funcionó bien esta sesión para inspeccionar `appointments` y `messages` de Elizabeth (`1ab32091-210c-4525-a7e1-e6a7dca1c8c6`). Recordar: Chile en junio = UTC-4, así que 4 PM local = 20:00 UTC en `appointment_date`.

---

### Cambios realizados — julio 2026 (sesión 28) — Doble booking por `professional_id` NULL + regla de retoque olvidada

#### Incidente 1: la IA agendó a Sofia Arcos Valencia en un horario ya ocupado (viernes 3 jul 5 PM)

**Causa raíz (verificada en DB de Elizabeth Microblading, `1ab32091-...`):** la cita de **Yasna Cancino** para ese mismo horario ya existía (`status: confirmed`, `professional_id: NULL`, `patient_id` vinculado, `price: 0`) — todo indica que se creó **manualmente desde el dashboard** dejando el campo profesional sin asignar, no vía IA. El servicio "Microblading de cejas" sí tiene profesional asignado en `service_professionals` (Elizabeth), así que cuando la IA agendó a Sofia ~6h después, resolvió correctamente `professional_id = Elizabeth`.

El motor de disponibilidad (`get_professional_available_slots`, migración `20260311180000_fix_availability_intervals_and_logic.sql:199-203`) calcula los rangos ocupados filtrando **estrictamente** `WHERE professional_id = p_member_id`. La cita de Yasna, al tener `professional_id: NULL`, **nunca contó como "ocupado" para ningún profesional** — quedó invisible para el chequeo de disponibilidad. Como Elizabeth es la única profesional activa de la clínica, cualquier cita (manual o de la IA) que quede sin `professional_id` genera un hueco fantasma en la agenda que permite doble-booking.

**Pendiente (no implementado esta sesión):** hacer `professional_id` obligatorio en la creación manual de citas desde `Appointments.tsx` (o, alternativamente, que las RPC de disponibilidad traten las citas sin profesional como ocupando a *todos* los profesionales activos). Confirmado con el fundador que la dirección correcta es la primera opción.

#### Incidente 2: la IA cotizó "retoque" ($50.000) a una clienta con tratamiento de hace 3 años (debía ser $89.000)

**Síntoma:** clienta indicó "me hice micropigmentación hace como 3 años", el agente reconoció ">12 meses" pero igual ofreció "retoque" como opción; minutos después, ante la pregunta literal "el valor del retoque porfavor", respondió $50.000 sin volver a cruzar el dato de los 3 años.

**Causa raíz:** la regla de negocio en `ai_behavior_rules` (agregada en sesión 21) estaba bien escrita, pero **ambos mensajes cayeron en Tier 1 (gpt-4o-mini)** porque `classifyMessage()` (`n2Keywords`, [index.ts:95-101](supabase/functions/ycloud-whatsapp-webhook/index.ts#L95-L101)) no incluía `"valor"` (forma más común en Chile de preguntar precio) ni `"retoque"`. El mini no sostuvo la regla condicional multi-turno.

**Fixes aplicados y desplegados:**
1. **`ycloud-whatsapp-webhook` (`n2Keywords`):** agregadas `"valor"` y `"retoque"` — cualquier mensaje de precio/retoque ahora escala a Tier 2. Deployado a producción.
2. **`ai_behavior_rules` de Elizabeth (PATCH directo a `clinic_settings`):** nueva línea "REGLA ANTI-OLVIDO" bajo la regla de trabajos previos — si el cliente pregunta literalmente "el valor del retoque" pero ya indicó antes más de 1 año desde su tratamiento, el agente debe ignorar la palabra "retoque" de la pregunta y responder igual con el Valor Normal ($89.000).

**Patrón repetido (ya visto en sesión 19 con cancelaciones y sesión 26 con selección de horario):** cualquier paso crítico de negocio (precios, cancelaciones, selección de horario/servicio) que dependa de contexto de turnos anteriores debe forzarse a Tier 2+ vía `n2Keywords`/`n3Keywords` — el mini no es confiable para lógica condicional multi-turno aunque la regla esté bien escrita en el prompt.

### Cambios realizados — julio 2026 (sesión 29) — Auditoría del sistema de recordatorios + fix definitivo de "ofrece horarios y luego los rechaza"

#### Incidente A (crítico, comercial): la IA ofrece horarios y al elegirlos dice "ya no está disponible"

**Síntoma reportado varias veces y "arreglado" antes sin éxito.** Caso verificado: María José Muñoz (`56953363953`, 20-jul) — `check_availability` ofreció `1:15 PM … 6:15 PM`; al elegir 5:45 PM, `create_appointment` respondió "no disponible" y ofreció `10:00 AM … 1:30 PM`. La clienta escribió: *"para que dan opciones que luego inhabilitan"*.

**Causa raíz (dos defectos que se suman, ambos en `createAppt`):**
1. **Validación contra una lista truncada.** `checkAvail` recorta a 15 slots (`result.slots.slice(0, 15)`) — ese recorte existe solo para no saturar el mensaje al cliente. Pero `createAppt` reusaba esa lista recortada para validar (`isTimeAvailable`). Con servicios de 15 min (Evaluación) un día genera ~40 slots, así que **los primeros 15 llegan solo hasta la mitad del día**: cualquier reserva de la tarde se rechazaba aunque el cupo estuviera libre.
2. **Filtros distintos a los de la oferta.** `createAppt` llamaba `checkAvail` **sin pasar `clinicObj`**, así que su re-chequeo corría sin horario de la clínica, sin colación y sin `same_day_buffer_hours`. La lista de validación no era la misma que la ofrecida.

**Fix:** `checkAvail` recibe un parámetro `fullList` (desactiva el truncado); `createAppt` recibe `clinicObj` y llama `checkAvail(..., clinicObj, undefined, undefined, true)`. El mensaje de rechazo sigue mostrando máximo 15 horarios. **Regla permanente: el truncado a 15 es solo de presentación — nunca debe usarse como fuente de verdad para validar una reserva.**

**Por qué solo se veía en Elizabeth y no en otras agendas:** el truncado a 15 únicamente muerde cuando el día genera **más de 15 cupos**, y la cantidad de cupos depende de la duración del servicio (`p_interval = min(duration, 60)`). Microblading (120 min) → ~9 cupos/día; Retoque (60 min) → ~10; ambos caben en 15 y la lista truncada era idéntica a la completa → sin bug. La **Evaluación de Microblading dura 15 min** → ~40 cupos/día → los primeros 15 llegan solo hasta las 13:30. **El bug afectaba exclusivamente a servicios cortos y solo en reservas de tarde.**

**Cadena completa del incidente (4 eslabones, no 1):**
1. La validación devolvió la lista equivocada (solo mañana, por el truncado + falta de filtros).
2. El rechazo afirmó "se acaba de ocupar" — texto fijo en el código, sin comprobar nada.
3. **La IA inventó horarios.** Al recibir una lista de mañana que contradecía su propia oferta de tarde, recicló su oferta anterior y presentó `4:00–5:15 PM` como disponibilidad nueva. Esos cupos **no los devolvió ninguna herramienta**.
4. Al segundo rechazo repitió fielmente la lista de mañana → ofreció mañana sin que la clienta la pidiera nunca.

#### ⚠️ REGLA ESTRUCTURAL (la lección más importante de esta sesión)

**Una afirmación falsa que nace en el `return` de una herramienta NO se corrige con reglas de prompt.** Durante sesiones se atacó este síntoma endureciendo el prompt (regla anti-alucinación de la sesión 17) y el ruteo de modelo (escalada a Tier 2 de la sesión 26), y volvió a ocurrir cada vez — porque el modelo **no estaba alucinando**: repetía de buena fe el texto que `createAppt` le entregaba.

Antes de escribir una regla de prompt para corregir algo que "dice mal" el agente, **verificar primero qué devolvieron las herramientas en ese turno** (`messages.ai_function_result` en la DB). Si el dato falso ya viene ahí, el bug es de código y ninguna instrucción al modelo lo va a arreglar.

**Corolario:** ninguna función debe afirmar una causa que no comprobó. El mensaje de rechazo de `createAppt` daba por hecho "se acaba de ocupar" sin mirar la DB. Ahora consulta si existe realmente otra cita en ese bloque y solo entonces lo afirma; si no, usa un texto neutro que no inventa un motivo.

#### Candado de horarios inventados (eslabón 3)

Los eslabones 1, 2 y 4 se corrigen en la fuente de datos. El 3 es alucinación del modelo y necesita un candado a nivel sistema, como los de abono/confirmación de la sesión 26:

- Antes de enviar, se extraen las menciones horarias de `finalReply` y se comparan contra un conjunto permitido.
- **Permitido:** horas presentes en los resultados de las herramientas de ESTE turno + horas que mencionó el propio cliente en su mensaje entrante (la IA puede repetir "las 5:15 PM no están disponibles") + horario de atención y colación de `clinic.working_hours`.
- Si aparece una hora fuera de ese conjunto → se reemplaza el mensaje por la lista real de cupos.
- Normalización: `"4:00 PM"`, `"16:00"` y `"16:00 PM"` se resuelven al mismo valor. Las horas sin AM/PM son **ambiguas a propósito** (`"5:45"` → 5:45 o 17:45) y basta con que una lectura sea válida, para no bloquear mensajes legítimos.
- Scopeado a `clinic.id !== HQ_ID` (no afecta a Sofía).

Validado con 8 casos, incluidos los dos turnos reales de María José: el turno donde inventó `4:00–5:15 PM` se bloquea, y el turno donde repitió correctamente la lista se deja pasar.

#### Incidente B: los recordatorios de 24h se enviaban SIN botones de confirmación

**Causa raíz:** el cron usa el template con botones (`template_confirmation` = `confirmacion_cita`) solo si `appt.status === 'pending' && !appt.confirmation_received`. Pero `confirmAppt`, al verificar el abono (`pending_deposit` → `pending`), marcaba **`confirmation_received: true`**. Eso apagaba la única condición que dispara los botones → caía al template plano `recordatorio_oficial_24hrs`.

Contradecía directamente el diseño de la sesión 23: la cita queda en `pending` **precisamente** para que el template de 24h con botones la mueva a `confirmed`/`cancelled`.

**Fix:** verificar el abono ya no marca `confirmation_received`. Solo se marca cuando hay una decisión real del cliente (confirmar o cancelar). Además se limpiaron las citas futuras que habían quedado con el estado viejo.

#### Incidente C: el 100% de los recordatorios de 2h fallaba (silenciosamente)

`reminder_settings.template_2h` decía **`2hr_recordatorio_cita`** pero la plantilla real en la WABA se llama **`2hrs_recordatorio_cita`** (con "s"). YCloud respondía `403 WHATSAPP_TEMPLATE_UNAVAILABLE` en todos los envíos. Corregido en DB. Totales históricos del daño: `2h/failed: 54`, `24h/failed: 180`.

#### Incidente D: citas a las :15/:30/:45 nunca recibían recordatorio de 2h

El bloque de 2h filtraba por ventana (`now+90min` a `now+150min`) **y además** exigía `apptHour === targetHour`. Con el cron corriendo cada hora en punto, una cita a las 11:30 caía en la ventana de la corrida de las 10:00 pero su hora (11) no coincidía con `targetHour` (12) → descartada; y en la corrida siguiente ya no entraba en la ventana. **Nunca se enviaba.** Crítico para Elizabeth, cuyas Evaluaciones duran 15 min y caen en :15/:30/:45. **Fix:** eliminado el chequeo de hora exacta — la ventana ya define qué citas tocan, y la idempotencia por `reminder_logs` evita duplicados.

#### Incidente E: los "Bloqueo de Agenda" intentaban recibir recordatorios cada hora

Los bloqueos de agenda se guardan como citas con teléfono `000000000`. El cron intentaba enviarles recordatorio en cada corrida, YCloud devolvía `PARAM_INVALID` y se escribía una fila `failed` en `reminder_logs` **cada hora, indefinidamente** (la idempotencia solo salta los `status = 'sent'`). **Fix:** helper `isContactable()` que descarta teléfonos inválidos y el nombre "Bloqueo de Agenda", aplicado en los bloques de 24h y 2h.

#### Observación adicional (no corregida): la IA promete el cupo antes de reservarlo

En el mismo chat, al elegir ella las 5:45 PM, la IA respondió *"agendaremos tu evaluación para hoy a las 5:45 PM, indícame tu nombre completo"* **sin haber llamado aún a `create_appointment`**. Recién lo llamó dos mensajes después. Es el mismo patrón del incidente Clara (sesión 26): comprometer un cupo que todavía no está reservado. El candado de abono cubre el caso de soltar datos bancarios sin cita, pero **no** el de prometer verbalmente un horario antes de registrarlo. Queda como riesgo conocido.

#### Despliegue y verificación

**Desplegadas:** `ycloud-whatsapp-webhook` (3 veces: fix de validación, mensaje honesto, candado de horarios), `cron-process-reminders`.
**Commits:** `b4a7b0f` (recordatorios + validación de cupos), `430f290` (no afirmar "se ocupó" sin comprobar), `0cd235d` (candado de horarios inventados).
**Datos corregidos en producción:** `reminder_settings.template_2h` → `2hrs_recordatorio_cita`; citas futuras en `pending` con `confirmation_received` heredado del bug → limpiadas (1 fila: Victoria Luarte, 11-ago).

**Estado de verificación (honesto):** el cron se ejecutó en vivo sin errores tras el fix, y el candado se validó con 8 casos incluidos los dos turnos reales de María José. Pero **al cierre de la sesión todavía no se había observado en producción** ni una reserva de tarde completándose end-to-end, ni un recordatorio de 24h llegando con botones. Casos a revisar para confirmar: la cita de Claudia Valdes (21-jul 14:30 — debería recibir 24h **con botones** y el de 2h, que antes nunca habría recibido por caer en :30).

---

### Cambios realizados — agosto 2026 (sesión 32) — Control post-tratamiento gratuito (caso Margarita Retamal)

#### El incidente (4-ago, `56973323611`)
Margarita, clienta con **Retoque hecho el 27-jul** (una semana antes), escribió porque sus cejas se veían "solo sombreado negro" y disparejas. La conversación terminó con: **cita fantasma** (le confirmaron las 19:00 de ese día, llegó a la clínica y no estaba en la agenda) y **cuatro cambios de criterio sobre el precio** — evaluación $10.000 → "sin costo" → abono $10.000 con datos de transferencia → "no necesitas abono".

#### Causa raíz — una cadena, no un error suelto
1. **No existía un servicio de control gratuito.** La IA razonó bien (ofreció una "consulta de seguimiento sin costo"), pero al agendar tuvo que elegir un servicio real de la lista y tomó **"Retoque de Microblading" ($50.000)**.
2. **Elizabeth tiene `require_deposit_first = true`**, así que `createAppt` puso la cita en `pending_deposit` y el flujo pidió el abono de $10.000 — contradiciendo lo que la IA acababa de prometer. El modelo no se equivocó: el sistema le pidió cobrar.
3. **Sin comprobante (era gratis), `cron-cancel-pending-deposits` la canceló a los 30 min** (creada 15:30, cancelada 16:15 UTC). Por eso desapareció de la agenda.
4. **`patient_name` quedó como `"Cliente"`** — un placeholder que el prompt prohíbe pero que nada bloqueaba en código. Aunque la cita hubiera sobrevivido, era inencontrable.
5. Los mensajes clave ("Hoy se cumple una semana que me las hizo") cayeron en **Tier 1**: ninguna palabra los escalaba.

#### Fixes aplicados (desplegados)
- **Servicio nuevo `Control de Seguimiento`** — $0, 30 min, con Elizabeth asignada en `service_professionals` (`2d2c87dc-…`). Verificado que el `ilike` no colisiona con los demás servicios.
- **`createAppt`: un servicio de precio 0 nunca entra al flujo de abono.** `isFreeService` → la cita se crea en `pending` aunque `require_deposit_first` esté activo, y el retorno lleva una `instruction` que prohíbe pedir abono, dar datos de transferencia o mencionar pagos. Esto es lo que corta la cadena de raíz: sin `pending_deposit`, el cron no puede cancelarla.
- **`createAppt`: nombres genéricos resueltos contra `patients`.** Si el nombre es "Cliente"/"Paciente"/"Sin nombre"/`[...]`, se busca el nombre real del contacto por teléfono y se usa ese.
- **`n2Keywords` += post-venta** (`seguimiento`, `control`, `despigment`, `disparejo`, `sombreado`, `cicatriz`, `costra`, `se me ve`, `no me gusta`, `quedó mal`, `me las hizo`): distinguir control gratuito de procedimiento pagado depende del historial y el mini no sostiene esa lógica (sesiones 19, 26, 28).
- **`ai_behavior_rules` regla 4.5 "CONTROL POST-TRATAMIENTO — JAMÁS SE COBRA"**: si la clienta escribe por el resultado de un trabajo ya realizado, es control gratuito; prohibido ofrecer Evaluación $10.000, cobrar retoque o pedir abono; se agenda con `"Control de Seguimiento"`; ≤30 días desde el tratamiento = control; y **prohibición explícita de contradecirse** (si ya dijo "sin costo", no puede volver a pedir dinero).

**Regla general que deja este caso:** cuando la IA promete algo que el sistema no puede ejecutar (un servicio gratuito que no existe en `services`), la contradicción es inevitable y el modelo queda atrapado entre su promesa y el flujo. **Toda excepción comercial que la IA pueda ofrecer necesita existir como servicio real en la tabla.**

### Cambios realizados — julio 2026 (sesión 30) — Evaluación online (gratis) vs presencial ($10.000), Elizabeth Microblading

#### Contexto
Hay un anuncio antiguo (video) todavía circulando que ofrece "evaluación gratis" de Elizabeth. Actualmente la evaluación presencial tiene un valor de $10.000 (servicio "Evaluación de Microblading" en la tabla `services`, 15 min). Decisión del fundador: en vez de desmentir el anuncio, se habilita una modalidad online gratuita real, y se distingue claramente de la presencial (pagada).

#### Cambio (aplicado directo en producción, sin deploy de edge function — es contenido, no código)

**`clinic_settings.ai_behavior_rules` (regla 3, "Servicios") — clínica `1ab32091-210c-4525-a7e1-e6a7dca1c8c6`:**
- Nueva sub-regla "EVALUACIÓN — DOS MODALIDADES": cuando el paciente pide evaluación o menciona "evaluación gratis", la IA SIEMPRE debe presentar ambas opciones para que el paciente elija:
  - **Online (GRATIS):** el paciente envía una foto de la ceja con buena iluminación por el chat. Al recibirla, la IA agradece y llama de inmediato a `escalate_to_human` (marca `requires_human=true` + notificación en el dashboard) para que Elizabeth revise la foto y responda ella misma — la IA no diagnostica, no cotiza y no sugiere tratamiento basándose en la imagen, solo deriva y se despide.
  - **Presencial:** $10.000 (se descuenta del abono si toma el tratamiento), más detallada, en el centro FixSalud — sigue el flujo normal de agendamiento con el servicio "Evaluación de Microblading" ya existente.
  - Si el mensaje entrante viene de un `[Mensaje desde Anuncio: ...]` que ofrece "evaluación gratis", la IA aclara que la gratuidad aplica solo a la modalidad online.
- No fue necesario tocar `n2Keywords`/`n3Keywords` en el webhook: `"evaluacion"` ya estaba en `n3Keywords` (escala a Tier 3), así que este flujo siempre lo maneja el modelo más capaz.

**Documento "Servicios" de `knowledge_base`** (mismo clinic_id): el punto 3️⃣ actualizado con la misma distinción de dos modalidades, para que `get_knowledge` sea consistente con el prompt.

#### ⚠️ Cambio TEMPORAL — condicionado al anuncio antiguo, no a una decisión de producto permanente
El fundador fue explícito: esto se mantiene solo **mientras el anuncio viejo siga activo**. Cuando lo pause, avisará para revertir la regla 3 de `ai_behavior_rules` y el punto 3️⃣ de "Servicios" a como estaban antes (solo evaluación presencial $10.000, sin modalidad online ni derivación por foto). **No revertir por iniciativa propia** — esperar la confirmación explícita del fundador de que el anuncio ya está pausado.

---

### Cambios realizados — julio 2026 (sesión 31) — Promoción de remarketing $69.000, Elizabeth Microblading

#### Contexto
Campaña de remarketing en Meta (IG + FB) dirigida a quienes ya interactuaron con las páginas. El creativo ofrece **Microblading de Cejas y Micropigmentación de Ojos a $69.000 c/u** (valor normal $89.000), "sólo por medio de esta publicación". El CTA es Click-to-WhatsApp con mensaje predefinido: **"Hola! Quiero agendar para la promoción de la publicidad. Mi nombre es"**.

#### Las 3 fuentes de precio actualizadas (regla de sesión 19 incidente 5)

**1. Tabla `services` — dos servicios promocionales nuevos** (clínica `1ab32091-…`):
| Servicio | Duración | Precio | ID |
|---|---|---|---|
| `Promo Publicidad - Cejas` | 120 min | $69.000 | `44d56178-3f64-4d20-ac80-15a7354188c0` |
| `Promo Publicidad - Delineado de Ojos` | 180 min | $69.000 | `7f8b9b25-e4da-4a20-8dbc-90dbba1b86f4` |

Ambos con fila en `service_professionals` apuntando a Elizabeth (`8924ca21-…`) — **obligatorio**, si no la cita queda con `professional_id` NULL e invisible para el chequeo de disponibilidad (sesión 28). Servicios separados (y no un descuento aplicado sobre el existente) para que `createAppt` fije el `price` correcto desde la tabla y Finanzas cuadre solo.

**⚠️ Los nombres NO son cosméticos.** `createAppt` y `checkAvail` resuelven el servicio con `ilike %nombre%` + `.limit(1)` **sin `order by`** — si dos servicios matchean, el elegido es indeterminado. Los nombres se eligieron para que no haya colisión: `"Microblading de cejas"` y `"Micropigmentación de Ojos"` resuelven solo al servicio normal, y `"Promo Publicidad - …"` solo al promocional (verificado con probes contra producción). Siguen siendo ambiguas las abreviaturas (`"cejas"`, `"ojos"`) → por eso el prompt exige nombre exacto. **Al crear futuros servicios promocionales, verificar el `ilike` antes de darlos por buenos.**

**2. `clinic_settings.ai_behavior_rules` — nueva regla 2.5 "PROMOCIÓN DE PUBLICIDAD (REMARKETING)"** (PATCH directo, sin deploy):
- **Único disparador:** el mensaje predefinido de la publicidad (acepta variantes, tipeos y que venga dentro de `[Mensaje desde Anuncio: ...]`). **Persiste toda la conversación** aunque los mensajes siguientes no la mencionen.
- **Alcance:** solo Cejas y Ojos. Retoque sigue $50.000 y Evaluación Presencial $10.000. Abono para reservar **sigue siendo $10.000**.
- **Trabajos previos + promo:** >1 año → $69.000 (la promo reemplaza al $89.000); <1 año → Retoque $50.000, la promo no aplica.
- **Candado inverso (importante):** prohibición explícita de mencionar la promo, el $69.000 o los servicios "Promo Publicidad" a quien NO llegó por la publicidad — incluso si pregunta "¿tienen algún descuento?". Necesario porque la lista completa de `services` se inyecta al system prompt, así que el modelo *ve* el $69.000 en todas las conversaciones.
- Ajustada la regla **"PRECIOS DEL ANUNCIO — IGNORAR SIEMPRE"** (sesión 23) con una excepción acotada: el $69.000 es válido **por la regla 2.5**, no por aparecer escrito en el creativo. El bloqueo de $79.000 / $109.000 y de cualquier otra "oferta" del anuncio sigue intacto.
- Reglas 4 d) de Microblading y de Ojos actualizadas con el precio promocional y el nombre de servicio a usar.

**3. `knowledge_base`** — bloque "🎁 PROMOCIÓN PUBLICIDAD (REMARKETING) — $69.000" agregado a los documentos **"Servicios"** y **"Precios/Valores"**, con la misma condición de exclusividad. (El doc "Preguntas frecuentes" no contiene precios — verificado, no requirió cambios.)

#### Detección por anuncio de Meta — `promo_ad_ids` (para cuando borran el mensaje predefinido)

El mensaje predefinido del Click-to-WhatsApp es editable: la clienta puede borrarlo y escribir "hola" a secas. Pero Meta adjunta un objeto `referral` **al primer mensaje del chat** con el `source_id` (ID del anuncio), y ese dato llega igual. Verificado en producción: 90 de los últimos 400 inbound de Elizabeth traen `referral` completo (`source_id`, `headline`, `body`, `ctwa_clid`, `thumbnail_url`).

**Migración `20260724120000_promo_ad_ids.sql`** (aplicada en producción): `promo_ad_ids text[] NOT NULL DEFAULT '{}'` en `clinic_settings`. Lista de IDs de anuncios cuya audiencia recibe precio promocional. `getClinic()` hace `select("*")` → la columna llega sin tocar el select.

**Webhook (desplegado):** antes de armar el system prompt (y para toda clínica con `clinic.id !== HQ_ID`) se busca el primer mensaje promocional de ese contacto en los últimos 30 días. Si `promo_ad_ids` tiene IDs, la búsqueda va por `payload->referral->>source_id` y el resultado se trata como **verificado**; si no hay coincidencia, cae a la señal textual (ver "Dos fuentes" más abajo). Con cualquiera de las dos se inyecta el bloque de contexto de promoción y se marca `clinic._promoActive`.

**Por qué se relee de la DB en cada turno y no se confía en el historial:** `getHistory` carga solo los **últimos 15 mensajes**. En una conversación larga el mensaje del anuncio sale de la ventana de contexto y el modelo perdería el precio promocional — "la promo persiste toda la conversación" es un hecho que el prompt no puede sostener por sí solo (misma lección de la sesión 29: los hechos se resuelven en código, el criterio en el prompt).

**⚠️ No usar `messages.campaign_id` para esto.** `saveMsg` tiene un guard `isValidUUID` que **descarta** el valor cuando no es UUID, y el `source_id` de Meta es numérico (`120252952674660039`) → la columna queda NULL en todos los mensajes de anuncio. El ad ID vive únicamente en `payload->referral->>source_id`. El filtro JSONB (`.in("payload->referral->>source_id", ids)`) funciona vía PostgREST — verificado con caso positivo y control negativo.

**Operación — `scripts/promo-ads.cjs`** (no requiere SQL ni deploy, toma efecto en el próximo mensaje):
```bash
node scripts/promo-ads.cjs list          # anuncios vistos en 14 días, con ID, headline, copy y nº de contactos
node scripts/promo-ads.cjs add <adId>    # activa la promo para ese anuncio
node scripts/promo-ads.cjs remove <adId> # la desactiva
```
El ID del anuncio no hay que buscarlo en Meta: aparece en `list` en cuanto llega el primer mensaje desde ese creativo.

**Fallback en el prompt (regla 2.5) mientras el ad ID no esté cargado:** la promo se activa con **cualquiera de 3 señales** — (1) el bloque "PROMOCIÓN CONFIRMADA POR EL SISTEMA", (2) el mensaje predefinido, (3) el contexto `[Mensaje desde Anuncio: ...]` menciona **$69.000**. La señal 3 está acotada a ese valor: cualquier otro precio del anuncio ($79.000, $109.000) sigue ignorándose.

**⚠️ Límite real — el agente NO lee el texto que está DENTRO de la imagen del creativo.** Meta manda `thumbnail_url`/`image_url` como URLs y el webhook no las procesa con visión (sería una llamada de visión extra por cada mensaje de anuncio: costo en créditos y latencia — descartado). Solo se lee el **copy del post** (`referral.body`). Consecuencia práctica: si el $69.000 aparece únicamente en la gráfica, la señal 3 no dispara y la detección depende de tener el ad ID cargado (señal 1) o del mensaje predefinido (señal 2).

#### Vigencia del cupo — 72h por persona + extensión de gracia (decisión del fundador)

**El problema que resuelve** (planteado por el fundador): una promo sin límite erosiona el precio de referencia — quien vio $69.000 ya no vuelve a percibir $89.000 como el precio real, y aprende a esperar la próxima baja (efecto de segundo orden). Pero retirar el precio **sin haberlo anunciado** es peor: la aversión a la pérdida motiva *antes* de perder algo, no después; un corte silencioso se lee como anzuelo y produce resentimiento, no urgencia (antecedente: incidente Clara, sesión 26).

**Política elegida:** el cupo promocional es **personal y dura 72 horas desde el primer contacto**, anunciado en la conversación. Al vencer, la causa comunicada NO es "el precio subió" sino que venció *su* cupo, porque el valor era **de esa publicación** — el descuento pertenece al canal, no a la marca, y así el $89.000 sigue siendo el precio real. Si vuelve tarde con intención real, la IA concede **una única extensión** si agenda y abona el mismo día, presentada como excepción concedida y no como precio disponible (convierte sin entrenar la espera).

Por qué **plazo y no cupos**: el agente no puede contar cupos, y ante "¿cuántos quedan?" solo podría inventar un número. Un plazo se sostiene con la verdad. (El creativo original decía "sólo 8 cupos"; el fundador lo cambió a "solo por tiempo limitado" en esta misma sesión para alinearlo.)

**Webhook (desplegado):** la consulta toma el **primer** mensaje del anuncio (`order created_at asc`) y calcula `deadline = primer contacto + 72h`. Inyecta uno de dos bloques según el estado:
- **VIGENTE** → "PROMOCIÓN CONFIRMADA POR EL SISTEMA" + `ESTADO DE SU CUPO: VIGENTE hasta <fecha en es-CL/America-Santiago>`, con instrucción de mencionarlo una sola vez y sin presionar.
- **VENCIDO** → "SU CUPO YA VENCIÓ" + días transcurridos + fecha de vencimiento + prohibición explícita de decir "el precio subió", derivando a la política de gracia.

La IA **nunca calcula el plazo**: el estado y las fechas vienen del sistema. La ventana de reconocimiento sigue siendo de 30 días — más allá de eso el contacto ya no se asocia al anuncio y se cotiza $89.000 normal.

**Dos fuentes para la fecha del primer contacto, con honestidad distinta** (para que el plazo funcione incluso sin el ad ID cargado):
- **Fuente A (verificada):** primer mensaje con `referral.source_id` en `promo_ad_ids` → header **"PROMOCIÓN CONFIRMADA POR EL SISTEMA"**.
- **Fuente B (indicio, sin verificar):** primer inbound del contacto que menciona la promo en texto (`"promoción de la publicidad"`, `"69.000"`, `"69000"`) → header **"POSIBLE PROMOCIÓN — SIN VERIFICAR"**, que dice explícitamente que el sistema NO confirma que califique y deja la decisión al modelo según los disparadores de la regla 2.5. Solo aporta la fecha para calcular el plazo.

La distinción es deliberada: afirmar "verificado" sobre un indicio textual sería exactamente el error de la sesión 29 (una función afirmando una causa que no comprobó). Verificado contra 30 días de historial de Elizabeth: **0 falsos positivos** de la señal textual.

**`ai_behavior_rules` y KB** — misma política, más dos candados de lenguaje: prohibido insinuar que vendrá otra promoción o que conviene esperar un mejor precio (si preguntan por próximas ofertas: no hay información, el valor es $89.000), y protocolo para quien pagó $89.000 y reclama (fue una publicación puntual con cupos por tiempo limitado, no un cambio de precio; si insiste → `escalate_to_human`).

#### `ycloud-whatsapp-webhook` — ruteo de tier (desplegado)
`n2Keywords` += `"promo"`, `"publicidad"`, `"publicaci"`, `"anuncio"`, `"descuento"`, `"oferta"`. El mensaje predefinido ya escalaba a Tier 2 por contener `"agendar"`, pero si la clienta edita el texto antes de enviarlo (habitual en CTWA) caía en gpt-4o-mini — que no sostiene lógica condicional multi-turno (sesiones 19, 26, 28) y podría cotizar $89.000 a alguien que viene de la promo. `"promo"` como substring cubre promo/promoción/promocional/promociones.

#### Auditoría de coherencia previa al lanzamiento — 6 contradicciones corregidas

Revisión completa de las 4 capas (prompt, KB, `services`, código) antes de encender la campaña:

1. **Contradicción de plazo (grave, de la promo):** la regla decía "persiste TODA la conversación, NUNCA cotices $89.000 más adelante" **y** "a las 72h vence y el valor es $89.000". Una conversación que se extendía más de 3 días (escribe el lunes, vuelve el viernes) le daba al modelo dos órdenes opuestas. → "PERSISTE **MIENTRAS SU CUPO ESTÉ VIGENTE**", con derivación explícita a la política de vencimiento.
2. **La señal 1 no contemplaba el header "POSIBLE PROMOCIÓN — SIN VERIFICAR"** que el propio webhook puede inyectar. → ambos headers descritos, con qué hacer en cada caso.
3. **"si la persona NO llegó con el mensaje de la publicidad, jamás menciones la promo"** era más estrecho que las 3 señales (dejaba fuera la señal del sistema, que opera sin mensaje). → "si NO se cumple ninguna de las 3 señales".
4. **Las reglas de trabajos previos decían "indica SIEMPRE el Valor Normal ($89.000)"** — ese "SIEMPRE" anulaba la promo si el modelo lo leía literal. → puntero "(o $69.000 si aplica la promoción de la regla 2.5)" en las dos apariciones.
5. **La KB decía que la promo se reconoce solo por el mensaje predefinido** → alineada a las 3 señales.
6. **Candado de código para los servicios promocionales** (ver abajo).

**Candado: los servicios "Promo …" ya no son visibles sin señal de promoción.** `getServices` devolvía **todos** los servicios con precio, así que cualquier clienta que preguntara "¿qué servicios tienen?" podía recibir el $69.000 — contenido solo por una regla de prompt. Ahora `isPromoService()` (`/^promo\b/i`) los filtra tanto de `servicesForPrompt` como del tool `get_services`, salvo que `clinic._promoActive` esté activo (se setea cuando `promoAdContext` no está vacío, es decir cuando alguna señal disparó). Verificado que **solo Elizabeth** tiene servicios con ese prefijo en toda la plataforma → ningún efecto en otras clínicas. El trade-off elegido es deliberado: si por algún borde no se detecta la promo, la IA cotiza $89.000 (conservador) en lugar de arriesgar regalar $20.000 por cita a cualquiera.

Verificado además contra el creativo actualizado (ya no dice "8 cupos" sino "por tiempo limitado"): **cero** menciones de cupos contables en prompt y KB, y cero rastros de $99.000/$79.000/$109.000 como precios válidos (solo en la lista de "ignorar").

#### ⚠️ Contradicción PREEXISTENTE corregida — reglas 6 y 9 vs. flujo de abono previo

Hallazgo de la misma auditoría, **ajeno a la promo y aplicable a todas las reservas de Elizabeth**. `ai_behavior_rules` conservaba el flujo anterior a `require_deposit_first` (sesión 11) y ordenaba lo contrario al prompt del webhook:

| | Reglas 6 y 9 (antes) | Prompt del webhook (`require_deposit_first`) |
|---|---|---|
| Crear la cita | *"**NO uses** create_appointment"*; solo con la imagen | *"**OBLIGATORIAMENTE DEBES LLAMAR** a create_appointment"* |
| Datos de transferencia | **antes** de reservar | **después**, con el cupo bloqueado |
| Apartado | "reservada temporalmente", sin plazo | 30 minutos explícitos |

**Por qué era grave:** la regla 6 le *ordenaba* al agente exactamente la conducta que causó el incidente Clara (entregar datos de abono sin reservar el cupo). No ocurría en producción solo porque el candado de abono de la sesión 26 lo bloquea a nivel sistema — o sea, el sistema venía corrigiendo al prompt en cada reserva en lugar de que ambos dijeran lo mismo.

**Corregido (decisión del fundador, esta sesión):** Paso 4 → `create_appointment` primero, con prohibición explícita de insinuar que la hora quedó tomada antes del `success: true`; Paso 5 → recién ahí los datos de transferencia, con los 30 min y "asegurado solo con el comprobante"; Paso 6 → `confirm_appointment` al verificar la imagen. La regla 9 pasó de "único disparador de cita" a "lo que deja la cita en firme", y su candado visual ahora apunta a `confirm_appointment` (no a `create_appointment`). Eliminado el estado inexistente "PENDIENTE DE APROBACIÓN". El Paso 2 aclara que ahí solo se **menciona** el abono, sin entregar datos bancarios.

Solo cambió `ai_behavior_rules` (contenido, sin deploy). Prompt del webhook, candados y crons quedaron intactos. **Pendiente de observar en vivo:** una reserva completa de Elizabeth con el prompt alineado.

#### 🔒 Incidente de fuga + rediseño: la promoción es de inyección CONDICIONAL (25-jul, en producción)

**Lo que pasó:** una clienta que llegó por el anuncio ANTIGUO (`120252952674660039`, el de "evaluación sin costo") recibió: *"El microblading tiene un valor de $89.000, pero si vienes de una promoción específica, puede haber un precio especial. Permíteme verificar si aplicaría ese descuento para ti."* Ni calificaba ni existía forma de "verificar" nada.

**Causa raíz:** la regla 2.5 vivía en `ai_behavior_rules`, que se inyecta en el system prompt de **todas** las conversaciones. El modelo sabía que la promo existe y la regla "no la menciones si no califica" no lo contuvo. Es la lección de la sesión 29 aplicada al propio trabajo de esta sesión: **un hecho no se contiene con criterio, se contiene con código.**

**Rediseño aplicado:**
- Todo el contenido promocional salió de `ai_behavior_rules` y de los docs activos de la KB. Vive en un documento con `category = 'promo_conditional'` (doc `8b974da8-…`).
- `getKnowledgeSummary` y el tool `get_knowledge` excluyen esa categoría **siempre** (`.neq("category","promo_conditional")`), no solo por status — así, si alguien marca el doc como activo desde la UI de la Base de Conocimiento, la fuga no reaparece.
- El webhook lo carga por categoría y lo anexa a `promoAdContext` únicamente cuando hay señal de promoción.
- Verificado: cero rastros de "$69.000" / "Promo Publicidad" en el prompt base y en los docs servibles.

**Endurecimiento de la señal textual (fuente B):** antes bastaba con que el mensaje contuviera "69.000" — cualquiera podía escribir el número para pedir el descuento. Ahora se traen candidatos y se filtra en JS: solo cuenta el **mensaje predefinido** de la publicidad, o que el precio aparezca **dentro del bloque `[Mensaje desde Anuncio: ...]`**. Validado con 7 casos (incluidos dos de abuso). El doc promocional además explica qué hacer cuando el header dice "SIN VERIFICAR".

#### Tres fixes de resiliencia derivados de los incidentes del 25-jul (desplegados)

**1. `callAI` — el respaldo de proveedores no existía de verdad.** La cadena era OpenAI → OpenRouter → Gemini, pero la rama de Gemini exigía `model.startsWith("gemini")`, condición que **nunca se cumple** porque `getOptimalModel` siempre devuelve `gpt-4o`/`gpt-4o-mini`: el tercer respaldo estaba muerto. Con OpenAI y OpenRouter caídos el mismo turno, la conversación se perdía (**caso Claudia Ximena, 56945445191**: dos "tuve un problema técnico" seguidos y la clienta se fue — venta perdida).
- La cadena completa ahora se intenta **dos veces** con 800 ms entre intentos.
- Gemini entra como último recurso real (usa `gemini-1.5-flash` cuando el modelo pedido es `gpt-*`). ⚠️ **La `GOOGLE_AI_API_KEY` está SUSPENDIDA** (verificado: `403 … has been suspended`), así que hoy sigue habiendo 2 proveedores efectivos. Renovar la key en Google Cloud activa el tercero sin tocar código.
- Los errores de cada proveedor se acumulan y viajan en el mensaje de la excepción → quedan en `debug_logs` vía el catch existente. Antes solo iban a `console.error`, ilegible sin acceso a los logs de la función (el MCP de Supabase apunta a Vetly y no tiene permiso sobre este proyecto).

**2. Candado de abono — detección por señales.** `sendingBankData` comparaba el texto contra líneas literales de `clinic.transfer_details`; **basta con que el modelo reformatee** (negritas, viñetas, otro orden) para esquivarlo. Ocurrió con María Susana: entregó los datos de transferencia **sin cita creada** y el candado no intervino — el escenario Clara otra vez. Ahora, además de la comparación literal, detecta (RUT chileno **o** número de 7+ dígitos) **y** contexto bancario (transferencia / número de cuenta / chequera / Banco Estado / depósito / CajaVecina). Validado con 8 casos: detecta el mensaje real que se escapó y no dispara con precios ($10.000 / $69.000 / $89.000 tienen 5 dígitos), dirección ni teléfonos sueltos.

**3. Comprobante sin cita.** `confirmAppt` devolvía solo un texto informativo cuando no hallaba cita, y la IA **seguía ofreciendo horarios** aunque la clienta acabara de pagar. Ahora, con `response === "yes"` y sin cita activa: inserta una notificación `deposit_review` ("Posible pago sin cita registrada") y devuelve una `instruction` que prohíbe reiniciar el agendamiento y obliga a decir que se está confirmando con Elizabeth. **No** se crea la cita automáticamente: el horario conversado puede estar ocupado y se generaría un doble booking (sesión 28).

#### Incidente del 26-jul (+56962662379) — respuestas duplicadas, bucle y un cupo que existía

**Síntoma:** la clienta recibió **cuatro veces** el mismo mensaje ("no hay disponibilidad para el viernes 31… el próximo día es el lunes 3, tarde: 4, 5 y 6 PM"). Cuando escribió "12" para tomar un cupo de la mañana del lunes 3 que la IA acababa de ofrecerle, la respuesta volvió a ser el mensaje del 31 de julio. Nunca pudo agendar.

**Causa 1 — el debounce solo se verifica ANTES de procesar, no antes de enviar.** Tras la espera de 15 s se comprueba "¿soy el último mensaje?", pero generar la respuesta toma varios segundos más (modelo + tools). Si en esa ventana llega otro mensaje, la respuesta ya construida se envía igual, con contexto incompleto. Verificado en los timestamps: `"3"` (23:43:52) → `"De agosto"` (23:43:56) → `"En la mañana"` (23:44:12). La ejecución de `"De agosto"` terminó su espera a las 23:44:11, **un segundo antes** de que llegara el tercer mensaje, así que respondió con el contexto a medias (consultó el 31 de julio) a las 23:44:19; la ejecución completa respondió correcto (cupos del 3 de agosto) a las 23:44:34. Dos respuestas contradictorias seguidas.
**Fix:** segundo chequeo de debounce **justo antes de `sendWA`** — si llegó un inbound más nuevo mientras se generaba la respuesta, se descarta (la ejecución del mensaje nuevo responderá con el contexto completo).

**Causa 2 — historial contaminado se retroalimenta.** Con la misma frase repetida cuatro veces en los últimos 15 mensajes, el modelo la volvió a copiar incluso ante un "12" que elegía un cupo ya ofrecido (ese turno no llamó ninguna herramienta: copió texto).
**Fix:** candado anti-bucle — si la respuesta generada es igual a la última enviada (comparando sin mayúsculas, tildes, puntuación ni emojis), se sustituye por un mensaje que rompe el ciclo y pide día y hora.

**Causa 3 — al no haber cupos en la franja pedida, se saltaba al día siguiente sin mirar el resto del mismo día.** El viernes 31 **sí tenía cupo a las 10:00 AM** (horario 10:00–20:00, colación 14:30–15:59, citas 12:00–14:00 y 16:00–19:00 → hueco de 120 min a las 10:00). Como ella pidió "tarde", `checkAvail` filtró por franja, no encontró nada y saltó al lunes 3. Insistió tres veces con el viernes y nunca se le ofreció la mañana.
**Fix:** `checkSingleDay` acepta `ignoreTimeFilter`; cuando el día pedido no tiene cupos **en la franja**, se reintenta el mismo día sin filtro antes del look-ahead y se devuelven esos horarios con instrucción de ofrecerlos antes de proponer otro día.

**Patrón:** las tres causas son de código, no de prompt — coherente con la regla estructural de la sesión 29. Ninguna regla de comportamiento habría evitado que dos ejecuciones concurrentes respondieran lo mismo, ni que la herramienta ocultara un cupo que existía.

#### ⚠️ Cambio TEMPORAL — atado a la campaña
Sin fecha de término definida **por diseño**: es remarketing a quienes interactuaron con las páginas de IG/FB en una ventana de 15 días, así que la audiencia se renueva sola y la promo vive mientras el anuncio esté activo. Al pausarlo hay que revertir las tres fuentes (ver Tareas pendientes).

**El creativo se actualizó durante esta sesión:** el fundador reemplazó "sólo 8 cupos" por **"solo por tiempo limitado"**, quedando alineado con lo que el agente puede sostener con la verdad (un plazo, no un contador de cupos). Si en el futuro un creativo vuelve a prometer una cantidad de cupos, el agente **no puede contarlos** — ante "¿cuántos quedan?" solo podría inventar.

---

### Cambios realizados — agosto 2026 (sesión 32) — MCP de Meta Ads + exclusión automática de remarketing

#### Problema de negocio
La campaña de remarketing $69.000 (sesión 31) le seguía llegando a clientas que ya habían agendado por la publicidad principal a $89.000. Al ver el anuncio de remarketing, exigían (con justa razón) que se les respetara el precio más bajo — la campaña no distinguía entre "interactuó pero no agendó" (audiencia correcta) y "ya tiene cita" (debía excluirse).

#### MCP de Meta Ads — instalado para Citenly (antes solo existía en Vetly-App)
- El servidor `meta-ads` (`https://mcp.facebook.com/ads`, tipo `http`) estaba configurado en `~/.claude.json` únicamente bajo el proyecto `/Users/sebabarrera/Desktop/Vetly-App`. Se agregó también a Citenly con `claude mcp add --transport http meta-ads https://mcp.facebook.com/ads` (scope local, mismo patrón que Vetly).
- **Requiere reiniciar la ventana de VSCode/Claude Code** después de agregarlo — una sesión ya abierta no recarga MCPs nuevos aunque `claude mcp list` en terminal ya lo muestre conectado.
- Con `ads_get_ad_accounts` se confirmó acceso a la cuenta **"Elizabeth Hernández"** (`348134306061916`) dentro del Business Portfolio **"Elistic.Nuskin"** (`214858759078184`) — pero con `is_ads_mcp_enabled: false`. **Esto es un rollout gradual de Meta**, cuenta por cuenta, no un tema de permisos: la propia herramienta indica no usar ese `ad_account_id` en llamadas del MCP mientras esté así. Otras cuentas del mismo portafolio (`Vive Teoma`, `Sebastián Barrera`) y de otros negocios de Sebastián sí tienen el MCP habilitado y se pueden gestionar en vivo desde el chat.
- **Mientras el MCP esté bloqueado para una cuenta**, la vía de trabajo es escribir Edge Functions/scripts que llamen directo a la Graph API con un token de system user (mismo patrón que `sendMetaCAPI`, ver más abajo) — no depende del rollout del MCP.

#### Nuevo Edge Function `cron-sync-meta-exclusion-audience`
- Sincroniza diariamente (pg_cron **Job ID 21**, `0 4 * * *` = medianoche Chile) los teléfonos de `appointments` de Elizabeth Microblading (clinic_id `1ab32091-...`) con estado `pending` / `pending_deposit` / `confirmed` hacia una Custom Audience de exclusión en Meta (`act_348134306061916`).
- Auto-provisión: si la audiencia **"Elizabeth - Ya Agendaron (Excluir Remarketing)"** no existe, la crea sola (subtype `CUSTOM`, `customer_file_source: USER_PROVIDED_ONLY`) — sin paso manual en Meta más allá del setup inicial de acceso.
- Hashea los teléfonos con SHA-256 (formato `PHONE` que exige la Custom Audiences API) y los sube en lotes de 5.000 vía `POST /{audience_id}/users`.
- `config.toml`: `verify_jwt = false` (invocada por pg_cron, igual que los demás crons).
- Prueba en vivo exitosa: `{"message":"Sincronizado","audience_id":"120253264638670039","synced":106}` — 106 teléfonos activos de Elizabeth cargados en la primera corrida.

#### Setup manual hecho en Meta (una sola vez, dentro de Elistic.Nuskin)
1. System user **"Sebastián Barrera"** (ya existía) con acceso "Acceso total" a la cuenta Elizabeth Hernández.
2. Se creó una app nueva dedicada (**"Elistic Ads Sync"**, caso de uso "Crear y administrar anuncios con la API de marketing") y se vinculó al Business Portfolio — el intento de "reclamar" (transferir propiedad de) la app existente "Citenly App" falló con un error técnico de Meta; crear una app nueva y propia del portafolio fue más simple y evitó el flujo de aprobación cruzada entre negocios.
3. Token generado con permisos **`ads_management` + `ads_read`** únicamente (principio de mínimo privilegio — no se marcaron `business_management`, `catalog_management`, etc.), expiración "Nunca".
4. Aceptados los Términos de Servicio de Audiencias Personalizadas para esa cuenta (`https://business.facebook.com/ads/manage/customaudiences/tos/?act=348134306061916`) — Meta lo exige antes de crear una audiencia de tipo lista de clientes.
5. Secret `META_ADS_ACCESS_TOKEN` seteado en Supabase (`supabase secrets set ... --project-ref hubjqllcmbzoojyidgcu`).
6. Audiencia agregada como **"Excluir"** en el ad set de la campaña de remarketing, con **"Usar como sugerencia" DESMARCADO** — con esa casilla marcada, Meta puede ignorar la exclusión si su algoritmo predice mejor conversión mostrándole el anuncio igual a alguien de la lista; para este caso la exclusión debía ser estricta, sin excepciones del algoritmo.

#### ⚠️ Incidente de seguridad menor (contenido en la sesión)
El usuario pegó el token de acceso real en el chat en vez del comando completo. Se revocó de inmediato desde Meta Business Settings y se generó uno nuevo antes de continuar. **Regla para el futuro:** nunca pedir ni aceptar que un secret/token se pegue en el chat — siempre indicar al usuario que lo corra directo en su propia terminal.

---

### Cambios realizados — junio 2026 (sesión 18)

#### Fix crítico: `ai_behavior_rules` de Elizabeth Microblading — oferta expirada y labios activos

**Síntoma:** La IA seguía diciendo "el precio normal es $99.000, oferta especial $79.000 válida hasta el 31 de mayo" aunque los documentos de la KB ya habían sido limpiados en la sesión 17.

**Causa raíz:** El campo `clinic_settings.ai_behavior_rules` tenía instrucciones explícitas en el system prompt que ordenaban mencionar la oferta. El system prompt tiene precedencia sobre la KB, por eso el agente ignoraba los documentos actualizados.

**Problemas encontrados en `ai_behavior_rules` (clínica `1ab32091-...`):**
- Regla 2: instruía a siempre mencionar "Valor Normal + Oferta/Promoción si hay alguna activa" → el modelo inventaba $99.000 como "precio normal" para poder poner la oferta encima
- Regla 4 d) para los 3 servicios: decía literalmente `"la oferta que está activa hasta el 31 de Mayo a $79.000 sin retoque con cupos limitados"`
- Regla 3 y 4: seguía listando "Micropigmentación de Labios" como servicio activo

**Fix aplicado** (PATCH REST directo a `clinic_settings`):
1. Regla 2: eliminado el frame "Valor Normal + Oferta". Reemplazado por "Menciona el precio vigente del servicio directamente. No hay ofertas activas actualmente."
2. Regla 3: "Micropigmentación de labios" removida de servicios activos; nota: si consultan, indicar no disponible
3. Regla 4 d) Microblading: `"Menciona el valor actual: $89.000 (no incluye retoques)."`
4. Regla 4 Micropigmentación de Labios: flujo completo reemplazado por "indica que no está disponible por el momento"
5. Regla 4 d) Micropigmentación de Ojos: `"Menciona el valor actual: $89.000."`

**Regla aprendida:** Si la IA repite información incorrecta pese a tener la KB actualizada, revisar SIEMPRE `clinic_settings.ai_behavior_rules` — ese campo forma parte del system prompt y tiene precedencia sobre los documentos de la KB.

---

### Cambios realizados — junio 2026 (sesión 17)

#### KB Elizabeth Microblading — limpieza completa de precios y servicios

**Documentos actualizados (`knowledge_base`, clinic_id `1ab32091-...`):**
- **Ofertas de mayo eliminadas** en los 3 documentos que las contenían ("Precios/Valores", "Servicios", "Preguntas frecuentes") — las promociones "oferta hasta el 31 de Mayo $79.000" ya no existen en ningún documento
- **Micropigmentación de Labios eliminada** — Elizabeth no realiza este servicio por el momento. Los 3 documentos fueron actualizados: se eliminó la descripción completa del servicio, el FAQ de labios y el precio. Todos incluyen una nota `⚠️ SERVICIO NO DISPONIBLE: Elizabeth NO está realizando Micropigmentación de Labios por el momento. Responder únicamente que no está disponible.`
- **Precios corregidos** (conflicto resuelto entre "Servicios" y "Precios/Valores"):
  - Microblading de Cejas: **$89.000**
  - Retoque de Microblading: $50.000 (sin cambios)
  - Micropigmentación de Ojos: **$89.000**

#### Fix crítico: teléfonos sin normalizar en `appointments` — IA no encontraba citas

**Síntoma:** Clientas con citas confirmadas recibían "no tengo una cita agendada para usted" al consultar por WhatsApp (caso detectado: Maritza Urrutia, cita de hoy a las 18:00).

**Causa raíz:** Las citas creadas manualmente desde el dashboard guardaban el teléfono en formato raw de YCloud (`+56 9 6735 6592`). El webhook normaliza con `normalizePhone()` que hace `replace(/\D/g, '')` → `56967356592`. El `.eq("phone_number", normalizedPhone)` nunca coincidía con el valor almacenado con `+` y espacios.

**Fix DB (aplicado en producción):**
1. Normalización masiva: `UPDATE appointments SET phone_number = regexp_replace(phone_number, '[^0-9]', '', 'g') WHERE phone_number ~ '[^0-9]'` — afectó 40 de 135 citas en Elizabeth
2. Trigger permanente `trg_normalize_phone` en `appointments` — normaliza automáticamente en cualquier INSERT o UPDATE, independientemente de la fuente (frontend, webhook, script)

**Regla permanente:** `appointments.phone_number` siempre debe ser solo dígitos (ej: `56967356592`). El trigger lo garantiza en adelante.

#### Fix: regla anti-alucinación en webhook — re-check de disponibilidad post-reserva

**Síntoma (caso Carolina Gaona +56 9 5405 7457):** La IA creó correctamente un `pending_deposit` para las 4 PM del viernes 12 de junio (bloqueando el slot). Cuando la clienta dijo "Okey voy a transferir", el webhook procesó el mensaje como nueva consulta, llamó `check_availability` de nuevo, encontró las 4 PM bloqueadas (por su propia reserva) y ofreció otros horarios, contradiciendo la reserva previa. Terminó diciendo "no hay disponibilidad para el viernes" y saltando al lunes. La clienta se fue sin cita.

**Fix en el prompt (`ycloud-whatsapp-webhook`):**
- Nueva "REGLA CRÍTICA ANTI-ALUCINACIÓN" insertada en el paso `e)` del flujo `require_deposit_first`: una vez enviados los datos de pago, la IA NUNCA puede llamar `check_availability` para ese cliente. Si dice "okey", "entendido" o cualquier confirmación verbal → responder únicamente "Perfecto, quedo esperando tu comprobante 🌿✨"
- Deployado a producción

**Estado Carolina Gaona:** no tiene cita en la DB. Elizabeth debe contactarla manualmente para reagendar.

#### Logo Citenly generado con IA

**Generación:** `gpt-image-1` (OpenAI) vía `VITE_OPENAI_API_KEY` del `.env` local.

**Archivos en `public/`:**
- `citenly-icon.png` — ícono cuadrado 1024×1024, gradiente pink `#FF2E88` → violet `#9333EA`, rayo + chat bubble fusionados en blanco. Fondo PNG transparente (se ve sobre dark o claro).
- `citenly-logo-dark.png` — lockup horizontal con wordmark (variante)

**Cambios en `Landing.tsx`:**
- Navbar y footer: reemplazado `<div gradient><Sparkles/></div>` por `<img src="/citenly-icon.png">`
- Menú hamburguesa móvil agregado: botón `Menu`/`X` visible solo en `< md`, despliega dropdown con links de navegación + "Iniciar sesión" + botón "Agendar Demo". Se cierra automáticamente al tocar cualquier enlace.

**Cambios en `index.html`:**
- Favicon: `favicon.svg` → `citenly-icon.png`
- Agregado `<link rel="apple-touch-icon" href="/citenly-icon.png" />`
- `theme-color` cambiado de `#F8F6F2` a `#0A0A0F` (barra del navegador en móvil)

**Cambios en `public/micropigmentadoras.html`:**
- `.nav-logo` actualizado de texto plano `Citenly.` a `<img> + <span>Citenly</span>`
- El logo es clickeable y lleva a `citenly.com`
- Estilos responsivos: 36px desktop, 30px móvil

**Nota sobre generación de imágenes:**
- `GOOGLE_AI_API_KEY` del `.env` está suspendida (revisar billing en Google Cloud Console)
- `VITE_OPENAI_API_KEY` funciona para generación con `gpt-image-1`
- Para logos con texto preciso, Ideogram 3.0 tiene mejor renderizado tipográfico

---

### Cambios realizados — junio 2026 (sesión 16)

#### Landing vertical piloto — `/micropigmentadoras`

**Estrategia:** abandonar landing genérica para crear landings verticales por nicho. Cada profesión tiene su propia página donde el avatar se identifica de inmediato. Piloto: micropigmentación/microblading.

**Archivo:** `public/micropigmentadoras.html` — HTML/CSS/JS puro, sin dependencias de React ni del bundle de Vite.

**Ruta en producción:** `citenly.com/micropigmentadoras`
- `vercel.json` tiene rewrite específico ANTES del catch-all SPA: `"/micropigmentadoras" → "/micropigmentadoras.html"`
- El catch-all `/(.*) → /index.html` sigue operando para todas las rutas de la app React

**Imágenes en `public/` (necesarias para el landing):**
- `box-microblading.png` — fondo parallax sección "Reconoces esto"
- `dashboard.png` — screenshot del panel Citenly en mac frame
- `elizabeth.jpeg` — foto de Elizabeth Hernández para testimonio horizontal
- `movil.jpeg` — captura móvil (disponible pero no usada en la versión actual)

**Estructura del landing:**
1. Trust bar + Nav sticky
2. **Hero** — gradiente `#0f0c29 → #302b63 → #24243e`, simulador WhatsApp animado (JS loop), h1 "Deja de perder horas por clientas que no llegan"
3. **Reconoces esto** — parallax `box-microblading.png` con overlay 74% oscuro, 3 pain cards
4. **Cómo lo resuelve** — fondo blanco, 4 sol-cards con texto oscuro y badges verdes
5. **Todo en un solo lugar** — Mac showcase (`dashboard.png`) ancho completo + acordeón de 5 funcionalidades
6. **ROI** — tabla de valor recuperado + callout con CTA
7. **Fidelización** — 3 cards violet/indigo/fuchsia + stats strip
8. **Testimonio** — card horizontal con `elizabeth.jpeg`, Elizabeth Hernández @elizabeth.microblading
9. **FAQ** — 5 preguntas específicas del nicho
10. **CTA final** — todos los CTAs apuntan a `citenly.com/demo`

**Acordeón de funcionalidades (5 ítems, primero abierto por defecto):**
- Asistente de IA · Agenda · Marketing · Contactos · Finanzas
- JS: `toggleFeat(header)` — solo uno abierto a la vez
- Subtítulos `.feat-summary` en `rgba(255,255,255,0.65)` para contraste sobre fondo oscuro

**Parallax sección dolores:**
- CSS: `background: linear-gradient(overlay), url('box-microblading.png') fixed`
- Fallback mobile `≤768px`: `scroll` en vez de `fixed` (iOS no soporta `background-attachment: fixed`)

**Sección solución (fondo blanco):**
- `#solucion { background: #ffffff }` — contrasta con secciones oscuras vecinas
- Textos `#0a0a18`, párrafos `#4b5563`, badges verdes sobre blanco
- `.sol-card` con sombra sutil y hover con borde magenta

**Patrón para landings verticales futuras:** reutilizar esta estructura HTML como plantilla. Cambiar: nicho en pill/tags, dolores específicos, testimonio, copy de solución, FAQ. La estructura CSS y JS es reutilizable íntegra.

**Notas de deploy:**
- `git config http.postBuffer 524288000` necesario antes del primer push con imágenes binarias (evita HTTP 400 por buffer insuficiente)
- Las imágenes en `public/` se suben al repo y Vercel las sirve como archivos estáticos

---

### Cambios realizados — junio 2026 (sesión 15)

#### Fix: cancelaciones IA no procesadas (2 casos distintos)

**Caso 1 — Ingrid Florez (`56987928944`), clínica Elizabeth Microblading:**
- Su prospecto tenía `requires_human = true` desde el 25 de abril (escalada a humano)
- Cuando escribió "Voy a cancelar la hora de las cejas" el 2 de junio, el webhook retornó `saved_silently` sin llegar al AI → la cita (29 de mayo, `status: pending`) quedó sin cancelar
- **Fix DB:** cita ID `9428f178-3387-4758-980f-a49a7676030f` puesta en `status: cancelled` directamente en producción
- **Fix webhook:** cuando `requires_human = true`, si el mensaje contiene keywords de cancelación ("cancelar", "no podré asistir", "no voy", "no puedo ir", etc.), se llama `confirmAppt(no)` silenciosamente antes de retornar `saved_silently`

**Caso 2 — Mónica Espejo Muñoz (`56968341920`):**
- El 7 de junio la IA dijo "Procederé a cancelar tu cita para el lunes a las 18:00" **sin llamar al tool `confirm_appointment`** — hallucination pura
- La cita de Mónica no existe en la DB (problema previo no investigable sin logs del 28 de mayo)
- **Fix prompt:** regla 9.5 agregada — "NUNCA uses frases como 'procederé a cancelar' sin haber llamado primero a `confirm_appointment` con `response: no`"
- **Fix tool description:** `confirm_appointment` (versiones Elizabeth y general) ahora dice explícitamente "ya sea respondiendo a un recordatorio O de forma proactiva"

**Fix adicional — `rescheduleAppt` perdía citas `pending_deposit`:**
- El filtro `.in("status", ["pending", "confirmed"])` no incluía `pending_deposit`
- Para clínicas con `require_deposit_first = true`, las citas recién agendadas (status `pending_deposit`) eran invisibles para reagendar
- Fix: `.in("status", ["pending", "pending_deposit", "confirmed"])`

#### Fix: race condition de auth → sidebar limitado y dashboard en 0

**Síntoma:** al entrar a Elizabeth Microblading (y posiblemente otras clínicas), el sidebar mostraba solo ítems de nivel `professional` y todas las métricas del dashboard aparecían en cero.

**Causa raíz — `AuthContext.tsx`:** el fetch de `clinic_members` estaba en `.then()` (fire-and-forget). La secuencia era: fetch profile → `setLoading(false)` → luego (en paralelo) fetch member. El componente montaba con `member = null` y `loading = false`, por lo que `usePermissions` tomaba el rol por defecto `'professional'`.

**Fix `AuthContext.tsx`:** el fetch de `clinic_members` convertido a `await` dentro del handler de `onAuthStateChange`. `setLoading(false)` solo corre después de que `member` ya está seteado.

**Fix `usePermissions.ts`:** fallback adicional `profile?.role` entre `member?.role` y `'professional'`, como defensa en profundidad ante futuros re-renders intermedios.

**Fix `Dashboard.tsx`:**
- Eliminada query a `satisfaction_surveys` (tabla no existe en producción → rompía el `Promise.all` completo)
- Agregado filtro `.in('status', ['pending', 'confirmed', 'pending_deposit'])` en upcoming appointments (antes mostraba también citas canceladas)
- Timeout `Promise.race` extendido de 10s a 15s

---

### Cambios realizados — junio 2026 (sesión 14)

#### Reestructura completa de precios y planes

**Nuevos precios (todos los archivos actualizados en sincronía):**
- Starter: $67 → **$97 USD** / $67.000 → **$92.000 CLP**
- Pro: $169 → **$167 USD** / $149.000 → **$159.000 CLP**
- Enterprise: $299 → **$297 USD** / $349.000 → **$282.000 CLP**
- Core: $39 USD / $33.000 CLP (sin cambios)

**Precios anuales agregados** (20% off = 2 meses gratis):
- Starter: $931 USD / $883.000 CLP
- Pro: $1.603 USD / $1.527.000 CLP
- Enterprise: $2.851 USD / $2.715.000 CLP

**Archivos modificados:** `lemonsqueezy.ts`, `mercadopago.ts`, `Landing.tsx`, `Pricing.tsx`, `Register.tsx`

**Cambios de copy y UX:**
- Orden de planes invertido: Enterprise → Pro → Starter → Core (efecto de anclaje)
- `Pricing.tsx getPrice()`: descuento anual cambiado de `base * 10/12` (~17%) a `base * 0.8` (20%)
- Toggle anual muestra badge `2 meses gratis` y cada tarjeta en modo anual muestra el total anual
- Core: features incluyen `'Sin recordatorios automáticos'` y trigger `'Recordatorios desde Plan Starter →'`
- Starter: trigger `'¿Más de 100 citas/mes? Pasa a Pro →'` visible en features
- `Pricing.tsx`: render detecta prefijo `'✗'` en features → ícono `✕` rojo + texto tachado (para features no incluidas)

#### Starter features — restauración de créditos + encuesta excluida
- `'200 conversaciones IA/mes'` → **`'4.000 créditos IA'`** (decisión: mantener créditos para consistencia con AISettings)
- Agregado `'✗ Encuesta de satisfacción automatizada'` — comunicación visual de lo que NO incluye Starter
- Aplicado en: `lemonsqueezy.ts`, `mercadopago.ts`, `Pricing.tsx`, `Landing.tsx`

**Regla establecida:** La métrica interna del sistema siempre es **créditos** (columnas DB, webhook, AISettings). En pricing/marketing usar la misma palabra para no crear confusión entre lo que el cliente ve en el plan y lo que ve en su panel.

#### Sección Fidelización en Landing.tsx
- Agregada sección completa después de "Todo en un solo lugar" (antes de "Cómo funciona")
- 3 cards: **Billetera de Puntos** (violet), **Programa de Referidos / Magic Link** (indigo), **Catálogo de Recompensas** (fuchsia)
- Strip de stats: 5× más barato retener · 30% más gasto con puntos · 100% boca a boca rastreable
- Nuevos imports: `Gift`, `Award`, `Share2` desde lucide-react

#### Garantía — comunicación de los 7 días
- **Settings.tsx y Pricing.tsx FAQ actualizados:** los 7 días comienzan desde el primer día que el agente IA atiende clientes reales en producción, no desde el registro
- El equipo hace la implementación primero (sin costo), el trial arranca cuando ya funciona

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

### Meta Ads MCP (sesión 32)
Servidor `meta-ads` (`https://mcp.facebook.com/ads`) — configurado por proyecto en `~/.claude.json` (no es un `.mcp.json` del repo). Si no aparece disponible en una sesión nueva, revisar si está agregado para `/Users/sebabarrera/Desktop/Citenly App` con `claude mcp list` / `claude mcp add --transport http meta-ads https://mcp.facebook.com/ads`. **Reiniciar la ventana de VSCode** tras agregarlo — no recarga en caliente.

La cuenta publicitaria **"Elizabeth Hernández"** (`348134306061916`, Business Portfolio "Elistic.Nuskin" `214858759078184`) tiene `is_ads_mcp_enabled: false` — rollout gradual de Meta, no depende de permisos ni de nuestra config. Mientras dure, no usar esa cuenta con las tools del MCP; para automatizar sobre ella usar Graph API directo desde un Edge Function con un token de system user (ver `cron-sync-meta-exclusion-audience`).

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

### Depurar "la IA dijo algo incorrecto" — orden obligatorio (sesión 29)

Antes de tocar el prompt, `ai_behavior_rules` o el ruteo de tiers, **verificar qué recibió el modelo**:

```sql
-- Qué devolvieron las herramientas en ese turno
SELECT created_at, direction, content, ai_tier, ai_function_called, ai_function_result
FROM messages WHERE clinic_id = '<id>' AND phone_number = '<tel>' ORDER BY created_at;
```

Comparar `ai_function_result` (lo que devolvió la herramienta) contra `content` del outbound (lo que la IA dijo):
1. **Coinciden y ambos están mal** → el bug es de **código**. Ninguna regla de prompt lo arregla. (Caso sesión 29: `createAppt` devolvía una lista de horarios truncada.)
2. **La IA dijo algo que NO está en el resultado** → alucinación real → necesita **candado a nivel sistema** antes de enviar, no una regla de prompt. (Caso sesión 29: horarios inventados.)
3. **Respuestas duplicadas o contradictorias seguidas** → no es el modelo, son **dos ejecuciones concurrentes**. Comparar los `created_at` de los inbound con los de los outbound: si dos respuestas salen con pocos segundos de diferencia y una tiene menos contexto, el mensaje siguiente llegó mientras la primera se generaba (ver "Concurrencia — el debounce no basta por sí solo").
4. **Solo entonces** considerar prompt/tier — y recordar que gpt-4o-mini (Tier 1) no sostiene lógica condicional multi-turno (sesiones 19, 26, 28).

Las reglas de prompt corrigen *criterio*; los candados corrigen *hechos*. Un dato falso nunca se arregla con criterio.

### Regla de negocios en KB, no en código
Las reglas de **negocio** (precios, horarios, protocolos de servicio) van en documentos de `knowledge_base`. El campo `ai_behavior_rules` en `clinic_settings` solo debe contener reglas **técnicas a nivel app** (cómo usar tools, formato de respuesta, restricciones del sistema). No duplicar lógica de negocio entre ambos.

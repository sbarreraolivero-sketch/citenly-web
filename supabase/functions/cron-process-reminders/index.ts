
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache de placeholders por plantilla (clave: apiKey+nombre). Vive lo que dura la ejecución del cron.
const templateParamCache = new Map<string, number[] | null>()

// Devuelve los números de placeholder ({{N}}) presentes en el body de la plantilla, orden ascendente.
// Las plantillas de Citenly usan numeración semántica fija: 1=paciente, 2=especialista, 3=fecha, 4=servicio, 5=clínica,
// pero no todas incluyen todos los placeholders (ej: recordatorio_oficial_24hrs no tiene {{2}}).
// Enviar siempre 5 parámetros hace que WhatsApp rechace el envío con error 132000 (param count mismatch).
const getTemplatePlaceholders = async (apiKey: string, tplName: string): Promise<number[] | null> => {
    const cacheKey = `${apiKey}:${tplName}`
    if (templateParamCache.has(cacheKey)) return templateParamCache.get(cacheKey) ?? null
    try {
        const resp = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', {
            headers: { 'X-API-Key': apiKey }
        })
        if (!resp.ok) throw new Error(`templates fetch ${resp.status}`)
        const json = await resp.json()
        const tpl = (json.items || []).find((t: any) => t.name === tplName)
        const body = tpl?.components?.find((c: any) => c.type === 'BODY')
        if (!body?.text) {
            templateParamCache.set(cacheKey, null)
            return null
        }
        const nums = [...new Set([...body.text.matchAll(/{{(\d+)}}/g)].map(m => parseInt(m[1])))].sort((a, b) => a - b)
        templateParamCache.set(cacheKey, nums)
        return nums
    } catch (e) {
        console.error(`[getTemplatePlaceholders] ${tplName}:`, e)
        templateParamCache.set(cacheKey, null)
        return null
    }
}

// Construye el array de parámetros del body según los placeholders reales de la plantilla.
// values: mapa semántico {1: paciente, 2: especialista, 3: fecha, 4: servicio, 5: clínica}.
// Si no se pudo leer la plantilla, cae al comportamiento histórico (5 parámetros en orden 1..5).
const buildTemplateParams = async (apiKey: string, tplName: string, values: Record<number, string>) => {
    const placeholders = await getTemplatePlaceholders(apiKey, tplName)
    const nums = placeholders && placeholders.length > 0 ? placeholders : [1, 2, 3, 4, 5]
    return nums.map(n => ({ type: 'text', text: values[n] || '' }))
}

// Los bloqueos de agenda se guardan como citas con teléfono placeholder ("000000000").
// Sin este filtro el cron reintenta enviarles un recordatorio cada hora y YCloud
// responde PARAM_INVALID indefinidamente.
const isContactable = (appt: any) => {
    const digits = (appt.phone_number || '').replace(/\D/g, '')
    if (digits.length < 8 || /^0+$/.test(digits)) return false
    if ((appt.patient_name || '').trim().toLowerCase() === 'bloqueo de agenda') return false
    return true
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const log = []

    // Helper functions for safe date/time extraction across runtimes
    const getSafeDateStr = (date, tz) => {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
        const year = parts.find(p => p.type === 'year')?.value
        const month = parts.find(p => p.type === 'month')?.value
        const day = parts.find(p => p.type === 'day')?.value
        return `${year}-${month}-${day}`
    }

    const getSafeHour = (date, tz) => {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(date)
        const hr = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
        return hr === 24 ? 0 : hr
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        log.push('Starting cron-process-reminders')

        // 1. Fetch all clinics with 24h reminders enabled
        // We join with clinic_settings to get keys and timezone
        const { data: settingsList, error: settingsError } = await supabaseClient
            .from('reminder_settings')
            .select(`
                *,
                clinic_settings (
                    id,
                    clinic_name,
                    timezone,
                    ycloud_api_key,
                    ycloud_phone_number
                )
            `)
            .eq('reminder_24h_before', true)

        if (settingsError) {
            throw new Error(`Error fetching settings: ${settingsError.message}`)
        }

        log.push(`Found ${settingsList?.length || 0} clinics with 24h reminders enabled`)

        // Helper to log to debug_logs table
        const debugLog = async (message: string, payload: any = {}) => {
            console.log(`[DEBUG] ${message}`, payload);
            try {
                const { error } = await supabaseClient.from('debug_logs').insert({
                    message: `[CronReminders] ${message}`,
                    payload,
                    created_at: new Date().toISOString()
                })
                if (error) console.error('Error logging to debug_logs:', error);
            } catch (err) {
                console.error('Error logging to debug_logs:', err);
            }
        }

        await debugLog('Starting 24h reminders check', { clinicsCount: settingsList?.length });

        const results: any = {
            sent24h: 0,
            sent2h: 0,
            sent1h: 0,
            clinics: []
        }

        // 2. Process each clinic
        for (const settings of (settingsList || [])) {
            const clinic = settings.clinic_settings

            // Skip if no API key
            if (!clinic?.ycloud_api_key) {
                results.push({ clinicId: settings.clinic_id, status: 'skipped', reason: 'No YCloud API Key' })
                continue
            }

            // 3. Timezone Check
            const timeZone = clinic.timezone || 'America/Mexico_City'
            const now = new Date()

            // Get current clinic time safely
            const currentHour = getSafeHour(now, timeZone)

            // Get preferred hour (format "HH:MM")
            const [prefHourStr] = (settings.preferred_hour || '09:00').split(':')
            const prefHour = parseInt(prefHourStr)

            // Robust check: run if current hour is >= prefHour AND before end of day (e.g. 18:00)
            // This ensures that if the cron was missed at exactly 09:00, it still runs later.
            if (currentHour !== prefHour && (currentHour < prefHour || currentHour >= 18)) {
                continue
            }
            log.push(`Processing clinic ${clinic.clinic_name} (${clinic.id}) at clinic hour ${currentHour}`)

            // 4. Calculate "Tomorrow" in clinic's timezone safely
            const tomorrowUTC = new Date(now.getTime() + 24 * 60 * 60 * 1000)
            const tomorrowStr = getSafeDateStr(tomorrowUTC, timeZone) // YYYY-MM-DD

            // 5. Fetch Appointments
            // We fetch a bit loosely and filter in JS to be safe with timestamptz comparisons if needed, 
            // but simplified ISO string comparison usually works if we assume the appointment_date is stored absolutely.
            // Wait, appointment_date is TIMESTAMPTZ. 
            // Query: appointment_date >= tomorrowStr 00:00 (Clinic Time) AND < next day.
            // Since we don't have easy timezone conversion in query helper without RPC,
            // we'll fetch wider range (UTC match)

            const startRange = `${tomorrowStr}T00:00:00`
            const endRange = `${tomorrowStr}T23:59:59`

            // Note: This comparison compares UTC string to TIMESTAMPTZ. 
            // If tomorrowStr is '2026-02-14', startRange is '2026-02-14T00:00:00'.
            // If clinic is UTC-6, 00:00 there is 06:00 UTC.
            // The query `.gte('appointment_date', startRange)` uses the server timezone (UTC) if no offset provided.
            // Ideally we pass the offset, but we don't know it easily here without a library.
            // FALLBACK: Fetch all active appointments for this clinic created recently? No that's inefficient.
            // WORKAROUND: Fetch all appointments for the next 48h and filter in JS using timezone.

            const nowUTC = new Date()
            const next48h = new Date(nowUTC.getTime() + 48 * 60 * 60 * 1000)

            const { data: appointments, error: apptError } = await supabaseClient
                .from('appointments')
                .select('*')
                .eq('clinic_id', clinic.id)
                .in('status', ['pending', 'confirmed'])
                .eq('reminder_sent', false)
                .gte('appointment_date', nowUTC.toISOString())
                .lt('appointment_date', next48h.toISOString())

            if (apptError) {
                console.error('Error fetching appointments', apptError)
                continue
            }

            let sentCount = 0

            for (const appt of (appointments || [])) {
                if (!isContactable(appt)) continue

                // Verify date in clinic timezone safely
                const apptDate = new Date(appt.appointment_date)
                const apptDateStr = getSafeDateStr(apptDate, timeZone)

                if (apptDateStr !== tomorrowStr) {
                    continue
                }

                // Idempotency check: skip if already sent (use .limit(1), NOT .maybeSingle() — maybeSingle returns null with >1 row)
                const { data: existingLog24h } = await supabaseClient
                    .from('reminder_logs')
                    .select('id')
                    .eq('appointment_id', appt.id)
                    .eq('type', '24h')
                    .eq('status', 'sent')
                    .limit(1)
                if (existingLog24h && existingLog24h.length > 0) continue

                // SEND WHATSAPP
                try {
                    const formattedDate = apptDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone })
                    const formattedTime = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone })

                    // La confirmación con botones se pide SOLO en la ventana de 24h y SOLO si la cita
                    // aún no fue confirmada. Una vez confirmada (o en 2h/1h), se usa recordatorio plano.
                    let tplName = settings.template_24h || 'appointment_reminder'
                    if (settings.request_confirmation && settings.template_confirmation && appt.status === 'pending' && !appt.confirmation_received) {
                        tplName = settings.template_confirmation
                    }

                    const messagePayload = {
                        to: appt.phone_number,
                        from: clinic.ycloud_phone_number,
                        type: 'template',
                        template: {
                            name: tplName,
                            language: { code: 'es' },
                            components: [
                                {
                                    type: 'body',
                                    // Numeración semántica: 1=paciente, 2=especialista, 3=fecha, 4=servicio, 5=clínica
                                    parameters: await buildTemplateParams(clinic.ycloud_api_key, tplName, {
                                        1: appt.patient_name,
                                        2: 'nuestro equipo',
                                        3: `${formattedDate} a las ${formattedTime}`,
                                        4: appt.service || 'consulta',
                                        5: clinic.clinic_name
                                    })
                                }
                            ]
                        }
                    }

                    const response = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': clinic.ycloud_api_key
                        },
                        body: JSON.stringify(messagePayload)
                    })

                    const responseData = await response.json().catch(() => ({}));

                    if (!response.ok) {
                        await supabaseClient.from('reminder_logs').insert({
                            clinic_id: clinic.id,
                            appointment_id: appt.id,
                            type: '24h',
                            phone_number: appt.phone_number,
                            status: 'failed',
                            error_message: JSON.stringify(responseData)
                        });
                        continue
                    }

                    // Log to DB messages (legacy)
                    await supabaseClient.from('messages').insert({
                        clinic_id: clinic.id,
                        phone_number: appt.phone_number,
                        direction: 'outbound',
                        content: `Recordatorio automático 24h enviado a ${appt.patient_name}`,
                        ycloud_message_id: responseData.id,
                        ycloud_status: 'sent',
                        ai_generated: false
                    })

                    // Log to reminder_logs (new)
                    await supabaseClient.from('reminder_logs').insert({
                        clinic_id: clinic.id,
                        appointment_id: appt.id,
                        type: '24h',
                        phone_number: appt.phone_number,
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    });

                    // Mark appointment
                    await supabaseClient.from('appointments').update({
                        reminder_sent: true,
                        reminder_sent_at: new Date().toISOString()
                    }).eq('id', appt.id)

                    sentCount++
                    results.sent24h++

                } catch (err) {
                    console.error('Error processing appointment', appt.id, err)
                    await debugLog('Error processing 24h appt', { apptId: appt.id, error: err.message });
                }
            }

            results.clinics.push({ clinicId: clinic.id, name: clinic.clinic_name, sent24h: sentCount })
        }

        // ==========================================
        // PART 2: 2-Hour Reminders
        // ==========================================

        // 1. Fetch clinics with 2h reminders enabled
        const { data: earlySettingsList, error: earlyError } = await supabaseClient
            .from('reminder_settings')
            .select(`
                *,
                clinic_settings (
                    id,
                    clinic_name,
                    timezone,
                    ycloud_api_key,
                    ycloud_phone_number
                )
            `)
            .eq('reminder_2h_before', true)

        if (!earlyError && earlySettingsList?.length > 0) {
            log.push(`Found ${earlySettingsList.length} clinics with 2h reminders enabled`)
            await debugLog('Starting 2h reminders check', { clinicsCount: earlySettingsList.length });

            for (const settings of earlySettingsList) {
                const clinic = settings.clinic_settings
                if (!clinic?.ycloud_api_key) continue

                const timeZone = clinic.timezone || 'America/Mexico_City'

                const nowUTC = new Date()
                const startSearch = new Date(nowUTC.getTime() + 90 * 60 * 1000) // +1.5h
                const endSearch = new Date(nowUTC.getTime() + 150 * 60 * 1000)   // +2.5h (Allowing some buffer)

                const { data: appointments, error: apptError } = await supabaseClient
                    .from('appointments')
                    .select('*')
                    .eq('clinic_id', clinic.id)
                    .in('status', ['pending', 'confirmed'])
                    // Removed .eq('reminder_sent', false) here because the 24h reminder sets it to true.
                    // Instead, we rely on the timestamp check inside the loop to avoid duplicates.
                    .gte('appointment_date', startSearch.toISOString())
                    .lt('appointment_date', endSearch.toISOString())

                if (apptError) continue

                let sentCount = 0

                for (const appt of (appointments || [])) {
                    if (!isContactable(appt)) continue

                    // Idempotency: skip if 2h reminder already sent (use .limit(1), NOT .maybeSingle())
                    const { data: existingLog2h } = await supabaseClient
                        .from('reminder_logs')
                        .select('id')
                        .eq('appointment_id', appt.id)
                        .eq('type', '2h')
                        .eq('status', 'sent')
                        .limit(1)
                    if (existingLog2h && existingLog2h.length > 0) continue

                    // La ventana de búsqueda (+90min a +150min) ya define qué citas tocan en esta
                    // corrida. Un chequeo extra de hora exacta descartaba para siempre las citas
                    // que no caen en punto (:15, :30, :45), que nunca recibían recordatorio de 2h.
                    const apptDate = new Date(appt.appointment_date)

                    // SEND WHATSAPP
                    try {
                        const formattedDate = apptDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone })
                        const formattedTime = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone })

                        // El recordatorio de 2h es SIEMPRE plano (sin botones de confirmación).
                        // La confirmación se pide únicamente en la ventana de 24h.
                        const tplName2h = settings.template_2h || 'appointment_reminder'

                        const messagePayload = {
                            to: appt.phone_number,
                            from: clinic.ycloud_phone_number,
                            type: 'template',
                            template: {
                                name: tplName2h,
                                language: { code: 'es' },
                                components: [
                                    {
                                        type: 'body',
                                        // Numeración semántica: 1=paciente, 2=especialista, 3=fecha, 4=servicio, 5=clínica
                                        parameters: await buildTemplateParams(clinic.ycloud_api_key, tplName2h, {
                                            1: appt.patient_name,
                                            2: 'nuestro equipo',
                                            3: `${formattedDate} a las ${formattedTime}`,
                                            4: appt.service || 'consulta',
                                            5: clinic.clinic_name
                                        })
                                    }
                                ]
                            }
                        }

                        const response = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': clinic.ycloud_api_key
                            },
                            body: JSON.stringify(messagePayload)
                        })

                        const responseData = await response.json().catch(() => ({}));

                        if (response.ok) {
                            await supabaseClient.from('messages').insert({
                                clinic_id: clinic.id,
                                phone_number: appt.phone_number,
                                direction: 'outbound',
                                content: `Recordatorio 2h antes enviado a ${appt.patient_name}`,
                                ycloud_message_id: responseData.id,
                                ycloud_status: 'sent'
                            })
                            await supabaseClient.from('reminder_logs').insert({
                                clinic_id: clinic.id,
                                appointment_id: appt.id,
                                type: '2h',
                                phone_number: appt.phone_number,
                                status: 'sent',
                                sent_at: new Date().toISOString()
                            });
                            await supabaseClient.from('appointments').update({
                                reminder_sent: true,
                                reminder_sent_at: new Date().toISOString()
                            }).eq('id', appt.id)
                            sentCount++
                            results.sent2h++
                        } else {
                            await supabaseClient.from('reminder_logs').insert({
                                clinic_id: clinic.id,
                                appointment_id: appt.id,
                                type: '2h',
                                phone_number: appt.phone_number,
                                status: 'failed',
                                error_message: JSON.stringify(responseData)
                            });
                        }
                    } catch (e) {
                        console.error(e)
                    }
                }
                results.clinics.find((c: any) => c.clinicId === clinic.id) 
                    ? results.clinics.find((c: any) => c.clinicId === clinic.id).sent2h = sentCount
                    : results.clinics.push({ clinicId: clinic.id, name: clinic.clinic_name, sent2h: sentCount });
            }
        }

        // ==========================================
        // PART 3: 1-Hour Reminders — ELIMINADO PERMANENTEMENTE
        // Los recordatorios de 1 hora (columna `reminder_1h_before`, expuesta en la UI como el
        // toggle "Confirmación") quedaron deshabilitados por decisión de negocio: la confirmación
        // se solicita UNA sola vez, en la ventana de 24h. Este bloque NUNCA debe enviar, sin
        // importar el valor de `reminder_1h_before` en la base de datos.
        // ==========================================

        const oneHourError: any = null
        const oneHourSettingsList: any[] = []
        if (false && !oneHourError && oneHourSettingsList?.length > 0) {
            log.push(`Found ${oneHourSettingsList.length} clinics with 1h reminders enabled`)
            await debugLog('Starting 1h reminders check', { clinicsCount: oneHourSettingsList.length });

            for (const settings of oneHourSettingsList) {
                const clinic = settings.clinic_settings
                if (!clinic?.ycloud_api_key) continue

                const timeZone = clinic.timezone || 'America/Mexico_City'
                const now = new Date()
                const nowUTC = new Date()

                // Target: Now + 1 hour safely
                const targetTimeUTC = new Date(nowUTC.getTime() + 1 * 60 * 60 * 1000)
                const targetHour = getSafeHour(targetTimeUTC, timeZone)

                // Buffer window: +30m to +90m from now
                const startSearch = new Date(nowUTC.getTime() + 30 * 60 * 1000)
                const endSearch = new Date(nowUTC.getTime() + 90 * 60 * 1000)

                const { data: appointments, error: apptError } = await supabaseClient
                    .from('appointments')
                    .select('*')
                    .eq('clinic_id', clinic.id)
                    .in('status', ['pending', 'confirmed'])
                    // Note: We don't filter by reminder_sent=false here because 
                    // a 24h reminder might have been sent yesterday.
                    // We check timestamps below.
                    .gte('appointment_date', startSearch.toISOString())
                    .lt('appointment_date', endSearch.toISOString())

                if (apptError) continue

                let sentCount = 0

                for (const appt of (appointments || [])) {
                    // Check if reminder was sent VERY RECENTLY (e.g., in last 40 mins)
                    if (appt.reminder_sent && appt.reminder_sent_at) {
                        const lastSent = new Date(appt.reminder_sent_at).getTime()
                        const diffMinutes = (nowUTC.getTime() - lastSent) / (1000 * 60)
                        if (diffMinutes < 45) continue // Skip if sent < 45 mins ago
                    }

                    // Strict Hour Check safely
                    const apptDate = new Date(appt.appointment_date)
                    const apptHour = getSafeHour(apptDate, timeZone)

                    if (apptHour !== targetHour) continue

                    // SEND WHATSAPP
                    try {
                        const formattedDate = apptDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone })
                        const formattedTime = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone })

                        // El recordatorio de 1h es SIEMPRE plano (sin botones de confirmación).
                        // La confirmación se pide únicamente en la ventana de 24h.
                        const tplName1h = settings.template_1h || 'appointment_reminder'

                        const messagePayload = {
                            to: appt.phone_number,
                            from: clinic.ycloud_phone_number,
                            type: 'template',
                            template: {
                                name: tplName1h,
                                language: { code: 'es' },
                                components: [
                                    {
                                        type: 'body',
                                        // Numeración semántica: 1=paciente, 2=especialista, 3=fecha, 4=servicio, 5=clínica
                                        parameters: await buildTemplateParams(clinic.ycloud_api_key, tplName1h, {
                                            1: appt.patient_name,
                                            2: 'nuestro equipo',
                                            3: `${formattedDate} a las ${formattedTime}`,
                                            4: appt.service || 'consulta',
                                            5: clinic.clinic_name
                                        })
                                    }
                                ]
                            }
                        }
                        const response = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': clinic.ycloud_api_key
                            },
                            body: JSON.stringify(messagePayload)
                        })

                        const responseData = await response.json().catch(() => ({}));

                        if (response.ok) {
                            results.sent1h++
                            await supabaseClient.from('messages').insert({
                                clinic_id: clinic.id,
                                phone_number: appt.phone_number,
                                direction: 'outbound',
                                content: `Recordatorio 1h antes enviado a ${appt.patient_name}`,
                                ycloud_message_id: responseData.id,
                                ycloud_status: 'sent'
                            })
                            await supabaseClient.from('reminder_logs').insert({
                                clinic_id: clinic.id,
                                appointment_id: appt.id,
                                type: '1h',
                                phone_number: appt.phone_number,
                                status: 'sent',
                                sent_at: new Date().toISOString()
                            });
                            await supabaseClient.from('appointments').update({
                                reminder_sent: true,
                                reminder_sent_at: new Date().toISOString()
                            }).eq('id', appt.id)
                        } else {
                            await supabaseClient.from('reminder_logs').insert({
                                clinic_id: clinic.id,
                                appointment_id: appt.id,
                                type: '1h',
                                phone_number: appt.phone_number,
                                status: 'failed',
                                error_message: JSON.stringify(responseData)
                            });
                        }
                    } catch (e) {
                        console.error(e)
                    }
                }
                results.clinics.find((c: any) => c.clinicId === clinic.id)
                    ? results.clinics.find((c: any) => c.clinicId === clinic.id).sent1h = sentCount
                    : results.clinics.push({ clinicId: clinic.id, name: clinic.clinic_name, sent1h: sentCount });
            }
        }

        await debugLog('Completed cron-process-reminders', { totalSent: results.sent24h + results.sent2h + results.sent1h });

        return new Response(
            JSON.stringify({ success: true, log, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message, log }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=').slice(1).join('=').trim()

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

const CLINIC_ID = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
const CUTOFF = '2026-05-04T23:59:59Z' // Últimos enviados: 4 mayo

async function audit() {
    console.log('\n========================================')
    console.log('  AUDITORÍA RECORDATORIOS - ELIZABETH')
    console.log('  Cuenta: elizabeth.zibaaa@gmail.com')
    console.log('========================================\n')

    // 1. Configuración de la clínica
    const { data: clinic, error: clinicErr } = await supabase
        .from('clinic_settings')
        .select('id, timezone, ycloud_api_key, clinic_name, whatsapp_number, subscription_plan, subscription_status')
        .eq('id', CLINIC_ID)
        .single()

    console.log('━━━ [1] CONFIGURACIÓN DE CLÍNICA ━━━')
    if (clinicErr) console.error('ERROR:', clinicErr.message)
    else console.log({
        clinic_name: clinic?.clinic_name,
        timezone: clinic?.timezone,
        ycloud_api_key_set: !!clinic?.ycloud_api_key,
        ycloud_key_preview: clinic?.ycloud_api_key?.slice(0, 15) + '...',
        whatsapp_number: clinic?.whatsapp_number,
        subscription_plan: clinic?.subscription_plan,
        subscription_status: clinic?.subscription_status,
    })

    // 2. Configuración de recordatorios
    const { data: reminderSettings, error: rsErr } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('clinic_id', CLINIC_ID)
        .single()

    console.log('\n━━━ [2] CONFIGURACIÓN RECORDATORIOS ━━━')
    if (rsErr) console.error('ERROR:', rsErr.message)
    else console.log(reminderSettings)

    // 3. Citas a partir del 4 mayo (las que deberían tener recordatorio)
    const { data: appts, error: apptErr } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, reminder_sent, reminder_sent_at, phone_number, patient_name')
        .eq('clinic_id', CLINIC_ID)
        .gte('appointment_date', CUTOFF)
        .order('appointment_date', { ascending: true })

    console.log('\n━━━ [3] CITAS DESDE EL 4 MAYO EN ADELANTE ━━━')
    if (apptErr) console.error('ERROR:', apptErr.message)
    else if (!appts?.length) {
        console.log('⚠️  NO HAY CITAS encontradas en este rango.')
    } else {
        appts.forEach(a => {
            const shouldHaveReminder = !a.reminder_sent && a.status !== 'cancelled'
            console.log(`📅 ${a.appointment_date?.substring(0,16)} | ${a.patient_name || 'Sin nombre'} | status: ${a.status} | reminder_sent: ${a.reminder_sent} | sent_at: ${a.reminder_sent_at || 'NUNCA'} | phone: ${a.phone_number}${shouldHaveReminder ? ' ⚠️ PENDIENTE' : ''}`)
        })
        const pendientes = appts.filter(a => !a.reminder_sent && a.status !== 'cancelled')
        console.log(`\n📊 Total citas: ${appts.length} | Pendientes de recordatorio: ${pendientes.length} | Ya enviadas: ${appts.filter(a => a.reminder_sent).length}`)
    }

    // 4. Logs de recordatorios
    const { data: logs, error: logErr } = await supabase
        .from('reminder_logs')
        .select('*')
        .eq('clinic_id', CLINIC_ID)
        .order('created_at', { ascending: false })
        .limit(20)

    console.log('\n━━━ [4] REMINDER LOGS (últimos 20) ━━━')
    if (logErr) console.error('ERROR (tabla puede no existir):', logErr.message)
    else if (!logs?.length) console.log('⚠️  Sin logs')
    else logs.forEach(l => console.log(`${l.created_at?.substring(0,16)} | ${l.status || l.type} | appt: ${l.appointment_id} | msg: ${l.message || l.error || JSON.stringify(l)}`))

    // 5. Mensajes tipo recordatorio
    const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('id, created_at, content, direction, status')
        .eq('clinic_id', CLINIC_ID)
        .gte('created_at', CUTOFF)
        .or('content.ilike.%recordatorio%,content.ilike.%reminder%,content.ilike.%cita%')
        .order('created_at', { ascending: false })
        .limit(10)

    console.log('\n━━━ [5] MENSAJES DE RECORDATORIO (desde 4 mayo) ━━━')
    if (msgErr) console.error('ERROR:', msgErr.message)
    else if (!msgs?.length) console.log('⚠️  No se encontraron mensajes de recordatorio enviados')
    else msgs.forEach(m => console.log(`${m.created_at?.substring(0,16)} | ${m.direction} | ${m.status} | ${m.content?.substring(0,80)}`))

    // 6. Debug logs relacionados con el cron/reminders
    const { data: debugLogs, error: dlErr } = await supabase
        .from('debug_logs')
        .select('*')
        .gte('created_at', CUTOFF)
        .or(`payload.cs.{"clinic_id":"${CLINIC_ID}"},payload.cs.{"clinicId":"${CLINIC_ID}"}`)
        .order('created_at', { ascending: false })
        .limit(10)

    console.log('\n━━━ [6] DEBUG LOGS (desde 4 mayo) ━━━')
    if (dlErr) console.error('ERROR:', dlErr.message)
    else if (!debugLogs?.length) {
        console.log('⚠️  Sin debug logs — probando búsqueda por texto...')
        const { data: dl2, error: dl2Err } = await supabase
            .from('debug_logs')
            .select('*')
            .gte('created_at', CUTOFF)
            .order('created_at', { ascending: false })
            .limit(20)
        if (dl2Err) console.error('ERROR:', dl2Err.message)
        else if (!dl2?.length) console.log('⚠️  Tabla debug_logs vacía desde el 4 mayo → el cron NO ha corrido')
        else {
            console.log(`ℹ️  Hay ${dl2.length} debug_logs globales. Últimos:`)
            dl2.forEach(d => console.log(`${d.created_at?.substring(0,16)} | ${d.function_name || d.type || ''} | ${JSON.stringify(d.payload)?.substring(0,100)}`))
        }
    } else {
        debugLogs.forEach(d => console.log(`${d.created_at?.substring(0,16)} | ${d.function_name || d.type || ''} | ${JSON.stringify(d.payload)?.substring(0,100)}`))
    }

    // 7. Verificar si el cron job fue actualizado recientemente
    const { data: cronCheck, error: cronErr } = await supabase
        .from('debug_logs')
        .select('created_at, function_name, payload')
        .ilike('function_name', '%reminder%')
        .order('created_at', { ascending: false })
        .limit(10)

    console.log('\n━━━ [7] ÚLTIMAS EJECUCIONES DEL CRON (cualquier clínica) ━━━')
    if (cronErr) console.error('ERROR:', cronErr.message)
    else if (!cronCheck?.length) console.log('⚠️  EL CRON NO HA EJECUTADO o no loguea en debug_logs')
    else cronCheck.forEach(d => console.log(`${d.created_at?.substring(0,16)} | ${d.function_name} | ${JSON.stringify(d.payload)?.substring(0,100)}`))

    // 8. Subscripción activa
    const { data: subs, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('clinic_id', CLINIC_ID)
        .single()

    console.log('\n━━━ [8] SUSCRIPCIÓN ━━━')
    if (subErr) console.error('ERROR:', subErr.message)
    else console.log({
        plan: subs?.plan,
        status: subs?.status,
        current_period_end: subs?.current_period_end,
        trial_end: subs?.trial_end,
        cancel_at: subs?.cancel_at,
    })

    // 9. Citas ANTES del 4 mayo que SÍ tuvieron recordatorio (para comparar)
    const { data: prevAppts } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, reminder_sent, reminder_sent_at, patient_name')
        .eq('clinic_id', CLINIC_ID)
        .lt('appointment_date', CUTOFF)
        .eq('reminder_sent', true)
        .order('appointment_date', { ascending: false })
        .limit(5)

    console.log('\n━━━ [9] ÚLTIMAS CITAS CON RECORDATORIO ENVIADO (antes del 4 mayo) ━━━')
    if (!prevAppts?.length) console.log('⚠️  Ninguna')
    else prevAppts.forEach(a => console.log(`📅 ${a.appointment_date?.substring(0,16)} | ${a.patient_name || ''} | sent_at: ${a.reminder_sent_at?.substring(0,16)}`))

    console.log('\n========================================')
    console.log('         FIN DE LA AUDITORÍA')
    console.log('========================================\n')
}

audit().catch(console.error)

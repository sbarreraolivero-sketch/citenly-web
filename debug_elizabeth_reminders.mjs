import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function debugReminders() {
    const clinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    
    const { data: clinic } = await supabase.from('clinic_settings').select('id, timezone, ycloud_api_key, clinic_name').eq('id', clinicId).single()
    console.log('\n--- Clinic Settings ---')
    console.log({ 
        id: clinic?.id,
        timezone: clinic?.timezone, 
        ycloud_api_key_set: !!clinic?.ycloud_api_key, 
        clinic_name: clinic?.clinic_name 
    })

    const { data: reminderSettings } = await supabase.from('reminder_settings').select('*').eq('clinic_id', clinicId).single()
    console.log('\n--- Reminder Settings ---')
    console.log(reminderSettings)

    const nowUTC = new Date()
    const past48h = new Date(nowUTC.getTime() - 48 * 60 * 60 * 1000)
    const next48h = new Date(nowUTC.getTime() + 48 * 60 * 60 * 1000)

    const { data: appts } = await supabase.from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', past48h.toISOString())
        .lt('appointment_date', next48h.toISOString())
        .order('appointment_date', { ascending: true })
        
    console.log('\n--- Appointments near to Now ---')
    appts?.forEach(a => console.log(`${a.id} | ${a.appointment_date} | status: ${a.status} | sent: ${a.reminder_sent} | sent_at: ${a.reminder_sent_at} | phone: ${a.phone_number}`))

    const { data: logs } = await supabase.from('reminder_logs').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(5)
    console.log('\n--- Recent Reminder Logs ---')
    console.log(logs)

    const { data: msgLogs } = await supabase.from('messages').select('*').eq('clinic_id', clinicId).ilike('content', '%Recordatorio%').order('created_at', { ascending: false }).limit(5)
    console.log('\n--- Recent Message Logs (Reminders) ---')
    console.log(msgLogs)
    
    const { data: debugLogs } = await supabase.from('debug_logs').select('*').ilike('payload::text', '%1ab32091-210c-4525-a7e1-e6a7dca1c8c6%').order('created_at', { ascending: false }).limit(5)
    console.log('\n--- Recent Debug Logs containing Clinic ID ---')
    console.log(debugLogs)
}

debugReminders()

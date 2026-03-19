import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envStr = fs.readFileSync('.env', 'utf-8')
const lines = envStr.split('\n').map(l => l.trim())
const url = lines.find(l => l.startsWith('VITE_SUPABASE_URL=')).split('=')[1]
const key = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1]

const supabase = createClient(url, key)

async function debugAvailability() {
    const targetDate = '2026-03-18' // Wednesday
    const clinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6' // Elizabeth's clinic?

    console.log(`Checking availability for ${targetDate}...`)
    
    // Check appointments
    const { data: appts } = await supabase.from('appointments').select('*').gte('appointment_date', targetDate + 'T00:00:00Z').lte('appointment_date', targetDate + 'T23:59:59Z')
    console.log('Appointments:', appts.map(a => ({ patient: a.patient_name, service: a.service, time: a.appointment_date, duration: a.duration, professional: a.professional_id })))

    // Check professional working hours
    const { data: pros } = await supabase.from('clinic_members').select('*').eq('clinic_id', clinicId)
    console.log('Professionals:', pros.map(p => ({ name: p.first_name, hours: p.working_hours })))

    // Check available slots RPC
    const { data: slots, error: slotError } = await supabase.rpc('get_available_slots', {
        p_clinic_id: clinicId,
        p_duration: 120, // Example service duration
        p_interval: 60,
        p_timezone: 'America/Santiago'
    })
    
    if (slotError) console.error('Slot Error:', slotError)
    else console.log('Available Slots for 120min service:', slots)
}

debugAvailability()

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envStr = fs.readFileSync('.env', 'utf-8')
const lines = envStr.split('\n').map(l => l.trim())
const url = lines.find(l => l.startsWith('VITE_SUPABASE_URL=')).split('=')[1]
const key = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1]

const supabase = createClient(url, key)

async function debug() {
    // 1. Get Clinic ID
    const { data: users } = await supabase.from('user_profiles').select('*').eq('email', 'elizabeth.zibaaa@gmail.com')
    if (!users?.length) {
        console.log('User not found')
        return
    }
    const cid = users[0].clinic_id
    console.log('Clinic ID:', cid)

    // 2. Get Professionals
    const { data: professionals } = await supabase.from('clinic_members').select('*').eq('clinic_id', cid).eq('status', 'active')
    console.log('Professionals:', professionals.map(p => ({ id: p.id, role: p.role, email: p.email })))

    // 3. Get Services
    const { data: services } = await supabase.from('services').select('*').eq('clinic_id', cid)
    console.log('Services:', services.map(s => ({ name: s.name, duration: s.duration })))

    // 4. Get the appointment from the screenshot
    // Date is Friday March 20, 2026? Let's check. 
    // The screenshot says "viernes 20 de marzo"
    const { data: appts } = await supabase.from('appointments')
        .select('*')
        .eq('clinic_id', cid)
        .gte('appointment_date', '2026-03-20T00:00:00Z')
        .lte('appointment_date', '2026-03-20T23:59:59Z')
    
    console.log('Appointments on March 20:', appts.map(a => ({ 
        patient: a.patient_name, 
        service: a.service, 
        start: a.appointment_date, 
        duration: a.duration,
        professional: a.professional_id
    })))

    // 5. Test get_professional_available_slots for Elizabeth
    const elizabeth = professionals.find(p => p.email === 'elizabeth.zibaaa@gmail.com')
    if (elizabeth) {
        const { data: slots, error } = await supabase.rpc('get_professional_available_slots', {
            p_clinic_id: cid,
            p_member_id: elizabeth.id,
            p_date: '2026-03-20',
            p_duration: 60, // Assuming Microblading takes 60 min
            p_interval: 30,
            p_timezone: 'America/Santiago'
        })
        console.log('Slots for Elizabeth:', slots?.filter(s => s.is_available).map(s => s.slot_time))
        if (error) console.error('RPC Error:', error)
    }

    // 6. Test global get_available_slots
    const { data: globalSlots } = await supabase.rpc('get_available_slots', {
        p_clinic_id: cid,
        p_date: '2026-03-20',
        p_duration: 60,
        p_interval: 30
    })
    console.log('Global Available Slots:', globalSlots?.filter(s => s.is_available).map(s => s.slot_time))
}

debug()

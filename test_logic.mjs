import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabaseClient = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function testLogic() {
    const clinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    
    // Part 1: 24h simulation
    let timeZone = 'America/Santiago'
    let now = new Date()
    let clinicNow = new Date(now.toLocaleString('en-US', { timeZone }))
    let currentHour = clinicNow.getHours()

    console.log('--- 24H SIMULATION ---')
    console.log('Now UTC:', now.toISOString())
    console.log('Clinic Now:', clinicNow.toISOString(), 'Hour:', currentHour)

    // The script's logic:
    const bugTomorrowDate = new Date(clinicNow)
    bugTomorrowDate.setDate(bugTomorrowDate.getDate() + 1)
    const bugTomorrowStr = bugTomorrowDate.toISOString().split('T')[0]
    
    console.log('Bug tomorrow string:', bugTomorrowStr)

    const nowUTC = new Date()
    const next48h = new Date(nowUTC.getTime() + 48 * 60 * 60 * 1000)

    const { data: appointments } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .in('status', ['pending', 'confirmed'])
        .eq('reminder_sent', false)
        .gte('appointment_date', nowUTC.toISOString())
        .lt('appointment_date', next48h.toISOString())
        
    console.log('Appointments fetched:', appointments?.length)

    for (const appt of appointments || []) {
        let apptDate = new Date(appt.appointment_date)
        let apptDateStr = apptDate.toLocaleDateString('en-CA', { timeZone })
        
        console.log(`Checking appt ${appt.id} (${apptDateStr}) against bugTomorrowStr (${bugTomorrowStr})`)
        if (apptDateStr !== bugTomorrowStr) {
            console.log(' -> SKIPPED')
        } else {
            console.log(' -> MATCH! Would send!')
        }
    }

    // Part 2: 2h simulation
    console.log('\n--- 2H SIMULATION ---')
    const targetHour = clinicNow.getHours() + 2
    console.log(`Target Hour: ${targetHour}`)

    const startSearch = new Date(nowUTC.getTime() + 90 * 60 * 1000)
    const endSearch = new Date(nowUTC.getTime() + 150 * 60 * 1000)

    const { data: appts2h } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .in('status', ['pending', 'confirmed'])
        .gte('appointment_date', startSearch.toISOString())
        .lt('appointment_date', endSearch.toISOString())

    for (const appt of appts2h || []) {
        const apptDate = new Date(appt.appointment_date)
        const apptHour = parseInt(apptDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone }))
        
        console.log(`Appt ${appt.id} | Hour: ${apptHour} | Target: ${targetHour}`)
        if (apptHour !== targetHour) {
            console.log(' -> SKIPPED (Hour mismatch)')
        } else {
            console.log(' -> MATCH!')
        }
    }
}

testLogic()

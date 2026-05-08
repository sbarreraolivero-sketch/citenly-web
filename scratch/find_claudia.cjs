const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const sb = createClient(supabaseUrl, supabaseKey)

async function run() {
    const { data, error } = await sb.from('appointments')
        .select('id, patient_name, appointment_date')
        .ilike('patient_name', '%Claudia%')
        .order('appointment_date', { ascending: false })

    if (error) {
        console.error(error)
    } else {
        data.forEach(a => {
            const d = new Date(a.appointment_date)
            const options = { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: true }
            const chileTime = d.toLocaleTimeString('es-CL', options)
            console.log(`${a.patient_name} | ${a.appointment_date} -> ${chileTime}`)
        })
    }
}

run()

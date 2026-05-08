const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const sb = createClient(supabaseUrl, supabaseKey)

async function run() {
    const { data, error } = await sb.from('appointments').select('appointment_date, clinic_id').order('appointment_date', { ascending: false }).limit(50)

    if (error) {
        console.error(error)
    } else {
        data.forEach(a => {
            const d = new Date(a.appointment_date)
            // Use Chile time for visualization
            const options = { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit' }
            const chileTime = d.toLocaleTimeString('es-CL', options)
            console.log(`${a.appointment_date} -> Chile: ${chileTime} (${d.getMinutes()} mins)`)
        })
    }
}

run()

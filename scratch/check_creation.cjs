const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const sb = createClient(supabaseUrl, supabaseKey)

async function run() {
    const { data, error } = await sb.from('appointments')
        .select('id, patient_name, appointment_date, created_at')
        .ilike('patient_name', '%Claudia Alejandra Muñoz Cornejo%')

    if (error) {
        console.error(error)
    } else {
        data.forEach(a => {
            console.log(`${a.patient_name} | Appt: ${a.appointment_date} | Created: ${a.created_at}`)
        })
    }
}

run()

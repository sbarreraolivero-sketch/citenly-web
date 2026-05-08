const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const sb = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log('--- Iniciando Limpieza de Minutos (Modo Floor) ---')
    
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const { data: appointments, error } = await sb.from('appointments')
        .select('id, appointment_date, patient_name')
        .gte('appointment_date', sixMonthsAgo.toISOString())
        .order('appointment_date', { ascending: true })

    if (error) {
        console.error('Error fetching appointments:', error)
        return
    }

    console.log(`Encontradas ${appointments.length} citas para analizar.`)

    let updatedCount = 0
    for (const appt of appointments) {
        const d = new Date(appt.appointment_date)
        const mins = d.getMinutes()
        const secs = d.getSeconds()
        const ms = d.getMilliseconds()

        if (![0, 15, 30, 45].includes(mins) || secs !== 0 || ms !== 0) {
            // Floor to nearest 15 mins (e.g. 08 -> 00)
            const floorMins = Math.floor(mins / 15) * 15
            const newDate = new Date(d)
            newDate.setMinutes(floorMins)
            newDate.setSeconds(0)
            newDate.setMilliseconds(0)

            const newISO = newDate.toISOString()
            
            console.log(`[LIMPIEZA] ${appt.patient_name}: ${appt.appointment_date} -> ${newISO} (${mins}m -> ${newDate.getMinutes()}m)`)

            const { error: updateError } = await sb.from('appointments')
                .update({ appointment_date: newISO })
                .eq('id', appt.id)

            if (updateError) {
                console.error(`Error actualizando cita ${appt.id}:`, updateError)
            } else {
                updatedCount++
            }
        }
    }

    console.log(`--- Limpieza completada ---`)
    console.log(`Citas corregidas: ${updatedCount}`)
}

run()

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const sb = createClient(supabaseUrl, supabaseKey)

const { data, error } = await sb.from('appointments').select('appointment_date').order('appointment_date', { ascending: false }).limit(100)

if (error) {
    console.error(error)
} else {
    data.forEach(a => {
        const d = new Date(a.appointment_date)
        console.log(`${a.appointment_date} -> ${d.getMinutes()} mins`)
    })
}

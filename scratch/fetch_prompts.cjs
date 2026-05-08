const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const sb = createClient(supabaseUrl, supabaseKey)

async function run() {
    const { data, error } = await sb.from('clinic_settings').select('ai_system_prompt, clinic_id').limit(1)

    if (error) {
        console.error(error)
    } else {
        console.log(data[0]?.ai_system_prompt)
    }
}

run()

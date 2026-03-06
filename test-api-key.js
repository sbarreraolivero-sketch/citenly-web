import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    const { data, error } = await supabase.from('clinic_settings').select('ycloud_api_key, ycloud_waba_id').limit(1)
    console.log("data:", data)
    console.log("error:", error)
}
run()

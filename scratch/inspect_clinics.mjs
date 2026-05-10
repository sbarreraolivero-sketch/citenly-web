import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function inspect() {
    const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .limit(1)
    
    if (error) console.error(error)
    else console.log('Columnas encontradas:', Object.keys(data[0]))
}
inspect()

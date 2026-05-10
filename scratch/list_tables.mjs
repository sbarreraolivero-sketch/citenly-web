import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables')
    if (error) {
        // Si el RPC no existe, intentamos una query genérica
        const { data: data2, error: error2 } = await supabase.from('clinic_settings').select('*').limit(1)
        if (error2) console.error('Error buscando clinic_settings:', error2)
        else console.log('Tabla clinic_settings existe. Columnas:', Object.keys(data2[0]))
    } else {
        console.log('Tablas:', data)
    }
}
listTables()

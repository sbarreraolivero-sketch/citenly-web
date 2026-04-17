import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkAll() {
    console.log('--- BUSCANDO TODOS LOS CLINIC_SETTINGS ---')
    const { data: configs, error } = await supabase.from('clinic_settings').select('clinic_id, clinic_name, ycloud_phone_number')
    if (error) { console.error(error); return; }

    for (const c of configs) {
        const { count: pCount } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', c.clinic_id)
        const { count: aCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', c.clinic_id)
        console.log(`Clinic: ${c.clinic_name} (${c.clinic_id}) - Patients: ${pCount}, Appts: ${aCount}`)
    }
    
    console.log('\n--- BUSCANDO PACIENTES SIN CLINIC_ID O CON IDs RAROS ---')
    const { data: pSample } = await supabase.from('patients').select('clinic_id').limit(5)
    console.log('Muestra de clinic_id en patients:', pSample)
}

checkAll()

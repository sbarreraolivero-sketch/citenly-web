import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkColumns() {
    const { data: cData } = await supabase.from('clinic_settings').select('*').limit(1)
    console.log('--- CLINIC_SETTINGS KEYS ---')
    if (cData && cData[0]) console.log(Object.keys(cData[0]))

    const { data: pData } = await supabase.from('patients').select('*').limit(1)
    console.log('\n--- PATIENTS KEYS ---')
    if (pData && pData[0]) console.log(Object.keys(pData[0]))
    
    const { data: aData } = await supabase.from('appointments').select('*').limit(1)
    console.log('\n--- APPOINTMENTS KEYS ---')
    if (aData && aData[0]) console.log(Object.keys(aData[0]))
}

checkColumns()

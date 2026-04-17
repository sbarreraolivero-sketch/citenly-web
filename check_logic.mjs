import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkLogic() {
    const clinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    
    // 1. Check Return Windows
    const { data: windows } = await supabase.from('service_return_windows').select('*').eq('clinic_id', clinicId)
    console.log('--- RETURN WINDOWS ---')
    console.log(windows)
    
    // 2. Check a few patients at risk
    const { data: scores } = await supabase.from('patient_retention_scores').select('*').eq('clinic_id', clinicId).limit(5)
    console.log('\n--- SAMPLE SCORES ---')
    scores.forEach(s => {
        console.log(`Patient: ${s.patient_id} | Score: ${s.score} | Last Visit: ${s.last_visit_date} | Days Since: ${s.days_since_last_visit} | Return Window: ${s.expected_return_days} | Delay: ${s.delay_days}`)
    })
}

checkLogic()

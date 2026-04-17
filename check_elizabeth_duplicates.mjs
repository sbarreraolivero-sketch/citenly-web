import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkDuplicates() {
    const ids = [
        'afe6d26e-2517-4ed2-b81a-48810c5228c8',
        '7cdbb0d1-5a95-4b31-8437-de35b129eb89',
        '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    ]
    
    for (const id of ids) {
        const { count: pCount } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', id)
        const { count: aCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', id)
        const { data: scores } = await supabase.from('patient_retention_scores').select('risk_level').eq('clinic_id', id)
        
        console.log(`ID: ${id}`)
        console.log(`- Patients: ${pCount}`)
        console.log(`- Appointments: ${aCount}`)
        console.log(`- Retention Scores: ${scores?.length || 0}`)
        if (scores) {
            const low = scores.filter(s => s.risk_level === 'low').length
            const med = scores.filter(s => s.risk_level === 'medium').length
            const high = scores.filter(s => s.risk_level === 'high').length
            console.log(`  - Low: ${low}, Medium: ${med}, High: ${high}`)
        }
        console.log('---')
    }
}

checkDuplicates()

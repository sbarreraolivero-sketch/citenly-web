import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

const ids = [
    'afe6d26e-2517-4ed2-b81a-48810c5228c8',
    '7cdbb0d1-5a95-4b31-8437-de35b129eb89',
    '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
]

async function getPrompts() {
    const { data } = await supabase.from('clinic_settings').select('id, behavioral_instructions').in('id', ids)
    data.forEach(d => {
        console.log(`\n\n=== ID: ${d.id} ===\n`)
        console.log(d.behavioral_instructions?.substring(0, 500) || 'NULL')
    })
}

getPrompts()

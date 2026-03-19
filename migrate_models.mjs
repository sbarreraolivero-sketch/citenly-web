import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function migrateModels() {
    console.log('Migrating all clinics to gpt-4o-mini...')
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ openai_model: 'gpt-4o-mini' })
        .neq('openai_model', 'gpt-4o-mini')
        .select('id, clinic_name')
    
    if (error) {
        console.error('Migration error:', error)
    } else {
        console.log(`Updated ${data?.length || 0} clinics.`)
        data?.forEach(c => console.log(`- ${c.clinic_name} (${c.id})`))
    }
}

migrateModels()

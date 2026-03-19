import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkSchema() {
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    if (error) console.error(error);
    else console.log('Sample message keys:', Object.keys(data[0] || {}));
}

checkSchema()

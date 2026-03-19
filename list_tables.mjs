import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function listTables() {
    const { data: tables, error } = await supabase.rpc('get_tables')
    if (error) {
        console.log('Error with RPC:', error)
        // Fallback to searching schema
        const { data: tablesInfo, error: err2 } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public')
        if (err2) {
            console.log('Error with information_schema:', err2)
            // Try another way: just query common tables
            const commonTables = ['user_profiles', 'clinic_settings', 'subscriptions', 'agents', 'messages', 'conversations', 'ai_agents']
            for (const table of commonTables) {
                const { error: tErr } = await supabase.from(table).select('count', { count: 'exact', head: true })
                if (!tErr) console.log(`Table exists: ${table}`)
                else console.log(`Table ${table} check error:`, tErr.message)
            }
        } else {
            console.log('Tables:', tablesInfo.map(t => t.table_name))
        }
    } else {
        console.log('Tables:', tables)
    }
}

listTables()

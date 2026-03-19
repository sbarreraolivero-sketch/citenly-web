import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envStr = fs.readFileSync('.env', 'utf-8')
const lines = envStr.split('\n').map(l => l.trim())
const url = lines.find(l => l.startsWith('VITE_SUPABASE_URL=')).split('=')[1]
const key = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1]

const supabase = createClient(url, key)

async function fixData() {
    console.log('Fetching services...')
    const { data: services } = await supabase.from('services').select('clinic_id, name, duration')
    
    console.log(`Found ${services?.length} services. Correcting appointments...`)
    
    for (const service of services || []) {
        const { clinic_id, name, duration } = service
        if (!name || isNaN(duration)) continue
        
        console.log(`Setting duration to ${duration} for service "${name}" in clinic ${clinic_id}...`)
        const { count, error } = await supabase
            .from('appointments')
            .update({ duration: duration })
            .eq('clinic_id', clinic_id)
            .ilike('service', name) // Use case-insensitive match
            .not('duration', 'eq', duration)
        
        if (error) console.error(`Error updating "${name}":`, error)
        else if (count > 0) console.log(`Updated ${count} appointments for "${name}"`)
    }
    console.log('Data fix complete.')
}

fixData()


import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable() {
  const { data, error } = await supabase
    .from('clinic_blocked_dates')
    .select('*')
    .limit(1)

  if (error) {
    if (error.code === '42P01') {
      console.log('TABLE_NOT_FOUND')
    } else {
      console.error('ERROR:', error)
    }
  } else {
    console.log('TABLE_EXISTS')
  }
}

checkTable()

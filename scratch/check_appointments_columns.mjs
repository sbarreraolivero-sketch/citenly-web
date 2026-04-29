import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'appointments' })
  if (error) {
    // If RPC doesn't exist, try a simple query
    console.log('RPC failed, trying query...')
    const { data: data2, error: error2 } = await supabase.from('appointments').select('*').limit(1)
    if (error2) {
      console.error('Error fetching appointments:', error2)
    } else {
      console.log('Sample appointment:', data2[0])
      console.log('Columns in sample:', Object.keys(data2[0] || {}))
    }
  } else {
    console.log('Columns:', data)
  }
}

checkColumns()

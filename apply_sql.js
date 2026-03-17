
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const projectRef = 'hubjqllcmbzoojyidgcu'
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

async function applySql() {
  const sql = fs.readFileSync('supabase/migrations/20260317100000_multi_interest_support.sql', 'utf8')
  
  console.log(`Applying SQL to project ${projectRef}...`)

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  })

  const result = await response.json()
  
  if (response.ok) {
    console.log('✅ SQL applied successfully!')
    console.log(result)
  } else {
    console.error('❌ Error applying SQL:', result)
  }
}

applySql()

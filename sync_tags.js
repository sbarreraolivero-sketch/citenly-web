
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function syncTags() {
  console.log('--- Starting Tag Sync ---')
  
  // 1. Get all prospects with interests
  const { data: prospects, error: pError } = await supabase
    .from('crm_prospects')
    .select('id, clinic_id, service_interest')
    .not('service_interest', 'is', null)

  if (pError) {
    console.error('Error fetching prospects:', pError)
    return
  }

  console.log(`Processing ${prospects.length} prospects...`)

  for (const prospect of prospects) {
    const interests = prospect.service_interest.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.toLowerCase() !== 'no especificado');

    for (const interest of interests) {
      const tagName = `Interés ${interest}`;
      
      // 1. Find or create tag
      let { data: tag, error: tError } = await supabase
        .from('crm_tags')
        .select('id')
        .eq('clinic_id', prospect.clinic_id)
        .ilike('name', tagName)
        .maybeSingle()

      if (tError) {
        console.error(`Error searching tag ${tagName}:`, tError)
        continue
      }

      let tagId;
      if (!tag) {
        console.log(`Creating tag: ${tagName} for clinic ${prospect.clinic_id}`)
        const { data: newTag, error: cError } = await supabase
          .from('crm_tags')
          .insert({
            clinic_id: prospect.clinic_id,
            name: tagName,
            color: '#3B82F6' // Default Blue for Interest
          })
          .select('id')
          .single()
        
        if (cError) {
          console.error(`Error creating tag ${tagName}:`, cError)
          continue
        }
        tagId = newTag.id
      } else {
        tagId = tag.id
      }

      // 2. Link tag (ignore if already linked)
      const { error: lError } = await supabase
        .from('crm_prospect_tags')
        .insert({
          prospect_id: prospect.id,
          tag_id: tagId
        })
      
      // Error code 23505 is unique_violation, which we can ignore
      if (lError && lError.code !== '23505') {
        console.error(`Error linking tag ${tagName} to prospect ${prospect.id}:`, lError)
      }
    }
  }

  console.log('--- Tag Sync Finished ---')
}

syncTags()

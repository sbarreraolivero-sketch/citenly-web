
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanDuplicateTags() {
  console.log('--- Consolidation of Interest Tags ---')

  // List of terms to consolidate to "Interés Microblading"
  const microbladingVariants = [
    'Interés Microblading de cejas',
    'Interés Microblading de Cejas',
    'Interés microblading'
  ]

  // 1. Get all tags
  const { data: tags } = await supabase.from('crm_tags').select('*')
  
  if (!tags) return

  // Find the "Master" Microblading tag for each clinic
  const clinics = [...new Set(tags.map(t => t.clinic_id))]

  for (const clinicId of clinics) {
    const clinicTags = tags.filter(t => t.clinic_id === clinicId)
    const masterTag = clinicTags.find(t => t.name === 'Interés Microblading')
    
    if (!masterTag) continue

    const redundantTags = clinicTags.filter(t => microbladingVariants.includes(t.name))

    for (const redTag of redundantTags) {
      console.log(`Merging ${redTag.name} -> Interés Microblading for clinic ${clinicId}`)
      
      // Move associations
      const { data: links } = await supabase
        .from('crm_prospect_tags')
        .select('*')
        .eq('tag_id', redTag.id)

      if (links) {
        for (const link of links) {
          // Check if master already linked to this prospect
          const { data: exists } = await supabase
            .from('crm_prospect_tags')
            .select('*')
            .eq('prospect_id', link.prospect_id)
            .eq('tag_id', masterTag.id)
            .maybeSingle()

          if (!exists) {
            await supabase.from('crm_prospect_tags').insert({
              prospect_id: link.prospect_id,
              tag_id: masterTag.id
            })
          }
        }
      }

      // Delete the redundant tag and its links
      await supabase.from('crm_prospect_tags').delete().eq('tag_id', redTag.id)
      await supabase.from('crm_tags').delete().eq('id', redTag.id)
    }
  }

  console.log('--- Cleaning Finished ---')
}

cleanDuplicateTags()

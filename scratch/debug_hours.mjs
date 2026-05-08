import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hubjqllcmbzoojyidgcu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YmpxbGxjbWJ6b29qeWlkZ2N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0OTc3MCwiZXhwIjoyMDg1NzI1NzcwfQ.lnOepDZP07NwIvROxdHZG6sLST4vJs51QIDCQs7cF6o'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getWorkingHours() {
    const { data, error } = await supabase.from('clinic_settings').select('id, clinic_name, working_hours')
    if (error) {
        console.error(error)
        return
    }
    data.forEach(d => {
        console.log(`\n\n=== Clinic: ${d.clinic_name} (ID: ${d.id}) ===\n`)
        console.log(JSON.stringify(d.working_hours, null, 2))
    })
}

getWorkingHours()

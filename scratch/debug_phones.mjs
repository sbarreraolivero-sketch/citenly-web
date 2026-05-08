import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hubjqllcmbzoojyidgcu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YmpxbGxjbWJ6b29qeWlkZ2N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0OTc3MCwiZXhwIjoyMDg1NzI1NzcwfQ.lnOepDZP07NwIvROxdHZG6sLST4vJs51QIDCQs7cF6o'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getPhones() {
    const { data, error } = await supabase.from('clinic_settings').select('id, clinic_name, ycloud_phone_number')
    if (error) {
        console.error(error)
        return
    }
    data.forEach(d => {
        console.log(`${d.clinic_name} | ID: ${d.id} | Phone: ${d.ycloud_phone_number}`)
    })
}

getPhones()

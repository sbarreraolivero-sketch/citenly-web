import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function generateReport() {
    console.log('--- STARTING REPORT ---')
    
    // 1. Find Clinic
    const { data: clinics } = await supabase.from('clinic_settings').select('id, clinic_name').ilike('clinic_name', '%Elizabeth%')
    if (!clinics || clinics.length === 0) {
        console.log('Clinic not found')
        return
    }
    
    const clinicId = clinics[0].id
    console.log(`Clinic found: ${clinics[0].clinic_name} (${clinicId})`)
    
    // 2. Get Patients
    const { data: patients, count: pCount } = await supabase.from('patients').select('*', { count: 'exact' }).eq('clinic_id', clinicId)
    console.log(`Total Patients in Database: ${pCount}`)
    
    // 3. Get Appointments
    const { data: appointments, count: aCount } = await supabase.from('appointments').select('*', { count: 'exact' }).eq('clinic_id', clinicId).order('appointment_date', { ascending: false })
    console.log(`Total Appointments in Database: ${aCount}`)
    
    // 4. Get Retention Scores
    const { data: scores } = await supabase.from('patient_retention_scores').select('*').eq('clinic_id', clinicId)
    console.log(`Patients with Calculated Scores: ${scores?.length || 0}`)
    
    // 5. Look for "Discrepancies"
    if (patients) {
        console.log('\n--- SAMPLE PATIENTS ---')
        patients.slice(0, 5).forEach(p => {
            const score = scores?.find(s => s.patient_id === p.id)
            console.log(`- Patient: ${p.name} | Phone: ${p.phone_number} | Last Appt: ${p.last_appointment_at} | Score Risk: ${score?.risk_level || 'N/A'}`)
        })
    }

    if (appointments) {
        console.log('\n--- RECENT APPOINTMENTS ---')
        appointments.slice(0, 5).forEach(a => {
            console.log(`- Date: ${a.appointment_date} | Patient: ${a.patient_name} | Status: ${a.status} | Service: ${a.service}`)
        })
    }
}

generateReport()

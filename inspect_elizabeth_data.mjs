import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function inspect() {
    console.log('--- BUSCANDO CLÍNICA ELIZABETH ---')
    const { data: clinics, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .ilike('clinic_name', '%Elizabeth%')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Keys:', Object.keys(clinics[0]))
    console.log('Resultados:', JSON.stringify(clinics, null, 2))

    if (clinics.length > 0) {
        const clinicId = clinics[0].clinic_id || clinics[0].id;
        console.log(`\n--- ANALIZANDO PACIENTES PARA ID: ${clinicId} ---`)
        
        // Ver pacientes
        const { data: patients, error: pError } = await supabase
            .from('patients')
            .select('*')
            .eq('clinic_id', clinicId)
            .limit(20)

        if (pError) console.error('Error pacientes:', pError)
        else console.log(`Pacientes encontrados: ${patients.length}`)

        // Ver últimas citas
        const { data: appointments, error: aError } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('appointment_date', { ascending: false })
            .limit(10)

        if (aError) console.error('Error citas:', aError)
        else console.log('Últimas 10 citas:', JSON.stringify(appointments.map(a => ({
            id: a.id,
            patient_name: a.patient_name,
            date: a.appointment_date,
            status: a.status
        })), null, 2))
    }
}

inspect()


import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function inspectElizabeth() {
    const { data: clinics, error } = await supabase.from('clinic_settings').select('id, clinic_name, working_hours').ilike('clinic_name', '%Elizabeth%');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log(JSON.stringify(clinics, null, 2));
}

inspectElizabeth();

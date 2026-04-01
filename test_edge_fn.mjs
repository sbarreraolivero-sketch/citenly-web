import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
let token = '';
let supaUrl = '';
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') token = vals.join('=').trim();
        if (key && key.trim() === 'VITE_SUPABASE_URL') supaUrl = vals.join('=').trim();
    });
}

const campaign_id = 'bfb4d5c7-5c1e-4f69-9459-f41e6667b42e';

async function test() {
    console.log(`Invoking function for campaign ${campaign_id}...`);
    const res = await fetch(`${supaUrl}/functions/v1/send-whatsapp-campaign`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ campaign_id })
    });

    const status = res.status;
    const body = await res.text();
    console.log(`Status: ${status}`);
    console.log(`Body: ${body}`);
}

test().catch(console.error);

import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
let token = process.env.SUPABASE_ACCESS_TOKEN;
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && key.trim() === 'SUPABASE_ACCESS_TOKEN') token = vals.join('=').trim();
    });
}

const file = process.argv[2];
if (!file) throw new Error("No SQL file provided");

const query = fs.readFileSync(file, 'utf8');

async function run() {
    const res = await fetch('https://api.supabase.com/v1/projects/hubjqllcmbzoojyidgcu/database/query', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);
}

run().catch(console.error);

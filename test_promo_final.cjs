require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: camps, error } = await supabase.from('campaigns').select('*').eq('name', 'Promo final').order('created_at', { ascending: false }).limit(1);
    if (!camps || camps.length === 0) {
        console.log("No campaign found with name Promo final");
        return;
    }
    const camp = camps[0];
    console.log("Found Campaign:", camp.id, camp.name);
    
    const url = process.env.VITE_SUPABASE_URL + "/functions/v1/send-whatsapp-campaign";
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ campaign_id: camp.id })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Output:", text);
}
run();

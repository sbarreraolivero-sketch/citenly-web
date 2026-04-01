
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
    // 1. Manejo inmediato de CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    const supaUrl = Deno.env.get('SUPABASE_URL') || '';
    const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseClient = createClient(supaUrl, supaKey);

    const processCampaign = async (cid: string) => {
        try {
            console.log(`[INIT] ${cid}`);
            const { data: campaign, error } = await supabaseClient
                .from('campaigns')
                .select('*, clinic_settings(*)')
                .eq('id', cid).single();

            if (error || !campaign) throw new Error("Not found");

            //--- Lógica de envío en lotes ---
            const { data: rawPatients } = await supabaseClient.from('patients').select('id, name, phone_number').eq('clinic_id', campaign.clinic_id).neq('phone_number', '');
            const { data: pTags } = await supabaseClient.from('patient_tags').select('patient_id, tags!inner(name)');
            const { data: rawProspects } = await supabaseClient.from('crm_prospects').select('id, name, phone').eq('clinic_id', campaign.clinic_id).neq('phone', '');
            const { data: prTags } = await supabaseClient.from('crm_prospect_tags').select('prospect_id, crm_tags!inner(name)');

            const incTags = (campaign.inclusion_tags || []).map((t: string) => t.trim().toLowerCase());
            const excTags = (campaign.exclusion_tags || []).map((t: string) => t.trim().toLowerCase());

            const unifiedMap = new Map();
            const pTagMap = new Map();
            (pTags || []).forEach((pt: any) => {
                const id = pt.patient_id;
                const tag = pt.tags?.name?.trim().toLowerCase();
                if (!pTagMap.has(id)) pTagMap.set(id, []);
                pTagMap.get(id).push(tag);
            });

            const prTagMap = new Map();
            (prTags || []).forEach((ct: any) => {
                const id = ct.prospect_id;
                const tag = ct.crm_tags?.name?.trim().toLowerCase();
                if (!prTagMap.has(id)) prTagMap.set(id, []);
                prTagMap.get(id).push(tag);
            });

            (rawPatients || []).forEach((p: any) => {
                const phone = p.phone_number.replace(/\D/g, '');
                if (phone) unifiedMap.set(phone, { full_name: p.name, phone, tags: pTagMap.get(p.id) || [] });
            });

            (rawProspects || []).forEach((pr: any) => {
                const phone = pr.phone.replace(/\D/g, '');
                if (phone && !unifiedMap.has(phone)) unifiedMap.set(phone, { full_name: pr.name, phone, tags: prTagMap.get(pr.id) || [] });
            });

            const targetContacts = Array.from(unifiedMap.values()).filter(c => {
                const inc = incTags.length === 0 || incTags.some((i: string) => c.tags.includes(i));
                const exc = excTags.length === 0 || !excTags.some((e: string) => c.tags.includes(e));
                return inc && exc;
            });

            if (targetContacts.length === 0) {
                await supabaseClient.from('campaigns').update({ status: 'completed', sent_count: 0, total_target: 0 }).eq('id', cid);
                return;
            }

            const settings = (campaign as any).clinic_settings;
            const ykey = settings?.ycloud_api_key;
            const templatesRes = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', { headers: { 'X-API-Key': ykey } });
            const templates = (await templatesRes.json()).items || [];
            const temp = templates.find((t: any) => t.name === campaign.template_name);
            const bComp = temp?.components?.find((c: any) => c.type === 'BODY');
            const hComp = temp?.components?.find((c: any) => c.type === 'HEADER');
            const numVars = (bComp?.text?.match(/\{\{\d+\}\}/g) || []).length;

            let sentCount = 0;
            const BATCH = 5;

            for (let i = 0; i < targetContacts.length; i += BATCH) {
                const batch = targetContacts.slice(i, i + BATCH);
                await Promise.all(batch.map(async (c) => {
                    const bParams = [];
                    for (let v = 1; v <= numVars; v++) bParams.push({ type: 'text', text: v === 1 ? (c.full_name || 'Paciente') : (v === 5 ? settings?.clinic_name : '-') });
                    
                    const components = [{ type: 'body', parameters: bParams }];
                    if (hComp?.format === 'IMAGE') {
                        const img = hComp.example?.header_handle?.[0] || hComp.example?.header_url?.[0];
                        if (img) components.push({ type: 'header', parameters: [{ type: 'image', image: { link: img } }] });
                    }

                    const phone = c.phone.startsWith('+') ? c.phone : `+${c.phone}`;
                    const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': ykey },
                        body: JSON.stringify({ from: settings?.ycloud_phone_number, to: phone, type: 'template', template: { name: campaign.template_name, language: { code: temp?.language || 'es' }, components } })
                    });

                    if (res.ok) {
                        sentCount++;
                        await supabaseClient.from('campaign_deliveries').insert({ clinic_id: campaign.clinic_id, campaign_id: cid, contact_name: c.full_name, contact_phone: phone, status: 'sent' });
                        let txt = bComp?.text || '';
                        bParams.forEach((p, idx) => txt = txt.replace(`{{${idx + 1}}}`, p.text));
                        await supabaseClient.from('messages').insert({ clinic_id: campaign.clinic_id, phone_number: phone, direction: 'outbound', content: txt, message_type: 'template', campaign_id: cid, ycloud_status: 'sent', ai_generated: true });
                    }
                }));
                await supabaseClient.from('campaigns').update({ sent_count: sentCount, total_target: targetContacts.length }).eq('id', cid);
            }

            await supabaseClient.from('campaigns').update({ status: 'completed' }).eq('id', cid);

        } catch (e: any) {
            console.error(`[BG_ERROR] ${e.message}`);
            await supabaseClient.from('campaigns').update({ status: 'failed', error_log: e.message }).eq('id', cid);
        }
    };

    try {
        let cid = null;
        try {
            const body = await req.json();
            cid = body?.campaign_id;
        } catch {
            cid = new URL(req.url).searchParams.get('campaign_id');
        }

        if (!cid) return new Response(JSON.stringify({ ok: true, msg: "No ID" }), { headers: corsHeaders, status: 200 });

        const mission = processCampaign(cid);
        // @ts-ignore
        if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(mission);

        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 });
    } catch {
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 });
    }
});


import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
    // 1. CORS Inmediato
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 });
    }

    try {
        console.log("[INCOMING_REQUEST]");
        const supaUrl = Deno.env.get('SUPABASE_URL') || '';
        const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabaseClient = createClient(supaUrl, supaKey);

        // Parseo seguro del Body
        let cid = null;
        try {
            const bodyText = await req.text();
            if (bodyText) {
                const body = JSON.parse(bodyText);
                cid = body.campaign_id;
            }
        } catch (e) {
            console.log("[PARSE_ERR] No se pudo leer JSON:", e.message);
        }

        // Intento por URL si falló el body
        if (!cid) {
            cid = new URL(req.url).searchParams.get('campaign_id');
        }

        if (!cid) {
            console.log("[ABORT] No campaign_id found");
            return new Response(JSON.stringify({ ok: true, msg: "Missing ID" }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                status: 200 
            });
        }

        // Función de envío (Worker)
        const runBackground = (async () => {
            try {
                console.log(`[WORKER_START] ID: ${cid}`);
                const { data: campaign, error: cErr } = await supabaseClient
                    .from('campaigns')
                    .select('*, clinic_settings(*)')
                    .eq('id', cid).single();

                if (cErr || !campaign) throw new Error(`Campaign ${cid} not found`);

                const settings = (campaign as any).clinic_settings;
                if (!settings?.ycloud_api_key) throw new Error("API Key missing");

                // 2. Audiencia
                const { data: rawP } = await supabaseClient.from('patients').select('id, name, phone_number').eq('clinic_id', campaign.clinic_id).neq('phone_number', '');
                const { data: pT } = await supabaseClient.from('patient_tags').select('patient_id, tags!inner(name)');
                const { data: rawPr } = await supabaseClient.from('crm_prospects').select('id, name, phone').eq('clinic_id', campaign.clinic_id).neq('phone', '');
                const { data: prT } = await supabaseClient.from('crm_prospect_tags').select('prospect_id, crm_tags!inner(name)');

                const inc = (campaign.inclusion_tags || []).map((t: string) => t.trim().toLowerCase());
                const exc = (campaign.exclusion_tags || []).map((t: string) => t.trim().toLowerCase());

                const map = new Map();
                const pTagMap = new Map();
                (pT || []).forEach((pt: any) => {
                    const id = pt.patient_id;
                    const tag = pt.tags?.name?.trim().toLowerCase();
                    if (!pTagMap.has(id)) pTagMap.set(id, []);
                    pTagMap.get(id).push(tag);
                });

                const prTagMap = new Map();
                (prT || []).forEach((ct: any) => {
                    const id = ct.prospect_id;
                    const tag = ct.crm_tags?.name?.trim().toLowerCase();
                    if (!prTagMap.has(id)) prTagMap.set(id, []);
                    prTagMap.get(id).push(tag);
                });

                (rawP || []).forEach((p: any) => {
                    const tel = p.phone_number.replace(/\D/g, '');
                    if (tel) map.set(tel, { full_name: p.name, phone: tel, tags: pTagMap.get(p.id) || [] });
                });

                (rawPr || []).forEach((pr: any) => {
                    const tel = pr.phone.replace(/\D/g, '');
                    if (tel && !map.has(tel)) map.set(tel, { full_name: pr.name, phone: tel, tags: prTagMap.get(pr.id) || [] });
                });

                const targets = Array.from(map.values()).filter(c => {
                    const matchesInc = inc.length === 0 || inc.some((i: string) => c.tags.includes(i));
                    const matchesExc = exc.length === 0 || !exc.some((e: string) => c.tags.includes(e));
                    return matchesInc && matchesExc;
                });

                if (targets.length === 0) {
                    await supabaseClient.from('campaigns').update({ status: 'completed', sent_count: 0, total_target: 0 }).eq('id', cid);
                    return;
                }

                // 3. WhatsApp
                const ykey = settings.ycloud_api_key;
                const tRes = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', { headers: { 'X-API-Key': ykey } });
                const tData = await tRes.json();
                const temp = (tData.items || []).find((t: any) => t.name === campaign.template_name);
                const bComp = temp?.components?.find((c: any) => c.type === 'BODY');
                const hComp = temp?.components?.find((c: any) => c.type === 'HEADER');
                const vars = (bComp?.text?.match(/\{\{\d+\}\}/g) || []).length;

                let doneCount = 0;
                for (let i = 0; i < targets.length; i += 5) {
                    const batch = targets.slice(i, i + 5);
                    await Promise.all(batch.map(async (c) => {
                        const params = [];
                        for (let v = 1; v <= vars; v++) {
                            let text = v === 1 ? (c.full_name || 'Paciente') : (v === 5 ? settings.clinic_name : '-');
                            params.push({ type: 'text', text });
                        }
                        const comps = [{ type: 'body', parameters: params }];
                        if (hComp?.format === 'IMAGE') {
                            const url = hComp.example?.header_handle?.[0] || hComp.example?.header_url?.[0];
                            if (url) comps.push({ type: 'header', parameters: [{ type: 'image', image: { link: url } }] });
                        }
                        const phone = c.phone.startsWith('+') ? c.phone : `+${c.phone}`;
                        const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-API-Key': ykey },
                            body: JSON.stringify({ from: settings.ycloud_phone_number, to: phone, type: 'template', template: { name: campaign.template_name, language: { code: temp?.language || 'es' }, components: comps } })
                        });
                        if (res.ok) {
                            doneCount++;
                            await supabaseClient.from('campaign_deliveries').insert({ clinic_id: campaign.clinic_id, campaign_id: cid, contact_name: c.full_name, contact_phone: phone, status: 'sent' });
                            let txt = bComp?.text || '';
                            params.forEach((p, idx) => txt = txt.replace(`{{${idx + 1}}}`, p.text));
                            await supabaseClient.from('messages').insert({ clinic_id: campaign.clinic_id, phone_number: phone, direction: 'outbound', content: txt, message_type: 'template', campaign_id: cid, ycloud_status: 'sent', ai_generated: true });
                        }
                    }));
                    await supabaseClient.from('campaigns').update({ sent_count: doneCount, total_target: targets.length }).eq('id', cid);
                }
                await supabaseClient.from('campaigns').update({ status: 'completed' }).eq('id', cid);

            } catch (err: any) {
                console.error(`[WORKER_FATAL] ${err.message}`);
                await supabaseClient.from('campaigns').update({ status: 'failed', error_log: err.message }).eq('id', cid);
            }
        })();

        // @ts-ignore
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
            // @ts-ignore
            EdgeRuntime.waitUntil(runBackground);
        }

        return new Response(JSON.stringify({ ok: true, campaign_id: cid }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 200 
        });

    } catch (criticalError: any) {
        console.error("[CRITICAL_FAIL]", criticalError.message);
        return new Response(JSON.stringify({ ok: true, error: "Handled" }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 200 
        });
    }
});

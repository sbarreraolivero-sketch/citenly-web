
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const supaUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supaUrl, supaKey);

    const processCampaign = async (campaign_id: string) => {
        try {
            console.log(`[START] Procesando campaña: ${campaign_id}`);
            const { data: campaign, error: campaignError } = await supabaseClient
                .from('campaigns')
                .select('*, clinic_settings(clinic_name, ycloud_api_key, ycloud_phone_number)')
                .eq('id', campaign_id)
                .single()

            if (campaignError || !campaign) throw new Error('Campaña no encontrada');

            // 1. Obtener Audiencia
            const { data: rawPatients } = await supabaseClient.from('patients').select('id, name, phone_number').eq('clinic_id', campaign.clinic_id).neq('phone_number', '');
            const { data: pTags } = await supabaseClient.from('patient_tags').select('patient_id, tags!inner(name)');
            const { data: rawProspects } = await supabaseClient.from('crm_prospects').select('id, name, phone').eq('clinic_id', campaign.clinic_id).neq('phone', '');
            const { data: prTags } = await supabaseClient.from('crm_prospect_tags').select('prospect_id, crm_tags!inner(name)');

            const incTags = (campaign.inclusion_tags || []).map((t: string) => t.trim().toLowerCase());
            const excTags = (campaign.exclusion_tags || []).map((t: string) => t.trim().toLowerCase());

            const unifiedMap = new Map();
            const patientTagMap = new Map();
            (pTags || []).forEach((pt: any) => {
                const pid = pt.patient_id;
                const tagName = pt.tags?.name?.trim().toLowerCase();
                if (!tagName) return;
                if (!patientTagMap.has(pid)) patientTagMap.set(pid, []);
                patientTagMap.get(pid).push(tagName);
            });

            const prospectTagMap = new Map();
            (prTags || []).forEach((ct: any) => {
                const prid = ct.prospect_id;
                const tagName = ct.crm_tags?.name?.trim().toLowerCase();
                if (!tagName) return;
                if (!prospectTagMap.has(prid)) prospectTagMap.set(prid, []);
                prospectTagMap.get(prid).push(tagName);
            });

            (rawPatients || []).forEach((p: any) => {
                const phone = (p.phone_number || '').replace(/\D/g, '');
                if (!phone) return;
                unifiedMap.set(phone, { id: p.id, full_name: p.name, phone, tags: patientTagMap.get(p.id) || [] });
            });

            (rawProspects || []).forEach((pr: any) => {
                const phone = (pr.phone || '').replace(/\D/g, '');
                if (!phone || unifiedMap.has(phone)) return;
                unifiedMap.set(phone, { id: pr.id, full_name: pr.name, phone, tags: prospectTagMap.get(pr.id) || [] });
            });

            const targetContacts = Array.from(unifiedMap.values()).filter(c => {
                let pInc = incTags.length === 0 || incTags.some((i: string) => c.tags.includes(i));
                let pExc = excTags.length === 0 || !excTags.some((e: string) => c.tags.includes(e));
                return pInc && pExc;
            });

            console.log(`[AUDIENCE] Total destinatarios filtrados: ${targetContacts.length}`);

            if (targetContacts.length === 0) {
                await supabaseClient.from('campaigns').update({ status: 'completed', sent_count: 0, total_target: 0 }).eq('id', campaign_id);
                return;
            }

            const ycloudKey = (campaign as any).clinic_settings?.ycloud_api_key;
            const clinicName = (campaign as any).clinic_settings?.clinic_name || 'Citenly';
            const fromNumber = (campaign as any).clinic_settings?.ycloud_phone_number;

            const templatesRes = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', { headers: { 'X-API-Key': ycloudKey } });
            const templatesData = await templatesRes.json();
            const targetTemplate = (templatesData.items || []).find((t: any) => t.name === campaign.template_name);
            const bodyComponent = targetTemplate?.components?.find((c: any) => c.type === 'BODY');
            const headerComponent = targetTemplate?.components?.find((c: any) => c.type === 'HEADER');
            const numVars = (bodyComponent?.text?.match(/\{\{\d+\}\}/g) || []).length;

            let sentCount = 0;
            const BATCH_SIZE = 5;

            for (let i = 0; i < targetContacts.length; i += BATCH_SIZE) {
                const batch = targetContacts.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (contact) => {
                    const bodyParams = [];
                    for (let v = 1; v <= numVars; v++) {
                        let val = '-';
                        if (v === 1) val = contact.full_name || 'Paciente';
                        if (v === 5) val = clinicName;
                        bodyParams.push({ type: 'text', text: val });
                    }

                    const components = [{ type: 'body', parameters: bodyParams }];
                    if (headerComponent?.format === 'IMAGE') {
                        const img = headerComponent.example?.header_handle?.[0] || headerComponent.example?.header_url?.[0];
                        if (img) components.push({ type: 'header', parameters: [{ type: 'image', image: { link: img } }] });
                    }

                    let phone = contact.phone;
                    if (!phone.startsWith('+')) phone = `+${phone}`;

                    try {
                        const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-API-Key': ycloudKey },
                            body: JSON.stringify({
                                from: fromNumber,
                                to: phone,
                                type: 'template',
                                template: {
                                    name: campaign.template_name,
                                    language: { code: targetTemplate?.language || 'es' },
                                    components
                                }
                            })
                        });

                        if (res.ok) {
                            sentCount++;
                            await supabaseClient.from('campaign_deliveries').insert({ clinic_id: campaign.clinic_id, campaign_id, contact_name: contact.full_name, contact_phone: phone, status: 'sent' });
                            
                            let txt = bodyComponent?.text || ''
                            bodyParams.forEach((p, idx) => txt = txt.replace(`{{${idx + 1}}}`, p.text))
                            await supabaseClient.from('messages').insert({ clinic_id: campaign.clinic_id, phone_number: phone, direction: 'outbound', content: txt, message_type: 'template', campaign_id, ycloud_status: 'sent', ai_generated: true });
                        }
                    } catch (e: any) {
                        console.error(`Error enviando a ${phone}: ${e.message}`);
                    }
                }));

                await supabaseClient.from('campaigns').update({ sent_count: sentCount, total_target: targetContacts.length }).eq('id', campaign_id);
            }

            await supabaseClient.from('campaigns').update({ status: 'completed', error_log: null }).eq('id', campaign_id);
            console.log(`[SUCCESS] Campaña terminada: ${sentCount} enviados`);

        } catch (err: any) {
            console.error(`[FATAL] ${err.message}`);
            await supabaseClient.from('campaigns').update({ status: 'failed', error_log: err.message }).eq('id', campaign_id);
        }
    };

    try {
        const body = await req.json().catch(() => ({}));
        const campaign_id = body.campaign_id;
        
        if (!campaign_id) {
            return new Response(JSON.stringify({ error: "ID de campaña no recibido" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // USAR EdgeRuntime.waitUntil PARA SEGUIR TRABAJANDO DESPUÉS DE RESPONDER
        const mission = processCampaign(campaign_id);
        
        // @ts-ignore
        if (typeof EdgeRuntime !== 'undefined') {
            // @ts-ignore
            EdgeRuntime.waitUntil(mission);
            console.log(`[QUEUE] Campaña ${campaign_id} encolada con waitUntil`);
        } else {
            // En local o sin EdgeRuntime, disparamos asíncrono normal
            mission.catch(e => console.error("Background error:", e));
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Campaña iniciada con éxito. El progreso se actualizará en unos momentos." 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: "No se pudo leer el cuerpo de la petición" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
})

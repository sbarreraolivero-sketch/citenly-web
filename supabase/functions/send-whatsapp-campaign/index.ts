
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    let campaign_id: string | null = null
    const supaUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supaUrl, supaKey);

    try {
        const body = await req.json()
        campaign_id = body.campaign_id
        
        const { data: campaign, error: campaignError } = await supabaseClient
            .from('campaigns')
            .select('*, clinic_settings(clinic_name, ycloud_api_key, ycloud_phone_number)')
            .eq('id', campaign_id)
            .single()

        if (campaignError || !campaign) throw new Error('Campaña no encontrada')

        // MANUAL AUDIENCE FILTERING TO FIX EXCLUSION BUG
        // MANUAL AUDIENCE FILTERING TO FIX EXCLUSION BUG
        
        // 2A. PACIENTES
        const { data: rawPatients, error: pErr } = await supabaseClient
            .from('patients')
            .select('id, name, phone_number')
            .eq('clinic_id', campaign.clinic_id)
            .neq('phone_number', '');
            
        const { data: pTags, error: pTErr } = await supabaseClient
            .from('patient_tags')
            .select('patient_id, tags!inner(name)');

        // 2B. PROSPECTOS
        const { data: rawProspects, error: prErr } = await supabaseClient
            .from('crm_prospects')
            .select('id, name, phone')
            .eq('clinic_id', campaign.clinic_id)
            .neq('phone', '');

        const { data: prTags, error: prTErr } = await supabaseClient
            .from('crm_prospect_tags')
            .select('prospect_id, crm_tags!inner(name)');

        if (pErr) throw new Error("Pacientes - " + pErr.message);
        if (pTErr) throw new Error("TagsPacientes - " + pTErr.message);
        if (prErr) throw new Error("Prospectos - " + prErr.message);
        if (prTErr) throw new Error("TagsProspectos - " + prTErr.message);

        const incTags = (campaign.inclusion_tags || []).map((t: string) => t.trim().toLowerCase());
        const excTags = (campaign.exclusion_tags || []).map((t: string) => t.trim().toLowerCase());

        const unifiedMap = new Map();

        // Indexar tags por patient_id/prospect_id una sola vez
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
            const tgs = patientTagMap.get(p.id) || [];
            unifiedMap.set(phone, { id: p.id, full_name: p.name, phone, tags: tgs });
        });

        (rawProspects || []).forEach((pr: any) => {
            const phone = (pr.phone || '').replace(/\D/g, '');
            if (!phone || unifiedMap.has(phone)) return;
            const tgs = prospectTagMap.get(pr.id) || [];
            unifiedMap.set(phone, { id: pr.id, full_name: pr.name, phone, tags: tgs });
        });

        const targetContacts = Array.from(unifiedMap.values()).filter(c => {
            let pInc = incTags.length === 0 || incTags.some((i: string) => c.tags.includes(i));
            let pExc = excTags.length === 0 || !excTags.some((e: string) => c.tags.includes(e));
            return pInc && pExc;
        });

        if (!targetContacts || targetContacts.length === 0) {
            await supabaseClient.from('campaigns').update({ status: 'completed', sent_count: 0, total_target: 0 }).eq('id', campaign_id)
            return new Response(JSON.stringify({ success: true, sent: 0, total: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const ycloudKey = (campaign as any).clinic_settings?.ycloud_api_key
        const clinicName = (campaign as any).clinic_settings?.clinic_name || 'Citenly'
        const fromNumber = (campaign as any).clinic_settings?.ycloud_phone_number

        // Detectar variables reales de la plantilla
        const templatesRes = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', { headers: { 'X-API-Key': ycloudKey } })
        const templatesData = await templatesRes.json()
        const targetTemplate = (templatesData.items || []).find((t: any) => t.name === campaign.template_name)
        
        const bodyComponent = targetTemplate?.components?.find((c: any) => c.type === 'BODY')
        const numVars = (bodyComponent?.text?.match(/\{\{\d+\}\}/g) || []).length

        let sentCount = 0
        let fullError = ''

        // Optimización: Procesar en lotes para evitar timeouts y mejorar velocidad
        // Pero no demasiado grandes para no saturar la API o rate limits
        const BATCH_SIZE = 5;
        for (let i = 0; i < targetContacts.length; i += BATCH_SIZE) {
            const batch = targetContacts.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (contact) => {
                // LLENAR TODAS LAS VARIABLES (Crucial para evitar Error 400)
                const parameters = []
                for (let v = 1; v <= numVars; v++) {
                    let val = '-'
                    if (v === 1) val = contact.full_name || 'Paciente'
                    if (v === 5) val = clinicName
                    parameters.push({ type: 'text', text: val })
                }

                let phone = contact.phone
                if (!phone.startsWith('+')) phone = `+${phone}`

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
                                components: parameters.length > 0 ? [{ type: 'body', parameters }] : undefined
                            }
                        })
                    })

                    if (res.ok) {
                        sentCount++
                        
                        // 1. Insertar en entregas (para reporte)
                        await supabaseClient.from('campaign_deliveries').insert({
                            clinic_id: campaign.clinic_id,
                            campaign_id: campaign_id,
                            contact_name: contact.full_name,
                            contact_phone: phone,
                            status: 'sent'
                        })

                        // 2. Insertar en mensajes (para chat/CRM)
                        // Reconstruir el texto para previsualización en el chat
                        let renderedText = bodyComponent?.text || ''
                        parameters.forEach((p: any, idx: number) => {
                            renderedText = renderedText.replace(`{{${idx + 1}}}`, p.text)
                        })

                        await supabaseClient.from('messages').insert({
                            clinic_id: campaign.clinic_id,
                            phone_number: phone,
                            direction: 'outbound',
                            content: renderedText || `Template: ${campaign.template_name}`,
                            message_type: 'template',
                            campaign_id: campaign_id,
                            ycloud_status: 'sent',
                            ai_generated: true // Las campañas son automáticas
                        })

                    } else {
                        const errJson = await res.json()
                        const errStr = JSON.stringify(errJson)
                        fullError = errStr
                        console.error(`DEBUG: Error YCloud para ${phone}: ${errStr}`)
                        await supabaseClient.from('campaign_deliveries').insert({
                            clinic_id: campaign.clinic_id,
                            campaign_id: campaign_id,
                            contact_name: contact.full_name,
                            contact_phone: phone,
                            status: 'failed',
                            error_message: errStr
                        })
                    }
                } catch (e: any) {
                    console.error(`ERROR fatal en envío a ${phone}:`, e.message)
                }
            }));

            // Actualizar progreso parcialmente cada lote para que el usuario vea avance
            await supabaseClient.from('campaigns').update({
                sent_count: sentCount,
                total_target: targetContacts.length
            }).eq('id', campaign_id)
        }

        await supabaseClient.from('campaigns').update({
            status: 'completed',
            sent_count: sentCount,
            total_target: targetContacts.length,
            error_log: fullError || null
        }).eq('id', campaign_id)

        return new Response(JSON.stringify({ success: true, sent: sentCount, total: targetContacts.length }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })

    } catch (error: any) {
        console.error("CRITICAL ERROR:", error.message);
        if (campaign_id) {
            await supabaseClient.from('campaigns').update({ 
                status: 'failed', 
                error_log: error.message 
            }).eq('id', campaign_id)
        }
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})

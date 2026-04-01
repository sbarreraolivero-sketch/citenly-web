
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

        (rawPatients || []).forEach((p: any) => {
            const phone = (p.phone_number || '').replace(/\D/g, '');
            if (!phone) return;
            const tgs = (pTags || []).filter((pt: any) => pt.patient_id === p.id).map((pt: any) => pt.tags?.name?.trim().toLowerCase()).filter(Boolean);
            unifiedMap.set(phone, { id: p.id, full_name: p.name, phone, tags: tgs });
        });

        (rawProspects || []).forEach((pr: any) => {
            const phone = (pr.phone || '').replace(/\D/g, '');
            if (!phone || unifiedMap.has(phone)) return;
            const tgs = (prTags || []).filter((ct: any) => ct.prospect_id === pr.id).map((ct: any) => ct.crm_tags?.name?.trim().toLowerCase()).filter(Boolean);
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

        for (const contact of targetContacts) {
            // LLENAR TODAS LAS VARIABLES (Crucial para evitar Error 400)
            const parameters = []
            for (let i = 1; i <= numVars; i++) {
                let val = '-'
                if (i === 1) val = contact.full_name || 'Paciente'
                if (i === 5) val = clinicName
                parameters.push({ type: 'text', text: val })
            }

            let phone = contact.phone
            if (!phone.startsWith('+')) phone = `+${phone}`

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
            } else {
                const errJson = await res.json()
                fullError = JSON.stringify(errJson)
                console.error(`DEBUG: Error YCloud para ${phone}: ${fullError}`)
            }
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
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})


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
            .select('*, clinic_settings(clinic_name, ycloud_api_key)')
            .eq('id', campaign_id)
            .single()

        if (campaignError || !campaign) throw new Error('Campaña no encontrada')

        const { data: targetContacts, error: audienceError } = await supabaseClient.rpc('get_campaign_audience_contacts', {
            p_clinic_id: campaign.clinic_id,
            p_inclusion_tags: campaign.inclusion_tags || [],
            p_exclusion_tags: campaign.exclusion_tags || []
        })

        if (audienceError || !targetContacts || targetContacts.length === 0) {
            await supabaseClient.from('campaigns').update({ status: 'completed', sent_count: 0, total_target: 0 }).eq('id', campaign_id)
            return new Response(JSON.stringify({ success: true, sent: 0, total: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const ycloudKey = (campaign as any).clinic_settings?.ycloud_api_key
        const clinicName = (campaign as any).clinic_settings?.clinic_name || 'Citenly'

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

            let phone = contact.phone_number
            if (!phone.startsWith('+')) phone = `+${phone}`

            const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': ycloudKey },
                body: JSON.stringify({
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

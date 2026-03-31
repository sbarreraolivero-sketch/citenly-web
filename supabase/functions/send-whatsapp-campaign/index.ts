
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let campaign_id: string | null = null
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const body = await req.json()
        campaign_id = body.campaign_id

        if (!campaign_id) throw new Error('campaign_id is required')

        console.log(`[Campaign ${campaign_id}] Iniciando procesamiento...`)

        // 1. Fetch Campaign Details
        const { data: campaign, error: campaignError } = await supabaseClient
            .from('campaigns')
            .select(`
                *,
                clinic_settings(
                    clinic_name,
                    ycloud_api_key,
                    ycloud_phone_number
                )
            `)
            .eq('id', campaign_id)
            .single()

        if (campaignError) throw campaignError
        if (!campaign) throw new Error('Campaña no encontrada en la base de datos')

        console.log(`[Campaign ${campaign_id}] Datos cargados: ${campaign.name}`)

        // 2. Resolve Audience using optimized RPC
        // Aseguramos que los tags sean arrays de texto para el RPC
        const incTags = Array.isArray(campaign.inclusion_tags) ? campaign.inclusion_tags : []
        const excTags = Array.isArray(campaign.exclusion_tags) ? campaign.exclusion_tags : []

        console.log(`[Campaign ${campaign_id}] Resolviendo audiencia con tags:`, { incTags, excTags })
        
        const { data: targetContacts, error: audienceError } = await supabaseClient.rpc('get_campaign_audience_contacts', {
            p_clinic_id: campaign.clinic_id,
            p_inclusion_tags: incTags.length > 0 ? incTags : null,
            p_exclusion_tags: excTags.length > 0 ? excTags : null
        })

        if (audienceError) {
            console.error(`[Campaign ${campaign_id}] Error en RPC de audiencia:`, audienceError)
            throw new Error(`Error resolviendo audiencia: ${audienceError.message}`)
        }

        console.log(`[Campaign ${campaign_id}] Audiencia encontrada: ${targetContacts?.length || 0} contactos.`)

        if (!targetContacts || targetContacts.length === 0) {
            await supabaseClient.from('campaigns').update({ 
                status: 'completed', 
                sent_count: 0, 
                total_target: 0,
                error_log: 'No se encontraron contactos que coincidan con la segmentación'
            }).eq('id', campaign_id)
            return new Response(JSON.stringify({ success: true, processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const clinicName = (campaign as any).clinic_settings?.clinic_name || 'Nuestra Clínica'
        const ycloudKey = (campaign as any).clinic_settings?.ycloud_api_key
        if (!ycloudKey) throw new Error('No se encontró el API Key de YCloud para esta clínica')

        // 3. Fetch Template info from YCloud
        console.log(`[Campaign ${campaign_id}] Obteniendo plantilla ${campaign.template_name} de YCloud...`)
        const templatesRes = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', { headers: { 'X-API-Key': ycloudKey } })
        if (!templatesRes.ok) {
            const errBody = await templatesRes.text()
            throw new Error(`Error obteniendo plantillas de YCloud: ${errBody}`)
        }
        
        const templatesData = await templatesRes.json()
        const targetTemplate = (templatesData.items || []).find((t: any) => t.name === campaign.template_name)
        if (!targetTemplate) throw new Error(`La plantilla ${campaign.template_name} no existe en YCloud.`)

        const bodyComponent = targetTemplate.components?.find((c: any) => c.type === 'BODY')
        const numVariables = (bodyComponent?.text?.match(/\{\{\d+\}\}/g) || []).length

        let sentCount = 0
        let firstErrorMessage = ''

        // 4. Send Loop
        console.log(`[Campaign ${campaign_id}] Iniciando bucle de envío...`)
        for (const contact of targetContacts) {
            try {
                const parameters = []
                if (numVariables > 0) {
                    for (let i = 1; i <= numVariables; i++) {
                        let text = 'Información'
                        if (i === 1) {
                            const rawName = contact.full_name || ''
                            const isPhone = /^\+?\d+$/.test(rawName.replace(/[\s\-]/g, ''))
                            text = (!rawName || isPhone) ? 'Paciente' : rawName.split(' ')[0]
                        }
                        else if (i === 2) text = 'especialista'
                        else if (i === 3) text = 'próximamente'
                        else if (i === 4) text = 'tu próximo tratamiento'
                        else if (i === 5) text = clinicName
                        parameters.push({ type: 'text', text })
                    }
                }

                const payload = {
                    to: contact.phone_number,
                    type: 'template',
                    template: {
                        name: campaign.template_name,
                        language: { code: targetTemplate.language || 'es' },
                        components: parameters.length > 0 ? [{ type: 'body', parameters }] : undefined
                    }
                }

                const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': ycloudKey },
                    body: JSON.stringify(payload)
                })

                if (!res.ok) {
                    const errData = await res.json()
                    const msg = errData.message || res.statusText
                    console.error(`[Campaign ${campaign_id}] Error YCloud para ${contact.phone_number}:`, msg)
                    if (!firstErrorMessage) firstErrorMessage = msg
                } else {
                    const successData = await res.json()
                    await supabaseClient.from('messages').insert({
                        clinic_id: campaign.clinic_id,
                        phone_number: contact.phone_number,
                        direction: 'outbound',
                        content: `Campaña ${campaign.name}: ${campaign.template_name}`,
                        ycloud_message_id: successData.id,
                        ycloud_status: 'sent',
                        campaign_id: campaign.id
                    })
                    sentCount++
                }
            } catch (err: any) {
                console.error(`[Campaign ${campaign_id}] Excepción en contacto ${contact.id}:`, err)
                if (!firstErrorMessage) firstErrorMessage = err.message
            }
        }

        // 5. Final Updates
        console.log(`[Campaign ${campaign_id}] Finalizado. Enviados: ${sentCount}/${targetContacts.length}`)
        const updatePayload: any = {
            status: 'completed',
            sent_count: sentCount,
            total_target: targetContacts.length
        }
        
        if (firstErrorMessage) {
            updatePayload.error_log = `Error parcial: ${firstErrorMessage}`
        }

        const { error: finalUpdateError } = await supabaseClient.from('campaigns').update(updatePayload).eq('id', campaign_id)
        if (finalUpdateError) console.error(`[Campaign ${campaign_id}] Error actualizando estado final:`, finalUpdateError)

        return new Response(JSON.stringify({ 
            success: true, 
            sent: sentCount, 
            total: targetContacts.length, 
            error: firstErrorMessage || undefined 
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error: any) {
        console.error(`[Campaign ${campaign_id}] Error fatal:`, error)
        if (campaign_id) {
            try {
                await supabaseClient.from('campaigns').update({ status: 'failed', error_log: error.message }).eq('id', campaign_id)
            } catch (updateErr) {
                console.error(`[Campaign ${campaign_id}] No se pudo marcar como fallida:`, updateErr)
            }
        }
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})


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

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { campaign_id } = await req.json()

        if (!campaign_id) {
            throw new Error('campaign_id is required')
        }

        console.log(`Processing campaign: ${campaign_id}`)

        // 1. Fetch Campaign Details
        const { data: campaign, error: campaignError } = await supabaseClient
            .from('campaigns')
            .select(`
                *,
                clinic_settings(
                    ycloud_api_key,
                    ycloud_phone_number
                )
            `)
            .eq('id', campaign_id)
            .single()

        if (campaignError) throw campaignError
        if (!campaign) throw new Error('Campaign not found')

        // 2. Resolve Audience (Directly in JS for reliability across schema versions)
        // Fetch All Patients + Tags
        const [patientsRes, patientTagsRes, prospectsRes, prospectTagsRes, tagsRes, crmTagsRes] = await Promise.all([
            supabaseClient.from('patients').select('id, full_name, phone_number').eq('clinic_id', campaign.clinic_id),
            supabaseClient.from('patient_tags').select('patient_id, tag_id').eq('clinic_id', campaign.clinic_id),
            supabaseClient.from('crm_prospects').select('id, name, phone').eq('clinic_id', campaign.clinic_id),
            supabaseClient.from('crm_prospect_tags').select('prospect_id, tag_id'),
            supabaseClient.from('tags').select('id, name').eq('clinic_id', campaign.clinic_id),
            supabaseClient.from('crm_tags').select('id, name').eq('clinic_id', campaign.clinic_id)
        ])

        const tagMap = new Map<string, string>() // ID -> Name
        tagsRes.data?.forEach(t => tagMap.set(t.id, t.name.toLowerCase().trim()))
        crmTagsRes.data?.forEach(t => tagMap.set(t.id, t.name.toLowerCase().trim()))

        const pTagsMap = new Map<string, string[]>() // PatientID -> TagNames[]
        patientTagsRes.data?.forEach(pt => {
            const name = tagMap.get(pt.tag_id)
            if (name) {
                const list = pTagsMap.get(pt.patient_id) || []
                list.push(name)
                pTagsMap.set(pt.patient_id, list)
            }
        })
        prospectTagsRes.data?.forEach(pt => {
            const name = tagMap.get(pt.tag_id)
            if (name) {
                const list = pTagsMap.get(pt.prospect_id) || []
                list.push(name)
                pTagsMap.set(pt.prospect_id, list)
            }
        })

        const incTags = (campaign.inclusion_tags || []).map((t: string) => t.toLowerCase().trim())
        const excTags = (campaign.exclusion_tags || []).map((t: string) => t.toLowerCase().trim())

        const targetContacts: {id: string, name: string, phone: string}[] = []
        const seenPhones = new Set<string>()

        // Process Patients
        patientsRes.data?.forEach(p => {
            const phone = p.phone_number?.replace(/\D/g, '')
            if (!phone) return
            const tags = pTagsMap.get(p.id) || []
            
            const matchesInc = incTags.length === 0 || tags.some(t => incTags.includes(t))
            const matchesExc = excTags.length > 0 && tags.some(t => excTags.includes(t))

            if (matchesInc && !matchesExc) {
                targetContacts.push({ id: p.id, name: p.full_name, phone })
                seenPhones.add(phone)
            }
        })

        // Process Prospects (those not already in patients)
        prospectsRes.data?.forEach(pr => {
            const phone = pr.phone?.replace(/\D/g, '')
            if (!phone || seenPhones.has(phone)) return
            const tags = pTagsMap.get(pr.id) || []

            const matchesInc = incTags.length === 0 || tags.some(t => incTags.includes(t))
            const matchesExc = excTags.length > 0 && tags.some(t => excTags.includes(t))

            if (matchesInc && !matchesExc) {
                targetContacts.push({ id: pr.id, name: pr.name || pr.phone, phone })
                seenPhones.add(phone)
            }
        })

        console.log(`Filtered audience: ${targetContacts.length} contacts found.`)

        if (targetContacts.length === 0) {
            await supabaseClient.from('campaigns').update({ status: 'completed', sent_count: 0, total_target: 0 }).eq('id', campaign_id)
            return new Response(JSON.stringify({ success: true, processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const ycloudKey = (campaign as any).clinic_settings?.ycloud_api_key
        if (!ycloudKey) throw new Error('No YCloud API Key found for this clinic')

        // Fetch Template info
        const templatesRes = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', { headers: { 'X-API-Key': ycloudKey } })
        const templatesData = await templatesRes.json()
        const targetTemplate = (templatesData.items || []).find((t: any) => t.name === campaign.template_name)
        if (!targetTemplate) throw new Error(`Template ${campaign.template_name} not found in YCloud.`)

        const bodyComponent = targetTemplate.components?.find((c: any) => c.type === 'BODY')
        const numVariables = (bodyComponent?.text?.match(/\{\{\d+\}\}/g) || []).length

        let sentCount = 0
        const results = []

        // 3. Send Loop
        for (const contact of targetContacts) {
            try {
                const parameters = []
                if (numVariables > 0) {
                    for (let i = 1; i <= numVariables; i++) {
                        let text = 'Información'
                        if (i === 1) text = contact.name || 'Paciente'
                        else if (i === 2) text = 'Prueba'
                        parameters.push({ type: 'text', text })
                    }
                }

                const payload = {
                    to: contact.phone,
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
                    results.push({ id: contact.id, status: 'error', error: errData.message })
                } else {
                    const successData = await res.json()
                    await supabaseClient.from('messages').insert({
                        clinic_id: campaign.clinic_id,
                        phone_number: contact.phone,
                        direction: 'outbound',
                        content: `Campaña ${campaign.name}: ${campaign.template_name}`,
                        ycloud_message_id: successData.id,
                        ycloud_status: 'sent',
                        campaign_id: campaign.id
                    })
                    sentCount++
                    results.push({ id: contact.id, status: 'sent' })
                }
            } catch (err: any) {
                results.push({ id: contact.id, status: 'error', error: err.message })
            }
        }

        // 4. Final Updates
        await supabaseClient.from('campaigns').update({
            status: 'completed',
            sent_count: sentCount,
            total_target: targetContacts.length
        }).eq('id', campaign_id)

        return new Response(JSON.stringify({ success: true, sent: sentCount, total: targetContacts.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error: any) {
        console.error("Campaign failed fatal:", error)
        // Try to update status if we have the ID
        const body = await req.clone().json().catch(() => ({}))
        if (body.campaign_id) {
            const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
            await supabaseClient.from('campaigns').update({ status: 'failed' }).eq('id', body.campaign_id)
        }
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})

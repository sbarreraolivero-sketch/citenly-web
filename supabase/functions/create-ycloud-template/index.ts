
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
        const bodyPayload = await req.json()
        const { clinic_id, name, body_text, category = 'MARKETING', buttons = [] } = bodyPayload

        if (!clinic_id || !name || !body_text) {
            throw new Error('Clinic ID, Name, and Body Text are required')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get API Key
        const { data: settings, error } = await supabaseClient
            .from('clinic_settings')
            .select('ycloud_api_key')
            .eq('id', clinic_id)
            .single()

        if (error || !settings?.ycloud_api_key) {
            throw new Error('YCloud API Key not configured')
        }

        const apiKey = settings.ycloud_api_key

        // 2. Fetch WABA ID from APIs
        const wabaRes = await fetch('https://api.ycloud.com/v2/whatsapp/phoneNumbers', {
            method: 'GET',
            headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
        })
        const wabaData = await wabaRes.json()
        if (!wabaData?.items || wabaData.items.length === 0) {
            throw new Error('No WhatsApp numbers found for this account in YCloud. Please connect one first.')
        }
        const wabaId = wabaData.items[0].wabaId

        // 3. Prepare Template Structure
        // Name must be lowercase with underscores
        const formattedName = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

        const payload: any = {
            wabaId: wabaId,
            name: formattedName,
            language: 'es', // Default to Spanish
            category: category.toUpperCase(),
            components: [
                {
                    type: 'BODY',
                    text: body_text
                }
            ]
        }

        if (buttons && Array.isArray(buttons) && buttons.length > 0) {
            const validButtons = buttons.filter((b: string) => b.trim() !== '')
            if (validButtons.length > 0) {
                payload.components.push({
                    type: 'BUTTONS',
                    buttons: validButtons.map((b: string) => ({ type: 'QUICK_REPLY', text: b }))
                })
            }
        }

        // --- META APPROVAL FIX: Auto-inject examples for variables ---
        // Match all variables in the format {{1}}, {{2}}, etc.
        const variableMatches = body_text.match(/\{\{\d+\}\}/g)

        if (variableMatches && variableMatches.length > 0) {
            // Find the highest variable number (e.g., if {{3}} exists, we need 3 examples)
            const maxVar = Math.max(...variableMatches.map((m: string) => parseInt(m.replace(/[{}]/g, ''))))

            // Generate generic examples based on the amount needed
            const genericExamples = [
                "Juan Pérez",                 // {{1}} usually name
                "Clínica Estética",           // {{2}} usually clinic
                "Mañana a las 10:00",         // {{3}} usually time
                "Dr. López",                  // {{4}} usually doctor
                "https://ejemplo.com/pago"    // {{5}} usually link
            ]

            // Fill the array up to maxVar, repeating if necessary
            const exampleData = Array.from({ length: maxVar }).map((_, i) => genericExamples[i % genericExamples.length])

            // Inject into the payload
            payload.components[0].example = {
                body_text: [exampleData] // Note: YCloud expects a 2D array for body_text examples
            }
        }
        // -------------------------------------------------------------

        // 3. Make Request to YCloud
        const response = await fetch('https://api.ycloud.com/v2/whatsapp/templates', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('YCloud Error:', result)
            throw new Error(`YCloud Error: ${JSON.stringify(result)}`)
        }

        // 4. Return success
        return new Response(JSON.stringify({
            success: true,
            template: result, // YCloud returns the created template object
            formatted_name: formattedName
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})

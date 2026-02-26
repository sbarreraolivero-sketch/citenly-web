
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
        const { clinic_id } = await req.json()
        if (!clinic_id) throw new Error('Clinic ID required')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get API Key
        const { data: settings, error } = await supabaseClient
            .from('clinic_settings')
            .select('ycloud_api_key')
            .eq('id', clinic_id)
            .single()

        if (error || !settings?.ycloud_api_key) {
            // Check if user provided API key in request for testing? No, keep it secure.
            throw new Error('YCloud API Key not configured in Clinic Settings')
        }

        const apiKey = settings.ycloud_api_key

        // Call YCloud API
        // GET https://api.ycloud.com/v2/whatsapp/templates
        const response = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const err = await response.json()
            console.error('YCloud Error:', err)
            throw new Error(err.message || 'Error fetching templates from YCloud')
        }

        const result = await response.json()
        const templates = result.items || []

        // Filter valid templates and format
        const validTemplates = templates
            .map((t: any) => {
                // Find body text
                const bodyComponent = t.components.find((c: any) => c.type === 'BODY')
                return {
                    id: t.name, // Use name as ID for YCloud
                    name: t.name,
                    language: t.language,
                    status: t.status,
                    category: t.category,
                    body: bodyComponent ? bodyComponent.text : '(Sin texto)'
                }
            })

        return new Response(JSON.stringify({ templates: validTemplates }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})


import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const bodyPayload = await req.json().catch(() => ({}))
        const clinic_id = bodyPayload?.clinic_id
        if (!clinic_id) throw new Error('Clinic ID required')

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No authorization header')

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

        const authClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            { global: { headers: { Authorization: authHeader } } }
        )
        
        // Verify user session
        const { data: { user }, error: userError } = await authClient.auth.getUser()
        
        if (userError || !user) {
            console.error('Auth User Error:', userError)
            throw new Error('Unauthorized')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // AUTHZ: el usuario autenticado debe pertenecer a clinic_id (platform admin si es HQ).
        const HQ = '00000000-0000-0000-0000-000000000000'
        if (clinic_id === HQ) {
            const { data: _pa } = await supabaseClient.from('platform_admins').select('id').eq('id', user.id).maybeSingle()
            if (!_pa) throw new Error('Forbidden: no autorizado para HQ')
        } else {
            const { data: _mem } = await supabaseClient.from('clinic_members').select('clinic_id').eq('user_id', user.id).eq('clinic_id', clinic_id).maybeSingle()
            if (!_mem) throw new Error('Forbidden: sin acceso a esta clínica')
        }

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
        let apiResponse;
        try {
            apiResponse = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', {
                method: 'GET',
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json'
                }
            })
        } catch (fetchErr) {
            console.error('Network Error calling YCloud:', fetchErr)
            throw new Error(`Error de red al conectar con YCloud: ${fetchErr.message}`)
        }

        if (!apiResponse.ok) {
            let errorText = await apiResponse.text().catch(() => 'No error body')
            let errorData;
            try { 
                errorData = JSON.parse(errorText) 
            } catch { 
                errorData = { message: errorText } 
            }
            
            console.error('YCloud API Error Response:', {
                status: apiResponse.status,
                data: errorData
            })
            
            throw new Error(errorData.message || `YCloud API Error (${apiResponse.status})`)
        }

        const result = await apiResponse.json()
        const templates = result.items || []

        // Filter valid templates and format
        const validTemplates = templates
            .map((t: any) => {
                // Find body text
                const bodyComponent = t.components?.find((c: any) => c.type === 'BODY')
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
        console.error('Final Function Error:', error.message)
        return new Response(JSON.stringify({ 
            error: error.message, 
            isError: true,
            details: 'Error internal in get-ycloud-templates function'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})

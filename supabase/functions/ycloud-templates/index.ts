import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )

    // Authenticate User
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // Get User's Clinic
    const { data: clinicUser, error: cuError } = await supabaseClient
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .single()

    if (cuError || !clinicUser) throw new Error('Clinic not found')

    // Get Clinic YCloud Key (Using Service Role for secure access)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: clinicSettings, error: csError } = await adminClient
      .from('clinic_settings')
      .select('ycloud_api_key, ycloud_waba_id')
      .eq('id', clinicUser.clinic_id)
      .single()

    if (csError || !clinicSettings?.ycloud_api_key) {
      throw new Error('YCloud API Key not configured for this clinic')
    }

    const YCLOUD_KEY = clinicSettings.ycloud_api_key
    const YCLOUD_BASE = 'https://api.ycloud.com/v2/whatsapp/templates'

    // Route Request
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const templateName = pathParts[pathParts.length - 1] !== 'ycloud-templates' ? pathParts[pathParts.length - 1] : null

    if (req.method === 'GET') {
      const ycloudRes = await fetch(`${YCLOUD_BASE}?limit=100`, {
        headers: { 'X-API-Key': YCLOUD_KEY }
      })
      const data = await ycloudRes.json()
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    else if (req.method === 'POST') {
      const body = await req.json()
      // Ensure waba_id is injected if not present and available
      if (clinicSettings.ycloud_waba_id && !body.waba_id) {
        body.waba_id = clinicSettings.ycloud_waba_id
      }

      const ycloudRes = await fetch(YCLOUD_BASE, {
        method: 'POST',
        headers: {
          'X-API-Key': YCLOUD_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const data = await ycloudRes.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: ycloudRes.ok ? 200 : 400
      })
    }

    else if (req.method === 'DELETE') {
      if (!templateName) throw new Error('Template name required for deletion')

      const ycloudRes = await fetch(`${YCLOUD_BASE}/${templateName}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': YCLOUD_KEY }
      })
      const data = await ycloudRes.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: ycloudRes.ok ? 200 : 400
      })
    }

    else {
      throw new Error('Method not supported')
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

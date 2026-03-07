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

    // Route Request
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    let templateName = pathParts[pathParts.length - 1] !== 'ycloud-templates' ? pathParts[pathParts.length - 1] : null

    let clinic_id = url.searchParams.get('clinic_id')
    let bodyPayload: any = null

    if (req.method === 'POST' || req.method === 'DELETE') {
      try {
        bodyPayload = await req.json()
        if (bodyPayload?.clinic_id) clinic_id = bodyPayload.clinic_id
        if (bodyPayload?.name && !templateName) templateName = bodyPayload.name
      } catch (e) { }
    }

    if (!clinic_id) throw new Error('clinic_id is required')

    // Get Clinic YCloud Key (Using Service Role for secure access)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: clinicSettings, error: csError } = await adminClient
      .from('clinic_settings')
      .select('ycloud_api_key')
      .eq('id', clinic_id)
      .single()

    if (csError || !clinicSettings?.ycloud_api_key) {
      throw new Error(`YCloud API Key not configured for this clinic. Clinic ID: ${clinic_id}, DB Error: ${csError?.message || 'None'}, Settings found: ${!!clinicSettings}`)
    }

    const YCLOUD_KEY = clinicSettings.ycloud_api_key
    const YCLOUD_BASE = 'https://api.ycloud.com/v2/whatsapp/templates'

    if (req.method === 'GET') {
      const ycloudRes = await fetch(`${YCLOUD_BASE}?limit=100`, {
        headers: { 'X-API-Key': YCLOUD_KEY }
      })
      const data = await ycloudRes.json()
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    else if (req.method === 'POST') {
      const payload = bodyPayload || {}

      if (payload.action === 'delete') {
        if (!templateName) throw new Error('Template name required for deletion')
        const ycloudRes = await fetch(`${YCLOUD_BASE}/${templateName}`, {
          method: 'DELETE',
          headers: { 'X-API-Key': YCLOUD_KEY }
        })

        let data: any = {}
        const responseText = await ycloudRes.text()
        if (responseText) {
          try { data = JSON.parse(responseText) }
          catch { data = { message: responseText } }
        }

        if (!ycloudRes.ok) data.isError = true
        if (!ycloudRes.ok && data.message) data.error = data.message

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      // Removed waba_id injection as column does not exist

      const ycloudRes = await fetch(YCLOUD_BASE, {
        method: 'POST',
        headers: {
          'X-API-Key': YCLOUD_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      let data: any = {}
      const responseText = await ycloudRes.text()
      if (responseText) {
        try { data = JSON.parse(responseText) }
        catch { data = { message: responseText } }
      }

      if (!ycloudRes.ok) data.isError = true
      if (!ycloudRes.ok && data.message) data.error = data.message

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    else {
      throw new Error('Method not supported')
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error', isError: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})

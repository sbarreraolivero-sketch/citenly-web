import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Authenticate the caller using the JWT from the request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verify the user's JWT and get their clinic_id
        const userClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user }, error: authError } = await userClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const { to, message } = await req.json()
        if (!to || !message?.trim()) throw new Error('Faltan parámetros: to, message')

        // Fetch clinic settings — using clinic_id from the user's profile to prevent spoofing
        const { data: profile, error: profileError } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single()

        if (profileError || !profile?.clinic_id) throw new Error('Perfil de clínica no encontrado')

        const { data: clinic, error: clinicError } = await supabase
            .from('clinic_settings')
            .select('ycloud_api_key, ycloud_phone_number')
            .eq('id', profile.clinic_id)
            .single()

        if (clinicError || !clinic) throw new Error('Configuración de clínica no encontrada')
        if (!clinic.ycloud_api_key || !clinic.ycloud_phone_number) {
            throw new Error('Configura tu API Key y número de WhatsApp en Ajustes primero.')
        }

        // Send message via YCloud — API key stays server-side
        const ycloudRes = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': clinic.ycloud_api_key,
            },
            body: JSON.stringify({
                from: clinic.ycloud_phone_number,
                to,
                type: 'text',
                text: { body: message.trim() }
            })
        })

        const ycloudData = await ycloudRes.json()
        if (!ycloudRes.ok) {
            throw new Error(ycloudData?.message || `YCloud error: ${ycloudRes.status}`)
        }

        // Persist the outbound message
        const { error: insertError } = await supabase.from('messages').insert({
            clinic_id: profile.clinic_id,
            phone_number: to,
            direction: 'outbound',
            content: message.trim(),
            ai_generated: false,
            ycloud_message_id: ycloudData.id,
            ycloud_status: 'sent',
            campaign_id: null,
        })

        if (insertError) console.error('Error saving message to DB:', insertError)

        return new Response(JSON.stringify({ success: true, message_id: ycloudData.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('send-whatsapp-message error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

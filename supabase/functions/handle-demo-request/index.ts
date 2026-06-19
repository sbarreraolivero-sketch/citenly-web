import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const YCLOUD_API_KEY          = Deno.env.get('YCLOUD_API_KEY')
const DEMO_NOTIFY_PHONE       = Deno.env.get('DEMO_NOTIFY_PHONE')  // ej: "56912345678"

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { name, clinicName, email, phone, clinicType, challenge, goals, role, scheduledAt } = await req.json()

        if (!name || !phone || !scheduledAt) {
            return new Response(JSON.stringify({ error: 'Faltan campos requeridos.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // Combina desafío y metas en un solo campo (evita migración de schema)
        const needsText = [
            challenge ? `Desafío: ${challenge}` : '',
            goals     ? `Metas: ${goals}`       : '',
        ].filter(Boolean).join(' | ')

        // Insert con service role (bypass RLS)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const { error: dbError } = await supabase.from('demo_requests').insert({
            name,
            clinic_name:  clinicName || '',
            email:        email      || '',
            phone,
            clinic_type:  clinicType || '',
            needs:        needsText,
            role:         role       || '',
            scheduled_at: scheduledAt,
            status:       'pending',
        })

        if (dbError) {
            console.error('demo_requests insert error:', dbError)
            return new Response(JSON.stringify({ error: 'No pudimos registrar tu demo. Inténtalo de nuevo.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        // Notificación WhatsApp al equipo Citenly
        if (YCLOUD_API_KEY && DEMO_NOTIFY_PHONE) {
            const dateLabel = scheduledAt.replace('T', ' ').slice(0, 16).replace('-', '/').replace('-', '/')
            const msg = [
                '🗓️ *Nueva Demo Agendada — Citenly*',
                '',
                `👤 *${name}*${role ? ` — ${role}` : ''}`,
                `🏢 ${clinicName || 'Sin nombre'}${clinicType ? ` (${clinicType})` : ''}`,
                `📅 ${dateLabel} hrs`,
                `📱 ${phone}`,
                email ? `📧 ${email}` : '',
                '',
                challenge ? `❓ *Desafío:* ${challenge}` : '',
                goals     ? `🎯 *Metas:* ${goals}`      : '',
            ].filter(l => l !== null && l !== undefined).join('\n').trim()

            await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': YCLOUD_API_KEY,
                },
                body: JSON.stringify({
                    to:   DEMO_NOTIFY_PHONE,
                    type: 'text',
                    text: { body: msg },
                }),
            }).catch(err => console.error('YCloud notify error:', err))
            // Falla silenciosamente — no bloquear la respuesta al prospecto si el envío falla
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (err) {
        console.error('handle-demo-request error:', err)
        return new Response(JSON.stringify({ error: 'Error interno. Inténtalo de nuevo.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

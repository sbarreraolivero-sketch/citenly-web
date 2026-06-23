import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HQ_ID = '00000000-0000-0000-0000-000000000000'
const TEMPLATE = 'recordatorio_videollamada'
const TZ = 'America/Santiago'
const SKIP_STATUS = new Set(['cancelled', 'completed', 'no_show', 'lost'])

// --- Placeholders de la plantilla (idéntico a cron-process-reminders) ---
const templateParamCache = new Map<string, number[] | null>()
const getTemplatePlaceholders = async (apiKey: string, tplName: string): Promise<number[] | null> => {
    const cacheKey = `${apiKey}:${tplName}`
    if (templateParamCache.has(cacheKey)) return templateParamCache.get(cacheKey) ?? null
    try {
        const resp = await fetch('https://api.ycloud.com/v2/whatsapp/templates?limit=100', { headers: { 'X-API-Key': apiKey } })
        if (!resp.ok) throw new Error(`templates fetch ${resp.status}`)
        const json = await resp.json()
        const tpl = (json.items || []).find((t: any) => t.name === tplName)
        const body = tpl?.components?.find((c: any) => c.type === 'BODY')
        if (!body?.text) { templateParamCache.set(cacheKey, null); return null }
        const nums = [...new Set([...body.text.matchAll(/{{(\d+)}}/g)].map((m: any) => parseInt(m[1])))].sort((a, b) => a - b)
        templateParamCache.set(cacheKey, nums)
        return nums
    } catch (e) {
        console.error(`[getTemplatePlaceholders] ${tplName}:`, e)
        templateParamCache.set(cacheKey, null)
        return null
    }
}
const buildTemplateParams = async (apiKey: string, tplName: string, values: Record<number, string>) => {
    const placeholders = await getTemplatePlaceholders(apiKey, tplName)
    const nums = placeholders && placeholders.length > 0 ? placeholders : [1, 2, 3]
    return nums.map(n => ({ type: 'text', text: values[n] || '' }))
}

// --- Formato fecha/hora en Chile ---
const fmtDate = (d: Date) => new Intl.DateTimeFormat('es-CL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(d)
const fmtTime = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d)

const sendTemplate = async (apiKey: string, from: string, to: string, name: string, fecha: string, hora: string) => {
    const payload = {
        to, from, type: 'template',
        template: {
            name: TEMPLATE,
            language: { code: 'es' },
            // {{1}}=nombre, {{2}}=fecha, {{3}}=hora
            components: [{ type: 'body', parameters: await buildTemplateParams(apiKey, TEMPLATE, { 1: name, 2: fecha, 3: hora }) }],
        },
    }
    const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
}

// Ping al fundador (best-effort, texto libre — solo entrega si hay ventana de 24h abierta).
const sendText = async (apiKey: string, from: string, to: string, body: string) => {
    try {
        await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
            body: JSON.stringify({ to, from, type: 'text', text: { body } }),
        })
    } catch (e) { console.error('[founder ping]', e) }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    try {
        const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
        const notifyPhone = Deno.env.get('DEMO_NOTIFY_PHONE')

        const { data: hq } = await sb.from('clinic_settings').select('ycloud_api_key, ycloud_phone_number').eq('id', HQ_ID).single()
        const apiKey = (hq as any)?.ycloud_api_key
        const from = (hq as any)?.ycloud_phone_number
        if (!apiKey || !from) {
            return new Response(JSON.stringify({ error: 'HQ sin configuración de YCloud' }), { headers: corsHeaders })
        }

        const now = Date.now()
        const in25h = new Date(now + 25 * 3600000).toISOString()
        const { data: rows, error } = await sb.from('demo_requests')
            .select('id, name, phone, scheduled_at, status, reminder_24h_sent, reminder_2h_sent')
            .not('scheduled_at', 'is', null)
            .gt('scheduled_at', new Date(now).toISOString())
            .lt('scheduled_at', in25h)
        if (error) throw error

        let sent24 = 0, sent2 = 0
        for (const r of (rows || []) as any[]) {
            if (SKIP_STATUS.has((r.status || '').toLowerCase())) continue
            const sched = new Date(r.scheduled_at)
            if (isNaN(sched.getTime())) continue
            const diffH = (sched.getTime() - now) / 3600000
            if (diffH <= 0) continue
            const to = (r.phone || '').replace(/\D/g, '')
            if (!to) continue
            const fecha = fmtDate(sched)
            const hora = fmtTime(sched)

            // Recordatorio de 2h (también marca el de 24h para no enviarlo tarde)
            if (diffH <= 2 && !r.reminder_2h_sent) {
                const { ok, data } = await sendTemplate(apiKey, from, to, r.name || '', fecha, hora)
                if (ok) {
                    await sb.from('demo_requests').update({ reminder_2h_sent: true, reminder_24h_sent: true }).eq('id', r.id)
                    sent2++
                    if (notifyPhone) await sendText(apiKey, from, notifyPhone, `⏰ Recordatorio (2h) enviado a ${r.name || 'prospecto'} — videollamada hoy ${hora}. 📱 ${to}`)
                } else {
                    console.error('[2h] envío falló', r.id, JSON.stringify(data))
                }
                continue
            }
            // Recordatorio de 24h
            if (diffH <= 24 && diffH > 2 && !r.reminder_24h_sent) {
                const { ok, data } = await sendTemplate(apiKey, from, to, r.name || '', fecha, hora)
                if (ok) {
                    await sb.from('demo_requests').update({ reminder_24h_sent: true }).eq('id', r.id)
                    sent24++
                    if (notifyPhone) await sendText(apiKey, from, notifyPhone, `🗓️ Recordatorio (24h) enviado a ${r.name || 'prospecto'} — videollamada ${fecha} ${hora}. 📱 ${to}`)
                } else {
                    console.error('[24h] envío falló', r.id, JSON.stringify(data))
                }
            }
        }

        return new Response(JSON.stringify({ ok: true, sent24, sent2, candidates: (rows || []).length }), { headers: corsHeaders })
    } catch (e) {
        console.error('[cron-demo-reminders]', e)
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
    }
})

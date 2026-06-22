import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CRON_SECRET = Deno.env.get("CRON_SECRET") || ""

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Reject requests that don't carry the shared cron secret
  if (CRON_SECRET) {
    const incomingSecret = req.headers.get("x-cron-secret") || ""
    if (incomingSecret !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Citas con abono pendiente creadas hace más de 30 minutos.
    // El cupo se "guarda" 30 min mientras el cliente transfiere; si no llega comprobante, se libera.
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: expired, error: fetchError } = await supabase
      .from('appointments')
      .select('id, clinic_id, patient_name, service, appointment_date, created_at, phone_number')
      .eq('status', 'pending_deposit')
      .lt('created_at', cutoff)

    if (fetchError) throw fetchError

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ cancelled: 0, message: 'No hay citas con abono pendiente vencidas.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Red de seguridad: si el cliente envió una imagen (probable comprobante) después de
    // crear la cita, NO cancelar automáticamente — notificar a la clínica para verificación manual.
    const ids: string[] = []
    for (const appt of expired as Array<{ id: string; clinic_id: string; patient_name: string; phone_number?: string; created_at: string }>) {
      const phone = appt.phone_number
      let hasImage = false
      if (phone) {
        const { data: img } = await supabase
          .from('messages')
          .select('id')
          .eq('clinic_id', appt.clinic_id)
          .eq('phone_number', phone)
          .eq('direction', 'inbound')
          .eq('message_type', 'image')
          .gte('created_at', appt.created_at)
          .limit(1)
        hasImage = !!(img && img.length > 0)
      }

      if (hasImage) {
        await supabase.from('notifications').insert({
          clinic_id: appt.clinic_id,
          type: 'deposit_review',
          title: 'Comprobante sin verificar 💰',
          message: `${appt.patient_name} envió una imagen (posible comprobante) pero su cita sigue pendiente de abono. Verifica el pago y confirma o cancela manualmente.`,
          link: `/app/messages?phone=${phone}`
        })
        console.log(`[cron-cancel-pending-deposits] Cita ${appt.id} NO cancelada: hay imagen del cliente — notificada para revisión manual`)
        continue
      }

      ids.push(appt.id)
    }

    if (ids.length > 0) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .in('id', ids)

      if (updateError) throw updateError
    }

    console.log(`[cron-cancel-pending-deposits] Canceladas ${ids.length} citas sin abono:`, ids)

    return new Response(JSON.stringify({ cancelled: ids.length, ids }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('[cron-cancel-pending-deposits] Error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

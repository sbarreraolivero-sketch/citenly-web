import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Citas con abono pendiente creadas hace más de 2 horas
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data: expired, error: fetchError } = await supabase
      .from('appointments')
      .select('id, clinic_id, patient_name, service, appointment_date, created_at')
      .eq('status', 'pending_deposit')
      .lt('created_at', cutoff)

    if (fetchError) throw fetchError

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ cancelled: 0, message: 'No hay citas con abono pendiente vencidas.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ids = expired.map((a: { id: string }) => a.id)

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .in('id', ids)

    if (updateError) throw updateError

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

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

    const now = new Date().toISOString()

    // Buscar clínicas con créditos extra vencidos
    const { data: expired, error: fetchError } = await supabase
      .from('clinic_settings')
      .select('id, clinic_name, ai_credits_extra, ai_credits_extra_expires_at')
      .gt('ai_credits_extra', 0)
      .not('ai_credits_extra_expires_at', 'is', null)
      .lt('ai_credits_extra_expires_at', now)

    if (fetchError) throw fetchError

    console.log(`Clínicas con créditos extra vencidos: ${expired?.length ?? 0}`)

    let processed = 0
    for (const clinic of (expired || [])) {
      const { error: updateError } = await supabase
        .from('clinic_settings')
        .update({
          ai_credits_extra: 0,
          ai_credits_extra_balance: 0,
          ai_credits_extra_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinic.id)

      if (updateError) {
        console.error(`Error expirando créditos de ${clinic.clinic_name} (${clinic.id}):`, updateError)
        continue
      }

      // Registrar en ai_credit_transactions para transparencia
      await supabase.from('ai_credit_transactions').insert({
        clinic_id: clinic.id,
        type: 'adjustment',
        amount: -clinic.ai_credits_extra,
        balance_after: 0,
        description: `Expiración de créditos extra (30 días cumplidos)`,
        metadata: {
          expired_at: clinic.ai_credits_extra_expires_at,
          credits_expired: clinic.ai_credits_extra,
        },
      })

      console.log(`✓ ${clinic.clinic_name}: ${clinic.ai_credits_extra} créditos extra expirados`)
      processed++
    }

    return new Response(
      JSON.stringify({ ok: true, checked: expired?.length ?? 0, expired: processed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error en cron-expire-extra-credits:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

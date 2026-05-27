
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

    const today = new Date()
    const currentDay = today.getDate()
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

    console.log(`Ejecutando recarga mensual. Hoy: día ${currentDay}, último día del mes: ${lastDayOfMonth}`)

    const { data: clinics, error: fetchError } = await supabase
      .from('clinic_settings')
      .select('id, clinic_name, ai_credits_limit, ai_credits_used, ai_credits_extra, created_at')

    if (fetchError) throw fetchError

    const clinicsToRecharge = clinics.filter(c => {
      const createdDay = new Date(c.created_at).getDate()
      // Clínicas creadas el día 29, 30 o 31 se recargan el último día del mes
      // cuando ese día no existe en el mes actual
      if (createdDay > lastDayOfMonth) {
        return currentDay === lastDayOfMonth
      }
      return createdDay === currentDay
    })

    console.log(`Clínicas a recargar hoy: ${clinicsToRecharge.length}`)

    for (const clinic of clinicsToRecharge) {
      const monthlyAllowance = clinic.ai_credits_limit || 1000
      const previousUsed = clinic.ai_credits_used || 0
      const previousExtra = clinic.ai_credits_extra || 0

      // Corrección: resetear ai_credits_used a 0 para iniciar nuevo ciclo.
      // ai_credits_limit no cambia (es el cupo mensual del plan).
      // ai_credits_extra se mantiene (son créditos pagados que el usuario conserva).
      const { error: updateError } = await supabase
        .from('clinic_settings')
        .update({
          ai_credits_used: 0,
          ai_credits_monthly_mini_used: 0,
          ai_credits_monthly_4o_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinic.id)

      if (updateError) {
        console.error(`Error recargando clínica ${clinic.id}:`, updateError)
        continue
      }

      const { error: ledgerError } = await supabase
        .from('ai_credits_ledger')
        .insert({
          clinic_id: clinic.id,
          amount: monthlyAllowance,
          type: 'recharge',
          description: `Recarga Mensual Automática (Aniversario día ${new Date(clinic.created_at).getDate()})`,
          metadata: {
            previous_used: previousUsed,
            monthly_limit: monthlyAllowance,
            extra_preserved: previousExtra,
            reset_to_zero: true,
          }
        })

      if (ledgerError) console.error(`Error registrando ledger para ${clinic.id}:`, ledgerError)

      console.log(`Recarga exitosa para: ${clinic.clinic_name || clinic.id} (usado anterior: ${previousUsed})`)
    }

    return new Response(JSON.stringify({
      success: true,
      processed: clinicsToRecharge.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

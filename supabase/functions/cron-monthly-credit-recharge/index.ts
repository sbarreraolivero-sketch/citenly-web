import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    console.log(`Ejecutando recarga mensual para el día: ${currentDay}`)

    // 1. Buscar clínicas que cumplen mes hoy
    // Nota: Usamos una query que extraiga el día de created_at
    const { data: clinics, error: fetchError } = await supabase
      .from('clinic_settings')
      .select('id, name, ai_credits_limit, ai_credits_used, ai_credits_extra, created_at')
    
    if (fetchError) throw fetchError

    const clinicsToRecharge = clinics.filter(c => {
      const createdDate = new Date(c.created_at)
      return createdDate.getDate() === currentDay
    })

    console.log(`Clínicas a recargar hoy: ${clinicsToRecharge.length}`)

    for (const clinic of clinicsToRecharge) {
      const allowance = clinic.ai_credits_limit || 1000 // Valor por defecto si no tiene
      
      // Lógica: Remanente + Nuevo Cupo
      // En este sistema, lo más transparente es:
      // 1. Guardar lo que le sobraba (si ai_credits_used era menor que el limite)
      // 2. O simplemente sumar el nuevo allowance al ai_credits_limit existente
      
      const newLimit = (clinic.ai_credits_limit || 0) + allowance

      // Actualizar clínica
      const { error: updateError } = await supabase
        .from('clinic_settings')
        .update({ 
          ai_credits_limit: newLimit,
          // Opcional: Podríamos resetear el used si prefieres esa lógica, 
          // pero el usuario pidió "sumar remanente", lo cual implica aumentar el techo.
        })
        .eq('id', clinic.id)

      if (updateError) {
        console.error(`Error recargando clínica ${clinic.id}:`, updateError)
        continue
      }

      // 2. Registrar en el Ledger (Historial) para transparencia
      const { error: ledgerError } = await supabase
        .from('ai_credits_ledger')
        .insert({
          clinic_id: clinic.id,
          amount: allowance,
          type: 'recharge',
          description: `Recarga Mensual Automática (Aniversario día ${currentDay})`,
          metadata: {
            previous_limit: clinic.ai_credits_limit,
            new_limit: newLimit,
            remanente_preservado: true
          }
        })

      if (ledgerError) console.error(`Error registrando ledger para ${clinic.id}:`, ledgerError)
      
      console.log(`Recarga exitosa para: ${clinic.name || clinic.id}`)
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

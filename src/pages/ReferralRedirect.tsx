import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { Loader2, MessageCircle } from 'lucide-react'

// Create a totally isolated client for public redirect to avoid Auth Lock conflicts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
})

export default function ReferralRedirect() {
    const { code } = useParams<{ code: string }>()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const hasRun = useRef(false)

    useEffect(() => {
        if (code && !hasRun.current) {
            hasRun.current = true
            handleRedirect()
        }
    }, [code])

    const handleRedirect = async () => {
        try {
            const cleanCode = code?.trim().toUpperCase() || ''
            
            // 1. Get patient and clinic info from the referral code
            const { data: patient, error: patientError } = await publicSupabase
                .from('patients')
                .select('name, clinic_id')
                .eq('referral_code', cleanCode)
                .maybeSingle()

            if (patientError) {
                console.error('Patient lookup error:', patientError)
                setError(`Error en la búsqueda: ${patientError.message}`)
                setLoading(false)
                return
            }

            if (!patient) {
                setError('Código de referido no válido')
                setLoading(false)
                return
            }

            // 2. Get clinic's WhatsApp number
            const { data: clinic, error: clinicError } = await publicSupabase
                .from('clinic_settings')
                .select('ycloud_phone_number, clinic_name')
                .eq('id', (patient as any).clinic_id)
                .maybeSingle()

            if (clinicError || !clinic || !(clinic as any).ycloud_phone_number) {
                setError('La clínica no tiene WhatsApp configurado')
                setLoading(false)
                return
            }

            // 3. Construct WhatsApp URL
            const clinicData = clinic as any
            const patientData = patient as any
            const cleanPhone = clinicData.ycloud_phone_number.replace(/\D/g, '')
            const message = `¡Hola! Vengo de parte de ${patientData.name} con el código de referido: ${code}. Me gustaría agendar una cita en ${clinicData.clinic_name}.`
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`

            // 4. Redirect
            window.location.href = waUrl
        } catch (err) {
            console.error('Referral error:', err)
            setError('Error al procesar el referido')
            setLoading(false)
        }
    }

    if (error) {
        return (
            <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                    <MessageCircle className="w-8 h-8" />
                </div>
                <h1 className="text-xl font-bold text-charcoal mb-2">Ups! Algo salió mal</h1>
                <p className="text-charcoal/60 mb-6">{error}</p>
                <a href="/" className="btn-primary px-6 py-2">Volver al inicio</a>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
            {loading && (
                <>
                    <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
                    <h1 className="text-xl font-bold text-charcoal mb-2">Validando referido...</h1>
                    <p className="text-charcoal/60">Te estamos redirigiendo al WhatsApp de la clínica</p>
                    <div className="mt-8 p-4 bg-white rounded-softer border border-silk-beige shadow-sm animate-pulse">
                        <p className="text-xs font-bold text-primary-700 uppercase tracking-widest">Código detectado</p>
                        <p className="text-2xl font-mono font-bold text-charcoal mt-1 tracking-tighter">{code}</p>
                    </div>
                </>
            )}
        </div>
    )
}

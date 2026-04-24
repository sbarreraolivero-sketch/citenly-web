import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Zap, ArrowRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export function CreditWarningBanner() {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const [isVisible, setIsVisible] = useState(true)
    const [warning, setWarning] = useState<{
        model: 'mini' | '4o';
        percentage: number;
        limit: number;
        used: number;
    } | null>(null)

    useEffect(() => {
        const checkUsage = async () => {
            if (!profile?.clinic_id) return

            try {
                // Fetch settings with unified credits
                const { data: settings } = await (supabase as any)
                    .from('clinic_settings')
                    .select('ai_credits_used, ai_credits_limit, ai_credits_extra')
                    .eq('id', profile.clinic_id)
                    .single()

                if (!settings) return

                const totalLimit = (settings.ai_credits_limit || 500) + (settings.ai_credits_extra || 0)
                const used = settings.ai_credits_used || 0
                const pct = used / totalLimit

                if (pct >= 0.9) {
                    setWarning({ model: 'mini', percentage: Math.round(pct * 100), limit: totalLimit, used: used })
                } else {
                    setWarning(null)
                }
            } catch (err) {
                console.error('Error checking credits for banner:', err)
            }
        }

        checkUsage()
        // Check every 5 minutes
        const interval = setInterval(checkUsage, 300000)
        return () => clearInterval(interval)
    }, [profile?.clinic_id])

    if (!isVisible || !warning) return null

    const isExhausted = warning.used >= warning.limit
    
    return (
        <div className={cn(
            "sticky top-0 z-[60] w-full border-b backdrop-blur-md animate-slide-down",
            isExhausted ? "bg-rose-600/95 border-rose-400 text-white" : "bg-amber-500/95 border-amber-400 text-white"
        )}>
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        {isExhausted ? <AlertTriangle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className="text-sm font-bold leading-tight">
                            {isExhausted 
                                ? `¡Citenly Credits agotados!`
                                : `Atención: Quedan pocos Citenly Credits`
                            }
                        </p>
                        <p className="text-[11px] opacity-90 leading-tight">
                            {isExhausted 
                                ? "La IA ha dejado de responder automáticamente en WhatsApp. Recarga para restaurar el servicio." 
                                : "Tu saldo de inteligencia artificial está por agotarse. Evita interrupciones recargando ahora."
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/app/settings?tab=ai')}
                        className="bg-white text-charcoal px-4 py-1.5 rounded-full text-xs font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg"
                    >
                        Recargar Créditos
                        <ArrowRight className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

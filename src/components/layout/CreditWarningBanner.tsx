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
                // Fetch settings
                const { data: settings } = await (supabase as any)
                    .from('clinic_settings')
                    .select('ai_credits_monthly_limit, ai_credits_extra_balance, ai_credits_monthly_4o_limit, ai_credits_extra_4o, ai_active_model')
                    .eq('id', profile.clinic_id)
                    .single()

                if (!settings) return

                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

                // Fetch Mini Usage
                const { count: usageMini } = await (supabase as any)
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('clinic_id', profile.clinic_id)
                    .eq('ai_generated', true)
                    .or('ai_model.eq.mini,ai_model.is.null')
                    .gte('created_at', startOfMonth)

                // Fetch 4o Usage
                const { count: usage4o } = await (supabase as any)
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('clinic_id', profile.clinic_id)
                    .eq('ai_generated', true)
                    .eq('ai_model', '4o')
                    .gte('created_at', startOfMonth)

                const miniLimit = (settings.ai_credits_monthly_limit || 500) + (settings.ai_credits_extra_balance || 0)
                const limit4o = (settings.ai_credits_monthly_4o_limit || 100) + (settings.ai_credits_extra_4o || 0)

                const miniPct = (usageMini || 0) / miniLimit
                const pct4o = (usage4o || 0) / limit4o

                // Priority to 4o if both are critical
                if (pct4o >= 0.9) {
                    setWarning({ model: '4o', percentage: Math.round(pct4o * 100), limit: limit4o, used: usage4o || 0 })
                } else if (miniPct >= 0.9) {
                    setWarning({ model: 'mini', percentage: Math.round(miniPct * 100), limit: miniLimit, used: usageMini || 0 })
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
            warning.model === '4o' 
                ? "bg-violet-600/95 border-violet-400 text-white" 
                : "bg-amber-500/95 border-amber-400 text-white"
        )}>
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        {warning.model === '4o' ? <Zap className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className="text-sm font-bold leading-tight">
                            {isExhausted 
                                ? `¡Créditos ${warning.model === '4o' ? 'Premium (4o)' : 'Estándar (mini)'} agotados!`
                                : `Atención: Quedan pocos créditos ${warning.model === '4o' ? 'Premium (4o)' : 'Estándar (mini)'}`
                            }
                        </p>
                        <p className="text-[11px] opacity-90 leading-tight">
                            {warning.model === '4o' 
                                ? "Al agotarse, el sistema bajará automáticamente a GPT-4o-mini para no interrumpir el servicio." 
                                : "Al agotarse, la IA dejará de responder automáticamente en WhatsApp."
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

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
    SlidersHorizontal, Sparkles, Zap, RefreshCw, Cpu, Save, Loader2,
    CreditCard, Check, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { CREDIT_PACKS, redirectToCreditsCheckout } from '@/lib/mercadopago'
import { LS_CREDIT_PACKS, redirectToLemonCreditsCheckout } from '@/lib/lemonsqueezy'

export default function AISettings() {
    const { profile, user } = useAuth()

    const [aiAutoRespond, setAiAutoRespond] = useState(true)
    const [aiActiveModel, setAiActiveModel] = useState<'hybrid' | 'mini' | 'pro'>('hybrid')
    const [savingModel, setSavingModel] = useState(false)

    const [aiCreditsMonthlyLimit, setAiCreditsMonthlyLimit] = useState(500)
    const [aiCreditsExtraBalance, setAiCreditsExtraBalance] = useState(0)
    const [aiMessagesUsed, setAiMessagesUsed] = useState(0)
    const [aiMessagesUsedStandard, setAiMessagesUsedStandard] = useState(0)
    const [aiMessagesUsedPro, setAiMessagesUsedPro] = useState(0)

    const [paymentRegion, setPaymentRegion] = useState<'chile' | 'international'>('chile')
    const [selectedAiModel, setSelectedAiModel] = useState<'mini' | '4o'>('mini')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!profile?.clinic_id) return
        const load = async () => {
            setIsLoading(true)
            try {
                const { data: cs } = await (supabase as any)
                    .from('clinic_settings')
                    .select('ai_active_model,ai_auto_respond,ai_credits_limit,ai_credits_extra,payment_provider')
                    .eq('id', profile.clinic_id)
                    .single()

                if (cs) {
                    setAiActiveModel(cs.ai_active_model || 'hybrid')
                    setAiAutoRespond(cs.ai_auto_respond !== false)
                    setPaymentRegion(cs.payment_provider === 'lemonsqueezy' ? 'international' : 'chile')
                    setAiCreditsMonthlyLimit(cs.ai_credits_limit || 500)
                    setAiCreditsExtraBalance(cs.ai_credits_extra || 0)
                }

                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
                const [{ count: cStd }, { count: cPro }, { count: cMini }] = await Promise.all([
                    (supabase as any).from('messages').select('*', { count: 'exact', head: true }).eq('clinic_id', profile.clinic_id).eq('ai_generated', true).eq('ai_model', '4o_standard').gte('created_at', startOfMonth),
                    (supabase as any).from('messages').select('*', { count: 'exact', head: true }).eq('clinic_id', profile.clinic_id).eq('ai_generated', true).eq('ai_model', '4o_pro').gte('created_at', startOfMonth),
                    (supabase as any).from('messages').select('*', { count: 'exact', head: true }).eq('clinic_id', profile.clinic_id).eq('ai_generated', true).or('ai_model.eq.mini,ai_model.is.null').gte('created_at', startOfMonth),
                ])
                setAiMessagesUsedStandard(cStd || 0)
                setAiMessagesUsedPro(cPro || 0)
                setAiMessagesUsed(cMini || 0)
            } catch (err) {
                console.error('Error loading AI settings:', err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [profile?.clinic_id])

    const handleSaveAI = async () => {
        if (!profile?.clinic_id) return
        setSavingModel(true)
        try {
            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({ ai_active_model: aiActiveModel, ai_auto_respond: aiAutoRespond, updated_at: new Date().toISOString() })
                .eq('id', profile.clinic_id)
            if (error) throw error
            toast.success('Configuración de IA guardada')
            setSelectedAiModel(aiActiveModel === 'pro' ? '4o' : 'mini')
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message)
        } finally {
            setSavingModel(false)
        }
    }

    const handleBuyCredits = async (packId: string) => {
        if (!profile?.clinic_id || !user?.email) return
        try {
            if (paymentRegion === 'international') {
                await redirectToLemonCreditsCheckout(profile.clinic_id, user.email, packId, selectedAiModel)
            } else {
                await redirectToCreditsCheckout(profile.clinic_id, user.email, packId, selectedAiModel)
            }
        } catch (error: any) {
            alert(error.message || 'Error al procesar el pago.')
        }
    }

    const totalCredits = aiCreditsMonthlyLimit + aiCreditsExtraBalance
    const totalUsed = aiMessagesUsed + (aiMessagesUsedStandard * 8) + (aiMessagesUsedPro * 60)
    const usagePct = Math.min(100, (totalUsed / (totalCredits || 1)) * 100)

    const currentPacks = paymentRegion === 'international' ? LS_CREDIT_PACKS : CREDIT_PACKS
    const currencySymbol = paymentRegion === 'international' ? 'US$' : '$'

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#FF2E88]/70 mb-1">Agente IA</p>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <SlidersHorizontal className="w-6 h-6 text-[#FF2E88]" />
                        Ajustes de IA
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Motor de ruteo inteligente, créditos y comportamiento del agente.</p>
                </div>
                <button
                    onClick={handleSaveAI}
                    disabled={savingModel || isLoading}
                    className="flex items-center gap-2 bg-[#FF2E88] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#e0007a] transition-colors disabled:opacity-50"
                >
                    {savingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                </button>
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#FF2E88]" /></div>
            ) : (
                <>
                    {/* Estado del agente */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn('w-2.5 h-2.5 rounded-full', aiAutoRespond ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
                            <div>
                                <p className="text-sm font-bold text-white">Agente IA {aiAutoRespond ? 'activo' : 'en pausa'}</p>
                                <p className="text-xs text-gray-500">
                                    {aiAutoRespond ? 'Responde automáticamente a los mensajes de WhatsApp' : 'El agente no responderá hasta que lo reactives'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={aiAutoRespond} onChange={(e) => setAiAutoRespond(e.target.checked)} />
                            <div className="w-12 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#FF2E88] after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                        </label>
                    </div>

                    {/* Selector de modelo */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-[#FF2E88]" />
                            <div>
                                <h2 className="text-base font-bold text-white">Motor de IA</h2>
                                <p className="text-xs text-gray-500">Selecciona cómo el agente usa los modelos de lenguaje</p>
                            </div>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Mini */}
                            <button
                                onClick={() => setAiActiveModel('mini')}
                                className={cn(
                                    'flex flex-col p-4 rounded-xl border-2 transition-all text-left',
                                    aiActiveModel === 'mini'
                                        ? 'bg-emerald-500/10 border-emerald-500/40'
                                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                )}
                            >
                                <div className={cn('w-10 h-10 rounded-xl mb-3 flex items-center justify-center', aiActiveModel === 'mini' ? 'bg-emerald-500' : 'bg-white/10')}>
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">Ahorro Máximo</h3>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">GPT-4o Mini</p>
                                <p className="text-xs text-gray-500">Ideal para agendamientos simples. Más créditos por el mismo precio.</p>
                                {aiActiveModel === 'mini' && (
                                    <div className="mt-3 py-1 px-2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase text-center">✓ Activo</div>
                                )}
                            </button>

                            {/* Hybrid */}
                            <button
                                onClick={() => setAiActiveModel('hybrid')}
                                className={cn(
                                    'flex flex-col p-4 rounded-xl border-2 transition-all text-left relative',
                                    aiActiveModel === 'hybrid'
                                        ? 'bg-[#FF2E88]/10 border-[#FF2E88]/40'
                                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                )}
                            >
                                {aiActiveModel !== 'hybrid' && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FF2E88] text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">Recomendado</div>
                                )}
                                <div className={cn('w-10 h-10 rounded-xl mb-3 flex items-center justify-center', aiActiveModel === 'hybrid' ? 'bg-[#FF2E88]' : 'bg-white/10')}>
                                    <RefreshCw className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">Híbrido Automático</h3>
                                <p className="text-[10px] font-bold text-[#FF2E88] uppercase tracking-widest mb-2">IA Router</p>
                                <p className="text-xs text-gray-500">Elige el modelo ideal según la complejidad del mensaje.</p>
                                {aiActiveModel === 'hybrid' && (
                                    <div className="mt-3 py-1 px-2 rounded-full bg-[#FF2E88]/20 text-[#FF2E88] text-[10px] font-black uppercase text-center">✓ Activo</div>
                                )}
                            </button>

                            {/* Pro */}
                            <button
                                onClick={() => setAiActiveModel('pro')}
                                className={cn(
                                    'flex flex-col p-4 rounded-xl border-2 transition-all text-left',
                                    aiActiveModel === 'pro'
                                        ? 'bg-purple-500/10 border-purple-500/40'
                                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                )}
                            >
                                <div className={cn('w-10 h-10 rounded-xl mb-3 flex items-center justify-center', aiActiveModel === 'pro' ? 'bg-purple-500' : 'bg-white/10')}>
                                    <Cpu className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">Máximo Poder</h3>
                                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">GPT-4o Exclusivo</p>
                                <p className="text-xs text-gray-500">GPT-4o completo para casos complejos y alta precisión.</p>
                                {aiActiveModel === 'pro' && (
                                    <div className="mt-3 py-1 px-2 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase text-center">✓ Activo</div>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Uso de créditos */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-[#FF2E88]" />
                            <div>
                                <h2 className="text-base font-bold text-white">Créditos de IA</h2>
                                <p className="text-xs text-gray-500">Uso del ciclo actual</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-end justify-between mb-1">
                                <span className="text-sm text-gray-400">{totalUsed.toLocaleString()} / {totalCredits.toLocaleString()} créditos usados</span>
                                <span className={cn('text-sm font-bold', usagePct >= 90 ? 'text-red-400' : usagePct >= 70 ? 'text-amber-400' : 'text-emerald-400')}>
                                    {usagePct.toFixed(0)}%
                                </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={cn('h-full rounded-full transition-all', usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                                    style={{ width: `${usagePct}%` }}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                                    <p className="text-xs text-gray-600 mb-1">Mini (×1)</p>
                                    <p className="text-lg font-bold text-white">{aiMessagesUsed}</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                                    <p className="text-xs text-gray-600 mb-1">Standard (×8)</p>
                                    <p className="text-lg font-bold text-white">{aiMessagesUsedStandard}</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                                    <p className="text-xs text-gray-600 mb-1">Pro (×60)</p>
                                    <p className="text-lg font-bold text-white">{aiMessagesUsedPro}</p>
                                </div>
                            </div>

                            {aiCreditsExtraBalance > 0 && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                                    <Check className="w-3.5 h-3.5" />
                                    {aiCreditsExtraBalance.toLocaleString()} créditos extra disponibles
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Packs de créditos */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Info className="w-5 h-5 text-[#FF2E88]" />
                                <h2 className="text-base font-bold text-white">Comprar Créditos Extra</h2>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPaymentRegion('chile')}
                                    className={cn('text-xs font-bold px-3 py-1.5 rounded-lg border transition-all', paymentRegion === 'chile' ? 'bg-[#FF2E88]/20 border-[#FF2E88]/40 text-[#FF2E88]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white')}
                                >CLP</button>
                                <button
                                    onClick={() => setPaymentRegion('international')}
                                    className={cn('text-xs font-bold px-3 py-1.5 rounded-lg border transition-all', paymentRegion === 'international' ? 'bg-[#FF2E88]/20 border-[#FF2E88]/40 text-[#FF2E88]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white')}
                                >USD</button>
                            </div>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(currentPacks).map(([packId, pack]: [string, any]) => (
                                <button
                                    key={packId}
                                    onClick={() => handleBuyCredits(packId)}
                                    className="flex flex-col items-start p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-[#FF2E88]/40 hover:bg-[#FF2E88]/5 transition-all text-left group"
                                >
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-1">{pack.credits?.toLocaleString() || '—'} créditos</p>
                                    <p className="text-xl font-bold text-white mb-1">{currencySymbol}{(pack.price || pack.priceCLP || 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-600">{pack.label || packId}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

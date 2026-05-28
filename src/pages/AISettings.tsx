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
    const [aiCreditsExtraExpiresAt, setAiCreditsExtraExpiresAt] = useState<string | null>(null)
    const [aiCreditsUsed, setAiCreditsUsed] = useState(0)
    const [aiCreditsUnlimited, setAiCreditsUnlimited] = useState(false)

    const [tierBreakdown, setTierBreakdown] = useState({ t1: 0, t2: 0, t3: 0 })

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
                    .select('ai_active_model,ai_auto_respond,ai_credits_limit,ai_credits_extra,ai_credits_extra_expires_at,ai_credits_used,ai_credits_unlimited,payment_provider')
                    .eq('id', profile.clinic_id)
                    .single()

                if (cs) {
                    setAiActiveModel(cs.ai_active_model || 'hybrid')
                    setAiAutoRespond(cs.ai_auto_respond !== false)
                    setPaymentRegion(cs.payment_provider === 'lemonsqueezy' ? 'international' : 'chile')
                    setAiCreditsMonthlyLimit(cs.ai_credits_limit || 500)
                    setAiCreditsExtraBalance(cs.ai_credits_extra || 0)
                    setAiCreditsExtraExpiresAt(cs.ai_credits_extra_expires_at || null)
                    setAiCreditsUsed(cs.ai_credits_used || 0)
                    setAiCreditsUnlimited(cs.ai_credits_unlimited || false)

                    // Inicio del ciclo: primer día del mes actual en UTC
                    const now = new Date()
                    const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

                    const { data: txs } = await (supabase as any)
                        .from('ai_credit_transactions')
                        .select('metadata')
                        .eq('clinic_id', profile.clinic_id)
                        .eq('type', 'usage')
                        .gte('created_at', cycleStart.toISOString())

                    if (txs) {
                        const counts = { t1: 0, t2: 0, t3: 0 }
                        for (const tx of txs) {
                            const tier = tx.metadata?.tier
                            if (tier === 1) counts.t1++
                            else if (tier === 2) counts.t2++
                            else if (tier === 3) counts.t3++
                        }
                        setTierBreakdown(counts)
                    }
                }
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
    // Para unlimited: usar el total calculado desde transacciones (más preciso que ai_credits_used congelado)
    const tierTotal = tierBreakdown.t1 * 1 + tierBreakdown.t2 * 8 + tierBreakdown.t3 * 60
    const totalUsed = aiCreditsUnlimited ? tierTotal : aiCreditsUsed
    const creditsAvailable = Math.max(0, totalCredits - totalUsed)
    const usagePct = Math.min(100, (totalUsed / (totalCredits || 1)) * 100)

    const currentPacks = paymentRegion === 'international' ? LS_CREDIT_PACKS : CREDIT_PACKS
    const currencySymbol = paymentRegion === 'international' ? 'US$' : '$'

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* Banner — Agente IA (sky) */}
            <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-2xl overflow-hidden shadow-soft-md">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-widest text-sky-200 mb-2">Agente IA</p>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Ajustes de IA</h1>
                            <p className="text-sm text-sky-100/80 font-light mt-1">Motor de ruteo inteligente, créditos y comportamiento del agente.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSaveAI}
                                disabled={savingModel || isLoading}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 border border-white/20"
                            >
                                {savingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar
                            </button>
                            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center shrink-0">
                                <SlidersHorizontal className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
            ) : (
                <>
                    {/* Estado del agente */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn('w-2.5 h-2.5 rounded-full', aiAutoRespond ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400')} />
                            <div>
                                <p className="text-sm font-bold text-gray-900">Agente IA {aiAutoRespond ? 'activo' : 'en pausa'}</p>
                                <p className="text-xs text-gray-500">
                                    {aiAutoRespond ? 'Responde automáticamente a los mensajes de WhatsApp' : 'El agente no responderá hasta que lo reactives'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={aiAutoRespond} onChange={(e) => setAiAutoRespond(e.target.checked)} />
                            <div className="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#FF2E88] after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                        </label>
                    </div>

                    {/* Selector de modelo */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-[#FF2E88]" />
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Motor de IA</h2>
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
                                        ? 'bg-emerald-50 border-emerald-400'
                                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                )}
                            >
                                <div className={cn('w-10 h-10 rounded-xl mb-3 flex items-center justify-center', aiActiveModel === 'mini' ? 'bg-emerald-500' : 'bg-gray-200')}>
                                    <Zap className={cn('w-5 h-5', aiActiveModel === 'mini' ? 'text-white' : 'text-gray-500')} />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Ahorro Máximo</h3>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">GPT-4o Mini</p>
                                <p className="text-xs text-gray-500">Ideal para agendamientos simples. Más créditos por el mismo precio.</p>
                                {aiActiveModel === 'mini' && (
                                    <div className="mt-3 py-1 px-2 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase text-center">✓ Activo</div>
                                )}
                            </button>

                            {/* Hybrid */}
                            <button
                                onClick={() => setAiActiveModel('hybrid')}
                                className={cn(
                                    'flex flex-col p-4 rounded-xl border-2 transition-all text-left relative',
                                    aiActiveModel === 'hybrid'
                                        ? 'bg-pink-50 border-[#FF2E88]/50'
                                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                )}
                            >
                                {aiActiveModel !== 'hybrid' && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FF2E88] text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">Recomendado</div>
                                )}
                                <div className={cn('w-10 h-10 rounded-xl mb-3 flex items-center justify-center', aiActiveModel === 'hybrid' ? 'bg-[#FF2E88]' : 'bg-gray-200')}>
                                    <RefreshCw className={cn('w-5 h-5', aiActiveModel === 'hybrid' ? 'text-white' : 'text-gray-500')} />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Híbrido Automático</h3>
                                <p className="text-[10px] font-bold text-[#FF2E88] uppercase tracking-widest mb-2">IA Router</p>
                                <p className="text-xs text-gray-500">Elige el modelo ideal según la complejidad del mensaje.</p>
                                {aiActiveModel === 'hybrid' && (
                                    <div className="mt-3 py-1 px-2 rounded-full bg-pink-100 text-[#FF2E88] text-[10px] font-black uppercase text-center">✓ Activo</div>
                                )}
                            </button>

                            {/* Pro */}
                            <button
                                onClick={() => setAiActiveModel('pro')}
                                className={cn(
                                    'flex flex-col p-4 rounded-xl border-2 transition-all text-left',
                                    aiActiveModel === 'pro'
                                        ? 'bg-purple-50 border-purple-400'
                                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                )}
                            >
                                <div className={cn('w-10 h-10 rounded-xl mb-3 flex items-center justify-center', aiActiveModel === 'pro' ? 'bg-purple-600' : 'bg-gray-200')}>
                                    <Cpu className={cn('w-5 h-5', aiActiveModel === 'pro' ? 'text-white' : 'text-gray-500')} />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Máximo Poder</h3>
                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2">GPT-4o Exclusivo</p>
                                <p className="text-xs text-gray-500">GPT-4o completo para casos complejos y alta precisión.</p>
                                {aiActiveModel === 'pro' && (
                                    <div className="mt-3 py-1 px-2 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black uppercase text-center">✓ Activo</div>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Uso de créditos */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-[#FF2E88]" />
                            <div className="flex-1">
                                <h2 className="text-base font-bold text-gray-900">Créditos de IA</h2>
                                <p className="text-xs text-gray-500">Uso del ciclo actual</p>
                            </div>
                            {aiCreditsUnlimited && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-xs font-black text-violet-600 uppercase tracking-wider">
                                    <Sparkles className="w-3 h-3" /> Ilimitado
                                </span>
                            )}
                        </div>
                        <div className="p-5 space-y-4">
                            {aiCreditsUnlimited ? (
                                <>
                                    <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
                                        <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
                                        <p className="text-sm text-violet-700 font-medium">Tu agente IA tiene créditos ilimitados. Nunca se silenciará por falta de créditos.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-center">
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                            <p className="text-xs text-gray-400 mb-1">Usados este ciclo</p>
                                            <p className="text-lg font-bold text-gray-900">{totalUsed.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                                            <p className="text-xs text-violet-500 mb-1">Disponibles</p>
                                            <p className="text-lg font-bold text-violet-600">∞</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-end justify-between mb-1">
                                        <span className="text-sm text-gray-600">{totalUsed.toLocaleString()} / {totalCredits.toLocaleString()} créditos usados</span>
                                        <span className={cn('text-sm font-bold', usagePct >= 90 ? 'text-red-600' : usagePct >= 70 ? 'text-amber-600' : 'text-emerald-600')}>
                                            {usagePct.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn('h-full rounded-full transition-all', usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                                            style={{ width: `${usagePct}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-3 text-center">
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                            <p className="text-xs text-gray-400 mb-1">Usados</p>
                                            <p className="text-lg font-bold text-gray-900">{totalUsed.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                            <p className="text-xs text-gray-400 mb-1">Límite Plan</p>
                                            <p className="text-lg font-bold text-gray-900">{aiCreditsMonthlyLimit.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                            <p className="text-xs text-gray-400 mb-1">Extra</p>
                                            <p className="text-lg font-bold text-gray-900">{aiCreditsExtraBalance.toLocaleString()}</p>
                                            {aiCreditsExtraBalance > 0 && aiCreditsExtraExpiresAt && (
                                                <p className="text-[9px] text-amber-500 font-bold mt-0.5">
                                                    Vence {new Date(aiCreditsExtraExpiresAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                                </p>
                                            )}
                                        </div>
                                        <div className={cn('border rounded-xl p-3', creditsAvailable <= 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100')}>
                                            <p className={cn('text-xs mb-1', creditsAvailable <= 0 ? 'text-red-400' : 'text-emerald-600')}>Disponibles</p>
                                            <p className={cn('text-lg font-bold', creditsAvailable <= 0 ? 'text-red-600' : 'text-emerald-700')}>{creditsAvailable.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {creditsAvailable <= 0 && (
                                        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                            <Zap className="w-3.5 h-3.5" />
                                            Créditos agotados — el agente IA está en pausa. Compra créditos extra para reactivarlo.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Desglose por modelo */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                            <Zap className="w-5 h-5 text-[#FF2E88]" />
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Consumo por Modelo</h2>
                                <p className="text-xs text-gray-500">Mensajes enviados y créditos gastados por tipo de IA este ciclo</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Cards de tier */}
                            <div className="grid grid-cols-3 gap-3">
                                {/* Tier 1 — Mini */}
                                <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                                            <Zap className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900 leading-none">GPT-4o Mini</p>
                                            <p className="text-[10px] text-emerald-600 font-bold">×1 crédito / msg</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900">{tierBreakdown.t1.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">mensajes</p>
                                    <div className="mt-2 pt-2 border-t border-emerald-100 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-500">Créditos</span>
                                        <span className="text-xs font-black text-emerald-700">{(tierBreakdown.t1 * 1).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Tier 2 — Standard */}
                                <div className="border border-pink-100 bg-pink-50/50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 bg-[#FF2E88] rounded-lg flex items-center justify-center">
                                            <RefreshCw className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900 leading-none">GPT-4o Standard</p>
                                            <p className="text-[10px] text-[#FF2E88] font-bold">×8 créditos / msg</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900">{tierBreakdown.t2.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">mensajes</p>
                                    <div className="mt-2 pt-2 border-t border-pink-100 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-500">Créditos</span>
                                        <span className="text-xs font-black text-[#FF2E88]">{(tierBreakdown.t2 * 8).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Tier 3 — Pro */}
                                <div className="border border-purple-100 bg-purple-50/50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
                                            <Cpu className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900 leading-none">GPT-4o Pro</p>
                                            <p className="text-[10px] text-purple-600 font-bold">×60 créditos / msg</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900">{tierBreakdown.t3.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">mensajes</p>
                                    <div className="mt-2 pt-2 border-t border-purple-100 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-500">Créditos</span>
                                        <span className="text-xs font-black text-purple-700">{(tierBreakdown.t3 * 60).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Nota explicativa */}
                            <div className="flex items-start gap-2 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    El agente elige el modelo según la complejidad del mensaje. Mini para respuestas simples, Standard para conversaciones con contexto, Pro para casos que requieren máxima precisión.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Packs de créditos */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Info className="w-5 h-5 text-[#FF2E88]" />
                                    <h2 className="text-base font-bold text-gray-900">Comprar Créditos Extra</h2>
                                </div>
                                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                    ⏱ Válidos 30 días desde la fecha de compra · Expiran automáticamente
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPaymentRegion('chile')}
                                    className={cn('text-xs font-bold px-3 py-1.5 rounded-lg border transition-all', paymentRegion === 'chile' ? 'bg-sky-50 border-sky-400 text-sky-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900')}
                                >🇨🇱 CLP</button>
                                <button
                                    onClick={() => setPaymentRegion('international')}
                                    className={cn('text-xs font-bold px-3 py-1.5 rounded-lg border transition-all', paymentRegion === 'international' ? 'bg-sky-50 border-sky-400 text-sky-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900')}
                                >🌍 USD</button>
                            </div>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {Object.entries(currentPacks).map(([packId, pack]: [string, any]) => {
                                const price = paymentRegion === 'chile' ? pack.price : pack.price
                                const priceDisplay = `${currencySymbol}${price.toLocaleString('es-CL')}`
                                const credits = pack.credits?.toLocaleString() || '—'
                                return (
                                    <div key={packId} className="flex flex-col border border-sky-100 rounded-2xl overflow-hidden">
                                        <div className="h-1.5 bg-gradient-to-r from-sky-500 to-sky-600" />
                                        <div className="p-5 flex flex-col flex-1">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-base font-black text-gray-900">{pack.name}</h3>
                                                <span className="px-2 py-0.5 bg-sky-50 text-sky-600 text-[10px] font-black rounded-lg border border-sky-100">
                                                    {credits} msgs
                                                </span>
                                            </div>
                                            <p className="text-2xl font-black text-gray-900 mb-4">{priceDisplay}</p>
                                            <ul className="space-y-1.5 mb-5 flex-1">
                                                <li className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    {pack.description || `${credits} mensajes de IA`}
                                                </li>
                                                <li className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    Activación instantánea
                                                </li>
                                                <li className="flex items-center gap-2 text-xs text-amber-600">
                                                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    Válidos 30 días
                                                </li>
                                            </ul>
                                            <button
                                                onClick={() => handleBuyCredits(packId)}
                                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-black text-sm hover:opacity-90 transition-all"
                                            >
                                                Comprar Pack
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

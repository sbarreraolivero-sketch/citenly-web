// @ts-nocheck
import { useState, useEffect } from 'react'
import {
    Megaphone,
    Plus,
    Users,
    Send,
    FileText,
    X,
    Loader2,
    BarChart3,
    Trash2,
    Coins,
    ShoppingCart,
    AlertTriangle,
    CheckCircle2,
    ShieldAlert,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { retentionService } from '@/services/retentionService'
import { GuideBox } from '@/components/ui/GuideBox'
import { redirectToLemonCampaignCreditsCheckout } from '@/lib/lemonsqueezy'

const CREDIT_PRICE_USD = 0.15

interface Campaign {
    id: string
    name: string
    segment_tag: string | null
    inclusion_tags: string[]
    exclusion_tags: string[]
    template_name: string
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
    scheduled_at: string | null
    sent_count: number
    total_target: number
    error_log: string | null
    created_at: string
}

interface Tag {
    id: string
    name: string
    color: string
    count?: number
}

interface YCloudTemplate {
    id: string
    name: string
    language: string
    status: string
    category: string
    body: string
}

interface Delivery {
    id: string
    contact_name: string
    contact_phone: string
    status: string
    error_message?: string
}

export default function Campaigns() {
    const { profile } = useAuth()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [templates, setTemplates] = useState<YCloudTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [selectedCampaignForReport, setSelectedCampaignForReport] = useState<Campaign | null>(null)
    const [deliveries, setDeliveries] = useState<Delivery[]>([])
    const [loadingDeliveries, setLoadingDeliveries] = useState(false)

    // New Campaign State
    const [step, setStep] = useState(1)
    const [newCampaignName, setNewCampaignName] = useState('')
    const [inclusionTags, setInclusionTags] = useState<string[]>([])
    const [exclusionTags, setExclusionTags] = useState<string[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [estimatedAudience, setEstimatedAudience] = useState<number | null>(null)
    const [creating, setCreating] = useState(false)

    // Campaign credits
    const [campaignCredits, setCampaignCredits] = useState<number>(0)
    const [buyCreditsQty, setBuyCreditsQty] = useState(100)
    const [showBuyCredits, setShowBuyCredits] = useState(false)
    const [buyingCredits, setBuyingCredits] = useState(false)

    useEffect(() => {
        if (!profile?.clinic_id) return
        fetchCampaigns()
        fetchTags()
        fetchTemplates()
        fetchCampaignCredits()
    }, [profile?.clinic_id])

    // Detect ?payment=success on return from LS checkout
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('payment') === 'success') {
            window.history.replaceState({}, '', '/app/campaigns')
            fetchCampaignCredits()
        }
    }, [])

    const fetchTemplates = async () => {
        try {
            if (profile?.clinic_id) {
                const fetchedTemplates = await retentionService.getRemoteTemplates(profile.clinic_id)
                // Filter only approved templates for campaigns
                setTemplates(fetchedTemplates.filter(t => t.status === 'APPROVED' || t.status === 'Activo-Calidad pendiente'))
            }
        } catch (error) {
            console.error('Error fetching templates:', error)
        }
    }

    const fetchCampaignCredits = async () => {
        if (!profile?.clinic_id) return
        const { data } = await (supabase as any)
            .from('subscriptions')
            .select('campaign_credits_balance')
            .eq('clinic_id', profile.clinic_id)
            .single()
        setCampaignCredits(data?.campaign_credits_balance ?? 0)
    }

    const handleBuyCredits = async () => {
        if (!profile?.clinic_id || !profile?.email) return
        setBuyingCredits(true)
        try {
            await redirectToLemonCampaignCreditsCheckout(profile.clinic_id, profile.email, buyCreditsQty)
        } catch (err: any) {
            alert(err.message || 'Error al iniciar el pago')
            setBuyingCredits(false)
        }
    }

    useEffect(() => {
        if (showReportModal && selectedCampaignForReport) {
            fetchDeliveries(selectedCampaignForReport.id)
        } else {
            setDeliveries([])
        }
    }, [showReportModal, selectedCampaignForReport])

    const fetchDeliveries = async (campaignId: string) => {
        setLoadingDeliveries(true)
        try {
            const { data, error } = await supabase
                .from('campaign_deliveries')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setDeliveries(data || [])
        } catch (error) {
            console.error('Error fetching deliveries:', error)
        } finally {
            setLoadingDeliveries(false)
        }
    }

    useEffect(() => {
        if ((inclusionTags.length > 0 || exclusionTags.length > 0) && profile?.clinic_id) {
            calculateAudience(inclusionTags, exclusionTags)
        } else {
            setEstimatedAudience(null)
        }
    }, [inclusionTags, exclusionTags, profile?.clinic_id])

    const fetchCampaigns = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('campaigns')
                .select('*')
                .eq('clinic_id', profile?.clinic_id || '')
                .order('created_at', { ascending: false })

            if (error) throw error
            setCampaigns(data || [])
        } catch (error) {
            console.error('Error fetching campaigns:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchTags = async () => {
        try {
            if (!profile?.clinic_id) return

            const { data, error } = await (supabase as any).rpc('get_tag_counts', {
                p_clinic_id: profile.clinic_id
            })

            if (error) throw error

            // En Citenly los tags se filtran por NOMBRE (texto), no por UUID
            const mappedTags: Tag[] = (data || []).map((t: any) => ({
                id: t.tag_name,
                name: t.tag_name,
                color: t.tag_color,
                count: Number(t.contact_count)
            }))

            setTags(mappedTags)
        } catch (error) {
            console.error('Error fetching tags:', error)
            const { data } = await (supabase as any)
                .from('tags')
                .select('*')
                .eq('clinic_id', profile?.clinic_id || '')
            setTags(data || [])
        }
    }

    const calculateAudience = async (inc: string[], exc: string[]) => {
        try {
            if (!profile?.clinic_id) return

            if (inc.length === 0 && exc.length === 0) {
                const { data: totalUnique } = await (supabase as any).rpc('get_estimated_audience', {
                    p_clinic_id: profile.clinic_id,
                    p_inclusion_tags: null,
                    p_exclusion_tags: null
                })
                setEstimatedAudience(totalUnique || 0)
                return
            }

            const { data, error } = await (supabase as any).rpc('get_estimated_audience', {
                p_clinic_id: profile.clinic_id,
                p_inclusion_tags: inc.length > 0 ? inc : null,
                p_exclusion_tags: exc.length > 0 ? exc : null
            })

            if (error) throw error
            setEstimatedAudience(data)
        } catch (err) {
            console.error('Error calculating audience:', err)
            setEstimatedAudience(0)
        }
    }

    const handleCreateCampaign = async () => {
        if (!profile?.clinic_id || !newCampaignName || !selectedTemplate) return
        setCreating(true)

        try {
            const { data: campaign, error } = await (supabase as any)
                .from('campaigns')
                .insert({
                    clinic_id: profile.clinic_id,
                    name: newCampaignName,
                    inclusion_tags: inclusionTags,
                    exclusion_tags: exclusionTags,
                    template_name: selectedTemplate,
                    status: 'draft',
                    total_target: estimatedAudience || 0
                })
                .select()
                .single()

            if (error) throw error

            setCampaigns([campaign, ...campaigns])
            setShowNewCampaignModal(false)
            resetForm()
        } catch (error) {
            console.error('Error creating campaign:', error)
            alert('Error al crear la campaña')
        } finally {
            setCreating(false)
        }
    }

    const handleLaunchCampaign = async (campaignId: string) => {
        const campaign = campaigns.find(c => c.id === campaignId)
        const needed = campaign?.total_target ?? 0

        if (needed > campaignCredits) {
            alert(`Créditos insuficientes. Necesitas ${needed} créditos y tienes ${campaignCredits}. Compra más créditos antes de lanzar.`)
            return
        }
        if (!confirm(`¿Enviar esta campaña a ${needed} contacto${needed !== 1 ? 's' : ''}? Se usarán hasta ${needed} crédito${needed !== 1 ? 's' : ''} de tu saldo.`)) return

        try {
            console.log(' Lanzando campaña ID:', campaignId)

            const { error: updateError } = await (supabase as any)
                .from('campaigns')
                .update({ status: 'sending', error_log: null })
                .eq('id', campaignId)

            if (updateError) {
                console.error('Error al actualizar estado a enviando:', updateError)
                throw updateError
            }

            await fetchCampaigns()

            const { data, error: fnError } = await supabase.functions.invoke('send-whatsapp-campaign', {
                body: { campaign_id: campaignId }
            })

            if (fnError) {
                console.error('Error de Invocación (Edge Function):', fnError)
                alert(`Error en el servidor: ${fnError.message || 'La función no respondió a tiempo. Revisa el estado de la campaña en unos minutos.'}`)
            } else {
                console.log(' Campaña iniciada exitosamente en segundo plano:', data)
                alert(`✅ Campaña iniciada con éxito. El progreso se actualizará automáticamente en unos momentos.`)
            }
        } catch (error: any) {
            console.error('Fallo total de lanzamiento:', error)
            alert(`Error al iniciar: ${error.message || 'Error técnico desconocido'}`)
        } finally {
            fetchCampaigns()
            fetchCampaignCredits()
        }
    }

    const handleDeleteCampaign = async (campaignId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta campaña?')) return

        try {
            const { error } = await (supabase as any)
                .from('campaigns')
                .delete()
                .eq('id', campaignId)

            if (error) throw error

            setCampaigns(prev => prev.filter(c => c.id !== campaignId))
        } catch (error: any) {
            console.error('Fallo al borrar campaña:', error)
            alert(`No se pudo borrar la campaña: ${error.message || 'Revisa tus permisos'}`)
            fetchCampaigns()
        }
    }

    const resetForm = () => {
        setStep(1)
        setNewCampaignName('')
        setInclusionTags([])
        setExclusionTags([])
        setSelectedTemplate('')
        setEstimatedAudience(null)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-100 text-emerald-700'
            case 'sending': return 'bg-blue-100 text-blue-700'
            case 'failed': return 'bg-red-100 text-red-700'
            case 'scheduled': return 'bg-amber-100 text-amber-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Completada'
            case 'sending': return 'Enviando'
            case 'failed': return 'Fallida/Parcial'
            case 'scheduled': return 'Programada'
            default: return 'Borrador'
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Banner — Marketing */}
            <div className="bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl overflow-hidden shadow-soft-md">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black uppercase tracking-widest text-violet-200 mb-2">Marketing</p>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Campañas</h1>
                            <p className="text-sm text-violet-100/80 font-light mt-1">Envía mensajes masivos y personalizados a tus pacientes. Segmenta tu audiencia y mejora el retorno.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => setShowNewCampaignModal(true)}
                                className="hidden sm:flex items-center gap-2 bg-white text-violet-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-violet-50 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Nueva Campaña
                            </button>
                            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
                                <Megaphone className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNewCampaignModal(true)}
                        className="mt-4 sm:hidden flex items-center gap-2 bg-white text-violet-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-violet-50 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Campaña
                    </button>
                </div>
            </div>

            {/* Campaign Credits Card */}
            <div className="card-premium overflow-hidden border-theme">
                <div className="bg-gradient-to-br from-violet-500 to-violet-700 p-4 text-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                            <Coins className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-widest text-violet-200 truncate">Créditos de Campaña</p>
                            <p className="text-xl sm:text-2xl font-extrabold leading-tight">{campaignCredits.toLocaleString('es-CL')} <span className="text-sm sm:text-base font-medium text-violet-200">disp.</span></p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBuyCredits(v => !v)}
                        className="flex items-center gap-1.5 bg-white text-violet-700 font-bold text-sm px-3 py-2 rounded-xl hover:bg-violet-50 transition-colors shrink-0"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="hidden sm:inline">Comprar créditos</span>
                        <span className="sm:hidden">Comprar</span>
                    </button>
                </div>

                {showBuyCredits && (
                    <div className="p-5 border-t border-theme">
                        <p className="text-xs text-secondary-theme mb-3">
                            <strong className="text-primary-theme">US$0.15 por crédito · 1 crédito = 1 mensaje · Sin vencimiento</strong>
                        </p>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-2 bg-secondary-theme border border-theme rounded-xl px-3 py-2">
                                    <button
                                        onClick={() => setBuyCreditsQty(q => Math.max(50, q - 50))}
                                        className="w-7 h-7 rounded-lg bg-primary-theme hover:bg-violet-100 text-primary-theme font-bold flex items-center justify-center transition-colors border border-theme"
                                    >−</button>
                                    <input
                                        type="number"
                                        min={50}
                                        step={50}
                                        value={buyCreditsQty}
                                        onChange={e => setBuyCreditsQty(Math.max(50, parseInt(e.target.value) || 50))}
                                        className="w-16 text-center bg-transparent font-bold text-primary-theme text-lg focus:outline-none"
                                    />
                                    <button
                                        onClick={() => setBuyCreditsQty(q => q + 50)}
                                        className="w-7 h-7 rounded-lg bg-primary-theme hover:bg-violet-100 text-primary-theme font-bold flex items-center justify-center transition-colors border border-theme"
                                    >+</button>
                                </div>
                                <div className="flex gap-2">
                                    {[100, 300, 500].map(preset => (
                                        <button
                                            key={preset}
                                            onClick={() => setBuyCreditsQty(preset)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${buyCreditsQty === preset ? 'bg-violet-100 border-violet-300 text-violet-700' : 'bg-secondary-theme border-theme text-secondary-theme hover:border-violet-200'}`}
                                        >{preset}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-lg font-extrabold text-primary-theme">
                                    US${(buyCreditsQty * CREDIT_PRICE_USD).toFixed(2)}
                                </span>
                                <button
                                    onClick={handleBuyCredits}
                                    disabled={buyingCredits}
                                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {buyingCredits ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                                    Comprar {buyCreditsQty} créditos
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-secondary-theme mt-3">Mínimo 50 créditos por compra. Los créditos no vencen.</p>
                    </div>
                )}
            </div>

            <GuideBox title="Campañas de WhatsApp Masivas" summary="Automatiza el re-contacto usando etiquetas segmentadas.">
                <div className="space-y-4">
                    <p>Las campañas te permiten notificar promociones, descuentos o avisos importantes a un gran grupo de pacientes a la vez en base a etiquetas.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Segmentación Efectiva:</strong> Usa etiquetas de "INCLUSIÓN" para enviar mensajes solo a un target específico (Ej: Cejas, Labios, Frecuente).</li>
                        <li><strong>Exclusión Segura:</strong> Añade etiquetas de "EXCLUSIÓN" para evitar contactar a pacientes recientes o que no deseas incluir.</li>
                        <li><strong>Estimador de Audiencia:</strong> Verás automáticamente a cuántos pacientes contactarás antes de lanzar la campaña.</li>
                    </ul>
                </div>
            </GuideBox>

            {/* Campaign List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-16 card-premium border-theme">
                    <Megaphone className="w-12 h-12 text-secondary-theme mx-auto mb-4 opacity-40" />
                    <h3 className="text-lg font-bold text-primary-theme">No hay campañas</h3>
                    <p className="text-secondary-theme max-w-sm mx-auto mt-2">
                        Crea tu primera campaña para contactar a tus pacientes y aumentar tus ventas.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns.map(campaign => (
                        <div key={campaign.id} className="card-premium p-5 border-theme hover:shadow-[0_0_15px_var(--glow)] transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(campaign.status)}`}>
                                    {getStatusLabel(campaign.status)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-xs text-secondary-theme">
                                        {new Date(campaign.created_at).toLocaleDateString()}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteCampaign(campaign.id)}
                                        className="text-secondary-theme hover:text-red-500 transition-colors"
                                        title="Eliminar campaña"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-primary-theme text-lg mb-1">{campaign.name}</h3>
                            <p className="text-sm text-secondary-theme mb-4 flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                {templates.find(t => t.id === campaign.template_name || t.name === campaign.template_name)?.name || campaign.template_name}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-secondary-theme mb-6 bg-secondary-theme p-3 rounded-soft border border-theme">
                                <div className="flex items-center gap-1.5" title="Audiencia Objetivo">
                                    <Users className="w-4 h-4 text-[var(--accent-primary)]" />
                                    <span>{campaign.total_target}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Enviados">
                                    <Send className="w-4 h-4 text-emerald-500" />
                                    <span>{campaign.sent_count}</span>
                                </div>
                            </div>

                            {campaign.status === 'failed' && campaign.error_log && (
                                <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{campaign.error_log}</span>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                {campaign.status === 'draft' && (
                                    <>
                                        {campaign.total_target > campaignCredits && (
                                            <div className="w-full flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                Necesitas {campaign.total_target} créditos (tienes {campaignCredits})
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleLaunchCampaign(campaign.id)}
                                            disabled={campaign.total_target > campaignCredits}
                                            className="w-full btn-premium-primary py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send className="w-4 h-4" />
                                            Lanzar Ahora
                                        </button>
                                    </>
                                )}
                                {campaign.status !== 'draft' && (
                                    <button
                                        onClick={() => { setSelectedCampaignForReport(campaign); setShowReportModal(true) }}
                                        className="w-full py-2 text-sm border border-theme rounded-soft text-primary-theme font-bold flex items-center justify-center gap-2 hover:bg-secondary-theme transition-colors"
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        Ver Reporte
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Campaign Modal */}
            {showNewCampaignModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-primary-theme w-full max-w-lg rounded-2xl shadow-xl border border-theme flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-theme">
                            <h3 className="text-lg font-bold text-primary-theme">Nueva Campaña</h3>
                            <button onClick={() => setShowNewCampaignModal(false)} className="p-2 hover:bg-secondary-theme rounded-soft transition-colors">
                                <X className="w-5 h-5 text-secondary-theme" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {/* Steps Indicator */}
                            <div className="flex items-center gap-2 mb-8 text-sm">
                                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-violet-600 font-bold' : 'text-secondary-theme'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-violet-100 text-violet-700' : 'bg-secondary-theme'}`}>1</div>
                                    Detalles
                                </div>
                                <div className="h-px w-8 bg-theme" />
                                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-violet-600 font-bold' : 'text-secondary-theme'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-violet-100 text-violet-700' : 'bg-secondary-theme'}`}>2</div>
                                    Contenido
                                </div>
                            </div>

                            {step === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-secondary-theme font-bold mb-2 block">Nombre de la Campaña</label>
                                        <input
                                            type="text"
                                            className="input-premium w-full"
                                            placeholder="Ej: Promo Verano 2026"
                                            value={newCampaignName}
                                            onChange={(e) => setNewCampaignName(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-secondary-theme font-bold mb-2 block">Incluir etiquetas (O)</label>
                                            <div className="flex flex-wrap gap-2 p-3 bg-secondary-theme rounded-soft border border-theme min-h-[44px]">
                                                {tags.map(tag => (
                                                    <button
                                                        key={`inc-${tag.id}`}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (inclusionTags.includes(tag.id)) {
                                                                setInclusionTags(prev => prev.filter(id => id !== tag.id))
                                                            } else {
                                                                setInclusionTags(prev => [...prev, tag.id])
                                                                setExclusionTags(prev => prev.filter(id => id !== tag.id))
                                                            }
                                                        }}
                                                        className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border transition-all ${inclusionTags.includes(tag.id) ? 'bg-violet-500 text-white border-violet-600 shadow-sm' : 'bg-primary-theme text-secondary-theme border-theme hover:border-violet-300'}`}
                                                    >
                                                        {tag.name}{typeof tag.count === 'number' ? ` (${tag.count})` : ''}
                                                    </button>
                                                ))}
                                                {tags.length === 0 && <span className="text-xs text-secondary-theme">No hay etiquetas creadas</span>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-red-600 font-bold mb-2 block">Excluir etiquetas (NO)</label>
                                            <div className="flex flex-wrap gap-2 p-3 bg-red-50/30 rounded-soft border border-red-100 min-h-[44px]">
                                                {tags.map(tag => (
                                                    <button
                                                        key={`exc-${tag.id}`}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (exclusionTags.includes(tag.id)) {
                                                                setExclusionTags(prev => prev.filter(id => id !== tag.id))
                                                            } else {
                                                                setExclusionTags(prev => [...prev, tag.id])
                                                                setInclusionTags(prev => prev.filter(id => id !== tag.id))
                                                            }
                                                        }}
                                                        className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border transition-all ${exclusionTags.includes(tag.id) ? 'bg-red-500 text-white border-red-600 shadow-sm' : 'bg-primary-theme text-secondary-theme border-theme hover:border-red-300'}`}
                                                    >
                                                        {tag.name}
                                                    </button>
                                                ))}
                                                {tags.length === 0 && <span className="text-xs text-secondary-theme">No hay etiquetas creadas</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-violet-50 text-violet-700 px-4 py-3 rounded-soft text-sm flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span>Público estimado:</span>
                                        </div>
                                        <strong className="text-lg">
                                            {estimatedAudience !== null ? `${estimatedAudience} ${estimatedAudience === 1 ? 'contacto' : 'contactos'}` : '--'}
                                        </strong>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <label className="text-xs uppercase tracking-wider text-secondary-theme font-bold block">Plantilla de WhatsApp</label>
                                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
                                        {templates.length === 0 ? (
                                            <div className="text-sm text-secondary-theme text-center py-4 bg-secondary-theme rounded-soft border border-dashed border-theme">
                                                No hay plantillas aprobadas disponibles.
                                            </div>
                                        ) : (
                                            templates.map(template => (
                                                <div
                                                    key={template.id}
                                                    className={`p-3 rounded-soft border cursor-pointer transition-all ${selectedTemplate === (template.id || template.name) ? 'border-violet-500 bg-violet-50' : 'border-theme hover:border-violet-200'}`}
                                                    onClick={() => setSelectedTemplate(template.id || template.name)}
                                                >
                                                    <div className="font-bold text-primary-theme truncate">{template.name}</div>
                                                    <div className="text-xs text-secondary-theme mt-1 line-clamp-2">{template.body || '(Sin cuerpo)'}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-theme flex justify-between bg-secondary-theme rounded-b-2xl">
                            {step > 1 ? (
                                <button onClick={() => setStep(step - 1)} className="px-4 py-2 rounded-soft border border-theme text-primary-theme font-bold hover:bg-primary-theme transition-colors">
                                    Atrás
                                </button>
                            ) : (
                                <div></div>
                            )}

                            {step < 2 ? (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    disabled={!newCampaignName || (inclusionTags.length === 0 && exclusionTags.length === 0)}
                                    className="btn-premium-primary disabled:opacity-50"
                                >
                                    Siguiente
                                </button>
                            ) : (
                                <button
                                    onClick={handleCreateCampaign}
                                    disabled={!selectedTemplate || creating}
                                    className="btn-premium-primary flex items-center gap-2 disabled:opacity-50"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Crear Campaña
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && selectedCampaignForReport && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-primary-theme w-full max-w-lg rounded-2xl shadow-xl border border-theme flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-theme">
                            <div>
                                <h3 className="text-lg font-bold text-primary-theme">Reporte de Entrega</h3>
                                <p className="text-xs text-secondary-theme">{selectedCampaignForReport.name}</p>
                            </div>
                            <button onClick={() => { setShowReportModal(false); setSelectedCampaignForReport(null) }} className="p-2 hover:bg-secondary-theme rounded-soft transition-colors">
                                <X className="w-5 h-5 text-secondary-theme" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="flex items-center gap-4 mb-4 text-sm">
                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {deliveries.filter(d => d.status === 'sent').length} enviados
                                </div>
                                <div className="flex items-center gap-1.5 text-red-600 font-bold">
                                    <ShieldAlert className="w-4 h-4" />
                                    {deliveries.filter(d => d.status !== 'sent').length} fallidos
                                </div>
                            </div>
                            {loadingDeliveries ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-[var(--accent-primary)] animate-spin" />
                                </div>
                            ) : deliveries.length === 0 ? (
                                <p className="text-sm text-secondary-theme text-center py-8">Aún no hay entregas registradas.</p>
                            ) : (
                                <div className="space-y-2">
                                    {deliveries.map(d => (
                                        <div key={d.id} className="flex items-center justify-between p-3 bg-secondary-theme rounded-soft border border-theme">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-primary-theme truncate">{d.contact_name || 'Sin nombre'}</p>
                                                <p className="text-xs text-secondary-theme">{d.contact_phone}</p>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${d.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {d.status === 'sent' ? 'Enviado' : 'Fallido'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

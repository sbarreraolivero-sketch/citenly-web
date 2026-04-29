// @ts-nocheck
import { useState, useEffect } from 'react'
import {
    MessageSquare,
    Zap,
    Megaphone,
    Plus,
    Users,
    Send,
    FileText,
    X,
    Loader2,
    BarChart3,
    Trash2,
    Lightbulb,
    CheckCircle2,
    ShieldAlert,
    Check
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { retentionService } from '@/services/retentionService'
import { GuideBox } from '@/components/ui/GuideBox'

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

    useEffect(() => {
        if (!profile?.clinic_id) return
        fetchCampaigns()
        fetchTags()
        fetchTemplates()
    }, [profile?.clinic_id])

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc('get_tag_counts', {
                p_clinic_id: profile.clinic_id
            })

            if (error) throw error
            
            // Map RPC result to Tag interface
            const mappedTags: Tag[] = (data || []).map((t: any) => ({
                id: t.tag_name, // Use name as ID for unification & filtering
                name: t.tag_name,
                color: t.tag_color,
                count: Number(t.contact_count)
            }))
            
            setTags(mappedTags)
        } catch (error) {
            console.error('Error fetching tags:', error)
            
            // Fallback to legacy behavior if RPC fails
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

            // If no tags selected, audience is the total count of unique contacts
            // But usually campaigns require at least one segment or exclusion.
            // If the user wants everyone, we might need a "catch-all" or check if both are empty.
            if (inc.length === 0 && exc.length === 0) {
                // Simplified total unique contacts count
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
            // 1. Create Campaign
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // Trigger sending immediately? Or wait?
            // Let's auto-trigger for now if the user wanted to "Send Now".
            // Adding a "Send Now" prompt would be better.

            // For this interaction, let's just create it.
            // Then in the list, have a "Launch" button.

        } catch (error) {
            console.error('Error creating campaign:', error)
            alert('Error al crear la campaña')
        } finally {
            setCreating(false)
        }
    }

    const handleLaunchCampaign = async (campaignId: string) => {
        if (!confirm('¿Estás seguro de enviar esta campaña a todos los pacientes del segmento?')) return

        try {
            console.log(' Lanzando campaña ID:', campaignId)
            
            // 1. Marcar como 'sending' en la DB
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await (supabase as any)
                .from('campaigns')
                .update({ status: 'sending', error_log: null })
                .eq('id', campaignId)

            if (updateError) {
                console.error('Error al actualizar estado a enviando:', updateError)
                throw updateError
            }

            // 2. Actualizar lista para mostrar estado "Enviando"
            await fetchCampaigns()

            // 3. Llamar Edge Function y esperar respuesta
            console.log(' Invocando Edge Function...')
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
            // Siempre refrescar al final para mostrar el estado final (completed/failed)
            fetchCampaigns()
        }
    }

    const handleDeleteCampaign = async (campaignId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta campaña?')) return

        try {
            console.log(' Intentando borrar campaña:', campaignId)
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('campaigns')
                .delete()
                .eq('id', campaignId)

            if (error) {
                console.error('Error de base de datos al borrar:', error)
                throw error
            }
            
            // Refrescar solo si el borrado fue exitoso
            setCampaigns(prev => prev.filter(c => c.id !== campaignId));
            console.log(' Borrada correctamente de la base de datos.')

        } catch (error: any) {
            console.error('Fallo al borrar campaña:', error)
            alert(`No se pudo borrar la campaña: ${error.message || 'Revisa tus permisos'}`)
            // Forzar refresco para asegurar que la UI sea fiel a la realidad
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
            {/* Header Banner: Premium Glow Style */}
            <div className="bg-gradient-to-br from-[#FFF0F7] via-[#FFF5F9] to-white dark:from-[#0B0B0F] dark:via-[#12040B] dark:to-[#0B0B0F] rounded-[24px] p-8 text-[#0B0B0F] border border-[#FF2E88]/30 relative overflow-hidden group shadow-[0_0_30px_rgba(255,46,136,0.1)] mb-8">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF2E88]/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none group-hover:bg-[#FF2E88]/10 transition-colors duration-700" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF2E88]/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white dark:bg-black rounded-2xl flex items-center justify-center shadow-xl border border-[#FF2E88]/20 shrink-0 transform group-hover:rotate-6 transition-transform duration-500">
                            <Megaphone className="w-8 h-8 text-[#FF2E88]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black text-[#0B0B0F] dark:text-white tracking-tight">Campañas</h1>
                                <span className="px-2.5 py-0.5 bg-[#FF2E88]/10 text-[#FF2E88] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#FF2E88]/20">WhatsApp Marketing</span>
                            </div>
                            <p className="text-[#0B0B0F]/70 dark:text-white/70 text-sm max-w-2xl font-medium leading-relaxed">
                                Envía mensajes masivos y personalizados a tus pacientes de forma automática. Segmenta tu audiencia y mejora el retorno.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowNewCampaignModal(true)}
                        className="bg-[#FF2E88] text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(255,46,136,0.3)] hover:shadow-[0_15px_30px_rgba(255,46,136,0.4)] hover:-translate-y-1 active:translate-y-0.5 flex items-center gap-3"
                    >
                        <Plus className="w-5 h-5 stroke-[3]" />
                        Nueva Campaña
                    </button>
                </div>
            </div>

            {/* Overlay de Próximamente */}
            <div className="relative overflow-hidden rounded-softer border border-theme bg-primary-theme p-8 text-center shadow-[0_0_30px_var(--glow)] backdrop-blur-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--gradient-primary)]" />
                
                <div className="max-w-2xl mx-auto py-12 space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--accent-primary)]/10 mb-4 animate-bounce">
                        <Zap className="w-10 h-10 text-[var(--accent-primary)]" />
                    </div>
                    
                    <h2 className="text-4xl font-extrabold text-primary-theme tracking-tight">
                        Motor de Campañas 2.0
                    </h2>
                    
                    <p className="text-lg text-secondary-theme leading-relaxed">
                        Estamos migrando a una nueva infraestructura inteligente de <span className="font-bold text-[var(--accent-primary)] italic">Créditos de Envío</span>. 
                        Pronto podrás recargar saldo directamente en Citenly y disfrutar de envíos masivos verificados por Meta.
                    </p>
                    
                    <div className="flex justify-center gap-4 text-sm font-semibold text-[var(--accent-primary)]">
                        <span className="flex items-center gap-1 bg-secondary-theme px-3 py-1 rounded-full border border-theme">
                            ✓ Sin límites de 250 mgs
                        </span>
                        <span className="flex items-center gap-1 bg-secondary-theme px-3 py-1 rounded-full border border-theme">
                            ✓ 100% Desatendido
                        </span>
                    </div>

                    <div className="pt-6">
                        <div className="inline-flex items-center px-6 py-3 rounded-xl bg-[var(--gradient-primary)] text-white font-medium shadow-lg">
                            Lanzamiento exclusivo para Clínicas Fundadoras 🚀
                        </div>
                    </div>
                </div>

                {/* El resto del diseño anterior queda oculto visualmente */}
                <div className="opacity-10 pointer-events-none blur-md select-none mt-12 grayscale">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-40 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

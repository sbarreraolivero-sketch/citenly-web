
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
    Lightbulb,
    CheckCircle2,
    ShieldAlert
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

export default function Campaigns() {
    const { profile } = useAuth()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [templates, setTemplates] = useState<YCloudTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [selectedCampaignForReport, setSelectedCampaignForReport] = useState<Campaign | null>(null)

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
            } else if (data?.error) {
                console.error('Error reportado por la función:', data.error)
                alert(`Campaña con problemas: ${data.error}`)
            } else {
                console.log(' Campaña completada exitosamente:', data)
                alert(`✅ Campaña enviada a ${data?.sent || 0} de ${data?.total || 0} contactos.`)
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
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-hero-gradient rounded-softer p-6 text-white shadow-soft-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-premium-gradient rounded-full flex items-center justify-center shadow-lg shrink-0">
                            <Megaphone className="w-7 h-7 text-charcoal" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Campañas de Marketing</h1>
                            <p className="text-white/80 text-sm mt-1 max-w-2xl leading-relaxed">
                                📣 Envía mensajes masivos por WhatsApp a tus pacientes. Usa segmentación inteligente para llegar al público correcto con mensajes pre-aprobados por Meta.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowNewCampaignModal(true)}
                        className="bg-white text-primary-700 hover:bg-ivory px-6 py-2.5 rounded-soft text-sm font-bold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Campaña
                    </button>
                </div>
            </div>

            <GuideBox 
                title="Guía: Campañas que Convierten" 
                summary="Aprende a segmentar tu audiencia y elegir la mejor estrategia para tus mensajes masivos."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-primary-800 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Segmentación Inteligente
                        </p>
                        <ul className="space-y-2">
                            <li className="flex gap-2 text-[11px] text-charcoal/70 leading-relaxed">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <strong>Inclusión:</strong> Selecciona etiquetas como "Paciente VIP" o "Tratamiento Acabado" para enfocar tu mensaje.
                            </li>
                            <li className="flex gap-2 text-[11px] text-charcoal/70 leading-relaxed">
                                <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                <strong>Exclusión:</strong> Vital para no molestar a quien ya tiene cita. Excluye la etiqueta "Cita Pendiente" en campañas de reactivación.
                            </li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-primary-800 flex items-center gap-2">
                            <Send className="w-4 h-4" /> Reglas de Oro
                        </p>
                        <ul className="space-y-2">
                            <li className="flex gap-2 text-[11px] text-charcoal/70 leading-relaxed">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <strong>Horarios:</strong> Evita envíos masivos en la noche. Las mejores horas son de 10:00 AM a 1:00 PM.
                            </li>
                            <li className="flex gap-2 text-[11px] text-charcoal/70 leading-relaxed">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <strong>Contenido:</strong> Meta rechaza mensajes muy agresivos. Usa un tono cercano y ofrece valor (ej: "¡Hola! Te extrañamos, tenemos un beneficio para ti").
                            </li>
                        </ul>
                    </div>
                </div>
            </GuideBox>
            {/* Campaign List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-soft border border-silk-beige">
                    <Megaphone className="w-12 h-12 text-charcoal/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-charcoal">No hay campañas</h3>
                    <p className="text-charcoal/50 max-w-sm mx-auto mt-2">
                        Crea tu primera campaña para contactar a tus pacientes y aumentar tus ventas.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns.map(campaign => (
                        <div key={campaign.id} className="bg-white p-5 rounded-soft border border-silk-beige hover:shadow-soft-lg transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                                    {getStatusLabel(campaign.status)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-xs text-charcoal/40">
                                        {new Date(campaign.created_at).toLocaleDateString()}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteCampaign(campaign.id)}
                                        className="text-charcoal/40 hover:text-red-500 transition-colors"
                                        title="Eliminar campaña"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-semibold text-charcoal text-lg mb-1">{campaign.name}</h3>
                            <p className="text-sm text-charcoal/60 mb-4 flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                {templates.find(t => t.id === campaign.template_name)?.name || campaign.template_name}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-charcoal/70 mb-6 bg-gray-50 p-3 rounded-soft">
                                <div className="flex items-center gap-1.5 tooltipped" title="Audiencia Objetivo">
                                    <Users className="w-4 h-4 text-primary-500" />
                                    <span>{campaign.total_target}</span>
                                </div>
                                <div className="flex items-center gap-1.5 tooltipped" title="Enviados">
                                    <Send className="w-4 h-4 text-emerald-500" />
                                    <span>{campaign.sent_count}</span>
                                </div>
                                {/* Could add open rate if we had read receipts */}
                            </div>

                            <div className="flex gap-2">
                                {campaign.status === 'draft' && (
                                    <button
                                        onClick={() => handleLaunchCampaign(campaign.id)}
                                        className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        Lanzar Ahora
                                    </button>
                                )}
                                {campaign.status !== 'draft' && (
                                    <button 
                                        onClick={() => {
                                            setSelectedCampaignForReport(campaign)
                                            setShowReportModal(true)
                                        }}
                                        className="w-full btn-ghost py-2 text-sm border border-silk-beige hover:bg-gray-50 flex items-center justify-center gap-2"
                                    >
                                        <BarChart3 className="w-4 h-4 text-primary-500" />
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
                <div className="fixed inset-0 bg-charcoal/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-lg rounded-soft shadow-soft-xl border border-silk-beige flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-silk-beige">
                            <h3 className="text-lg font-semibold text-charcoal">Nueva Campaña</h3>
                            <button onClick={() => setShowNewCampaignModal(false)} className="p-2 hover:bg-silk-beige rounded-soft transition-colors">
                                <X className="w-5 h-5 text-charcoal/60" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {/* Steps Indicator */}
                            <div className="flex items-center gap-2 mb-8 text-sm">
                                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary-600 font-medium' : 'text-charcoal/40'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-100' : 'bg-gray-100'}`}>1</div>
                                    Detalles
                                </div>
                                <div className="h-px w-8 bg-gray-200" />
                                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary-600 font-medium' : 'text-charcoal/40'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-100' : 'bg-gray-100'}`}>2</div>
                                    Contenido
                                </div>
                            </div>

                            {step === 1 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="label text-xs uppercase tracking-widest text-charcoal/80 font-black mb-2 block">Nombre de la Campaña</label>
                                            <input
                                                type="text"
                                                className="input w-full"
                                                placeholder="Ej: Promo Verano 2024"
                                                value={newCampaignName}
                                                onChange={(e) => setNewCampaignName(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="label text-xs uppercase tracking-widest text-charcoal/80 font-black mb-2 block">Incluir etiquetas (Y)</label>
                                                <div className="flex flex-wrap gap-2 p-3 bg-ivory rounded-soft border border-silk-beige min-h-[44px]">
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
                                                            className={`
                                                                px-2 py-1 rounded text-xs font-black uppercase tracking-wider border transition-all
                                                                ${inclusionTags.includes(tag.id)
                                                                    ? 'bg-primary-600 text-white border-primary-700 shadow-sm'
                                                                    : 'bg-white text-charcoal/70 border-silk-beige hover:border-primary-400'
                                                                }
                                                            `}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    ))}
                                                    {tags.length === 0 && <span className="text-xs text-charcoal/30">No hay etiquetas creadas</span>}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="label text-xs uppercase tracking-widest text-red-700 font-black mb-2 block">Excluir etiquetas (NO)</label>
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
                                                            className={`
                                                                px-2 py-1 rounded text-xs font-black uppercase tracking-wider border transition-all
                                                                ${exclusionTags.includes(tag.id)
                                                                    ? 'bg-red-600 text-white border-red-700 shadow-sm'
                                                                    : 'bg-white text-charcoal/70 border-silk-beige hover:border-red-400'
                                                                }
                                                            `}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    ))}
                                                    {tags.length === 0 && <span className="text-xs text-charcoal/30">No hay etiquetas creadas</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-primary-50 text-primary-700 px-4 py-3 rounded-soft text-sm flex items-center justify-between">
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
                                    <label className="label">Plantilla de WhatsApp</label>
                                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
                                        {templates.length === 0 ? (
                                            <div className="text-sm text-charcoal/50 text-center py-4 bg-gray-50 rounded-soft border border-dashed">
                                                No hay plantillas aprobadas disponibles.
                                            </div>
                                        ) : (
                                            templates.map(template => (
                                                <div
                                                    key={template.id}
                                                    className={`
                                                        p-3 rounded-soft border cursor-pointer transition-all
                                                        ${selectedTemplate === template.id
                                                            ? 'border-primary-500 bg-primary-50'
                                                            : 'border-silk-beige hover:border-primary-200'
                                                        }
                                                    `}
                                                    onClick={() => setSelectedTemplate(template.id)}
                                                >
                                                    <div className="font-medium text-charcoal truncate">{template.name}</div>
                                                    <div className="text-xs text-charcoal/60 mt-1 line-clamp-2">{template.body || '(Sin cuerpo)'}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-silk-beige flex justify-between bg-gray-50 rounded-b-soft">
                            {step > 1 ? (
                                <button onClick={() => setStep(step - 1)} className="btn-ghost">
                                    Atrás
                                </button>
                            ) : (
                                <div></div>
                            )}

                            {step < 2 ? (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    disabled={!newCampaignName || (inclusionTags.length === 0 && exclusionTags.length === 0)}
                                    className="btn-primary"
                                >
                                    Siguiente
                                </button>
                            ) : (
                                <button
                                    onClick={handleCreateCampaign}
                                    disabled={!selectedTemplate || creating}
                                    className="btn-primary flex items-center gap-2"
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
                <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-silk-beige flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 flex justify-between items-start text-white">
                            <div>
                                <p className="text-primary-100 text-xs font-black uppercase tracking-widest mb-1 italic">Reporte Detallado de Campaña</p>
                                <h3 className="text-2xl font-bold tracking-tight">{selectedCampaignForReport.name}</h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                                        {getStatusLabel(selectedCampaignForReport.status)}
                                    </span>
                                    <span className="text-white/60 text-[10px] font-bold uppercase">
                                        {new Date(selectedCampaignForReport.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                            {/* KPI Metrics */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-silk-beige text-center">
                                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-4 h-4 text-primary-600" />
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Objetivo</p>
                                    <p className="text-xl font-black text-charcoal">{selectedCampaignForReport.total_target}</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <Send className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-emerald-800/40 tracking-wider">Enviados</p>
                                    <p className="text-xl font-black text-emerald-700">{selectedCampaignForReport.sent_count}</p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
                                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <BarChart3 className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-amber-800/40 tracking-wider">Éxito</p>
                                    <p className="text-xl font-black text-amber-700">
                                        {selectedCampaignForReport.total_target > 0 
                                            ? Math.round((selectedCampaignForReport.sent_count / selectedCampaignForReport.total_target) * 100)
                                            : 0}%
                                    </p>
                                </div>
                            </div>

                            {/* Campaign Context */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-charcoal border-b border-silk-beige pb-2">
                                    <FileText className="w-4 h-4 text-primary-500" />
                                    Detalle del Envío
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Plantilla Utilizada</p>
                                        <p className="text-sm font-medium text-charcoal truncate">
                                            {templates.find(t => t.id === selectedCampaignForReport.template_name)?.name || selectedCampaignForReport.template_name}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Filtros Activos</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(selectedCampaignForReport.inclusion_tags || []).map(t => (
                                                <span key={t} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">+{t}</span>
                                            ))}
                                            {(selectedCampaignForReport.exclusion_tags || []).map(t => (
                                                <span key={t} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">-{t}</span>
                                            ))}
                                            {(!selectedCampaignForReport.inclusion_tags?.length && !selectedCampaignForReport.exclusion_tags?.length) && (
                                                <span className="text-[10px] font-medium text-charcoal/40 italic">Sin etiquetas activas</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error Log if exists */}
                            {selectedCampaignForReport.error_log && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
                                    <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                                        <ShieldAlert className="w-4 h-4" />
                                        Alertas de Envío (Logs Técnicos)
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg border border-red-200">
                                        <code className="text-[10px] text-red-600 block break-all font-mono leading-relaxed">
                                            {selectedCampaignForReport.error_log}
                                        </code>
                                    </div>
                                    <p className="text-[9px] text-red-600 italic leading-tight">
                                        * Meta o YCloud pueden rechazar mensajes si el número es inválido o no tiene WhatsApp activo.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-silk-beige flex justify-end">
                            <button 
                                onClick={() => setShowReportModal(false)}
                                className="px-6 py-2.5 bg-charcoal text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

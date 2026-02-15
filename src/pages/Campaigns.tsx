
import { useState, useEffect } from 'react'
import {
    Megaphone,
    Plus,
    Users,
    Send,
    FileText,
    X,
    Loader2,
    BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Campaign {
    id: string
    name: string
    segment_tag: string
    template_name: string
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
    scheduled_at: string | null
    sent_count: number
    total_target: number
    created_at: string
}

interface Tag {
    id: string
    name: string
    color: string
    count?: number
}

// Predefined safe templates for now
const WHATSAPP_TEMPLATES = [
    { id: 'appointment_reminder', name: 'Recordatorio de Cita', description: 'Recordatorio estándar de cita próxima.' },
    { id: 'satisfaction_survey', name: 'Encuesta de Satisfacción', description: 'Solicitud de feedback post-atención.' },
    { id: 'general_notification', name: 'Notificación General', description: 'Avisos importantes o cambios de horario.' },
    { id: 'promo_monthly', name: 'Promoción Mensual', description: 'Ofertas y descuentos del mes.' }, // New
    { id: 'reactivation', name: 'Reactivación', description: 'Para pacientes que no vienen hace tiempo.' } // New
]

export default function Campaigns() {
    const { profile } = useAuth()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(true)
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false)

    // New Campaign State
    const [step, setStep] = useState(1)
    const [newCampaignName, setNewCampaignName] = useState('')
    const [selectedTag, setSelectedTag] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [estimatedAudience, setEstimatedAudience] = useState<number | null>(null)
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (!profile?.clinic_id) return
        fetchCampaigns()
        fetchTags()
    }, [profile?.clinic_id])

    useEffect(() => {
        if (selectedTag && profile?.clinic_id) {
            calculateAudience(selectedTag)
        } else {
            setEstimatedAudience(null)
        }
    }, [selectedTag, profile?.clinic_id])

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from('tags')
                .select('*')
                .eq('clinic_id', profile?.clinic_id || '')

            if (error) throw error
            setTags(data || [])
        } catch (error) {
            console.error('Error fetching tags:', error)
        }
    }

    const calculateAudience = async (tagId: string) => {
        if (tagId === 'all') {
            // Count all patients
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count } = await (supabase as any)
                .from('patients')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', profile?.clinic_id || '')
            setEstimatedAudience(count)
        } else {
            // Count by tag
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count } = await (supabase as any)
                .from('patient_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', tagId)
            setEstimatedAudience(count)
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
                    segment_tag: selectedTag === 'all' ? null : selectedTag,
                    // Let's store the tag Name or ID. The schema has segment_tag text
                    // If we store ID, it's better for linking but needs join.
                    // For simplicity let's store ID if specific, or NULL if all (or special value).
                    // Schema comment says "Tag to filter patients by".
                    template_name: selectedTemplate,
                    status: 'draft', // Start as draft, then user clicks "Send" separately or we have a "Send Now" button?
                    // Let's make this button "Create & Send" or just "Create Draft".
                    // For MVP let's do "Create Draft" then sending is a trigger.
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
            // Update status to 'sending' (or 'scheduled' if we had a date)
            // Ideally trigger Edge Function here.

            // 1. Update status
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await (supabase as any)
                .from('campaigns')
                .update({ status: 'sending' })
                .eq('id', campaignId)

            if (updateError) throw updateError

            // 2. Refresh list
            fetchCampaigns()

            // 3. Trigger Edge Function (fire and forget)
            // We need to implement this function next.
            await supabase.functions.invoke('send-whatsapp-campaign', {
                body: { campaign_id: campaignId }
            })

            alert('Campaña iniciada. Los mensajes se enviarán en breve.')

        } catch (error) {
            console.error('Error launching campaign:', error)
            alert('Error al iniciar la campaña')
        }
    }

    const resetForm = () => {
        setStep(1)
        setNewCampaignName('')
        setSelectedTag('')
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-charcoal">Campañas de Marketing</h1>
                    <p className="text-charcoal/60">Envía mensajes masivos por WhatsApp a tus pacientes</p>
                </div>
                <button
                    onClick={() => setShowNewCampaignModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Campaña
                </button>
            </div>

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
                                <div className="text-xs text-charcoal/40">
                                    {new Date(campaign.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <h3 className="font-semibold text-charcoal text-lg mb-1">{campaign.name}</h3>
                            <p className="text-sm text-charcoal/60 mb-4 flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                {WHATSAPP_TEMPLATES.find(t => t.id === campaign.template_name)?.name || campaign.template_name}
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
                                    <button className="w-full btn-ghost py-2 text-sm border border-silk-beige" disabled>
                                        <BarChart3 className="w-4 h-4 mr-2" />
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
                                        <label className="label">Nombre de la Campaña</label>
                                        <input
                                            type="text"
                                            className="input w-full"
                                            placeholder="Ej: Promo Verano 2024"
                                            value={newCampaignName}
                                            onChange={(e) => setNewCampaignName(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Segmento (Destinatarios)</label>
                                        <select
                                            className="input w-full"
                                            value={selectedTag}
                                            onChange={(e) => setSelectedTag(e.target.value)}
                                        >
                                            <option value="">Selecciona un segmento...</option>
                                            <option value="all">Todos los Pacientes</option>
                                            {tags.map(tag => (
                                                <option key={tag.id} value={tag.id}>{tag.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {estimatedAudience !== null && (
                                        <div className="bg-primary-50 text-primary-700 px-4 py-3 rounded-soft text-sm flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span>
                                                Público estimado: <strong>{estimatedAudience} pacientes</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <label className="label">Plantilla de WhatsApp</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {WHATSAPP_TEMPLATES.map(template => (
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
                                                <div className="font-medium text-charcoal">{template.name}</div>
                                                <div className="text-xs text-charcoal/60 mt-1">{template.description}</div>
                                            </div>
                                        ))}
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
                                    disabled={!newCampaignName || !selectedTag}
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
        </div>
    )
}

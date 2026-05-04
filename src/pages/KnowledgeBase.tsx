import { useState, useEffect, useCallback } from 'react'
import {
    BookOpen,
    Plus,
    Search,
    FileText,
    CheckCircle2,
    Clock,
    Tag,
    Loader2,
    X,
    Save,
    Trash2,
    Edit3,
    ToggleLeft,
    ToggleRight,
    Upload,
    AlertCircle,
    Bot,
    Sparkles,
    Lightbulb,
    Check,
    Info,
    Maximize2,
    Minimize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { GuideBox } from '@/components/ui/GuideBox'

interface KnowledgeDocument {
    id: string
    clinic_id: string
    title: string
    content: string
    category: string
    status: 'active' | 'inactive'
    sync_status: 'synced' | 'pending'
    created_at: string
    updated_at: string
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    general: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    precios: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    servicios: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    casos_uso: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    faq: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    politicas: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    promociones: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    horarios: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
}

const CATEGORY_OPTIONS = [
    { value: 'general', label: 'General' },
    { value: 'precios', label: 'Precios' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'casos_uso', label: 'Casos de Uso' },
    { value: 'faq', label: 'Preguntas Frecuentes' },
    { value: 'politicas', label: 'Políticas' },
    { value: 'promociones', label: 'Promociones' },
    { value: 'horarios', label: 'Horarios' },
]

function getCategoryColor(category: string) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.general
}

export default function KnowledgeBase() {
    const { profile } = useAuth()
    const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    // AI Master Prompt/Behavior Rules state
    const [masterPrompt, setMasterPrompt] = useState('')
    const [behaviorRules, setBehaviorRules] = useState('')
    const [transferDetails, setTransferDetails] = useState('')
    const [savingPrompt, setSavingPrompt] = useState(false)
    const [promptSaved, setPromptSaved] = useState(false)
    const [showPromptSection, setShowPromptSection] = useState(true)
    const [expandedEditor, setExpandedEditor] = useState<'personality' | 'behavior' | 'transfer' | null>(null)

    // Form state
    const [formTitle, setFormTitle] = useState('')
    const [formContent, setFormContent] = useState('')
    const [formCategory, setFormCategory] = useState('general')
    const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active')

    // File upload
    const [uploadingFile, setUploadingFile] = useState(false)

    const fetchDocuments = useCallback(async () => {
        if (!profile?.clinic_id) return

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from('knowledge_base')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .order('updated_at', { ascending: false })

            if (error) throw error
            setDocuments(data || [])
        } catch (error) {
            console.error('Error fetching knowledge base:', error)
        } finally {
            setLoading(false)
        }
    }, [profile?.clinic_id])

    // Fetch AI master prompt
    const fetchMasterPrompt = useCallback(async () => {
        if (!profile?.clinic_id) return
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any)
                .from('clinic_settings')
                .select('ai_personality, ai_behavior_rules, transfer_details')
                .eq('id', profile.clinic_id)
                .single()
            if (data?.ai_personality) setMasterPrompt(data.ai_personality)
            if (data?.ai_behavior_rules) setBehaviorRules(data.ai_behavior_rules)
            if (data?.transfer_details) setTransferDetails(data.transfer_details)
        } catch (e) {
            console.error('Error fetching master prompt:', e)
        }
    }, [profile?.clinic_id])

    const handleSaveMasterPrompt = async () => {
        if (!profile?.clinic_id) return
        setSavingPrompt(true)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({
                    ai_personality: masterPrompt.trim(),
                    ai_behavior_rules: behaviorRules.trim(),
                    transfer_details: transferDetails.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.clinic_id)
            if (error) throw error
            setPromptSaved(true)
            setTimeout(() => setPromptSaved(false), 3000)
        } catch (e) {
            console.error('Error saving prompt settings:', e)
            alert('Error al guardar la configuración. Inténtalo de nuevo.')
        } finally {
            setSavingPrompt(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
        fetchMasterPrompt()
    }, [fetchDocuments, fetchMasterPrompt])

    // Stats
    const totalDocs = documents.length
    const syncedDocs = documents.filter(d => d.sync_status === 'synced').length
    const pendingDocs = documents.filter(d => d.sync_status === 'pending').length
    const uniqueCategories = [...new Set(documents.map(d => d.category))].length

    // Filtered documents
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch =
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.content.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = filterCategory === 'all' || doc.category === filterCategory
        const matchesStatus = filterStatus === 'all' || doc.status === filterStatus
        return matchesSearch && matchesCategory && matchesStatus
    })

    const openNewModal = () => {
        setEditingDoc(null)
        setFormTitle('')
        setFormContent('')
        setFormCategory('general')
        setFormStatus('active')
        setShowModal(true)
    }

    const openEditModal = (doc: KnowledgeDocument) => {
        setEditingDoc(doc)
        setFormTitle(doc.title)
        setFormContent(doc.content)
        setFormCategory(doc.category)
        setFormStatus(doc.status)
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingDoc(null)
        setFormTitle('')
        setFormContent('')
        setFormCategory('general')
        setFormStatus('active')
    }

    const handleSave = async () => {
        if (!profile?.clinic_id || !formTitle.trim() || !formContent.trim()) return

        setSaving(true)
        try {
            if (editingDoc) {
                // Update
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                    .from('knowledge_base')
                    .update({
                        title: formTitle.trim(),
                        content: formContent.trim(),
                        category: formCategory,
                        status: formStatus,
                        sync_status: 'synced',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingDoc.id)

                if (error) throw error
            } else {
                // Create
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                    .from('knowledge_base')
                    .insert({
                        clinic_id: profile.clinic_id,
                        title: formTitle.trim(),
                        content: formContent.trim(),
                        category: formCategory,
                        status: formStatus,
                        sync_status: 'synced',
                    })

                if (error) throw error
            }

            closeModal()
            fetchDocuments()
        } catch (error) {
            console.error('Error saving document:', error)
            alert('Error al guardar el documento. Inténtalo de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('knowledge_base')
                .delete()
                .eq('id', id)

            if (error) throw error
            setDeleteConfirm(null)
            fetchDocuments()
        } catch (error) {
            console.error('Error deleting document:', error)
            alert('Error al eliminar el documento.')
        }
    }

    const handleToggleStatus = async (doc: KnowledgeDocument) => {
        const newStatus = doc.status === 'active' ? 'inactive' : 'active'
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('knowledge_base')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', doc.id)

            if (error) throw error
            fetchDocuments()
        } catch (error) {
            console.error('Error toggling status:', error)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingFile(true)
        try {
            const text = await file.text()
            setFormTitle(file.name.replace(/\.[^/.]+$/, ''))
            setFormContent(text)
            if (!showModal) {
                setEditingDoc(null)
                setFormCategory('general')
                setFormStatus('active')
                setShowModal(true)
            }
        } catch (error) {
            console.error('Error reading file:', error)
            alert('Error al leer el archivo. Asegúrate de que sea un archivo de texto.')
        } finally {
            setUploadingFile(false)
            e.target.value = ''
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    <p className="text-secondary-theme">Cargando base de conocimiento...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Banner: Premium Glow Style */}
            <div className="bg-gradient-to-br from-[#FFF0F7] via-[#FFF5F9] to-white dark:from-[#0B0B0F] dark:via-[#12040B] dark:to-[#0B0B0F] rounded-[24px] p-5 sm:p-8 text-[#0B0B0F] border border-[#FF2E88]/30 relative overflow-hidden group shadow-[0_0_30px_rgba(255,46,136,0.1)] mb-8">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF2E88]/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none group-hover:bg-[#FF2E88]/10 transition-colors duration-700" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF2E88]/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8 relative z-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                        <div className="w-16 h-16 bg-white dark:bg-black rounded-2xl flex items-center justify-center shadow-xl border border-[#FF2E88]/20 shrink-0 transform group-hover:rotate-6 transition-transform duration-500">
                            <BookOpen className="w-8 h-8 text-[#FF2E88]" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                                <h1 className="text-2xl sm:text-3xl font-black text-[#0B0B0F] dark:text-white tracking-tight">Base de Conocimiento</h1>
                                <span className="px-2.5 py-0.5 bg-[#FF2E88]/10 text-[#FF2E88] text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full border border-[#FF2E88]/20 whitespace-nowrap">AI Training</span>
                            </div>
                            <p className="text-[#0B0B0F]/70 dark:text-white/70 text-sm max-w-2xl font-medium leading-relaxed">
                                Entrena a tu Agente IA con datos sobre tu clínica. Sube documentos para que resuelva dudas y agende citas de forma inteligente.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
                        <label className="flex-1 sm:flex-none justify-center bg-white/80 dark:bg-black/80 text-[#0B0B0F] dark:text-white border border-[#FF2E88]/30 px-6 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all hover:bg-white dark:hover:bg-black flex items-center gap-2 cursor-pointer whitespace-nowrap">
                            <Upload className="w-4 h-4" />
                            {uploadingFile ? 'Leyendo...' : 'Subir Archivo'}
                            <input
                                type="file"
                                accept=".txt,.md,.csv,.json"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                        <button
                            onClick={openNewModal}
                            className="flex-1 sm:flex-none justify-center bg-[#FF2E88] text-white px-8 py-3.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(255,46,136,0.3)] hover:shadow-[0_15px_30px_rgba(255,46,136,0.4)] hover:-translate-y-1 active:translate-y-0.5 flex items-center gap-3 whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5 stroke-[3]" />
                            Nuevo Registro
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Agent Master Prompt Section */}
            <div className="card-premium overflow-hidden">
                <button
                    onClick={() => setShowPromptSection(!showPromptSection)}
                    className="w-full p-5 flex items-center justify-between hover:bg-secondary-theme transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] rounded-soft flex items-center justify-center shadow-lg border border-[#BF953F]/20">
                            <Bot className="w-5.5 h-5.5 text-black" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-semibold text-primary-theme flex items-center gap-2">
                                Agente IA
                                <Sparkles className="w-4 h-4 text-violet-500" />
                            </h2>
                            <p className="text-sm text-secondary-theme">Master Prompt — Define la personalidad y comportamiento de tu asistente</p>
                        </div>
                    </div>
                    <svg className={`w-5 h-5 text-secondary-theme transition-transform ${showPromptSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {showPromptSection && (
                    <div className="px-5 pb-5 space-y-4 border-t border-theme">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-primary-theme">Master Prompt (Personalidad)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-secondary-theme">{masterPrompt.length} caracteres</span>
                                        <button 
                                            onClick={() => setExpandedEditor('personality')}
                                            className="p-1.5 hover:bg-secondary-theme rounded-md transition-colors text-secondary-theme group"
                                            title="Expandir"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 group-hover:text-[var(--accent-primary)]" />
                                        </button>
                                    </div>
                                </div>
                                <div className="relative group/textarea">
                                    <textarea
                                        value={masterPrompt}
                                        onChange={(e) => setMasterPrompt(e.target.value)}
                                        placeholder={`Ej: Eres un asistente amable y profesional para una clínica estética.\n\nReglas:\n- Responde de manera cordial, breve y clara\n- Nunca inventes horarios o servicios que no existan\n- Usa emojis con moderación para dar calidez\n- Siempre sugiere agendar una cita cuando el paciente muestre interés\n- Si no sabes algo, ofrece comunicar al paciente con el equipo humano`}
                                        rows={8}
                                        className="input-premium w-full resize-none font-mono text-sm leading-relaxed"
                                    />
                                    <button 
                                        onClick={() => setExpandedEditor('personality')}
                                        className="absolute bottom-3 right-3 p-2 bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-theme rounded-lg opacity-0 group-hover/textarea:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Maximize2 className="w-4 h-4 text-secondary-theme" />
                                    </button>
                                </div>
                                <GuideBox 
                                    title="Guía: Personalidad de la IA" 
                                    summary="Define el tono, voz y alma de tu clínica."
                                >
                                    <p>La <b>personalidad</b> determina cómo se siente hablar con tu clínica. Una buena personalidad genera confianza y cercanía inmediata.</p>
                                    <div className="bg-white p-3 rounded-soft border border-theme">
                                        <p className="font-bold mb-1.5 flex items-center gap-1.5 text-[var(--accent-primary)] text-[11px]">
                                            <Check className="w-3.5 h-3.5" /> EJEMPLO RECOMENDADO:
                                        </p>
                                        <p className="italic text-[11.5px] leading-relaxed text-[#0B0B0F]">"Eres un asesor experto en estética médica. Habla de manera empática pero profesional. Usa 'nosotros' para referirte a la clínica y enfócate siempre en resolver dudas sobre bienestar."</p>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10.5px]">
                                        <div className="p-2 bg-white rounded border border-theme text-[#0B0B0F]">
                                            <b className="text-[var(--accent-primary)]">🎩 Formal:</b> Ideal para clínicas quirúrgicas o de alta complejidad.
                                        </div>
                                        <div className="p-2 bg-white rounded border border-theme text-[#0B0B0F]">
                                            <b className="text-[var(--accent-primary)]">✨ Cercana:</b> Ideal para centros de estética, spas o kinesiología.
                                        </div>
                                    </div>
                                </GuideBox>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-primary-theme">Instrucciones de Comportamiento</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-secondary-theme">{behaviorRules.length} caracteres</span>
                                        <button 
                                            onClick={() => setExpandedEditor('behavior')}
                                            className="p-1.5 hover:bg-secondary-theme rounded-md transition-colors text-secondary-theme group"
                                            title="Expandir"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5 group-hover:text-[var(--accent-primary)]" />
                                        </button>
                                    </div>
                                </div>
                                <div className="relative group/textarea">
                                    <textarea
                                        value={behaviorRules}
                                        onChange={(e) => setBehaviorRules(e.target.value)}
                                        placeholder={`Instrucciones específicas de atención:\n- Saluda siempre preguntando el nombre si no lo sabes.\n- Si te preguntan por precios, redirige a la tabla de servicios.\n- Si el cliente está molesto, escala a un humano inmediatamente.`}
                                        rows={8}
                                        className="input-premium w-full resize-none font-mono text-sm leading-relaxed"
                                    />
                                    <button 
                                        onClick={() => setExpandedEditor('behavior')}
                                        className="absolute bottom-3 right-3 p-2 bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-theme rounded-lg opacity-0 group-hover/textarea:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Maximize2 className="w-4 h-4 text-secondary-theme" />
                                    </button>
                                </div>
                                <GuideBox 
                                    title="Guía: Reglas de Atención" 
                                    summary="Reglas tácticas para manejar conversaciones."
                                >
                                    <p>Las <b>reglas de comportamiento</b> dictan qué debe (y qué no) hacer el bot en situaciones críticas de atención al cliente.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                        <div className="bg-emerald-500/10 p-2.5 rounded-soft border border-emerald-500/20">
                                            <p className="font-bold text-emerald-500 text-[10px] uppercase tracking-wider mb-1.5">✅ LO QUE SÍ DEBE HACER:</p>
                                            <ul className="text-[10.5px] space-y-1 text-emerald-500/80">
                                                <li>• Saludar preguntando el nombre.</li>
                                                <li>• Sugerir cita ante cualquier interés.</li>
                                                <li>• Usar emojis de bienestar (✨💆‍♀️).</li>
                                                <li>• Confirmar disponibilidad antes de citar.</li>
                                            </ul>
                                        </div>
                                        <div className="bg-red-500/10 p-2.5 rounded-soft border border-red-500/20">
                                            <p className="font-bold text-red-500 text-[10px] uppercase tracking-wider mb-1.5">❌ LO QUE NO DEBE HACER:</p>
                                            <ul className="text-[10.5px] space-y-1 text-red-500/80">
                                                <li>• No dar precios sin explicar el valor.</li>
                                                <li>• No discutir ni usar lenguaje técnico.</li>
                                                <li>• No prometer resultados médicos finales.</li>
                                                <li>• No agendar sin el abono requerido.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </GuideBox>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-primary-theme">Datos Oficiales (Transferencia / Pagos)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-secondary-theme">{transferDetails.length} caracteres</span>
                                    <button 
                                        onClick={() => setExpandedEditor('transfer')}
                                        className="p-1.5 hover:bg-secondary-theme rounded-md transition-colors text-secondary-theme group"
                                        title="Expandir"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5 group-hover:text-[var(--accent-primary)]" />
                                    </button>
                                </div>
                            </div>
                            <div className="relative group/textarea">
                                <textarea
                                    value={transferDetails}
                                    onChange={(e) => setTransferDetails(e.target.value)}
                                    placeholder={`Ej: Datos para el abono de reserva ($15.000):\n- Nombre: [Nombre del Titular]\n- RUT: [12.345.678-9]\n- Banco: [Nombre del Banco]\n- Tipo de Cuenta: [Corriente/Vista]\n- Número de Cuenta: [1234567890]\n- Email: pagos@tuclínica.com`}
                                    rows={6}
                                    className="input-premium w-full resize-none font-mono text-sm leading-relaxed"
                                />
                                <button 
                                    onClick={() => setExpandedEditor('transfer')}
                                    className="absolute bottom-3 right-3 p-2 bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-theme rounded-lg opacity-0 group-hover/textarea:opacity-100 transition-opacity shadow-lg"
                                >
                                    <Maximize2 className="w-4 h-4 text-secondary-theme" />
                                </button>
                            </div>
                            <GuideBox 
                                title="Guía: Pagos y Datos de Transferencia" 
                                summary="Configura la información bancaria oficial para reservas."
                            >
                                <p>Esta información es <b>crítica</b> para cerrar procesos de reserva. El bot solo la entrega cuando el paciente ya está listo para pagar o confirmar una cita.</p>
                                <div className="bg-white p-3 rounded-soft border border-silk-beige/30 mt-2">
                                    <p className="font-bold mb-2 flex items-center gap-1.5 text-amber-700 text-[11px] uppercase tracking-wider">
                                        <Info className="w-3.5 h-3.5" /> Datos recomendados:
                                    </p>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-[#0B0B0F] font-medium">
                                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 bg-amber-400 rounded-full" /> Nombre del Titular</li>
                                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 bg-amber-400 rounded-full" /> RUT de la Empresa/Persona</li>
                                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 bg-amber-400 rounded-full" /> Banco y Tipo de Cuenta</li>
                                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 bg-amber-400 rounded-full" /> Número de Cuenta</li>
                                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 bg-amber-400 rounded-full" /> Link de pago (Transbank/Flow)</li>
                                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 bg-amber-400 rounded-full" /> Política de Devoluciones</li>
                                    </ul>
                                </div>
                                <div className="bg-white p-3 rounded-soft border border-silk-beige/20 flex items-center gap-2 mt-4">
                                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                                    <p className="text-[10px] text-[#0B0B0F] italic font-medium leading-relaxed">
                                        Tip: Incluir un email para comprobantes acelera la validación manual por parte de tu equipo.
                                    </p>
                                </div>
                            </GuideBox>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSaveMasterPrompt}
                                disabled={savingPrompt}
                                className="btn-premium-primary flex items-center gap-2"
                            >
                                {savingPrompt ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Guardar Prompt</>
                                )}
                            </button>
                            {promptSaved && (
                                <div className="flex items-center gap-2 text-emerald-600 text-sm animate-fade-in bg-emerald-50 px-3 py-1.5 rounded-soft">
                                    <CheckCircle2 className="w-4 h-4" />
                                    ¡Guardado!
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-premium p-5 flex items-center justify-between group hover:shadow-[0_0_20px_var(--glow)] transition-all">
                    <div>
                        <p className="text-xs font-medium text-secondary-theme uppercase tracking-wider">Total Documentos</p>
                        <p className="text-3xl font-bold text-primary-theme mt-1">{totalDocs}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>
                <div className="card-premium p-5 flex items-center justify-between group hover:shadow-[0_0_20px_var(--glow)] transition-all">
                    <div>
                        <p className="text-xs font-medium text-secondary-theme uppercase tracking-wider">Sincronizados</p>
                        <p className="text-3xl font-bold text-emerald-500 mt-1">{syncedDocs}</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
                <div className="card-premium p-5 flex items-center justify-between group hover:shadow-[0_0_20px_var(--glow)] transition-all">
                    <div>
                        <p className="text-xs font-medium text-secondary-theme uppercase tracking-wider">Pendientes</p>
                        <p className="text-3xl font-bold text-amber-500 mt-1">{pendingDocs}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>
                <div className="card-premium p-5 flex items-center justify-between group hover:shadow-[0_0_20px_var(--glow)] transition-all">
                    <div>
                        <p className="text-xs font-medium text-secondary-theme uppercase tracking-wider">Categorías</p>
                        <p className="text-3xl font-bold text-violet-500 mt-1">{uniqueCategories}</p>
                    </div>
                    <div className="w-10 h-10 bg-violet-500/10 rounded-full flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
                        <Tag className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="mt-8 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] rounded-soft flex items-center justify-center shadow-lg shrink-0 border border-[#BF953F]/20">
                    <BookOpen className="w-5 h-5 text-black" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-primary-theme">Documentos de Conocimiento</h2>
                    <GuideBox 
                        title="Guía: Tu Biblioteca Técnica" 
                        summary="Usa esto como el cerebro estático de la IA."
                    >
                        <p>Aquí vive toda la información técnica que no cambia seguido. El Agente IA la consultará como una enciclopedia antes de responder.</p>
                        <div className="bg-white p-4 rounded-soft border border-silk-beige/30 flex gap-4 mt-2">
                            <div className="bg-violet-100 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                                <FileText className="w-6 h-6 text-violet-600" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-[13px] text-[#0B0B0F]">¿Qué es ideal subir aquí?</p>
                                <p className="text-[11px] text-[#0B0B0F] leading-relaxed font-medium">
                                    Listas de precios detalladas, descripción de cada tratamiento, horarios de todas las sucursales, ubicación exacta con links a Google Maps y una lista de preguntas frecuentes (FAQ) con sus respuestas ideales.
                                </p>
                            </div>
                        </div>
                    </GuideBox>
                </div>
            </div>

            <div className="card-premium p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-theme" />
                        <input
                            type="text"
                            placeholder="Buscar por título o contenido..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium w-full pl-10 placeholder:text-secondary-theme"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="input-premium min-w-[180px]"
                    >
                        <option value="all">Todas las categorías</option>
                        {CATEGORY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input-premium min-w-[120px]"
                    >
                        <option value="all">Todos</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>
            </div>

            {/* Documents Grid */}
            {filteredDocuments.length === 0 ? (
                <div className="card-premium p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-secondary-theme rounded-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-secondary-theme" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-primary-theme mb-1">
                                {documents.length === 0 ? 'Sin documentos aún' : 'Sin resultados'}
                            </h3>
                            <p className="text-secondary-theme text-sm max-w-sm mx-auto">
                                {documents.length === 0
                                    ? 'Crea tu primer documento de conocimiento para que tu agente IA pueda responder mejor a tus clientes.'
                                    : 'No se encontraron documentos con los filtros seleccionados.'}
                            </p>
                        </div>
                        {documents.length === 0 && (
                            <button onClick={openNewModal} className="btn-premium-primary flex items-center gap-2 mt-2">
                                <Plus className="w-4 h-4" />
                                Crear primer documento
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocuments.map((doc) => {
                        const catColor = getCategoryColor(doc.category)
                        const catLabel = CATEGORY_OPTIONS.find(o => o.value === doc.category)?.label || doc.category

                        return (
                            <div
                                key={doc.id}
                                className={cn(
                                    'card-premium p-5 hover:shadow-[0_0_20px_var(--glow)] transition-all duration-200 cursor-pointer group relative',
                                    doc.status === 'inactive' && 'opacity-60'
                                )}
                                onClick={() => openEditModal(doc)}
                            >
                                {/* Category Badge */}
                                <div className="mb-3">
                                    <span className={cn(
                                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                                        catColor.bg, catColor.text, catColor.border
                                    )}>
                                        {catLabel}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="font-bold text-primary-theme text-base mb-2 line-clamp-1 group-hover:text-[#FF2E88] transition-colors">
                                    {doc.title}
                                </h3>

                                {/* Content Preview */}
                                <p className="text-sm text-secondary-theme line-clamp-3 mb-4 leading-relaxed font-medium">
                                    {doc.content}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-theme">
                                    <div className="flex items-center gap-1.5">
                                        {doc.sync_status === 'synced' ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        )}
                                        <span className={cn(
                                            'text-xs font-medium',
                                            doc.sync_status === 'synced' ? 'text-emerald-500' : 'text-amber-500'
                                        )}>
                                            {doc.sync_status === 'synced' ? 'Sincronizado' : 'Pendiente'}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        'text-xs font-medium px-2 py-0.5 rounded-full',
                                        doc.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-secondary-theme text-secondary-theme'
                                    )}>
                                        {doc.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>

                                {/* Quick Actions (on hover) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleToggleStatus(doc)
                                        }}
                                        className="p-1.5 rounded-soft hover:bg-secondary-theme transition-colors"
                                        title={doc.status === 'active' ? 'Desactivar' : 'Activar'}
                                    >
                                        {doc.status === 'active' ? (
                                            <ToggleRight className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setDeleteConfirm(doc.id)
                                        }}
                                        className="p-1.5 rounded-soft hover:bg-red-500/10 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-primary-theme rounded-softer border border-theme shadow-[0_0_50px_rgba(0,0,0,0.3)] w-full max-w-sm animate-scale-in p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center shadow-inner">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-primary-theme">¿Eliminar documento?</h3>
                        </div>
                        <p className="text-sm text-secondary-theme mb-6 leading-relaxed">
                            Esta acción no se puede deshacer. El documento será eliminado permanentemente de la base de conocimiento.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-secondary-theme hover:text-primary-theme transition-colors font-medium">
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-95"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-primary-theme rounded-softer border border-theme shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-2xl animate-scale-in max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-theme">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-[var(--gradient-primary)] rounded-full flex items-center justify-center shadow-lg">
                                    {editingDoc ? (
                                        <Edit3 className="w-6 h-6 text-white" />
                                    ) : (
                                        <Plus className="w-6 h-6 text-white" />
                                    )}
                                </div>
                                <h2 className="text-2xl font-bold text-primary-theme">
                                    {editingDoc ? 'Editar Documento' : 'Nuevo Documento'}
                                </h2>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-secondary-theme rounded-full transition-colors text-secondary-theme"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                            <div>
                                <label className="block text-sm font-black uppercase tracking-widest text-secondary-theme mb-2">
                                    Título *
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ej: Precios y Planes"
                                    className="input-premium w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-black uppercase tracking-widest text-secondary-theme mb-2">
                                        Categoría
                                    </label>
                                    <select
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        className="input-premium w-full"
                                    >
                                        {CATEGORY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-black uppercase tracking-widest text-secondary-theme mb-2">
                                        Estado
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                                        className="input-premium w-full"
                                    >
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-black uppercase tracking-widest text-secondary-theme mb-2">
                                    Contenido *
                                </label>
                                <textarea
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    placeholder="Escribe aquí la información que el agente IA utilizará para responder a los clientes...&#10;&#10;Ejemplo:&#10;- Plan Básico: $99/mes — Incluye 100 conversaciones&#10;- Plan Pro: $199/mes — Incluye 500 conversaciones&#10;- Plan Enterprise: Contactar para precio"
                                    rows={12}
                                    className="input-premium w-full resize-none font-mono text-sm leading-relaxed"
                                />
                                <p className="text-xs text-secondary-theme/60 mt-2">
                                    💡 Escribe la información de forma clara y estructurada. El agente IA usará este texto como referencia para responder consultas.
                                </p>
                            </div>

                            {/* File upload inside modal */}
                            <div className="p-4 border-2 border-dashed border-theme rounded-softer bg-secondary-theme/30 hover:bg-secondary-theme/50 transition-colors">
                                <label className="flex flex-col items-center gap-2 cursor-pointer">
                                    <Upload className="w-6 h-6 text-secondary-theme" />
                                    <span className="text-sm text-secondary-theme">
                                        O arrastra un archivo de texto (.txt, .md, .csv, .json)
                                    </span>
                                    <input
                                        type="file"
                                        accept=".txt,.md,.csv,.json"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-between items-center p-6 border-t border-theme">
                            <div>
                                {editingDoc && (
                                    <button
                                        onClick={() => {
                                            setDeleteConfirm(editingDoc.id)
                                            closeModal()
                                        }}
                                        className="text-sm text-red-500 hover:text-red-600 font-bold underline decoration-red-200 hover:decoration-red-500 underline-offset-4 transition-all"
                                    >
                                        Eliminar documento
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={closeModal} className="px-4 py-2 text-secondary-theme hover:text-primary-theme transition-colors font-medium">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !formTitle.trim() || !formContent.trim()}
                                    className="btn-premium-primary flex items-center gap-2"
                                >
                                    {saving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> {editingDoc ? 'Guardar Cambios' : 'Crear Documento'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Fullscreen Prompt Editor */}
            {expandedEditor && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex flex-col animate-in fade-in duration-300">
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[var(--gradient-primary)] rounded-2xl flex items-center justify-center shadow-2xl">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">
                                    {expandedEditor === 'personality' && 'Master Prompt (Personalidad)'}
                                    {expandedEditor === 'behavior' && 'Instrucciones de Comportamiento'}
                                    {expandedEditor === 'transfer' && 'Datos de Transferencia'}
                                </h2>
                                <p className="text-white/60 text-sm font-medium">
                                    Editando en modo de alta visibilidad
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSaveMasterPrompt}
                                disabled={savingPrompt}
                                className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-2 shadow-xl"
                            >
                                {savingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Cambios
                            </button>
                            <button
                                onClick={() => setExpandedEditor(null)}
                                className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white group"
                            >
                                <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-8 overflow-hidden flex flex-col max-w-6xl mx-auto w-full gap-6">
                        <div className="flex-1 bg-black/40 rounded-[32px] border border-white/10 p-1 overflow-hidden group focus-within:border-[var(--accent-primary)]/50 transition-colors shadow-2xl">
                            <textarea
                                value={
                                    expandedEditor === 'personality' ? masterPrompt :
                                    expandedEditor === 'behavior' ? behaviorRules :
                                    transferDetails
                                }
                                onChange={(e) => {
                                    if (expandedEditor === 'personality') setMasterPrompt(e.target.value)
                                    else if (expandedEditor === 'behavior') setBehaviorRules(e.target.value)
                                    else setTransferDetails(e.target.value)
                                }}
                                autoFocus
                                className="w-full h-full bg-transparent text-white p-8 focus:outline-none resize-none font-mono text-lg leading-relaxed custom-scrollbar"
                                placeholder="Escribe aquí las instrucciones detalladas..."
                            />
                        </div>
                        
                        <div className="flex items-center justify-between text-white/40 font-medium text-sm px-4">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                                    <span>Guardado automático local</span>
                                </div>
                                <span>{
                                    (expandedEditor === 'personality' ? masterPrompt :
                                     expandedEditor === 'behavior' ? behaviorRules :
                                     transferDetails).length
                                } caracteres</span>
                            </div>
                            <p className="italic">Presiona Esc para salir del editor</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

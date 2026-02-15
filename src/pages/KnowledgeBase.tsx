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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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

    // AI Master Prompt state
    const [masterPrompt, setMasterPrompt] = useState('')
    const [savingPrompt, setSavingPrompt] = useState(false)
    const [promptSaved, setPromptSaved] = useState(false)
    const [showPromptSection, setShowPromptSection] = useState(true)

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
                .select('ai_personality')
                .eq('id', profile.clinic_id)
                .single()
            if (data?.ai_personality) setMasterPrompt(data.ai_personality)
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
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.clinic_id)
            if (error) throw error
            setPromptSaved(true)
            setTimeout(() => setPromptSaved(false), 3000)
        } catch (e) {
            console.error('Error saving master prompt:', e)
            alert('Error al guardar el prompt. Inténtalo de nuevo.')
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
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <p className="text-charcoal/50">Cargando base de conocimiento...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-soft flex items-center justify-center shadow-lg">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-charcoal">Base de Conocimiento</h1>
                        <p className="text-charcoal/50 text-sm mt-1">
                            Administra la información que tu agente IA utiliza para responder a los clientes.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-silk-beige rounded-soft text-sm text-charcoal hover:bg-silk-beige/50 transition-colors cursor-pointer">
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
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo
                    </button>
                </div>
            </div>

            {/* AI Agent Master Prompt Section */}
            <div className="card-soft overflow-hidden">
                <button
                    onClick={() => setShowPromptSection(!showPromptSection)}
                    className="w-full p-5 flex items-center justify-between hover:bg-ivory/50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-soft flex items-center justify-center shadow-md">
                            <Bot className="w-5.5 h-5.5 text-white" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-semibold text-charcoal flex items-center gap-2">
                                Agente IA
                                <Sparkles className="w-4 h-4 text-violet-500" />
                            </h2>
                            <p className="text-sm text-charcoal/50">Master Prompt — Define la personalidad y comportamiento de tu asistente</p>
                        </div>
                    </div>
                    <svg className={`w-5 h-5 text-charcoal/40 transition-transform ${showPromptSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {showPromptSection && (
                    <div className="px-5 pb-5 space-y-4 border-t border-silk-beige/50">
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-charcoal">Prompt del Sistema</label>
                                <span className="text-xs text-charcoal/40">{masterPrompt.length} caracteres</span>
                            </div>
                            <textarea
                                value={masterPrompt}
                                onChange={(e) => setMasterPrompt(e.target.value)}
                                placeholder={`Ej: Eres un asistente amable y profesional para una clínica estética.\n\nReglas:\n- Responde de manera cordial, breve y clara\n- Nunca inventes horarios o servicios que no existan\n- Usa emojis con moderación para dar calidez\n- Siempre sugiere agendar una cita cuando el paciente muestre interés\n- Si no sabes algo, ofrece comunicar al paciente con el equipo humano`}
                                rows={8}
                                className="input-soft w-full resize-none font-mono text-sm leading-relaxed"
                            />
                            <p className="text-xs text-charcoal/40 mt-2">
                                💡 Este prompt define cómo se comporta tu asistente IA en todas las conversaciones de WhatsApp. Sé específico sobre el tono, las reglas y el estilo de comunicación.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSaveMasterPrompt}
                                disabled={savingPrompt}
                                className="btn-primary flex items-center gap-2"
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
                <div className="card-soft p-5 flex items-center justify-between group hover:shadow-premium transition-shadow">
                    <div>
                        <p className="text-xs font-medium text-charcoal/50 uppercase tracking-wider">Total Documentos</p>
                        <p className="text-3xl font-bold text-charcoal mt-1">{totalDocs}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>
                <div className="card-soft p-5 flex items-center justify-between group hover:shadow-premium transition-shadow">
                    <div>
                        <p className="text-xs font-medium text-charcoal/50 uppercase tracking-wider">Sincronizados</p>
                        <p className="text-3xl font-bold text-emerald-600 mt-1">{syncedDocs}</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
                <div className="card-soft p-5 flex items-center justify-between group hover:shadow-premium transition-shadow">
                    <div>
                        <p className="text-xs font-medium text-charcoal/50 uppercase tracking-wider">Pendientes</p>
                        <p className="text-3xl font-bold text-amber-600 mt-1">{pendingDocs}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>
                <div className="card-soft p-5 flex items-center justify-between group hover:shadow-premium transition-shadow">
                    <div>
                        <p className="text-xs font-medium text-charcoal/50 uppercase tracking-wider">Categorías</p>
                        <p className="text-3xl font-bold text-violet-600 mt-1">{uniqueCategories}</p>
                    </div>
                    <div className="w-10 h-10 bg-violet-50 rounded-full flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
                        <Tag className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="card-soft p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                        <input
                            type="text"
                            placeholder="Buscar por título o contenido..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-soft w-full pl-10"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="input-soft min-w-[180px]"
                    >
                        <option value="all">Todas las categorías</option>
                        {CATEGORY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input-soft min-w-[120px]"
                    >
                        <option value="all">Todos</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>
            </div>

            {/* Documents Grid */}
            {filteredDocuments.length === 0 ? (
                <div className="card-soft p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-silk-beige/30 rounded-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-charcoal/30" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-charcoal mb-1">
                                {documents.length === 0 ? 'Sin documentos aún' : 'Sin resultados'}
                            </h3>
                            <p className="text-charcoal/50 text-sm max-w-sm mx-auto">
                                {documents.length === 0
                                    ? 'Crea tu primer documento de conocimiento para que tu agente IA pueda responder mejor a tus clientes.'
                                    : 'No se encontraron documentos con los filtros seleccionados.'}
                            </p>
                        </div>
                        {documents.length === 0 && (
                            <button onClick={openNewModal} className="btn-primary flex items-center gap-2 mt-2">
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
                                    'card-soft p-5 hover:shadow-premium transition-all duration-200 cursor-pointer group relative',
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
                                <h3 className="font-semibold text-charcoal text-base mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
                                    {doc.title}
                                </h3>

                                {/* Content Preview */}
                                <p className="text-sm text-charcoal/60 line-clamp-3 mb-4 leading-relaxed">
                                    {doc.content}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-silk-beige/50">
                                    <div className="flex items-center gap-1.5">
                                        {doc.sync_status === 'synced' ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        )}
                                        <span className={cn(
                                            'text-xs font-medium',
                                            doc.sync_status === 'synced' ? 'text-emerald-600' : 'text-amber-600'
                                        )}>
                                            {doc.sync_status === 'synced' ? 'Sincronizado' : 'Pendiente'}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        'text-xs font-medium px-2 py-0.5 rounded-full',
                                        doc.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-gray-100 text-gray-500'
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
                                        className="p-1.5 rounded-soft hover:bg-ivory transition-colors"
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
                                        className="p-1.5 rounded-soft hover:bg-red-50 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-soft shadow-premium-lg w-full max-w-sm animate-scale-in p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-charcoal">¿Eliminar documento?</h3>
                        </div>
                        <p className="text-sm text-charcoal/60 mb-6">
                            Esta acción no se puede deshacer. El documento será eliminado permanentemente de la base de conocimiento.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="btn-ghost">
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 bg-red-500 text-white rounded-soft text-sm font-medium hover:bg-red-600 transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-soft shadow-premium-lg w-full max-w-2xl animate-scale-in max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-silk-beige">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                                    {editingDoc ? (
                                        <Edit3 className="w-5 h-5 text-primary-500" />
                                    ) : (
                                        <Plus className="w-5 h-5 text-primary-500" />
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-charcoal">
                                    {editingDoc ? 'Editar Documento' : 'Nuevo Documento'}
                                </h2>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-ivory rounded-soft transition-colors"
                            >
                                <X className="w-5 h-5 text-charcoal/50" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-2">
                                    Título *
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ej: Precios y Planes"
                                    className="input-soft w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal mb-2">
                                        Categoría
                                    </label>
                                    <select
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        className="input-soft w-full"
                                    >
                                        {CATEGORY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal mb-2">
                                        Estado
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                                        className="input-soft w-full"
                                    >
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-2">
                                    Contenido *
                                </label>
                                <textarea
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    placeholder="Escribe aquí la información que el agente IA utilizará para responder a los clientes...&#10;&#10;Ejemplo:&#10;- Plan Básico: $99/mes — Incluye 100 conversaciones&#10;- Plan Pro: $199/mes — Incluye 500 conversaciones&#10;- Plan Enterprise: Contactar para precio"
                                    rows={12}
                                    className="input-soft w-full resize-none font-mono text-sm leading-relaxed"
                                />
                                <p className="text-xs text-charcoal/40 mt-2">
                                    💡 Escribe la información de forma clara y estructurada. El agente IA usará este texto como referencia para responder consultas.
                                </p>
                            </div>

                            {/* File upload inside modal */}
                            <div className="p-4 border-2 border-dashed border-silk-beige rounded-soft bg-ivory/30 hover:bg-ivory/60 transition-colors">
                                <label className="flex flex-col items-center gap-2 cursor-pointer">
                                    <Upload className="w-6 h-6 text-charcoal/40" />
                                    <span className="text-sm text-charcoal/60">
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
                        <div className="flex justify-between items-center p-6 border-t border-silk-beige">
                            <div>
                                {editingDoc && (
                                    <button
                                        onClick={() => {
                                            setDeleteConfirm(editingDoc.id)
                                            closeModal()
                                        }}
                                        className="text-sm text-red-500 hover:text-red-700 font-medium underline decoration-red-200 hover:decoration-red-500 underline-offset-4 transition-all"
                                    >
                                        Eliminar documento
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={closeModal} className="btn-ghost">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !formTitle.trim() || !formContent.trim()}
                                    className="btn-primary flex items-center gap-2"
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
        </div>
    )
}

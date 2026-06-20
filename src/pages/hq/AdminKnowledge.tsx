import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Plus, Pencil, Trash2, X, Search, Loader2 } from 'lucide-react'

const HQ_ID = '00000000-0000-0000-0000-000000000000'

const CATEGORY_OPTIONS = [
    { value: 'general', label: 'General' },
    { value: 'producto', label: 'Producto' },
    { value: 'precios', label: 'Precios' },
    { value: 'objeciones', label: 'Objeciones' },
    { value: 'casos_exito', label: 'Casos de Éxito' },
    { value: 'faq', label: 'Preguntas Frecuentes' },
]

const CATEGORY_COLOR: Record<string, string> = {
    general: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    producto: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    precios: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    objeciones: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    casos_exito: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    faq: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
}

interface Doc { id: string; title: string; content: string; category: string }

export default function AdminKnowledge() {
    const [docs, setDocs] = useState<Doc[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Doc | null>(null)
    const [formTitle, setFormTitle] = useState('')
    const [formContent, setFormContent] = useState('')
    const [formCategory, setFormCategory] = useState('general')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const fetchDocs = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('knowledge_base')
            .select('id, title, content, category')
            .eq('clinic_id', HQ_ID)
            .order('category', { ascending: true })
        if (!error) setDocs((data as Doc[]) || [])
        setLoading(false)
    }

    useEffect(() => { fetchDocs() }, [])

    const openNew = () => {
        setEditing(null); setFormTitle(''); setFormContent(''); setFormCategory('general'); setError(''); setModalOpen(true)
    }
    const openEdit = (doc: Doc) => {
        setEditing(doc); setFormTitle(doc.title); setFormContent(doc.content); setFormCategory(doc.category); setError(''); setModalOpen(true)
    }

    const handleSave = async () => {
        if (!formTitle.trim() || !formContent.trim()) { setError('Título y contenido son obligatorios.'); return }
        setSaving(true); setError('')
        try {
            if (editing) {
                const { error } = await (supabase as any).from('knowledge_base')
                    .update({ title: formTitle.trim(), content: formContent.trim(), category: formCategory })
                    .eq('id', editing.id)
                if (error) throw error
            } else {
                const { error } = await (supabase as any).from('knowledge_base')
                    .insert({ clinic_id: HQ_ID, title: formTitle.trim(), content: formContent.trim(), category: formCategory })
                if (error) throw error
            }
            setModalOpen(false)
            await fetchDocs()
        } catch (e: any) {
            setError(e.message || 'No se pudo guardar.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (doc: Doc) => {
        if (!confirm(`¿Eliminar "${doc.title}"?`)) return
        const { error } = await (supabase as any).from('knowledge_base').delete().eq('id', doc.id)
        if (!error) setDocs(d => d.filter(x => x.id !== doc.id))
    }

    const filtered = docs.filter(d =>
        (filterCat === 'all' || d.category === filterCat) &&
        (d.title.toLowerCase().includes(search.toLowerCase()) || d.content.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <BookOpen className="w-7 h-7 text-[#FF2E88]" /> Base de Conocimiento
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Lo que sabe el agente de ventas de HQ: producto, precios, objeciones y casos de éxito.</p>
                </div>
                <button onClick={openNew} className="inline-flex items-center gap-2 bg-[#FF2E88] hover:bg-[#e0007a] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0">
                    <Plus className="w-5 h-5" /> Nuevo documento
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en la base de conocimiento..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2E88]" />
                </div>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FF2E88]">
                    <option value="all">Todas las categorías</option>
                    {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#FF2E88] animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/50 border border-gray-700 rounded-2xl">
                    <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">{docs.length === 0 ? 'Aún no hay documentos. Crea el primero para entrenar al agente de ventas.' : 'Sin resultados para ese filtro.'}</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filtered.map(doc => (
                        <div key={doc.id} className="bg-gray-800 border border-gray-700 rounded-2xl p-5 hover:border-gray-600 transition-colors">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <h3 className="text-white font-bold truncate">{doc.title}</h3>
                                    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_COLOR[doc.category] || CATEGORY_COLOR.general}`}>
                                        {CATEGORY_OPTIONS.find(c => c.value === doc.category)?.label || doc.category}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEdit(doc)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(doc)} className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm whitespace-pre-wrap line-clamp-3">{doc.content}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                            <h2 className="text-lg font-bold text-white">{editing ? 'Editar documento' : 'Nuevo documento'}</h2>
                            <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Título</label>
                                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ej: Planes y precios"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2E88]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Categoría</label>
                                <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FF2E88]">
                                    {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Contenido</label>
                                <textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={10} placeholder="Escribe la información que el agente debe conocer..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2E88] resize-y" />
                            </div>
                            {error && <p className="text-rose-400 text-sm">{error}</p>}
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl text-gray-300 hover:bg-gray-800 transition-colors">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-[#FF2E88] hover:bg-[#e0007a] disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? 'Guardar cambios' : 'Crear documento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

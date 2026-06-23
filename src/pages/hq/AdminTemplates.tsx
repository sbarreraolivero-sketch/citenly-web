import { useState, useEffect } from 'react'
import { retentionService, YCloudTemplate } from '@/services/retentionService'
import { MessageSquareText, Plus, Trash2, X, Search, Loader2, RefreshCw, AlertCircle } from 'lucide-react'

const HQ_ID = '00000000-0000-0000-0000-000000000000'

const CATEGORY_OPTIONS = [
    { value: 'UTILITY', label: 'Utilidad (recordatorios, avisos)' },
    { value: 'MARKETING', label: 'Marketing (promos, seguimiento)' },
]

const statusBadge = (status: string) => {
    const s = (status || '').toUpperCase()
    if (s === 'APPROVED') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    if (s === 'REJECTED' || s === 'DISABLED' || s === 'PAUSED') return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30' // PENDING, IN_APPEAL, etc.
}
const statusLabel = (status: string) => {
    const s = (status || '').toUpperCase()
    if (s === 'APPROVED') return 'Aprobada'
    if (s === 'PENDING' || s === 'PENDING_DELETION') return 'En revisión'
    if (s === 'REJECTED') return 'Rechazada'
    return status || '—'
}

export default function AdminTemplates() {
    const [templates, setTemplates] = useState<YCloudTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [search, setSearch] = useState('')

    const [modalOpen, setModalOpen] = useState(false)
    const [name, setName] = useState('')
    const [category, setCategory] = useState('UTILITY')
    const [body, setBody] = useState('')
    const [examples, setExamples] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [deleting, setDeleting] = useState<string | null>(null)

    const fetchTemplates = async () => {
        setLoading(true); setLoadError('')
        try {
            const list = await retentionService.getRemoteTemplates(HQ_ID)
            setTemplates(list || [])
        } catch (e: any) {
            setLoadError(e.message || 'No se pudieron cargar las plantillas. Revisa que el número de ventas tenga la API key de YCloud configurada.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTemplates() }, [])

    // Variables {{1}}, {{2}}... detectadas en el cuerpo (Meta exige un ejemplo por variable para aprobar)
    const vars = Array.from(new Set((body.match(/\{\{(\d+)\}\}/g) || []).map(m => m.replace(/[{}]/g, '')))).sort((a, b) => +a - +b)

    const openNew = () => {
        setName(''); setCategory('UTILITY'); setBody(''); setExamples({}); setError(''); setModalOpen(true)
    }

    const handleCreate = async () => {
        const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
        if (!cleanName || !body.trim()) { setError('Nombre y cuerpo son obligatorios.'); return }
        const missing = vars.filter(v => !examples[v]?.trim())
        if (missing.length) { setError(`Falta un ejemplo para la variable {{${missing[0]}}}.`); return }
        setSaving(true); setError('')
        try {
            const exampleArr = vars.map(v => examples[v].trim())
            await retentionService.createRemoteTemplate(HQ_ID, cleanName, body.trim(), undefined, exampleArr)
            setModalOpen(false)
            await fetchTemplates()
        } catch (e: any) {
            setError(e.message || 'No se pudo crear la plantilla.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (t: YCloudTemplate) => {
        if (!confirm(`¿Eliminar la plantilla "${t.name}"? Esta acción la borra de YCloud/Meta.`)) return
        setDeleting(t.name)
        try {
            await retentionService.deleteRemoteTemplate(HQ_ID, t.name)
            setTemplates(prev => prev.filter(x => x.name !== t.name))
        } catch (e: any) {
            alert(e.message || 'No se pudo eliminar.')
        } finally {
            setDeleting(null)
        }
    }

    const filtered = templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.body || '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <MessageSquareText className="w-7 h-7 text-[#FF2E88]" /> Plantillas
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Plantillas de WhatsApp del número de ventas. Necesarias para recordatorios y mensajes fuera de la ventana de 24h.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={fetchTemplates} className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold px-3.5 py-2.5 rounded-xl transition-colors">
                        <RefreshCw className="w-4 h-4" /> Sincronizar
                    </button>
                    <button onClick={openNew} className="inline-flex items-center gap-2 bg-[#FF2E88] hover:bg-[#e0007a] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">
                        <Plus className="w-5 h-5" /> Nueva plantilla
                    </button>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar plantilla..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2E88]" />
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#FF2E88] animate-spin" /></div>
            ) : loadError ? (
                <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-rose-200">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{loadError}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/50 border border-gray-700 rounded-2xl">
                    <MessageSquareText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">{templates.length === 0 ? 'Aún no hay plantillas. Crea la primera (ej: recordatorio de videollamada).' : 'Sin resultados.'}</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {filtered.map(t => (
                        <div key={t.id || t.name} className="bg-gray-800 border border-gray-700 rounded-2xl p-5 hover:border-gray-600 transition-colors flex flex-col">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="min-w-0">
                                    <h3 className="text-white font-bold truncate" title={t.name}>{t.name}</h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusBadge(t.status)}`}>{statusLabel(t.status)}</span>
                                        <span className="text-[11px] text-gray-500 uppercase">{t.category} · {t.language}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(t)} disabled={deleting === t.name}
                                    className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-700 transition-colors disabled:opacity-50 shrink-0">
                                    {deleting === t.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-gray-400 text-sm whitespace-pre-wrap line-clamp-4 mt-1">{t.body || '—'}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal crear */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                            <h2 className="text-lg font-bold text-white">Nueva plantilla</h2>
                            <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre (interno)</label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="ej: recordatorio_videollamada"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2E88]" />
                                <p className="text-[11px] text-gray-500 mt-1">Solo minúsculas, números y guion bajo. Los espacios y símbolos se convierten en "_".</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Categoría</label>
                                <select value={category} onChange={e => setCategory(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FF2E88]">
                                    {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Cuerpo del mensaje</label>
                                <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
                                    placeholder={'Hola {{1}}, te recordamos tu videollamada con Citenly el {{2}} a las {{3}}. ¡Te esperamos! 🗓️'}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2E88] resize-y" />
                                <p className="text-[11px] text-gray-500 mt-1">Usa {'{{1}}'}, {'{{2}}'}… para los datos variables (nombre, fecha, hora).</p>
                            </div>
                            {vars.length > 0 && (
                                <div className="space-y-2 bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                                    <p className="text-sm font-medium text-gray-300">Ejemplos para cada variable <span className="text-gray-500 font-normal">(Meta los exige para aprobar)</span></p>
                                    {vars.map(v => (
                                        <div key={v} className="flex items-center gap-3">
                                            <span className="text-sm text-gray-400 w-12 shrink-0">{`{{${v}}}`}</span>
                                            <input value={examples[v] || ''} onChange={e => setExamples(p => ({ ...p, [v]: e.target.value }))}
                                                placeholder={v === '1' ? 'Elizabeth' : v === '2' ? 'martes 24 de junio' : '4:00 PM'}
                                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF2E88]" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {error && <p className="text-rose-400 text-sm">{error}</p>}
                            <p className="text-[11px] text-gray-500">La plantilla se envía a Meta para aprobación. Suele tardar de minutos a unas horas; aparecerá como "En revisión" hasta aprobarse.</p>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl text-gray-300 hover:bg-gray-800 transition-colors">Cancelar</button>
                            <button onClick={handleCreate} disabled={saving} className="inline-flex items-center gap-2 bg-[#FF2E88] hover:bg-[#e0007a] disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Crear y enviar a aprobación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

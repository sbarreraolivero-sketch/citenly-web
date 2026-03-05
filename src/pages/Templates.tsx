import { useState, useEffect } from 'react'
import { FileText, Plus, X, MessageSquare, Clock, ShieldAlert, CheckCircle2, Sparkles, Smartphone, Trash2 } from 'lucide-react'
import { retentionService, YCloudTemplate } from '@/services/retentionService'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Templates() {
    const { profile } = useAuth()
    const clinicId = profile?.clinic_id

    const [templates, setTemplates] = useState<YCloudTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [creatingTemplate, setCreatingTemplate] = useState(false)
    const [newTemplate, setNewTemplate] = useState<{ name: string, body: string, category: string, buttons: string[] }>({ name: '', body: '', category: 'MARKETING', buttons: [] })

    const loadTemplates = async () => {
        if (!clinicId) return
        try {
            setLoading(true)
            const remoteTemplates = await retentionService.getRemoteTemplates(clinicId)
            setTemplates(remoteTemplates)
        } catch (err) {
            console.error('Error loading templates:', err)
            // Error handling handled internally by service/toast usually, or we can toast here
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTemplates()
    }, [clinicId])

    const handleCreateTemplate = async () => {
        if (!clinicId) return
        setCreatingTemplate(true)
        try {
            const result = await retentionService.createRemoteTemplate(clinicId, newTemplate.name, newTemplate.body, newTemplate.buttons)
            toast.success('Plantilla enviada a WhatsApp para revisión')

            // Add to list optimistically
            const created: YCloudTemplate = {
                id: result.formatted_name,
                name: result.formatted_name,
                desc: newTemplate.body,
                status: 'PENDING',
                language: 'es',
                category: newTemplate.category,
                body: newTemplate.body
            }
            setTemplates([created, ...templates])
            setNewTemplate({ name: '', body: '', category: 'MARKETING', buttons: [] })
            setIsCreating(false)

        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Error al crear plantilla')
        } finally {
            setCreatingTemplate(false)
        }
    }

    const getStatusBadge = (status?: string) => {
        switch (status?.toUpperCase()) {
            case 'APPROVED':
                return <span className="px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Aprobada</span>
            case 'PENDING':
                return <span className="px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />En Revisión</span>
            case 'REJECTED':
                return <span className="px-2 py-1 text-[10px] font-bold bg-red-100 text-red-700 rounded-full flex items-center gap-1"><ShieldAlert className="w-3 h-3" />Rechazada</span>
            default:
                return null
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-charcoal">Plantillas de WhatsApp</h1>
                    <p className="text-sm text-charcoal/60 mt-1 max-w-2xl">
                        Gestiona los mensajes pre-aprobados que la IA utiliza para enviarle a tus pacientes.
                        Estas plantillas se comparten entre <span className="font-semibold text-charcoal">Recordatorios Automáticos</span>, <span className="font-semibold text-charcoal">Campañas de Marketing</span> y el <span className="font-semibold text-charcoal">Motor de Retención</span>.
                    </p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Plantilla
                    </button>
                )}
            </div>

            {/* Creation Form */}
            {isCreating && (
                <div className="bg-white p-6 rounded-2xl border border-silk-beige shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-charcoal">Nueva Plantilla de WhatsApp</h2>
                            <p className="text-sm text-charcoal/60 mt-1">Crea un nuevo mensaje y envíalo a YCloud para su aprobación.</p>
                        </div>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="p-2 hover:bg-ivory rounded-full transition-colors text-charcoal/40 hover:text-charcoal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Pre-built Templates Library */}
                    <div className="mb-8 bg-ivory/50 rounded-xl p-4 border border-silk-beige">
                        <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-primary-500" />
                            Plantillas Recomendadas (Rápidas)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button
                                onClick={() => setNewTemplate({
                                    name: 'reactivacion_mensual',
                                    category: 'MARKETING',
                                    body: 'Hola {{1}}, te extrañamos en {{2}}. Ha pasado tiempo desde tu último control. Responde a este mensaje para agendar tu próxima cita con un beneficio especial.',
                                    buttons: ['Agendar Cita']
                                })}
                                className="text-left p-3 rounded-lg border border-silk-beige bg-white hover:border-primary-300 hover:shadow-soft-sm transition-all text-sm group"
                            >
                                <div className="font-bold text-charcoal mb-1 group-hover:text-primary-600 transition-colors">Reactivación</div>
                                <div className="text-charcoal/60 text-xs line-clamp-2">Hola {'{{1}}'}, te extrañamos en {'{{2}}'}...</div>
                            </button>
                            <button
                                onClick={() => setNewTemplate({
                                    name: 'recordatorio_cita',
                                    category: 'UTILITY',
                                    body: 'Hola {{1}}, te escribimos de {{2}} para recordar tu cita el día {{3}} a las {{4}}. Por favor confirma respondiendo "Sí" o "No".',
                                    buttons: ['Sí, confirmo', 'No podré asistir']
                                })}
                                className="text-left p-3 rounded-lg border border-silk-beige bg-white hover:border-primary-300 hover:shadow-soft-sm transition-all text-sm group"
                            >
                                <div className="font-bold text-charcoal mb-1 group-hover:text-primary-600 transition-colors">Recordatorio</div>
                                <div className="text-charcoal/60 text-xs line-clamp-2">Hola {'{{1}}'}, recuerda tu cita el {'{{3}}'}...</div>
                            </button>
                            <button
                                onClick={() => setNewTemplate({
                                    name: 'oferta_especial',
                                    category: 'MARKETING',
                                    body: 'Hola {{1}}! Tenemos promoción en {{2}} esta semana. Quedan pocos cupos, responde este mensaje para reservar el tuyo. ¡Te esperamos!',
                                    buttons: ['Quiero reservar', 'Ver promoción']
                                })}
                                className="text-left p-3 rounded-lg border border-silk-beige bg-white hover:border-primary-300 hover:shadow-soft-sm transition-all text-sm group"
                            >
                                <div className="font-bold text-charcoal mb-1 group-hover:text-primary-600 transition-colors">Oferta Semanal</div>
                                <div className="text-charcoal/60 text-xs line-clamp-2">Hola {'{{1}}'}! Tenemos promoción en...</div>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Formularios e Inputs */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-charcoal mb-1">
                                        Nombre Interno <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newTemplate.name}
                                        onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                        placeholder="ej. promocion_verano_2026"
                                        className="w-full p-3 bg-white border border-silk-beige rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                    />
                                    <p className="text-[11px] text-charcoal/40 mt-1">Solo letras minúsculas, números y guiones bajos (_).</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-charcoal mb-1">
                                        Categoría
                                    </label>
                                    <select
                                        value={newTemplate.category}
                                        onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })}
                                        className="w-full p-3 bg-ivory border border-silk-beige rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                    >
                                        <option value="MARKETING">Marketing (Ofertas, Reactivación)</option>
                                        <option value="UTILITY">Utilidad (Recordatorios, Confirmaciones)</option>
                                        <option value="AUTHENTICATION">Autenticación (Códigos OTP)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-semibold text-charcoal mb-1">
                                    Cuerpo del Mensaje <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={newTemplate.body}
                                    onChange={e => setNewTemplate({ ...newTemplate, body: e.target.value })}
                                    placeholder="Hola {{1}}, te escribimos de la clínica para recordarte..."
                                    className="w-full flex-1 p-3 bg-ivory border border-silk-beige rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none min-h-[120px] resize-none"
                                />
                                <p className="text-[11px] text-charcoal/40 mt-2">Usa {'{{1}}'}, {'{{2}}'} para incluir variables dinámicas como el nombre del paciente, fecha, etc.</p>

                                {/* Autocompletado Variables UI */}
                                {(() => {
                                    const matches = newTemplate.body.match(/\{\{\d+\}\}/g)
                                    if (!matches) return null

                                    const uniqueVars = Array.from(new Set(matches.map(m => parseInt(m.replace(/[{}]/g, ''))))).sort((a, b) => a - b)
                                    if (uniqueVars.length === 0) return null

                                    const genericExamples = [
                                        "Juan Pérez",
                                        "Clínica Estética",
                                        "Mañana a las 10:00",
                                        "Dr. López",
                                        "https://ejemplo.com/pago"
                                    ]

                                    return (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in">
                                            <h4 className="text-xs font-bold text-blue-800 flex items-center gap-1.5 mb-1">
                                                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                                Autocompletado de Variables Inteligente
                                            </h4>
                                            <p className="text-[11px] text-blue-700/80 mb-3">Detectamos las siguientes variables y le enviaremos a Meta estos ejemplos genéricos para asegurar su rápida aprobación:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {uniqueVars.map((v, i) => (
                                                    <div key={v} className="flex flex-col bg-white border border-blue-100 rounded-lg p-2 shadow-soft-sm">
                                                        <span className="text-[10px] font-bold text-blue-500 mb-0.5">Variable {'{{' + v + '}}'}</span>
                                                        <span className="text-xs font-medium text-charcoal">{genericExamples[i % genericExamples.length]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-charcoal mb-2">Botones de Respuesta Rápida (Opcional, Max 3)</label>
                                {newTemplate.buttons.map((btn, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={btn}
                                            onChange={(e) => {
                                                const newButtons = [...newTemplate.buttons]
                                                newButtons[idx] = e.target.value
                                                setNewTemplate({ ...newTemplate, buttons: newButtons })
                                            }}
                                            placeholder={`Botón ${idx + 1}`}
                                            maxLength={25}
                                            className="flex-1 p-3 bg-white border border-silk-beige rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                        />
                                        <button
                                            onClick={() => setNewTemplate({ ...newTemplate, buttons: newTemplate.buttons.filter((_, i) => i !== idx) })}
                                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 flex items-center justify-center"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                {newTemplate.buttons.length < 3 && (
                                    <button
                                        onClick={() => setNewTemplate({ ...newTemplate, buttons: [...newTemplate.buttons, ''] })}
                                        className="text-sm text-primary-600 hover:text-primary-700 font-bold mt-1 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Agregar Botón
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Simulador Vista Previa (WhatsApp) */}
                        <div className="flex flex-col items-center justify-center p-6 bg-charcoal/5 rounded-2xl border border-charcoal/10 relative overflow-hidden bg-[url('https://i.ibb.co/30Z1Tzv/wa-bg.png')] bg-cover bg-center">
                            <div className="absolute top-4 left-4 flex gap-2 items-center text-charcoal/60 font-medium text-xs uppercase tracking-wider bg-white/80 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm">
                                <Smartphone className="w-4 h-4" /> Simulador de WhatsApp
                            </div>
                            <div className="w-[300px] bg-[#EFEAE2] rounded-[2rem] p-4 shadow-2xl border-8 border-white relative mt-8 h-[450px] flex flex-col justify-end bg-cover bg-center" style={{ backgroundImage: "url('https://i.ibb.co/vHxSvp1/wa-background.jpg')" }}>
                                {/* Chat bubble */}
                                <div className="bg-white p-3.5 rounded-xl rounded-tl-sm shadow-sm text-[13.5px] text-[#111B21] mb-2 max-w-[90%] whitespace-pre-wrap leading-relaxed shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
                                    {newTemplate.body || <span className="text-gray-400 italic">Aquí verás tu mensaje...</span>}
                                    <div className="text-[10px] text-charcoal/40 text-right mt-1 ml-4 select-none">12:00</div>
                                </div>

                                {/* Buttons */}
                                {newTemplate.buttons.map((btn, idx) => btn ? (
                                    <div key={idx} className="bg-white text-[#00A884] font-medium text-center p-2.5 rounded-xl shadow-[0_1px_0.5px_rgba(11,20,26,.13)] text-sm mb-2 hover:bg-gray-50 transition-colors cursor-pointer select-none">
                                        {btn}
                                    </div>
                                ) : null)}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-silk-beige">
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-6 py-2.5 text-sm font-bold text-charcoal/60 hover:text-charcoal hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateTemplate}
                            disabled={creatingTemplate || !newTemplate.name || !newTemplate.body}
                            className="btn-primary"
                        >
                            {creatingTemplate ? 'Enviando...' : 'Enviar a Revisión'}
                        </button>
                    </div>
                </div>
            )}

            {/* Template List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                    <div key={template.id} className="bg-white rounded-2xl border border-silk-beige p-6 hover:shadow-soft-md transition-shadow flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary-50 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-charcoal text-sm truncate max-w-[140px]" title={template.name}>
                                        {template.name}
                                    </h3>
                                    {getStatusBadge(template.status)}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-ivory/50 rounded-xl p-4 border border-silk-beige/50 text-sm text-charcoal/80 whitespace-pre-wrap">
                            {template.desc}
                        </div>
                    </div>
                ))}

                {templates.length === 0 && !isCreating && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-silk-beige rounded-2xl">
                        <FileText className="w-12 h-12 text-charcoal/20 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-charcoal mb-2">No hay plantillas configuradas</h3>
                        <p className="text-charcoal/60 max-w-sm mx-auto mb-6">
                            Aún no has sincronizado plantillas desde YCloud. Crea tu primera plantilla para comenzar a usar la mensajería automática.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="btn-primary mx-auto"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Crear mi primera plantilla
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

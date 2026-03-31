import { useState, useEffect } from 'react'
import { X, Save, Zap, MessageSquare, AlertTriangle, Clock, RefreshCw, ArrowRight, CalendarClock, Plus, Loader2 } from 'lucide-react'
import { retentionService, type RetentionSettings, type ServiceReturnWindow, type YCloudTemplate } from '@/services/retentionService'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

interface RetentionSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    clinicId: string
    onSaved: () => void
}

// Remove templates placeholder array to enforce real data

export function RetentionSettingsModal({ isOpen, onClose, clinicId, onSaved }: RetentionSettingsModalProps) {
    const [settings, setSettings] = useState<RetentionSettings>({
        autonomous_mode: false,
        medium_risk_template: 'retention_warning_soft',
        high_risk_template: 'retention_danger_offer',
        medium_risk_delay: 15,
        high_risk_delay: 45
    })
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [usingRemote, setUsingRemote] = useState(false)
    const [returnWindows, setReturnWindows] = useState<ServiceReturnWindow[]>([])
    const [windowEdits, setWindowEdits] = useState<Record<string, string>>({})
    const [initializingDefaults, setInitializingDefaults] = useState(false)
    const [mediumDelayRaw, setMediumDelayRaw] = useState('15')
    const [highDelayRaw, setHighDelayRaw] = useState('45')

    useEffect(() => {
        if (isOpen && clinicId) {
            loadData()
        }
    }, [isOpen, clinicId])

    const loadData = async () => {
        setLoading(true)
        try {
            // Parallel fetch: Settings + Remote Templates + Return Windows
            const [settingsData, remoteTemplates, windowsData] = await Promise.all([
                retentionService.getSettings(clinicId),
                retentionService.getRemoteTemplates(clinicId).catch(err => {
                    console.warn('Failed to fetch remote templates:', err)
                    return []
                }),
                retentionService.getReturnWindows(clinicId).catch(err => {
                    console.warn('Failed to fetch return windows:', err)
                    return []
                })
            ])

            setSettings(settingsData)
            setMediumDelayRaw(settingsData.medium_risk_delay.toString())
            setHighDelayRaw(settingsData.high_risk_delay.toString())
            setReturnWindows(windowsData)
            // Pre-populate edit fields
            const edits: Record<string, string> = {}
            windowsData.forEach(w => { edits[w.id] = w.return_window_days.toString() })
            setWindowEdits(edits)

            if (remoteTemplates && remoteTemplates.length > 0) {
                setTemplates(remoteTemplates.map((t: YCloudTemplate) => ({
                    id: t.name,
                    name: t.name,
                    desc: t.body || '(Sin vista previa)'
                })))
                setUsingRemote(true)
            } else {
                setUsingRemote(false)
                setTemplates([])
            }

        } catch (err) {
            console.error(err)
            toast.error('Error al cargar configuración')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const finalSettings = {
                ...settings,
                medium_risk_delay: parseInt(mediumDelayRaw) || 0,
                high_risk_delay: parseInt(highDelayRaw) || 0
            }

            // Save settings + return windows in parallel
            const windowUpdates = returnWindows
                .filter(w => {
                    const newVal = parseInt(windowEdits[w.id] || '0')
                    return newVal > 0 && newVal !== w.return_window_days
                })
                .map(w => retentionService.updateReturnWindow(w.id, parseInt(windowEdits[w.id])))

            await Promise.all([
                retentionService.updateSettings(clinicId, finalSettings),
                ...windowUpdates
            ])

            toast.success('Configuración guardada')
            onSaved()
            onClose()
        } catch (err) {
            console.error(err)
            toast.error('Error al guardar cambios')
        } finally {
            setSaving(false)
        }
    }

    const handleInitializeDefaults = async () => {
        setInitializingDefaults(true)
        try {
            await retentionService.initializeDefaults(clinicId)
            const windowsData = await retentionService.getReturnWindows(clinicId)
            setReturnWindows(windowsData)
            const edits: Record<string, string> = {}
            windowsData.forEach(w => { edits[w.id] = w.return_window_days.toString() })
            setWindowEdits(edits)
            toast.success('Ciclos de retorno inicializados')
        } catch (err) {
            console.error(err)
            toast.error('Error al inicializar ciclos')
        } finally {
            setInitializingDefaults(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-silk-beige overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-silk-beige flex items-center justify-between bg-ivory/50">
                    <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary-500" />
                        Configurar Motor de IA
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors text-charcoal/50 hover:text-charcoal">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* Mode Section */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-charcoal">Modo de Operación</label>
                                <div className={cn(
                                    "flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                                    settings.autonomous_mode
                                        ? "bg-primary-50 border-primary-200"
                                        : "bg-white border-silk-beige hover:border-primary-200"
                                )}
                                    onClick={() => setSettings(s => ({ ...s, autonomous_mode: !s.autonomous_mode }))}
                                >
                                    <div className={cn(
                                        "w-10 h-6 rounded-full relative transition-colors mt-0.5 flex-shrink-0",
                                        settings.autonomous_mode ? "bg-primary-500" : "bg-charcoal/20"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                            settings.autonomous_mode ? "translate-x-4" : "translate-x-0"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-charcoal text-sm">
                                            {settings.autonomous_mode ? 'Modo Autónomo (Piloto Automático)' : 'Modo Supervisado'}
                                        </p>
                                        <p className="text-sm text-charcoal font-bold mt-1 leading-relaxed">
                                            {settings.autonomous_mode
                                                ? 'La IA enviará los mensajes automáticamente cuando detecte riesgo, sin esperar tu aprobación.'
                                                : 'La IA generará sugerencias que deberás aprobar manualmente antes de ser enviadas.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-silk-beige" />

                            {/* Risk Thresholds Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-primary-500" />
                                    Umbrales de Riesgo (Días de Retraso)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-charcoal/80 uppercase tracking-wide">
                                            Riesgo Medio
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={mediumDelayRaw}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?!$)/, '');
                                                    setMediumDelayRaw(val)
                                                }}
                                                className="w-full h-11 p-3 bg-ivory border-2 border-silk-beige rounded-xl text-base font-bold text-charcoal focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm"
                                            />
                                            <span className="text-sm font-black text-charcoal">días</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-charcoal/80 uppercase tracking-wide">
                                            Riesgo Alto
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={highDelayRaw}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?!$)/, '');
                                                    setHighDelayRaw(val)
                                                }}
                                                className="w-full h-11 p-3 bg-ivory border-2 border-silk-beige rounded-xl text-base font-bold text-charcoal focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm"
                                            />
                                            <span className="text-sm font-black text-charcoal">días</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[12px] text-charcoal font-black leading-snug">
                                    Define cuántos días deben pasar después de la fecha ideal de regreso para que el paciente cambie de nivel de riesgo.
                                </p>
                            </div>

                            <hr className="border-silk-beige" />

                            {/* Service Return Windows Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                                        <CalendarClock className="w-4 h-4 text-primary-500" />
                                        Ciclos de Retorno por Servicio
                                    </h3>
                                    {returnWindows.length === 0 && (
                                        <button
                                            onClick={handleInitializeDefaults}
                                            disabled={initializingDefaults}
                                            className="text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 px-2.5 py-1 rounded-full font-black flex items-center gap-1.5 transition-all shadow-sm border border-primary-100 disabled:opacity-50"
                                        >
                                            {initializingDefaults ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                            Generar Automáticamente
                                        </button>
                                    )}
                                </div>
                                <p className="text-[12px] text-charcoal font-bold leading-snug">
                                    Define cada cuántos días esperas que el paciente regrese por cada servicio. El motor usa estos valores para calcular el riesgo.
                                </p>

                                {returnWindows.length > 0 ? (
                                    <div className="space-y-2">
                                        {returnWindows.map(w => (
                                            <div key={w.id} className="flex items-center gap-3 p-3 bg-ivory rounded-xl border border-silk-beige">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-charcoal truncate">{w.service_name}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={windowEdits[w.id] || ''}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?!$)/, '')
                                                            setWindowEdits(prev => ({ ...prev, [w.id]: val }))
                                                        }}
                                                        className="w-20 h-9 px-3 bg-white border-2 border-silk-beige rounded-lg text-sm font-bold text-charcoal text-center focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                    />
                                                    <span className="text-xs font-black text-charcoal/50 w-8">días</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-ivory rounded-xl border border-dashed border-silk-beige">
                                        <CalendarClock className="w-8 h-8 text-charcoal/15 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-charcoal/40">No hay ciclos configurados.</p>
                                        <p className="text-xs text-charcoal/30">Presiona "Generar Automáticamente" para crearlos desde tus servicios.</p>
                                    </div>
                                )}
                            </div>

                            <hr className="border-silk-beige" />

                            {/* Templates Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-primary-500" />
                                        Estrategia de Comunicación
                                    </h3>
                                    <div className="flex gap-2 items-center">
                                        {usingRemote && (
                                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-black flex items-center gap-1.5 shadow-sm">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                                Online
                                            </span>
                                        )}
                                        <Link
                                            to="/app/templates"
                                            onClick={() => onClose()}
                                            className="text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 px-2.5 py-1 rounded-full font-black flex items-center gap-1.5 transition-all shadow-sm border border-primary-100"
                                            title="Administrar plantillas de WhatsApp"
                                        >
                                            Administrar Plantillas <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Medium Risk */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-charcoal/80 flex items-center gap-1.5 uppercase tracking-wide">
                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        Riesgo Medio (Retraso Leve)
                                    </label>
                                    <select
                                        value={settings.medium_risk_template}
                                        onChange={e => setSettings(s => ({ ...s, medium_risk_template: e.target.value }))}
                                        disabled={templates.length === 0}
                                        className="w-full p-2.5 bg-ivory border border-silk-beige rounded-xl text-sm font-semibold text-charcoal focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">{templates.length === 0 ? 'No hay plantillas disponibles en YCloud' : 'Selecciona una plantilla...'}</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[13px] text-charcoal font-bold px-3 py-2.5 bg-ivory rounded-lg border border-dashed border-silk-beige min-h-[50px] leading-relaxed">
                                        {templates.find(t => t.id === settings.medium_risk_template)?.desc || (templates.length === 0 ? 'Sin plantillas configuradas. Ve a la sección Plantillas para crear o sincronizar.' : 'Selecciona una plantilla para ver previsualización')}
                                    </p>
                                </div>

                                {/* High Risk */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-charcoal/80 flex items-center gap-1.5 uppercase tracking-wide">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                        Riesgo Alto (Pérdida Inminente)
                                    </label>
                                    <select
                                        value={settings.high_risk_template}
                                        onChange={e => setSettings(s => ({ ...s, high_risk_template: e.target.value }))}
                                        disabled={templates.length === 0}
                                        className="w-full p-2.5 bg-ivory border border-silk-beige rounded-xl text-sm font-semibold text-charcoal focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">{templates.length === 0 ? 'No hay plantillas disponibles en YCloud' : 'Selecciona una plantilla...'}</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[13px] text-charcoal font-bold px-3 py-2.5 bg-ivory rounded-lg border border-dashed border-silk-beige min-h-[50px] leading-relaxed">
                                        {templates.find(t => t.id === settings.high_risk_template)?.desc || (templates.length === 0 ? 'Sin plantillas configuradas. Ve a la sección Plantillas para crear o sincronizar.' : 'Selecciona una plantilla para ver previsualización')}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-silk-beige bg-ivory/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-charcoal/60 hover:text-charcoal font-medium hover:bg-black/5 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

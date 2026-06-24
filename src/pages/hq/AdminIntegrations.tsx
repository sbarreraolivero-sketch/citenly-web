import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plug, MessageCircle, Loader2, CheckCircle2, PauseCircle, AlertCircle, KeyRound, Save, ChevronDown } from 'lucide-react'

const HQ_ID = '00000000-0000-0000-0000-000000000000'

export default function AdminIntegrations() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [phone, setPhone] = useState<string | null>(null)
    const [hasKey, setHasKey] = useState(false)
    const [active, setActive] = useState(false)
    const [error, setError] = useState('')
    const [showConfig, setShowConfig] = useState(false)
    const [formPhone, setFormPhone] = useState('')
    const [formKey, setFormKey] = useState('')
    const [savingCfg, setSavingCfg] = useState(false)
    const [cfgMsg, setCfgMsg] = useState('')

    const fetchData = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('clinic_settings')
            .select('ai_auto_respond, ycloud_phone_number')
            .eq('id', HQ_ID)
            .single()
        if (data) {
            const d = data as any
            setActive(d.ai_auto_respond !== false)
            setPhone(d.ycloud_phone_number || null)
        }
        // hasKey vía RPC (NO exponer el valor de la API key al navegador)
        const { data: keyExists } = await (supabase as any).rpc('clinic_has_ycloud_key', { p_clinic_id: HQ_ID })
        setHasKey(!!keyExists)
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [])

    const toggleAgent = async () => {
        const next = !active
        setSaving(true); setError('')
        // Patrón REST PATCH (política "Platform admins can update clinic settings")
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/clinic_settings?id=eq.${HQ_ID}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                    'Authorization': `Bearer ${session?.access_token ?? ''}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({ ai_auto_respond: next }),
            }
        )
        if (res.ok) {
            setActive(next)
        } else {
            setError('No se pudo actualizar. Intenta de nuevo.')
        }
        setSaving(false)
    }

    const openConfig = () => {
        setFormPhone(phone || ''); setFormKey(''); setCfgMsg(''); setShowConfig(v => !v)
    }

    const saveConfig = async () => {
        const payload: Record<string, string> = {}
        if (formPhone.trim()) payload.ycloud_phone_number = formPhone.trim()
        if (formKey.trim()) payload.ycloud_api_key = formKey.trim()
        if (!Object.keys(payload).length) { setCfgMsg('No hay cambios para guardar.'); return }
        setSavingCfg(true); setCfgMsg('')
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/clinic_settings?id=eq.${HQ_ID}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                    'Authorization': `Bearer ${session?.access_token ?? ''}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify(payload),
            }
        )
        if (res.ok) {
            setCfgMsg('Conexión guardada ✅')
            setFormKey('')
            await fetchData()
        } else {
            setCfgMsg('No se pudo guardar. Revisa los datos e intenta de nuevo.')
        }
        setSavingCfg(false)
    }

    const connected = !!phone && hasKey

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Plug className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF2E88]" /> Integraciones
                </h1>
                <p className="text-gray-400 mt-1 text-sm">Conexiones y canales de la plataforma Citenly.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#FF2E88] animate-spin" /></div>
            ) : (
                <div className="grid gap-4">
                    {/* WhatsApp — Asistente de ventas */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center shrink-0">
                                    <MessageCircle className="w-6 h-6 text-[#25D366]" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-white font-bold text-lg leading-tight">Asistente de Ventas (WhatsApp)</h2>
                                    <p className="text-gray-400 text-sm mt-0.5">Responde automáticamente a los prospectos por WhatsApp.</p>
                                    <p className="text-gray-300 text-sm mt-2 font-mono">{phone || 'Sin número configurado'}</p>
                                </div>
                            </div>

                            {/* Estado */}
                            {!connected ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                    <AlertCircle className="w-4 h-4" /> Sin conectar
                                </span>
                            ) : active ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                                    <CheckCircle2 className="w-4 h-4" /> Activo
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-600/30 text-gray-300 border border-gray-600 shrink-0">
                                    <PauseCircle className="w-4 h-4" /> En pausa
                                </span>
                            )}
                        </div>

                        {/* Toggle */}
                        <div className="mt-5 pt-5 border-t border-gray-700 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-white font-medium text-sm">Respuesta automática del agente</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    {active ? 'El agente está atendiendo a los prospectos.' : 'El agente está pausado: no responderá mensajes.'}
                                </p>
                            </div>
                            <button
                                onClick={toggleAgent}
                                disabled={saving || !connected}
                                role="switch"
                                aria-checked={active}
                                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${active ? 'bg-[#FF2E88]' : 'bg-gray-600'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
                        {!connected && (
                            <p className="text-amber-300/80 text-xs mt-3">Falta el número o la API key de YCloud para activar el agente.</p>
                        )}

                        {/* Configurar conexión YCloud */}
                        <div className="mt-5 pt-5 border-t border-gray-700">
                            <button onClick={openConfig} className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                                <KeyRound className="w-4 h-4" /> Configurar conexión de YCloud
                                <ChevronDown className={`w-4 h-4 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
                            </button>
                            {showConfig && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Número de YCloud</label>
                                        <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+56962303576"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2E88]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">API key de YCloud</label>
                                        <input type="password" value={formKey} onChange={e => setFormKey(e.target.value)}
                                            placeholder={hasKey ? '•••• conectada — escribe una nueva para reemplazar' : 'Pega la API key del número'}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2E88]" />
                                        <p className="text-[11px] text-gray-500 mt-1">{hasKey ? 'Ya hay una key guardada. Déjala vacía para no cambiarla.' : 'Necesaria para que el agente y las plantillas funcionen.'}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={saveConfig} disabled={savingCfg} className="inline-flex items-center gap-2 bg-[#FF2E88] hover:bg-[#e0007a] disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">
                                            {savingCfg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar conexión
                                        </button>
                                        {cfgMsg && <span className="text-sm text-gray-300">{cfgMsg}</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

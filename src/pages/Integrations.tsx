import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
    Plug, MessageSquare, Webhook, Globe, Save, Plus, Trash2,
    ChevronRight, Check, Copy, Send, ToggleLeft, ToggleRight,
    Loader2, X, AlertCircle, CheckCircle2, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

interface WebhookConfig {
    id?: string
    name: string
    url: string
    events: string[]
    is_active: boolean
    secret: string
    last_triggered_at?: string | null
    last_status_code?: number | null
}

const WEBHOOK_EVENTS = [
    { value: 'appointment.created', label: 'Nueva cita creada' },
    { value: 'appointment.confirmed', label: 'Cita confirmada' },
    { value: 'appointment.cancelled', label: 'Cita cancelada' },
    { value: 'appointment.rescheduled', label: 'Cita reagendada' },
    { value: 'message.received', label: 'Mensaje recibido' },
    { value: 'message.sent', label: 'Mensaje enviado' },
    { value: 'patient.created', label: 'Nueva clienta' },
    { value: 'patient.updated', label: 'Clienta actualizada' },
]

export default function Integrations() {
    const { profile } = useAuth()

    const [yCloudApiKey, setYCloudApiKey] = useState('')
    const [yCloudPhoneNumber, setYCloudPhoneNumber] = useState('')
    const [yCloudWebhookSecret, setYCloudWebhookSecret] = useState('')
    const [copiedWebhook, setCopiedWebhook] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
    const [showWebhookModal, setShowWebhookModal] = useState(false)
    const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null)
    const [webhookForm, setWebhookForm] = useState<WebhookConfig>({ name: '', url: '', events: [], is_active: true, secret: '' })
    const [savingWebhook, setSavingWebhook] = useState(false)
    const [testingWebhook, setTestingWebhook] = useState<string | null>(null)

    const webhookUrl = `${SUPABASE_URL}/functions/v1/ycloud-whatsapp-webhook`

    useEffect(() => {
        if (!profile?.clinic_id) return
        const load = async () => {
            const [{ data: cs }, { data: whs }] = await Promise.all([
                (supabase as any).from('clinic_settings').select('ycloud_api_key,ycloud_phone_number,ycloud_webhook_secret').eq('id', profile.clinic_id).single(),
                (supabase as any).from('webhooks').select('*').eq('clinic_id', profile.clinic_id).order('created_at', { ascending: true })
            ])
            if (cs) {
                setYCloudApiKey(cs.ycloud_api_key || '')
                setYCloudPhoneNumber(cs.ycloud_phone_number || '')
                setYCloudWebhookSecret(cs.ycloud_webhook_secret || '')
            }
            if (whs) setWebhooks(whs)
        }
        load()
    }, [profile?.clinic_id])

    const copyWebhookUrl = async () => {
        await navigator.clipboard.writeText(webhookUrl)
        setCopiedWebhook(true)
        setTimeout(() => setCopiedWebhook(false), 2000)
    }

    const saveIntegrations = async () => {
        if (!profile?.clinic_id) return
        setIsSaving(true)
        setSaveStatus('idle')
        try {
            const { error } = await (supabase as any).from('clinic_settings').update({
                ycloud_api_key: yCloudApiKey || null,
                ycloud_phone_number: yCloudPhoneNumber || null,
                ycloud_webhook_secret: yCloudWebhookSecret || null,
                updated_at: new Date().toISOString(),
            }).eq('id', profile.clinic_id)
            if (error) throw error
            setSaveStatus('success')
            toast.success('Integraciones guardadas correctamente')
            setTimeout(() => setSaveStatus('idle'), 3000)
        } catch (error: any) {
            toast.error('Error al guardar: ' + (error?.message || 'Intenta nuevamente'))
            setSaveStatus('error')
            setTimeout(() => setSaveStatus('idle'), 3000)
        } finally {
            setIsSaving(false)
        }
    }

    const openWebhookModal = (webhook?: WebhookConfig) => {
        if (webhook) {
            setEditingWebhook(webhook)
            setWebhookForm({ ...webhook })
        } else {
            setEditingWebhook(null)
            setWebhookForm({ name: '', url: '', events: [], is_active: true, secret: '' })
        }
        setShowWebhookModal(true)
    }

    const closeWebhookModal = () => {
        setShowWebhookModal(false)
        setEditingWebhook(null)
        setWebhookForm({ name: '', url: '', events: [], is_active: true, secret: '' })
    }

    const handleSaveWebhook = async () => {
        if (!profile?.clinic_id || !webhookForm.url.trim() || !webhookForm.name.trim()) return
        setSavingWebhook(true)
        try {
            if (editingWebhook?.id) {
                const { error } = await (supabase as any).from('webhooks').update({
                    name: webhookForm.name.trim(), url: webhookForm.url.trim(),
                    events: webhookForm.events, is_active: webhookForm.is_active,
                    secret: webhookForm.secret || null, updated_at: new Date().toISOString(),
                }).eq('id', editingWebhook.id)
                if (error) throw error
            } else {
                const { error } = await (supabase as any).from('webhooks').insert({
                    clinic_id: profile.clinic_id, name: webhookForm.name.trim(),
                    url: webhookForm.url.trim(), events: webhookForm.events,
                    is_active: webhookForm.is_active, secret: webhookForm.secret || null,
                })
                if (error) throw error
            }
            closeWebhookModal()
            const { data } = await (supabase as any).from('webhooks').select('*').eq('clinic_id', profile.clinic_id).order('created_at', { ascending: true })
            if (data) setWebhooks(data)
        } catch (error) {
            console.error('Error saving webhook:', error)
            alert('Error al guardar el webhook.')
        } finally {
            setSavingWebhook(false)
        }
    }

    const handleDeleteWebhook = async (id: string) => {
        if (!profile?.clinic_id) return
        const { error } = await (supabase as any).from('webhooks').delete().eq('id', id)
        if (!error) setWebhooks(prev => prev.filter(w => w.id !== id))
    }

    const handleToggleWebhook = async (id: string, currentActive: boolean) => {
        const { error } = await (supabase as any).from('webhooks').update({ is_active: !currentActive, updated_at: new Date().toISOString() }).eq('id', id)
        if (!error) setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: !currentActive } : w))
    }

    const handleTestWebhook = async (webhook: WebhookConfig) => {
        if (!webhook.id) return
        setTestingWebhook(webhook.id)
        try {
            await fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}) },
                mode: 'no-cors',
                body: JSON.stringify({ event: 'test.ping', timestamp: new Date().toISOString(), data: { message: 'Test webhook from Citenly' } }),
            })
            await (supabase as any).from('webhooks').update({ last_triggered_at: new Date().toISOString() }).eq('id', webhook.id)
            setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, last_triggered_at: new Date().toISOString() } : w))
            toast.success('Webhook de prueba enviado')
        } catch {
            toast.error('No se pudo verificar la respuesta (puede ser CORS). El webhook pudo haberse recibido.')
        } finally {
            setTestingWebhook(null)
        }
    }

    const toggleWebhookEvent = (event: string) => {
        setWebhookForm(prev => ({
            ...prev,
            events: prev.events.includes(event) ? prev.events.filter(e => e !== event) : [...prev.events, event]
        }))
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#FF2E88]/70 mb-1">Agente IA</p>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Plug className="w-6 h-6 text-[#FF2E88]" />
                        Integraciones
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Conecta tu número de WhatsApp Business y automatizaciones externas.</p>
                </div>
            </div>

            {/* YCloud */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">YCloud WhatsApp API</h2>
                        <p className="text-xs text-gray-500">Conecta tu número de WhatsApp Business</p>
                    </div>
                </div>
                <div className="p-5 space-y-5">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">API Key</label>
                        <input
                            type="password"
                            placeholder="yc_xxxxxxxxxxxxxxxxxxxxxx"
                            value={yCloudApiKey}
                            onChange={(e) => setYCloudApiKey(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FF2E88]/40 transition-all"
                        />
                        <p className="text-xs text-gray-600 mt-1.5">Obtén tu API Key desde ycloud.com</p>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Número de WhatsApp</label>
                        <input
                            type="text"
                            placeholder="+56912345678"
                            value={yCloudPhoneNumber}
                            onChange={(e) => setYCloudPhoneNumber(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FF2E88]/40 transition-all"
                        />
                        <p className="text-xs text-gray-600 mt-1.5">Número registrado en YCloud, con código de país</p>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Webhook Secret</label>
                        <input
                            type="password"
                            placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={yCloudWebhookSecret}
                            onChange={(e) => setYCloudWebhookSecret(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FF2E88]/40 transition-all"
                        />
                        <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Firma HMAC-SHA256 — YCloud → Developer → Webhooks → Signing Secret
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Webhook URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={webhookUrl}
                                disabled
                                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-500"
                            />
                            <button
                                onClick={copyWebhookUrl}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-gray-400 hover:text-white hover:border-white/20 transition-all"
                            >
                                {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                {copiedWebhook ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-1.5">Configura esta URL en YCloud → Developer → Webhooks</p>
                    </div>
                </div>
            </div>

            {/* Webhooks */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <Webhook className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Webhooks</h2>
                            <p className="text-xs text-gray-500">Conecta con n8n, Make, Zapier y otras automatizaciones</p>
                        </div>
                    </div>
                    <button
                        onClick={() => openWebhookModal()}
                        className="flex items-center gap-2 bg-[#FF2E88]/20 text-[#FF2E88] border border-[#FF2E88]/30 text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-[#FF2E88]/30 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Añadir
                    </button>
                </div>
                <div className="p-5">
                    {webhooks.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-xl">
                            <Globe className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm font-medium mb-1">No hay webhooks configurados</p>
                            <p className="text-gray-600 text-xs">Añade un webhook para enviar eventos a herramientas externas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {webhooks.map((wh) => (
                                <div
                                    key={wh.id}
                                    className={cn('border rounded-xl p-4 transition-all', wh.is_active ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-white/[0.01] opacity-60')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn('w-2.5 h-2.5 rounded-full', wh.is_active ? 'bg-emerald-400' : 'bg-gray-600')} />
                                            <h3 className="font-bold text-white text-sm">{wh.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleTestWebhook(wh)} disabled={!wh.is_active || testingWebhook === wh.id} className="p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50" title="Enviar prueba">
                                                {testingWebhook === wh.id ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Send className="w-4 h-4 text-blue-400" />}
                                            </button>
                                            <button onClick={() => handleToggleWebhook(wh.id!, wh.is_active)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={wh.is_active ? 'Desactivar' : 'Activar'}>
                                                {wh.is_active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-gray-600" />}
                                            </button>
                                            <button onClick={() => openWebhookModal(wh)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Editar">
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                            </button>
                                            <button onClick={() => handleDeleteWebhook(wh.id!)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Eliminar">
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 font-mono truncate mb-2 pl-5">{wh.url}</p>
                                    <div className="flex items-center gap-2 flex-wrap pl-5">
                                        {wh.events.length > 0 ? wh.events.map(ev => (
                                            <span key={ev} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">{ev}</span>
                                        )) : (
                                            <span className="text-xs text-gray-600">Sin eventos seleccionados</span>
                                        )}
                                        {wh.last_triggered_at && (
                                            <span className="text-xs text-gray-600 ml-auto">Último: {new Date(wh.last_triggered_at).toLocaleString('es-CL')}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-5 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <p className="text-xs text-amber-400">
                            <strong>Tip:</strong> En n8n, usa el nodo "Webhook" y pega la URL generada por n8n aquí. Selecciona los eventos que deseas recibir.
                        </p>
                    </div>
                </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
                <button
                    onClick={saveIntegrations}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-[#FF2E88] text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#e0007a] transition-colors disabled:opacity-50"
                >
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar Integraciones</>}
                </button>
                {saveStatus === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Guardado correctamente
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
                        <AlertCircle className="w-4 h-4" /> Error al guardar
                    </div>
                )}
            </div>

            {/* Modal */}
            {showWebhookModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h3 className="text-base font-bold text-white">
                                {editingWebhook ? 'Editar Webhook' : 'Nuevo Webhook'}
                            </h3>
                            <button onClick={closeWebhookModal} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Nombre</label>
                                <input
                                    type="text"
                                    placeholder="Mi automatización n8n"
                                    value={webhookForm.name}
                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FF2E88]/40 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">URL del Webhook</label>
                                <input
                                    type="url"
                                    placeholder="https://n8n.mi-dominio.com/webhook/..."
                                    value={webhookForm.url}
                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FF2E88]/40 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Eventos</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {WEBHOOK_EVENTS.map(ev => (
                                        <label key={ev.value} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={webhookForm.events.includes(ev.value)}
                                                onChange={() => toggleWebhookEvent(ev.value)}
                                                className="w-4 h-4 accent-[#FF2E88] rounded"
                                            />
                                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{ev.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Secret (opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Para verificar la autenticidad del webhook"
                                    value={webhookForm.secret}
                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FF2E88]/40 transition-all"
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={webhookForm.is_active} onChange={(e) => setWebhookForm(prev => ({ ...prev, is_active: e.target.checked }))} />
                                        <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#FF2E88] after:content-[''] after:absolute after:top-0.5 after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                                    </label>
                                    <span className="text-sm text-gray-400">Activo</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={closeWebhookModal} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:text-white border border-white/10 hover:border-white/20 transition-all">Cancelar</button>
                                    <button
                                        onClick={handleSaveWebhook}
                                        disabled={savingWebhook || !webhookForm.name.trim() || !webhookForm.url.trim()}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#FF2E88] text-white hover:bg-[#e0007a] disabled:opacity-50 transition-all"
                                    >
                                        {savingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {editingWebhook ? 'Guardar cambios' : 'Crear webhook'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

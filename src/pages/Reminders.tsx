import { useState, useEffect, useCallback } from 'react'
import { Bell, Clock, CheckCircle2, XCircle, Package, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { PLANS, normalizePlanId } from '@/lib/mercadopago'
import { REMINDER_PACKS, redirectToLemonReminderPackCheckout, type ReminderPackId } from '@/lib/lemonsqueezy'

type Tab = 'overview' | 'logs' | 'packs'

interface ReminderLog {
    id: string
    clinic_id: string
    appointment_id: string | null
    patient_name: string | null
    patient_phone: string | null
    type: '24h' | '2h' | '1h' | 'manual'
    status: 'sent' | 'failed' | 'skipped'
    sent_at: string
    error_message: string | null
}

interface ReminderSettings {
    id: string
    clinic_id: string
    reminder_24h_before: boolean
    reminder_2h_before: boolean
    reminder_1h_before: boolean
    template_24h: string | null
    template_2h: string | null
}

export default function Reminders() {
    const { profile, subscription, member } = useAuth()
    const [tab, setTab] = useState<Tab>('overview')
    const [logs, setLogs] = useState<ReminderLog[]>([])
    const [settings, setSettings] = useState<ReminderSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [savingSettings, setSavingSettings] = useState(false)
    const [purchasingPack, setPurchasingPack] = useState<string | null>(null)
    const [paymentRegion, setPaymentRegion] = useState<'chile' | 'international'>('chile')

    const isAdminOrOwner = member?.role === 'owner' || profile?.role === 'owner' || member?.role === 'admin' || profile?.role === 'admin'
    const planId = normalizePlanId(subscription?.plan)
    const planData = PLANS[planId] ?? PLANS.core
    // Admins/owners always get unlimited access regardless of plan
    const monthlyLimit = isAdminOrOwner ? -1 : planData.remindersPerMonth

    const fetchData = useCallback(async () => {
        if (!profile?.clinic_id) return
        setLoading(true)

        const [logsRes, settingsRes] = await Promise.all([
            supabase
                .from('reminder_logs' as any)
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .order('sent_at', { ascending: false })
                .limit(100),
            supabase
                .from('reminder_settings' as any)
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .maybeSingle(),
        ])

        if (logsRes.data) setLogs(logsRes.data as ReminderLog[])
        if (settingsRes.data) setSettings(settingsRes.data as ReminderSettings)

        setLoading(false)
    }, [profile?.clinic_id])

    useEffect(() => {
        fetchData()
        // Check payment success URL param
        const params = new URLSearchParams(window.location.search)
        if (params.get('payment') === 'success') {
            setTab('packs')
        }
    }, [fetchData])

    const updateSetting = async (field: keyof ReminderSettings, value: boolean) => {
        if (!profile?.clinic_id || !settings) return
        setSavingSettings(true)

        const db = supabase as any
        const { error } = await db
            .from('reminder_settings')
            .update({ [field]: value })
            .eq('clinic_id', profile.clinic_id)

        if (!error) {
            setSettings(prev => prev ? { ...prev, [field]: value } : prev)
        }
        setSavingSettings(false)
    }

    const handleBuyPack = async (packId: ReminderPackId) => {
        if (!profile?.clinic_id) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return

        setPurchasingPack(packId)
        try {
            await redirectToLemonReminderPackCheckout(profile.clinic_id, user.email, packId)
        } catch (err: any) {
            alert(err.message || 'Error al conectar con el servidor de pagos')
            setPurchasingPack(null)
        }
    }

    const sentThisMonth = logs.filter(l => {
        const d = new Date(l.sent_at)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && l.status === 'sent'
    }).length

    const successRate = logs.length > 0
        ? Math.round((logs.filter(l => l.status === 'sent').length / logs.length) * 100)
        : 0

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: 'Configuración', icon: Bell },
        { id: 'logs', label: 'Historial', icon: Clock },
        { id: 'packs', label: 'Packs Extra', icon: Package },
    ]

    return (
        <div className="animate-fade-in space-y-6">
            {/* Banner — Clínica */}
            <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-2xl overflow-hidden shadow-soft-md">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-widest text-sky-200 mb-2">Clínica</p>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Recordatorios Automáticos</h1>
                            <p className="text-sm text-sky-100/80 font-light mt-1">WhatsApp automático 24h y 2h antes de cada cita.</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="hidden sm:flex items-center gap-5">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-white">{sentThisMonth}</p>
                                    <p className="text-sky-200/70 text-xs font-bold">Este mes</p>
                                </div>
                                {monthlyLimit > 0 && (
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-white">{monthlyLimit}</p>
                                        <p className="text-sky-200/70 text-xs font-bold">Límite mensual</p>
                                    </div>
                                )}
                                <div className="text-center">
                                    <p className="text-2xl font-black text-white">{successRate}%</p>
                                    <p className="text-sky-200/70 text-xs font-bold">Éxito</p>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center shrink-0">
                                <Bell className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plan limit warning */}
            {monthlyLimit === 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-300">Tu plan no incluye recordatorios automáticos</p>
                        <p className="text-xs text-amber-300/60 mt-0.5">Actualiza a Starter o superior, o compra un pack de recordatorios extra.</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-secondary-theme border border-theme rounded-xl p-1">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
                            tab === t.id
                                ? 'bg-white dark:bg-white/10 text-primary-theme shadow-sm'
                                : 'text-secondary-theme hover:text-primary-theme'
                        )}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-secondary-theme" />
                </div>
            ) : (
                <>
                    {/* OVERVIEW TAB */}
                    {tab === 'overview' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Toggle settings */}
                            <div className="card-premium p-6">
                                <h2 className="text-base font-black text-primary-theme mb-5">Recordatorios Activos</h2>
                                <div className="space-y-4">
                                    {[
                                        { field: 'reminder_24h_before' as const, label: '24 horas antes', desc: 'Recuerda la cita el día anterior' },
                                        { field: 'reminder_2h_before' as const, label: '2 horas antes', desc: 'Recordatorio de confirmación final' },
                                        { field: 'reminder_1h_before' as const, label: '1 hora antes', desc: 'Alerta de última hora' },
                                    ].map(item => (
                                        <div key={item.field} className="flex items-center justify-between p-4 bg-secondary-theme rounded-xl border border-theme">
                                            <div>
                                                <p className="text-sm font-bold text-primary-theme">{item.label}</p>
                                                <p className="text-xs text-secondary-theme">{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => updateSetting(item.field, !settings?.[item.field])}
                                                disabled={savingSettings || monthlyLimit === 0}
                                                className={cn(
                                                    'relative w-12 h-6 rounded-full transition-colors shrink-0',
                                                    settings?.[item.field] ? 'bg-emerald-500' : 'bg-white/10',
                                                    (savingSettings || monthlyLimit === 0) && 'opacity-50 cursor-not-allowed'
                                                )}
                                            >
                                                <span className={cn(
                                                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                                                    settings?.[item.field] ? 'translate-x-7' : 'translate-x-1'
                                                )} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="card-premium p-6">
                                <h2 className="text-base font-black text-primary-theme mb-5">Estadísticas del Mes</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-xl border border-theme">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <p className="text-sm font-bold text-primary-theme">Enviados</p>
                                        </div>
                                        <span className="text-xl font-black text-emerald-500">{sentThisMonth}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-xl border border-theme">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                                                <XCircle className="w-4 h-4 text-red-400" />
                                            </div>
                                            <p className="text-sm font-bold text-primary-theme">Fallidos</p>
                                        </div>
                                        <span className="text-xl font-black text-red-400">
                                            {logs.filter(l => l.status === 'failed').length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-xl border border-theme">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-sky-500/10 rounded-lg flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-sky-400" />
                                            </div>
                                            <p className="text-sm font-bold text-primary-theme">Tasa de éxito</p>
                                        </div>
                                        <span className="text-xl font-black text-sky-400">{successRate}%</span>
                                    </div>
                                </div>

                                {monthlyLimit > 0 && (
                                    <div className="mt-4 pt-4 border-t border-theme">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-bold text-secondary-theme">Uso mensual</p>
                                            <p className="text-xs font-black text-primary-theme">
                                                {sentThisMonth} / {monthlyLimit === -1 ? '∞' : monthlyLimit}
                                            </p>
                                        </div>
                                        {monthlyLimit > 0 && (
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                                    style={{ width: `${Math.min(100, (sentThisMonth / monthlyLimit) * 100)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LOGS TAB */}
                    {tab === 'logs' && (
                        <div className="card-premium overflow-hidden">
                            <div className="p-5 border-b border-theme">
                                <h2 className="text-base font-black text-primary-theme">Historial de Recordatorios</h2>
                                <p className="text-xs text-secondary-theme mt-1">Últimos 100 recordatorios enviados</p>
                            </div>
                            {logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-12 h-12 bg-secondary-theme rounded-xl flex items-center justify-center">
                                        <Bell className="w-6 h-6 text-secondary-theme" />
                                    </div>
                                    <p className="text-sm font-bold text-secondary-theme">Sin recordatorios aún</p>
                                    <p className="text-xs text-secondary-theme/60">Activa los recordatorios en la pestaña Configuración</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-theme">
                                    {logs.map(log => (
                                        <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary-theme/50 transition-colors">
                                            <div className={cn(
                                                'w-2 h-2 rounded-full shrink-0',
                                                log.status === 'sent' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                                            )} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-primary-theme truncate">
                                                    {log.patient_name || log.patient_phone || 'Paciente desconocido'}
                                                </p>
                                                <p className="text-xs text-secondary-theme">
                                                    {log.type === '24h' ? '24h antes' : log.type === '2h' ? '2h antes' : log.type === '1h' ? '1h antes' : 'Manual'}
                                                    {log.error_message && ` — ${log.error_message}`}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={cn(
                                                    'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                                                    log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    log.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-amber-500/10 text-amber-400'
                                                )}>
                                                    {log.status === 'sent' ? 'Enviado' : log.status === 'failed' ? 'Falló' : 'Omitido'}
                                                </span>
                                                <p className="text-[10px] text-secondary-theme mt-1">
                                                    {new Date(log.sent_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* PACKS TAB */}
                    {tab === 'packs' && (
                        <div className="space-y-6">
                            {/* Currency selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-secondary-theme">Moneda:</span>
                                <div className="flex bg-secondary-theme border border-theme rounded-xl p-1">
                                    {(['chile', 'international'] as const).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setPaymentRegion(r)}
                                            className={cn(
                                                'px-4 py-1.5 rounded-lg text-sm font-bold transition-all',
                                                paymentRegion === r ? 'bg-[#FF2E88] text-white' : 'text-secondary-theme hover:text-primary-theme'
                                            )}
                                        >
                                            {r === 'chile' ? '🇨🇱 CLP' : '🌍 USD'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-5">
                                {(Object.values(REMINDER_PACKS)).map(pack => {
                                    const clpPrice = pack.id === 'reminders_50' ? 9000 : pack.id === 'reminders_350' ? 19000 : 29000
                                    const displayPrice = paymentRegion === 'international' ? `US$${pack.price}` : `$${clpPrice.toLocaleString('es-CL')}`
                                    const creditsDisplay = pack.credits >= 9999 ? '∞' : pack.credits
                                    const pricePerUnit = paymentRegion === 'international'
                                        ? (pack.credits >= 9999 ? 'Ilimitados' : `US$${(pack.price / pack.credits).toFixed(2)}/recordatorio`)
                                        : (pack.credits >= 9999 ? 'Ilimitados' : `$${Math.round(clpPrice / pack.credits)}/recordatorio`)

                                    return (
                                        <div key={pack.id} className="card-premium overflow-hidden flex flex-col">
                                            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600" />
                                            <div className="p-6 flex flex-col flex-1">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-black text-primary-theme">{pack.name}</h3>
                                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                                        {pack.credits} envíos
                                                    </span>
                                                </div>
                                                <div className="mb-4">
                                                    <p className="text-3xl font-black text-primary-theme">{displayPrice}</p>
                                                    <p className="text-xs text-secondary-theme mt-1">{pricePerUnit}</p>
                                                </div>
                                                <ul className="space-y-2 mb-6 flex-1">
                                                    <li className="flex items-center gap-2 text-sm text-secondary-theme">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        {creditsDisplay} recordatorios WhatsApp
                                                    </li>
                                                    <li className="flex items-center gap-2 text-sm text-secondary-theme">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        Sin vencimiento
                                                    </li>
                                                    <li className="flex items-center gap-2 text-sm text-secondary-theme">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        Se acumulan al saldo
                                                    </li>
                                                </ul>
                                                <button
                                                    onClick={() => handleBuyPack(pack.id as ReminderPackId)}
                                                    disabled={purchasingPack !== null}
                                                    className={cn(
                                                        'w-full py-3 rounded-xl font-black text-sm transition-all',
                                                        'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90',
                                                        purchasingPack !== null && 'opacity-60 cursor-not-allowed'
                                                    )}
                                                >
                                                    {purchasingPack === pack.id ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Redirigiendo…
                                                        </span>
                                                    ) : 'Comprar Pack'}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-4 bg-secondary-theme border border-theme rounded-xl">
                                <p className="text-xs text-secondary-theme">
                                    Los packs de recordatorios se suman al saldo de tu clínica y no tienen fecha de vencimiento.
                                    Incluidos en tu plan: <span className="font-black text-primary-theme">
                                        {monthlyLimit === -1 ? 'Ilimitados' : monthlyLimit === 0 ? 'Sin recordatorios' : `${monthlyLimit}/mes`}
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar as CalendarIcon, Clock, Building2, Mail, Phone, Loader2, CheckCircle, XCircle, MessageSquare, User, List, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HQCalendar, HQCalendarEvent } from '@/components/hq/HQCalendar'

type Tab = 'demos' | 'activations'
type View = 'calendar' | 'list'

interface DemoRequest {
    id: string
    name: string
    clinic_name: string
    phone: string
    email: string
    clinic_type: string
    needs: string
    role: string
    scheduled_at: string
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
    created_at: string
}

interface HQAppointment {
    id: string
    clinic_id: string
    scheduled_at: string
    status: string
    duration_minutes: number
    notes: string | null
    created_at: string
    clinic_settings?: { clinic_name: string } | null
    clinic_members?: { first_name: string; last_name: string; email: string }[]
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    pending:   { label: 'Pendiente',  className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    confirmed: { label: 'Confirmada', className: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
    completed: { label: 'Completada', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    cancelled: { label: 'Cancelada',  className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    scheduled: { label: 'Agendada',   className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
}

const parseDate = (s: string): Date | null => {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
}

export default function AdminCalendar() {
    const [view, setView] = useState<View>('calendar')
    const [tab, setTab] = useState<Tab>('demos')
    const [demos, setDemos] = useState<DemoRequest[]>([])
    const [appointments, setAppointments] = useState<HQAppointment[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<HQCalendarEvent | null>(null)

    const fetchAll = useCallback(async () => {
        setLoading(true)

        const [demosRes, aptsRes] = await Promise.all([
            (supabase as any)
                .from('demo_requests')
                .select('*')
                .order('scheduled_at', { ascending: true }),
            (supabase as any)
                .from('hq_appointments')
                .select('*')
                .order('scheduled_at', { ascending: true }),
        ])

        if (demosRes.data) setDemos(demosRes.data)

        if (aptsRes.data) {
            const clinicIds = [...new Set(aptsRes.data.map((a: any) => a.clinic_id))]
            if (clinicIds.length > 0) {
                const [clinicsRes, membersRes] = await Promise.all([
                    supabase.from('clinic_settings').select('id, clinic_name').in('id', clinicIds),
                    supabase.from('clinic_members' as any).select('clinic_id, email, first_name, last_name, role').in('clinic_id', clinicIds).eq('role', 'owner'),
                ])
                const enriched = aptsRes.data.map((apt: any) => ({
                    ...apt,
                    clinic_settings: clinicsRes.data?.find((c: any) => c.id === apt.clinic_id),
                    clinic_members: membersRes.data?.filter((m: any) => m.clinic_id === apt.clinic_id) || [],
                }))
                setAppointments(enriched)
            } else {
                setAppointments(aptsRes.data)
            }
        }

        setLoading(false)
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const updateDemoStatus = async (id: string, status: DemoRequest['status']) => {
        setUpdatingId(id)
        await (supabase as any).from('demo_requests').update({ status }).eq('id', id)
        setDemos(prev => prev.map(d => d.id === id ? { ...d, status } : d))
        setUpdatingId(null)
    }

    const updateAptStatus = async (id: string, newStatus: string, clinicId?: string) => {
        setUpdatingId(id)
        await (supabase as any).from('hq_appointments').update({ status: newStatus }).eq('id', id)

        if (newStatus === 'completed' && clinicId) {
            const now = new Date()
            const trialEnd = new Date()
            trialEnd.setDate(trialEnd.getDate() + 14)
            await Promise.all([
                (supabase as any).from('clinic_settings').update({
                    activation_status: 'active',
                    trial_status: 'running',
                    trial_start_date: now.toISOString(),
                    trial_end_date: trialEnd.toISOString(),
                }).eq('id', clinicId),
                (supabase as any).from('subscriptions').update({
                    status: 'trial',
                    trial_ends_at: trialEnd.toISOString(),
                    current_period_start: now.toISOString(),
                }).eq('clinic_id', clinicId),
            ])
        }

        setUpdatingId(null)
        fetchAll()
    }

    // Acción desde el modal (cierra al terminar)
    const demoAction = async (id: string, status: DemoRequest['status']) => { await updateDemoStatus(id, status); setSelectedEvent(null) }
    const aptAction = async (id: string, status: string, clinicId?: string) => { await updateAptStatus(id, status, clinicId); setSelectedEvent(null) }

    // Mapear a eventos del calendario; fechas no parseables → "Por coordinar"
    const events: HQCalendarEvent[] = []
    const porCoordinar: DemoRequest[] = []
    demos.forEach(demo => {
        const d = parseDate(demo.scheduled_at)
        if (d) events.push({ id: 'demo-' + demo.id, title: demo.name || 'Lead', subtitle: demo.clinic_name || demo.clinic_type || undefined, start: d, status: demo.status, type: 'demo', raw: demo })
        else porCoordinar.push(demo)
    })
    appointments.forEach(apt => {
        const d = parseDate(apt.scheduled_at)
        if (d) events.push({ id: 'apt-' + apt.id, title: apt.clinic_settings?.clinic_name || 'Activación', subtitle: apt.clinic_members?.[0]?.email || undefined, start: d, status: apt.status, type: 'appointment', raw: apt })
    })

    const pendingDemos = demos.filter(d => d.status === 'pending').length
    const pendingApts = appointments.filter(a => a.status === 'scheduled').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Calendario</h1>
                    <p className="text-gray-400 text-sm mt-1">Demos, videollamadas y activaciones de Citenly</p>
                </div>
                {/* Toggle Calendario / Lista */}
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                    {([
                        { id: 'calendar' as View, label: 'Calendario', icon: CalendarIcon },
                        { id: 'list' as View, label: 'Lista', icon: List },
                    ]).map(v => {
                        const Icon = v.icon
                        return (
                            <button
                                key={v.id}
                                onClick={() => setView(v.id)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                                    view === v.id ? 'bg-[#FF2E88] text-white' : 'text-gray-400 hover:text-white'
                                )}
                            >
                                <Icon className="w-4 h-4" /> {v.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : view === 'calendar' ? (
                /* ════ VISTA CALENDARIO ════ */
                <>
                    <HQCalendar events={events} onSelectEvent={setSelectedEvent} />

                    {/* Por coordinar (videollamadas sin fecha exacta) */}
                    {porCoordinar.length > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5">
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-400" /> Por coordinar ({porCoordinar.length})
                            </h4>
                            <p className="text-xs text-gray-500 mb-3">Reservas sin fecha exacta — coordina el horario con la persona.</p>
                            <div className="space-y-2">
                                {porCoordinar.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => setSelectedEvent({ id: 'demo-' + d.id, title: d.name || 'Lead', subtitle: d.clinic_name, start: new Date(), status: d.status, type: 'demo', raw: d })}
                                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-900/40 border border-gray-700 hover:border-gray-600 transition-colors text-left"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-white truncate">{d.name || 'Lead'}</div>
                                            <div className="text-xs text-gray-400 truncate">{d.clinic_name || d.clinic_type || '—'} · {d.phone}</div>
                                        </div>
                                        <span className="text-xs text-amber-400 shrink-0">{d.scheduled_at || 'sin fecha'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* ════ VISTA LISTA (tablas) ════ */
                <>
                    {/* Tabs Demos / Activaciones */}
                    <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                        {([
                            { id: 'demos' as Tab, label: 'Demos Citenly', count: pendingDemos },
                            { id: 'activations' as Tab, label: 'Activaciones HQ', count: pendingApts },
                        ]).map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={cn(
                                    'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all',
                                    tab === t.id ? 'bg-[#FF2E88] text-white' : 'text-gray-400 hover:text-white'
                                )}
                            >
                                {t.label}
                                {t.count > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center font-black">
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* DEMOS TAB */}
                    {tab === 'demos' && (
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            {['Fecha y Hora', 'Nombre / Negocio', 'Contacto', 'Necesidades', 'Estado', 'Acciones'].map(h => (
                                                <th key={h} className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {demos.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-16 text-center">
                                                    <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                                                    <p className="text-gray-500 text-sm">Sin demos agendadas aún</p>
                                                </td>
                                            </tr>
                                        ) : demos.map(demo => {
                                            const date = new Date(demo.scheduled_at)
                                            const valid = !isNaN(date.getTime())
                                            const st = STATUS_LABELS[demo.status] || STATUS_LABELS.pending
                                            return (
                                                <tr key={demo.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                                                            <CalendarIcon className="w-4 h-4 text-[#FF2E88]" />
                                                            {valid ? date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Por coordinar'}
                                                        </div>
                                                        {valid && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                                                <Clock className="w-3 h-3" />
                                                                {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="text-sm font-bold text-white flex items-center gap-2">
                                                            <User className="w-3.5 h-3.5 text-gray-500" />
                                                            {demo.name}
                                                            {demo.role && <span className="text-[10px] text-gray-600 font-normal">({demo.role})</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                                                            <Building2 className="w-3 h-3" />
                                                            {demo.clinic_name}
                                                            {demo.clinic_type && <span className="text-gray-600">· {demo.clinic_type}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="text-xs text-gray-400 flex items-center gap-1.5">
                                                            <Mail className="w-3 h-3" /> {demo.email}
                                                        </div>
                                                        <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                                                            <Phone className="w-3 h-3" /> {demo.phone}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 max-w-[200px]">
                                                        <p className="text-xs text-gray-500 truncate">{demo.needs || '—'}</p>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg', st.className)}>
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-1">
                                                            {demo.status === 'pending' && (
                                                                <button
                                                                    onClick={() => updateDemoStatus(demo.id, 'confirmed')}
                                                                    disabled={updatingId === demo.id}
                                                                    className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                                                                    title="Confirmar"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {(demo.status === 'pending' || demo.status === 'confirmed') && (
                                                                <>
                                                                    <button
                                                                        onClick={() => updateDemoStatus(demo.id, 'completed')}
                                                                        disabled={updatingId === demo.id}
                                                                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                                        title="Completar"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateDemoStatus(demo.id, 'cancelled')}
                                                                        disabled={updatingId === demo.id}
                                                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                                        title="Cancelar"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            <a
                                                                href={`https://wa.me/${demo.phone.replace(/\D/g, '')}?text=Hola ${demo.name}, te contactamos desde Citenly para confirmar tu demo.`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                                title="Contactar por WhatsApp"
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ACTIVATIONS TAB */}
                    {tab === 'activations' && (
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            {['Fecha y Hora', 'Clínica / Prospecto', 'Contacto', 'Estado', 'Acciones'].map(h => (
                                                <th key={h} className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {appointments.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-16 text-center">
                                                    <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                                                    <p className="text-gray-500 text-sm">Sin activaciones agendadas</p>
                                                </td>
                                            </tr>
                                        ) : appointments.map(apt => {
                                            const date = new Date(apt.scheduled_at)
                                            const owner = apt.clinic_members?.[0]
                                            const st = STATUS_LABELS[apt.status] || STATUS_LABELS.pending
                                            return (
                                                <tr key={apt.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-bold text-white">
                                                            {date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs · {apt.duration_minutes} min
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="text-sm font-bold text-white flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-gray-500" />
                                                            {apt.clinic_settings?.clinic_name || 'Desconocida'}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-0.5 font-mono">{apt.clinic_id.substring(0, 8)}…</div>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-300">
                                                            {owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Sin nombre' : 'Sin dueño'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {owner?.email || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg', st.className)}>
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        {apt.status === 'scheduled' && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => updateAptStatus(apt.id, 'completed', apt.clinic_id)}
                                                                    disabled={updatingId === apt.id}
                                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                                    title="Completar"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => updateAptStatus(apt.id, 'cancelled', apt.clinic_id)}
                                                                    disabled={updatingId === apt.id}
                                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                                    title="Cancelar"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ════ MODAL DE DETALLE ════ */}
            {selectedEvent && (() => {
                const ev = selectedEvent
                const st = STATUS_LABELS[ev.status] || STATUS_LABELS.pending
                const dateValid = parseDate(ev.raw.scheduled_at)
                return (
                    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-gray-800">
                                <div>
                                    <h2 className="text-lg font-bold text-white">{ev.title}</h2>
                                    <span className={cn('inline-block mt-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded', st.className)}>{st.label}</span>
                                </div>
                                <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    {dateValid
                                        ? dateValid.toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + ' hrs'
                                        : <span className="text-amber-400">{ev.raw.scheduled_at || 'Por coordinar'}</span>}
                                </div>
                                {ev.type === 'demo' && (
                                    <>
                                        {ev.raw.clinic_name && <div className="flex items-center gap-2 text-gray-300"><Building2 className="w-4 h-4 text-gray-500" /> {ev.raw.clinic_name}{ev.raw.clinic_type ? ` · ${ev.raw.clinic_type}` : ''}</div>}
                                        {ev.raw.email && <div className="flex items-center gap-2 text-gray-300"><Mail className="w-4 h-4 text-gray-500" /> {ev.raw.email}</div>}
                                        {ev.raw.phone && <div className="flex items-center gap-2 text-gray-300"><Phone className="w-4 h-4 text-gray-500" /> {ev.raw.phone}</div>}
                                        {ev.raw.needs && <div className="text-gray-400 bg-gray-800/60 rounded-lg p-3">{ev.raw.needs}</div>}
                                    </>
                                )}
                                {ev.type === 'appointment' && (
                                    <>
                                        {ev.raw.clinic_members?.[0]?.email && <div className="flex items-center gap-2 text-gray-300"><Mail className="w-4 h-4 text-gray-500" /> {ev.raw.clinic_members[0].email}</div>}
                                        {ev.raw.notes && <div className="text-gray-400 bg-gray-800/60 rounded-lg p-3">{ev.raw.notes}</div>}
                                    </>
                                )}
                            </div>
                            {/* Acciones */}
                            <div className="flex flex-wrap gap-2 p-5 border-t border-gray-800">
                                {ev.type === 'demo' && (
                                    <>
                                        {ev.raw.status === 'pending' && (
                                            <button onClick={() => demoAction(ev.raw.id, 'confirmed')} disabled={updatingId === ev.raw.id} className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors text-sm font-semibold"><CheckCircle className="w-4 h-4" /> Confirmar</button>
                                        )}
                                        {(ev.raw.status === 'pending' || ev.raw.status === 'confirmed') && (
                                            <>
                                                <button onClick={() => demoAction(ev.raw.id, 'completed')} disabled={updatingId === ev.raw.id} className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors text-sm font-semibold"><CheckCircle className="w-4 h-4" /> Completar</button>
                                                <button onClick={() => demoAction(ev.raw.id, 'cancelled')} disabled={updatingId === ev.raw.id} className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-colors text-sm font-semibold"><XCircle className="w-4 h-4" /> Cancelar</button>
                                            </>
                                        )}
                                        {ev.raw.phone && (
                                            <a href={`https://wa.me/${ev.raw.phone.replace(/\D/g, '')}?text=Hola ${ev.raw.name}, te contactamos desde Citenly 🌿`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/25 transition-colors text-sm font-semibold"><MessageSquare className="w-4 h-4" /> WhatsApp</a>
                                        )}
                                    </>
                                )}
                                {ev.type === 'appointment' && ev.raw.status === 'scheduled' && (
                                    <>
                                        <button onClick={() => aptAction(ev.raw.id, 'completed', ev.raw.clinic_id)} disabled={updatingId === ev.raw.id} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors text-sm font-semibold"><CheckCircle className="w-4 h-4" /> Completar</button>
                                        <button onClick={() => aptAction(ev.raw.id, 'cancelled', ev.raw.clinic_id)} disabled={updatingId === ev.raw.id} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-colors text-sm font-semibold"><XCircle className="w-4 h-4" /> Cancelar</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}

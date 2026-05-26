import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar as CalendarIcon, Clock, Building2, Mail, Phone, Loader2, CheckCircle, XCircle, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'demos' | 'activations'

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

export default function AdminCalendar() {
    const [tab, setTab] = useState<Tab>('demos')
    const [demos, setDemos] = useState<DemoRequest[]>([])
    const [appointments, setAppointments] = useState<HQAppointment[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

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

    const pendingDemos = demos.filter(d => d.status === 'pending').length
    const pendingApts = appointments.filter(a => a.status === 'scheduled').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Demos & Activaciones</h1>
                    <p className="text-gray-400 text-sm mt-1">Solicitudes de demo y sesiones de onboarding</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-bold">
                        {pendingDemos} demos pendientes
                    </span>
                </div>
            </div>

            {/* Tabs */}
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

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : (
                <>
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
                                            const st = STATUS_LABELS[demo.status] || STATUS_LABELS.pending
                                            return (
                                                <tr key={demo.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                                                            <CalendarIcon className="w-4 h-4 text-[#FF2E88]" />
                                                            {date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                                            <Clock className="w-3 h-3" />
                                                            {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                                                        </div>
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
        </div>
    )
}

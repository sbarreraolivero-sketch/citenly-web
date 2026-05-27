import { useState, useEffect } from 'react'
import {
    Calendar,
    MessageSquare,
    TrendingUp,
    Clock,
    Loader2,
    Crown,
    Star,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Bell,
    Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useClinicTimezone } from '@/hooks/useClinicTimezone'
import { Link } from 'react-router-dom'

interface DashboardStats {
    scheduledAppointments: number
    newProspects: number
    aiMessagesSent: number
    remindersSent: number
}

interface Appointment {
    id: string
    patient_name: string
    service: string
    appointment_date: string
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
}

interface Message {
    id: string
    phone_number: string
    content: string
    created_at: string
    direction: 'inbound' | 'outbound'
    status: string
    ai_generated?: boolean
    ai_model?: string
}

interface ServiceRanking {
    name: string
    count: number
    percentage: number
    trend: 'up' | 'down' | 'stable'
}

export default function Dashboard() {
    const { user, profile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [filterRange, setFilterRange] = useState<'day' | 'week' | 'month' | 'year'>('month')
    const [stats, setStats] = useState<DashboardStats>({
        scheduledAppointments: 0,
        newProspects: 0,
        aiMessagesSent: 0,
        remindersSent: 0
    })
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
    const [recentMessages, setRecentMessages] = useState<Message[]>([])

    // Services ranking data
    const [servicesRanking, setServicesRanking] = useState<ServiceRanking[]>([])
    const [conversionStats, setConversionStats] = useState({
        consultations: 0,
        converted: 0,
        lost: 0,
        rate: 0
    })
    const [satisfactionStats, setSatisfactionStats] = useState({
        sent: 0,
        responded: 0,
        nps: 0,
        average: 0
    })
    const [trends, setTrends] = useState<Record<string, string>>({
        appointments: '0%',
        prospects: '0%',
        aiMessages: '0%',
        reminders: '0%'
    })
    const [isTrendsUp, setIsTrendsUp] = useState<Record<string, boolean>>({
        appointments: true,
        prospects: true,
        aiMessages: true,
        reminders: true
    })

    const { getDateRange } = useClinicTimezone()

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user || !profile?.clinic_id) return

            setLoading(true)
            try {
                // Get range boundaries in UTC for queries
                const { start: rangeStart, end: rangeEnd } = getDateRange(filterRange)
                const startStr = rangeStart.toISOString()
                const endStr = rangeEnd.toISOString()
                const clinicId = profile.clinic_id

                // 1. Parallel Fetching of Independent Data (with 10s timeout)
                const [
                    { data: clinicStats },
                    { data: upcoming },
                    { data: recentMsgs },
                    { data: rankingData },
                    { data: surveyData }
                ] = await Promise.race([
                    Promise.all([
                        // A. All pre-calculated stats for this clinic
                        supabase.from('clinic_stats').select('*').eq('clinic_id', clinicId),
                        
                        // B. Upcoming Appointments (Next 5)
                        supabase.from('appointments')
                            .select('id, patient_name, service, appointment_date, status')
                            .eq('clinic_id', clinicId)
                            .gte('appointment_date', new Date().toISOString())
                            .order('appointment_date', { ascending: true })
                            .limit(5),
                        
                        // C. Recent Messages (Last 3)
                        supabase.from('messages')
                            .select('id, phone_number, content, created_at, direction, status')
                            .eq('clinic_id', clinicId)
                            .order('created_at', { ascending: false })
                            .limit(3),

                        // D. Service Ranking (Month to Date)
                        supabase.from('appointments')
                            .select('service')
                            .eq('clinic_id', clinicId)
                            .gte('appointment_date', getDateRange(filterRange).start.toISOString()),

                        // E. Satisfaction Surveys (Month to Date)
                        supabase.from('satisfaction_surveys')
                            .select('id, status, rating, created_at')
                            .eq('clinic_id', clinicId)
                            .gte('created_at', getDateRange('month').start.toISOString())
                    ]),
                    new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Dashboard timeout')), 10000))
                ])

                // 2. Process Stats (Primary: clinic_stats table)
                if (clinicStats && clinicStats.length > 0) {
                    const findStat = (type: string) => clinicStats.find((s: any) => s.stat_type === type && s.period === filterRange)?.value || 0
                    const appointmentsCount = findStat('appointments')
                    const uniqueContacts = findStat('unique_contacts')
                    const prospectsCount = findStat('prospects')
                    const aiMessagesCount = findStat('ai_messages')
                    const remindersCount = findStat('reminders')

                    setStats({
                        scheduledAppointments: appointmentsCount,
                        newProspects: prospectsCount,
                        aiMessagesSent: aiMessagesCount,
                        remindersSent: remindersCount
                    })

                    // Update conversion stats - Use max of contacts or prospects to be more realistic
                    const totalLeads = Math.max(uniqueContacts, prospectsCount, appointmentsCount)
                    setConversionStats({
                        consultations: totalLeads,
                        converted: appointmentsCount,
                        lost: Math.max(0, totalLeads - appointmentsCount),
                        rate: totalLeads > 0 ? Math.round((appointmentsCount / totalLeads) * 100) : 0
                    });

                    // 2.1 Fetch Previous Period for Trends
                    const prevRange = {
                        start: new Date(rangeStart),
                        end: new Date(rangeStart)
                    }
                    if (filterRange === 'day') prevRange.start.setDate(prevRange.start.getDate() - 1)
                    else if (filterRange === 'week') prevRange.start.setDate(prevRange.start.getDate() - 7)
                    else if (filterRange === 'month') prevRange.start.setMonth(prevRange.start.getMonth() - 1)
                    else if (filterRange === 'year') prevRange.start.setFullYear(prevRange.start.getFullYear() - 1)

                    const prevStartStr = prevRange.start.toISOString()
                    const prevEndStr = prevRange.end.toISOString()

                    const [
                        { count: prevAppts },
                        { count: prevPros },
                        { count: prevMsgs },
                        { count: prevRems }
                    ] = await Promise.all([
                        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).in('status', ['pending', 'confirmed']).gte('appointment_date', prevStartStr).lt('appointment_date', prevEndStr),
                        supabase.from('crm_prospects').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', prevStartStr).lt('created_at', prevEndStr),
                        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('ai_generated', true).eq('direction', 'outbound').gte('created_at', prevStartStr).lt('created_at', prevEndStr),
                        supabase.from('reminder_logs').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'sent').gte('sent_at', prevStartStr).lt('sent_at', prevEndStr)
                    ])

                    const calculateTrend = (curr: number, prev: number | null) => {
                        const p = prev || 0
                        if (p === 0) return { label: curr > 0 ? '+100%' : '0%', isUp: curr > 0 }
                        const diff = ((curr - p) / p) * 100
                        return { 
                            label: `${diff >= 0 ? '+' : ''}${Math.round(diff)}%`, 
                            isUp: diff >= 0 
                        }
                    }

                    const tAppts = calculateTrend(appointmentsCount, prevAppts)
                    const tPros = calculateTrend(prospectsCount, prevPros)
                    const tMsgs = calculateTrend(aiMessagesCount, prevMsgs)
                    const tRems = calculateTrend(remindersCount, prevRems)

                    setTrends({
                        appointments: tAppts.label,
                        prospects: tPros.label,
                        aiMessages: tMsgs.label,
                        reminders: tRems.label
                    })
                    setIsTrendsUp({
                        appointments: tAppts.isUp,
                        prospects: tPros.isUp,
                        aiMessages: tMsgs.isUp,
                        reminders: tRems.isUp
                    })

                } else {
                    // Fallback to real-time counts if stats table is empty (e.g. initial setup)
                    // @ts-ignore
                    supabase.rpc('refresh_clinic_stats', { target_clinic_id: clinicId })

                    
                    const [ { count: appts }, { count: pros }, { count: rems } ] = await Promise.all([
                        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).in('status', ['pending', 'confirmed']).gte('appointment_date', startStr).lte('appointment_date', endStr),
                        supabase.from('crm_prospects').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', startStr).lte('created_at', endStr),
                        supabase.from('reminder_logs').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'sent').gte('sent_at', startStr).lte('sent_at', endStr)
                    ])
                    const totalLeads = Math.max(appts || 0, pros || 0)
                    setStats({
                        scheduledAppointments: appts || 0,
                        newProspects: pros || 0,
                        aiMessagesSent: 0, // Fallback for messages is too heavy, skip it
                        remindersSent: rems || 0
                    })
                    setConversionStats({
                        consultations: totalLeads,
                        converted: appts || 0,
                        lost: Math.max(0, totalLeads - (appts || 0)),
                        rate: totalLeads > 0 ? Math.round(((appts || 0) / totalLeads) * 100) : 0
                    })
                }

                // 3. Process Secondary Data
                if (upcoming) setUpcomingAppointments(upcoming)
                if (recentMsgs) setRecentMessages(recentMsgs as Message[])

                // Ranking Logic
                if (rankingData && rankingData.length > 0) {
                    const serviceCounts: Record<string, number> = {}
                    rankingData.forEach((appt: any) => {
                        const service = appt.service || 'General'
                        serviceCounts[service] = (serviceCounts[service] || 0) + 1
                    })
                    const total = rankingData.length
                    setServicesRanking(Object.entries(serviceCounts)
                        .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100), trend: 'stable' as const }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5))
                }

                // Overall Conversion Stats (Approximate using monthly Data)
                if (rankingData) {
                    // This is a rough estimate: appointments this month vs unique incoming contacts (not easily available here without full month fetch, skipping for now to favor speed)
                    // For now, keep conversionStats at 0 or update based on a new stat_type if needed.
                }

                // Satisfaction Surveys Logic
                if (surveyData) {
                    const sent = surveyData.length
                    const responded = surveyData.filter((s: any) => s.status === 'responded').length
                    const ratings = surveyData.filter((s: any) => s.status === 'responded' && s.rating).map((s: any) => s.rating!)
                    const average = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0
                    let nps = 0
                    if (ratings.length > 0) {
                        const promoters = ratings.filter((r: number) => r === 5).length
                        const detractors = ratings.filter((r: number) => r <= 3).length
                        nps = Math.round(((promoters - detractors) / ratings.length) * 100)
                    }
                    setSatisfactionStats({ sent, responded, nps, average })
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [user, profile?.clinic_id, filterRange])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    const filterOptions = [
        { id: 'day', label: 'Hoy' },
        { id: 'week', label: 'Esta Semana' },
        { id: 'month', label: 'Este Mes' },
        { id: 'year', label: 'Este Año' }
    ]

    const getProgress = (val: number, type: 'appointments' | 'prospects' | 'aiMessages' | 'reminders') => {
        const goals: any = {
            day: { appointments: 10, prospects: 5, aiMessages: 50, reminders: 10 },
            week: { appointments: 50, prospects: 25, aiMessages: 250, reminders: 50 },
            month: { appointments: 200, prospects: 100, aiMessages: 1000, reminders: 200 },
            year: { appointments: 2000, prospects: 1000, aiMessages: 10000, reminders: 2000 }
        }
        const goal = goals[filterRange][type] || 100
        return Math.min(100, (val / goal) * 100)
    }

    const statCards = [
        {
            id: 'appointments',
            name: 'CITAS AGENDADAS',
            value: stats.scheduledAppointments,
            icon: Calendar,
            trend: trends.appointments,
            isUp: isTrendsUp.appointments,
            gradient: 'from-[#FF2E88] to-[#c0236a]',
            lightText: 'text-pink-200',
        },
        {
            id: 'prospects',
            name: 'NUEVOS PROSPECTOS',
            value: stats.newProspects,
            icon: Target,
            trend: trends.prospects,
            isUp: isTrendsUp.prospects,
            gradient: 'from-violet-500 to-violet-700',
            lightText: 'text-violet-200',
        },
        {
            id: 'aiMessages',
            name: 'MENSAJES DE IA',
            value: stats.aiMessagesSent,
            icon: MessageSquare,
            trend: trends.aiMessages,
            isUp: isTrendsUp.aiMessages,
            gradient: 'from-sky-500 to-sky-700',
            lightText: 'text-sky-200',
        },
        {
            id: 'reminders',
            name: 'RECORDATORIOS',
            value: stats.remindersSent,
            icon: Bell,
            trend: trends.reminders,
            isUp: isTrendsUp.reminders,
            gradient: 'from-emerald-500 to-emerald-700',
            lightText: 'text-emerald-200',
        },
    ]

    return (
        <div className="space-y-8 animate-fade-in">            {/* Welcome Banner and Filter Row */}
            <div className="flex flex-col gap-6">
            {/* Banner — Principal */}
            <div className="bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-2xl overflow-hidden shadow-soft-md">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-widest text-pink-200 mb-2">Principal</p>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                                ¡Hola, {profile?.full_name?.split(' ')[0]}! 👋
                            </h1>
                            <p className="text-sm text-pink-100/80 font-light mt-1">Tu asistente IA está activo y listo para gestionar tus citas. Aquí tienes el resumen de hoy.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex flex-col items-end bg-white/15 px-5 py-2.5 rounded-xl border border-white/20">
                                <p className="text-[10px] font-black uppercase tracking-widest text-pink-200 mb-1">Sistema</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-bold text-white">IA Operativa</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-secondary-theme uppercase tracking-[0.2em]">Resumen de Rendimiento</p>
                    </div>
                    
                    <div className="flex items-center gap-1 p-1 bg-secondary-theme/50 rounded-xl border border-theme w-full md:w-auto">
                        {filterOptions.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setFilterRange(opt.id as any)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                                    filterRange === opt.id 
                                        ? "bg-[#FF2E88] text-white shadow-[0_0_15px_rgba(255,46,136,0.3)]"
                                        : "text-secondary-theme hover:text-white"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <div key={stat.name} className="card-premium overflow-hidden hover:-translate-y-0.5 transition-transform duration-200 shadow-md">
                        {/* Gradient Header */}
                        <div className={`bg-gradient-to-br ${stat.gradient} p-4 sm:p-5 text-white relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl pointer-events-none" />
                            <div className="flex items-start justify-between relative z-10">
                                <div>
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${stat.lightText} mb-2`}>{stat.name}</p>
                                    <stat.icon className="w-7 h-7 text-white" />
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg bg-white/20 text-white">
                                    {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {stat.trend}
                                </div>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="p-5 pb-8 relative">
                            <p className="text-4xl font-black text-primary-theme tracking-tight leading-none">{stat.value}</p>
                            <div className="absolute bottom-0 left-5 right-5 h-1.5 bg-secondary-theme/50 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${stat.gradient} rounded-full transition-all duration-1000`}
                                    style={{ width: `${getProgress(stat.value, stat.id as any)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Appointments */}
                <div className="lg:col-span-2 card-premium overflow-hidden">
                    <div className="bg-gradient-to-br from-[#FF2E88] to-[#c0236a] px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-white" />
                            <h3 className="text-sm font-black text-white tracking-tight uppercase">Próximas Citas</h3>
                        </div>
                        <Link to="/app/appointments" className="text-[10px] font-black uppercase tracking-widest text-pink-200 hover:text-white transition-colors">
                            Ver todas →
                        </Link>
                    </div>
                    <div className="p-6">

                    <div className="space-y-3">
                        {upcomingAppointments.length === 0 ? (
                            <p className="text-secondary-theme text-center py-4">No hay próximas citas agendadas.</p>
                        ) : (
                            upcomingAppointments.map((appointment) => (
                                <div
                                    key={appointment.id}
                                    className="flex items-center gap-4 p-4 bg-secondary-theme rounded-soft hover:bg-[var(--glow)] transition-colors border border-theme"
                                >
                                    <div className="w-12 h-12 bg-primary-theme rounded-full flex items-center justify-center shadow-soft">
                                        <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-primary-theme truncate">{appointment.patient_name}</p>
                                        <p className="text-sm text-secondary-theme">{appointment.service}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-primary-theme">
                                            {new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <span
                                            className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${appointment.status === 'confirmed'
                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                : 'bg-amber-500/10 text-amber-500'
                                                }`}
                                        >
                                            {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    </div>{/* end p-6 */}
                </div>

                {/* Recent Messages */}
                <div className="card-premium overflow-hidden">
                    <div className="bg-gradient-to-br from-sky-500 to-sky-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="w-5 h-5 text-white" />
                            <h3 className="text-sm font-black text-white tracking-tight uppercase">Mensajes Recientes</h3>
                        </div>
                        <Link to="/app/messages" className="text-[10px] font-black uppercase tracking-widest text-sky-200 hover:text-white transition-colors">
                            Ver todos →
                        </Link>
                    </div>
                    <div className="p-6">

                    <div className="space-y-4">
                        {recentMessages.length === 0 ? (
                            <p className="text-secondary-theme text-center py-4">No hay mensajes recientes.</p>
                        ) : (
                            recentMessages.map((message) => (
                                <div
                                    key={message.id}
                                    className="p-4 rounded-soft transition-colors hover:bg-secondary-theme cursor-pointer border border-transparent hover:border-theme"
                                    onClick={() => window.location.href = `/app/messages`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-secondary-theme rounded-full flex items-center justify-center flex-shrink-0 border border-theme">
                                            <span className="text-sm font-medium text-primary-theme">
                                                <MessageSquare className="w-4 h-4" />
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-medium text-primary-theme truncate">{message.phone_number}</p>
                                                <span className="text-xs text-secondary-theme flex-shrink-0">
                                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-secondary-theme mt-1 line-clamp-2">{message.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    </div>{/* end p-6 */}
                </div>
            </div>

            {/* Services Ranking */}
            <div className="card-premium overflow-hidden">
                <div className="bg-gradient-to-br from-amber-500 to-amber-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-white" />
                        <div>
                            <h3 className="text-sm font-black text-white tracking-tight uppercase">Ranking de Servicios</h3>
                            <p className="text-[10px] text-amber-200 font-medium">
                                {filterRange === 'day' ? 'Hoy' : filterRange === 'week' ? 'Esta semana' : filterRange === 'month' ? 'Este mes' : 'Este año'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-6 pb-8">

                <div className="space-y-4">
                    {servicesRanking.length === 0 ? (
                        <p className="text-charcoal/50 text-center py-6">
                            Aún no hay datos suficientes este mes.
                        </p>
                    ) : (
                        servicesRanking.map((service, index) => (
                            <div key={service.name} className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${index === 0 ? 'bg-amber-500 text-white' :
                                    index === 1 ? 'bg-gray-400 text-white' :
                                        index === 2 ? 'bg-amber-700 text-white' :
                                            'bg-secondary-theme text-secondary-theme border border-theme'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-medium text-primary-theme text-sm">{service.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-secondary-theme">{service.count} citas</span>
                                            <TrendingUp className={`w-4 h-4 ${service.trend === 'up' ? 'text-emerald-500' :
                                                service.trend === 'down' ? 'text-red-500 rotate-180' :
                                                    'text-charcoal/30'
                                                }`} />
                                        </div>
                                    </div>
                                    <div className="h-2 bg-secondary-theme/30 rounded-full overflow-hidden border border-theme/50">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#FF2E88] to-[#FF4DA6] rounded-full shadow-[0_0_10px_rgba(255,46,136,0.4)] transition-all duration-1000"
                                            style={{ width: `${service.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                </div>{/* end p-6 pb-8 */}
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Rate Card */}
                <div className="card-premium overflow-hidden">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-white" />
                            <div>
                                <h3 className="text-sm font-black text-white tracking-tight uppercase">Tasa de Conversión</h3>
                                <p className="text-[10px] text-emerald-200 font-medium">Consultas vs Citas Agendadas</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
                            {filterRange === 'day' ? 'Hoy' : filterRange === 'week' ? 'Semana' : filterRange === 'month' ? 'Mes' : 'Año'}
                        </span>
                    </div>
                    <div className="p-6">

                    <div className="relative py-10 flex flex-col items-center justify-center">
                        <p className="text-5xl font-black text-primary-theme tracking-tighter relative z-10">{conversionStats.rate}%</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-theme mt-3 relative z-10">
                            De efectividad este {filterRange === 'day' ? 'día' : filterRange === 'week' ? 'periodo' : filterRange === 'month' ? 'mes' : 'año'}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-theme/50">
                        <div className="text-center">
                            <p className="text-xl font-bold text-primary-theme">{conversionStats.consultations}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-theme">Contactos</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-primary-theme">{conversionStats.converted}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-theme">Citas</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-primary-theme">{conversionStats.lost}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-theme">Sin Cita</p>
                        </div>
                    </div>
                    </div>{/* end p-6 */}
                </div>

                {/* Satisfaction Surveys Card */}
                <div className="card-premium overflow-hidden">
                    <div className="bg-gradient-to-br from-violet-500 to-violet-700 px-6 py-4 flex items-center gap-3">
                        <Star className="w-5 h-5 text-white" />
                        <div>
                            <h3 className="text-sm font-black text-white tracking-tight uppercase">Satisfacción (NPS)</h3>
                            <p className="text-[10px] text-violet-200 font-medium">Calidad de servicio</p>
                        </div>
                    </div>
                    <div className="p-6">

                    <div className="text-center py-6 flex flex-col items-center">
                        <div className="flex justify-center gap-1.5 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-7 h-7 ${star <= Math.round(satisfactionStats.average) ? 'text-[#FF2E88] fill-[#FF2E88]' : 'text-secondary-theme/20'}`}
                                />
                            ))}
                        </div>
                        <p className="text-4xl font-black text-primary-theme tracking-tighter">{satisfactionStats.average.toFixed(1)} / 5.0</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-theme mt-2">Basado en {satisfactionStats.responded} respuestas</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-8 border-t border-theme/50">
                        <div className="text-center">
                            <p className="text-xl font-bold text-primary-theme">{satisfactionStats.sent}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-theme">Enviadas</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-primary-theme">{satisfactionStats.responded}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-theme">Respondidas</p>
                        </div>
                        <div className="text-center">
                            <p className={cn(
                                "text-xl font-bold",
                                satisfactionStats.nps > 0 ? 'text-emerald-500' : 'text-primary-theme'
                            )}>
                                {satisfactionStats.nps > 0 ? '+' : ''}{satisfactionStats.nps}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-theme">NPS</p>
                        </div>
                    </div>
                    </div>{/* end p-6 */}
                </div>
            </div>
        </div>
    )
}

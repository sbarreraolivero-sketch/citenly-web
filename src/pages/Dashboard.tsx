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
    CheckCircle2
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
    const [filterRange, setFilterRange] = useState<'day' | 'week' | 'month' | 'year'>('day')
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
                            .gte('appointment_date', getDateRange('month').start.toISOString()),

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

                    setStats({
                        scheduledAppointments: appointmentsCount,
                        newProspects: findStat('prospects'),
                        aiMessagesSent: findStat('ai_messages'),
                        remindersSent: findStat('reminders')
                    })

                    // Update conversion stats
                    setConversionStats({
                        consultations: uniqueContacts,
                        converted: appointmentsCount,
                        lost: Math.max(0, uniqueContacts - appointmentsCount),
                        rate: uniqueContacts > 0 ? Math.round((appointmentsCount / uniqueContacts) * 100) : 0
                    });
                } else {
                    // Fallback to real-time counts if stats table is empty (e.g. initial setup)
                    // @ts-ignore
                    supabase.rpc('refresh_clinic_stats', { target_clinic_id: clinicId })

                    
                    const [ { count: appts }, { count: pros }, { count: rems } ] = await Promise.all([
                        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).in('status', ['pending', 'confirmed']).gte('appointment_date', startStr).lte('appointment_date', endStr),
                        supabase.from('crm_prospects').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', startStr).lte('created_at', endStr),
                        supabase.from('reminder_logs').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'sent').gte('sent_at', startStr).lte('sent_at', endStr)
                    ])
                    setStats({
                        scheduledAppointments: appts || 0,
                        newProspects: pros || 0,
                        aiMessagesSent: 0, // Fallback for messages is too heavy, skip it
                        remindersSent: rems || 0
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

    const statCards = [
        {
            name: 'Citas agendadas',
            value: stats.scheduledAppointments,
            icon: Calendar,
            color: 'bg-indigo-500',
            textColor: 'text-indigo-500',
            bgLight: 'bg-indigo-50',
            trend: '+12%', // Static placeholder for premium look
            isUp: true
        },
        {
            name: 'Nuevos Prospectos',
            value: stats.newProspects,
            icon: Target,
            color: 'bg-emerald-500',
            textColor: 'text-emerald-500',
            bgLight: 'bg-emerald-50',
            trend: '+8%',
            isUp: true
        },
        {
            name: 'Mensajes de IA',
            value: stats.aiMessagesSent,
            icon: MessageSquare,
            color: 'bg-amber-500',
            textColor: 'text-amber-500',
            bgLight: 'bg-amber-50',
            trend: '+24%',
            isUp: true
        },
        {
            name: 'Recordatorios',
            value: stats.remindersSent,
            icon: Bell,
            color: 'bg-blue-500',
            textColor: 'text-blue-500',
            bgLight: 'bg-blue-50',
            trend: '100%',
            isUp: true
        },
    ]

    return (
        <div className="space-y-6 animate-fade-in">            {/* Welcome Banner and Filter Row */}
            <div className="flex flex-col gap-4">
                <div className="bg-hero-gradient rounded-softer p-4 text-white shadow-soft-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white">¡Hola, {profile?.full_name?.split(' ')[0]}! 👋</h1>
                            <p className="text-sm text-white/80">Tu asistente IA está activo y listo para gestionar tus citas.</p>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm hidden sm:flex">
                            <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-charcoal/40 uppercase tracking-widest">Resumen de Rendimiento</p>
                    </div>
                    
                    <div className="flex items-center gap-1 p-1 bg-ivory rounded-full border border-silk-beige w-full md:w-auto overflow-x-auto no-scrollbar">
                        {filterOptions.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setFilterRange(opt.id as any)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                                    filterRange === opt.id 
                                        ? "bg-primary-500 text-white shadow-sm"
                                        : "text-charcoal/50 hover:text-charcoal"
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
                    <div key={stat.name} className="bg-white rounded-softer p-5 border border-silk-beige shadow-soft-sm hover:shadow-soft-md transition-all group overflow-hidden relative">
                        {/* Decorative circle */}
                        <div className={cn("absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-5 transition-transform group-hover:scale-110", stat.color)} />
                        
                        <div className="flex items-start justify-between relative z-10">
                            <div className={cn("w-10 h-10 rounded-soft flex items-center justify-center", stat.bgLight)}>
                                <stat.icon className={cn("w-5 h-5", stat.textColor)} />
                            </div>
                            <div className={cn(
                                "flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full shadow-sm",
                                stat.isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}>
                                {stat.isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {stat.trend}
                            </div>
                        </div>
                        
                        <div className="mt-4 relative z-10">
                            <div className="flex items-baseline gap-1">
                                <p className="text-3xl font-bold text-charcoal leading-none">{stat.value}</p>
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-charcoal/70 mt-2">{stat.name}</p>
                        </div>

                        {/* Mobile optimizations (sparkline placeholder look) */}
                        <div className="mt-4 h-1.5 w-full bg-silk-beige/30 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-700", stat.color)} style={{ width: '65%' }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Appointments */}
                <div className="lg:col-span-2 card-soft p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-charcoal">Próximas Citas</h3>
                        <Link to="/app/appointments" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                            Ver todas
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {upcomingAppointments.length === 0 ? (
                            <p className="text-charcoal/50 text-center py-4">No hay próximas citas agendadas.</p>
                        ) : (
                            upcomingAppointments.map((appointment) => (
                                <div
                                    key={appointment.id}
                                    className="flex items-center gap-4 p-4 bg-ivory rounded-soft hover:bg-silk-beige/50 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-soft">
                                        <Clock className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-charcoal truncate">{appointment.patient_name}</p>
                                        <p className="text-sm text-charcoal/50">{appointment.service}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-charcoal">
                                            {new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <span
                                            className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${appointment.status === 'confirmed'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                                }`}
                                        >
                                            {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Messages */}
                <div className="card-soft p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-charcoal">Mensajes Recientes</h3>
                        <Link to="/app/messages" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                            Ver todos
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {recentMessages.length === 0 ? (
                            <p className="text-charcoal/50 text-center py-4">No hay mensajes recientes.</p>
                        ) : (
                            recentMessages.map((message) => (
                                <div
                                    key={message.id}
                                    className="p-4 rounded-soft transition-colors hover:bg-ivory cursor-pointer"
                                    onClick={() => window.location.href = `/app/messages`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-silk-beige rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm font-medium text-charcoal">
                                                <MessageSquare className="w-4 h-4" />
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-medium text-charcoal truncate">{message.phone_number}</p>
                                                <span className="text-xs text-charcoal/40 flex-shrink-0">
                                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-charcoal/60 mt-1 line-clamp-2">{message.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Services Ranking */}
            <div className="card-soft p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-soft flex items-center justify-center">
                            <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-charcoal">Ranking de Servicios (Este Mes)</h3>
                            <p className="text-sm text-charcoal/50">Servicios más solicitados</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {servicesRanking.length === 0 ? (
                        <p className="text-charcoal/50 text-center py-6">
                            Aún no hay datos suficientes este mes.
                        </p>
                    ) : (
                        servicesRanking.map((service, index) => (
                            <div key={service.name} className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${index === 0 ? 'bg-amber-500 text-white' :
                                    index === 1 ? 'bg-gray-300 text-gray-700' :
                                        index === 2 ? 'bg-amber-700 text-white' :
                                            'bg-silk-beige text-charcoal/60'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-medium text-charcoal text-sm">{service.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-charcoal/60">{service.count} citas</span>
                                            <TrendingUp className={`w-4 h-4 ${service.trend === 'up' ? 'text-emerald-500' :
                                                service.trend === 'down' ? 'text-red-500 rotate-180' :
                                                    'text-charcoal/30'
                                                }`} />
                                        </div>
                                    </div>
                                    <div className="h-2 bg-silk-beige rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${index === 0 ? 'bg-gradient-to-r from-primary-400 to-primary-600' :
                                                'bg-primary-400/60'
                                                }`}
                                            style={{ width: `${service.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Rate Card */}
                <div className="card-soft p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-soft flex items-center justify-center">
                                <Target className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-charcoal">Tasa de Conversión (Mes)</h3>
                                <p className="text-sm text-charcoal/50">Consultas vs Citas Agendadas</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center py-6">
                        <p className="text-4xl font-bold text-charcoal">{conversionStats.rate}%</p>
                        <p className="text-sm text-charcoal/50 mt-2">De efectividad este mes</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-silk-beige">
                        <div className="text-center">
                            <p className="text-lg font-semibold text-charcoal">{conversionStats.consultations}</p>
                            <p className="text-xs text-charcoal/50">Contactos</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-charcoal">{conversionStats.converted}</p>
                            <p className="text-xs text-charcoal/50">Citas</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-charcoal">{conversionStats.lost}</p>
                            <p className="text-xs text-charcoal/50">Sin Cita</p>
                        </div>
                    </div>
                </div>

                {/* Satisfaction Surveys Card */}
                <div className="card-soft p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-soft flex items-center justify-center">
                                <Star className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-charcoal">Satisfacción (NPS)</h3>
                                <p className="text-sm text-charcoal/50">Calidad de servicio</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center py-6">
                        <div className="flex justify-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-6 h-6 ${star <= Math.round(satisfactionStats.average) ? 'text-amber-400 fill-amber-400' : 'text-charcoal/20'}`}
                                />
                            ))}
                        </div>
                        <p className="text-2xl font-bold text-charcoal">{satisfactionStats.average.toFixed(1)} / 5.0</p>
                        <p className="text-xs text-charcoal/40 mt-1">Promedio de {satisfactionStats.responded} respuestas</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-silk-beige">
                        <div className="text-center">
                            <p className="text-lg font-semibold text-charcoal">{satisfactionStats.sent}</p>
                            <p className="text-xs text-charcoal/50">Enviadas</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-charcoal">{satisfactionStats.responded}</p>
                            <p className="text-xs text-charcoal/50">Respondidas</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-lg font-semibold ${satisfactionStats.nps > 0 ? 'text-emerald-500' : 'text-charcoal'}`}>
                                {satisfactionStats.nps > 0 ? '+' : ''}{satisfactionStats.nps}
                            </p>
                            <p className="text-xs text-charcoal/50">NPS</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

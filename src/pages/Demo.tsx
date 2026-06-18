import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Sparkles, Clock, User, Building2, Mail, Phone,
    CheckCircle2, Loader2, ArrowRight, ChevronLeft, ChevronRight, Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Question data ────────────────────────────────────────────────────────────

type SingleQ  = { id: string; type: 'single';   title: string; subtitle: string; options: string[]; cols?: 2 }
type MultiQ   = { id: string; type: 'multi';    title: string; subtitle: string; options: string[] }
type ContactQ = { id: string; type: 'contact';  title: string; subtitle: string }
type ScheduleQ= { id: string; type: 'schedule'; title: string; subtitle: string }
type Question = SingleQ | MultiQ | ContactQ | ScheduleQ

const QUESTIONS: Question[] = [
    {
        id: 'challenge', type: 'single',
        title: '¿Cuál es tu mayor desafío hoy?',
        subtitle: 'Elige la opción que más te representa.',
        options: [
            'Mis clientas olvidan las citas y no llegan',
            'Paso horas respondiendo WhatsApp manualmente',
            'No tengo control de mis ingresos y gastos',
            'No sé cuántos clientes regresan vs. se van',
            'Me cuesta captar nuevas clientas',
            'Gestionar el equipo me consume demasiado tiempo',
        ],
    },
    {
        id: 'role', type: 'single',
        title: '¿Cuál es tu rol en el negocio?',
        subtitle: 'Así personalizamos tu demo.',
        options: ['Dueña / Propietaria', 'Administradora', 'Profesional de estética', 'Gerente / Directora', 'Otro'],
    },
    {
        id: 'clinic_type', type: 'single', cols: 2,
        title: '¿Qué tipo de negocio tienes?',
        subtitle: 'Selecciona el que mejor te describe.',
        options: [
            'Clínica de estética facial', 'Salón de belleza',
            'Centro de medicina estética', 'Clínica de depilación láser',
            'Spa y centro de bienestar', 'Micropigmentación / PMU',
            'Centro de masajes y terapias', 'Otro',
        ],
    },
    {
        id: 'goals', type: 'multi',
        title: '¿Qué quieres lograr con Citenly?',
        subtitle: 'Puedes elegir más de una.',
        options: [
            'Agendar citas automáticamente por WhatsApp',
            'Reducir citas perdidas con recordatorios',
            'Captar más clientes nuevos',
            'Fidelizar y retener a mis clientas',
            'Ver métricas y reportes de mi negocio',
            'Tener un asistente IA que trabaje 24/7',
        ],
    },
    {
        id: 'contact', type: 'contact',
        title: 'Casi listo — cuéntanos sobre ti',
        subtitle: 'Solo lo esencial para confirmar tu demo.',
    },
    {
        id: 'schedule', type: 'schedule',
        title: 'Elige cuándo te llamamos',
        subtitle: 'Demos de 30 min, lunes a sábado.',
    },
]

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number) {
    const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function formatDate(date: Date) {
    return date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatDateISO(date: Date) {
    return date.toISOString().split('T')[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Demo() {
    const [currentQ, setCurrentQ] = useState(0)
    const [visible, setVisible]   = useState(true)
    const [animating, setAnimating] = useState(false)
    const [answers, setAnswers]   = useState<Record<string, string | string[]>>({})

    // Contact fields
    const [name, setName]           = useState('')
    const [clinicName, setClinicName] = useState('')
    const [email, setEmail]         = useState('')
    const [phone, setPhone]         = useState('')

    // Schedule
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState('')
    const [calendarOffset, setCalendarOffset] = useState(0)
    const [loading, setLoading]   = useState(false)
    const [submitted, setSubmitted] = useState(false)

    // Build next 14 business days (skip sundays)
    const availableDays: Date[] = []
    let d = addDays(new Date(), 1)
    while (availableDays.length < 14) {
        if (d.getDay() !== 0) availableDays.push(new Date(d))
        d = addDays(d, 1)
    }
    const visibleDays = availableDays.slice(calendarOffset, calendarOffset + 5)

    const progress = (currentQ / QUESTIONS.length) * 100
    const q = QUESTIONS[currentQ]

    // ── Navigation ────────────────────────────────────────────────────────────

    const go = (nextQ: number) => {
        if (animating || nextQ < 0 || nextQ >= QUESTIONS.length) return
        setAnimating(true)
        setVisible(false)
        setTimeout(() => {
            setCurrentQ(nextQ)
            setVisible(true)
            setAnimating(false)
        }, 220)
    }

    const advance = () => go(currentQ + 1)
    const back    = () => go(currentQ - 1)

    const selectSingle = (value: string) => {
        setAnswers(prev => ({ ...prev, [q.id]: value }))
        setTimeout(() => advance(), 380)
    }

    const toggleMulti = (value: string) => {
        setAnswers(prev => {
            const cur = (prev[q.id] as string[]) || []
            return { ...prev, [q.id]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] }
        })
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime || loading) return
        setLoading(true)
        const db = supabase as any
        const { error } = await db.from('demo_requests').insert({
            name,
            clinic_name: clinicName,
            email,
            phone,
            clinic_type: answers.clinic_type || '',
            needs: Array.isArray(answers.goals) ? (answers.goals as string[]).join(', ') : '',
            role: answers.role || '',
            scheduled_at: `${formatDateISO(selectedDate)}T${selectedTime}:00`,
            status: 'pending',
        })
        setLoading(false)
        if (!error) {
            if (typeof window !== 'undefined' && (window as any).fbq) {
                (window as any).fbq('track', 'CompleteRegistration')
            }
            setSubmitted(true)
        }
    }

    // ── Success screen ────────────────────────────────────────────────────────

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-3 tracking-tight">¡Demo agendada!</h1>
                    <p className="text-white/50 mb-2">
                        Te esperamos el{' '}
                        <span className="text-white font-bold">{selectedDate ? formatDate(selectedDate) : ''}</span>{' '}
                        a las <span className="text-white font-bold">{selectedTime} hrs</span>.
                    </p>
                    <p className="text-white/40 text-sm mb-8">
                        Te contactaremos por WhatsApp al {phone} para confirmar.
                    </p>
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 bg-[#FF2E88] text-white font-black px-6 py-3 rounded-xl hover:bg-[#e0266f] transition-colors"
                    >
                        Volver al inicio <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        )
    }

    // ── Main layout ───────────────────────────────────────────────────────────

    const multiSelected = (answers[q.id] as string[]) || []
    const contactReady  = name && clinicName && email && phone

    return (
        <div className="min-h-screen bg-[#0A0A0F] flex flex-col">

            {/* Nav + progress bar */}
            <nav className="sticky top-0 z-50 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF2E88]/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tight text-white">Citenly</span>
                    </Link>
                    <span className="text-sm text-white/30 font-medium tabular-nums">
                        {currentQ + 1} / {QUESTIONS.length}
                    </span>
                    <Link to="/login" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
                        Ya tengo cuenta →
                    </Link>
                </div>
                <div className="h-0.5 bg-white/[0.06]">
                    <div
                        className="h-full bg-[#FF2E88] transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </nav>

            {/* Content */}
            <div className="flex-1 flex items-start justify-center px-6 py-12 md:items-center">
                <div className="w-full max-w-xl">

                    {/* Back button */}
                    {currentQ > 0 && (
                        <button
                            onClick={back}
                            disabled={animating}
                            className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors mb-8 group"
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            Atrás
                        </button>
                    )}

                    {/* Animated question container */}
                    <div className={cn(
                        'transition-all duration-200',
                        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                    )}>
                        {/* Header */}
                        <div className="mb-8">
                            <p className="text-xs font-black uppercase tracking-widest text-[#FF2E88]/70 mb-3">
                                Pregunta {currentQ + 1}
                            </p>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                                {q.title}
                            </h2>
                            <p className="text-white/40 mt-2 text-sm">{q.subtitle}</p>
                        </div>

                        {/* ── Single select ── */}
                        {q.type === 'single' && (
                            <div className={cn(
                                'grid gap-2.5',
                                (q as SingleQ).cols === 2 ? 'grid-cols-2' : 'grid-cols-1'
                            )}>
                                {(q as SingleQ).options.map(opt => {
                                    const selected = answers[q.id] === opt
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => !animating && selectSingle(opt)}
                                            disabled={animating}
                                            className={cn(
                                                'flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-all duration-150',
                                                selected
                                                    ? 'border-[#FF2E88]/60 bg-[#FF2E88]/[0.12] text-white'
                                                    : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white hover:bg-white/[0.06]'
                                            )}
                                        >
                                            <div className={cn(
                                                'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                                                selected ? 'border-[#FF2E88] bg-[#FF2E88]' : 'border-white/20'
                                            )}>
                                                {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                            </div>
                                            {opt}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* ── Multi select ── */}
                        {q.type === 'multi' && (
                            <>
                                <div className="grid grid-cols-1 gap-2.5 mb-6">
                                    {(q as MultiQ).options.map(opt => {
                                        const selected = multiSelected.includes(opt)
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => toggleMulti(opt)}
                                                className={cn(
                                                    'flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-all duration-150',
                                                    selected
                                                        ? 'border-[#FF2E88]/60 bg-[#FF2E88]/[0.12] text-white'
                                                        : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white hover:bg-white/[0.06]'
                                                )}
                                            >
                                                <div className={cn(
                                                    'shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                                                    selected ? 'border-[#FF2E88] bg-[#FF2E88]' : 'border-white/20'
                                                )}>
                                                    {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                </div>
                                                {opt}
                                            </button>
                                        )
                                    })}
                                </div>
                                <button
                                    onClick={advance}
                                    disabled={multiSelected.length === 0 || animating}
                                    className="w-full bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Continuar <ArrowRight className="w-4 h-4" />
                                </button>
                            </>
                        )}

                        {/* ── Contact form ── */}
                        {q.type === 'contact' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-2">Nombre completo</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="María González"
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-2">Nombre del negocio</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            <input
                                                type="text"
                                                value={clinicName}
                                                onChange={e => setClinicName(e.target.value)}
                                                placeholder="Clínica Bella Estética"
                                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-2">WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                placeholder="+56 9 1234 5678"
                                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-2">Correo electrónico</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="maria@micentro.com"
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium transition-colors"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={advance}
                                    disabled={!contactReady || animating}
                                    className="w-full bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                                >
                                    Continuar <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* ── Schedule ── */}
                        {q.type === 'schedule' && (
                            <div className="space-y-6">
                                {/* Calendar strip */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-black uppercase tracking-widest text-white/30">Selecciona un día</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setCalendarOffset(Math.max(0, calendarOffset - 5))}
                                                disabled={calendarOffset === 0}
                                                className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/30 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setCalendarOffset(Math.min(availableDays.length - 5, calendarOffset + 5))}
                                                disabled={calendarOffset >= availableDays.length - 5}
                                                className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/30 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {visibleDays.map(day => (
                                            <button
                                                key={day.toISOString()}
                                                onClick={() => { setSelectedDate(day); setSelectedTime('') }}
                                                className={cn(
                                                    'flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all',
                                                    selectedDate?.toDateString() === day.toDateString()
                                                        ? 'border-[#FF2E88] bg-[#FF2E88]/15 text-white'
                                                        : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
                                                )}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">
                                                    {day.toLocaleDateString('es-CL', { weekday: 'short' })}
                                                </span>
                                                <span className="text-lg font-black">{day.getDate()}</span>
                                                <span className="text-[10px] opacity-50">
                                                    {day.toLocaleDateString('es-CL', { month: 'short' })}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Time slots */}
                                {selectedDate && (
                                    <div>
                                        <span className="block text-xs font-black uppercase tracking-widest text-white/30 mb-3">
                                            Horario disponible — {formatDate(selectedDate)}
                                        </span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {TIME_SLOTS.map(time => (
                                                <button
                                                    key={time}
                                                    onClick={() => setSelectedTime(time)}
                                                    className={cn(
                                                        'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all',
                                                        selectedTime === time
                                                            ? 'border-[#FF2E88] bg-[#FF2E88]/15 text-white'
                                                            : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
                                                    )}
                                                >
                                                    <Clock className="w-3.5 h-3.5 opacity-50" />
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedDate || !selectedTime || loading}
                                    className="w-full bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Agendando…</>
                                    ) : (
                                        <>Confirmar Demo <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

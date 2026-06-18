import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Clock, User, Building2, Mail, Phone,
    CheckCircle2, Loader2, ArrowRight, ChevronLeft, ChevronRight, Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Testimonios ──────────────────────────────────────────────────────────────

const TESTIMONIALS = [
    {
        name: 'Elizabeth Hernández',
        role: 'Microblading y Micropigmentación',
        tag: 'MICROPIGMENTACIÓN · LINARES',
        quote: 'El asistente empezó a avisarles a mis clientas que les tocaba el retoque. Tenía chicas que llevaban más de un año sin aparecer y de repente me escribían. Eso no lo planifiqué — simplemente pasó solo. Ahora mi agenda la maneja Citenly. Yo me dedico a trabajar.',
        photo: '/elizabeth.jpeg',
        gradient: 'from-[#1a0010] via-[#2d001a] to-[#0d0d1a]',
    },
    {
        name: 'Sofia Ibañez',
        role: 'Micropigmentista',
        tag: 'MICROPIGMENTACIÓN · CONCEPCIÓN',
        quote: 'La IA de Citenly atiende mucho mejor que una persona real. Antes tenía que atender todos los mensajes yo misma — las personas esperaban horas. Ahora solo me dedico a lo mío y mi asistente digital me llena la agenda.',
        photo: '/sofia-yanez-3.jpg',
        gradient: 'from-[#001a1a] via-[#002626] to-[#0d0d1a]',
    },
    {
        name: 'Carolina Rojas Painemán',
        role: 'PMU Artist',
        tag: 'PMU · TEMUCO',
        quote: 'Me sorprendió desde el primer momento la calidad de las respuestas. Agenda, cancela, reagenda y recuerda los mensajes de mis clientas de manera eficiente. Nada que ver con otro sistema que probé. No los cambiaría tan fácilmente.',
        photo: '/carolina-rojas-paineman.png',
        gradient: 'from-[#0d001a] via-[#1a0033] to-[#0d0d1a]',
    },
    {
        name: 'Fiorella Vásquez',
        role: 'Especialista en Armonización Facial',
        tag: 'ARMONIZACIÓN · SANTIAGO',
        quote: 'Citenly es una gran inversión. Me da una tranquilidad que otros sistemas no entregan. Me configuraron el asistente exactamente como quería que atendiera a mis clientas. Me libera demasiado tiempo que ahora dedico a la familia.',
        photo: '/fiorella-testimonio.png',
        gradient: 'from-[#1a0d00] via-[#261500] to-[#0d0d1a]',
    },
]

const STATS = [
    { value: '+50h', label: 'ahorradas al mes' },
    { value: '−70%', label: 'inasistencias' },
    { value: '48h',  label: 'para implementar' },
]

// ─── Questions ────────────────────────────────────────────────────────────────

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
        title: 'Tus datos de contacto',
        subtitle: 'Para preparar la reunión y confirmarte por WhatsApp.',
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
    return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
}
function formatDateISO(date: Date) {
    return date.toISOString().split('T')[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Demo() {
    // ── Testimonial carousel ──
    const [activeT, setActiveT] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => setActiveT(p => (p + 1) % TESTIMONIALS.length), 5000)
        return () => clearInterval(interval)
    }, [])

    // ── Form state ──
    const [currentQ, setCurrentQ]   = useState(0)
    const [visible, setVisible]     = useState(true)
    const [animating, setAnimating] = useState(false)
    const [answers, setAnswers]     = useState<Record<string, string | string[]>>({})

    const [name, setName]             = useState('')
    const [clinicName, setClinicName] = useState('')
    const [email, setEmail]           = useState('')
    const [phone, setPhone]           = useState('')

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

    const q       = QUESTIONS[currentQ]
    const multiSelected = (answers[q.id] as string[]) || []
    const contactReady  = name && clinicName && email && phone

    // ── Navigation ──
    const go = (nextQ: number) => {
        if (animating || nextQ < 0 || nextQ >= QUESTIONS.length) return
        setAnimating(true)
        setVisible(false)
        setTimeout(() => { setCurrentQ(nextQ); setVisible(true); setAnimating(false) }, 220)
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

    // ── Submit ──
    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime || loading) return
        setLoading(true)
        const db = supabase as any
        const { error } = await db.from('demo_requests').insert({
            name, clinic_name: clinicName, email, phone,
            clinic_type: answers.clinic_type || '',
            needs: Array.isArray(answers.goals) ? (answers.goals as string[]).join(', ') : '',
            role: answers.role || '',
            scheduled_at: `${formatDateISO(selectedDate)}T${selectedTime}:00`,
            status: 'pending',
        })
        setLoading(false)
        if (!error) {
            if (typeof window !== 'undefined' && (window as any).fbq)
                (window as any).fbq('track', 'CompleteRegistration')
            setSubmitted(true)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Shared UI pieces
    // ─────────────────────────────────────────────────────────────────────────

    const testimonial = TESTIMONIALS[activeT]

    /** Left panel — sticky testimonial carousel */
    const LeftPanel = (
        <aside className="hidden lg:flex lg:w-[44%] xl:w-[42%] sticky top-0 h-screen flex-col overflow-hidden shrink-0">
            {/* Background layer */}
            <div className="absolute inset-0">
                {testimonial.photo ? (
                    <>
                        <img
                            src={testimonial.photo}
                            alt={testimonial.name}
                            className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
                    </>
                ) : (
                    <div className={cn('absolute inset-0 bg-gradient-to-br transition-all duration-700', testimonial.gradient)} />
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full p-8">
                {/* Top: logo + badge */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <img src="/citenly-icon.png" alt="Citenly" className="w-8 h-8 rounded-xl" />
                        <span className="text-base font-black tracking-tight text-white">Citenly</span>
                    </Link>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white bg-black/30 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1">
                        30 min · sin compromiso
                    </span>
                </div>

                {/* Middle: stats */}
                <div className="mt-auto mb-8 grid grid-cols-3 gap-3">
                    {STATS.map(s => (
                        <div key={s.label} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                            <p className="text-xl font-black text-white">{s.value}</p>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Bottom: testimonial card */}
                <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#FF2E88] bg-[#FF2E88]/20 border border-[#FF2E88]/50 rounded-full px-3 py-1 mb-4">
                        {testimonial.tag}
                    </span>
                    <p className="text-white/90 text-sm leading-relaxed font-medium mb-5">
                        "{testimonial.quote}"
                    </p>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-black text-sm">{testimonial.name}</p>
                            <p className="text-white/40 text-xs mt-0.5">{testimonial.role}</p>
                        </div>
                        {/* Carousel dots */}
                        <div className="flex gap-1.5">
                            {TESTIMONIALS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveT(i)}
                                    className={cn(
                                        'rounded-full transition-all duration-300',
                                        i === activeT ? 'w-5 h-1.5 bg-[#FF2E88]' : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )

    /** Progress bar segments */
    const ProgressBar = (
        <div className="flex gap-1 px-5 md:px-10 pt-3 pb-0">
            {QUESTIONS.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.08]">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all duration-500',
                            i < currentQ ? 'bg-[#FF2E88] w-full' : i === currentQ ? 'bg-[#FF2E88]/60 w-full' : 'w-0'
                        )}
                    />
                </div>
            ))}
        </div>
    )

    /** Form content (question + options) */
    const FormContent = (
        <div className={cn(
            'transition-all duration-200',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        )}>
            {/* Header */}
            <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF2E88]/70 mb-1.5">
                    Paso {currentQ + 1} de {QUESTIONS.length}
                </p>
                <h2 className="text-xl md:text-[1.75rem] font-black text-white tracking-tight leading-tight">
                    {q.title}
                </h2>
                <p className="text-white/40 mt-1 text-sm">{q.subtitle}</p>
            </div>

            {/* ── Single select ── */}
            {q.type === 'single' && (
                <div className={cn('grid gap-2', (q as SingleQ).cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
                    {(q as SingleQ).options.map(opt => {
                        const selected = answers[q.id] === opt
                        return (
                            <button key={opt} onClick={() => !animating && selectSingle(opt)} disabled={animating}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all duration-150 whitespace-normal',
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
                    <div className="grid grid-cols-1 gap-2 mb-5">
                        {(q as MultiQ).options.map(opt => {
                            const selected = multiSelected.includes(opt)
                            return (
                                <button key={opt} onClick={() => toggleMulti(opt)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all duration-150 whitespace-normal',
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
                    <button onClick={advance} disabled={multiSelected.length === 0 || animating}
                        className="w-full bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        Continuar <ArrowRight className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* ── Contact form ── */}
            {q.type === 'contact' && (
                <div className="space-y-3.5">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-1.5">Nombre</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                                placeholder="Tu nombre completo"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-1.5">Nombre de la clínica</label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)}
                                placeholder="Ej: Clínica Sonríe"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-1.5">Tu WhatsApp personal</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                placeholder="+56 9 1234 5678"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium transition-colors"
                            />
                        </div>
                        <p className="text-white/25 text-xs mt-1.5 ml-1">Te escribimos directo a ti, no a recepción.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-1.5">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="tu@clinica.cl"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium transition-colors"
                            />
                        </div>
                    </div>
                    <button onClick={advance} disabled={!contactReady || animating}
                        className="w-full bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                    >
                        Agenda mi demo <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-center text-white/25 text-xs">Sin compromiso · 30 min por videollamada</p>
                </div>
            )}

            {/* ── Schedule ── */}
            {q.type === 'schedule' && (
                <div className="space-y-5">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black uppercase tracking-widest text-white/30">Selecciona un día</span>
                            <div className="flex gap-1">
                                <button onClick={() => setCalendarOffset(Math.max(0, calendarOffset - 5))} disabled={calendarOffset === 0}
                                    className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/30 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all">
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setCalendarOffset(Math.min(availableDays.length - 5, calendarOffset + 5))} disabled={calendarOffset >= availableDays.length - 5}
                                    className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/30 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all">
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {visibleDays.map(day => (
                                <button key={day.toISOString()} onClick={() => { setSelectedDate(day); setSelectedTime('') }}
                                    className={cn(
                                        'flex flex-col items-center py-3 px-1 rounded-xl border text-center transition-all',
                                        selectedDate?.toDateString() === day.toDateString()
                                            ? 'border-[#FF2E88] bg-[#FF2E88]/15 text-white'
                                            : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
                                    )}
                                >
                                    <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">
                                        {day.toLocaleDateString('es-CL', { weekday: 'short' })}
                                    </span>
                                    <span className="text-lg font-black">{day.getDate()}</span>
                                    <span className="text-[9px] opacity-50">
                                        {day.toLocaleDateString('es-CL', { month: 'short' })}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedDate && (
                        <div>
                            <span className="block text-xs font-black uppercase tracking-widest text-white/30 mb-3">
                                Horario — {formatDate(selectedDate)}
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                {TIME_SLOTS.map(time => (
                                    <button key={time} onClick={() => setSelectedTime(time)}
                                        className={cn(
                                            'flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-bold transition-all',
                                            selectedTime === time
                                                ? 'border-[#FF2E88] bg-[#FF2E88]/15 text-white'
                                                : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
                                        )}
                                    >
                                        <Clock className="w-3 h-3 opacity-50" /> {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={handleSubmit} disabled={!selectedDate || !selectedTime || loading}
                        className="w-full bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando…</>
                            : <>Confirmar Demo <ArrowRight className="w-4 h-4" /></>
                        }
                    </button>
                </div>
            )}
        </div>
    )

    // ─────────────────────────────────────────────────────────────────────────
    // Success screen
    // ─────────────────────────────────────────────────────────────────────────

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
                        Te escribiremos por WhatsApp al {phone} para confirmar el enlace.
                    </p>
                    <a href="/" className="inline-flex items-center gap-2 bg-[#FF2E88] text-white font-black px-6 py-3 rounded-xl hover:bg-[#e0266f] transition-colors">
                        Volver al inicio <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Main layout — split screen
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#0A0A0F] overflow-x-hidden lg:flex">

            {/* ── Left panel — testimonios (solo desktop) ── */}
            {LeftPanel}

            {/* ── Right panel — formulario ── */}
            <div className="w-full lg:flex-1 flex flex-col min-h-screen">

                {/* Mobile nav */}
                <nav className="lg:hidden sticky top-0 z-50 bg-[#0A0A0F]/95 backdrop-blur-md border-b border-white/[0.07]">
                    <div className="px-5 h-12 flex items-center justify-between gap-3">
                        <Link to="/" className="flex items-center gap-2 shrink-0">
                            <img src="/citenly-icon.png" alt="Citenly" className="w-6 h-6 rounded-lg" />
                            <span className="text-sm font-black tracking-tight text-white">Citenly</span>
                        </Link>
                        <div className="flex-1 flex justify-center">
                            <span className="text-[11px] font-bold text-white/50 tabular-nums bg-white/[0.05] rounded-full px-2.5 py-0.5">
                                {currentQ + 1} / {QUESTIONS.length}
                            </span>
                        </div>
                        <Link to="/login" className="text-[11px] font-medium text-white/35 hover:text-white transition-colors shrink-0">
                            Ingresar →
                        </Link>
                    </div>
                </nav>

                {/* Desktop top bar */}
                <div className="hidden lg:flex items-center justify-between px-10 pt-6 pb-0">
                    <span className="text-xs text-white/25 font-medium tabular-nums">
                        Paso {currentQ + 1} de {QUESTIONS.length}
                    </span>
                    <Link to="/login" className="text-xs font-medium text-white/30 hover:text-white transition-colors">
                        Ya tengo cuenta →
                    </Link>
                </div>

                {/* Progress bar */}
                {ProgressBar}

                {/* Form area */}
                <div className="flex-1 flex flex-col justify-start px-5 md:px-10 pt-5 pb-8 w-full mx-auto lg:mx-0">

                    {/* Back button */}
                    {currentQ > 0 && (
                        <button onClick={back} disabled={animating}
                            className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors mb-4 group w-fit"
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            Volver
                        </button>
                    )}

                    {/* Question */}
                    <div className="w-full sm:max-w-md">
                        {FormContent}
                    </div>
                </div>

                {/* ── Mobile testimonials (debajo del formulario) ── */}
                <div className="lg:hidden border-t border-white/[0.06] mt-6">
                    <div className="pt-6 pb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 px-5">
                            Lo que dicen nuestras clientas
                        </p>
                        {/* Carrusel: overflow-x-auto SIN negative margin para evitar body overflow */}
                        <div className="overflow-x-auto scrollbar-none pb-3">
                            <div className="flex gap-3 snap-x snap-mandatory px-5 w-max">
                            {TESTIMONIALS.map((t, i) => (
                                <div key={i} className="shrink-0 w-[78vw] max-w-[280px] snap-start rounded-2xl overflow-hidden border border-white/[0.08]">
                                    {/* Mini photo header */}
                                    <div className="relative h-44 bg-gradient-to-br from-[#1a0010] to-[#0d0d1a]">
                                        {t.photo && (
                                            <img src={t.photo} alt={t.name}
                                                className="absolute inset-0 w-full h-full object-cover object-[center_15%] opacity-80" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                        <span className="absolute bottom-2 left-3 text-[9px] font-black uppercase tracking-widest text-[#FF2E88] bg-black/50 backdrop-blur-sm border border-[#FF2E88]/40 rounded-full px-2 py-0.5">
                                            {t.tag}
                                        </span>
                                    </div>
                                    {/* Card body */}
                                    <div className="bg-white/[0.04] p-4">
                                        <p className="text-white/80 text-sm leading-relaxed mb-3 line-clamp-3">"{t.quote}"</p>
                                        <div>
                                            <p className="text-white font-black text-sm">{t.name}</p>
                                            <p className="text-white/35 text-xs mt-0.5">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </div>{/* end flex w-max */}
                        </div>{/* end overflow-x-auto */}
                    </div>{/* end pt-6 wrapper */}

                    {/* Stats strip mobile */}
                    <div className="grid grid-cols-3 border-t border-white/[0.06]">
                        {STATS.map(s => (
                            <div key={s.label} className="py-5 text-center border-r border-white/[0.06] last:border-0">
                                <p className="text-lg font-black text-white">{s.value}</p>
                                <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}

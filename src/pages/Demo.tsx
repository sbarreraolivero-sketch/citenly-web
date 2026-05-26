import { useState } from 'react'
import { Sparkles, Calendar, Clock, User, Building2, Mail, Phone, MessageSquare, CheckCircle2, Loader2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const CLINIC_TYPES = [
    'Clínica de estética facial',
    'Salón de belleza',
    'Centro de medicina estética',
    'Clínica de depilación láser',
    'Spa y centro de bienestar',
    'Micropigmentación / PMU',
    'Centro de masajes y terapias',
    'Otro',
]

const NEEDS = [
    'Agendar citas automáticamente por WhatsApp',
    'Reducir citas perdidas con recordatorios',
    'Gestionar múltiples sucursales',
    'Captar más clientes (CRM / Campañas)',
    'Reemplazar mi recepcionista',
    'Ver métricas y reportes de mi negocio',
    'Todo lo anterior',
]

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']

function addDays(date: Date, n: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
}

function isSunday(date: Date) {
    return date.getDay() === 0
}

function formatDate(date: Date) {
    return date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDateISO(date: Date) {
    return date.toISOString().split('T')[0]
}

export default function Demo() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    // Form fields
    const [name, setName] = useState('')
    const [clinicName, setClinicName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [clinicType, setClinicType] = useState('')
    const [needs, setNeeds] = useState<string[]>([])
    const [role, setRole] = useState('')
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState('')
    const [calendarOffset, setCalendarOffset] = useState(0)

    // Build available days (next 14 business days)
    const today = new Date()
    const availableDays: Date[] = []
    let d = addDays(today, 1)
    while (availableDays.length < 14) {
        if (!isSunday(d)) availableDays.push(new Date(d))
        d = addDays(d, 1)
    }
    const visibleDays = availableDays.slice(calendarOffset, calendarOffset + 5)

    const toggleNeed = (need: string) => {
        setNeeds(prev => prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need])
    }

    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime) return
        setLoading(true)

        const scheduledAt = `${formatDateISO(selectedDate)}T${selectedTime}:00`

        const db = supabase as any
        const { error } = await db
            .from('demo_requests')
            .insert({
                name,
                clinic_name: clinicName,
                email,
                phone,
                clinic_type: clinicType,
                needs: needs.join(', '),
                role,
                scheduled_at: scheduledAt,
                status: 'pending',
            })

        setLoading(false)
        if (!error) {
            setSubmitted(true)
        }
    }

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
                        Volver al inicio
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0A0A0F]">
            {/* Header */}
            <header className="border-b border-white/5 px-6 py-4">
                <a href="/" className="flex items-center gap-3 w-fit">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-xl flex items-center justify-center">
                        <Sparkles className="w-4.5 h-4.5 text-white" />
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">Citenly</span>
                </a>
            </header>

            <div className="max-w-2xl mx-auto px-6 py-12">
                {/* Title */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-sm font-bold mb-4">
                        <Calendar className="w-3.5 h-3.5" />
                        Demo personalizada — 30 min
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-3">
                        Agenda tu demo gratis
                    </h1>
                    <p className="text-white/50">
                        Te mostramos cómo Citenly puede transformar tu clínica en 30 minutos.
                    </p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2 flex-1">
                            <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all shrink-0',
                                s < step ? 'bg-[#FF2E88] text-white' :
                                s === step ? 'bg-[#FF2E88] text-white' :
                                'bg-white/10 text-white/30'
                            )}>
                                {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
                            </div>
                            {s < 3 && <div className={cn('flex-1 h-0.5', s < step ? 'bg-[#FF2E88]' : 'bg-white/10')} />}
                        </div>
                    ))}
                </div>

                {/* STEP 1: Info personal */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-black text-white mb-6">Tu información</h2>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2">Nombre completo</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="María González"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2">Cargo / Rol</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        type="text"
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        placeholder="Dueña, Administradora…"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2">Nombre de tu negocio</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="text"
                                    value={clinicName}
                                    onChange={e => setClinicName(e.target.value)}
                                    placeholder="Clínica Bella Estética"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2">Correo electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="maria@clinica.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2">WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="+56 9 1234 5678"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#FF2E88]/50 text-sm font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-3">Tipo de negocio</label>
                            <div className="grid grid-cols-2 gap-2">
                                {CLINIC_TYPES.map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setClinicType(type)}
                                        className={cn(
                                            'text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                                            clinicType === type
                                                ? 'border-[#FF2E88] bg-[#FF2E88]/10 text-white'
                                                : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white'
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!name || !email || !phone || !clinicName || !clinicType}
                            className="w-full bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Continuar
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* STEP 2: Necesidades */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-black text-white mb-6">¿Qué quieres lograr?</h2>
                        <p className="text-white/50 text-sm -mt-4 mb-6">Selecciona todo lo que aplique a tu negocio.</p>

                        <div className="space-y-2">
                            {NEEDS.map(need => (
                                <button
                                    key={need}
                                    type="button"
                                    onClick={() => toggleNeed(need)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm font-medium text-left transition-all',
                                        needs.includes(need)
                                            ? 'border-[#FF2E88] bg-[#FF2E88]/10 text-white'
                                            : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
                                    )}
                                >
                                    <div className={cn(
                                        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                                        needs.includes(need) ? 'border-[#FF2E88] bg-[#FF2E88]' : 'border-white/20'
                                    )}>
                                        {needs.includes(need) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                    <MessageSquare className="w-4 h-4 text-white/30 shrink-0" />
                                    {need}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-4 rounded-xl border border-white/10 text-white/50 font-bold hover:text-white hover:border-white/20 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={needs.length === 0}
                                className="flex-1 bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                Elegir fecha y hora
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Fecha y hora */}
                {step === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-white mb-6">Elige cuándo te llamamos</h2>

                        {/* Calendar */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-black uppercase tracking-widest text-white/40">Selecciona un día</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setCalendarOffset(Math.max(0, calendarOffset - 5))}
                                        disabled={calendarOffset === 0}
                                        className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setCalendarOffset(Math.min(availableDays.length - 5, calendarOffset + 5))}
                                        disabled={calendarOffset >= availableDays.length - 5}
                                        className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
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
                                                : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
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
                                <span className="block text-xs font-black uppercase tracking-widest text-white/40 mb-3">
                                    Horario — {formatDate(selectedDate)}
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
                                                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
                                            )}
                                        >
                                            <Clock className="w-3.5 h-3.5 opacity-50" />
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(2)}
                                className="px-6 py-4 rounded-xl border border-white/10 text-white/50 font-bold hover:text-white hover:border-white/20 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedDate || !selectedTime || loading}
                                className="flex-1 bg-[#FF2E88] text-white font-black py-4 rounded-xl hover:bg-[#e0266f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Agendando…
                                    </>
                                ) : (
                                    <>
                                        Confirmar Demo
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

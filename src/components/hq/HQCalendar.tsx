import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameDay, isSameMonth, addMonths, isToday,
} from 'date-fns'

export interface HQCalendarEvent {
    id: string
    title: string
    subtitle?: string
    start: Date
    status: string
    type: 'demo' | 'appointment'
    raw: any
}

const STATUS_DOT: Record<string, string> = {
    pending: 'bg-amber-400',
    scheduled: 'bg-amber-400',
    confirmed: 'bg-emerald-400',
    completed: 'bg-sky-400',
    cancelled: 'bg-gray-500',
}
const STATUS_CHIP: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    scheduled: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    completed: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    cancelled: 'bg-gray-600/20 text-gray-400 border-gray-600/40 line-through',
}

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const hhmm = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

export function HQCalendar({ events, onSelectEvent }: { events: HQCalendarEvent[]; onSelectEvent: (e: HQCalendarEvent) => void }) {
    const [month, setMonth] = useState(() => startOfMonth(new Date()))
    const [selectedDay, setSelectedDay] = useState<Date>(new Date())

    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

    const eventsForDay = (day: Date) =>
        events.filter(e => isSameDay(e.start, day)).sort((a, b) => a.start.getTime() - b.start.getTime())
    const selectedEvents = eventsForDay(selectedDay)

    return (
        <div className="space-y-4">
            {/* Calendario */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 sm:p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-white capitalize">
                        {month.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setMonth(addMonths(month, -1))} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" aria-label="Mes anterior"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={() => { const t = new Date(); setMonth(startOfMonth(t)); setSelectedDay(t) }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">Hoy</button>
                        <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" aria-label="Mes siguiente"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Encabezado de días */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-gray-500 uppercase py-1">{d}</div>)}
                </div>

                {/* Grilla de días */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map(day => {
                        const dayEvents = eventsForDay(day)
                        const inMonth = isSameMonth(day, month)
                        const selected = isSameDay(day, selectedDay)
                        const today = isToday(day)
                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDay(day)}
                                className={`relative min-h-[46px] sm:min-h-[96px] rounded-lg border p-1 sm:p-1.5 text-left transition-colors flex flex-col
                                    ${selected ? 'border-[#FF2E88] bg-[#FF2E88]/10' : 'border-gray-700/60 hover:border-gray-600'}
                                    ${inMonth ? 'bg-gray-900/30' : 'bg-transparent opacity-40'}`}
                            >
                                <span className={`text-[11px] sm:text-xs font-semibold ${today ? 'text-[#FF2E88]' : inMonth ? 'text-white' : 'text-gray-600'}`}>
                                    {day.getDate()}
                                </span>

                                {/* Chips (desktop) */}
                                <div className="hidden sm:flex flex-col gap-0.5 mt-1 overflow-hidden">
                                    {dayEvents.slice(0, 3).map(e => (
                                        <span
                                            key={e.id}
                                            onClick={(ev) => { ev.stopPropagation(); onSelectEvent(e) }}
                                            className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate cursor-pointer hover:brightness-110 ${STATUS_CHIP[e.status] || STATUS_CHIP.pending}`}
                                        >
                                            {hhmm(e.start)} · {e.title}
                                        </span>
                                    ))}
                                    {dayEvents.length > 3 && <span className="text-[9px] text-gray-500 px-1">+{dayEvents.length - 3} más</span>}
                                </div>

                                {/* Puntos (móvil) */}
                                {dayEvents.length > 0 && (
                                    <div className="flex sm:hidden gap-0.5 mt-auto justify-center pb-0.5">
                                        {dayEvents.slice(0, 4).map(e => <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[e.status] || STATUS_DOT.pending}`} />)}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Agenda del día seleccionado */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5">
                <h4 className="text-sm font-bold text-white mb-3 capitalize">
                    {selectedDay.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h4>
                {selectedEvents.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">Sin reservas este día.</p>
                ) : (
                    <div className="space-y-2">
                        {selectedEvents.map(e => (
                            <button
                                key={e.id}
                                onClick={() => onSelectEvent(e)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-900/40 border border-gray-700 hover:border-gray-600 transition-colors text-left"
                            >
                                <div className={`w-1.5 self-stretch rounded-full ${STATUS_DOT[e.status] || STATUS_DOT.pending}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-white truncate">{e.title}</div>
                                    {e.subtitle && <div className="text-xs text-gray-400 truncate">{e.subtitle}</div>}
                                </div>
                                <div className="text-xs font-mono text-gray-300 shrink-0">{hhmm(e.start)}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

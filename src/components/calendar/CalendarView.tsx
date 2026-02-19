
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
    'es': es,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

export interface CalendarEvent {
    id: string
    title: string
    start: Date
    end: Date
    resource?: any
}

interface CalendarViewProps {
    events: CalendarEvent[]
    onSelectEvent: (event: CalendarEvent) => void
    onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
}

export function CalendarView({ events, onSelectEvent, onSelectSlot, onEditEvent }: CalendarViewProps & { onEditEvent?: (event: CalendarEvent) => void }) {

    // Custom Event Component for content only
    const CustomEvent = ({ event }: any) => {
        const titleClass = "font-medium leading-tight truncate"
        const timeClass = "text-[10px] opacity-80 truncate mt-0.5"
        const isCancelled = event.resource?.status === 'cancelled'

        return (
            <div className={`h-full w-full py-1 px-2 flex flex-col justify-center pointer-events-none ${isCancelled ? 'line-through' : ''}`}>
                <div className={titleClass}>{event.title}</div>
                <div className={timeClass}>
                    {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                </div>
            </div>
        )
    }

    // Event Wrapper to intercept clicks definitively
    const EventWrapper = (props: any) => {
        const { event, children } = props

        const handleClick = (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()

            // Debug
            console.log('EventWrapper Click:', event)

            // High priority custom handler
            if (onEditEvent) {
                onEditEvent(event)
            } else if (onSelectEvent) {
                onSelectEvent(event)
            }
        }

        return (
            <div
                onClick={handleClick}
                className="h-full relative z-20 cursor-pointer"
                title={`${event.title} - Haga clic para editar`}
            >
                {children}
            </div>
        )
    }

    return (
        <div className="h-[650px] bg-white rounded-soft shadow-premium p-6 animate-fade-in border border-silk-beige/50">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                defaultView={Views.WEEK}
                culture='es'
                messages={{
                    next: "Siguiente",
                    previous: "Anterior",
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Día",
                    agenda: "Agenda",
                    date: "Fecha",
                    time: "Hora",
                    event: "Cita",
                    noEventsInRange: "No hay citas en este rango",
                    showMore: (total) => `+ Ver más (${total})`
                }}
                onSelectEvent={onSelectEvent}
                onSelectSlot={onSelectSlot}
                selectable={!!onSelectSlot}
                selected={null}
                min={new Date(new Date().setHours(7, 0, 0, 0))} // Start at 7 AM
                max={new Date(new Date().setHours(23, 0, 0, 0))} // End at 11 PM
                scrollToTime={new Date(new Date().setHours(8, 0, 0, 0))} // Scroll to 8 AM initial
                components={{
                    toolbar: CustomToolbar,
                    event: CustomEvent,
                    eventWrapper: EventWrapper
                }}
                eventPropGetter={eventPropGetter}
                dayPropGetter={(date) => {
                    const params = { className: 'bg-white' }
                    if (date.getDay() === 0) params.className = 'bg-gray-50/50' // Sunday
                    return params
                }}
            />
        </div>
    )
}

// Event Style Getter
const eventPropGetter = (event: CalendarEvent) => {
    const isGoogle = event.resource?.type === 'google'
    const status = event.resource?.status || 'pending'
    const professionalColor = event.resource?.professionalColor

    let className = "border-l-4 text-xs rounded transition-all hover:brightness-95"

    // If professional has a color, use it for the border
    if (professionalColor && !isGoogle) {
        return {
            className: className + " text-charcoal",
            style: {
                border: 'none',
                borderLeftWidth: '4px',
                borderLeftStyle: 'solid' as const,
                borderLeftColor: professionalColor,
                backgroundColor: professionalColor + '15', // 15 = ~8% opacity in hex
            }
        }
    }

    if (isGoogle) {
        className += " bg-blue-50 border-blue-500 text-blue-700"
    } else {
        switch (status) {
            case 'confirmed':
                className += " bg-emerald-50 border-emerald-500 text-emerald-800"
                break
            case 'completed':
                className += " bg-primary-50 border-primary-500 text-primary-800"
                break
            case 'cancelled':
                className += " bg-red-50 border-red-500 text-red-800 opacity-75"
                break
            default: // pending
                className += " bg-amber-50 border-amber-500 text-amber-800"
        }
    }

    return {
        className,
        style: {
            border: 'none', // Override default full border if any
            borderLeftWidth: '4px',
            borderLeftStyle: 'solid' as const
        }
    }
}


const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV')
    }

    const goToNext = () => {
        toolbar.onNavigate('NEXT')
    }

    const goToCurrent = () => {
        toolbar.onNavigate('TODAY')
    }

    const label = () => {
        const date = toolbar.date
        return (
            <span className="capitalize text-lg font-semibold text-charcoal">
                {format(date, 'MMMM yyyy', { locale: es })}
            </span>
        )
    }

    return (
        <div className="flex items-center justify-between mb-4 flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
                <button
                    onClick={goToBack}
                    className="p-2 hover:bg-silk-beige rounded-soft transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-charcoal/60" />
                </button>
                <button
                    onClick={goToCurrent}
                    className="px-3 py-1 text-sm font-medium text-charcoal/70 hover:bg-silk-beige rounded-soft transition-colors"
                >
                    Hoy
                </button>
                <button
                    onClick={goToNext}
                    className="p-2 hover:bg-silk-beige rounded-soft transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-charcoal/60" />
                </button>
                {label()}
            </div>

            <div className="flex bg-silk-beige/50 p-1 rounded-soft">
                {['month', 'week', 'day'].map((view) => (
                    <button
                        key={view}
                        onClick={() => toolbar.onView(view)}
                        className={`px-3 py-1 text-sm font-medium rounded-soft transition-all duration-200 capitalize ${toolbar.view === view
                            ? 'bg-white shadow-soft text-primary-600'
                            : 'text-charcoal/60 hover:text-charcoal'
                            }`}
                    >
                        {view === 'month' ? 'Mes' : view === 'week' ? 'Semana' : 'Día'}
                    </button>
                ))}
            </div>
        </div>
    )
}

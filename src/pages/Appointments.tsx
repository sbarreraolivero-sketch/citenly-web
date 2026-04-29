import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
    Calendar,
    Clock,
    User,
    Phone,
    Search,
    Filter,
    Plus,
    MoreVertical,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    X,
    LayoutList,
    Calendar as CalendarIcon,
    RefreshCw,
    Settings,
    ChevronRight,
    Trash2,
    MessageCircle,
    Lightbulb
} from 'lucide-react'
import { cn, formatPhoneNumber, getStatusColor, getStatusLabel } from '@/lib/utils'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { GuideBox } from '@/components/ui/GuideBox'
import { CalendarView, CalendarEvent } from '@/components/calendar/CalendarView'
import { MobileCalendarView } from '@/components/calendar/MobileCalendarView'
import { ClinicalRecordForm } from '@/components/patients/ClinicalRecordForm'
import { PatientForm } from '@/components/patients/PatientForm'
import { Database } from '@/types/database'

type Patient = Database['public']['Tables']['patients']['Row']

interface Appointment {
    id: string
    patient_name: string
    phone_number: string
    service: string
    appointment_date: string
    appointment_time: string
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    notes: string | null
    google_event_id?: string | null
    professional_id?: string | null
}

interface ClinicProfessional {
    member_id: string
    first_name: string | null
    last_name: string | null
    email: string
    role: string
    job_title: string | null
    specialty: string | null
    color: string | null
    working_hours: Record<string, { enabled: boolean; start: string; end: string }> | null
}

const tabs = [
    { id: 'all', label: 'Todas' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'confirmed', label: 'Confirmadas' },
    { id: 'completed', label: 'Completadas' },
]

export default function Appointments() {
    const { user, profile, session, member } = useAuth()
    const isProfessional = member?.role === 'professional'
    const navigate = useNavigate()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [googleEvents] = useState<CalendarEvent[]>([])
    const [newAppointment, setNewAppointment] = useState({
        patient_name: '',
        phone_number: '',
        service: '',
        appointment_date: '',
        appointment_time: '',
        notes: '',
        professional_id: '',
        box_id: ''
    })
    const [services, setServices] = useState<any[]>([])
    const [professionals, setProfessionals] = useState<ClinicProfessional[]>([])
    const [professionalFilter, setProfessionalFilter] = useState<string>('all')

    // CRM Integration State
    const [showRecordModal, setShowRecordModal] = useState(false)
    const [showPatientModal, setShowPatientModal] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [foundPatient, setFoundPatient] = useState<Patient | null>(null)
    const [clinicBoxes, setClinicBoxes] = useState<any[]>([])
    const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([])
    const [, setIsSelectingPatientState] = useState(false)
    const isSelectingPatientRef = useRef(false)

    // Fetch services and professionals
    useEffect(() => {
        const fetchServices = async () => {
            if (!profile?.clinic_id) return
            const { data } = await supabase
                .from('services')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .order('name', { ascending: true })
            if (data) setServices(data)
        }
        const fetchProfessionals = async () => {
            if (!profile?.clinic_id) return
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any).rpc('get_clinic_professionals', {
                p_clinic_id: profile.clinic_id
            })
            if (data) setProfessionals(data)
        }
        const fetchClinicSettings = async () => {
            if (!profile?.clinic_id) return
            const { data } = await supabase
                .from('clinic_settings')
                .select('boxes')
                .eq('clinic_id', profile.clinic_id)
                .single()
            if ((data as any)?.boxes) {
                setClinicBoxes((data as any).boxes as any[])
            }
        }
        fetchServices()
        fetchProfessionals()
        fetchClinicSettings()
    }, [profile?.clinic_id])

    // Patient autocomplete search
    useEffect(() => {
        let ignore = false
        const searchPatients = async () => {
            if (isSelectingPatientRef.current) {
                return
            }

            if (!newAppointment.patient_name || newAppointment.patient_name.length < 1) {
                if (!ignore) setPatientSuggestions([])
                return
            }

            if (!profile?.clinic_id) return

            // Search for names starting with the input
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .ilike('name', `${newAppointment.patient_name}%`)
                .eq('clinic_id', profile.clinic_id)
                .limit(5)
            
            if (error) {
                console.error("Search error:", error)
                return
            }
            if (data && !ignore) setPatientSuggestions(data)
        }

        const timer = setTimeout(searchPatients, 300)
        return () => {
            ignore = true
            clearTimeout(timer)
        }
    }, [newAppointment.patient_name, profile?.clinic_id])

    // Date filter state
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all')
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

    // Fetch appointments function
    const fetchAppointments = async () => {
        if (!user || !profile?.clinic_id) {
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .order('appointment_date', { ascending: false })

            if (error) throw error
            console.log('Fetched appointments:', data)

            setAppointments(data || [])
        } catch (error) {
            console.error('Error fetching appointments:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAppointments()
    }, [user, profile])

    // Update appointment status
    const updateAppointmentStatus = async (id: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
        try {
            // Optimistic update
            const appointment = appointments.find(a => a.id === id)
            if (!appointment) return

            setAppointments(appointments.map(a =>
                a.id === id ? { ...a, status: newStatus } : a
            ))

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error, data } = await (supabase as any)
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id)
                .select()

            if (error) {
                console.error('Error updating status in DB:', error)
                throw error
            }

            console.log('Status updated successfully:', data)

            if (error) throw error

            // Handle "Completed" status - CRM Integration
            if (newStatus === 'completed') {
                // Fetch the appointment again to get the auto-generated patient_id from the DB trigger
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: updatedApt, error: fetchErr } = await (supabase as any)
                    .from('appointments')
                    .select('*, patient:patients(id, name)')
                    .eq('id', id)
                    .single()

                if (!fetchErr && updatedApt?.patient) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const patientData = (updatedApt as any).patient
                    if (window.confirm(`Cita completada con éxito.\n\nEl paciente ${patientData.name} está registrado en tu CRM.\n\n¿Deseas agregar sus notas y ficha clínica ahora?`)) {
                        navigate(`/patients/${patientData.id}?action=new_record`)
                    }
                } else {
                    // If no patient found, prompt to create one
                    if (window.confirm('Cita completada. Sin embargo, este paciente aún no está registrado en tu CRM.\n\n¿Deseas registrarlo ahora para llevar su historial clínico?')) {
                        setSelectedAppointment(updatedApt || appointment)
                        setShowPatientModal(true)
                    }
                }
            }
            // Sync with Google Calendar
            if (newStatus === 'cancelled') {
                if (appointment?.google_event_id) {
                    console.log('Cancelling Google Event:', appointment.google_event_id)
                    supabase.functions.invoke('delete-google-event', {
                        body: { google_event_id: appointment.google_event_id }
                    }).then(({ error }) => {
                        if (error) console.error('Error deleting Google event:', error)
                        else console.log('Google event deleted successfully')
                    }).catch(err => console.error('Error deleting Google event:', err))
                }
            }

        } catch (error: any) {
            console.error('Error updating status:', error)
            const errorMsg = error.message || 'Error desconocido'
            if (errorMsg.includes('payment_status') || errorMsg.includes('patients_clinic_phone_key')) {
                alert(`Error de base de datos: Es necesario aplicar las actualizaciones de base de datos pendientes (Script SQL) para confirmar citas.\n\nDetalle: ${errorMsg}`)
            } else {
                alert(`Error al actualizar el estado: ${errorMsg}`)
            }
            fetchAppointments()
        }
    }

    // Send WhatsApp Reminder
    const handleSendReminder = async (appointment: any) => {
        if (!confirm(`¿Enviar recordatorio a ${appointment.patient_name}?`)) return

        try {
            const { error } = await supabase.functions.invoke('send-whatsapp-reminder', {
                body: { appointment_id: appointment.id }
            })

            if (error) throw error

            alert('Recordatorio enviado correctamente')
        } catch (error: any) {
            console.error('Error sending reminder:', error)
            alert('Error al enviar recordatorio: ' + (error.message || 'Desconocido'))
        }
    }

    // Send Satisfaction Survey
    const handleSendSurvey = async (appointment: Appointment) => {
        if (!confirm(`¿Enviar encuesta de satisfacción a ${appointment.patient_name}?`)) return

        try {
            const { error } = await supabase.functions.invoke('send-whatsapp-survey', {
                body: { appointment_id: appointment.id }
            })

            if (error) throw error

            alert('Encuesta enviada correctamente')
        } catch (error: any) {
            console.error('Error sending survey:', error)
            alert('Error al enviar encuesta: ' + (error.message || 'Desconocido'))
        }
    }


    // Fetch Google Calendar Events via Edge Function
    const fetchGoogleEvents = async () => {
        // Disabled by user request
        return
    }

    useEffect(() => {
        if (session?.user) {
            fetchGoogleEvents()
        }
    }, [session?.user?.id])

    const handleSaveAppointment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (saving) return
        if (!user || !profile) return

        try {
            setSaving(true)

            // Construct Date from local inputs to get correct UTC time
            const dateStr = newAppointment.appointment_date
            const timeStr = newAppointment.appointment_time

            if (!dateStr || !timeStr) {
                toast.error('La fecha y hora son obligatorias')
                setSaving(false)
                return
            }

            const [year, month, day] = dateStr.split('-').map(Number)
            const [hours, minutes] = timeStr.split(':').map(Number)

            if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
                toast.error('Formato de fecha u hora inválido')
                setSaving(false)
                return
            }

            const localDate = new Date(year, month - 1, day, hours, minutes)
            const appointmentDate = localDate.toISOString()

            let durationMinutes = 60
            const selectedServiceObj = services.find(s => s.name === newAppointment.service)
            if (selectedServiceObj) {
                durationMinutes = selectedServiceObj.duration
            }

            let appointmentId = editingId
            let googleEventId = null

            let appointmentData: any = {
                clinic_id: profile.clinic_id,
                patient_name: newAppointment.patient_name,
                phone_number: newAppointment.phone_number,
                service: newAppointment.service,
                duration: durationMinutes,
                appointment_date: appointmentDate,
                status: 'confirmed',
                notes: newAppointment.notes,
                professional_id: newAppointment.professional_id || null,
            }

            // Only add box_id if it's actually provided to avoid errors on legacy schemas
            if (newAppointment.box_id) {
                appointmentData.box_id = newAppointment.box_id
            }

            if (editingId) {
                // UPDATE existing appointment
                const { error } = await (supabase as any)
                    .from('appointments')
                    .update(appointmentData)
                    .eq('id', editingId)

                if (error) {
                    // Try without box_id if it fails due to missing column
                    if (error.message.includes('box_id') || error.code === '42703') {
                        delete appointmentData.box_id
                        const { error: retryError } = await (supabase as any)
                            .from('appointments')
                            .update(appointmentData)
                            .eq('id', editingId)
                        if (retryError) throw retryError
                        toast.error('Atención: La columna "box_id" falta en tu base de datos. Ejecuta las migraciones.')
                    } else {
                        throw error
                    }
                }
                toast.success('Cita actualizada correctamente')
                
                // Get the existing google_event_id to update it
                const existingAppt = appointments.find(a => a.id === editingId)
                googleEventId = existingAppt?.google_event_id

            } else {
                // CREATE new appointment
                const { data, error } = await (supabase as any)
                    .from('appointments')
                    .insert([appointmentData])
                    .select()
                    .single()

                if (error) {
                    // Try without box_id if it fails due to missing column
                    if (error.message.includes('box_id') || error.code === '42703') {
                        delete appointmentData.box_id
                        const { data: retryData, error: retryError } = await (supabase as any)
                            .from('appointments')
                            .insert([appointmentData])
                            .select()
                            .single()
                        if (retryError) throw retryError
                        toast.error('Atención: La columna "box_id" falta en tu base de datos. Ejecuta las migraciones.')
                        appointmentId = (retryData as any).id
                    } else {
                        throw error
                    }
                } else {
                    toast.success('Cita creada correctamente')
                    appointmentId = (data as any).id
                }
            }

            // Sync with Google Calendar (Create or Update)
            // Note: durationMinutes was calculated at the beginning of the try block

            const endDate = new Date(new Date(appointmentDate).getTime() + durationMinutes * 60 * 1000).toISOString()

            if (editingId && googleEventId) {
                // Update Google Event
                const { error: googleError } = await supabase.functions.invoke('update-google-event', {
                    body: {
                        google_event_id: googleEventId,
                        title: `${newAppointment.patient_name} - ${newAppointment.service}`,
                        description: newAppointment.notes,
                        start: appointmentDate,
                        end: endDate
                    }
                })

                if (googleError) {
                    console.error('Error syncing update to Google Calendar:', googleError)
                    // alert(`Error debug: ${JSON.stringify(googleError)}`)
                } else {
                    console.log('Google Calendar event updated')
                }
            } else if (!editingId || (editingId && !googleEventId)) {
                // ...
                const { data: googleData, error: googleError } = await supabase.functions.invoke('create-google-event', {
                    body: {
                        title: `${newAppointment.patient_name} - ${newAppointment.service}`,
                        description: newAppointment.notes,
                        start: appointmentDate,
                        end: endDate,
                    },
                })

                if (googleError) {
                    // This handles network/transport errors (like offline or CORS)
                    console.error('Network/Transport error creating Google Calendar event:', googleError)
                    // alert(`Error de conexión: ${JSON.stringify(googleError)}`)
                } else if (!googleData?.success) {
                    // This handles API/Logical errors returned as 200 OK { success: false }
                    console.error('Logic error creating Google Calendar event:', googleData)
                    // alert(`Error de sincronización: ${googleData?.error || 'Desconocido'}\nDetalles: ${JSON.stringify(googleData?.details)}`)
                } else if (googleData?.event_id && appointmentId) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (supabase as any)
                        .from('appointments')
                        .update({ google_event_id: googleData.event_id })
                        .eq('id', appointmentId)

                    console.log('Synced with Google Calendar:', googleData.event_id)
                }
            }

            setShowModal(false)
            setNewAppointment({
                patient_name: '',
                phone_number: '',
                service: '',
                appointment_date: '',
                appointment_time: '',
                notes: '',
                professional_id: '',
                box_id: ''
            })
            setEditingId(null)

            // Refresh list
            fetchAppointments()

        } catch (error: any) {
            console.error('Error creating appointment:', error)
            toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteAppointment = async (appointment: Appointment) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) return

        try {
            // 1. Delete from Supabase
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', appointment.id)

            if (error) throw error

            // 2. Remove from local state immediately (functional update)
            setAppointments(prev => prev.filter(a => a.id !== appointment.id))

            // 3. Delete from Google Calendar if linked
            if (appointment.google_event_id) {
                supabase.functions.invoke('delete-google-event', {
                    body: { google_event_id: appointment.google_event_id }
                }).then(({ error: gErr }) => {
                    if (gErr) console.error('Error deleting Google event:', gErr)
                    else console.log('Google event deleted')
                }).catch(err => console.error('Error deleting Google event:', err))
            }

            // 4. Optional: Force refresh from DB just to be 100% sure
            // fetchAppointments() 

        } catch (error) {
            console.error('Error deleting appointment:', error)
            alert('Error al eliminar la cita de la base de datos.')
        }
    }

    const filteredAppointments = appointments.filter((appointment) => {
        const matchesSearch =
            appointment.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            appointment.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
            appointment.phone_number.includes(searchQuery)

        const matchesTab = activeTab === 'all' || appointment.status === activeTab

        // Professional filter
        let matchesProfessional = true;
        if (isProfessional) {
            matchesProfessional = appointment.professional_id === member?.id;
        } else {
            matchesProfessional = professionalFilter === 'all' || appointment.professional_id === professionalFilter;
        }

        // Date filter logic
        const appointmentDate = new Date(appointment.appointment_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const weekEnd = new Date(today)
        weekEnd.setDate(weekEnd.getDate() + 7)

        let matchesDate = true
        if (dateFilter === 'today') {
            const appointmentDay = new Date(appointmentDate)
            appointmentDay.setHours(0, 0, 0, 0)
            matchesDate = appointmentDay.getTime() === today.getTime()
        } else if (dateFilter === 'tomorrow') {
            const appointmentDay = new Date(appointmentDate)
            appointmentDay.setHours(0, 0, 0, 0)
            matchesDate = appointmentDay.getTime() === tomorrow.getTime()
        } else if (dateFilter === 'week') {
            matchesDate = appointmentDate >= today && appointmentDate <= weekEnd
        }

        return matchesSearch && matchesTab && matchesDate && matchesProfessional
    })

    const getTabCount = (tabId: string) => {
        if (tabId === 'all') return appointments.length
        return appointments.filter((a) => a.status === tabId).length
    }

    const formatDate = (date: string) => {
        const d = new Date(date)
        return d.toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        })
    }

    const formatTime = (date: string) => {
        const d = new Date(date)
        return d.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <CheckCircle2 className="w-3.5 h-3.5" />
            case 'pending':
                return <AlertCircle className="w-3.5 h-3.5" />
            case 'cancelled':
                return <XCircle className="w-3.5 h-3.5" />
            case 'completed':
                return <CheckCircle2 className="w-3.5 h-3.5" />
            default:
                return null
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    // Map appointments to calendar events (excluding cancelled ones for visual clarity)
    const mappedAppointments = appointments
        .filter(apt => apt.status !== 'cancelled')
        .map(apt => {
            // Validation
            if (!apt.appointment_date) return null

            let start: Date

            // Check if we have an explicit time column (newer records)
            // If appointment_time is present and not just "00:00" or empty
            const hasExplicitTime = apt.appointment_time && apt.appointment_time !== '00:00' && apt.appointment_time !== '00:00:00';

            if (hasExplicitTime) {
                // Safe extraction of YYYY-MM-DD
                const datePart = apt.appointment_date.split('T')[0].split(' ')[0]

                // Ensure HH:mm format (sanitize)
                let timeStr = apt.appointment_time || '00:00'
                const timeParts = timeStr.split(':')
                const hour = (timeParts[0] || '00').padStart(2, '0')
                const minute = (timeParts[1] || '00').padStart(2, '0')
                const safeTimeStr = `${hour}:${minute}`

                start = new Date(`${datePart}T${safeTimeStr}:00`)
            } else {
                // Fallback: Try parsing appointment_date directly (legacy records often include time)
                // e.g. "2026-02-18T09:30:00"
                start = new Date(apt.appointment_date)
            }

            // Debug check for invalid dates
            if (isNaN(start.getTime())) {
                console.error('Invalid Date created for:', apt)
                return null
            }

            // Find service duration
            const service = services.find(s => s.name === apt.service)
            const duration = service ? service.duration : 60
            const end = new Date(start.getTime() + (duration * 60 * 1000))

            // Get professional color
            const prof = apt.professional_id ? professionals.find(p => p.member_id === apt.professional_id) : null

            return {
                id: apt.id,
                title: `${apt.patient_name} - ${apt.service}`,
                start,
                end,
                resource: {
                    ...apt,
                    professionalColor: prof?.color || undefined,
                    professionalName: prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : undefined
                }
            }
        }).filter(Boolean) as CalendarEvent[]

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header Banner */}
            <div className="bg-[var(--gradient-primary)] rounded-softer p-6 text-white shadow-[0_0_20px_var(--glow)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md shrink-0">
                            <Calendar className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Citas</h1>
                            <p className="text-white/90 text-sm mt-1 max-w-2xl leading-relaxed">
                                📅 Gestiona la agenda de tu clínica. Organiza las consultas de tus profesionales y automatiza los recordatorios para reducir el ausentismo.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const now = new Date()
                            setNewAppointment({
                                patient_name: '',
                                phone_number: '',
                                service: '',
                                appointment_date: format(now, 'yyyy-MM-dd'),
                                appointment_time: '09:00',
                                notes: '',
                                professional_id: '',
                                box_id: ''
                            })
                            setShowModal(true)
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-6 py-2.5 rounded-soft text-sm font-bold transition-all shadow-lg flex items-center gap-2 border border-white/30"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Cita
                    </button>
                </div>
            </div>

            <GuideBox 
                title="Guía: Gestión de Agenda" 
                summary="Aprende a reducir las inasistencias y a vincular las citas con el historial clínico de tus pacientes."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="bg-secondary-theme/50 p-3.5 rounded-soft border border-theme">
                        <p className="font-black text-[var(--accent-primary)] text-[10px] mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
                            <MessageCircle className="w-3.5 h-3.5" /> Recordatorios de WhatsApp:
                        </p>
                        <p className="text-[11px] leading-relaxed text-secondary-theme font-medium">
                            Usa el botón de WhatsApp en cada cita para enviar recordatorios manuales o encuestas. El sistema también envía notificaciones automáticas 24h antes para confirmar la asistencia.
                        </p>
                    </div>
                    <div className="bg-secondary-theme/50 p-3.5 rounded-soft border border-theme">
                        <p className="font-black text-[var(--accent-primary)] text-[10px] mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
                            <User className="w-3.5 h-3.5" /> Ficha Clínica Integrada:
                        </p>
                        <p className="text-[11px] leading-relaxed text-secondary-theme font-medium">
                            Al marcar una cita como "Completada", el sistema te sugerirá abrir la ficha clínica. Esto centraliza la información y facilita el seguimiento evolutivo del paciente.
                        </p>
                    </div>
                </div>
                <p className="text-[10px] text-secondary-theme mt-2 italic flex items-center gap-1.5 font-medium">
                    <Lightbulb className="w-3 h-3" /> Tip: Si sincronizas tu Google Calendar, evita mover citas manualmente en Google; hazlo siempre desde Elistic para mantener la integridad de tus reportes.
                </p>
            </GuideBox>


            {/* Filters */}
            <div className="card-premium p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 w-full min-w-[200px] sm:min-w-0 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-theme" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, servicio o teléfono..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium pl-10 w-full"
                        />
                    </div>

                    {/* Date Filter */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 border rounded-soft text-sm transition-colors font-bold",
                                dateFilter !== 'all'
                                    ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]"
                                    : "bg-secondary-theme border-theme text-secondary-theme hover:bg-secondary-theme/50"
                            )}
                        >
                            <Calendar className="w-4 h-4" />
                            {dateFilter === 'all' ? 'Fecha' :
                                dateFilter === 'today' ? 'Hoy' :
                                    dateFilter === 'tomorrow' ? 'Mañana' : 'Esta Semana'}
                        </button>

                        {showDatePicker && (
                            <div className="absolute top-full left-0 mt-2 bg-primary-theme rounded-soft shadow-premium-lg border border-theme py-2 min-w-[150px] z-10">
                                <button
                                    onClick={() => { setDateFilter('all'); setShowDatePicker(false); }}
                                    className={cn(
                                        "w-full px-4 py-2 text-left text-sm hover:bg-secondary-theme transition-colors font-medium",
                                        dateFilter === 'all' ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "text-secondary-theme"
                                    )}
                                >
                                    Todas las fechas
                                </button>
                                <button
                                    onClick={() => { setDateFilter('today'); setShowDatePicker(false); }}
                                    className={cn(
                                        "w-full px-4 py-2 text-left text-sm hover:bg-secondary-theme transition-colors font-medium",
                                        dateFilter === 'today' ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "text-secondary-theme"
                                    )}
                                >
                                    Hoy
                                </button>
                                <button
                                    onClick={() => { setDateFilter('tomorrow'); setShowDatePicker(false); }}
                                    className={cn(
                                        "w-full px-4 py-2 text-left text-sm hover:bg-secondary-theme transition-colors font-medium",
                                        dateFilter === 'tomorrow' ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "text-secondary-theme"
                                    )}
                                >
                                    Mañana
                                </button>
                                <button
                                    onClick={() => { setDateFilter('week'); setShowDatePicker(false); }}
                                    className={cn(
                                        "w-full px-4 py-2 text-left text-sm hover:bg-secondary-theme transition-colors font-medium",
                                        dateFilter === 'week' ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "text-secondary-theme"
                                    )}
                                >
                                    Esta Semana
                                </button>
                            </div>
                        )}
                    </div>

                    {/* More Filters */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 border rounded-soft text-sm transition-colors font-bold",
                                showFilters
                                    ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]"
                                    : "bg-secondary-theme border-theme text-secondary-theme hover:bg-secondary-theme/50"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            Filtros
                        </button>

                        {showFilters && (
                            <div className="absolute top-full right-0 mt-2 bg-primary-theme rounded-soft shadow-premium-lg border border-theme p-4 min-w-[200px] z-10">
                                <p className="text-[10px] font-black text-secondary-theme uppercase tracking-widest mb-3">Ordenar por</p>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm text-primary-theme cursor-pointer font-bold">
                                        <input type="radio" name="sort" defaultChecked className="accent-[var(--accent-primary)]" />
                                        Fecha (más reciente)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-primary-theme cursor-pointer font-bold">
                                        <input type="radio" name="sort" className="accent-[var(--accent-primary)]" />
                                        Fecha (más antigua)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-primary-theme cursor-pointer font-bold">
                                        <input type="radio" name="sort" className="accent-[var(--accent-primary)]" />
                                        Nombre (A-Z)
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sync Button - Disabled by user request */}
                    {/* <button
                        onClick={() => setShowSettingsModal(true)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 border rounded-soft text-sm transition-colors",
                            googleEvents.length > 0
                                ? "bg-white border-silk-beige text-charcoal hover:bg-silk-beige/50"
                                : "bg-ivory border-silk-beige text-charcoal/70 hover:bg-silk-beige/50"
                        )}
                        title="Configurar Sincronización"
                    >
                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                        <span className="hidden sm:inline">Sync</span>
                        {googleEvents.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                    </button> */}

                    {/* View Toggle */}
                    <div className="flex bg-secondary-theme border border-theme rounded-soft p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2 rounded-soft transition-all",
                                viewMode === 'list'
                                    ? "bg-primary-theme shadow-md text-[var(--accent-primary)]"
                                    : "text-secondary-theme hover:text-primary-theme"
                            )}
                            title="Vista de Lista"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={cn(
                                "p-2 rounded-soft transition-all",
                                viewMode === 'calendar'
                                    ? "bg-primary-theme shadow-md text-[var(--accent-primary)]"
                                    : "text-secondary-theme hover:text-primary-theme"
                            )}
                            title="Vista de Calendario"
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {viewMode === 'list' && (
                    <div className="flex gap-2 mt-4 border-t border-theme pt-4 overflow-x-auto pb-2 scrollbar-none">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'whitespace-nowrap flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-soft text-sm font-bold transition-all uppercase tracking-widest text-[10px]',
                                    activeTab === tab.id
                                        ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--glow)]'
                                        : 'text-secondary-theme hover:bg-secondary-theme hover:text-primary-theme'
                                )}
                            >
                                {tab.label}
                                <span
                                    className={cn(
                                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0',
                                        activeTab === tab.id ? 'bg-white/20' : 'bg-secondary-theme'
                                    )}
                                >
                                    {getTabCount(tab.id)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Professional Filter Pills */}
            {!isProfessional && professionals.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-secondary-theme uppercase tracking-widest mr-1">Profesional:</span>
                    <button
                        onClick={() => setProfessionalFilter('all')}
                        className={cn(
                            'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border',
                            professionalFilter === 'all'
                                ? 'bg-primary-theme text-[var(--accent-primary)] border-[var(--accent-primary)] shadow-sm'
                                : 'bg-secondary-theme text-secondary-theme border-theme hover:border-secondary-theme'
                        )}
                    >
                        Todos
                    </button>
                    {professionals.map((prof) => (
                        <button
                            key={prof.member_id}
                            onClick={() => setProfessionalFilter(prof.member_id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border',
                                professionalFilter === prof.member_id
                                    ? 'bg-primary-theme text-[var(--accent-primary)] border-[var(--accent-primary)] shadow-sm'
                                    : 'bg-secondary-theme text-secondary-theme border-theme hover:border-secondary-theme'
                            )}
                        >
                            <div
                                className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: prof.color || '#8B5CF6' }}
                            />
                            {prof.first_name || prof.email}
                        </button>
                    ))}
                    </div>
            )}

            {viewMode === 'calendar' ? (
                <>
                    {/* Desktop Calendar View */}
                    <div className="hidden md:block">
                        <CalendarView
                            onEditEvent={(event) => {
                                // Check if it's a google event
                                if (event.resource?.type === 'google') {
                                    // Ideally show a toast
                                    console.log('Google event selected, cannot edit directly yet')
                                    alert('No se pueden editar eventos de Google directamente desde aquí.')
                                    return
                                }
                                setEditingId(event.id)
                                setNewAppointment({
                                    patient_name: event.resource.patient_name,
                                    phone_number: event.resource.phone_number,
                                    service: event.resource.service,
                                    appointment_date: format(event.start, 'yyyy-MM-dd'),
                                    appointment_time: format(event.start, 'HH:mm'),
                                    notes: event.resource.notes || '',
                                    professional_id: event.resource.professional_id || '',
                                    box_id: event.resource.box_id || ''
                                })
                                setShowModal(true)
                            }}
                            events={[
                                ...mappedAppointments,
                                // ...googleEvents // Disabled by user request
                            ]}
                            onSelectEvent={(event) => {
                                // Debug log 
                                console.log('Event clicked:', event)

                                // Check if it's a google event to prevent editing (or show info)
                                if (event.resource?.type === 'google') {
                                    console.log('Google event selected, cannot edit directly yet')
                                    return
                                }

                                // Populate form for editing
                                setEditingId(event.id)
                                setNewAppointment({
                                    patient_name: event.resource.patient_name,
                                    phone_number: event.resource.phone_number,
                                    service: event.resource.service,
                                    appointment_date: format(event.start, 'yyyy-MM-dd'),
                                    appointment_time: format(event.start, 'HH:mm'),
                                    notes: event.resource.notes || '',
                                    professional_id: event.resource.professional_id || '',
                                    box_id: event.resource.box_id || ''
                                })
                                setShowModal(true)
                            }}
                            onSelectSlot={(slotInfo) => {
                                setNewAppointment({
                                    ...newAppointment,
                                    appointment_date: slotInfo.start.toISOString().split('T')[0],
                                    appointment_time: slotInfo.start.toTimeString().slice(0, 5)
                                })
                                setShowModal(true)
                            }}
                        />
                    </div>

                    {/* Mobile Calendar View (Google Calendar Style) */}
                    <div className="block md:hidden">
                        <MobileCalendarView
                            events={[
                                ...mappedAppointments,
                            ]}
                            onSelectEvent={(event) => {
                                // Re-use the exact same logic
                                if (event.resource?.type === 'google') {
                                    alert('No se pueden editar eventos de Google directamente desde aquí.')
                                    return
                                }
                                setEditingId(event.id)
                                setNewAppointment({
                                    patient_name: event.resource.patient_name,
                                    phone_number: event.resource.phone_number,
                                    service: event.resource.service,
                                    appointment_date: format(event.start, 'yyyy-MM-dd'),
                                    appointment_time: format(event.start, 'HH:mm'),
                                    notes: event.resource.notes || '',
                                    professional_id: event.resource.professional_id || '',
                                    box_id: event.resource.box_id || ''
                                })
                                setShowModal(true)
                            }}
                            onSelectSlot={(date) => {
                                setNewAppointment({
                                    ...newAppointment,
                                    appointment_date: date.toISOString().split('T')[0],
                                    appointment_time: '09:00'
                                })
                                // Removed setShowModal(true) to avoid opening unexpectedly on day touches
                            }}
                        />
                    </div>
                </>
            ) : (
                <>
                    {/* Appointments Table (Desktop) */}
                    <div className="card-premium overflow-x-auto hidden md:block border-theme">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="border-b border-theme bg-secondary-theme/50">
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Paciente</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Servicio</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Fecha y Hora</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Estado</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAppointments.map((appointment, index) => (
                                    <tr
                                        key={appointment.id}
                                        className={cn(
                                            'border-b border-theme/30 hover:bg-secondary-theme/30 transition-colors',
                                            index === filteredAppointments.length - 1 && 'border-b-0'
                                        )}
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-secondary-theme rounded-full flex items-center justify-center border border-theme">
                                                    <User className="w-5 h-5 text-secondary-theme" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-primary-theme">{appointment.patient_name}</p>
                                                    <p className="text-xs text-secondary-theme flex items-center gap-1 font-medium">
                                                        <Phone className="w-3 h-3" />
                                                        {formatPhoneNumber(appointment.phone_number)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-primary-theme font-bold">{appointment.service}</p>
                                            {appointment.notes && (
                                                <p className="text-xs text-secondary-theme mt-0.5 line-clamp-1 font-medium italic">"{appointment.notes}"</p>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-secondary-theme opacity-40" />
                                                <div>
                                                    <p className="text-primary-theme font-bold capitalize">{formatDate(appointment.appointment_date)}</p>
                                                    <p className="text-xs text-secondary-theme flex items-center gap-1 font-medium">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTime(appointment.appointment_date)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm', getStatusColor(appointment.status))}>
                                                {getStatusIcon(appointment.status)}
                                                {getStatusLabel(appointment.status)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {appointment.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-soft transition-all"
                                                        >
                                                            Confirmar
                                                        </button>
                                                        <button
                                                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-soft transition-all"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </>
                                                )}
                                                {appointment.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 rounded-soft transition-all"
                                                    >
                                                        Completar
                                                    </button>
                                                )}
                                                {appointment.status === 'completed' && (
                                                    <button
                                                        onClick={() => handleSendSurvey(appointment)}
                                                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-soft transition-all flex items-center gap-1"
                                                        title="Enviar Encuesta de Satisfacción"
                                                    >
                                                        <MessageCircle className="w-3 h-3" />
                                                        Encuesta
                                                    </button>
                                                )}
                                                {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
                                                    <button
                                                        onClick={() => handleSendReminder(appointment)}
                                                        className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 rounded-soft transition-all"
                                                        title="Enviar Recordatorio WhatsApp"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <div className="relative group">
                                                    <button className="p-2 text-secondary-theme hover:text-primary-theme hover:bg-secondary-theme rounded-soft transition-all">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    <div className="absolute right-0 top-full w-48 hidden group-hover:block z-20 pt-1">
                                                        <div className="bg-primary-theme rounded-soft shadow-premium-lg border border-theme overflow-hidden">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingId(appointment.id) // Set editing mode
                                                                    setNewAppointment({
                                                                        patient_name: appointment.patient_name,
                                                                        phone_number: appointment.phone_number,
                                                                        service: appointment.service,
                                                                        appointment_date: appointment.appointment_date.split('T')[0],
                                                                        appointment_time: appointment.appointment_date.split('T')[1].slice(0, 5),
                                                                        notes: appointment.notes || '',
                                                                        professional_id: appointment.professional_id || '',
                                                                        box_id: (appointment as any).box_id || ''
                                                                    })
                                                                    setShowModal(true) // Open modal
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary-theme hover:bg-secondary-theme flex items-center gap-2 transition-colors"
                                                            >
                                                                <Settings className="w-4 h-4" />
                                                                Editar Cita
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAppointment(appointment)}
                                                                className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Eliminar Cita
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredAppointments.length === 0 && (
                            <div className="py-12 text-center">
                                <Calendar className="w-12 h-12 text-secondary-theme opacity-20 mx-auto mb-4" />
                                <p className="text-secondary-theme font-medium text-sm">No se encontraron citas</p>
                            </div>
                        )}
                    </div>

                    {/* Appointments Cards (Mobile) */}
                    <div className="block md:hidden space-y-4">
                        {filteredAppointments.length > 0 ? filteredAppointments.map((appointment) => (
                            <div key={`mob-${appointment.id}`} className="bg-white rounded-2xl p-5 shadow-sm border border-silk-beige flex flex-col gap-4">
                                {/* Header: Patient & Status */}
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 bg-silk-beige rounded-full flex items-center justify-center flex-shrink-0">
                                            <User className="w-5 h-5 text-charcoal/50" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-charcoal truncate text-sm sm:text-base leading-tight">
                                                {appointment.patient_name}
                                            </p>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <p className="text-xs sm:text-sm font-bold text-charcoal/80 flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {formatPhoneNumber(appointment.phone_number)}
                                                </p>
                                                <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full w-fit font-black uppercase tracking-widest border mt-1.5 shadow-sm transition-all', getStatusColor(appointment.status))}>
                                                    {getStatusIcon(appointment.status)}
                                                    {getStatusLabel(appointment.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Body: Service & Time */}
                                <div className="bg-ivory/80 rounded-xl p-3 flex flex-col gap-2.5">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[11px] font-black text-charcoal/70 uppercase tracking-widest flex-shrink-0">Servicio</span>
                                        <span className="text-sm font-medium text-charcoal text-right truncate">{appointment.service}</span>
                                    </div>
                                    <div className="h-px w-full bg-silk-beige/50"></div>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[11px] font-black text-charcoal/70 uppercase tracking-widest flex-shrink-0">Fecha / Hora</span>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-charcoal block capitalize">{formatDate(appointment.appointment_date)}</span>
                                            <span className="text-sm text-charcoal/80 flex items-center justify-end gap-1.5 mt-1 font-bold">
                                                <div className="w-2 h-2 rounded-full bg-primary-500 shadow-sm animate-pulse"></div>
                                                {formatTime(appointment.appointment_date)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer: Actions */}
                                <div className="flex gap-2 pt-1 border-t border-theme mt-1 pb-1">
                                    {appointment.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                                                className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all"
                                            >
                                                Confirmar
                                            </button>
                                            <button
                                                onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                                className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        </>
                                    )}
                                    {appointment.status === 'confirmed' && (
                                        <button
                                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 rounded-xl transition-all"
                                        >
                                            Completar
                                        </button>
                                    )}
                                    {appointment.status === 'completed' && (
                                        <button
                                            onClick={() => handleSendSurvey(appointment)}
                                            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl transition-all flex justify-center items-center gap-1.5"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            Encuesta
                                        </button>
                                    )}
 
                                    {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
                                        <button
                                            onClick={() => handleSendReminder(appointment)}
                                            className="p-2.5 text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all flex justify-center items-center"
                                            title="WhatsApp"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setEditingId(appointment.id)
                                            setNewAppointment({
                                                patient_name: appointment.patient_name,
                                                phone_number: appointment.phone_number,
                                                service: appointment.service,
                                                appointment_date: appointment.appointment_date.split('T')[0],
                                                appointment_time: appointment.appointment_date.split('T')[1].slice(0, 5),
                                                notes: appointment.notes || '',
                                                professional_id: appointment.professional_id || '',
                                                box_id: (appointment as any).box_id || ''
                                            })
                                            setShowModal(true)
                                        }}
                                        className="p-2.5 text-secondary-theme hover:text-primary-theme bg-secondary-theme hover:bg-theme rounded-xl transition-all flex justify-center items-center border border-theme"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 flex flex-col items-center justify-center bg-white rounded-2xl border border-silk-beige text-charcoal/40 space-y-3">
                                <Calendar className="w-12 h-12 opacity-20" />
                                <p className="font-medium text-sm text-center">No hay citas en este rango temporal</p>
                            </div>
                        )}
                    </div>

                    {/* Google Calendar Events Section */}
                    {googleEvents.length > 0 && (
                        <div className="card-premium overflow-hidden mt-6 border-blue-500/20 bg-blue-500/[0.02]">
                            <div className="flex items-center justify-between p-4 border-b border-blue-500/10 bg-blue-500/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Google Calendar Sync</h3>
                                    <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2.5 py-0.5 rounded-full border border-blue-400/20">
                                        {googleEvents.length} eventos
                                    </span>
                                </div>
                                <button
                                    onClick={fetchGoogleEvents}
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
                                >
                                    <RefreshCw className={cn("w-3 h-3")} />
                                    Sincronizar
                                </button>
                            </div>
                            <div className="divide-y divide-blue-500/5">
                                {googleEvents
                                    .filter(event => {
                                        const eventDate = new Date(event.start)
                                        const now = new Date()
                                        now.setHours(0, 0, 0, 0)
                                        return eventDate >= now
                                    })
                                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                                    .map((event) => (
                                        <div
                                            key={event.id}
                                            className="flex items-center gap-4 p-4 hover:bg-blue-500/5 transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                                                <Calendar className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-primary-theme truncate">{event.title}</p>
                                                {event.resource?.description && (
                                                    <p className="text-[10px] text-secondary-theme truncate mt-0.5 font-medium italic">"{event.resource.description}"</p>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-[10px] font-black text-primary-theme uppercase tracking-widest capitalize">
                                                    {new Date(event.start).toLocaleDateString('es-MX', {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}
                                                </p>
                                                <p className="text-[10px] font-bold text-blue-500 flex items-center gap-1 justify-end uppercase tracking-widest mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {event.resource?.isAllDay ? 'Todo el día' : new Date(event.start).toLocaleTimeString('es-MX', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                            {event.resource?.htmlLink && (
                                                <a
                                                    href={event.resource.htmlLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-all border border-blue-500/10"
                                                    title="Abrir en Google Calendar"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                        <polyline points="15 3 21 3 21 9" />
                                                        <line x1="10" y1="14" x2="21" y2="3" />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </>
            )
            }

            {/* New Appointment Modal */}
            {
                showModal && createPortal(
                    <div className="fixed inset-0 bg-[var(--bg-primary)]/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-primary-theme rounded-soft shadow-[0_0_30px_rgba(0,0,0,0.3)] w-full max-w-lg animate-scale-in max-h-[90vh] flex flex-col border border-theme">
                            <div className="flex items-center justify-between p-6 border-b border-theme flex-shrink-0">
                                <h2 className="text-xl font-bold text-primary-theme">
                                    {editingId ? 'Editar Cita' : 'Nueva Cita'}
                                </h2>
                                    <button
                                        onClick={() => {
                                            setShowModal(false)
                                            setEditingId(null)
                                            setNewAppointment({
                                                patient_name: '',
                                                phone_number: '',
                                                service: '',
                                                appointment_date: '',
                                                appointment_time: '',
                                                notes: '',
                                                professional_id: '',
                                                box_id: ''
                                            })
                                        }}
                                        className="p-2 hover:bg-secondary-theme rounded-soft transition-colors"
                                    >
                                        <X className="w-5 h-5 text-secondary-theme" />
                                    </button>
                            </div>

                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-primary-theme mb-2">
                                        Nombre del Paciente *
                                    </label>
                                    <input
                                        type="text"
                                        value={newAppointment.patient_name}
                                        onChange={(e) => {
                                            isSelectingPatientRef.current = false
                                            setIsSelectingPatientState(false)
                                            setNewAppointment({ ...newAppointment, patient_name: e.target.value })
                                        }}
                                        placeholder="Ej: María García"
                                        className="input-premium w-full"
                                        autoComplete="off"
                                    />
                                    {patientSuggestions.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-primary-theme rounded-soft border border-theme shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                            {patientSuggestions.map((patient) => (
                                                <button
                                                    key={patient.id}
                                                    type="button"
                                                    onClick={() => {
                                                        isSelectingPatientRef.current = true
                                                         setIsSelectingPatientState(true)
                                                        setNewAppointment({
                                                            ...newAppointment,
                                                            patient_name: patient.name || '',
                                                            phone_number: patient.phone_number
                                                        })
                                                        setPatientSuggestions([])
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-secondary-theme transition-colors flex items-center justify-between border-b border-theme last:border-0"
                                                >
                                                    <div>
                                                        <div className="text-sm font-bold text-primary-theme">{patient.name}</div>
                                                        <div className="text-[11px] text-secondary-theme flex items-center gap-1 mt-0.5">
                                                            <Phone className="w-3 h-3" />
                                                            {patient.phone_number}
                                                        </div>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-[var(--accent-primary)]" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary-theme mb-2">
                                        Teléfono *
                                    </label>
                                    <input
                                        type="tel"
                                        value={newAppointment.phone_number}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, phone_number: e.target.value })}
                                        placeholder="Ej: 56912345678"
                                        className="input-premium w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-theme uppercase tracking-widest mb-2">
                                        Servicio *
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={newAppointment.service}
                                            onChange={(e) => {
                                                setNewAppointment({
                                                    ...newAppointment,
                                                    service: e.target.value
                                                })
                                            }}
                                            className="input-premium w-full appearance-none"
                                        >
                                            <option value="">Selecciona un servicio</option>
                                            {services.map((service) => (
                                                <option key={service.id} value={service.name}>
                                                    {service.name} ({service.duration} min) - ${service.price}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-theme rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-theme uppercase tracking-widest mb-2">
                                        Profesional
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={newAppointment.professional_id}
                                            onChange={(e) => {
                                                setNewAppointment({
                                                    ...newAppointment,
                                                    professional_id: e.target.value
                                                })
                                            }}
                                            className="input-premium w-full appearance-none"
                                        >
                                            <option value="">Sin asignar</option>
                                            {professionals.map((prof) => (
                                                <option key={prof.member_id} value={prof.member_id}>
                                                    {prof.first_name || ''} {prof.last_name || ''} {prof.job_title ? `(${prof.job_title})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-theme rotate-90 pointer-events-none" />
                                    </div>
                                    {newAppointment.professional_id && (
                                        <div className="mt-1.5 flex items-center gap-2">
                                            {(() => {
                                                const prof = professionals.find(p => p.member_id === newAppointment.professional_id)
                                                return prof ? (
                                                    <>
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prof.color || '#8B5CF6' }} />
                                                        <span className="text-[10px] font-black text-secondary-theme uppercase tracking-widest">
                                                            {prof.job_title || prof.specialty || prof.role}
                                                        </span>
                                                    </>
                                                ) : null
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary-theme mb-2">
                                        Box / Consultorio
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={newAppointment.box_id}
                                            onChange={(e) => setNewAppointment({ ...newAppointment, box_id: e.target.value })}
                                            className="input-premium w-full appearance-none"
                                        >
                                            <option value="">Sin asignar</option>
                                            {clinicBoxes.map((box: any) => (
                                                <option key={box.id} value={box.id}>
                                                    {box.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-theme rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-theme uppercase tracking-widest mb-2">
                                            Fecha *
                                        </label>
                                        <input
                                            type="date"
                                            value={newAppointment.appointment_date}
                                            onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                                            className="input-premium w-full !px-2 sm:!px-4"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">
                                            Hora *
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                className="input-soft w-full appearance-none text-center !px-1 sm:!px-4"
                                                value={(() => {
                                                    const hStr = newAppointment.appointment_time.split(':')[0]
                                                    const h = parseInt(hStr)
                                                    if (isNaN(h)) return 12
                                                    if (h === 0) return 12
                                                    if (h > 12) return h - 12
                                                    return h
                                                })()}
                                                onChange={(e) => {
                                                    const timeParts = newAppointment.appointment_time.split(':')
                                                    const currentH = parseInt(timeParts[0]) || 9
                                                    const currentM = parseInt(timeParts[1]) || 0
                                                    // Determine current AM/PM
                                                    const isPM = currentH >= 12
                                                    let newH = parseInt(e.target.value)

                                                    if (isPM && newH !== 12) newH += 12
                                                    if (!isPM && newH === 12) newH = 0

                                                    setNewAppointment({
                                                        ...newAppointment,
                                                        appointment_time: `${newH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`
                                                    })
                                                }}
                                            >
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <select
                                                className="input-soft w-full appearance-none text-center !px-1 sm:!px-4"
                                                value={newAppointment.appointment_time.split(':')[1] || '00'}
                                                onChange={(e) => {
                                                    const currentH = parseInt(newAppointment.appointment_time.split(':')[0]) || 9
                                                    // Handle NaN minutes if initialization failed

                                                    setNewAppointment({
                                                        ...newAppointment,
                                                        appointment_time: `${currentH.toString().padStart(2, '0')}:${e.target.value}`
                                                    })
                                                }}
                                            >
                                                {['00', '15', '30', '45'].map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                            <select
                                                className="input-soft w-[65px] sm:w-[80px] appearance-none text-center bg-primary-50 font-medium text-primary-700 border-primary-200 !px-1 sm:!px-4"
                                                value={(() => {
                                                    const h = parseInt(newAppointment.appointment_time.split(':')[0])
                                                    return isNaN(h) || h < 12 ? 'AM' : 'PM'
                                                })()}
                                                onChange={(e) => {
                                                    const timeParts = newAppointment.appointment_time.split(':')
                                                    const currentH = parseInt(timeParts[0]) || 9
                                                    const currentM = parseInt(timeParts[1]) || 0
                                                    const newIsPM = e.target.value === 'PM'
                                                    let newH = currentH

                                                    if (newIsPM && currentH < 12) newH += 12
                                                    if (!newIsPM && currentH >= 12) newH -= 12

                                                    setNewAppointment({
                                                        ...newAppointment,
                                                        appointment_time: `${newH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`
                                                    })
                                                }}
                                            >
                                                <option value="AM">AM</option>
                                                <option value="PM">PM</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-theme uppercase tracking-widest mb-2">
                                        Notas (opcional)
                                    </label>
                                    <textarea
                                        value={newAppointment.notes}
                                        onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                                        placeholder="Notas adicionales..."
                                        rows={3}
                                        className="input-premium w-full resize-none font-medium h-24"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-6 border-t border-silk-beige flex-shrink-0 bg-white rounded-b-soft">
                                <div>
                                    {editingId && (
                                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                                            <button
                                                onClick={() => {
                                                    const appt = appointments.find(a => a.id === editingId)
                                                    if (appt && confirm('¿Estás SEGURO de que quieres ELIMINAR permanentemente esta cita del sistema?')) {
                                                        handleDeleteAppointment(appt)
                                                        setShowModal(false)
                                                    }
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-all border border-red-500/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Eliminar Definitivamente
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Quieres marcar esta cita como CANCELADA (la cita se mantendrá en registros pero no en el calendario)?')) {
                                                        updateAppointmentStatus(editingId, 'cancelled')
                                                        setShowModal(false)
                                                    }
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest text-secondary-theme hover:text-primary-theme transition-colors underline underline-offset-4 decoration-theme"
                                            >
                                                Sólo Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowModal(false)
                                            setEditingId(null)
                                            setNewAppointment({
                                                patient_name: '',
                                                phone_number: '',
                                                service: '',
                                                appointment_date: '',
                                                appointment_time: '',
                                                notes: '',
                                                professional_id: '',
                                                box_id: ''
                                            })
                                        }}
                                        className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-secondary-theme hover:text-primary-theme transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveAppointment}
                                        disabled={saving || !newAppointment.patient_name || !newAppointment.phone_number || !newAppointment.service || !newAppointment.appointment_date || !newAppointment.appointment_time}
                                        className="btn-premium-primary px-8"
                                    >
                                        {saving ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                        ) : (
                                            <>{editingId ? 'Guardar Cambios' : 'Crear Cita'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
            {/* Clinical Record Modal */}
            {
                showRecordModal && foundPatient && selectedAppointment && (
                    <ClinicalRecordForm
                        patientId={foundPatient.id}
                        record={{
                            id: '', // New record
                            clinic_id: profile!.clinic_id,
                            patient_id: foundPatient.id,
                            date: selectedAppointment.appointment_date.split('T')[0],
                            treatment_name: selectedAppointment.service,
                            description: selectedAppointment.notes || '',
                            notes: '',
                            attachments: [],
                            professional_id: selectedAppointment.professional_id || null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }}
                        onClose={() => {
                            setShowRecordModal(false)
                            setSelectedAppointment(null)
                            setFoundPatient(null)
                        }}
                        onSave={async () => {
                            // Refresh data or show success toast
                            console.log('Record created!')

                            // Update patient stats
                            try {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const { error: statsError } = await (supabase as any).rpc('increment_patient_appointments', {
                                    p_patient_id: foundPatient.id,
                                    p_last_appointment: new Date().toISOString()
                                })

                                if (statsError) {
                                    // Fallback to manual update if RPC doesn't exist (it doesn't yet)
                                    // We'll trust the manual update for now as we didn't plan an RPC
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const { error: manualError } = await (supabase as any)
                                        .from('patients')
                                        .update({
                                            last_appointment_at: new Date().toISOString(),
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            total_appointments: ((foundPatient as any).total_appointments || 0) + 1
                                        })
                                        .eq('id', foundPatient.id)

                                    if (manualError) throw manualError
                                }
                                console.log('Patient stats updated')
                            } catch (err) {
                                console.error('Error updating patient stats:', err)
                            }
                        }}
                    />
                )
            }

            {/* Patient Creation Modal */}
            {
                showPatientModal && selectedAppointment && (
                    <PatientForm
                        patient={{
                            // Pre-fill with appointment data
                            id: '', // New
                            clinic_id: profile!.clinic_id,
                            created_at: '',
                            updated_at: '',
                            total_appointments: 0,
                            last_appointment_at: null,
                            name: selectedAppointment.patient_name,
                            phone_number: selectedAppointment.phone_number,
                            service: selectedAppointment.service,
                            notes: selectedAppointment.notes,
                            email: null,
                            address: null,
                            allergies: null,
                            medical_history: null,
                            is_high_risk: false,
                            rut: null,
                            gender: null,
                            birth_date: null,
                            insurance_provider: null,
                            internal_id: null,
                        }}
                        onClose={() => {
                            setShowPatientModal(false)
                            // If closed without saving, we stop the flow
                            if (!foundPatient) setSelectedAppointment(null)
                        }}
                        onSave={(newPatient) => {
                            if (newPatient) {
                                setFoundPatient(newPatient)
                                setShowPatientModal(false)
                                // Continue format flow
                                setTimeout(() => setShowRecordModal(true), 100)
                            }
                        }}
                    />
                )
            }
            <Toaster position="top-right" />
        </div>
    )
}

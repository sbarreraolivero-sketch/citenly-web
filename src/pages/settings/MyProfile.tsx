import { useState, useEffect } from 'react'
import { Save, Loader2, Palette, Briefcase, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { teamService } from '@/services/teamService'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

const DAYS = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
]

const COLOR_PRESETS = [
    '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

const DEFAULT_HOURS = {
    monday: { enabled: true, start: '09:00', end: '18:00' },
    tuesday: { enabled: true, start: '09:00', end: '18:00' },
    wednesday: { enabled: true, start: '09:00', end: '18:00' },
    thursday: { enabled: true, start: '09:00', end: '18:00' },
    friday: { enabled: true, start: '09:00', end: '18:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' },
}

export default function MyProfile() {
    const { member } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [jobTitle, setJobTitle] = useState('')
    const [specialty, setSpecialty] = useState('')
    const [color, setColor] = useState('#8B5CF6')
    const [workingHours, setWorkingHours] = useState<Record<string, { enabled: boolean; start: string; end: string }>>(DEFAULT_HOURS)

    useEffect(() => {
        if (member) {
            setFirstName(member.first_name || '')
            setLastName(member.last_name || '')
            setJobTitle((member as any).job_title || '')
            setSpecialty(member.specialty || '')
            setColor(member.color || '#8B5CF6')
            setWorkingHours((member as any).working_hours || DEFAULT_HOURS)
            setLoading(false)
        }
    }, [member])

    const handleSave = async () => {
        if (!member) return
        setSaving(true)
        try {
            await teamService.updateMemberProfile(member.id, {
                first_name: firstName,
                last_name: lastName,
                job_title: jobTitle,
                specialty,
                color,
                working_hours: workingHours,
            })
            toast.success('Perfil actualizado correctamente')
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error('Error al actualizar el perfil')
        } finally {
            setSaving(false)
        }
    }

    const updateDay = (dayKey: string, field: string, value: any) => {
        setWorkingHours(prev => ({
            ...prev,
            [dayKey]: {
                ...prev[dayKey],
                [field]: value
            }
        }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-charcoal">Mi Perfil Profesional</h1>
                    <p className="text-charcoal/50 mt-1">Configura tu información y horarios de atención</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                    ) : (
                        <><Save className="w-4 h-4" /> Guardar Cambios</>
                    )}
                </button>
            </div>

            {/* Información Personal */}
            <div className="card-soft p-6">
                <h2 className="text-base font-semibold text-charcoal mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary-500" />
                    Información Profesional
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal/70 mb-1.5">Nombre</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="input-soft w-full"
                            placeholder="Tu nombre"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal/70 mb-1.5">Apellido</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="input-soft w-full"
                            placeholder="Tu apellido"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal/70 mb-1.5">Cargo</label>
                        <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="input-soft w-full"
                            placeholder="Ej: Odontóloga, Fisioterapeuta"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal/70 mb-1.5">Especialidad</label>
                        <input
                            type="text"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                            className="input-soft w-full"
                            placeholder="Ej: Ortodoncia, Rehabilitación"
                        />
                    </div>
                </div>
            </div>

            {/* Color del Calendario */}
            <div className="card-soft p-6">
                <h2 className="text-base font-semibold text-charcoal mb-4 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary-500" />
                    Color del Calendario
                </h2>
                <p className="text-sm text-charcoal/50 mb-4">
                    Este color se usará para identificar tus citas en el calendario compartido.
                </p>
                <div className="flex items-center gap-3">
                    {COLOR_PRESETS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={cn(
                                "w-9 h-9 rounded-full transition-all duration-200 ring-offset-2",
                                color === c ? "ring-2 ring-primary-500 scale-110" : "hover:scale-105"
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    <div className="ml-2 flex items-center gap-2">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-9 h-9 rounded-full cursor-pointer border-2 border-silk-beige"
                        />
                        <span className="text-xs text-charcoal/40 font-mono">{color}</span>
                    </div>
                </div>
                {/* Preview */}
                <div className="mt-4 p-3 rounded-lg border-l-4 text-sm" style={{
                    borderLeftColor: color,
                    backgroundColor: color + '15'
                }}>
                    <div className="font-medium text-charcoal">Paciente Ejemplo - Servicio de prueba</div>
                    <div className="text-xs text-charcoal/60 mt-0.5">10:00 AM - 11:00 AM</div>
                </div>
            </div>

            {/* Horarios de Atención */}
            <div className="card-soft p-6">
                <h2 className="text-base font-semibold text-charcoal mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500" />
                    Horarios de Atención
                </h2>
                <p className="text-sm text-charcoal/50 mb-4">
                    Configura los días y horas en los que atiendes pacientes. El agente IA respetará estos horarios al agendar citas.
                </p>
                <div className="space-y-3">
                    {DAYS.map((day) => {
                        const dayHours = workingHours[day.key] || { enabled: false, start: '09:00', end: '18:00' }
                        return (
                            <div
                                key={day.key}
                                className={cn(
                                    "flex items-center gap-4 p-3 rounded-lg transition-colors",
                                    dayHours.enabled ? "bg-ivory" : "bg-gray-50/70"
                                )}
                            >
                                <label className="flex items-center gap-3 w-32 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={dayHours.enabled}
                                        onChange={(e) => updateDay(day.key, 'enabled', e.target.checked)}
                                        className="accent-primary-500 w-4 h-4"
                                    />
                                    <span className={cn(
                                        "text-sm font-medium",
                                        dayHours.enabled ? "text-charcoal" : "text-charcoal/40"
                                    )}>
                                        {day.label}
                                    </span>
                                </label>
                                {dayHours.enabled && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={dayHours.start}
                                            onChange={(e) => updateDay(day.key, 'start', e.target.value)}
                                            className="input-soft text-sm py-1.5 px-3"
                                        />
                                        <span className="text-charcoal/40 text-sm">a</span>
                                        <input
                                            type="time"
                                            value={dayHours.end}
                                            onChange={(e) => updateDay(day.key, 'end', e.target.value)}
                                            className="input-soft text-sm py-1.5 px-3"
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

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
    monday: { enabled: true, start: '09:00', end: '18:00', lunch_break: { enabled: false, start: '14:00', end: '15:00' } },
    tuesday: { enabled: true, start: '09:00', end: '18:00', lunch_break: { enabled: false, start: '14:00', end: '15:00' } },
    wednesday: { enabled: true, start: '09:00', end: '18:00', lunch_break: { enabled: false, start: '14:00', end: '15:00' } },
    thursday: { enabled: true, start: '09:00', end: '18:00', lunch_break: { enabled: false, start: '14:00', end: '15:00' } },
    friday: { enabled: true, start: '09:00', end: '18:00', lunch_break: { enabled: false, start: '14:00', end: '15:00' } },
    saturday: { enabled: false, start: '09:00', end: '13:00', lunch_break: { enabled: false, start: '14:00', end: '15:00' } },
    sunday: { enabled: false, start: '09:00', end: '13:00', lunch_break: { enabled: false, start: '14:00', end: '15:00' } },
}

export default function MyProfile() {
    const { member } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [specialty, setSpecialty] = useState('')
    const [color, setColor] = useState('#8B5CF6')
    const [workingHours, setWorkingHours] = useState<Record<string, { enabled: boolean; start: string; end: string; lunch_break?: { enabled: boolean; start: string; end: string } }>>(DEFAULT_HOURS)

    useEffect(() => {
        if (member) {
            setFirstName(member.first_name || '')
            setLastName(member.last_name || '')
            setSpecialty(member.specialty || '')
            setColor(member.color || '#8B5CF6')
            setWorkingHours((member as any).working_hours || DEFAULT_HOURS)
        }
        // Always stop loading after attempting to get member
        setLoading(false)
    }, [member])

    const handleSave = async () => {
        let currentMemberId = member?.id

        if (!currentMemberId) {
            // Intenta recuperar el ID directamente si se perdió en el contexto (múltiples sesiones/caché)
            const fallbackMember = await teamService.getCurrentMember()
            if (fallbackMember?.id) {
                currentMemberId = fallbackMember.id
            }
        }

        if (!currentMemberId) {
            toast.error('No se pudo encontrar tu registro profesional. Refresca la página.')
            return
        }

        setSaving(true)
        try {
            await teamService.updateMemberProfile(currentMemberId, {
                first_name: firstName,
                last_name: lastName,
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
                    <h1 className="text-2xl font-bold text-primary-theme">Mi Perfil Profesional</h1>
                    <p className="text-secondary-theme mt-1">Configura tu información y horarios de atención</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-premium-primary flex items-center gap-2"
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                    ) : (
                        <><Save className="w-4 h-4" /> Guardar Cambios</>
                    )}
                </button>
            </div>

            {/* Información Personal */}
            <div className="card-premium p-6">
                <h2 className="text-base font-bold text-primary-theme mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[var(--accent-primary)]" />
                    Información Profesional
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-secondary-theme mb-1.5 uppercase tracking-wider text-[10px]">Nombre</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="input-premium w-full"
                            placeholder="Tu nombre"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-secondary-theme mb-1.5 uppercase tracking-wider text-[10px]">Apellido</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="input-premium w-full"
                            placeholder="Tu apellido"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-secondary-theme mb-1.5 uppercase tracking-wider text-[10px]">Cargo</label>
                        <input
                            type="text"
                            value={
                                member?.role === 'owner' || member?.role === 'admin' ? 'Administrador' :
                                member?.role === 'professional' ? 'Profesional' :
                                member?.role === 'receptionist' ? 'Recepción' : ''
                            }
                            readOnly
                            className="input-premium w-full opacity-60 cursor-not-allowed"
                            placeholder="Cargo asignado"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-secondary-theme mb-1.5 uppercase tracking-wider text-[10px]">Especialidad</label>
                        <input
                            type="text"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                            className="input-premium w-full"
                            placeholder="Ej: Ortodoncia, Rehabilitación"
                        />
                    </div>
                </div>
            </div>

            {/* Color del Calendario */}
            <div className="card-premium p-6">
                <h2 className="text-base font-bold text-primary-theme mb-4 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
                    Color del Calendario
                </h2>
                <p className="text-sm text-secondary-theme mb-4">
                    Este color se usará para identificar tus citas en el calendario compartido.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                    {COLOR_PRESETS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={cn(
                                "w-9 h-9 rounded-full transition-all duration-200 ring-offset-2 flex-shrink-0",
                                color === c ? "ring-2 ring-primary-500 scale-110" : "hover:scale-105"
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    <div className="ml-2 flex items-center gap-2 sm:ml-2">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-9 h-9 rounded-full cursor-pointer border-2 border-theme flex-shrink-0"
                        />
                        <span className="text-xs text-secondary-theme font-mono">{color}</span>
                    </div>
                </div>
                {/* Preview */}
                <div className="mt-4 p-4 rounded-soft border-l-4 text-sm bg-primary-theme/5 border border-theme" style={{
                    borderLeftColor: color
                }}>
                    <div className="font-bold text-primary-theme">Paciente Ejemplo - Servicio de prueba</div>
                    <div className="text-xs text-secondary-theme mt-1 font-medium">10:00 AM - 11:00 AM</div>
                </div>
            </div>

            {/* Horarios de Atención */}
            <div className="card-premium p-6">
                <h2 className="text-base font-bold text-primary-theme mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
                    Horarios de Atención
                </h2>
                <p className="text-sm text-secondary-theme mb-4">
                    Configura los días y horas en los que atiendes pacientes. El agente IA respetará estos horarios al agendar citas.
                </p>
                <div className="space-y-3">
                    {DAYS.map((day) => {
                        const dayHours = workingHours[day.key] || { enabled: false, start: '09:00', end: '18:00' }
                        return (
                            <div
                                key={day.key}
                                className={cn(
                                    "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg transition-colors border",
                                    dayHours.enabled ? "bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/20 shadow-[0_0_15px_rgba(255,46,136,0.05)]" : "bg-secondary-theme/30 border-theme"
                                )}
                            >
                                <label className="flex items-center gap-3 w-28 sm:w-32 cursor-pointer flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={dayHours.enabled}
                                        onChange={(e) => updateDay(day.key, 'enabled', e.target.checked)}
                                        className="accent-[var(--accent-primary)] w-4 h-4"
                                    />
                                    <span className={cn(
                                        "text-sm font-bold uppercase tracking-widest text-[11px]",
                                        dayHours.enabled ? "text-primary-theme" : "text-secondary-theme opacity-40"
                                    )}>
                                        {day.label}
                                    </span>
                                </label>
                                {dayHours.enabled && (
                                    <div className="flex flex-col gap-3 flex-1 w-full sm:w-auto">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={dayHours.start}
                                                onChange={(e) => updateDay(day.key, 'start', e.target.value)}
                                                className="input-premium text-sm py-1.5 px-3 flex-1"
                                            />
                                            <span className="text-secondary-theme text-xs font-black uppercase tracking-widest mx-1 opacity-50 shrink-0">a</span>
                                            <input
                                                type="time"
                                                value={dayHours.end}
                                                onChange={(e) => updateDay(day.key, 'end', e.target.value)}
                                                className="input-premium text-sm py-1.5 px-3 flex-1"
                                            />
                                        </div>

                                        {/* Colación UI */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-4 border-l-2 border-theme ml-1">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative inline-flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={dayHours.lunch_break?.enabled || false}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setWorkingHours((prev: any) => ({
                                                                ...prev,
                                                                [day.key]: {
                                                                    ...prev[day.key],
                                                                    lunch_break: {
                                                                        ...(prev[day.key].lunch_break || { start: '14:00', end: '15:00' }),
                                                                        enabled: checked
                                                                    }
                                                                }
                                                            }))
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-8 h-4 bg-charcoal/15 dark:bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#FF2E88] shadow-inner"></div>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary-theme group-hover:text-primary-theme transition-colors">Colación</span>
                                            </label>

                                                {dayHours.lunch_break?.enabled && (
                                                    <div className="flex items-center gap-2 animate-fade-in flex-1 w-full sm:w-auto">
                                                        <input
                                                            type="time"
                                                            value={dayHours.lunch_break.start}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setWorkingHours((prev: any) => ({
                                                                    ...prev,
                                                                    [day.key]: {
                                                                        ...prev[day.key],
                                                                        lunch_break: { ...prev[day.key].lunch_break, start: val }
                                                                    }
                                                                }))
                                                            }}
                                                            className="input-premium text-[11px] py-1 px-2 flex-1"
                                                        />
                                                        <span className="text-secondary-theme text-[10px] font-black uppercase opacity-40 shrink-0">a</span>
                                                        <input
                                                            type="time"
                                                            value={dayHours.lunch_break.end}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setWorkingHours((prev: any) => ({
                                                                    ...prev,
                                                                    [day.key]: {
                                                                        ...prev[day.key],
                                                                        lunch_break: { ...prev[day.key].lunch_break, end: val }
                                                                    }
                                                                }))
                                                            }}
                                                            className="input-premium text-[11px] py-1 px-2 flex-1"
                                                        />
                                                    </div>
                                                )}
                                        </div>
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

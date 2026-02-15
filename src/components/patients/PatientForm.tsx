
import { useState, useEffect } from 'react'
import { X, Loader2, Save, MapPin, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Database } from '@/types/database'

type Patient = Database['public']['Tables']['patients']['Row']

interface ServiceOption {
    id: string
    name: string
}

interface PatientFormProps {
    patient?: Patient | null
    onClose: () => void
    onSave: (patient?: Patient) => void
}

export function PatientForm({ patient, onClose, onSave }: PatientFormProps) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [services, setServices] = useState<ServiceOption[]>([])

    const [formData, setFormData] = useState({
        name: '',
        phone_number: '',
        email: '',
        address: '',
        service: '',
        notes: ''
    })

    // Fetch services for dropdown
    useEffect(() => {
        const fetchServices = async () => {
            if (!profile?.clinic_id) return
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data } = await (supabase as any)
                    .from('services')
                    .select('id, name')
                    .eq('clinic_id', profile.clinic_id)
                    .order('name', { ascending: true })
                if (data) setServices(data)
            } catch (err) {
                console.error('Error fetching services:', err)
            }
        }
        fetchServices()
    }, [profile?.clinic_id])

    useEffect(() => {
        if (patient) {
            setFormData({
                name: patient.name || '',
                phone_number: patient.phone_number,
                email: patient.email || '',
                address: patient.address || '',
                service: patient.service || '',
                notes: patient.notes || ''
            })
        }
    }, [patient])

    const formatPhoneNumber = (value: string) => {
        // Remove non-numeric characters
        const cleaned = value.replace(/\D/g, '')
        return cleaned
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile?.clinic_id) return

        setLoading(true)
        setError(null)

        try {
            const cleanPhone = formatPhoneNumber(formData.phone_number)

            if (cleanPhone.length < 10) {
                throw new Error('El número de teléfono debe tener al menos 10 dígitos')
            }

            const patientData: Database['public']['Tables']['patients']['Insert'] = {
                clinic_id: profile.clinic_id,
                name: formData.name,
                phone_number: cleanPhone,
                email: formData.email || null,
                address: formData.address || null,
                service: formData.service || null,
                notes: formData.notes || null,
            }

            let savedPatient: Patient | null = null

            if (patient?.id) {
                // Update existing
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error: updateError } = await (supabase as any)
                    .from('patients')
                    .update(patientData)
                    .eq('id', patient.id)
                    .eq('clinic_id', profile.clinic_id)
                    .select()
                    .single()

                if (updateError) throw updateError
                savedPatient = data
            } else {
                // Create new
                // Check if phone already exists for this clinic
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: existing } = await (supabase as any)
                    .from('patients')
                    .select('id')
                    .eq('clinic_id', profile.clinic_id)
                    .eq('phone_number', cleanPhone)
                    .single()

                if (existing) {
                    throw new Error('Ya existe un paciente con este número de teléfono')
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error: createError } = await (supabase as any)
                    .from('patients')
                    .insert([patientData])
                    .select()
                    .single()

                if (createError) throw createError
                savedPatient = data
            }

            onSave(savedPatient || undefined)
            onClose()
        } catch (err) {
            console.error('Error saving patient:', err)
            setError(err instanceof Error ? err.message : 'Error al guardar el paciente')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white rounded-soft w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-silk-beige flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-charcoal">
                        {patient ? 'Editar Paciente' : 'Nuevo Paciente'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-silk-beige rounded-soft transition-colors"
                    >
                        <X className="w-5 h-5 text-charcoal/60" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-soft flex items-center gap-2">
                            <span className="font-medium">Error:</span> {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                Nombre Completo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-soft"
                                placeholder="Ej: Maria Perez"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                Teléfono (WhatsApp) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                required
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                className="input-soft"
                                placeholder="Ej: 521234567890"
                            />
                            <p className="text-xs text-charcoal/50 mt-1">
                                Ingresa el número con código de país si es posible.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-soft"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-charcoal/50" />
                                    Dirección
                                </span>
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="input-soft"
                                placeholder="Ej: Av. Principal 123, Colonia, Ciudad"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                <span className="flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5 text-charcoal/50" />
                                    Servicio
                                </span>
                            </label>
                            {services.length > 0 ? (
                                <select
                                    value={formData.service}
                                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                    className="input-soft"
                                >
                                    <option value="">Seleccionar servicio...</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.service}
                                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                    className="input-soft"
                                    placeholder="Ej: Limpieza facial, Botox..."
                                />
                            )}
                            <p className="text-xs text-charcoal/40 mt-1">
                                {services.length > 0
                                    ? 'Selecciona el servicio principal del paciente.'
                                    : 'Configura servicios en Ajustes para verlos aquí como opciones.'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                Notas Internas
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="input-soft min-h-[100px] resize-y"
                                placeholder="Alergias, preferencias, historial..."
                            />
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-silk-beige flex justify-end gap-3 bg-white rounded-b-soft">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary flex items-center gap-2"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Guardar Paciente</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

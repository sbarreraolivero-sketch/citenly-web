
import { useState, useEffect } from 'react'
import { X, Loader2, Save, MapPin, Briefcase, Share2, ShieldAlert } from 'lucide-react'
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
        notes: '',
        referred_by_code: '',
        rut: '',
        gender: '',
        birth_date: '',
        insurance_provider: '',
        internal_id: '',
        allergies: '',
        medical_history: '',
        is_high_risk: false
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
                notes: patient.notes || '',
                referred_by_code: (patient as any).referred_by_code || '',
                rut: (patient as any).rut || '',
                gender: (patient as any).gender || '',
                birth_date: (patient as any).birth_date || '',
                insurance_provider: (patient as any).insurance_provider || '',
                internal_id: (patient as any).internal_id || '',
                allergies: patient.allergies || '',
                medical_history: patient.medical_history || '',
                is_high_risk: patient.is_high_risk || false
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

            const patientData: any = {
                clinic_id: profile.clinic_id,
                name: formData.name,
                phone_number: cleanPhone,
                email: formData.email || null,
                address: formData.address || null,
                service: formData.service || null,
                notes: formData.notes || null,
                referred_by_code: formData.referred_by_code || null,
                rut: formData.rut || null,
                gender: formData.gender || null,
                birth_date: formData.birth_date || null,
                insurance_provider: formData.insurance_provider || null,
                internal_id: formData.internal_id || null,
                allergies: formData.allergies || null,
                medical_history: formData.medical_history || null,
                is_high_risk: formData.is_high_risk
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-2">
                                    RUT / ID legal
                                </label>
                                <input
                                    type="text"
                                    value={formData.rut}
                                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                                    className="input-soft"
                                    placeholder="Ej: 12.345.678-9"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-2">
                                    Fecha de Nacimiento
                                </label>
                                <input
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                    className="input-soft"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-2">
                                    Género
                                </label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="input-soft"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-2">
                                    Convenio / Seguro
                                </label>
                                <input
                                    type="text"
                                    value={formData.insurance_provider}
                                    onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                                    className="input-soft"
                                    placeholder="Ej: Sin convenio"
                                />
                            </div>
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
                        <div className="pt-4 border-t border-silk-beige mt-4">
                            <label className="block text-sm font-bold text-primary-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                                <Share2 className="w-4 h-4" />
                                Código de Referido (Opcional)
                            </label>
                            <input
                                type="text"
                                value={formData.referred_by_code}
                                onChange={(e) => setFormData({ ...formData, referred_by_code: e.target.value.toUpperCase() })}
                                className="input-soft font-mono"
                                placeholder="Ej: BERN-7073"
                            />
                            <p className="text-[10px] text-charcoal/40 mt-1 italic">
                                Si el paciente viene de parte de alguien, ingresa el código aquí para asignar puntos al referente al completar su cita.
                            </p>
                        </div>

                        <div className="pt-6 border-t border-red-100 bg-red-50/30 rounded-softer p-4 space-y-4">
                            <h3 className="text-sm font-black text-red-700 uppercase tracking-tight flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                Seguridad Clínica
                            </h3>
                            
                            <div className="flex items-center gap-3 mb-4">
                                <input
                                    type="checkbox"
                                    id="is_high_risk"
                                    checked={formData.is_high_risk}
                                    onChange={(e) => setFormData({ ...formData, is_high_risk: e.target.checked })}
                                    className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
                                />
                                <label htmlFor="is_high_risk" className="text-sm font-bold text-red-800">
                                    Paciente de Alto Riesgo / Alerta Crítica
                                </label>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-red-900/40 mb-2">Alergias (Medicamentos, látex, etc.)</label>
                                <textarea
                                    value={formData.allergies}
                                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                                    className="input-soft border-red-100 focus:border-red-300 focus:ring-red-100 min-h-[60px]"
                                    placeholder="Ej: Penicilina, AINES, Látex..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-red-900/40 mb-2">Antecedentes Médicos Relevantes</label>
                                <textarea
                                    value={formData.medical_history}
                                    onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                                    className="input-soft border-red-100 focus:border-red-300 focus:ring-red-100 min-h-[80px]"
                                    placeholder="Ej: HTA Controlada, Diabetes Tipo II, Anticoagulado..."
                                />
                            </div>
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

import { useState, useEffect } from 'react'
import { X, Loader2, Save, FileText, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

import { PhotoUpload } from './PhotoUpload'

// Define the type manually since we might not have regenerated types yet
export interface ClinicalRecord {
    id: string
    clinic_id: string
    patient_id: string
    date: string
    treatment_name: string
    description: string | null
    notes: string | null
    attachments: any[] | null
    created_at: string
    updated_at: string
}

interface ClinicalRecordFormProps {
    patientId: string
    record?: ClinicalRecord | null
    onClose: () => void
    onSave: () => void
}

export function ClinicalRecordForm({ patientId, record, onClose, onSave }: ClinicalRecordFormProps) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [services, setServices] = useState<any[]>([])

    // Photo state
    const [photoFile, setPhotoFile] = useState<File | null>(null)

    const today = new Date().toISOString().split('T')[0]

    const [formData, setFormData] = useState({
        date: today,
        treatment_name: '',
        description: '',
        notes: ''
    })

    // Fetch services for autocomplete/dropdown if needed
    useEffect(() => {
        const fetchServices = async () => {
            if (!profile?.clinic_id) return
            try {
                const { data } = await supabase
                    .from('services')
                    .select('name')
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
        if (record) {
            setFormData({
                date: record.date,
                treatment_name: record.treatment_name,
                description: record.description || '',
                notes: record.notes || ''
            })
        }
    }, [record])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile?.clinic_id) return

        setLoading(true)
        setError(null)

        try {
            let attachments = record?.attachments || []

            // 1. Upload photo if selected
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `${profile.clinic_id}/${patientId}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('clinical-photos')
                    .upload(filePath, photoFile)

                if (uploadError) throw uploadError

                // Add to attachments array
                attachments = [
                    ...(attachments || []),
                    {
                        type: 'image',
                        path: filePath,
                        name: photoFile.name,
                        uploaded_at: new Date().toISOString()
                    }
                ]
            }

            const recordData = {
                clinic_id: profile.clinic_id,
                patient_id: patientId,
                date: formData.date,
                treatment_name: formData.treatment_name,
                description: formData.description || null,
                notes: formData.notes || null,
                attachments: attachments,
                created_by: profile.id
            }

            if (record?.id) {
                // Update
                // Update
                const { error: updateError } = await (supabase
                    .from('clinical_records') as any)
                    .update(recordData)
                    .eq('id', record.id)
                    .eq('clinic_id', profile.clinic_id)

                if (updateError) throw updateError
            } else {
                // Create
                // Create
                const { error: createError } = await (supabase
                    .from('clinical_records') as any)
                    .insert([recordData])

                if (createError) throw createError
            }

            onSave()
            onClose()
        } catch (err) {
            console.error('Error saving clinical record:', err)
            setError(err instanceof Error ? err.message : 'Error al guardar el registro')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-fade-in p-4">
            <div className="bg-white rounded-soft w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-silk-beige flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-charcoal">
                        {record ? 'Editar Registro Clínico' : 'Nuevo Registro Clínico'}
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
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-charcoal/50" />
                                    Fecha del Tratamiento <span className="text-red-500">*</span>
                                </span>
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="input-soft w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                <span className="flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-charcoal/50" />
                                    Tratamiento Realizado <span className="text-red-500">*</span>
                                </span>
                            </label>
                            <input
                                type="text"
                                required
                                list="services-list"
                                value={formData.treatment_name}
                                onChange={(e) => setFormData({ ...formData, treatment_name: e.target.value })}
                                className="input-soft w-full"
                                placeholder="Ej: Botox Global, Limpieza Profunda..."
                            />
                            <datalist id="services-list">
                                {services.map((s, i) => (
                                    <option key={i} value={s.name} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                Descripción del Procedimiento
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input-soft w-full min-h-[100px] resize-y"
                                placeholder="Detalles técnicos, zonas tratadas, unidades utilizadas, etc..."
                            />
                        </div>

                        {/* Photo Upload */}
                        <PhotoUpload
                            selectedFile={photoFile}
                            onFileSelect={setPhotoFile}
                            onClear={() => setPhotoFile(null)}
                        />

                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                Notas Internas
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="input-soft w-full min-h-[80px] resize-y"
                                placeholder="Observaciones sobre el paciente, reacciones, recomendaciones dadas..."
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
                            <><Save className="w-4 h-4" /> Guardar Registro</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

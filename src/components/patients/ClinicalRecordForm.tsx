import { useState, useEffect } from 'react'
import { X, Loader2, FileText, Calendar, TrendingUp, Layers, ShieldCheck, Info, Syringe, Beaker, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { PhotoUpload } from './PhotoUpload'

// Define the type manually since we might not have regenerated types yet
export interface ClinicalRecord {
    id: string
    clinic_id: string | null
    patient_id: string | null
    date: string
    treatment_name: string
    description: string | null
    notes: string | null
    attachments: any | null
    metadata?: any | null
    professional_id: string | null
    created_at: string
    updated_at: string
}

interface ClinicalRecordFormProps {
    patientId: string
    specialty?: 'aesthetic' | 'dental' | 'general'
    record?: ClinicalRecord | null
    onClose: () => void
    onSave: () => void
    initialData?: {
        treatment_name?: string
        description?: string
        notes?: string
    }
}

const ORTHO_PHASES = [
    'Diagnóstico / Estudio',
    'Alineación y Nivelación',
    'Cierre de Espacios / Corrección',
    'Finalización / Detallado',
    'Retención'
]

const ANGLE_CLASSES = ['Clase I', 'Clase II div 1', 'Clase II div 2', 'Clase III']

export function ClinicalRecordForm({ patientId, specialty = 'general', record, onClose, onSave, initialData }: ClinicalRecordFormProps) {
    const { profile, member } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [recordType, setRecordType] = useState<'general' | 'ortho'>(specialty === 'dental' ? 'general' : 'general')

    // Photo state
    const [photoFile, setPhotoFile] = useState<File | null>(null)

    const today = new Date().toISOString().split('T')[0]

    const [formData, setFormData] = useState({
        date: today,
        treatment_name: initialData?.treatment_name || '',
        description: initialData?.description || '',
        notes: initialData?.notes || ''
    })

    // Specialized Dental/Ortho Metadata
    const [metadata, setMetadata] = useState<any>({
        tooth_numbers: '',
        dental_gen: {
            anesthesia_type: '',
            anesthesia_dosage: '',
            isolation_type: 'Relativo',
            materials_used: '',
            sensitivity_test: '',
            mobility_level: ''
        },
        ortho: {
            phase: '',
            upper_archwire: '',
            lower_archwire: '',
            angle_class_molar: '',
            angle_class_canine: '',
            elastics: '',
            hygiene: 'buena'
        }
    })

    useEffect(() => {
        // Services fetched if needed in future
    }, [profile?.clinic_id])

    useEffect(() => {
        if (record) {
            setFormData({
                date: record.date,
                treatment_name: record.treatment_name,
                description: record.description || '',
                notes: record.notes || ''
            })
            
            // Link metadata or fetch from independent tables
            const fetchSpecializedData = async () => {
                // Try Ortho
                const { data: orthoData } = await supabase
                    .from('orthodontic_evolutions')
                    .select('*')
                    .eq('clinical_record_id', record.id)
                    .single()
                
                if (orthoData) {
                    setMetadata((prev: any) => ({ ...prev, ortho: orthoData }))
                    setRecordType('ortho')
                    return
                }

                // Try Dental General
                const { data: dentalData } = await supabase
                    .from('dental_general_evolutions')
                    .select('*')
                    .eq('clinical_record_id', record.id)
                    .single()
                
                if (dentalData) {
                    setMetadata((prev: any) => ({ 
                        ...prev, 
                        dental_gen: dentalData, 
                        tooth_numbers: (dentalData as any).tooth_numbers?.join(', ') || '' 
                    }))
                    setRecordType('general')
                } else if (record.metadata) {
                    setMetadata(record.metadata)
                    if (record.metadata.ortho?.phase) setRecordType('ortho')
                }
            }
            fetchSpecializedData()
        }
    }, [record])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile?.clinic_id) return

        setLoading(true)
        setError(null)

        try {
            let attachments = record?.attachments || []

            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `${profile.clinic_id}/${patientId}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('clinical-photos')
                    .upload(filePath, photoFile)

                if (uploadError) throw uploadError

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
                metadata: metadata, // Temporary keep metadata updated
                created_by: profile.id,
                professional_id: member?.id
            }

            let recordId = record?.id
            if (record?.id) {
                const { error: updateError } = await (supabase
                    .from('clinical_records') as any)
                    .update(recordData)
                    .eq('id', record.id)
                    .eq('clinic_id', profile.clinic_id)

                if (updateError) throw updateError
            } else {
                const { data: newRecord, error: createError } = await (supabase
                    .from('clinical_records') as any)
                    .insert([recordData])
                    .select()
                    .single()

                if (createError) throw createError
                recordId = newRecord.id
            }

            // Save Specialized Data
            if (recordId) {
                if (recordType === 'ortho') {
                    const { error: orthoError } = await (supabase
                        .from('orthodontic_evolutions') as any)
                        .upsert({
                            clinic_id: profile.clinic_id,
                            patient_id: patientId,
                            clinical_record_id: recordId,
                            date: formData.date,
                            ...metadata.ortho
                        }, { onConflict: 'clinical_record_id' })
                    if (orthoError) console.error('Error saving ortho:', orthoError)
                } else if (specialty === 'dental' && recordType === 'general') {
                    const { error: dentalError } = await (supabase
                        .from('dental_general_evolutions') as any)
                        .upsert({
                            clinic_id: profile.clinic_id,
                            patient_id: patientId,
                            clinical_record_id: recordId,
                            tooth_numbers: (metadata as any).tooth_numbers?.split(',').map((s: string) => s.trim()).filter(Boolean),
                            ...metadata.dental_gen
                        }, { onConflict: 'clinical_record_id' })
                    if (dentalError) console.error('Error saving dental gen:', dentalError)
                }
            }

            onSave()
            onClose()
        } catch (err) {
            console.error('Error saving record:', err)
            setError(err instanceof Error ? err.message : 'Error al guardar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in p-4">
            <div className="bg-white rounded-softer w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] border border-silk-beige">
                <div className="p-8 border-b border-silk-beige flex items-center justify-between bg-ivory/30">
                    <div>
                        <h2 className="text-2xl font-black text-charcoal tracking-tight">
                            {record ? 'Editar Evolución' : 'Nuevo Registro de Evolución'}
                        </h2>
                        <p className="text-[11px] text-charcoal/70 font-black uppercase tracking-widest mt-1">Historial Clínico</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-silk-beige rounded-full transition-all text-charcoal/40 hover:text-charcoal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-soft border border-red-100 flex items-center gap-3">
                            <Info className="w-5 h-5" />
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    {/* Specialty Switcher if Dental */}
                    {specialty === 'dental' && (
                        <div className="flex p-1 bg-silk-beige/30 rounded-full border border-silk-beige max-w-sm mx-auto shadow-inner">
                            <button
                                type="button"
                                onClick={() => setRecordType('general')}
                                className={cn(
                                    "flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all",
                                    recordType === 'general' ? "bg-white text-primary-700 shadow-premium" : "text-charcoal/60"
                                )}
                            >
                                Evolución General
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecordType('ortho')}
                                className={cn(
                                    "flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all",
                                    recordType === 'ortho' ? "bg-white text-primary-700 shadow-premium" : "text-charcoal/60"
                                )}
                            >
                                Ficha Ortodoncia
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-black uppercase text-charcoal/80 tracking-widest mb-3 border-l-4 border-primary-500 pl-3">Fecha del Tratamiento</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/20" />
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="input-soft w-full pl-12 h-14 font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black uppercase text-charcoal/80 tracking-widest mb-3 border-l-4 border-primary-500 pl-3">Tratamiento Realizado</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/20" />
                                <input
                                    type="text"
                                    required
                                    list="services-list"
                                    value={formData.treatment_name}
                                    onChange={(e) => setFormData({ ...formData, treatment_name: e.target.value })}
                                    className="input-soft w-full pl-12 h-14 font-bold"
                                    placeholder="Ej: Carilla de Resina, Extracción..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dental General Specific Section */}
                    {specialty === 'dental' && recordType === 'general' && (
                        <div className="space-y-8 p-6 bg-emerald-50/60 rounded-softer border-2 border-emerald-200 animate-slide-up shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-5 h-5 text-emerald-700" />
                                <h3 className="font-black text-emerald-900 uppercase tracking-tighter">Detalle Odontológico</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-charcoal/80 mb-2">Piezas Tratadas (Separadas por coma)</label>
                                    <input 
                                        type="text"
                                        value={metadata.tooth_numbers}
                                        onChange={(e) => setMetadata({ ...metadata, tooth_numbers: e.target.value })}
                                        className="input-soft w-full h-12 font-bold"
                                        placeholder="Ej: 11, 21, 46"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-charcoal/80 mb-2">Aislamiento</label>
                                        <select 
                                            value={metadata.dental_gen?.isolation_type}
                                            onChange={(e) => setMetadata({ ...metadata, dental_gen: { ...metadata.dental_gen, isolation_type: e.target.value } })}
                                            className="input-soft w-full h-12 font-bold"
                                        >
                                            <option value="Relativo">Relativo</option>
                                            <option value="Absoluto">Absoluto</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-charcoal/80 mb-2">Movilidad</label>
                                        <select 
                                            value={metadata.dental_gen?.mobility_level}
                                            onChange={(e) => setMetadata({ ...metadata, dental_gen: { ...metadata.dental_gen, mobility_level: e.target.value } })}
                                            className="input-soft w-full h-12 font-bold"
                                        >
                                            <option value="">Fisiológica</option>
                                            <option value="I">Grado I</option>
                                            <option value="II">Grado II</option>
                                            <option value="III">Grado III</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Syringe className="w-4 h-4 text-emerald-600" />
                                        <label className="text-[11px] font-black uppercase text-charcoal/80">Anestesia</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input 
                                            type="text"
                                            value={metadata.dental_gen?.anesthesia_type}
                                            onChange={(e) => setMetadata({ ...metadata, dental_gen: { ...metadata.dental_gen, anesthesia_type: e.target.value } })}
                                            className="input-soft w-full h-12 font-bold text-xs"
                                            placeholder="Tipo (Spix, Infilt...)"
                                        />
                                        <input 
                                            type="text"
                                            value={metadata.dental_gen?.anesthesia_dosage}
                                            onChange={(e) => setMetadata({ ...metadata, dental_gen: { ...metadata.dental_gen, anesthesia_dosage: e.target.value } })}
                                            className="input-soft w-full h-12 font-bold text-xs"
                                            placeholder="Dosaje (carpules)"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Beaker className="w-4 h-4 text-emerald-600" />
                                        <label className="text-[11px] font-black uppercase text-charcoal/80">Insumos y Materiales</label>
                                    </div>
                                    <input 
                                        type="text"
                                        value={metadata.dental_gen?.materials_used}
                                        onChange={(e) => setMetadata({ ...metadata, dental_gen: { ...metadata.dental_gen, materials_used: e.target.value } })}
                                        className="input-soft w-full h-12 font-bold text-xs"
                                        placeholder="Ej: Resina Z350, Adhesivo Singlebond..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orthodontic Specific Section */}
                    {recordType === 'ortho' && (
                        <div className="space-y-8 p-6 bg-primary-50/30 rounded-softer border border-primary-100 animate-slide-up">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-primary-600" />
                                <h3 className="font-black text-charcoal uppercase tracking-tighter">Control de Ortodoncia</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-charcoal/40 mb-2">Fase de Tratamiento</label>
                                    <select 
                                        value={metadata.ortho?.phase}
                                        onChange={(e) => setMetadata({ ...metadata, ortho: { ...metadata.ortho, phase: e.target.value } })}
                                        className="input-soft w-full h-12 font-bold"
                                    >
                                        <option value="">Seleccionar Fase...</option>
                                        {ORTHO_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-charcoal/40 mb-2">Higiene del Paciente</label>
                                    <div className="flex gap-2">
                                        {['mala', 'regular', 'buena', 'excelente'].map(h => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => setMetadata({ ...metadata, ortho: { ...metadata.ortho, hygiene: h } })}
                                                className={cn(
                                                    "flex-1 py-2 text-[10px] font-black uppercase rounded-full border transition-all",
                                                    metadata.ortho?.hygiene === h ? "bg-primary-600 text-white border-primary-600" : "bg-white text-charcoal/40 border-silk-beige"
                                                )}
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-charcoal/40 mb-2">Arco Superior</label>
                                    <input 
                                        type="text"
                                        value={metadata.ortho?.upper_archwire}
                                        onChange={(e) => setMetadata({ ...metadata, ortho: { ...metadata.ortho, upper_archwire: e.target.value } })}
                                        className="input-soft w-full h-12 font-bold"
                                        placeholder="Ej: .016 NiTi"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-charcoal/40 mb-2">Arco Inferior</label>
                                    <input 
                                        type="text"
                                        value={metadata.ortho?.lower_archwire}
                                        onChange={(e) => setMetadata({ ...metadata, ortho: { ...metadata.ortho, lower_archwire: e.target.value } })}
                                        className="input-soft w-full h-12 font-bold"
                                        placeholder="Ej: .014 CuNiTi"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-charcoal/40 mb-2">Clase Molar (Angle)</label>
                                    <select 
                                        value={metadata.ortho?.angle_class_molar}
                                        onChange={(e) => setMetadata({ ...metadata, ortho: { ...metadata.ortho, angle_class_molar: e.target.value } })}
                                        className="input-soft w-full h-12 font-bold"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {ANGLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-charcoal/40 mb-2">Configuración Elásticos</label>
                                    <input 
                                        type="text"
                                        value={metadata.ortho?.elastics}
                                        onChange={(e) => setMetadata({ ...metadata, ortho: { ...metadata.ortho, elastics: e.target.value } })}
                                        className="input-soft w-full h-12 font-bold"
                                        placeholder="Ej: Clase II 1/4 4.5oz"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {/* Technical Description */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 border-l-4 border-charcoal pl-3">
                                <h3 className="text-[11px] font-black uppercase text-charcoal tracking-widest">Descripción Técnica / Protocolo</h3>
                            </div>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input-soft w-full min-h-[140px] p-4 text-sm font-medium border-charcoal/30 focus:border-primary-500"
                                placeholder="Escribe aquí los pasos realizados hoy..."
                            />
                        </div>

                        {/* Photo Upload - More Premium Look */}
                        <div className="p-8 bg-ivory/50 rounded-softer border border-dashed border-silk-beige flex flex-col items-center">
                            <Layers className="w-8 h-8 text-charcoal/10 mb-4" />
                            <PhotoUpload
                                selectedFile={photoFile}
                                onFileSelect={setPhotoFile}
                                onClear={() => setPhotoFile(null)}
                            />
                            <p className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest mt-4">Evidencia Clínica Obligatoria</p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-charcoal/40 tracking-widest mb-3 border-l-4 border-primary-500 pl-3">Notas Internas Reservadas</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="input-soft w-full min-h-[100px] p-6 font-medium bg-secondary-50/10"
                                placeholder="Observaciones privadas sobre el paciente..."
                            />
                        </div>
                    </div>
                </form>

                <div className="p-8 border-t border-silk-beige flex justify-end gap-3 bg-white rounded-b-softer shadow-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-4 text-xs font-black uppercase tracking-widest text-charcoal/40 hover:text-charcoal transition-all"
                        disabled={loading}
                    >
                        Descartar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary px-10 py-4 flex items-center gap-3 shadow-2xl shadow-primary-500/20"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> PROCESANDO...</>
                        ) : (
                            <><ShieldCheck className="w-5 h-5" /> GUARDAR EN HISTORIAL</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

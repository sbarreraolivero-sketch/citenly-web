import { useState, useEffect } from 'react'
import {
    Phone, Mail, MapPin, Calendar,
    FileText, Plus, Edit2, Trash2, ArrowLeft,
    StickyNote, Check, Image as ImageIcon, ArrowLeftRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { formatPhoneNumber } from '@/lib/utils'
import { ClinicalRecordForm, ClinicalRecord } from './ClinicalRecordForm'
import { ComparisonView } from './ComparisonView'
import { suggestTags } from '@/lib/autoTagService'

type Patient = Database['public']['Tables']['patients']['Row']

interface Tag {
    id: string
    name: string
    color: string
}

interface PatientDetailsProps {
    patient: Patient
    onBack: () => void
    onUpdate: () => Promise<void> | void
}

export function PatientDetails({ patient, onBack, onUpdate }: PatientDetailsProps) {
    const { profile } = useAuth()
    const [activeTab, setActiveTab] = useState<'info' | 'history' | 'gallery'>('history')
    const [records, setRecords] = useState<ClinicalRecord[]>([])
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

    // Tag state
    const [patientTags, setPatientTags] = useState<Tag[]>([])
    const [availableTags, setAvailableTags] = useState<Tag[]>([])
    const [suggestedTags, setSuggestedTags] = useState<Tag[]>([])
    const [showTagSelector, setShowTagSelector] = useState(false)

    // Modal state for records
    const [showRecordForm, setShowRecordForm] = useState(false)
    const [editingRecord, setEditingRecord] = useState<ClinicalRecord | null>(null)

    // Notes editing state
    const [isEditingNotes, setIsEditingNotes] = useState(false)
    const [notesBuffer, setNotesBuffer] = useState(patient.notes || '')
    const [savingNotes, setSavingNotes] = useState(false)

    // Comparison state
    const [comparisonMode, setComparisonMode] = useState(false)
    const [selectedImages, setSelectedImages] = useState<string[]>([])
    const [showComparison, setShowComparison] = useState(false)

    // Ensure we scroll to top when opening details
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    // Sync notes buffer when patient prop updates (important for post-save update)
    useEffect(() => {
        setNotesBuffer(patient.notes || '')
    }, [patient.notes])

    useEffect(() => {
        if (profile?.clinic_id) {
            fetchTags()
        }
    }, [profile?.clinic_id, patient.id])

    const fetchTags = async () => {
        if (!profile?.clinic_id) return
        try {
            // Fetch all available tags for the clinic
            const { data: allTags } = await supabase
                .from('tags')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .order('name')

            if (allTags) setAvailableTags(allTags)

            // Fetch tags assigned to this patient
            const { data: pTags } = await supabase
                .from('patient_tags')
                .select('tag_id, tags(*)')
                .eq('patient_id', patient.id)

            if (pTags) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setPatientTags(pTags.map((pt: any) => pt.tags))
            }
        } catch (error) {
            console.error('Error fetching tags:', error)
        }
    }

    const handleToggleTag = async (tag: Tag) => {
        if (!profile?.clinic_id) return

        const isAssigned = patientTags.some(t => t.id === tag.id)

        try {
            if (isAssigned) {
                // Remove tag
                const { error } = await supabase
                    .from('patient_tags')
                    .delete()
                    .eq('patient_id', patient.id)
                    .eq('tag_id', tag.id)

                if (error) throw error
                setPatientTags(patientTags.filter(t => t.id !== tag.id))
            } else {
                // Add tag
                const { error } = await supabase
                    .from('patient_tags')
                    .insert({
                        patient_id: patient.id,
                        tag_id: tag.id
                    } as any)

                if (error) throw error
                setPatientTags([...patientTags, tag])
            }
            // Notify parent to update list view if needed
            if (onUpdate) await onUpdate()
        } catch (error) {
            console.error('Error toggling tag:', error)
            alert('Error al actualizar etiqueta')
        }
    }

    const fetchRecords = async () => {
        if (!profile?.clinic_id || !patient.id) return

        setLoadingRecords(true)
        try {
            const { data, error } = await supabase
                .from('clinical_records')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .eq('patient_id', patient.id)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error

            // Cast data to expected type since inference might fail locally
            const typedData = (data || []) as unknown as ClinicalRecord[]
            setRecords(typedData)

            // Generate signed URLs for all images
            const urls: Record<string, string> = {}
            if (typedData) {
                for (const record of typedData) {
                    if (record.attachments && Array.isArray(record.attachments)) {
                        for (const att of record.attachments) {
                            if (att.path && att.type === 'image') {
                                const { data: signedData } = await supabase.storage
                                    .from('clinical-photos')
                                    .createSignedUrl(att.path, 3600) // 1 hour expiry

                                if (signedData?.signedUrl) {
                                    urls[att.path] = signedData.signedUrl
                                }
                            }
                        }
                    }
                }
            }
            setSignedUrls(prev => ({ ...prev, ...urls }))

        } catch (error) {
            console.error('Error fetching clinical records:', error)
        } finally {
            setLoadingRecords(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'history' || activeTab === 'gallery') {
            fetchRecords()
        }
    }, [activeTab, patient.id])

    // Compute suggested tags whenever dependencies change
    useEffect(() => {
        if (availableTags.length > 0) {
            console.log('Computing suggestions...', { patient, records: records.length, available: availableTags.map(t => t.name) })
            const suggestions = suggestTags(patient, records, patientTags, availableTags)
            console.log('Suggestions computed:', suggestions)
            setSuggestedTags(suggestions)
        } else {
            console.log('No available tags to compute suggestions')
        }
    }, [patient, records, patientTags, availableTags])

    const handleDeleteRecord = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este registro histórico?')) return

        try {
            const { error } = await supabase
                .from('clinical_records')
                .delete()
                .eq('id', id)

            if (error) throw error
            setRecords(records.filter(r => r.id !== id))
        } catch (error) {
            console.error('Error deleting record:', error)
            alert('Error al eliminar el registro')
        }
    }

    const handleSaveNotes = async () => {
        setSavingNotes(true)
        try {
            const { error } = await (supabase
                .from('patients') as any)
                .update({ notes: notesBuffer })
                .eq('id', patient.id)

            if (error) throw error

            // Notify parent to update data and WAIT for it
            if (onUpdate) await onUpdate()
            setIsEditingNotes(false)
        } catch (error) {
            console.error('Error updating notes:', error)
            alert('Error al guardar las notas')
        } finally {
            setSavingNotes(false)
        }
    }

    const toggleImageSelection = (path: string) => {
        if (selectedImages.includes(path)) {
            setSelectedImages(selectedImages.filter(p => p !== path))
        } else {
            if (selectedImages.length >= 2) {
                // Remove the first one and add new one (FIFO) or just block? 
                // FIFO feels better for quick switching
                setSelectedImages([...selectedImages.slice(1), path])
            } else {
                setSelectedImages([...selectedImages, path])
            }
        }
    }

    // Prepare gallery images
    const allImages = records.flatMap(r =>
        (r.attachments || [])
            .filter((a: any) => a.type === 'image')
            .map((a: any) => ({
                ...a,
                recordDate: r.date,
                treatment: r.treatment_name,
                url: signedUrls[a.path]
            }))
    ).filter(img => img.url)

    return (
        <div className="space-y-6 animate-fade-in relative pb-20">
            {/* Header / Navigation */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-silk-beige rounded-full text-charcoal/60 hover:text-charcoal transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-charcoal">{patient.name}</h1>
                        <p className="text-charcoal/60 text-sm">Ficha Clínica Digital</p>
                    </div>
                </div>

                {/* Tags Section */}
                <div className="flex flex-wrap items-center gap-2 pl-12">
                    {patientTags.map(tag => (
                        <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1"
                            style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                                borderColor: `${tag.color}40`
                            }}
                        >
                            {tag.name}
                        </span>
                    ))}

                    <div className="relative">
                        <button
                            onClick={() => setShowTagSelector(!showTagSelector)}
                            className="px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-charcoal/30 text-charcoal/60 hover:bg-silk-beige/50 hover:text-charcoal flex items-center gap-1 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                            Etiquetar
                        </button>

                        {showTagSelector && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowTagSelector(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-soft shadow-premium border border-silk-beige z-20 overflow-hidden animate-fade-in">
                                    <div className="p-2 border-b border-silk-beige bg-ivory/50">
                                        <p className="text-xs font-medium text-charcoal/60 uppercase">Asignar Etiqueta</p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto p-1">
                                        {availableTags.length === 0 ? (
                                            <p className="text-xs text-charcoal/40 p-2 text-center">No hay etiquetas creadas. Ve a Configuración para crear una.</p>
                                        ) : (
                                            availableTags.map(tag => {
                                                const isSelected = patientTags.some(t => t.id === tag.id)
                                                return (
                                                    <button
                                                        key={tag.id}
                                                        onClick={() => handleToggleTag(tag)}
                                                        className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 flex items-center justify-between group"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: tag.color }}
                                                            />
                                                            <span className={`text-sm ${isSelected ? 'font-medium text-charcoal' : 'text-charcoal/80'}`}>
                                                                {tag.name}
                                                            </span>
                                                        </div>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-primary-600" />}
                                                    </button>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Suggested Tags */}
                    {suggestedTags.length > 0 && (
                        <div className="flex items-center gap-2 ml-4 border-l border-silk-beige pl-4 animate-fade-in">
                            <span className="text-xs text-charcoal/40 italic">Sugerencias:</span>
                            {suggestedTags.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => handleToggleTag(tag)}
                                    className="px-2 py-0.5 rounded-full text-xs font-medium border border-dashed hover:border-solid hover:bg-opacity-20 transition-all flex items-center gap-1 opacity-70 hover:opacity-100"
                                    style={{
                                        borderColor: tag.color,
                                        color: tag.color,
                                        backgroundColor: `${tag.color}10`
                                    }}
                                    title="Clic para asignar"
                                >
                                    + {tag.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats / Info Card */}
            <div className="card-soft p-6 bg-white shadow-sm border border-silk-beige">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-charcoal/50 uppercase font-medium">Teléfono</p>
                            <p className="text-charcoal">{formatPhoneNumber(patient.phone_number)}</p>
                        </div>
                    </div>
                    {patient.email && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-silk-beige flex items-center justify-center text-charcoal/60">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-charcoal/50 uppercase font-medium">Email</p>
                                <p className="text-charcoal">{patient.email}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-silk-beige flex items-center justify-center text-charcoal/60">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-charcoal/50 uppercase font-medium">Última Visita</p>
                            <p className="text-charcoal">
                                {patient.last_appointment_at
                                    ? new Date(patient.last_appointment_at).toLocaleDateString()
                                    : 'Sin visitas registradas'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-silk-beige">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'info'
                            ? 'text-primary-600'
                            : 'text-charcoal/60 hover:text-charcoal'
                            }`}
                    >
                        Información Personal
                        {activeTab === 'info' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'history'
                            ? 'text-primary-600'
                            : 'text-charcoal/60 hover:text-charcoal'
                            }`}
                    >
                        Historial Clínico
                        {activeTab === 'history' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'gallery'
                            ? 'text-primary-600'
                            : 'text-charcoal/60 hover:text-charcoal'
                            }`}
                    >
                        Galería
                        {activeTab === 'gallery' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="bg-white p-6 rounded-soft border border-silk-beige space-y-4">
                            <h3 className="font-medium text-charcoal mb-4">Datos de Contacto</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-charcoal/50 uppercase font-medium">Dirección</label>
                                    <div className="flex items-start gap-2 mt-1">
                                        <MapPin className="w-4 h-4 text-charcoal/40 mt-0.5" />
                                        <p className="text-charcoal">{patient.address || 'No especificada'}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-charcoal/50 uppercase font-medium">Servicio de Interés</label>
                                    <p className="text-charcoal mt-1">{patient.service || 'No especificado'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-soft border border-silk-beige space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-medium text-charcoal">Notas Generales</h3>
                                {!isEditingNotes && (
                                    <button
                                        onClick={() => {
                                            setNotesBuffer(patient.notes || '')
                                            setIsEditingNotes(true)
                                        }}
                                        className="p-1.5 hover:bg-silk-beige rounded text-charcoal/60 transition-colors"
                                        title="Editar notas"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {isEditingNotes ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={notesBuffer}
                                        onChange={(e) => setNotesBuffer(e.target.value)}
                                        className="w-full min-h-[120px] p-3 rounded-soft border border-silk-beige bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none text-sm text-charcoal"
                                        placeholder="Escribe notas importantes sobre el paciente..."
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setIsEditingNotes(false)}
                                            className="px-3 py-1.5 text-xs font-medium text-charcoal/60 hover:text-charcoal hover:bg-silk-beige/50 rounded transition-colors"
                                            disabled={savingNotes}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveNotes}
                                            disabled={savingNotes}
                                            className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors flex items-center gap-1"
                                        >
                                            {savingNotes ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-ivory/50 p-4 rounded-soft border border-silk-beige/50 min-h-[100px]">
                                    {patient.notes ? (
                                        <p className="text-charcoal whitespace-pre-wrap">{patient.notes}</p>
                                    ) : (
                                        <p className="text-charcoal/40 italic">Sin notas generales</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-charcoal">Historial de Tratamientos</h3>
                            <button
                                onClick={() => {
                                    setEditingRecord(null)
                                    setShowRecordForm(true)
                                }}
                                className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Registro
                            </button>
                        </div>
                        {loadingRecords ? (
                            <div className="text-center py-12">
                                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p className="text-charcoal/50">Cargando historial...</p>
                            </div>
                        ) : records.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-soft border border-dashed border-silk-beige">
                                <div className="w-12 h-12 bg-silk-beige/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FileText className="w-6 h-6 text-charcoal/40" />
                                </div>
                                <h3 className="text-charcoal font-medium">Sin historial clínico</h3>
                                <p className="text-charcoal/60 text-sm mt-1">Crea el primer registro para este paciente</p>
                                <button
                                    onClick={() => {
                                        setEditingRecord(null)
                                        setShowRecordForm(true)
                                    }}
                                    className="btn-secondary mt-4"
                                >
                                    Crear Registro
                                </button>
                            </div>
                        ) : (
                            <div className="relative pl-8 border-l-2 border-silk-beige space-y-8">
                                {records.map((record) => (
                                    <div key={record.id} className="relative">
                                        {/* Timeline dot */}
                                        <div className="absolute -left-[39px] top-0 w-5 h-5 rounded-full bg-primary-100 border-2 border-white shadow-sm flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-primary-600" />
                                        </div>

                                        <div className="card-soft p-5 hover:shadow-premium transition-shadow group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                                                            {new Date(record.date).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-sm font-semibold text-charcoal">
                                                            {record.treatment_name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingRecord(record)
                                                            setShowRecordForm(true)
                                                        }}
                                                        className="p-1.5 hover:bg-silk-beige rounded transition-colors text-charcoal/60"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRecord(record.id)}
                                                        className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded transition-colors text-charcoal/60"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {record.description && (
                                                <p className="text-charcoal/80 text-sm mb-3 whitespace-pre-wrap">
                                                    {record.description}
                                                </p>
                                            )}

                                            {/* Images in timeline */}
                                            {record.attachments && record.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3 mb-3">
                                                    {record.attachments.map((att: any, idx: number) => {
                                                        const url = signedUrls[att.path]
                                                        if (!url) return null
                                                        return (
                                                            <div key={idx} className="w-20 h-20 rounded overflow-hidden border border-silk-beige relative group/img cursor-pointer">
                                                                <img
                                                                    src={url}
                                                                    alt={att.name}
                                                                    className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {record.notes && (
                                                <div className="mt-2 pt-2 border-t border-silk-beige/50">
                                                    <p className="text-xs text-charcoal/50 italic flex items-center gap-1.5">
                                                        <StickyNote className="w-3 h-3" />
                                                        {record.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'gallery' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-medium text-charcoal">Galería Clínica</h3>
                                <p className="text-sm text-charcoal/60">
                                    {allImages.length} fotos registradas
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setComparisonMode(!comparisonMode)
                                        setSelectedImages([])
                                    }}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${comparisonMode
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-white border border-silk-beige text-charcoal/70 hover:bg-silk-beige'
                                        }`}
                                >
                                    <ArrowLeftRight className="w-4 h-4" />
                                    {comparisonMode ? 'Cancelar Comparación' : 'Comparar Antes/Después'}
                                </button>
                            </div>
                        </div>

                        {allImages.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-soft border border-dashed border-silk-beige">
                                <div className="w-12 h-12 bg-silk-beige/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <ImageIcon className="w-6 h-6 text-charcoal/40" />
                                </div>
                                <h3 className="text-charcoal font-medium">Sin fotos clínicas</h3>
                                <p className="text-charcoal/60 text-sm mt-1">Sube fotos al crear un registro clínico</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {allImages.map((img, idx) => {
                                    const isSelected = selectedImages.includes(img.path)
                                    return (
                                        <div
                                            key={idx}
                                            className={`aspect-square rounded-soft overflow-hidden border relative group cursor-pointer shadow-sm hover:shadow-md transition-all ${isSelected ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2' : 'border-silk-beige'
                                                }`}
                                            onClick={() => {
                                                if (comparisonMode) toggleImageSelection(img.path)
                                            }}
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.name}
                                                className={`w-full h-full object-cover transition-transform duration-500 ${!comparisonMode && 'group-hover:scale-110'
                                                    }`}
                                            />

                                            {/* Selection Overlay */}
                                            {comparisonMode && (
                                                <div className={`absolute inset-0 bg-black/20 transition-opacity flex items-center justify-center ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-white bg-black/30'
                                                        }`}>
                                                        {isSelected && <Check className="w-5 h-5" />}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                                                <p className="text-white text-xs font-medium truncate">{img.treatment}</p>
                                                <p className="text-white/80 text-[10px]">{new Date(img.recordDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Comparison Floating Button */}
                        {comparisonMode && selectedImages.length === 2 && (
                            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 animate-fade-in-up">
                                <button
                                    onClick={() => setShowComparison(true)}
                                    className="btn-primary shadow-xl flex items-center gap-2 px-6 py-3 rounded-full"
                                >
                                    <ArrowLeftRight className="w-5 h-5" />
                                    Comparar Imágenes
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showComparison && selectedImages.length === 2 && (
                <ComparisonView
                    beforeImage={allImages.find(img => img.path === selectedImages[0])!}
                    afterImage={allImages.find(img => img.path === selectedImages[1])!}
                    onClose={() => setShowComparison(false)}
                />
            )}

            {showRecordForm && (
                <ClinicalRecordForm
                    patientId={patient.id}
                    record={editingRecord}
                    onClose={() => {
                        setShowRecordForm(false)
                        setEditingRecord(null)
                    }}
                    onSave={() => {
                        fetchRecords()
                    }}
                />
            )}
        </div>
    )
}

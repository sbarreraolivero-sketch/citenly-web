    Phone, MapPin,
    FileText, Plus, Edit2, Trash2,
    StickyNote, Check, Image as ImageIcon, ArrowLeftRight,
    Activity, DollarSign, ShieldAlert, Pill
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { formatPhoneNumber, cn } from '@/lib/utils'
import { ClinicalRecordForm, ClinicalRecord } from './ClinicalRecordForm'
import { ComparisonView } from './ComparisonView'
import { suggestTags } from '@/lib/autoTagService'
import { Odontogram } from './Odontogram'
import { BudgetManager } from './BudgetManager'
import { PatientSecurityHeader } from './PatientSecurityHeader'

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
    onEdit?: (patient: Patient) => void
}

export function PatientDetails({ patient, onBack, onUpdate }: PatientDetailsProps) {
    const { profile } = useAuth()
    const [activeTab, setActiveTab] = useState<'info' | 'history' | 'gallery' | 'odontogram' | 'budgets'>('history')
    const [specialty, setSpecialty] = useState<'aesthetic' | 'dental' | 'general'>('aesthetic')
    const [records, setRecords] = useState<ClinicalRecord[]>([])
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
    const [pendingTreatments, setPendingTreatments] = useState<any[]>([])
    const [financialSummary, setFinancialSummary] = useState({ total: 0, paid: 0, balance: 0 })

    // Tag state
    const [patientTags, setPatientTags] = useState<Tag[]>([])
    const [availableTags, setAvailableTags] = useState<Tag[]>([])
    const [suggestedTags, setSuggestedTags] = useState<Tag[]>([])
    const [showTagSelector, setShowTagSelector] = useState(false)

    // Inline Editing states
    const [isEditingInfo, setIsEditingInfo] = useState(false)
    const [infoForm, setInfoForm] = useState({
        name: patient.name || '',
        rut: patient.rut || '',
        email: patient.email || '',
        address: patient.address || '',
        gender: patient.gender || '',
        insurance_provider: patient.insurance_provider || '',
        internal_id: patient.internal_id || '',
        birth_date: patient.birth_date || ''
    })
    const [savingInfo, setSavingInfo] = useState(false)

    const [isEditingSecurity, setIsEditingSecurity] = useState(false)
    const [securityForm, setSecurityForm] = useState({
        is_high_risk: patient.is_high_risk || false,
        allergies: patient.allergies || '',
        medical_history: patient.medical_history || ''
    })
    const [savingSecurity, setSavingSecurity] = useState(false)

    // Modal state for records
    const [showRecordForm, setShowRecordForm] = useState(false)
    const [editingRecord, setEditingRecord] = useState<ClinicalRecord | null>(null)
    const [prefilledRecordData, setPrefilledRecordData] = useState<any>(null)

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

    // Sync buffers when patient prop updates
    useEffect(() => {
        setNotesBuffer(patient.notes || '')
        setInfoForm({
            name: patient.name || '',
            rut: patient.rut || '',
            email: patient.email || '',
            address: patient.address || '',
            gender: patient.gender || '',
            insurance_provider: patient.insurance_provider || '',
            internal_id: patient.internal_id || '',
            birth_date: patient.birth_date || ''
        })
        setSecurityForm({
            is_high_risk: patient.is_high_risk || false,
            allergies: patient.allergies || '',
            medical_history: patient.medical_history || ''
        })
    }, [patient])

    const handleSaveInfo = async () => {
        setSavingInfo(true)
        try {
            const { error } = await supabase
                .from('patients')
                .update(infoForm as any)
                .eq('id', patient.id)
            
            if (error) throw error
            if (onUpdate) await (onUpdate as any)()
            setIsEditingInfo(false)
        } catch (error) {
            console.error('Error updating info:', error)
            toast.error('Error al actualizar información')
        } finally {
            setSavingInfo(false)
        }
    }

    const handleSaveSecurity = async () => {
        setSavingSecurity(true)
        try {
            const { error } = await supabase
                .from('patients')
                .update(securityForm as any)
                .eq('id', patient.id)
            
            if (error) throw error
            toast.success('Seguridad clínica actualizada')
            if (onUpdate) await (onUpdate as any)()
            setIsEditingSecurity(false)
        } catch (error) {
            console.error('Error updating security:', error)
            toast.error('Error al actualizar seguridad')
        } finally {
            setSavingSecurity(false)
        }
    }

    useEffect(() => {
        if (profile?.clinic_id) {
            fetchTags()
            fetchClinicSettings()
        }
    }, [profile?.clinic_id, patient.id])

    const fetchClinicSettings = async () => {
        if (!profile?.clinic_id) return
        try {
            const { data } = await (supabase as any)
                .from('clinic_settings')
                .select('specialty')
                .eq('id', profile.clinic_id)
                .single()
            
            if (data && (data as any).specialty) {
                setSpecialty((data as any).specialty as any)
            }
        } catch (error) {
            console.error('Error fetching clinic specialty:', error)
        }
    }

    const fetchTags = async () => {
        if (!profile?.clinic_id) return
        try {
            const { data: allTags } = await supabase
                .from('tags')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .order('name')

            if (allTags) setAvailableTags(allTags)

            const { data: pTags } = await supabase
                .from('patient_tags')
                .select('tag_id, tags(*)')
                .eq('patient_id', patient.id)

            if (pTags) {
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
                const { error } = await supabase
                    .from('patient_tags')
                    .delete()
                    .eq('patient_id', patient.id)
                    .eq('tag_id', tag.id)

                if (error) throw error
                setPatientTags(patientTags.filter(t => t.id !== tag.id))
            } else {
                const { error } = await supabase
                    .from('patient_tags')
                    .insert({
                        patient_id: patient.id,
                        tag_id: tag.id
                    } as any)

                if (error) throw error
                setPatientTags([...patientTags, tag])
            }
            if (onUpdate) await (onUpdate as any)()
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

            const typedData = (data || []) as unknown as ClinicalRecord[]
            setRecords(typedData)

            const urls: Record<string, string> = {}
            if (typedData) {
                for (const record of typedData) {
                    if (record.attachments && Array.isArray(record.attachments)) {
                        for (const att of record.attachments) {
                            if (att.path && att.type === 'image') {
                                const { data: signedData } = await supabase.storage
                                    .from('clinical-photos')
                                    .createSignedUrl(att.path, 3600)

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

    const fetchFinancialData = async () => {
        if (!patient.id) return
        try {
            const { data } = await supabase
                .from('dental_budgets')
                .select('total_amount, paid_amount')
                .eq('patient_id', patient.id)
                .neq('status', 'cancelled')

            if (data) {
                const total = (data as any[]).reduce((acc, b) => acc + (b.total_amount || 0), 0)
                const paid = (data as any[]).reduce((acc, b) => acc + (b.paid_amount || 0), 0)
                setFinancialSummary({
                    total,
                    paid,
                    balance: total - paid
                })
            }
        } catch (err) {
            console.error('Error fetching financial data:', err)
        }
    }

    useEffect(() => {
        if (activeTab === 'history' || activeTab === 'gallery' || activeTab === 'info') {
            fetchRecords()
            fetchFinancialData()
        }
    }, [activeTab, patient.id])

    // Compute suggested tags whenever dependencies change
    useEffect(() => {
        if (availableTags.length > 0) {
            const suggestions = suggestTags(patient, records as any, patientTags, availableTags)
            setSuggestedTags(suggestions)
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
            const { error } = await supabase
                .from('patients')
                .update({ notes: notesBuffer } as any)
                .eq('id', patient.id)

            if (onUpdate) await (onUpdate as any)()
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
                setSelectedImages([...selectedImages.slice(1), path])
            } else {
                setSelectedImages([...selectedImages, path])
            }
        }
    }

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

    // copyReferralLink removed as it was unused in JSX

    return (
        <div className="space-y-6 animate-fade-in relative pb-20">
            {/* Clinical Security Header (Sticky & Consolidated) */}
            <PatientSecurityHeader 
                patient={patient} 
                financialSummary={financialSummary} 
                onBack={onBack}
                patientTags={patientTags}
                availableTags={availableTags}
                onToggleTag={handleToggleTag}
                showTagSelector={showTagSelector}
                setShowTagSelector={setShowTagSelector}
                suggestedTags={suggestedTags}
            />

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
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full"></div>
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
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full"></div>
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
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full"></div>
                        )}
                    </button>

                    {specialty === 'dental' && (
                        <>
                            <button
                                onClick={() => setActiveTab('odontogram')}
                                className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'odontogram'
                                    ? 'text-primary-600'
                                    : 'text-charcoal/60 hover:text-charcoal'
                                    }`}
                            >
                                <div className="flex items-center gap-1.5">
                                    <Activity className="w-4 h-4" />
                                    Odontograma
                                </div>
                                {activeTab === 'odontogram' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full"></div>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('budgets')}
                                className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'budgets'
                                    ? 'text-primary-600'
                                    : 'text-charcoal/60 hover:text-charcoal'
                                    }`}
                            >
                                <div className="flex items-center gap-1.5 justify-center relative">
                                    <DollarSign className="w-4 h-4" />
                                    Presupuestos
                                    {pendingTreatments.length > 0 && (
                                        <span className="absolute -top-1 -right-4 w-4 h-4 bg-primary-600 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">
                                            {pendingTreatments.length}
                                        </span>
                                    )}
                                </div>
                                {activeTab === 'budgets' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full"></div>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Tab: Personal Info (Refactored Layout) */}
            <div className="min-h-[400px]">
                {activeTab === 'info' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 1. Datos de Contacto Card (Editable) */}
                            <div className="card-soft p-6 shadow-md border-silk-beige-dark relative">
                                <div className="flex justify-between items-center mb-6 border-b border-silk-beige pb-2">
                                    <h3 className="font-black text-charcoal uppercase tracking-tight text-sm">Datos de Contacto</h3>
                                    {!isEditingInfo ? (
                                        <button 
                                            onClick={() => setIsEditingInfo(true)}
                                            className="p-1.5 hover:bg-silk-beige rounded-full text-charcoal/40 hover:text-primary-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setIsEditingInfo(false)}
                                                className="text-xs font-bold text-charcoal/40 hover:text-charcoal px-2 py-1"
                                                disabled={savingInfo}
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleSaveInfo}
                                                className="text-xs font-black text-primary-600 hover:text-primary-700 px-2 py-1 bg-primary-50 rounded"
                                                disabled={savingInfo}
                                            >
                                                {savingInfo ? '...' : 'Guardar'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] text-charcoal/50 uppercase font-black tracking-widest block mb-1">Nombre Completo</label>
                                            {isEditingInfo ? (
                                                <input 
                                                    type="text" 
                                                    value={infoForm.name}
                                                    onChange={e => setInfoForm({...infoForm, name: e.target.value})}
                                                    className="input-soft w-full text-sm py-1 px-2"
                                                />
                                            ) : (
                                                <p className="text-charcoal font-bold">{patient.name || '---'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-charcoal/50 uppercase font-black tracking-widest block mb-1">RUT</label>
                                            {isEditingInfo ? (
                                                <input 
                                                    type="text" 
                                                    value={infoForm.rut}
                                                    onChange={e => setInfoForm({...infoForm, rut: e.target.value})}
                                                    className="input-soft w-full text-sm py-1 px-2"
                                                />
                                            ) : (
                                                <p className="text-charcoal font-bold">{patient.rut || '---'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] text-charcoal/50 uppercase font-black tracking-widest block mb-1">Email</label>
                                            {isEditingInfo ? (
                                                <input 
                                                    type="email" 
                                                    value={infoForm.email}
                                                    onChange={e => setInfoForm({...infoForm, email: e.target.value})}
                                                    className="input-soft w-full text-sm py-1 px-2"
                                                />
                                            ) : (
                                                <p className="text-charcoal font-bold truncate">{patient.email || '---'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-charcoal/50 uppercase font-black tracking-widest block mb-1">Teléfono (No editable)</label>
                                            <div className="flex items-center gap-2 text-charcoal/40 font-bold">
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>{formatPhoneNumber(patient.phone_number)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-charcoal/50 uppercase font-black tracking-widest block mb-1">Dirección</label>
                                        {isEditingInfo ? (
                                            <input 
                                                type="text" 
                                                value={infoForm.address}
                                                onChange={e => setInfoForm({...infoForm, address: e.target.value})}
                                                className="input-soft w-full text-sm py-1 px-2"
                                            />
                                        ) : (
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-4 h-4 text-charcoal/30 mt-0.5" />
                                                <p className="text-charcoal font-bold">{patient.address || 'No especificada'}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] text-charcoal/50 uppercase font-black tracking-widest block mb-1">Género</label>
                                            {isEditingInfo ? (
                                                <select 
                                                    value={infoForm.gender}
                                                    onChange={e => setInfoForm({...infoForm, gender: e.target.value})}
                                                    className="input-soft w-full text-xs py-1 px-2"
                                                >
                                                    <option value="">Seleccionar</option>
                                                    <option value="Femenino">Femenino</option>
                                                    <option value="Masculino">Masculino</option>
                                                    <option value="Otro">Otro</option>
                                                </select>
                                            ) : (
                                                <p className="text-charcoal font-bold">{patient.gender || '---'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-charcoal/50 uppercase font-black tracking-widest block mb-1">ID Clínico / Convenio</label>
                                            {isEditingInfo ? (
                                                <input 
                                                    type="text" 
                                                    value={infoForm.insurance_provider}
                                                    onChange={(e) => setInfoForm({...infoForm, insurance_provider: e.target.value})}
                                                    className="input-soft w-full text-sm py-1 px-2"
                                                    placeholder="Ej: Particular / Isapre"
                                                />
                                            ) : (
                                                <p className="text-charcoal font-bold">{patient.insurance_provider || '---'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Seguridad Clínica Card (Editable, Replaces old Notes) */}
                            <div className={cn(
                                "card-soft p-6 shadow-md transition-all relative border-2",
                                patient.is_high_risk ? "bg-red-50 border-red-200" : "bg-white border-silk-beige"
                            )}>
                                <div className="flex justify-between items-center mb-6 border-b border-black/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-charcoal uppercase tracking-tight text-sm">Seguridad Clínica</h3>
                                        {patient.is_high_risk && <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">ALTO RIESGO</span>}
                                    </div>
                                    {!isEditingSecurity ? (
                                        <button 
                                            onClick={() => setIsEditingSecurity(true)}
                                            className="p-1.5 hover:bg-black/5 rounded-full text-charcoal/40 hover:text-primary-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setIsEditingSecurity(false)}
                                                className="text-xs font-bold text-charcoal/40 hover:text-charcoal px-2 py-1"
                                                disabled={savingSecurity}
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleSaveSecurity}
                                                className="text-xs font-black text-primary-600 hover:text-primary-700 px-2 py-1 bg-primary-50 rounded"
                                                disabled={savingSecurity}
                                            >
                                                {savingSecurity ? '...' : 'Guardar'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-black/5 p-3 rounded-soft">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert className={cn("w-5 h-5", securityForm.is_high_risk ? "text-red-600" : "text-charcoal/30")} />
                                            <div>
                                                <p className="text-[11px] font-black uppercase text-charcoal/60 leading-none">Alerta Médica de Riesgo</p>
                                                <p className="text-[10px] font-bold text-charcoal/40 mt-1">Activar esta alerta marcará al paciente como Crítico.</p>
                                            </div>
                                        </div>
                                        <button
                                            disabled={!isEditingSecurity}
                                            onClick={() => setSecurityForm({...securityForm, is_high_risk: !securityForm.is_high_risk})}
                                            className={cn(
                                                "w-12 h-6 rounded-full p-1 transition-all",
                                                !isEditingSecurity ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                                                securityForm.is_high_risk ? "bg-red-600 border border-red-700" : "bg-charcoal/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 bg-white rounded-full shadow-sm transition-all transform",
                                                securityForm.is_high_risk ? "translate-x-6" : "translate-x-0"
                                            )}></div>
                                        </button>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Activity className="w-4 h-4 text-amber-600" />
                                            <label className="text-[11px] text-charcoal/70 uppercase font-black tracking-widest">Alergias</label>
                                        </div>
                                        {isEditingSecurity ? (
                                            <textarea 
                                                value={securityForm.allergies}
                                                onChange={e => setSecurityForm({...securityForm, allergies: e.target.value})}
                                                className="input-soft w-full text-xs p-2 min-h-[60px] resize-none"
                                                placeholder="Ej: Penicilina, Látex..."
                                            />
                                        ) : (
                                            <p className={cn("text-sm font-bold min-h-[40px] p-2 bg-black/5 rounded", patient.allergies ? "text-amber-800" : "text-charcoal/40 italic")}>
                                                {patient.allergies || 'Sin alergias registradas'}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Pill className="w-4 h-4 text-blue-600" />
                                            <label className="text-[11px] text-charcoal/70 uppercase font-black tracking-widest">Medicamentos / Enf.</label>
                                        </div>
                                        {isEditingSecurity ? (
                                            <textarea 
                                                value={securityForm.medical_history}
                                                onChange={e => setSecurityForm({...securityForm, medical_history: e.target.value})}
                                                className="input-soft w-full text-xs p-2 min-h-[60px] resize-none"
                                                placeholder="Ej: Hipertensión, Metformina 500mg..."
                                            />
                                        ) : (
                                            <p className={cn("text-sm font-bold min-h-[40px] p-2 bg-black/5 rounded", patient.medical_history ? "text-blue-800" : "text-charcoal/40 italic")}>
                                                {patient.medical_history || 'Sin antecedentes registrados'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Notas Generales (Moved below) */}
                        <div className="card-soft p-6 shadow-md border-silk-beige-dark">
                            <div className="flex justify-between items-center mb-6 border-b border-silk-beige pb-2">
                                <h3 className="font-black text-charcoal uppercase tracking-tight text-sm">Notas Generales de Gestión</h3>
                                {!isEditingNotes ? (
                                    <button
                                        onClick={() => setIsEditingNotes(true)}
                                        className="p-1.5 hover:bg-silk-beige rounded-full text-charcoal/40 hover:text-primary-600 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setIsEditingNotes(false)}
                                            className="text-xs font-bold text-charcoal/40 hover:text-charcoal px-2 py-1"
                                            disabled={savingNotes}
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleSaveNotes}
                                            className="text-xs font-black text-primary-600 hover:text-primary-700 px-2 py-1 bg-primary-50 rounded"
                                            disabled={savingNotes}
                                        >
                                            {savingNotes ? '...' : 'Guardar'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isEditingNotes ? (
                                <textarea
                                    value={notesBuffer}
                                    onChange={(e) => setNotesBuffer(e.target.value)}
                                    className="w-full min-h-[120px] p-3 rounded-soft border border-silk-beige bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none text-sm text-charcoal"
                                    placeholder="Escribe notas de seguimiento para recepción o administración..."
                                    autoFocus
                                />
                            ) : (
                                <div className="bg-silk-beige/30 p-4 rounded-soft border border-silk-beige/50 min-h-[100px]">
                                    <p className={cn(
                                        "text-sm leading-relaxed whitespace-pre-wrap",
                                        patient.notes ? "text-charcoal" : "text-charcoal/40 italic"
                                    )}>
                                        {patient.notes || 'No hay notas generales registradas.'}
                                    </p>
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
                                            className={`aspect-square rounded-soft overflow-hidden border relative group cursor-pointer shadow-sm hover:shadow-md transition-all ${isSelected ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2' : 'border-silk-beige'}`}
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
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-white bg-black/30'}`}>
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

                {activeTab === 'odontogram' && profile?.clinic_id && (
                    <Odontogram 
                        patientId={patient.id} 
                        clinicId={profile.clinic_id} 
                        onAddTreatment={(items) => {
                            const newItems = Array.isArray(items) ? items : [items]
                            setPendingTreatments(prev => [...prev, ...newItems])
                            setActiveTab('budgets')
                            toast.success(newItems.length > 1 
                                ? `${newItems.length} tratamientos añadidos` 
                                : 'Tratamiento añadido')
                        }}
                        onAddClinicalRecord={(data) => {
                            setPrefilledRecordData(data)
                            setEditingRecord(null)
                            setShowRecordForm(true)
                        }}
                    />
                )}

                {activeTab === 'budgets' && profile?.clinic_id && (
                    <BudgetManager 
                        patientId={patient.id} 
                        clinicId={profile.clinic_id} 
                        initialItems={pendingTreatments}
                        onClearedItems={() => setPendingTreatments([])}
                    />
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
                    specialty={specialty}
                    initialData={prefilledRecordData}
                    onClose={() => {
                        setShowRecordForm(false)
                        setEditingRecord(null)
                        setPrefilledRecordData(null)
                    }}
                    onSave={() => {
                        fetchRecords()
                        setPrefilledRecordData(null)
                    }}
                />
            )}
        </div>
    )
}

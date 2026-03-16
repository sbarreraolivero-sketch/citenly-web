import { useState, useEffect } from 'react'
import {
    Plus, 
    Search, 
    Edit2, 
    User as UserIcon, 
    Phone, 
    Mail, 
    Calendar,
    Trash2,
    X,
    MapPin
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Database } from '@/types/database'
import { PatientForm } from '@/components/patients/PatientForm'
import { PatientDetails } from '@/components/patients/PatientDetails'
import { SubscriptionGuard } from '@/components/auth/SubscriptionGuard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CSVUploader } from '@/components/patients/CSVUploader'

type Patient = Database['public']['Tables']['patients']['Row'] & {
    tags?: { id: string; name: string; color: string }[]
}

interface TagSummary {
    tag_id: string
    tag_name: string
    tag_color: string
    contact_count: number
}

export default function Patients() {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [patients, setPatients] = useState<Patient[]>([])
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [tagSummaries, setTagSummaries] = useState<TagSummary[]>([])
    const [selectedTag, setSelectedTag] = useState<string | null>(null)

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false)

    useEffect(() => {
        if (!profile?.clinic_id) return
        fetchPatients()
    }, [profile?.clinic_id])

    const fetchPatients = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('patients')
                .select(`
                    *,
                    patient_tags (
                        tags (
                            id,
                            name,
                            color
                        )
                    )
                `)
                .eq('clinic_id', profile?.clinic_id || '')
                .order('name')

            if (error) throw error

            if (searchQuery) {
                const filtered = (data as any[]).filter(p => 
                    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.phone_number?.includes(searchQuery) ||
                    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                const patientsWithTags = filtered.map(p => ({
                    ...p,
                    tags: p.patient_tags ? p.patient_tags.map((pt: any) => pt.tags).filter(Boolean) : []
                }))
                setPatients(patientsWithTags)
                return patientsWithTags
            }

            const patientsWithTags = (data as any[]).map(p => ({
                ...p,
                tags: p.patient_tags ? p.patient_tags.map((pt: any) => pt.tags).filter(Boolean) : []
            }))

            setPatients(patientsWithTags)
            return patientsWithTags
        } catch (error) {
            console.error('Error fetching patients:', error)
            return []
        } finally {
            setLoading(false)
        }
    }

    const fetchTagSummaries = async () => {
        if (!profile?.clinic_id) return
        try {
            const { data, error } = await (supabase as any).rpc('get_tag_counts', {
                p_clinic_id: profile.clinic_id
            })
            if (error) {
                // Fallback: manually fetch tags and count (less efficient but works)
                const { data: tagsData } = await supabase
                    .from('tags')
                    .select('id, name, color')
                    .eq('clinic_id', profile.clinic_id)
                
                if (tagsData) {
                    const summaries = await Promise.all((tagsData as any[]).map(async (t) => {
                        const { count } = await supabase
                            .from('patient_tags')
                            .select('*', { count: 'exact', head: true })
                            .eq('tag_id', t.id)
                        return { tag_id: t.id, tag_name: t.name, tag_color: t.color, contact_count: count || 0 }
                    }))
                    setTagSummaries(summaries.sort((a, b) => b.contact_count - a.contact_count))
                }
            } else {
                setTagSummaries(data)
            }
        } catch (error) {
            console.error('Error fetching tag summaries:', error)
        }
    }

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPatients()
            fetchTagSummaries()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery, profile?.clinic_id])

    const handleDelete = async (id: string) => {
        if (!profile?.clinic_id) return

        try {
            const { error } = await supabase
                .from('patients')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchPatients()
            setShowDeleteConfirm(null)
        } catch (error) {
            console.error('Error deleting patient:', error)
            alert('Error al eliminar paciente')
        }
    }

    const openEdit = (patient: Patient) => {
        setEditingPatient(patient)
        setIsFormOpen(true)
    }

    const openNew = () => {
        setEditingPatient(null)
        setIsFormOpen(true)
    }

    return (
        <SubscriptionGuard>
            {/* View Switching */}
            {selectedPatient ? (
                <PatientDetails
                    patient={selectedPatient}
                    onBack={() => setSelectedPatient(null)}
                    onUpdate={async () => {
                        const updatedList = await fetchPatients()
                        if (updatedList) {
                            const updated = updatedList.find(p => p.id === selectedPatient.id)
                            if (updated) setSelectedPatient(updated)
                        }
                    }}
                />
            ) : (
                <div className="space-y-6 animate-fade-in relative min-h-screen pb-20">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-charcoal">Pacientes</h1>
                            <p className="text-charcoal/60">Gestiona tu base de datos de clientes</p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <CSVUploader onSuccess={fetchPatients} />
                            <button
                                onClick={openNew}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Paciente
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Tag Summary Sidebar */}
                        <div className="lg:w-64 space-y-4">
                            <div className="card-soft p-4">
                                <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-4 border-b border-silk-beige pb-2">Resumen de Etiquetas</h3>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setSelectedTag(null)}
                                        className={`w-full text-left px-3 py-2 rounded-soft text-sm transition-colors flex justify-between items-center ${!selectedTag ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-ivory text-charcoal/60'}`}
                                    >
                                        <span>Todos</span>
                                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-silk-beige">{patients.length}</span>
                                    </button>
                                    {tagSummaries.map(summary => (
                                        <button
                                            key={summary.tag_id}
                                            onClick={() => setSelectedTag(summary.tag_id)}
                                            className={`w-full text-left px-3 py-2 rounded-soft text-sm transition-colors flex justify-between items-center group ${selectedTag === summary.tag_id ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-ivory text-charcoal/60'}`}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: summary.tag_color }} />
                                                <span className="truncate">{summary.tag_name}</span>
                                            </div>
                                            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-silk-beige">{summary.contact_count}</span>
                                        </button>
                                    ))}
                                    {tagSummaries.length === 0 && (
                                        <p className="text-xs text-charcoal/30 px-3 py-2 italic text-center">No hay etiquetas aún</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 space-y-6">
                            {/* Filters */}
                            <div className="card-soft p-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, teléfono o email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="input-soft pl-10 w-full"
                                    />
                                </div>
                            </div>

                            {/* Table (Desktop View) */}
                            <div className="card-soft overflow-hidden hidden md:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-silk-beige bg-ivory">
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Paciente</th>
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Contacto</th>
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Historial</th>
                                                <th className="text-right py-4 px-6 text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-silk-beige">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center">
                                                        <LoadingSpinner className="mx-auto text-primary-500" />
                                                    </td>
                                                </tr>
                                            ) : (patients.filter(p => !selectedTag || p.tags?.some(t => t.id === selectedTag))).length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center text-charcoal/50">
                                                        {searchQuery ? 'No se encontraron resultados' : 'No hay pacientes registrados aún'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                patients.filter(p => !selectedTag || p.tags?.some(t => t.id === selectedTag)).map((patient) => (
                                                    <tr
                                                        key={patient.id}
                                                        className="hover:bg-silk-beige/30 transition-colors cursor-pointer group"
                                                        onClick={() => setSelectedPatient(patient)}
                                                    >
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium group-hover:scale-105 transition-transform">
                                                                    {patient.name?.charAt(0).toUpperCase() || <UserIcon className="w-5 h-5" />}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-charcoal group-hover:text-primary-700 transition-colors">{patient.name || 'Sin nombre'}</p>
                                                                    <p className="text-xs text-charcoal/40">Registrado el {new Date(patient.created_at).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-sm text-charcoal/80">
                                                                    <Phone className="w-3.5 h-3.5 text-charcoal/40" />
                                                                    {patient.phone_number}
                                                                </div>
                                                                {patient.email && (
                                                                    <div className="flex items-center gap-2 text-sm text-charcoal/80">
                                                                        <Mail className="w-3.5 h-3.5 text-charcoal/40" />
                                                                        {patient.email}
                                                                    </div>
                                                                )}
                                                                {patient.address && (
                                                                    <div className="flex items-center gap-2 text-sm text-charcoal/60">
                                                                        <MapPin className="w-3.5 h-3.5 text-charcoal/40" />
                                                                        <span className="truncate max-w-[200px]">{patient.address}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-sm text-charcoal/80">
                                                                    <Calendar className="w-3.5 h-3.5 text-charcoal/40" />
                                                                    {patient.total_appointments || 0} citas
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {patient.tags && patient.tags.map(tag => (
                                                                        <span
                                                                            key={tag.id}
                                                                            className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                                                            style={{
                                                                                backgroundColor: `${tag.color}20`,
                                                                                color: tag.color,
                                                                                borderColor: `${tag.color}40`
                                                                            }}
                                                                        >
                                                                            {tag.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    onClick={() => openEdit(patient)}
                                                                    className="p-2 hover:bg-primary-50 text-charcoal/60 hover:text-primary-600 rounded-soft transition-colors"
                                                                    title="Editar Datos"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                {showDeleteConfirm === patient.id ? (
                                                                    <div className="flex items-center gap-2 bg-red-50 p-1 rounded-soft animate-fade-in">
                                                                        <button
                                                                            onClick={() => handleDelete(patient.id)}
                                                                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                                        >
                                                                            Confirmar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setShowDeleteConfirm(null)}
                                                                            className="p-1 hover:bg-red-100 rounded text-red-600"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setShowDeleteConfirm(patient.id)}
                                                                        className="p-2 hover:bg-red-50 text-charcoal/60 hover:text-red-500 rounded-soft transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isFormOpen && (
                <PatientForm
                    patient={editingPatient}
                    onClose={() => setIsFormOpen(false)}
                    onSave={() => fetchPatients()}
                />
            )}
        </SubscriptionGuard>
    )
}

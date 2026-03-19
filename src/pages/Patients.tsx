import { useState, useEffect } from 'react'
import {
    Plus, 
    Search, 
    Edit2, 
    User as UserIcon, 
    Phone, 
    Trash2,
    X,
    Filter,
    Tag
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

import { PatientForm } from '@/components/patients/PatientForm'
import { PatientDetails } from '@/components/patients/PatientDetails'
import { SubscriptionGuard } from '@/components/auth/SubscriptionGuard'
import { PatientRowSkeleton, PatientCardSkeleton } from '@/components/ui/Skeleton'
import { CSVUploader } from '@/components/patients/CSVUploader'
import { cn } from '@/lib/utils'

type Contact = {
    id: string
    name: string | null
    phone_number: string | null
    email: string | null
    type: 'patient' | 'prospect'
    service: string | null
    notes: string | null
    created_at: string
    tags: { id: string; name: string; color: string }[]
    total_appointments?: number
}

interface TagSummary {
    tag_name: string
    tag_color: string
    contact_count: number
}

export default function Patients() {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [activeTab, setActiveTab] = useState<'all' | 'patients' | 'prospects'>('all')
    const [showTagSidebar, setShowTagSidebar] = useState(false)
    const [editingPatient, setEditingPatient] = useState<any | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [tagSummaries, setTagSummaries] = useState<TagSummary[]>([])
    const [selectedTag, setSelectedTag] = useState<string | null>(null)

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false)

    // Initial fetch happens in the debounced search useEffect below

    const fetchContacts = async () => {
        if (!profile?.clinic_id) return
        setLoading(true)
        setError(null)
        try {
            console.log('Fetching contacts for clinic:', profile.clinic_id)
            const { data, error } = await (supabase as any).rpc('get_unified_contacts', {
                p_clinic_id: profile.clinic_id
            })

            if (error) {
                console.error('RPC Error details:', error)
                throw error
            }
            setContacts(data || [])
        } catch (error: any) {
            console.error('Error fetching contacts:', error)
            setError(error.message || 'Error al cargar contactos')
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
            if (!error) {
                setTagSummaries(data || [])
            }
        } catch (error) {
            console.error('Error fetching tag summaries:', error)
        }
    }

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchContacts()
            fetchTagSummaries()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery, profile?.clinic_id])

    const handleDelete = async (contact: Contact) => {
        if (!profile?.clinic_id) return

        try {
            const table = contact.type === 'patient' ? 'patients' : 'crm_prospects'
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', contact.id)

            if (error) throw error
            fetchContacts()
            setShowDeleteConfirm(null)
        } catch (error) {
            console.error('Error deleting contact:', error)
            alert('Error al eliminar contacto')
        }
    }

    const filteredContacts = contacts.filter(c => {
        const matchesTab = 
            activeTab === 'all' || 
            (activeTab === 'patients' && c.type === 'patient') ||
            (activeTab === 'prospects' && c.type === 'prospect')
        
        const matchesSearch = 
            !searchQuery || 
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone_number?.includes(searchQuery) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesTag = !selectedTag || c.tags?.some(t => t.name === selectedTag)

        return matchesTab && matchesSearch && matchesTag
    })

    return (
        <SubscriptionGuard>
            {/* View Switching */}
            {selectedContact ? (
                <PatientDetails
                    patient={selectedContact as any}
                    onBack={() => setSelectedContact(null)}
                    onUpdate={fetchContacts}
                />
            ) : (
                <div className="space-y-6 animate-fade-in relative min-h-screen pb-20">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-charcoal">Contactos</h1>
                            <p className="text-charcoal/60">Gestiona pacientes y prospectos en un solo lugar</p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <CSVUploader onSuccess={fetchContacts} />
                            <button
                                onClick={() => {
                                    setEditingPatient(null)
                                    setIsFormOpen(true)
                                }}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Contacto
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-silk-beige/30 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'all' ? "bg-white text-primary-700 shadow-sm" : "text-charcoal/60 hover:text-charcoal"
                            )}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setActiveTab('patients')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'patients' ? "bg-white text-primary-700 shadow-sm" : "text-charcoal/60 hover:text-charcoal"
                            )}
                        >
                            Pacientes
                        </button>
                        <button
                            onClick={() => setActiveTab('prospects')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'prospects' ? "bg-white text-primary-700 shadow-sm" : "text-charcoal/60 hover:text-charcoal"
                            )}
                        >
                            Prospectos
                        </button>
                    </div>

                    <div className="flex gap-6 relative">
                        {/* Main Content */}
                        <div className="flex-1 space-y-6">
                            {/* Filters Bar */}
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, teléfono o email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="input-soft pl-10 w-full"
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowTagSidebar(!showTagSidebar)}
                                    className={cn(
                                        "btn-ghost flex items-center gap-2 px-4 whitespace-nowrap",
                                        showTagSidebar || selectedTag ? "bg-primary-50 text-primary-700 border-primary-200" : ""
                                    )}
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>Etiquetas</span>
                                    {selectedTag && (
                                        <span className="w-2 h-2 bg-primary-500 rounded-full" />
                                    )}
                                </button>
                            </div>

                            {/* Table (Desktop) */}
                            <div className="card-soft overflow-hidden hidden md:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-silk-beige bg-ivory">
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Contacto</th>
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Tipo</th>
                                                <th className="text-left py-4 px-6 text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Etiquetas</th>
                                                <th className="text-right py-4 px-6 text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-silk-beige">
                                            {loading ? (
                                                <>
                                                    <PatientRowSkeleton />
                                                    <PatientRowSkeleton />
                                                    <PatientRowSkeleton />
                                                    <PatientRowSkeleton />
                                                    <PatientRowSkeleton />
                                                </>
                                            ) : error ? (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center text-red-500">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <p>Error: {error}</p>
                                                            <button onClick={() => fetchContacts()} className="text-sm underline">Reintentar</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredContacts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center text-charcoal/50">
                                                        {searchQuery ? 'No se encontraron resultados' : 'No hay contactos registrados aún'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredContacts.map((contact) => (
                                                    <tr
                                                        key={contact.id}
                                                        className={cn(
                                                            "transition-colors group",
                                                            contact.type === 'patient' ? "hover:bg-silk-beige/30 cursor-pointer" : "opacity-90"
                                                        )}
                                                        onClick={() => contact.type === 'patient' && setSelectedContact(contact)}
                                                    >
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-10 h-10 rounded-full flex items-center justify-center font-medium group-hover:scale-105 transition-transform",
                                                                    contact.type === 'patient' ? "bg-primary-100 text-primary-700" : "bg-blue-100 text-blue-700"
                                                                )}>
                                                                    {contact.name?.charAt(0).toUpperCase() || <UserIcon className="w-5 h-5" />}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-charcoal group-hover:text-primary-700 transition-colors">{contact.name || 'Sin nombre'}</p>
                                                                    <div className="flex items-center gap-2 text-sm font-semibold text-charcoal/70">
                                                                        <Phone className="w-3.5 h-3.5" /> {contact.phone_number || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={cn(
                                                                "px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                                                contact.type === 'patient' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-blue-100 text-blue-800 border border-blue-300"
                                                            )}>
                                                                {contact.type === 'patient' ? 'Paciente' : 'Prospecto'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                                {contact.tags?.map((tag, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="px-2 py-0.5 rounded text-xs font-bold border uppercase"
                                                                        style={{
                                                                            backgroundColor: `${tag.color}30`,
                                                                            color: tag.color,
                                                                            borderColor: `${tag.color}60`
                                                                        }}
                                                                    >
                                                                        {tag.name}
                                                                    </span>
                                                                ))}
                                                                {(!contact.tags || contact.tags.length === 0) && (
                                                                    <span className="text-xs text-charcoal/30">Sin etiquetas</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                                {contact.type === 'patient' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingPatient(contact)
                                                                            setIsFormOpen(true)
                                                                        }}
                                                                        className="p-2 hover:bg-primary-50 text-charcoal/60 hover:text-primary-600 rounded-soft transition-colors"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                {showDeleteConfirm === contact.id ? (
                                                                    <div className="flex items-center gap-2 bg-red-50 p-1 rounded-soft">
                                                                        <button
                                                                            onClick={() => handleDelete(contact)}
                                                                            className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                                                                        >ok</button>
                                                                        <button onClick={() => setShowDeleteConfirm(null)}><X className="w-3 h-3 text-red-500"/></button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => setShowDeleteConfirm(contact.id)} className="p-2 hover:bg-red-50 text-charcoal/60 hover:text-red-500">
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

                            {/* Mobile List View */}
                            <div className="md:hidden space-y-4">
                                {loading ? (
                                    <>
                                        <PatientCardSkeleton />
                                        <PatientCardSkeleton />
                                        <PatientCardSkeleton />
                                    </>
                                ) : error ? (
                                    <div className="py-20 text-center bg-white rounded-2xl border border-silk-beige text-red-500 px-4">
                                        <p className="mb-2 text-sm">Error: {error}</p>
                                        <button onClick={() => fetchContacts()} className="text-xs underline bg-red-50 px-3 py-1 rounded-full">Reintentar</button>
                                    </div>
                                ) : filteredContacts.length === 0 ? (
                                    <div className="py-20 text-center text-charcoal/50 bg-white rounded-2xl border border-silk-beige">
                                        {searchQuery ? 'No se encontraron resultados' : 'No hay contactos registrados aún'}
                                    </div>
                                ) : (
                                    filteredContacts.map((contact) => (
                                        <div
                                            key={`mob-${contact.id}`}
                                            className="bg-white rounded-2xl p-4 shadow-sm border border-silk-beige flex flex-col gap-3 active:scale-[0.98] transition-all"
                                            onClick={() => contact.type === 'patient' && setSelectedContact(contact)}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-medium",
                                                        contact.type === 'patient' ? "bg-primary-100 text-primary-700" : "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {contact.name?.charAt(0).toUpperCase() || <UserIcon className="w-5 h-5" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-charcoal truncate text-sm">{contact.name || 'Sin nombre'}</p>
                                                        <p className="text-xs font-bold text-charcoal/70 flex items-center gap-1 mt-1">
                                                            <Phone className="w-3.5 h-3.5" /> {contact.phone_number || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex-shrink-0 border",
                                                    contact.type === 'patient' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100"
                                                )}>
                                                    {contact.type === 'patient' ? 'Paciente' : 'Prospecto'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-silk-beige/30">
                                                <div className="flex flex-wrap gap-1">
                                                    {contact.tags?.slice(0, 3).map((tag, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase"
                                                            style={{
                                                                backgroundColor: `${tag.color}10`,
                                                                color: tag.color,
                                                                borderColor: `${tag.color}30`
                                                            }}
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                    {contact.tags?.length > 3 && (
                                                        <span className="text-[9px] text-charcoal/40 font-medium">+{contact.tags.length - 3}</span>
                                                    )}
                                                    {(!contact.tags || contact.tags.length === 0) && (
                                                        <span className="text-[9px] text-charcoal/20 italic">Sin etiquetas</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {contact.type === 'patient' && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingPatient(contact)
                                                                setIsFormOpen(true)
                                                            }}
                                                            className="p-1.5 text-charcoal/40 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(contact.id)}
                                                        className="p-1.5 text-charcoal/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Collapsible Tag Sidebar */}
                        {showTagSidebar && (
                            <div className="w-72 bg-white border border-silk-beige rounded-soft h-fit animate-slide-in-right sticky top-6 self-start shadow-soft-lg">
                                <div className="p-4 border-b border-silk-beige flex items-center justify-between">
                                    <h3 className="font-bold text-charcoal text-sm uppercase tracking-wider">Etiquetas</h3>
                                    <button onClick={() => setShowTagSidebar(false)} className="text-charcoal/40 hover:text-charcoal">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-4 space-y-1 max-h-[70vh] overflow-y-auto">
                                    <button
                                        onClick={() => setSelectedTag(null)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-soft text-sm transition-colors flex justify-between items-center",
                                            !selectedTag ? "bg-primary-50 text-primary-700 font-medium" : "hover:bg-ivory text-charcoal/60"
                                        )}
                                    >
                                        <span>Todos los contactos</span>
                                        <span className="text-xs font-bold bg-white px-1.5 py-0.5 rounded border border-silk-beige text-charcoal/80">{contacts.length}</span>
                                    </button>
                                    <div className="pt-2 pb-1 text-[11px] font-black text-charcoal/60 uppercase tracking-widest px-3">Segmentos</div>
                                    {tagSummaries.map(summary => (
                                        <button
                                            key={summary.tag_name}
                                            onClick={() => setSelectedTag(summary.tag_name === selectedTag ? null : summary.tag_name)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-soft text-sm transition-colors flex justify-between items-center group",
                                                selectedTag === summary.tag_name ? "bg-primary-50 text-primary-700 font-medium" : "hover:bg-ivory text-charcoal/60"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: summary.tag_color }} />
                                                <span className="truncate">{summary.tag_name}</span>
                                            </div>
                                            <span className="text-xs font-bold bg-white px-1.5 py-0.5 rounded border border-silk-beige text-charcoal/80">
                                                {summary.contact_count}
                                            </span>
                                        </button>
                                    ))}
                                    {tagSummaries.length === 0 && (
                                        <div className="py-8 text-center px-4">
                                            <Tag className="w-8 h-8 text-charcoal/10 mx-auto mb-2" />
                                            <p className="text-xs text-charcoal/40">Sin etiquetas registradas</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isFormOpen && (
                <PatientForm
                    patient={editingPatient}
                    onClose={() => setIsFormOpen(false)}
                    onSave={() => fetchContacts()}
                />
            )}
        </SubscriptionGuard>
    )
}

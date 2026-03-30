import { useState, useEffect } from 'react'
import { 
    X, 
    User, 
    Phone, 
    Mail, 
    Tag, 
    MessageSquare, 
    Bot, 
    UserCheck, 
    Loader2, 
    Save, 
    Plus,
    Calendar,
    Briefcase,
    Target,
    Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface CrmTag {
    id: string
    name: string
    color: string
}

interface Prospect {
    id: string
    clinic_id: string
    name: string | null
    phone: string | null
    email: string | null
    address: string | null
    service_interest: string | null
    source: string | null
    notes: string | null
    requires_human: boolean
    created_at: string
    updated_at: string
}

interface ContactInfoSidebarProps {
    phoneNumber: string
    clinicId: string
    onClose: () => void
}

export function ContactInfoSidebar({ phoneNumber, clinicId, onClose }: ContactInfoSidebarProps) {
    const [loading, setLoading] = useState(true)
    const [prospect, setProspect] = useState<Prospect | null>(null)
    const [sidebarTags, setSidebarTags] = useState<CrmTag[]>([])
    const [allTags, setAllTags] = useState<(CrmTag & { source: 'crm' | 'patient' | 'both', crm_id?: string, patient_id?: string })[]>([])
    const [saving, setSaving] = useState(false)
    const [savingTags, setSavingTags] = useState(false)
    const [showTagAdd, setShowTagAdd] = useState(false)
    const [hasTagChanges, setHasTagChanges] = useState(false)
    const [newNote, setNewNote] = useState('')

    useEffect(() => {
        fetchProspectData()
    }, [phoneNumber, clinicId])

    const fetchProspectData = async () => {
        setLoading(true)
        try {
            // Normalize phone for lookup (matching webhook logic)
            const normalizedPhone = phoneNumber.replace(/\D/g, '')

            // Fetch prospect
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: prospectData, error: pError } = await (supabase as any)
                .from('crm_prospects')
                .select('*')
                .eq('clinic_id', clinicId)
                .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
                .maybeSingle()

            if (pError) throw pError
            setProspect(prospectData)

            // Fetch patient (to check for older tags/status)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: patientData } = await (supabase as any)
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId)
                .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+${normalizedPhone}`)
                .maybeSingle()

            const allAssignedTags: CrmTag[] = []

            if (prospectData) {
                // Fetch assigned CRM tags
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: crmTagData } = await (supabase as any)
                    .from('crm_prospect_tags')
                    .select('tag:crm_tags(*)')
                    .eq('prospect_id', prospectData.id)
                
                if (crmTagData) {
                    allAssignedTags.push(...crmTagData.map((t: any) => t.tag).filter(Boolean))
                }
            }

            if (patientData) {
                // Fetch assigned Patient tags
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: patientTagData } = await (supabase as any)
                    .from('patient_tags')
                    .select('tag:tags(*)')
                    .eq('patient_id', patientData.id)
                
                if (patientTagData) {
                    const mappedTags = patientTagData.map((t: any) => t.tag).filter(Boolean)
                    // Avoid duplicates by name
                    mappedTags.forEach((t: any) => {
                        if (!allAssignedTags.some(at => at.name.toLowerCase() === t.name.toLowerCase())) {
                            allAssignedTags.push(t)
                        }
                    })
                }
            }

            setSidebarTags(allAssignedTags)

            // Fetch all available tags for the clinic from BOTH systems
            const [crmTagsRes, patientTagsRes] = await Promise.all([
                (supabase as any).from('crm_tags').select('*').eq('clinic_id', clinicId),
                (supabase as any).from('tags').select('*').eq('clinic_id', clinicId)
            ])

            const crmTags = crmTagsRes.data || []
            const patientTags = patientTagsRes.data || []

            interface UnifiedTag extends CrmTag {
                source: 'crm' | 'patient' | 'both'
                crm_id?: string
                patient_id?: string
            }

            const tagMap = new Map<string, UnifiedTag>()
            
            // Process CRM tags
            crmTags.forEach((t: any) => {
                const nameKey = t.name.toLowerCase().trim()
                tagMap.set(nameKey, { ...t, source: 'crm', crm_id: t.id })
            })
            
            // Process Patient tags and merge
            patientTags.forEach((t: any) => {
                const nameKey = t.name.toLowerCase().trim()
                const existing = tagMap.get(nameKey)
                
                if (existing) {
                    existing.patient_id = t.id
                    existing.source = 'both'
                } else {
                    tagMap.set(nameKey, { ...t, source: 'patient', patient_id: t.id })
                }
            })
            
            setAllTags(Array.from(tagMap.values()) as any)
            setHasTagChanges(false)

        } catch (err) {
            console.error('Error fetching prospect info:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleHumanRequirement = async () => {
        if (!prospect) return
        setSaving(true)
        try {
            const newValue = !prospect.requires_human
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('crm_prospects')
                .update({ requires_human: newValue, updated_at: new Date().toISOString() })
                .eq('id', prospect.id)
            
            if (error) throw error
            setProspect(prev => prev ? { ...prev, requires_human: newValue } : null)
        } catch (err) {
            console.error('Error toggling human req:', err)
        } finally {
            setSaving(false)
        }
    }

    const addTag = (tagId: string) => {
        const tagToAdd = allTags.find(t => t.id === tagId)
        if (!tagToAdd) return
        
        if (!sidebarTags.some(t => t.id === tagId)) {
            setSidebarTags(prev => [...prev, tagToAdd])
            setHasTagChanges(true)
        }
        setShowTagAdd(false)
    }

    const removeTag = (tagId: string) => {
        setSidebarTags(prev => prev.filter(t => t.id !== tagId))
        setHasTagChanges(true)
    }

    const saveTags = async () => {
        if (!prospect || !clinicId || savingTags) return
        setSavingTags(true)
        try {
            const normalizedPhone = phoneNumber.replace(/\D/g, '')
            
            // Get patient if any
            const { data: patient } = await (supabase as any)
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId)
                .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+${normalizedPhone},phone_number.eq.56${normalizedPhone}`)
                .maybeSingle()

            // 1. Delete existing joins
            await Promise.all([
                (supabase as any).from('crm_prospect_tags').delete().eq('prospect_id', prospect.id),
                patient ? (supabase as any).from('patient_tags').delete().eq('patient_id', patient.id) : Promise.resolve()
            ])

            // 2. Insert new joins based on source
            const inserts: Promise<any>[] = []
            
            sidebarTags.forEach(tag => {
                const tagInfo = allTags.find(at => at.name.toLowerCase().trim() === tag.name.toLowerCase().trim())
                if (!tagInfo) return
                
                const crmId = (tagInfo as any).crm_id
                const patId = (tagInfo as any).patient_id

                if (crmId) {
                    inserts.push((supabase as any).from('crm_prospect_tags').insert({ prospect_id: prospect.id, tag_id: crmId }))
                }
                
                if (patient && patId) {
                    inserts.push((supabase as any).from('patient_tags').insert({ patient_id: patient.id, tag_id: patId }))
                }
            })

            await Promise.all(inserts)
            setHasTagChanges(false)
            alert('Etiquetas guardadas con éxito.')
        } catch (err) {
            console.error('Error saving tags:', err)
            alert('Error al guardar etiquetas.')
        } finally {
            setSavingTags(false)
        }
    }

    const saveNote = async () => {
        if (!prospect || !newNote.trim()) return
        setSaving(true)
        try {
            const notes = prospect.notes ? `${prospect.notes}\n${newNote.trim()}` : newNote.trim()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('crm_prospects')
                .update({ notes, updated_at: new Date().toISOString() })
                .eq('id', prospect.id)
            
            if (error) throw error
            setProspect(prev => prev ? { ...prev, notes } : null)
            setNewNote('')
        } catch (err) {
            console.error('Error saving note:', err)
            alert('Error al guardar la nota.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="w-80 h-full bg-white border-l border-silk-beige flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-4 border-b border-silk-beige">
                    <h2 className="font-bold text-charcoal">Información</h2>
                    <button onClick={onClose} className="p-2 hover:bg-ivory rounded-soft"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            </div>
        )
    }

    if (!prospect) {
        return (
            <div className="w-80 h-full bg-white border-l border-silk-beige flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-4 border-b border-silk-beige">
                    <h2 className="font-bold text-charcoal">Información</h2>
                    <button onClick={onClose} className="p-2 hover:bg-ivory rounded-soft"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-ivory rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-charcoal/20" />
                    </div>
                    <p className="text-charcoal/60">No se encontró información para este contacto en el CRM.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-[85vw] md:w-80 h-full bg-white border-l border-silk-beige flex flex-col relative z-10 animate-in slide-in-from-right duration-300 shadow-premium-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-silk-beige bg-ivory/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <h2 className="font-bold text-charcoal">Contacto</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-ivory rounded-full transition-colors flex items-center justify-center text-charcoal/40 hover:text-charcoal">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-8">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <div className="text-center pb-6 border-b border-silk-beige/50">
                            <h3 className="text-xl font-bold text-charcoal mb-1">{prospect.name || 'Sin nombre'}</h3>
                            <p className="text-sm text-charcoal/40 flex items-center justify-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> {phoneNumber}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-silk-beige/30 rounded-soft mt-0.5">
                                    <Mail className="w-4 h-4 text-charcoal/60" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-charcoal/70 uppercase tracking-widest">Email</p>
                                    <p className="text-sm text-charcoal truncate">{prospect.email || 'No proporcionado'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-silk-beige/30 rounded-soft mt-0.5">
                                    <Briefcase className="w-4 h-4 text-charcoal/60" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-charcoal/70 uppercase tracking-widest">Interés</p>
                                    <p className="text-sm text-charcoal">{prospect.service_interest || 'Ninguno especificado'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-silk-beige/30 rounded-soft mt-0.5">
                                    <Target className="w-4 h-4 text-charcoal/60" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-charcoal/70 uppercase tracking-widest">Fuente</p>
                                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-ivory border border-silk-beige text-charcoal/80 mt-1 capitalize shadow-sm">
                                        {prospect.source || 'Directo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* AI & Human Status */}
                    <section className="bg-silk-beige/10 rounded-soft p-4 border border-silk-beige/30 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className={cn("w-5 h-5", prospect.requires_human ? "text-charcoal/30" : "text-primary-500")} />
                                <span className="text-sm font-semibold text-charcoal">Respuesta IA</span>
                            </div>
                            <div className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-sm",
                                prospect.requires_human ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            )}>
                                {prospect.requires_human ? "Silenciada" : "Activa"}
                            </div>
                        </div>
                        <button 
                            onClick={toggleHumanRequirement}
                            disabled={saving}
                            className={cn(
                                "w-full py-2 px-4 rounded-soft text-xs font-bold transition-all flex items-center justify-center gap-2",
                                prospect.requires_human 
                                    ? "bg-primary-500 text-white hover:bg-primary-600 shadow-md"
                                    : "bg-ivory border border-silk-beige text-charcoal hover:bg-white"
                            )}
                        >
                            {saving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : prospect.requires_human ? (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Reactivar IA
                                </>
                            ) : (
                                <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Derivar a Humano
                                </>
                            )}
                        </button>
                    </section>

                    {/* Tags */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-charcoal/40 uppercase tracking-wider flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" /> Etiquetas
                            </h4>
                            <button 
                                onClick={() => setShowTagAdd(!showTagAdd)}
                                className="p-1 hover:bg-ivory rounded transition-colors text-primary-500"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {showTagAdd && (
                            <div className="bg-ivory/50 rounded-soft border border-silk-beige p-2 animate-in fade-in zoom-in-95 duration-200">
                                <p className="text-xs font-black text-charcoal/70 mb-2 px-1 uppercase tracking-tight">Selecciona para agregar:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {allTags.filter((at: any) => !sidebarTags.some((t: any) => t.id === at.id)).map((tag: any) => (
                                        <button
                                            key={tag.id}
                                            onClick={() => addTag(tag.id)}
                                            className="text-xs px-2.5 py-1 rounded-full text-white font-black hover:scale-105 transition-transform shadow-sm"
                                            style={{ backgroundColor: tag.color }}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                    {allTags.filter((at: any) => !sidebarTags.some((t: any) => t.id === at.id)).length === 0 && (
                                        <p className="text-[10px] text-charcoal/40 italic p-1">No hay más etiquetas</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {sidebarTags.map(tag => (
                                <div 
                                    key={tag.id}
                                    className="group relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full text-white font-black transition-all hover:pr-8 overflow-hidden shadow-md"
                                    style={{ backgroundColor: tag.color }}
                                >
                                    {tag.name}
                                    <button 
                                        onClick={() => removeTag(tag.id)}
                                        className="absolute right-1 opacity-0 group-hover:opacity-100 hover:bg-black/10 rounded-full p-0.5 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {sidebarTags.length === 0 && (
                                <p className="text-xs text-charcoal/30 italic">Sin etiquetas asignadas</p>
                            )}
                        </div>

                        {hasTagChanges && (
                            <button
                                onClick={saveTags}
                                disabled={savingTags}
                                className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-soft transition-all shadow-sm disabled:opacity-50"
                            >
                                {savingTags ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Guardar Etiquetas
                            </button>
                        )}
                    </section>

                    {/* Notes */}
                    <section className="space-y-3">
                        <h4 className="text-xs font-bold text-charcoal/40 uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" /> Notas Internas
                        </h4>
                        
                        <div className="space-y-3">
                            {prospect.notes && (
                                <div className="bg-ivory rounded-soft p-3 text-xs text-charcoal/70 whitespace-pre-wrap border border-silk-beige/50">
                                    {prospect.notes}
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <textarea 
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Agregar una nota..."
                                    className="w-full h-20 text-xs p-3 rounded-soft border border-silk-beige focus:ring-1 focus:ring-primary-500 outline-none transition-shadow placeholder:text-charcoal/30"
                                />
                                <button 
                                    onClick={saveNote}
                                    disabled={saving || !newNote.trim()}
                                    className="btn-primary-sm w-full py-2 flex items-center justify-center gap-2 text-[11px]"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    Guardar Nota
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Meta Info */}
                    <section className="pt-4 border-t border-silk-beige/50 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-charcoal/60">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Creado:</span>
                            <span>{new Date(prospect.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-charcoal/60">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Último cambio:</span>
                            <span>{new Date(prospect.updated_at).toLocaleDateString()}</span>
                        </div>
                    </section>
                </div>
            </div>

            {/* Sticky Actions Footer */}
            {(hasTagChanges || savingTags) && (
                <div className="p-4 border-t border-silk-beige bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom duration-300">
                    <button
                        onClick={saveTags}
                        disabled={savingTags}
                        className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-soft transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                    >
                        {savingTags ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Guardar Cambios en Etiquetas
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-emerald-600 font-bold text-center mt-2 animate-pulse">
                        Tienes cambios sin guardar
                    </p>
                </div>
            )}
        </div>
    )
}

function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    )
}

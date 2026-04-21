import { useState, useEffect } from 'react'
import { ShieldAlert, Activity, Pill, ArrowLeft, Plus, User, FileText, Building2, ChevronDown, Loader2 } from 'lucide-react'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

type Patient = Database['public']['Tables']['patients']['Row']

interface Tag {
    id: string
    name: string
    color: string
}

interface PatientSecurityHeaderProps {
    patient: Patient
    financialSummary?: {
        total: number
        paid: number
        balance: number
    }
    onBack?: () => void
    patientTags?: Tag[]
    availableTags?: Tag[]
    onToggleTag?: (tag: Tag) => void
    showTagSelector?: boolean
    setShowTagSelector?: (show: boolean) => void
    suggestedTags?: Tag[]
    clinicName?: string
}

export function PatientSecurityHeader({ 
    patient, 
    onBack,
    patientTags = [],
    availableTags = [],
    onToggleTag,
    showTagSelector,
    setShowTagSelector,
    suggestedTags = [],
    clinicName = "Clínica Dental"
}: PatientSecurityHeaderProps) {
    const [professionals, setProfessionals] = useState<any[]>([])
    const [loadingProfessionals, setLoadingProfessionals] = useState(false)
    const [showProfDropdown, setShowProfDropdown] = useState(false)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        if (patient.clinic_id) {
            fetchProfessionals(patient.clinic_id)
        }
    }, [patient.clinic_id])

    const fetchProfessionals = async (clinicId: string) => {
        setLoadingProfessionals(true)
        try {
            const { data } = await supabase
                .from('user_profiles')
                .select('id, full_name, role')
                .eq('clinic_id', clinicId)
            
            if (data) setProfessionals(data)
        } catch (error) {
            console.error('Error fetching professionals:', error)
        } finally {
            setLoadingProfessionals(false)
        }
    }

    const handleAssignProfessional = async (profId: string, profName: string) => {
        setUpdating(true)
        try {
            const currentMetadata = (patient as any).metadata || {}
            const updatePayload: any = {
                metadata: {
                    ...currentMetadata,
                    assigned_professional_id: profId,
                    assigned_professional_name: profName
                }
            }
            
            const { error } = await (supabase as any)
                .from('patients')
                .update(updatePayload)
                .eq('id', patient.id)

            if (error) throw error
            toast.success(`Asignado a ${profName}`)
            setShowProfDropdown(false)
            window.location.reload()
        } catch (error) {
            console.error('Error assigning professional:', error)
            toast.error('Error al asignar profesional')
        } finally {
            setUpdating(false)
        }
    }

    // Age Calculation Logic
    const getAge = (birthDate: string | null) => {
        if (!birthDate) return '---'
        const birth = new Date(birthDate)
        const now = new Date()
        let years = now.getFullYear() - birth.getFullYear()
        let months = now.getMonth() - birth.getMonth()
        
        if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
            years--
            months += 12
        }
        
        if (years === 0) return `${months} Meses`
        return `${years} años, ${months}M`
    }

    const initials = patient.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PP'
    const currentProfessional = (patient as any).metadata?.assigned_professional_name || 'Sin asignar'

    return (
        <div className="mb-6 space-y-4 animate-fade-in relative z-[100]">
            <div className="bg-primary-700 text-white rounded-softer shadow-2xl p-0 overflow-hidden border border-primary-800/50">
                <div className="px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-8 relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all mr-2 border border-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        
                        <div className="w-20 h-20 rounded-full bg-white text-primary-700 flex items-center justify-center text-3xl font-black shadow-xl border-2 border-primary-600/20 shrink-0 transform hover:rotate-3 transition-transform">
                            {initials}
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black tracking-tight leading-none text-white">
                                    {patient.name}
                                </h2>
                                <div className="px-2 py-0.5 bg-blue-400/20 rounded-soft border border-white/10 flex items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">ID</span>
                                    <span className="text-[11px] font-black text-white">{patient.id.slice(0, 4)}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-white/70 font-bold text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="uppercase text-[10px] font-black tracking-widest opacity-40">RUT</span>
                                    <span className="text-white">{patient.rut || 'No definido'}</span>
                                </div>
                                <div className="h-3 w-px bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <span className="uppercase text-[10px] font-black tracking-widest opacity-40">Sexo</span>
                                    <span className="text-white">{patient.gender || 'Femenino'}</span>
                                </div>
                                <div className="h-3 w-px bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <span className="uppercase text-[10px] font-black tracking-widest opacity-40">Edad</span>
                                    <span className="text-white">{getAge(patient.birth_date)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end gap-1">
                                <span className={cn(
                                    "px-4 py-1.5 rounded-soft text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-inner border transition-all",
                                    patient.is_high_risk ? "bg-red-500 text-white border-red-600 scale-105" : "bg-white/5 text-white/40 border-white/10"
                                )}>
                                    <ShieldAlert className="w-4 h-4" /> Alertas médicas
                                </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="px-4 py-1.5 rounded-soft text-[11px] font-black uppercase tracking-widest bg-white/5 text-white/40 border border-white/10 flex items-center gap-2 shadow-inner">
                                    <Activity className="w-4 h-4" /> Enfermedades
                                </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="px-4 py-1.5 rounded-soft text-[11px] font-black uppercase tracking-widest bg-white/5 text-white/40 border border-white/10 flex items-center gap-2 shadow-inner">
                                    <Pill className="w-4 h-4" /> Medicamentos
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#f8f9fa] px-8 py-3.5 flex items-center justify-between border-t border-black/5 relative overflow-visible">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-4 group relative">
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-charcoal/60 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all border border-black/5">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col relative text-left">
                                <span className="text-[10px] font-black text-charcoal/60 uppercase tracking-widest leading-none mb-1.5">Profesional a cargo</span>
                                <div 
                                    className="flex items-center gap-1.5 cursor-pointer hover:bg-black/5 px-2 py-1 -ml-2 rounded transition-colors group"
                                    onClick={() => setShowProfDropdown(!showProfDropdown)}
                                >
                                    <span className="text-sm font-black text-primary-700">{currentProfessional}</span>
                                    <ChevronDown className={cn("w-4 h-4 text-primary-500 transition-transform", showProfDropdown && "rotate-180")} />
                                </div>

                                {showProfDropdown && (
                                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-softer shadow-2xl border border-silk-beige z-[200] overflow-hidden animate-scale-in">
                                        <div className="p-3 bg-ivory/50 border-b border-silk-beige">
                                            <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest">Seleccionar Profesional</p>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {loadingProfessionals ? (
                                                <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                                            ) : professionals.map(prof => (
                                                <button
                                                    key={prof.id}
                                                    onClick={() => handleAssignProfessional(prof.id, prof.full_name)}
                                                    className="w-full text-left px-4 py-3 hover:bg-primary-50 flex flex-col transition-colors border-b border-silk-beige/30 last:border-0"
                                                    disabled={updating}
                                                >
                                                    <span className="text-sm font-black text-charcoal">{prof.full_name}</span>
                                                    <span className="text-[10px] font-bold text-charcoal/40 uppercase">{prof.role || 'Especialista'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-charcoal/60 border border-black/5">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black text-charcoal/60 uppercase tracking-widest leading-none mb-1.5">Convenio</span>
                                <span className="text-sm font-black text-emerald-700">{patient.insurance_provider || 'Particular / Sin convenio'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-charcoal/60 border border-black/5">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black text-charcoal/60 uppercase tracking-widest leading-none mb-1.5">Sucursal</span>
                                <span className="text-sm font-black text-charcoal">{clinicName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="px-6 py-2.5 bg-white border border-silk-beige text-charcoal text-xs font-black uppercase tracking-widest rounded-soft hover:bg-ivory transition-all shadow-sm">
                             Agendar Cita
                        </button>
                        <button className="px-6 py-2.5 bg-primary-600 text-white rounded-soft text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all">
                             Historia Clínica
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
                {patientTags.map(tag => (
                    <span
                        key={tag.id}
                        className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-silk-beige shadow-sm flex items-center gap-2 hover:scale-105 transition-transform"
                        style={{ color: tag.color, borderColor: `${tag.color}20` }}
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                    </span>
                ))}
                
                <button
                    onClick={() => setShowTagSelector?.(!showTagSelector)}
                    className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-dashed border-silk-beige text-charcoal/40 hover:bg-white hover:text-primary-600 flex items-center gap-2 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Etiquetar Paciente
                </button>

                {suggestedTags.length > 0 && (
                    <div className="flex items-center gap-2 ml-2 pl-4 border-l border-silk-beige text-left">
                        <span className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest">Sugerencias:</span>
                        {suggestedTags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => onToggleTag?.(tag)}
                                className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-dashed border-primary-200 text-primary-400 hover:border-primary-400 hover:text-primary-600 transition-all bg-primary-50/30"
                            >
                                + {tag.name}
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="hidden">
                    {availableTags.length}
                </div>
            </div>
        </div>
    )
}

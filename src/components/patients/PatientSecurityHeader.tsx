import { useState, useEffect } from 'react'
import { ShieldAlert, Activity, Pill, ArrowLeft, Plus, User, FileText, Building2, ChevronDown, Loader2, Monitor } from 'lucide-react'
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
    const [showBoxDropdown, setShowBoxDropdown] = useState(false)
    const [updating, setUpdating] = useState(false)

    // Standard boxes for dental clinics - in a real app these come from settings
    const BOX_OPTIONS = ['BOX 1', 'BOX 2', 'BOX 3', 'BOX 4', 'BOX 5', 'Sillón Principal', 'Sillón Cirugía', 'Urgencias']

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

    const handleUpdateMetadata = async (key: string, value: string) => {
        setUpdating(true)
        try {
            const currentMetadata = (patient as any).metadata || {}
            const updatePayload = {
                metadata: {
                    ...currentMetadata,
                    [key]: value
                }
            }
            
            const { error } = await (supabase as any)
                .from('patients')
                .update(updatePayload)
                .eq('id', patient.id)

            if (error) throw error
            toast.success(`Actualizado: ${value}`)
            setShowProfDropdown(false)
            setShowBoxDropdown(false)
            window.location.reload()
        } catch (error) {
            console.error('Error updating metadata:', error)
            toast.error('Error al actualizar')
        } finally {
            setUpdating(false)
        }
    }

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
    const currentBox = (patient as any).metadata?.assigned_box || 'Sin asignar'

    return (
        <div className="mb-6 space-y-4 animate-fade-in relative z-[100]">
            {/* Main Primary Banner: Premium Style */}
            <div className="bg-gradient-to-br from-[#FFF0F7] via-[#FFF5F9] to-white dark:from-[#0B0B0F] dark:via-[#12040B] dark:to-[#0B0B0F] rounded-[24px] p-0 text-primary-theme dark:text-white border border-[#FF2E88]/30 relative overflow-hidden group shadow-[0_0_30px_rgba(255,46,136,0.1)]">
                <div className="px-4 sm:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8 relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center gap-4 sm:gap-6 relative z-10 w-full md:w-auto">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all mr-2 border border-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        
                        <div className="w-20 h-20 rounded-full bg-white dark:bg-black text-[#FF2E88] flex items-center justify-center text-3xl font-black shadow-xl border-2 border-[#FF2E88]/20 shrink-0 transform hover:rotate-3 transition-transform">
                            {initials}
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black tracking-tight leading-none text-[#0B0B0F]">
                                     {patient.name}
                                 </h2>
                                <div className="px-2 py-0.5 bg-blue-400/20 rounded-soft border border-white/10 flex items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">ID</span>
                                    <span className="text-[11px] font-black text-white">{patient.id.slice(0, 4)}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-bold text-sm">
                                <div className="flex items-center gap-2">
                                     <span className="uppercase text-[10px] font-black tracking-widest text-[#0B0B0F]/50">RUT</span>
                                     <span className="text-[#0B0B0F]">{patient.rut || 'No definido'}</span>
                                 </div>
                                 <div className="h-3 w-px bg-[#0B0B0F]/10" />
                                 <div className="flex items-center gap-2">
                                     <span className="uppercase text-[10px] font-black tracking-widest text-[#0B0B0F]/50">Sexo</span>
                                     <span className="text-[#0B0B0F]">{patient.gender || 'Femenino'}</span>
                                 </div>
                                 <div className="h-3 w-px bg-[#0B0B0F]/10" />
                                 <div className="flex items-center gap-2">
                                     <span className="uppercase text-[10px] font-black tracking-widest text-[#0B0B0F]/50">Edad</span>
                                     <span className="text-[#0B0B0F]">{getAge(patient.birth_date)}</span>
                                 </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="flex items-center gap-3">
                                <span className={cn(
                                    "px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all border shadow-lg backdrop-blur-sm",
                                    patient.is_high_risk 
                                        ? "bg-red-500 text-white border-red-400 scale-105" 
                                        : "bg-white/40 dark:bg-white/80 text-[#0B0B0F] border-white/20 hover:bg-white/60"
                                )}>
                                    <ShieldAlert className={cn("w-4.5 h-4.5", patient.is_high_risk ? "text-white" : "text-red-600")} /> 
                                    <span>Alertas médicas</span>
                                </span>
                            <div className="group flex flex-col items-end gap-1">
                                <span className="px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-white/40 dark:bg-white/80 text-[#0B0B0F] border border-white/20 hover:bg-white/60 flex items-center gap-2.5 transition-all shadow-lg backdrop-blur-sm">
                                    <Activity className="w-4.5 h-4.5 text-emerald-600" /> 
                                    <span>Enfermedades</span>
                                </span>
                            </div>
                            <div className="group flex flex-col items-end gap-1">
                                <span className="px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-white/40 dark:bg-white/80 text-[#0B0B0F] border border-white/20 hover:bg-white/60 flex items-center gap-2.5 transition-all shadow-lg backdrop-blur-sm">
                                    <Pill className="w-4.5 h-4.5 text-indigo-600" /> 
                                    <span>Medicamentos</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Context Bar: Professional, Convenio, Sucursal, BOX */}
                <div className="bg-secondary-theme px-4 sm:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-theme relative overflow-visible">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-8 w-full md:w-auto">
                        {/* Profesional Dropdown */}
                        <div className="flex items-center gap-3 group relative">
                            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-charcoal/60 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all border border-black/5">
                                <User className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex flex-col relative text-left">
                                <span className="text-[9px] font-black text-secondary-theme uppercase tracking-widest leading-none mb-1">Profesional</span>
                                <div 
                                    className="flex items-center gap-1 cursor-pointer hover:bg-theme/5 px-1 py-0.5 -ml-1 rounded transition-colors group"
                                    onClick={() => { setShowProfDropdown(!showProfDropdown); setShowBoxDropdown(false); }}
                                >
                                    <span className="text-xs font-black text-primary-theme truncate max-w-[120px]">{currentProfessional}</span>
                                    <ChevronDown className={cn("w-3.5 h-3.5 text-primary-500 transition-transform", showProfDropdown && "rotate-180")} />
                                </div>

                                {showProfDropdown && (
                                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-softer shadow-2xl border border-silk-beige z-[200] overflow-hidden animate-scale-in">
                                        <div className="p-3 bg-ivory/50 border-b border-silk-beige">
                                            <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest">Seleccionar Profesional</p>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {loadingProfessionals ? (
                                                <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                                            ) : professionals.map(prof => (
                                                <button
                                                    key={prof.id}
                                                    onClick={() => handleUpdateMetadata('assigned_professional_name', prof.full_name)}
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

                        {/* BOX Dropdown */}
                        <div className="flex items-center gap-3 group relative">
                            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-charcoal/60 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all border border-black/5">
                                <Monitor className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex flex-col relative text-left">
                                <span className="text-[9px] font-black text-secondary-theme uppercase tracking-widest leading-none mb-1">BOX / SILLÓN</span>
                                <div 
                                    className="flex items-center gap-1 cursor-pointer hover:bg-theme/5 px-1 py-0.5 -ml-1 rounded transition-colors group"
                                    onClick={() => { setShowBoxDropdown(!showBoxDropdown); setShowProfDropdown(false); }}
                                >
                                    <span className="text-xs font-black text-primary-theme">{currentBox}</span>
                                    <ChevronDown className={cn("w-3.5 h-3.5 text-primary-500 transition-transform", showBoxDropdown && "rotate-180")} />
                                </div>

                                {showBoxDropdown && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-softer shadow-2xl border border-silk-beige z-[200] overflow-hidden animate-scale-in">
                                        <div className="p-3 bg-ivory/50 border-b border-silk-beige">
                                            <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest">Asignar Box</p>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {BOX_OPTIONS.map(box => (
                                                <button
                                                    key={box}
                                                    onClick={() => handleUpdateMetadata('assigned_box', box)}
                                                    className="w-full text-left px-4 py-3 hover:bg-primary-50 font-black text-sm text-charcoal transition-colors border-b border-silk-beige/30 last:border-0"
                                                    disabled={updating}
                                                >
                                                    {box}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Convenio */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-charcoal/60 border border-black/5">
                                <FileText className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[9px] font-black text-secondary-theme uppercase tracking-widest leading-none mb-1">Convenio</span>
                                <span className="text-xs font-black text-emerald-700">{patient.insurance_provider || 'Part.'}</span>
                            </div>
                        </div>

                        {/* Sucursal */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-charcoal/60 border border-black/5">
                                <Building2 className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[9px] font-black text-secondary-theme uppercase tracking-widest leading-none mb-1">Sucursal</span>
                                <span className="text-xs font-black text-primary-theme truncate max-w-[100px]">{clinicName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end mt-2 md:mt-0">
                        <button className="px-5 py-2 bg-primary-theme border border-theme text-primary-theme text-[10px] font-black uppercase tracking-widest rounded-soft hover:bg-secondary-theme transition-all shadow-sm flex-1 md:flex-none">
                             Agendar
                        </button>
                        <button className="px-5 py-2 bg-[#FF2E88] text-white rounded-soft text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#FF2E88]/20 hover:bg-[#FF4DA6] transition-all flex-1 md:flex-none">
                             Historia
                        </button>
                    </div>
                </div>
            </div>

            {/* Tags Bar */}
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
                    className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-dashed border-theme text-secondary-theme hover:bg-primary-theme/5 hover:text-primary-theme flex items-center gap-2 transition-all"
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

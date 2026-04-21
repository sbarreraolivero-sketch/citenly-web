import { useState, useEffect } from 'react'
import { ShieldAlert, Activity, Pill, ArrowLeft, Plus, Check, User, FileText, Building2, ChevronDown } from 'lucide-react'
import { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

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
    financialSummary, 
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
    const [assignedProf, setAssignedProf] = useState<string | null>(null)

    useEffect(() => {
        if (patient.clinic_id) {
            fetchProfessionals()
        }
    }, [patient.clinic_id])

    const fetchProfessionals = async () => {
        setLoadingProfessionals(true)
        try {
            const { data } = await supabase
                .from('user_profiles')
                .select('id, full_name')
                .eq('clinic_id', patient.clinic_id)
            
            if (data) setProfessionals(data)
        } catch (error) {
            console.error('Error fetching professionals:', error)
        } finally {
            setLoadingProfessionals(false)
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

    return (
        <div className="mb-6 space-y-4 animate-fade-in relative z-10">
            {/* Main Primary Banner: Dentalink Style */}
            <div className="bg-primary-700 text-white rounded-softer shadow-2xl p-0 overflow-hidden border border-primary-800/50">
                <div className="px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-8 relative">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
                    
                    <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all mr-2 border border-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        
                        <div className="w-20 h-20 rounded-full bg-white text-primary-700 flex items-center justify-center text-3xl font-black shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-primary-600/20 shrink-0 transform hover:scale-105 transition-transform">
                            {initials}
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black tracking-tight leading-none text-white drop-shadow-sm">
                                    {patient.name}
                                </h2>
                                <div className="px-2 py-0.5 bg-blue-400/20 rounded-soft border border-white/10 flex items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">ID</span>
                                    <span className="text-[11px] font-black text-white">{patient.id.slice(0, 4)}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/80 font-medium text-sm">
                                <div className="flex items-center gap-1.5 border-r border-white/10 pr-4 last:border-0">
                                    <span className="uppercase text-[10px] font-black tracking-widest opacity-60">RUT</span>
                                    <span className="text-white drop-shadow-sm">{patient.rut || 'No definido'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-r border-white/10 pr-4 last:border-0">
                                    <span className="uppercase text-[10px] font-black tracking-widest opacity-60">Sexo</span>
                                    <span className="text-white drop-shadow-sm">{patient.gender || 'Femenino'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="uppercase text-[10px] font-black tracking-widest opacity-60">Edad</span>
                                    <span className="text-white drop-shadow-sm">{getAge(patient.birth_date)}</span>
                                </div>
                                {patient.insurance_provider && (
                                    <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded ml-2">
                                        <span className="uppercase text-[9px] font-black tracking-widest opacity-70">Beneficios</span>
                                        <span className="text-[10px] font-black">{patient.insurance_provider}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Control Cards (Financial Stats Header style) */}
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end gap-1">
                                <span className={cn(
                                    "px-3 py-1 rounded-soft text-xs font-black uppercase tracking-tight flex items-center gap-2 shadow-sm border",
                                    patient.is_high_risk ? "bg-red-500 text-white border-red-600" : "bg-white/10 text-white border-white/20"
                                )}>
                                    <ShieldAlert className="w-4 h-4" /> Alertas médicas
                                </span>
                                <span className="text-[10px] font-black text-white/60 uppercase text-right pr-1">
                                    {patient.is_high_risk ? "1 Alerta Activa" : "Sin información"}
                                </span>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1">
                                <span className="px-3 py-1 rounded-soft text-xs font-black uppercase tracking-tight bg-white/10 text-white border border-white/20 flex items-center gap-2 shadow-sm">
                                    <Activity className="w-4 h-4" /> Enfermedades
                                </span>
                                <span className="text-[10px] font-black text-white/60 uppercase text-right pr-1">Sin información</span>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className="px-3 py-1 rounded-soft text-xs font-black uppercase tracking-tight bg-white/10 text-white border border-white/20 flex items-center gap-2 shadow-sm">
                                    <Pill className="w-4 h-4" /> Medicamentos
                                </span>
                                <span className="text-[10px] font-black text-white/60 uppercase text-right pr-1">Sin información</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Patient Context Navigation Bar (Dentalink Like) */}
                <div className="bg-white/95 backdrop-blur-md px-8 py-3 flex items-center justify-between border-t border-black/5">
                    <div className="flex items-center gap-8">
                        {/* Profesional Dropdown */}
                        <div className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-silk-beige flex items-center justify-center text-charcoal/40 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest leading-none mb-1">Profesional a cargo</span>
                                <div className="flex items-center gap-1 cursor-pointer">
                                    <span className="text-[11px] font-bold text-primary-600">Dr(a). Javiera Mancilla Abarza</span>
                                    <ChevronDown className="w-3 h-3 text-primary-600" />
                                </div>
                            </div>
                        </div>

                        {/* Convenio */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-silk-beige flex items-center justify-center text-charcoal/40">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest leading-none mb-1">Convenio</span>
                                <span className="text-[11px] font-bold text-primary-600">{patient.insurance_provider || 'Sin convenio'}</span>
                            </div>
                        </div>

                        {/* Sucursal */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-silk-beige flex items-center justify-center text-charcoal/40">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest leading-none mb-1">Sucursal</span>
                                <span className="text-[11px] font-bold text-primary-600">{clinicName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access Actions */}
                    <div className="flex items-center gap-4">
                        <button className="btn-soft px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-primary-50 transition-all border-primary-100">
                             Agendar
                        </button>
                        <button className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20">
                             Historia clínica
                        </button>
                    </div>
                </div>
            </div>

            {/* Tag Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
                {patientTags.map(tag => (
                    <span
                        key={tag.id}
                        className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-silk-beige shadow-sm flex items-center gap-2"
                        style={{ color: tag.color }}
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                    </span>
                ))}
                
                <div className="relative">
                    <button
                        onClick={() => setShowTagSelector?.(!showTagSelector)}
                        className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-dashed border-silk-beige text-charcoal/40 hover:bg-white hover:text-primary-600 flex items-center gap-2 transition-all bg-silk-beige/20 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Etiqueta
                    </button>

                    {showTagSelector && (
                        <>
                            <div
                                className="fixed inset-0 z-[110]"
                                onClick={() => setShowTagSelector?.(false)}
                            />
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-softer shadow-2xl border border-silk-beige z-[120] overflow-hidden animate-scale-in">
                                <div className="p-3 border-b border-silk-beige bg-ivory/50">
                                    <p className="text-[10px] font-black text-charcoal/60 uppercase tracking-widest">Etiquetas Disponibles</p>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1.5">
                                    {availableTags.length === 0 ? (
                                        <p className="text-[10px] text-charcoal/40 p-3 text-center italic">No hay etiquetas creadas.</p>
                                    ) : (
                                        availableTags.map(tag => {
                                            const isSelected = patientTags.some(t => t.id === tag.id)
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => onToggleTag?.(tag)}
                                                    className="w-full text-left px-3 py-2 rounded-soft hover:bg-primary-50 flex items-center justify-between group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className="w-4 h-4 rounded-full border border-black/5"
                                                            style={{ backgroundColor: tag.color }}
                                                        />
                                                        <span className={cn(
                                                            "text-xs font-bold",
                                                            isSelected ? "text-primary-700" : "text-charcoal/70"
                                                        )}>
                                                            {tag.name}
                                                        </span>
                                                    </div>
                                                    {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                                                </button>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {suggestedTags.length > 0 && (
                    <div className="flex items-center gap-2 ml-2 pl-4 border-l border-silk-beige">
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
            </div>
        </div>
    )
}

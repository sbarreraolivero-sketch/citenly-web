import { ShieldAlert, Activity, Pill, ArrowLeft, Plus, Check } from 'lucide-react'
import { Database } from '@/types/database'
import { cn } from '@/lib/utils'

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
    suggestedTags = []
}: PatientSecurityHeaderProps) {
    // Calculate age
    const calculateAge = (birthday?: string | null) => {
        if (!birthday) return null
        const birthDate = new Date(birthday)
        const ageDifMs = Date.now() - birthDate.getTime()
        const ageDate = new Date(ageDifMs)
        const years = Math.abs(ageDate.getUTCFullYear() - 1970)
        const months = ageDate.getUTCMonth()
        return { years, months }
    }



    return (
        <div className="mb-6 space-y-4 animate-fade-in sticky top-0 z-30 bg-silk-beige/50 backdrop-blur-sm -mx-4 px-4 py-2 border-b border-silk-beige">
            {/* Top Bar: Identity & Quick Stats */}
            <div className="bg-primary-700 text-white rounded-soft p-4 shadow-lg flex flex-wrap items-center justify-between gap-4 border-b border-white/10 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                
                <div className="flex items-center gap-4 relative z-10">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all mr-2 border border-white/10"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black border-2 border-white/30 shadow-inner shrink-0">
                        {patient.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    
                    <div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black tracking-tight leading-tight text-white">{patient.name}</h2>
                                <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded uppercase font-black tracking-widest text-white">
                                    ID {patient.id.slice(0, 4)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Ficha Clínica Digital</span>
                                {patient.rut && <span className="text-white/40 text-[10px] uppercase font-black tracking-widest bg-black/10 px-1.5 py-0.5 rounded">RUT: {patient.rut}</span>}
                            </div>
                        </div>

                        {/* Integrated Tags Section */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            {patientTags.map(tag => (
                                <span
                                    key={tag.id}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 bg-white/10"
                                    style={{ color: 'white' }}
                                >
                                    {tag.name}
                                </span>
                            ))}

                            <div className="relative">
                                <button
                                    onClick={() => setShowTagSelector?.(!showTagSelector)}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-dashed border-white/30 text-white/60 hover:bg-white/10 hover:text-white flex items-center gap-1 transition-colors bg-white/5"
                                >
                                    <Plus className="w-3 h-3" />
                                    Etiquetar
                                </button>

                                {showTagSelector && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowTagSelector?.(false)}
                                        />
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-soft shadow-premium border border-silk-beige z-20 overflow-hidden animate-fade-in">
                                            <div className="p-2 border-b border-silk-beige bg-ivory/50">
                                                <p className="text-[10px] font-black text-charcoal/60 uppercase tracking-widest">Asignar Etiqueta</p>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto p-1">
                                                {availableTags.length === 0 ? (
                                                    <p className="text-[10px] text-charcoal/40 p-2 text-center">No hay etiquetas.</p>
                                                ) : (
                                                    availableTags.map(tag => {
                                                        const isSelected = patientTags.some(t => t.id === tag.id)
                                                        return (
                                                            <button
                                                                key={tag.id}
                                                                onClick={() => onToggleTag?.(tag)}
                                                                className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 flex items-center justify-between group"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className="w-3 h-3 rounded-full"
                                                                        style={{ backgroundColor: tag.color }}
                                                                    />
                                                                    <span className={`text-xs ${isSelected ? 'font-bold text-charcoal' : 'text-charcoal/80'}`}>
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
                            
                            {/* Suggested Tags Inline */}
                            {suggestedTags.length > 0 && (
                                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
                                    <span className="text-[9px] text-white/40 italic">Sugerencias:</span>
                                    {suggestedTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => onToggleTag?.(tag)}
                                            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-dashed border-white/20 text-white/60 hover:border-white/40 hover:text-white transition-all bg-white/5"
                                        >
                                            + {tag.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Financial Summary Widget */}
                <div className="flex items-center gap-6 pr-4 relative z-10">
                    <div className="hidden sm:block text-right">
                        <p className="text-[11px] uppercase font-black text-white/50 tracking-widest mb-0.5">Realizado</p>
                        <p className="text-xl font-black tracking-tighter text-white">${financialSummary?.total.toLocaleString() || '0'}</p>
                    </div>
                    <div className="hidden sm:block text-right">
                        <p className="text-[11px] uppercase font-black text-white/50 tracking-widest mb-0.5">Abonado</p>
                        <p className="text-xl font-black tracking-tighter text-emerald-300">${financialSummary?.paid.toLocaleString() || '0'}</p>
                    </div>
                    <div className="text-right bg-white/10 backdrop-blur-md p-3 rounded-soft border border-white/20 min-w-[140px] shadow-inner">
                        <p className="text-[11px] uppercase font-black text-white tracking-widest mb-0.5">Saldo Deuda</p>
                        <p className={cn(
                            "text-2xl font-black tracking-tighter text-center",
                            (financialSummary?.balance || 0) > 0 ? "text-orange-300" : "text-emerald-300"
                        )}>
                            ${financialSummary?.balance.toLocaleString() || '0'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Middle Bar: Triple Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Medical Alerts / High Risk */}
                <div className={cn(
                    "flex flex-col p-4 rounded-soft border-2 transition-all relative overflow-hidden group",
                    patient.is_high_risk 
                        ? "bg-red-50 border-red-200 shadow-md ring-2 ring-red-100 ring-offset-0" 
                        : "bg-white border-silk-beige"
                )}>
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className={cn("w-5 h-5", patient.is_high_risk ? "text-red-600 animate-pulse" : "text-charcoal/40")} />
                        <span className="text-[11px] font-black uppercase tracking-widest text-charcoal/80">Alertas Médicas</span>
                    </div>
                    <p className={cn("text-sm font-bold uppercase", patient.is_high_risk ? "text-red-700" : "text-charcoal/40 italic")}>
                        {patient.is_high_risk ? "PACIENTE DE ALTO RIESGO" : "Sin alertas registradas"}
                    </p>
                    {patient.is_high_risk && <div className="absolute -right-2 -bottom-2 opacity-5"><ShieldAlert size={60} /></div>}
                </div>

                {/* 2. Allergies */}
                <div className={cn(
                    "flex flex-col p-4 rounded-soft border-2 transition-all",
                    patient.allergies 
                        ? "bg-amber-50 border-amber-200 shadow-sm" 
                        : "bg-white border-silk-beige"
                )}>
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className={cn("w-5 h-5", patient.allergies ? "text-amber-600" : "text-charcoal/40")} />
                        <span className="text-[11px] font-black uppercase tracking-widest text-charcoal/80">Alergias</span>
                    </div>
                    <p className={cn("text-sm font-bold leading-tight uppercase", patient.allergies ? "text-amber-800" : "text-charcoal/40 italic")}>
                        {patient.allergies || "Sin información registrada"}
                    </p>
                </div>

                {/* 3. Medical History / Medications */}
                <div className={cn(
                    "flex flex-col p-4 rounded-soft border-2 transition-all",
                    patient.medical_history 
                        ? "bg-blue-50 border-blue-200 shadow-sm" 
                        : "bg-white border-silk-beige"
                )}>
                    <div className="flex items-center gap-2 mb-2">
                        <Pill className={cn("w-5 h-5", patient.medical_history ? "text-blue-600" : "text-charcoal/40")} />
                        <span className="text-[11px] font-black uppercase tracking-widest text-charcoal/80">Medicamentos / Enf.</span>
                    </div>
                    <p className={cn("text-sm font-bold leading-tight uppercase", patient.medical_history ? "text-blue-800" : "text-charcoal/40 italic")}>
                        {patient.medical_history || "Sin información registrada"}
                    </p>
                </div>
            </div>
        </div>
    )
}

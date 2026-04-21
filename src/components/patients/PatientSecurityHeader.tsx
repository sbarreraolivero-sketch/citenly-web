import { ShieldAlert, Activity, Pill } from 'lucide-react'
import { Database } from '@/types/database'
import { cn } from '@/lib/utils'

type Patient = Database['public']['Tables']['patients']['Row']

interface PatientSecurityHeaderProps {
    patient: Patient
    financialSummary?: {
        total: number
        paid: number
        balance: number
    }
}

export function PatientSecurityHeader({ patient, financialSummary }: PatientSecurityHeaderProps) {
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

    const age = calculateAge(patient.birth_date)

    return (
        <div className="mb-6 space-y-4 animate-fade-in">
            {/* Top Bar: Identity & Quick Stats */}
            <div className="bg-primary-700 text-white rounded-t-soft p-4 shadow-lg flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black border-2 border-white/30 shadow-inner">
                        {patient.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black tracking-tight leading-tight text-white mb-0.5">{patient.name}</h2>
                            <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded uppercase font-black tracking-widest text-white">
                                ID {patient.id.slice(0, 4)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-white/90 mt-1 font-bold">
                            {patient.rut && <span className="bg-white/20 px-2 py-0.5 rounded">RUT: {patient.rut}</span>}
                            {patient.gender && <span>• {patient.gender}</span>}
                            {age && <span>• {age.years} años, {age.months}M</span>}
                            {patient.insurance_provider && (
                                <span className="bg-emerald-400 text-primary-900 px-2 py-0.5 rounded font-black">
                                    {patient.insurance_provider}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Financial Summary Widget - Dentalink Style */}
                <div className="flex items-center gap-8 pr-4">
                    <div className="text-right">
                        <p className="text-[11px] uppercase font-black text-white/70 tracking-widest mb-0.5">Realizado</p>
                        <p className="text-xl font-black tracking-tighter text-white">${financialSummary?.total.toLocaleString() || '0'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] uppercase font-black text-white/70 tracking-widest mb-0.5">Abonado</p>
                        <p className="text-xl font-black tracking-tighter text-emerald-300">${financialSummary?.paid.toLocaleString() || '0'}</p>
                    </div>
                    <div className="text-right bg-white/20 p-2.5 rounded-soft border border-white/20 min-w-[130px] shadow-inner">
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

            {/* Middle Bar: Triple Alert Cards (Dentalink Style) */}
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
                    <p className={cn("text-sm font-bold", patient.is_high_risk ? "text-red-700" : "text-charcoal/40 italic")}>
                        {patient.is_high_risk ? "PACIENTE DE ALTO RIESGO" : "Sin alertas registradas"}
                    </p>
                    {patient.is_high_risk && <div className="absolute -right-2 -bottom-2 opacity-5"><ShieldAlert size={60} /></div>}
                </div>

                {/* 2. Allergies / Diseases */}
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
                    <p className={cn("text-sm font-bold leading-tight", patient.allergies ? "text-amber-800" : "text-charcoal/40 italic")}>
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
                    <p className={cn("text-sm font-bold leading-tight", patient.medical_history ? "text-blue-800" : "text-charcoal/40 italic")}>
                        {patient.medical_history || "Sin información registrada"}
                    </p>
                </div>
            </div>
            
            {/* Quick Actions Bar */}
            <div className="flex gap-4 p-2 bg-white rounded-b-soft border-x border-b border-silk-beige shadow-sm">
                <button className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:bg-primary-50 px-3 py-2 rounded transition-all border border-transparent hover:border-primary-100 flex items-center gap-2">
                    Ir a datos personales →
                </button>
                <button className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:bg-primary-50 px-3 py-2 rounded transition-all border border-transparent hover:border-primary-100 flex items-center gap-2">
                    Ver planes de tratamiento →
                </button>
                <button className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:bg-primary-50 px-3 py-2 rounded transition-all border border-transparent hover:border-primary-100 flex items-center gap-2">
                    Estado de cuenta →
                </button>
            </div>
        </div>
    )
}

import { ShieldAlert, AlertTriangle, Info, Octagon } from 'lucide-react'
import { Database } from '@/types/database'
import { cn } from '@/lib/utils'

type Patient = Database['public']['Tables']['patients']['Row']

interface PatientSecurityHeaderProps {
    patient: Patient
}

export function PatientSecurityHeader({ patient }: PatientSecurityHeaderProps) {
    const hasAllergies = !!patient.allergies && patient.allergies.trim() !== ''
    const hasMedicalHistory = !!patient.medical_history && patient.medical_history.trim() !== ''
    const isHighRisk = patient.is_high_risk

    if (!hasAllergies && !hasMedicalHistory && !isHighRisk) return null

    return (
        <div className="w-full animate-slide-down sticky top-0 z-50">
            <div className="flex flex-wrap items-stretch overflow-hidden rounded-soft border shadow-lg">
                {/* High Risk Banner */}
                {isHighRisk && (
                    <div className="flex items-center gap-3 bg-red-600 text-white px-6 py-3 flex-1 min-w-[200px]">
                        <div className="animate-pulse">
                            <Octagon className="w-6 h-6 fill-white text-red-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none opacity-80">Alerta de Seguridad</p>
                            <p className="text-sm font-black uppercase">Paciente de Alto Riesgo</p>
                        </div>
                    </div>
                )}

                {/* Allergies Section */}
                {hasAllergies && (
                    <div className={cn(
                        "flex items-center gap-3 px-6 py-3 border-l border-white/10 flex-1 min-w-[250px]",
                        isHighRisk ? "bg-red-700 text-white" : "bg-rose-50 text-rose-700 border-rose-200"
                    )}>
                        <ShieldAlert className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none opacity-70">Alergias Detectadas</p>
                            <p className="text-sm font-bold leading-tight">{patient.allergies}</p>
                        </div>
                    </div>
                )}

                {/* Medical History Flags */}
                {hasMedicalHistory && (
                    <div className="flex items-center gap-3 bg-amber-50 text-amber-800 px-6 py-3 border-l border-amber-200 flex-[2] min-w-[300px]">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none opacity-70">Antecedentes Sistémicos</p>
                            <p className="text-sm font-bold leading-tight">{patient.medical_history}</p>
                        </div>
                    </div>
                )}

                {/* Visual indicator of "Safe to proceed" if only generic info exists (Optional) */}
            </div>
            
            {/* Glassmorphism subtle shadow underneath */}
            <div className="h-4 bg-gradient-to-b from-black/5 to-transparent pointer-events-none" />
        </div>
    )
}

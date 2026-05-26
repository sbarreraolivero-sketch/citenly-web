import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
    ChevronsUpDown,
    Check,
    Plus,
    Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import CreateBranchModal from './CreateBranchModal'

export default function BranchSwitcher() {
    const { clinics, profile, switchClinic, subscription } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Current active clinic
    const currentClinic = clinics.find(c => c.clinic_id === profile?.clinic_id)

    const handleSwitch = (clinicId: string) => {
        if (clinicId === profile?.clinic_id) return
        switchClinic(clinicId)
        setIsOpen(false)
    }

    // Check if user has Prestige plan to allow creating branches
    // We check the subscription of the current clinic mostly, but technically 
    // the user should be Owner of at least one Prestige clinic.
    // The RPC `create_clinic_branch` handles the strict check.
    // Here we can just show the button if they have 'prestige' in the current context or any clinic.
    const canCreateBranch = clinics.some(c => c.plan === 'enterprise') || subscription?.plan === 'enterprise'

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-secondary-theme transition-all border border-transparent hover:border-theme group"
            >
                <div className="flex items-center gap-3 min-w-0 text-left">
                    <div className="w-10 h-10 bg-secondary-theme rounded-xl flex items-center justify-center shrink-0 border border-theme">
                        <Building2 className="w-5 h-5 text-[#FF2E88]" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-primary-theme truncate leading-tight">
                            {currentClinic?.clinic_name || 'Mi Clínica'}
                        </p>
                        <p className="text-[10px] text-secondary-theme font-black uppercase tracking-widest leading-tight mt-0.5">
                            {currentClinic?.role === 'owner' ? 'Dueño' : 'Equipo'}
                        </p>
                    </div>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-secondary-theme opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-secondary-theme rounded-xl shadow-2xl border border-theme z-50 py-1 max-h-80 overflow-auto animate-slide-up">
                        <div className="px-3 py-2 text-[10px] font-black text-secondary-theme uppercase tracking-widest border-b border-theme mb-1">
                            Sucursales
                        </div>

                        {clinics.map((clinic) => (
                            <button
                                key={clinic.clinic_id}
                                onClick={() => handleSwitch(clinic.clinic_id)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-white/5",
                                    clinic.clinic_id === profile?.clinic_id ? "bg-[rgba(255,46,136,0.05)] text-[#FF2E88]" : "text-secondary-theme"
                                )}
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 truncate">
                                        <Building2 className="w-3.5 h-3.5 opacity-50" />
                                        <span className="truncate font-bold">{clinic.clinic_name}</span>
                                    </div>
                                    {clinic.address && (
                                        <p className="text-[10px] opacity-60 truncate pl-5.5 font-medium">
                                            {clinic.address}
                                        </p>
                                    )}
                                </div>
                                {clinic.clinic_id === profile?.clinic_id && (
                                    <Check className="w-3.5 h-3.5 text-[#FF2E88] shrink-0" />
                                )}
                            </button>
                        ))}

                        {canCreateBranch && (
                            <div className="border-t border-theme mt-1 pt-1 px-1">
                                <button
                                    onClick={() => {
                                        setIsOpen(false)
                                        setShowCreateModal(true)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-3 text-[11px] font-black uppercase tracking-widest text-secondary-theme hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nueva Sucursal
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            <CreateBranchModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    // Refresh handled by modal's internal switchClinic
                }}
            />
        </div>
    )
}

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, History, Zap } from 'lucide-react'
import { AITransactionHistory } from '@/components/dashboard/AITransactionHistory'
import { useProfile } from '../hooks/useProfile'

const AICreditsPage: React.FC = () => {
    const navigate = useNavigate()
    const { profile } = useProfile()

    return (
        <div className="min-h-screen bg-primary-theme/5 p-4 md:p-8 animate-fade-in">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <button 
                    onClick={() => navigate('/settings?tab=ai')}
                    className="flex items-center gap-2 text-primary-theme/50 hover:text-[#FF2E88] transition-colors mb-6 group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-widest">Volver a Configuración</span>
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg border border-indigo-500/20">
                        <History className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-primary-theme tracking-tight">Historial de Créditos IA</h1>
                        <p className="text-sm text-primary-theme/50 font-medium italic">Control detallado de recargas mensuales y consumos por mensaje.</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                    {profile?.clinic_id ? (
                        <div className="card-premium p-1">
                            <AITransactionHistory clinicId={profile.clinic_id} />
                        </div>
                    ) : (
                        <div className="card-premium p-12 text-center">
                            <div className="w-16 h-16 bg-primary-theme/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-8 h-8 text-primary-theme/20" />
                            </div>
                            <p className="text-primary-theme/40 font-bold italic">Cargando información de la clínica...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AICreditsPage

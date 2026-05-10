import React from 'react'
import { 
    Zap, 
    Sparkles, 
    ToggleLeft, 
    Save, 
    Loader2, 
    CheckCircle2, 
    CreditCard,
    Plus,
    History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AITransactionHistory } from '@/components/dashboard/AITransactionHistory'

interface AISettingsTabProps {
    aiAutoRespond: boolean;
    setAiAutoRespond: (val: boolean) => void;
    aiStrategy: 'eco' | 'auto' | 'pro';
    setAiStrategy: (val: 'eco' | 'auto' | 'pro') => void;
    handleSaveAI: () => void;
    savingAI: boolean;
    aiSaved: boolean;
    aiCreditsLimit: number;
    aiCreditsExtra: number;
    aiCreditsUsed: number;
    paymentRegion: 'chile' | 'international';
    handleBuyCredits: (packId: string) => void;
    profile: any;
}

export const AISettingsTab: React.FC<AISettingsTabProps> = ({
    aiAutoRespond,
    setAiAutoRespond,
    aiStrategy,
    setAiStrategy,
    handleSaveAI,
    savingAI,
    aiSaved,
    aiCreditsLimit,
    aiCreditsExtra,
    aiCreditsUsed,
    profile
}) => {
    return (
        <div className="space-y-6">
            {/* Hybrid Router Header */}
            <div className="card-premium p-6 bg-secondary-theme/30 border-theme">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-600 rounded-soft flex items-center justify-center shadow-lg shadow-violet-200">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-primary-theme">Citenly Hybrid Intelligence</h2>
                            <p className="text-sm text-primary-theme/50">Motor de ruteo inteligente de modelos AI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-primary-theme/40 uppercase tracking-widest">Atención Automática</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={aiAutoRespond}
                                onChange={(e) => setAiAutoRespond(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-charcoal/20 dark:bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#FF2E88] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { id: 'eco', title: 'Ahorro Máximo', desc: 'Fuerza al sistema a mantenerse en Nivel 1.', icon: ToggleLeft, color: 'emerald' },
                        { id: 'auto', title: 'Híbrido Automático', desc: 'Enrutador inteligente (Recomendado).', icon: Sparkles, color: 'violet', badge: 'Popular' },
                        { id: 'pro', title: 'Máximo Poder', desc: 'Fuerza el uso de modelos Pro siempre.', icon: Zap, color: 'orange' },
                    ].map((strat) => (
                        <button
                            key={strat.id}
                            onClick={() => setAiStrategy(strat.id as any)}
                            className={cn(
                                "p-4 rounded-soft border-2 text-left transition-all relative group",
                                aiStrategy === strat.id 
                                    ? `bg-primary-theme border-[#FF2E88] shadow-md ring-1 ring-[#FF2E88]/50`
                                    : "bg-secondary-theme border-theme hover:border-[#FF2E88]/30"
                            )}
                        >
                            {strat.badge && (
                                <span className="absolute -top-2 -right-2 bg-violet-600 text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                    {strat.badge}
                                </span>
                            )}
                            <div className="flex items-center gap-3 mb-2">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    aiStrategy === strat.id ? `bg-violet-500 text-white` : "bg-secondary-theme text-primary-theme/40"
                                )}>
                                    <strat.icon className="w-4 h-4" />
                                </div>
                                <h3 className={cn("font-bold text-sm", aiStrategy === strat.id ? `text-[#FF2E88]` : "text-primary-theme")}>
                                    {strat.title}
                                </h3>
                            </div>
                            <p className="text-xs text-primary-theme/50 leading-relaxed">{strat.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-violet-100 flex items-center gap-4">
                    <button
                        onClick={handleSaveAI}
                        disabled={savingAI}
                        className="btn-premium-primary bg-violet-600 hover:bg-violet-700 flex items-center gap-2 shadow-lg shadow-violet-200"
                    >
                        {savingAI ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Guardar Configuración</>
                        )}
                    </button>
                    {aiSaved && (
                        <div className="flex items-center gap-2 text-[#FF2E88] text-sm animate-fade-in bg-[#FF2E88]/10 px-4 py-2 rounded-soft border border-[#FF2E88]/20">
                            <CheckCircle2 className="w-4 h-4" />
                            ¡Configuración guardada!
                        </div>
                    )}
                </div>
            </div>

            {/* Credits Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-premium p-6 border-l-4 border-l-[#FF2E88] bg-secondary-theme/50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-50 rounded-soft flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-primary-theme">Citenly Credits</h3>
                                <p className="text-xs text-primary-theme/50">Saldo unificado de IA</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary-theme">{(aiCreditsLimit + aiCreditsExtra) - aiCreditsUsed}</span>
                            <p className="text-[10px] text-primary-theme/40 font-bold uppercase">Disponibles</p>
                        </div>
                    </div>
                </div>

                <div className="card-premium p-6 bg-secondary-theme/50 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-primary-theme mb-4 uppercase tracking-wider text-primary-theme/40">Costos de Consumo</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold p-2 bg-emerald-50 rounded-soft">
                            <span>N1 (Social/Básico)</span>
                            <span>1x Crédito</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold p-2 bg-violet-50 rounded-soft">
                            <span>N2 (Información)</span>
                            <span>8x Créditos</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold p-2 bg-orange-50 rounded-soft">
                            <span>N3 (Agendamiento)</span>
                            <span>60x Créditos</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History Section */}
            <div className="mt-8 border-t border-theme pt-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-soft flex items-center justify-center shadow-lg shrink-0">
                        <History className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-primary-theme">Historial de Transacciones</h2>
                        <p className="text-sm text-secondary-theme font-medium">Transparencia total en tus consumos y recargas.</p>
                    </div>
                </div>
                
                {profile?.clinic_id && (
                    <AITransactionHistory clinicId={profile.clinic_id} />
                )}
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import {
    Star,
    Users,
    Bell,
    TrendingUp,
    Plus,
    Minus,
    Search,
    Award,
    Gift,
    Target,
    Loader2,
    Share2,
    Settings as SettingsIcon,
    ShoppingBag,
    Coins,
    DollarSign,
    Percent,
    Calculator,
    Trophy,
    History as HistoryIcon
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { loyaltyService, LoyaltySettings, LoyaltyReward } from '@/services/loyaltyService'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { LoyaltyRewardModal } from '@/components/loyalty/LoyaltyRewardModal'

export default function Loyalty() {
    const { profile } = useAuth()
    const [activeTab, setActiveTab] = useState<'points' | 'referrals' | 'rewards' | 'alerts' | 'settings'>('points')
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<LoyaltySettings | null>(null)
    const [rewards, setRewards] = useState<LoyaltyReward[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
    
    // Stats for the header
    const [stats, setStats] = useState({
        totalPointsDist: 0,
        totalReferrals: 0,
        activeAlerts: 0
    })

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.clinic_id) return
            setLoading(true)
            try {
                const [s, pData, rData] = await Promise.all([
                    loyaltyService.getSettings(profile.clinic_id),
                    supabase
                        .from('patients')
                        .select('*')
                        .eq('clinic_id', profile.clinic_id)
                        .order('loyalty_points', { ascending: false }),
                    loyaltyService.getRewards(profile.clinic_id)
                ])
                setSettings(s)
                setPatients(pData.data || [])
                setRewards(rData || [])
                
                // Calculate basic stats
                const totalPoints = (pData.data || []).reduce((acc, p: any) => acc + (p.loyalty_points || 0), 0)
                const totalRefs = (pData.data || []).reduce((acc, p: any) => acc + (p.referral_count || 0), 0)
                
                setStats({
                    totalPointsDist: totalPoints,
                    totalReferrals: (pData.data || []).filter((p: any) => (p.referral_count || 0) > 0).length,
                    activeAlerts: (rData || []).filter((r: any) => r.is_active).length
                })
            } catch (error) {
                console.error('Error fetching loyalty data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [profile?.clinic_id])

    const fetchRewards = async () => {
        if (!profile?.clinic_id) return
        try {
            const rData = await loyaltyService.getRewards(profile.clinic_id)
            setRewards(rData || [])
        } catch (error) {
            console.error('Error fetching rewards:', error)
        }
    }

    const handleAdjustPoints = async (patientId: string, amount: number, isAdding: boolean) => {
        if (!profile?.clinic_id) return;
        const finalAmount = isAdding ? amount : -amount;
        
        try {
            // 1. Get current points
            const { data: pData } = await supabase
                .from('patients')
                .select('loyalty_points')
                .eq('id', patientId)
                .single();
            
            const currentPoints = pData?.loyalty_points || 0;
            const newPoints = currentPoints + finalAmount;

            // 2. Update player balance
            const { error: pError } = await supabase
                .from('patients')
                .update({ loyalty_points: newPoints })
                .eq('id', patientId);
            
            if (pError) throw pError;

            // 3. Log transaction (using 'bonus' as a safe existing enum value)
            const { error: logError } = await (supabase as any)
                .from('loyalty_transactions')
                .insert({
                    clinic_id: profile.clinic_id,
                    patient_id: patientId,
                    points: finalAmount,
                    type: 'bonus',
                    description: isAdding ? 'Ajuste manual (crédito)' : 'Ajuste manual (débito)'
                });
            
            if (logError) throw logError;
            
            toast.success('Puntos ajustados');
            fetchData();
        } catch (error) {
            console.error('Error adjusting points:', error);
            toast.error('Error al ajustar puntos');
        }
    };

    const copyReferralLink = (code: string) => {
        const link = `${window.location.origin}/r/${code}`
        navigator.clipboard.writeText(link)
        toast.success('¡Enlace mágico copiado!')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    const filteredPatients = patients.filter(p => 
        (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         p.phone_number?.includes(searchQuery))
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Premium Gold Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700 rounded-softer p-6 text-white shadow-soft-lg">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-900/20 rounded-full blur-3xl" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-amber-200 fill-amber-300" />
                            <h1 className="text-2xl font-bold">Fidelización & Referidos</h1>
                        </div>
                        <p className="text-amber-100 text-sm max-w-md">
                            Gestiona el programa de lealtad de tu clínica. Premia a tus mejores pacientes y fomenta el crecimiento orgánico.
                        </p>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        <div className="bg-white/10 backdrop-blur-md rounded-soft p-4 min-w-[140px] border border-white/10">
                            <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">{settings?.loyalty_points_name || 'Saldo'} Total</p>
                            <p className="text-2xl font-black">{stats.totalPointsDist.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-soft p-4 min-w-[140px] border border-white/10">
                            <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">Referidores</p>
                            <p className="text-2xl font-black">{stats.totalReferrals}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-soft p-4 min-w-[140px] border border-white/10">
                            <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">Recompensas</p>
                            <p className="text-2xl font-black">{stats.activeAlerts}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex items-center gap-1 p-1 bg-ivory rounded-full border border-silk-beige w-full md:w-fit overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('points')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-black transition-all whitespace-nowrap",
                        activeTab === 'points' ? "bg-primary-500 text-white shadow-md" : "text-charcoal/40 hover:text-charcoal"
                    )}
                >
                    <Gift className="w-3.5 h-3.5" />
                    Billetera
                </button>
                <button
                    onClick={() => setActiveTab('referrals')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-black transition-all whitespace-nowrap",
                        activeTab === 'referrals' ? "bg-primary-500 text-white shadow-md" : "text-charcoal/40 hover:text-charcoal"
                    )}
                >
                    <Users className="w-3.5 h-3.5" />
                    Referidos
                </button>
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-black transition-all whitespace-nowrap",
                        activeTab === 'rewards' ? "bg-primary-500 text-white shadow-md" : "text-charcoal/40 hover:text-charcoal"
                    )}
                >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Catálogo
                </button>
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-black transition-all whitespace-nowrap",
                        activeTab === 'alerts' ? "bg-primary-500 text-white shadow-md" : "text-charcoal/40 hover:text-charcoal"
                    )}
                >
                    <HistoryIcon className="w-3.5 h-3.5" />
                    Historial
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-black transition-all whitespace-nowrap",
                        activeTab === 'settings' ? "bg-primary-500 text-white shadow-md" : "text-charcoal/40 hover:text-charcoal"
                    )}
                >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    Ajustes
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'points' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                            <input
                                type="text"
                                placeholder="Buscar paciente..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-silk-beige rounded-soft text-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-charcoal/40 bg-silk-beige/30 px-4 py-2 rounded-full">
                            <TrendingUp className="w-3 h-3" />
                            REGLA ACTUAL: {settings?.loyalty_points_percentage}% DE ACUMULACIÓN
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPatients.map((patient) => (
                            <div key={patient.id} className="bg-white rounded-softer p-5 border border-silk-beige shadow-soft-sm hover:shadow-soft-md transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-ivory rounded-full flex items-center justify-center text-primary-600 font-bold border border-silk-beige">
                                            {patient.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-charcoal">{patient.name}</p>
                                            <div className="flex flex-col">
                                                <p className="text-xs text-charcoal/40 uppercase tracking-tight">{patient.phone_number}</p>
                                                <p className="text-xs font-bold text-primary-500 uppercase tracking-tight">Cód: {patient.referral_code || '---'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {patient.loyalty_points >= 5000 && (
                                        <Award className="w-5 h-5 text-amber-500" />
                                    )}
                                </div>
                                
                                <div className="bg-ivory rounded-soft p-3 flex items-center justify-between mb-4 border border-silk-beige/50">
                                    <div>
                                        <p className="text-xs font-black text-charcoal/30 uppercase tracking-widest">Saldo Actual</p>
                                        <p className="text-xl font-black text-charcoal">{patient.loyalty_points || 0} <span className="text-sm font-bold text-primary-500">{settings?.loyalty_currency_symbol || 'pts'}</span></p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleAdjustPoints(patient.id, 500, false)}
                                            className="p-2 bg-white text-red-500 hover:bg-red-50 rounded-soft border border-silk-beige shadow-sm transition-colors"
                                            title="Eliminar 500 puntos"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleAdjustPoints(patient.id, 500, true)}
                                            className="p-2 bg-white text-emerald-500 hover:bg-emerald-50 rounded-soft border border-silk-beige shadow-sm transition-colors"
                                            title="Añadir 500 puntos"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs font-medium text-charcoal/50">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                copyReferralLink(patient.referral_code || '');
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-full text-xs font-bold hover:bg-primary-100 transition-colors"
                                            title="Copiar enlace para el paciente"
                                        >
                                            <Share2 className="w-3 h-3" />
                                            Magic Link
                                        </button>
                                        <button className="text-charcoal/40 hover:text-charcoal transition-colors">Ver Historial</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'referrals' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 card-soft p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-charcoal">Ranking de Embajadores</h3>
                                <div className="flex items-center gap-2 text-primary-500 bg-primary-50 px-3 py-1.5 rounded-full text-xs font-bold">
                                    <Award className="w-4 h-4" />
                                    Bono: {settings?.loyalty_referral_bonus} {settings?.loyalty_currency_symbol || 'pts'} / amigo referido
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {patients.filter(p => p.referral_count > 0)
                                    .sort((a, b) => b.referral_count - a.referral_count)
                                    .slice(0, 10)
                                    .map((ambassador, idx) => (
                                    <div key={ambassador.id} className="flex items-center gap-4 p-4 bg-ivory rounded-soft border border-silk-beige/50 hover:border-primary-200 transition-all">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                                            idx === 0 ? "bg-amber-500 text-white" : "bg-silk-beige text-charcoal/50"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-charcoal">{ambassador.name}</p>
                                            <p className="text-xs text-charcoal/40">Código: <span className="font-mono text-primary-500">{ambassador.referral_code}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-charcoal">{ambassador.referral_count}</p>
                                            <p className="text-xs font-black text-charcoal/30 uppercase">Amigos Referidos</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-softer p-6 text-white shadow-soft-md">
                                <Target className="w-8 h-8 mb-4 text-indigo-200" />
                                <h3 className="text-lg font-bold mb-2 text-amber-200">Manual de Embajadores</h3>
                                <p className="text-sm text-indigo-50/80 mb-4">
                                    Cada paciente tiene un código único. Cuando un amigo lo mencione o use su link en el Chat IA, ambos reciben beneficios.
                                </p>
                                <Link 
                                    to="/app/templates"
                                    className="w-full h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-soft text-sm font-bold transition-all border border-white/20"
                                >
                                    Personalizar Mensajes
                                </Link>
                            </div>
                            
                            <div className="bg-white rounded-softer p-6 border border-silk-beige shadow-soft-sm">
                                <h3 className="font-bold text-charcoal mb-4">¿Cómo funciona?</h3>
                                <ul className="space-y-3">
                                    <li className="flex gap-2 text-xs text-charcoal/60">
                                        <span className="text-primary-500 font-bold">1.</span>
                                        El paciente comparte su "Magic Link" con un amigo.
                                    </li>
                                    <li className="flex gap-2 text-xs text-charcoal/60">
                                        <span className="text-primary-500 font-bold">2.</span>
                                        El amigo agenda su primera cita usando ese enlace.
                                    </li>
                                    <li className="flex gap-2 text-xs text-charcoal/60">
                                        <span className="text-primary-500 font-bold">3.</span>
                                        Al concretar la cita, el amigo recibe su bono de bienvenida y el referente recibe su bono por invitar.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'rewards' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-charcoal tracking-tight">Catálogo de Recompensas</h2>
                            <p className="text-sm text-charcoal/50">Define lo que tus pacientes pueden canjear con su saldo acumulado.</p>
                        </div>
                        <button 
                            onClick={() => setIsRewardModalOpen(true)}
                            className="flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-full font-black text-sm shadow-md hover:bg-primary-600 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Recompensa
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rewards.length > 0 ? rewards.map(reward => (
                            <div key={reward.id} className="card-soft overflow-hidden group">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-primary-50 rounded-soft text-primary-600">
                                            {reward.reward_type === 'money' && <DollarSign className="w-6 h-6" />}
                                            {reward.reward_type === 'percentage' && <Percent className="w-6 h-6" />}
                                            {(reward.reward_type === 'gift' || reward.reward_type === 'treatment') && <Gift className="w-6 h-6" />}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-charcoal">{reward.points_cost}</p>
                                            <p className="text-xs font-black text-charcoal/30 uppercase">{settings?.loyalty_points_name || 'puntos'}</p>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-charcoal mb-1">{reward.name}</h3>
                                    <p className="text-xs text-charcoal/50 mb-4 line-clamp-2">{reward.description || 'Sin descripción'}</p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-silk-beige">
                                        <div className="text-xs font-black uppercase text-emerald-500">
                                            {reward.is_active ? 'Activa' : 'Inactiva'}
                                        </div>
                                        <button className="text-xs font-black uppercase text-charcoal/30 hover:text-charcoal transition-colors">Editar</button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-charcoal/30 border-2 border-dashed border-silk-beige rounded-softer bg-ivory">
                                <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-sm">No hay recompensas configuradas</p>
                                <p className="text-xs">Crea tu primer beneficio para que los pacientes puedan canjear.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-white rounded-softer border border-silk-beige p-8 shadow-soft-sm">
                            <h3 className="text-xl font-black text-charcoal mb-6 flex items-center gap-2">
                                <Calculator className="w-6 h-6 text-primary-500" />
                                Configuración del Programa
                            </h3>
                            
                            <div className="space-y-8">
                                <div>
                                    <label className="text-xs font-black text-charcoal uppercase tracking-widest block mb-4">Modo del Programa</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'points', icon: Coins, label: 'Puntos Clásicos', desc: 'Acumula puntos para canjear en el catálogo.' },
                                            { id: 'money', icon: DollarSign, label: 'Dinero (Cashback)', desc: 'Acumula saldo en dinero real para el monedero.' },
                                            { id: 'percentage', icon: Percent, label: '% Descuento', desc: 'Acumula porcentaje de descuento para la próxima cita.' },
                                        ].map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => setSettings(s => {
                                                    if (!s) return null;
                                                    let newName = s.loyalty_points_name;
                                                    let newSymbol = s.loyalty_currency_symbol;
                                                    
                                                    // Auto-fill logic based on mode
                                                    if (mode.id === 'points') { newName = 'Puntos'; newSymbol = 'pts'; }
                                                    else if (mode.id === 'money') { newName = 'Saldo'; newSymbol = '$'; }
                                                    else if (mode.id === 'percentage') { newName = 'Descuento'; newSymbol = '%'; }
                                                    
                                                    return { 
                                                        ...s, 
                                                        loyalty_program_mode: mode.id as any,
                                                        loyalty_points_name: newName,
                                                        loyalty_currency_symbol: newSymbol
                                                    };
                                                })}
                                                className={cn(
                                                    "flex flex-col items-center text-center p-6 rounded-softer border-2 transition-all",
                                                    settings?.loyalty_program_mode === mode.id 
                                                        ? "border-primary-500 bg-primary-50 shadow-inner" 
                                                        : "border-silk-beige bg-white hover:border-silk-beige/80"
                                                )}
                                            >
                                                <mode.icon className={cn("w-8 h-8 mb-4", settings?.loyalty_program_mode === mode.id ? "text-primary-500" : "text-charcoal/30")} />
                                                <p className="font-bold text-sm mb-1">{mode.label}</p>
                                                <p className="text-xs text-charcoal/40 font-medium leading-tight">{mode.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-black text-charcoal uppercase tracking-widest block mb-1">Nombre de la Unidad</label>
                                        <p className="text-xs text-charcoal/40 mb-2">Ej: Puntos, Estrellas, Coins, $</p>
                                        <input 
                                            type="text" 
                                            value={settings?.loyalty_points_name} 
                                            onChange={(e) => setSettings(s => s ? { ...s, loyalty_points_name: e.target.value } : null)}
                                            className="w-full h-11 px-4 bg-ivory border border-silk-beige rounded-soft text-sm focus:outline-none focus:ring-2 focus:ring-primary-100" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-charcoal uppercase tracking-widest block mb-1">Símbolo</label>
                                        <p className="text-xs text-charcoal/40 mb-2">Se mostrará junto al saldo</p>
                                        <input 
                                            type="text" 
                                            value={settings?.loyalty_currency_symbol} 
                                            onChange={(e) => setSettings(s => s ? { ...s, loyalty_currency_symbol: e.target.value } : null)}
                                            className="w-full h-11 px-4 bg-ivory border border-silk-beige rounded-soft text-sm focus:outline-none focus:ring-2 focus:ring-primary-100" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={async () => {
                                    if (!profile?.clinic_id || !settings) return
                                    try {
                                        await loyaltyService.updateSettings(profile.clinic_id, settings)
                                        toast.success('Configuración guardada')
                                    } catch (error) {
                                        toast.error('Error al guardar configuración')
                                    }
                                }}
                                className="px-8 py-3 bg-charcoal text-white rounded-full font-black text-sm hover:bg-charcoal/90 transition-all shadow-lg"
                            >
                                Aplicar Cambios Globales
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-amber-500 rounded-softer p-6 text-white shadow-soft-md">
                            <Trophy className="w-8 h-8 mb-4 text-amber-200" />
                            <h3 className="text-lg font-bold mb-2">Reglas de Bienvenida</h3>
                            <p className="text-sm text-amber-100 mb-6">
                                Define cuántos {settings?.loyalty_points_name} recibe un paciente la primera vez que agenda.
                            </p>
                            <div className="bg-white/10 rounded-soft p-4 border border-white/20">
                                <label className="text-xs uppercase font-black mb-2 block tracking-widest opacity-70">Bono Actual</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black">{settings?.loyalty_welcome_bonus}</span>
                                    <span className="text-xs opacity-70 uppercase font-bold">{settings?.loyalty_currency_symbol}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-softer p-6 shadow-soft-md text-white border border-indigo-400">
                            <h4 className="font-bold mb-4 tracking-tight flex items-center gap-2">
                                <Coins className="w-5 h-5 text-amber-200" />
                                <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                                    Reglas de Ganancia
                                </span>
                            </h4>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-black text-indigo-200 uppercase block mb-1 tracking-widest opacity-80">Bono por Referir (Al Referente)</label>
                                    <p className="text-xs text-indigo-100/60 mb-2 leading-tight">Lo que gana la persona que comparte su código.</p>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={settings?.loyalty_referral_bonus} 
                                            onChange={(e) => setSettings(s => s ? { ...s, loyalty_referral_bonus: parseInt(e.target.value) } : null)}
                                            className="w-full h-10 pl-4 pr-12 bg-white/10 border border-white/20 rounded-soft text-sm font-bold text-white focus:bg-white/20 transition-all outline-none" 
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-200 opacity-60">{settings?.loyalty_currency_symbol}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-indigo-200 uppercase block mb-1 tracking-widest opacity-80">Bono de Bienvenida (Al Referido)</label>
                                    <p className="text-xs text-indigo-100/60 mb-2 leading-tight">Lo que gana el nuevo cliente al llegar por invitación.</p>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={settings?.loyalty_welcome_bonus} 
                                            onChange={(e) => setSettings(s => s ? { ...s, loyalty_welcome_bonus: parseInt(e.target.value) } : null)}
                                            className="w-full h-10 pl-4 pr-12 bg-white/10 border border-white/20 rounded-soft text-sm font-bold text-white focus:bg-white/20 transition-all outline-none" 
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-200 opacity-60">{settings?.loyalty_currency_symbol}</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-white/10">
                                    <label className="text-xs font-black text-indigo-200 uppercase block mb-1 tracking-widest opacity-80">Cashback / Acumulación (%)</label>
                                    <p className="text-xs text-indigo-100/60 mb-2 leading-tight">Lo que el cliente acumula por sí mismo en cada cita.</p>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={settings?.loyalty_points_percentage} 
                                            onChange={(e) => setSettings(s => s ? { ...s, loyalty_points_percentage: parseFloat(e.target.value) } : null)}
                                            className="w-full h-10 pl-4 pr-12 bg-white/10 border border-white/20 rounded-soft text-sm font-bold text-white focus:bg-white/20 transition-all outline-none" 
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-200 opacity-60">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isRewardModalOpen && profile?.clinic_id && (
                <LoyaltyRewardModal
                    clinicId={profile.clinic_id}
                    pointsName={settings?.loyalty_points_name}
                    onClose={() => setIsRewardModalOpen(false)}
                    onSave={fetchRewards}
                />
            )}
        </div>
    )
}

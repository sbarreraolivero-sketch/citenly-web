import { useState, useEffect } from 'react'
import {
    Star,
    Users,
    TrendingUp,
    Plus,
    Minus,
    Search,
    Award,
    Gift,
    Target,
    Loader2,
    Share2,
    Save,
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
    const [transactions, setTransactions] = useState<any[]>([])

    // Stats for the header
    const [stats, setStats] = useState({
        totalPointsDist: 0,
        totalReferrals: 0,
        activeAlerts: 0
    })

    const [patientAmounts, setPatientAmounts] = useState<Record<string, string>>({});
    const [pendingAdjustments, setPendingAdjustments] = useState<Record<string, number>>({});

    const fetchData = async () => {
        if (!profile?.clinic_id) return
        setLoading(true)
        try {
            const [s, pData, rData, tData] = await Promise.all([
                loyaltyService.getSettings(profile.clinic_id),
                (supabase as any)
                    .from('patients')
                    .select('*')
                    .eq('clinic_id', profile.clinic_id)
                    .order('loyalty_points', { ascending: false }),
                loyaltyService.getRewards(profile.clinic_id),
                (supabase as any)
                    .from('loyalty_transactions')
                    .select('*, patients(name)')
                    .eq('clinic_id', profile.clinic_id)
                    .order('created_at', { ascending: false })
                    .limit(50)
            ])
            setSettings(s)
            setPatients(pData.data || [])
            setRewards(rData || [])
            setTransactions(tData.data || [])

            // Calculate basic stats
            const totalPoints = (pData.data || []).reduce((acc: number, p: any) => acc + (p.loyalty_points || 0), 0)

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

    useEffect(() => {
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

    const handleAdjustPoints = (patientId: string, amountStr: string, isAdding: boolean) => {
        const amount = parseInt(amountStr || '0');
        if (!profile?.clinic_id || amount <= 0) return;

        const finalAmount = isAdding ? amount : -amount;

        // 1. UPDATE LOCAL UI IMMEDIATELY (Live Sum)
        setPatients(prev => prev.map(p =>
            p.id === patientId
                ? { ...p, loyalty_points: (p.loyalty_points || 0) + finalAmount }
                : p
        ));

        // 2. TRACK PENDING CHANGE (Do NOT call API yet)
        setPendingAdjustments(prev => ({
            ...prev,
            [patientId]: (prev[patientId] || 0) + finalAmount
        }));

        // 3. Clear the input for this patient
        setPatientAmounts(prev => ({ ...prev, [patientId]: '0' }));

        toast.success(`Ajuste local de ${finalAmount} listo para guardar`);
    };

    const savePendingAdjustments = async () => {
        if (!profile?.clinic_id || Object.keys(pendingAdjustments).length === 0) return;

        setLoading(true);
        const patientIds = Object.keys(pendingAdjustments);

        try {
            // Process all pending adjustments
            for (const pId of patientIds) {
                const points = pendingAdjustments[pId];
                if (points === 0) continue;

                const { error } = await (supabase as any)
                    .from('loyalty_transactions')
                    .insert({
                        clinic_id: profile.clinic_id,
                        patient_id: pId,
                        points: points,
                        type: 'adjustment',
                        description: points > 0 ? 'Ajuste manual (crédito)' : 'Ajuste manual (débito)'
                    });

                if (error) throw error;
            }

            setPendingAdjustments({});
            toast.success('Todos los movimientos guardados en la nube');
            await fetchData(); // Final sync after everything is done
        } catch (error) {
            console.error('Error saving adjustments:', error);
            toast.error('Ocurrió un error al guardar. Algunos cambios podrían no haberse guardado.');
            await fetchData();
        } finally {
            setLoading(false);
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
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
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
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700 rounded-softer p-6 text-white shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-900/20 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-amber-200 fill-amber-300" />
                            <h1 className="text-2xl font-bold tracking-tight">Fidelización & Referidos</h1>
                        </div>
                        <p className="text-amber-100/90 text-sm max-w-md leading-relaxed">
                            Gestiona el programa de lealtad de tu clínica. Premia a tus mejores pacientes y fomenta el crecimiento orgánico.
                        </p>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        <div className="bg-white/10 backdrop-blur-md rounded-soft p-4 min-w-[140px] border border-white/20 shadow-inner">
                            <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-1">{settings?.loyalty_points_name || 'Saldo'} Total</p>
                            <p className="text-2xl font-black">{stats.totalPointsDist.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-soft p-4 min-w-[140px] border border-white/20 shadow-inner">
                            <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-1">Referidores</p>
                            <p className="text-2xl font-black">{stats.totalReferrals}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-soft p-4 min-w-[140px] border border-white/20 shadow-inner">
                            <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-1">Recompensas</p>
                            <p className="text-2xl font-black">{stats.activeAlerts}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex items-center gap-1 p-1 bg-secondary-theme rounded-full border border-theme w-full md:w-fit overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('points')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap",
                        activeTab === 'points' ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--glow)]" : "text-secondary-theme hover:text-primary-theme"
                    )}
                >
                    <Gift className="w-3.5 h-3.5" />
                    Billetera
                </button>
                <button
                    onClick={() => setActiveTab('referrals')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap",
                        activeTab === 'referrals' ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--glow)]" : "text-secondary-theme hover:text-primary-theme"
                    )}
                >
                    <Users className="w-3.5 h-3.5" />
                    Referidos
                </button>
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap",
                        activeTab === 'rewards' ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--glow)]" : "text-secondary-theme hover:text-primary-theme"
                    )}
                >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Catálogo
                </button>
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap",
                        activeTab === 'alerts' ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--glow)]" : "text-secondary-theme hover:text-primary-theme"
                    )}
                >
                    <HistoryIcon className="w-3.5 h-3.5" />
                    Historial
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap",
                        activeTab === 'settings' ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--glow)]" : "text-secondary-theme hover:text-primary-theme"
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
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-theme group-focus-within:text-[var(--accent-primary)] transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o celular..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-secondary-theme border border-theme rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all font-bold placeholder:text-secondary-theme text-primary-theme"
                            />
                        </div>
                        {Object.keys(pendingAdjustments).length > 0 && (
                            <button
                                onClick={savePendingAdjustments}
                                disabled={loading}
                                className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:bg-emerald-600 transition-all animate-in zoom-in-95 duration-200 hover:scale-105 active:scale-95"
                            >
                                <Save className="w-5 h-5" />
                                Guardar Movimientos ({Object.keys(pendingAdjustments).length})
                            </button>
                        )}
                        <div className="flex items-center gap-2 text-[10px] font-black text-secondary-theme bg-secondary-theme px-4 py-2 rounded-full border border-theme uppercase tracking-widest">
                            <TrendingUp className="w-3 h-3" />
                            REGLA ACTUAL: {settings?.loyalty_points_percentage}% DE ACUMULACIÓN
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPatients.map((patient) => (
                            <div key={patient.id} className="card-premium p-5 hover:shadow-[0_0_15px_var(--glow)] transition-all group border-theme">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-secondary-theme rounded-full flex items-center justify-center text-[var(--accent-primary)] font-bold border border-theme">
                                            {patient.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-primary-theme">{patient.name}</p>
                                            <div className="flex flex-col">
                                                <p className="text-[10px] text-secondary-theme uppercase tracking-widest">{patient.phone_number}</p>
                                                <p className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest">Cód: {patient.referral_code || '---'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {patient.loyalty_points >= 5000 && (
                                        <Award className="w-5 h-5 text-amber-500" />
                                    )}
                                </div>

                                <div className="bg-secondary-theme rounded-soft p-3 flex flex-col gap-3 mb-4 border border-theme">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-secondary-theme uppercase tracking-widest leading-none mb-1">Saldo Actual</p>
                                            <p className="text-xl font-black text-primary-theme">{patient.loyalty_points || 0} <span className="text-sm font-bold text-[var(--accent-primary)]">{settings?.loyalty_currency_symbol || 'pts'}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-secondary-theme uppercase tracking-widest leading-none mb-1">Referidos</p>
                                            <p className="text-sm font-black text-primary-theme">{patient.referral_count || 0}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-theme">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                value={patientAmounts[patient.id] === '0' ? '' : (patientAmounts[patient.id] || '')}
                                                onChange={(e) => setPatientAmounts(prev => ({ ...prev, [patient.id]: e.target.value }))}
                                                onBlur={(e) => {
                                                    if (!e.target.value) setPatientAmounts(prev => ({ ...prev, [patient.id]: '0' }));
                                                }}
                                                className="w-full h-9 pl-3 pr-2 bg-primary-theme border border-theme rounded-soft text-xs font-black focus:ring-1 focus:ring-[var(--accent-primary)] outline-none placeholder:text-secondary-theme text-primary-theme"
                                                placeholder="Monto"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleAdjustPoints(patient.id, patientAmounts[patient.id] || '0', false)}
                                                className="h-9 px-3 bg-secondary-theme text-red-500 hover:bg-red-500/10 rounded-soft border border-theme shadow-sm transition-all hover:scale-105 active:scale-95"
                                                title="Quitar saldo personalizado"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleAdjustPoints(patient.id, patientAmounts[patient.id] || '0', true)}
                                                className="h-9 px-3 bg-secondary-theme text-emerald-500 hover:bg-emerald-500/10 rounded-soft border border-theme shadow-sm transition-all hover:scale-105 active:scale-95"
                                                title="Sumar saldo personalizado"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs font-medium text-secondary-theme">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                copyReferralLink(patient.referral_code || '');
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[var(--accent-primary)]/20 transition-colors"
                                            title="Copiar enlace para el paciente"
                                        >
                                            <Share2 className="w-3 h-3" />
                                            Magic Link
                                        </button>
                                        <button className="text-secondary-theme hover:text-primary-theme transition-colors font-bold">Ver Historial</button>
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
                        <div className="lg:col-span-2 card-premium p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-primary-theme">Ranking de Embajadores</h3>
                                <div className="flex items-center gap-2 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <Award className="w-4 h-4" />
                                    Bono: {settings?.loyalty_referral_bonus} {settings?.loyalty_currency_symbol || 'pts'} / amigo referido
                                </div>
                            </div>

                            <div className="space-y-4">
                                {patients.filter(p => p.referral_count > 0)
                                    .sort((a, b) => b.referral_count - a.referral_count)
                                    .slice(0, 10)
                                    .map((ambassador, idx) => (
                                        <div key={ambassador.id} className="flex items-center gap-4 p-4 bg-secondary-theme rounded-soft border border-theme hover:border-[var(--accent-primary)] transition-all">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                                                idx === 0 ? "bg-amber-500 text-white" : "bg-primary-theme text-secondary-theme border border-theme"
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-primary-theme">{ambassador.name}</p>
                                                <p className="text-[10px] text-secondary-theme uppercase tracking-widest font-black">Código: <span className="font-mono text-[var(--accent-primary)]">{ambassador.referral_code}</span></p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-primary-theme">{ambassador.referral_count}</p>
                                                <p className="text-[10px] font-black text-secondary-theme uppercase tracking-widest leading-none">Amigos Referidos</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-softer p-6 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)]">
                                <Target className="w-8 h-8 mb-4 text-indigo-200" />
                                <h3 className="text-lg font-bold mb-2 text-amber-200 tracking-tight">Manual de Embajadores</h3>
                                <p className="text-sm text-indigo-50/80 mb-4 leading-relaxed">
                                    Cada paciente tiene un código único. Cuando un amigo lo mencione o use su link en el Chat IA, ambos reciben beneficios.
                                </p>
                                <Link
                                    to="/app/templates"
                                    className="w-full h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-soft text-sm font-bold transition-all border border-white/20"
                                >
                                    Personalizar Mensajes
                                </Link>
                            </div>

                            <div className="card-premium p-6 border-theme">
                                <h3 className="font-bold text-primary-theme mb-4">¿Cómo funciona?</h3>
                                <ul className="space-y-4">
                                    <li className="flex gap-3 text-xs text-secondary-theme leading-relaxed">
                                        <span className="text-[var(--accent-primary)] font-black text-[10px] bg-[var(--accent-primary)]/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                                        El paciente comparte su "Magic Link" con un amigo.
                                    </li>
                                    <li className="flex gap-3 text-xs text-secondary-theme leading-relaxed">
                                        <span className="text-[var(--accent-primary)] font-black text-[10px] bg-[var(--accent-primary)]/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                                        El amigo agenda su primera cita usando ese enlace.
                                    </li>
                                    <li className="flex gap-3 text-xs text-secondary-theme leading-relaxed">
                                        <span className="text-[var(--accent-primary)] font-black text-[10px] bg-[var(--accent-primary)]/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
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
                            <h2 className="text-2xl font-black text-primary-theme tracking-tight">Catálogo de Recompensas</h2>
                            <p className="text-sm text-secondary-theme">Define lo que tus pacientes pueden canjear con su saldo acumulado.</p>
                        </div>
                        <button
                            onClick={() => setIsRewardModalOpen(true)}
                            className="btn-premium-primary"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Recompensa
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rewards.length > 0 ? rewards.map(reward => (
                            <div key={reward.id} className="card-premium overflow-hidden group hover:shadow-[0_0_20px_var(--glow)] transition-all border-theme">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-secondary-theme rounded-soft text-[var(--accent-primary)]">
                                            {reward.reward_type === 'money' && <DollarSign className="w-6 h-6" />}
                                            {reward.reward_type === 'percentage' && <Percent className="w-6 h-6" />}
                                            {(reward.reward_type === 'gift' || reward.reward_type === 'treatment') && <Gift className="w-6 h-6" />}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-primary-theme">{reward.points_cost}</p>
                                            <p className="text-xs font-black text-primary-theme/30 uppercase">{settings?.loyalty_points_name || 'puntos'}</p>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-primary-theme mb-1">{reward.name}</h3>
                                    <p className="text-xs text-primary-theme/50 mb-4 line-clamp-2">{reward.description || 'Sin descripción'}</p>

                                    <div className="flex items-center justify-between pt-4 border-t border-theme">
                                        <div className="text-xs font-black uppercase text-emerald-500">
                                            {reward.is_active ? 'Activa' : 'Inactiva'}
                                        </div>
                                        <button className="text-xs font-black uppercase text-primary-theme/30 hover:text-primary-theme transition-colors">Editar</button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-primary-theme/30 border-2 border-dashed border-theme rounded-softer bg-secondary-theme">
                                <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-sm">No hay recompensas configuradas</p>
                                <p className="text-xs">Crea tu primer beneficio para que los pacientes puedan canjear.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {activeTab === 'alerts' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                    <div className="card-premium p-6 border-theme">
                        <h3 className="text-lg font-bold text-primary-theme mb-4 flex items-center gap-2">
                            <HistoryIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                            Historial Global de Movimientos
                        </h3>
                        <div className="space-y-3">
                            {transactions.length > 0 ? transactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between p-4 bg-secondary-theme/50 rounded-soft border border-theme">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center",
                                            tx.points > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                        )}>
                                            {tx.points > 0 ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-primary-theme">{tx.patients?.name || 'Paciente desconocido'}</p>
                                            <p className="text-[10px] text-secondary-theme uppercase tracking-widest font-black">{tx.description} • {new Date(tx.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("font-black", tx.points > 0 ? "text-emerald-500" : "text-red-500")}>
                                            {tx.points > 0 ? '+' : ''}{tx.points} {settings?.loyalty_currency_symbol}
                                        </p>
                                        <p className="text-[10px] uppercase font-black text-secondary-theme tracking-widest">{tx.type}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-primary-theme/30">
                                    <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                    <p className="font-bold uppercase tracking-widest text-sm">Sin movimientos registrados</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="lg:col-span-2 space-y-6">
                        <section className="card-premium p-8 border-theme">
                            <h3 className="text-xl font-black text-primary-theme mb-6 flex items-center gap-2">
                                <Calculator className="w-6 h-6 text-[var(--accent-primary)]" />
                                Configuración del Programa
                            </h3>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-secondary-theme uppercase tracking-widest block mb-4">Modo del Programa</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'points', icon: Coins, label: 'Puntos Clásicos', desc: 'Acumula puntos para canjear en el catálogo.' },
                                            { id: 'money', icon: DollarSign, label: 'Dinero (Cashback)', desc: 'Acumula saldo en dinero real para el monedero.' },
                                            { id: 'percentage', icon: Percent, label: '% Descuento', desc: 'Acumula porcentaje de descuento para la próxima cita.' },
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
                                                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-inner"
                                                        : "border-theme bg-secondary-theme/50 hover:bg-secondary-theme"
                                                )}
                                            >                        >
                                                <mode.icon className={cn("w-8 h-8 mb-4", settings?.loyalty_program_mode === mode.id ? "text-[var(--accent-primary)]" : "text-secondary-theme")} />
                                                <p className="font-bold text-sm mb-1 text-primary-theme">{mode.label}</p>
                                                <p className="text-xs text-secondary-theme font-bold leading-tight">{mode.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-theme uppercase tracking-widest block mb-1">Nombre de la Unidad</label>
                                        <p className="text-[10px] text-secondary-theme/60 mb-2 font-bold uppercase">Ej: Puntos, Estrellas, Coins, $</p>
                                        <input
                                            type="text"
                                            value={settings?.loyalty_points_name}
                                            onChange={(e) => setSettings(s => s ? { ...s, loyalty_points_name: e.target.value } : null)}
                                            className="input-premium w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-theme uppercase tracking-widest block mb-1">Símbolo</label>
                                        <p className="text-[10px] text-secondary-theme/60 mb-2 font-bold uppercase">Se mostrará junto al saldo</p>
                                        <input
                                            type="text"
                                            value={settings?.loyalty_currency_symbol}
                                            onChange={(e) => setSettings(s => s ? { ...s, loyalty_currency_symbol: e.target.value } : null)}
                                            className="input-premium w-full"
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
                                className="btn-premium-primary px-8"
                            >
                                Aplicar Cambios Globales
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-softer p-6 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                            <Trophy className="w-8 h-8 mb-4 text-amber-200" />
                            <h3 className="text-lg font-bold mb-2 tracking-tight">Reglas de Bienvenida</h3>
                            <p className="text-sm text-amber-100 mb-6 leading-relaxed">
                                Define cuántos {settings?.loyalty_points_name} recibe un paciente la primera vez que agenda.
                            </p>
                            <div className="bg-white/10 rounded-soft p-4 border border-white/20 shadow-inner">
                                <label className="text-[10px] uppercase font-black mb-2 block tracking-widest opacity-70">Bono Actual</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black">{settings?.loyalty_welcome_bonus}</span>
                                    <span className="text-xs opacity-70 uppercase font-black tracking-widest">{settings?.loyalty_currency_symbol}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-softer p-6 shadow-[0_0_20px_rgba(79,70,229,0.3)] text-white border border-indigo-400">
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
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-200 opacity-60 uppercase tracking-widest">{settings?.loyalty_currency_symbol}</span>
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
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-200 opacity-60 uppercase tracking-widest">{settings?.loyalty_currency_symbol}</span>
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

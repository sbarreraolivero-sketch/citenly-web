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
    CheckCircle2,
    ExternalLink,
    Copy,
    Share2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { loyaltyService, LoyaltySettings } from '@/services/loyaltyService'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export default function Loyalty() {
    const { profile } = useAuth()
    const [activeTab, setActiveTab] = useState<'points' | 'referrals' | 'alerts'>('points')
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<LoyaltySettings | null>(null)
    const [patients, setPatients] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    
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
                const [s, pData] = await Promise.all([
                    loyaltyService.getSettings(profile.clinic_id),
                    supabase
                        .from('patients')
                        .select('*')
                        .eq('clinic_id', profile.clinic_id)
                        .order('loyalty_points', { ascending: false })
                ])
                setSettings(s)
                setPatients(pData.data || [])
                
                // Calculate basic stats
                const totalPoints = (pData.data || []).reduce((acc, p: any) => acc + (p.loyalty_points || 0), 0)
                const totalRefs = (pData.data || []).reduce((acc, p: any) => acc + (p.referral_count || 0), 0)
                
                setStats({
                    totalPointsDist: totalPoints,
                    totalReferrals: totalRefs,
                    activeAlerts: 12 // Placeholder for now
                })
            } catch (error) {
                console.error('Error fetching loyalty data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [profile?.clinic_id])

    const handleAdjustPoints = async (patientId: string, amount: number, isAdding: boolean) => {
        if (!profile?.clinic_id) return
        const finalAmount = isAdding ? amount : -amount
        const reason = isAdding ? 'Ajuste manual (Crédito)' : 'Ajuste manual (Débito)'
        
        try {
            await loyaltyService.adjustPoints(profile.clinic_id, patientId, finalAmount, reason)
            toast.success(`Puntos ${isAdding ? 'añadidos' : 'eliminados'} correctamente`)
            
            // Refresh list
            const { data } = await supabase
                .from('patients')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .order('loyalty_points', { ascending: false })
            setPatients(data || [])
        } catch (error) {
            toast.error('Error al ajustar puntos')
            console.error(error)
        }
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
                            <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">Puntos Totales</p>
                            <p className="text-2xl font-black">{stats.totalPointsDist.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-soft p-4 min-w-[140px] border border-white/10">
                            <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">Círculo Embajadores</p>
                            <p className="text-2xl font-black">{stats.totalReferrals}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-soft p-4 min-w-[140px] border border-white/10">
                            <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">Alertas Activas</p>
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
                    onClick={() => setActiveTab('alerts')}
                    className={cn(
                        "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-black transition-all whitespace-nowrap",
                        activeTab === 'alerts' ? "bg-primary-500 text-white shadow-md" : "text-charcoal/40 hover:text-charcoal"
                    )}
                >
                    <Bell className="w-3.5 h-3.5" />
                    Alertas
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
                                                <p className="text-[10px] text-charcoal/40 uppercase tracking-tight">{patient.phone_number}</p>
                                                <p className="text-[10px] font-bold text-primary-500 uppercase tracking-tight">Cód: {patient.referral_code || '---'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {patient.loyalty_points >= 5000 && (
                                        <Award className="w-5 h-5 text-amber-500" />
                                    )}
                                </div>
                                
                                <div className="bg-ivory rounded-soft p-3 flex items-center justify-between mb-4 border border-silk-beige/50">
                                    <div>
                                        <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest">Saldo Actual</p>
                                        <p className="text-xl font-black text-charcoal">{patient.loyalty_points || 0} pts</p>
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
                                                const url = `${window.location.origin}/chat?ref=${patient.referral_code}`;
                                                navigator.clipboard.writeText(url);
                                                toast.success('Magic Link copiado al portapapeles');
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-full text-[10px] font-bold hover:bg-primary-100 transition-colors"
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="lg:col-span-2 card-soft p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-charcoal">Ranking de Embajadores</h3>
                            <div className="flex items-center gap-2 text-primary-500 bg-primary-50 px-3 py-1.5 rounded-full text-xs font-bold">
                                <Award className="w-4 h-4" />
                                BONO: {settings?.loyalty_referral_bonus} pts / referido
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {patients.filter(p => p.referral_count > 0)
                                .sort((a, b) => b.referral_count - a.referral_count)
                                .slice(0, 5)
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
                                        <p className="text-[10px] font-black text-charcoal/30 uppercase">Amigos Referidos</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-softer p-6 text-white shadow-soft-md">
                            <Target className="w-8 h-8 mb-4 text-indigo-200" />
                            <h3 className="text-lg font-bold mb-2">Manual de Embajadores</h3>
                            <p className="text-sm text-indigo-100 mb-4">
                                Cada paciente tiene un código único. Cuando un amigo lo mencione o use su link en el Chat IA, ambos reciben beneficios.
                            </p>
                            <Link 
                                to="/app/templates"
                                className="w-full h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-soft text-sm font-bold transition-all border border-white/20"
                            >
                                Configurar Campaña
                            </Link>
                        </div>
                        
                        <div className="bg-white rounded-softer p-6 border border-silk-beige shadow-soft-sm">
                            <h3 className="font-bold text-charcoal mb-4">Ajustes de Referidos</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-charcoal/40 uppercase block mb-1">Bono por Referir</label>
                                    <input type="number" defaultValue={settings?.loyalty_referral_bonus} className="w-full p-2 border border-silk-beige rounded-soft text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-charcoal/40 uppercase block mb-1">Bono de Bienvenida</label>
                                    <input type="number" defaultValue={settings?.loyalty_welcome_bonus} className="w-full p-2 border border-silk-beige rounded-soft text-sm" />
                                </div>
                                <button className="w-full py-2 bg-primary-500 text-white rounded-soft text-sm font-bold hover:bg-primary-600 transition-all">
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'alerts' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-softer">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <div>
                            <p className="text-sm font-bold text-emerald-900">Alertas Predictivas Activas</p>
                            <p className="text-xs text-emerald-700">La IA notificará automáticamente a los pacientes antes de que sus tratamientos expiren.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Treatment Cards */}
                        {[
                            { name: 'Botox', window: '120 días', color: 'bg-primary-500', icon: '💉' },
                            { name: 'Limpieza Facial', window: '30 días', color: 'bg-emerald-500', icon: '✨' },
                            { name: 'Dermapen', window: '30 días', color: 'bg-indigo-500', icon: '🧬' },
                        ].map((item) => (
                            <div key={item.name} className="bg-white rounded-softer border border-silk-beige overflow-hidden group">
                                <div className={cn("h-2 w-full", item.color)} />
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-2xl">{item.icon}</div>
                                        <div className="text-xs font-black text-charcoal/30 uppercase tracking-widest">Renovación</div>
                                    </div>
                                    <h4 className="text-lg font-bold text-charcoal mb-1">{item.name}</h4>
                                    <p className="text-sm text-charcoal/50 mb-4">Frecuencia recomendada: {item.window}</p>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-charcoal/60">Notificación automática</span>
                                            <span className="font-bold text-primary-500">Activada</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-charcoal/60">Tasa de retorno</span>
                                            <span className="font-bold text-emerald-500">82%</span>
                                        </div>
                                    </div>
                                    
                                    <button className="w-full py-2 bg-ivory hover:bg-silk-beige rounded-soft text-xs font-black text-charcoal uppercase tracking-widest transition-all">
                                        Editar Protocolo
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

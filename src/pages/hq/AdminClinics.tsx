
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
    Search, Building2, Users, Shield, ChevronUp,
    CheckCircle, Clock, XCircle, Loader2, RefreshCw, CreditCard, Eye, Sparkles, Plus
} from 'lucide-react'

interface ClinicData {
    id: string
    clinic_name: string
    created_at: string
    activation_status: string
    subscription_plan: string
    trial_status: string
    billing_status: string
    trial_start_date: string | null
    trial_end_date: string | null
    currency: string
    timezone: string
    ai_credits_used: number
    ai_credits_limit: number
    ai_credits_extra: number
    // legacy column names as fallback
    ai_credits_monthly_limit: number
    ai_credits_extra_balance: number
    clinic_members: {
        id: string
        email: string
        first_name: string | null
        last_name: string | null
        role: string
        status: string
    }[]
    subscriptions: {
        plan: string
        status: string
        current_period_end: string | null
        trial_ends_at: string | null
    }[]
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Activa' },
    pending_activation: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pendiente' },
    inactive: { bg: 'bg-red-50', text: 'text-red-700', label: 'Inactiva' },
}

const planLabels: Record<string, string> = {
    core: 'Core',
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
    trial: 'Trial',
    essence: 'Starter',
    radiance: 'Pro',
    prestige: 'Enterprise',
    basic: 'Basic',
}

export default function AdminClinics() {
    const [clinics, setClinics] = useState<ClinicData[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [expandedClinic, setExpandedClinic] = useState<string | null>(null)

    const fetchClinics = useCallback(async () => {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

            const response = await fetch(
                `${supabaseUrl}/rest/v1/clinic_settings?select=id,clinic_name,created_at,activation_status,subscription_plan,trial_status,billing_status,trial_start_date,trial_end_date,currency,timezone,ai_credits_used,ai_credits_limit,ai_credits_extra,ai_credits_monthly_limit,ai_credits_extra_balance,clinic_members(id,email,first_name,last_name,role,status),subscriptions(plan,status,current_period_end,trial_ends_at)&order=created_at.desc`,
                {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
            )

            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            setClinics(data as ClinicData[])
        } catch (err) {
            console.error('Error fetching clinics:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchClinics()
    }, [fetchClinics])

    const filteredClinics = clinics.filter(c => {
        const matchesSearch = !search ||
            c.clinic_name?.toLowerCase().includes(search.toLowerCase()) ||
            c.clinic_members?.some(m => m.email?.toLowerCase().includes(search.toLowerCase()))
        const matchesStatus = statusFilter === 'all' || c.activation_status === statusFilter
        return matchesSearch && matchesStatus
    })

    const getOwner = (clinic: ClinicData) => {
        return clinic.clinic_members?.find(m => m.role === 'owner')
    }

    const getStatusBadge = (status: string) => {
        const s = statusColors[status] || statusColors.inactive
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                {status === 'active' && <CheckCircle className="w-3.5 h-3.5" />}
                {status === 'pending_activation' && <Clock className="w-3.5 h-3.5" />}
                {status === 'inactive' && <XCircle className="w-3.5 h-3.5" />}
                {s.label}
            </span>
        )
    }

    const stats = {
        total: clinics.length,
        active: clinics.filter(c => c.activation_status === 'active').length,
        pending: clinics.filter(c => c.activation_status === 'pending_activation').length,
        inactive: clinics.filter(c => c.activation_status === 'inactive').length,
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF2E88]" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Clínicas</h1>
                <p className="text-gray-400 mt-1 text-sm">Gestiona todas las clínicas registradas en la plataforma.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                            <p className="text-xs text-gray-400">Total</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.active}</p>
                            <p className="text-xs text-gray-400">Activas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.pending}</p>
                            <p className="text-xs text-gray-400">Pendientes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <XCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.inactive}</p>
                            <p className="text-xs text-gray-400">Inactivas</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF2E88]/50 focus:border-[#FF2E88]/50"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF2E88]/50"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Activas</option>
                        <option value="pending_activation">Pendientes</option>
                        <option value="inactive">Inactivas</option>
                    </select>
                    <button
                        onClick={fetchClinics}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Clinics Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Clínica</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Miembros</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {filteredClinics.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                                        {search || statusFilter !== 'all'
                                            ? 'No se encontraron clínicas con estos filtros.'
                                            : 'No hay clínicas registradas.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredClinics.map((clinic) => {
                                    const owner = getOwner(clinic)
                                    const isExpanded = expandedClinic === clinic.id
                                    return (
                                        <tr key={clinic.id}>
                                            <td colSpan={7} className="p-0">
                                                <div>
                                                    <div className="flex items-center px-6 py-4 hover:bg-gray-700/30 transition-colors">
                                                        <div className="flex-1 min-w-0 flex items-center">
                                                            <div className="w-10 h-10 rounded-lg bg-[#FF2E88]/10 flex items-center justify-center mr-3 flex-shrink-0">
                                                                <Building2 className="w-5 h-5 text-[#FF2E88]" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-white truncate">{clinic.clinic_name || 'Sin nombre'}</p>
                                                                <p className="text-xs text-gray-500">{clinic.id.slice(0, 8)}...</p>
                                                            </div>
                                                        </div>
                                                        <div className="w-44 px-3">
                                                            <p className="text-sm text-gray-300 truncate">{owner?.email || 'N/A'}</p>
                                                            <p className="text-xs text-gray-500">{owner?.first_name || ''} {owner?.last_name || ''}</p>
                                                        </div>
                                                        <div className="w-24 px-3">
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 text-xs font-medium">
                                                                <CreditCard className="w-3 h-3" />
                                                                {planLabels[clinic.subscription_plan] || clinic.subscription_plan}
                                                            </span>
                                                        </div>
                                                        <div className="w-28 px-3">
                                                            {getStatusBadge(clinic.activation_status)}
                                                        </div>
                                                        <div className="w-20 px-3 text-center">
                                                            <span className="inline-flex items-center gap-1 text-sm text-gray-300">
                                                                <Users className="w-3.5 h-3.5" />
                                                                {clinic.clinic_members?.length || 0}
                                                            </span>
                                                        </div>
                                                        <div className="w-28 px-3">
                                                            <p className="text-xs text-gray-400">
                                                                {new Date(clinic.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                        <div className="w-16 px-3 text-center">
                                                            <button
                                                                onClick={() => setExpandedClinic(isExpanded ? null : clinic.id)}
                                                                className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-200"
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    {isExpanded && (
                                                        <div className="px-6 pb-5 bg-gray-900/60 border-t border-gray-700">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
                                                                {/* Subscription Info */}
                                                                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                        <CreditCard className="w-3.5 h-3.5 text-[#FF2E88]" /> Suscripción
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">Plan</span>
                                                                            <span className="font-medium text-white">{planLabels[clinic.subscription_plan] || clinic.subscription_plan}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">Trial</span>
                                                                            <span className="font-medium text-white capitalize">{clinic.trial_status?.replace('_', ' ')}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">Facturación</span>
                                                                            <span className="font-medium text-white capitalize">{clinic.billing_status?.replace('_', ' ')}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">Moneda</span>
                                                                            <span className="font-medium text-white">{clinic.currency || 'MXN'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Members */}
                                                                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                        <Users className="w-3.5 h-3.5 text-[#FF2E88]" /> Miembros ({clinic.clinic_members?.length || 0})
                                                                    </h4>
                                                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                                                        {clinic.clinic_members?.map((member) => (
                                                                            <div key={member.id} className="flex items-center justify-between text-sm">
                                                                                <span className="text-gray-300 truncate mr-2">{member.email}</span>
                                                                                <span className={`text-xs px-1.5 py-0.5 rounded ${member.role === 'owner' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                                                                                    {member.role}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Technical */}
                                                                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                        <Shield className="w-3.5 h-3.5 text-[#FF2E88]" /> Información Técnica
                                                                    </h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">ID</span>
                                                                            <span className="font-mono text-xs text-gray-300">{clinic.id.slice(0, 12)}...</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">Timezone</span>
                                                                            <span className="font-medium text-xs text-white">{clinic.timezone || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">Creada</span>
                                                                            <span className="font-medium text-xs text-white">
                                                                                {new Date(clinic.created_at).toLocaleDateString('es-ES')}
                                                                            </span>
                                                                        </div>
                                                                        {clinic.trial_end_date && (
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-400">Trial hasta</span>
                                                                                <span className="font-medium text-xs text-white">
                                                                                    {new Date(clinic.trial_end_date).toLocaleDateString('es-ES')}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* AI Usage — Universal Credits */}
                                                                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 md:col-span-3">
                                                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                                                        <Sparkles className="w-3.5 h-3.5 text-[#FF2E88]" /> Uso de Créditos IA (Ciclo Actual)
                                                                    </h4>
                                                                    <AdminAIUsage
                                                                        clinicId={clinic.id}
                                                                        creditsUsed={clinic.ai_credits_used ?? 0}
                                                                        creditsLimit={clinic.ai_credits_limit ?? clinic.ai_credits_monthly_limit ?? 2000}
                                                                        creditsExtra={clinic.ai_credits_extra ?? clinic.ai_credits_extra_balance ?? 0}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function AdminAIUsage({
    clinicId,
    creditsUsed,
    creditsLimit,
    creditsExtra,
}: {
    clinicId: string
    creditsUsed: number
    creditsLimit: number
    creditsExtra: number
}) {
    const [isUpdating, setIsUpdating] = useState(false)
    const [currentExtra, setCurrentExtra] = useState(creditsExtra)
    const [addAmount, setAddAmount] = useState('500')

    const totalLimit = creditsLimit + currentExtra
    const used = creditsUsed
    const percent = totalLimit > 0 ? Math.min(100, Math.round((used / totalLimit) * 100)) : 0
    const remaining = Math.max(0, totalLimit - used)
    const isOverLimit = used >= totalLimit

    const handleAddCredits = async () => {
        if (isUpdating || !addAmount) return
        setIsUpdating(true)
        try {
            const amount = parseInt(addAmount)
            const newExtra = currentExtra + amount

            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({ ai_credits_extra: newExtra, ai_credits_extra_balance: newExtra })
                .eq('id', clinicId)

            if (error) throw error

            setCurrentExtra(newExtra)
            alert(`${amount} créditos extra cargados correctamente`)
        } catch (err) {
            console.error('Error adding credits:', err)
            alert('Error al cargar créditos')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="space-y-5">
            {/* Barra de uso */}
            <div className="space-y-3">
                <div className="flex items-end justify-between">
                    <div className="flex gap-6">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Créditos Usados</p>
                            <p className={cn("text-2xl font-black", isOverLimit ? "text-red-400" : "text-white")}>{used.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Límite Plan</p>
                            <p className="text-2xl font-black text-gray-300">{creditsLimit.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Créditos Extra</p>
                            <p className="text-2xl font-black text-violet-400">{currentExtra.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Disponibles</p>
                            <p className={cn("text-2xl font-black", remaining === 0 ? "text-red-400" : "text-emerald-400")}>{remaining.toLocaleString()}</p>
                        </div>
                    </div>
                    <div>
                        <span className={cn(
                            "text-sm font-bold px-3 py-1 rounded-full",
                            isOverLimit ? "bg-red-500/20 text-red-400" :
                            percent > 80 ? "bg-amber-500/20 text-amber-400" :
                            "bg-emerald-500/20 text-emerald-400"
                        )}>
                            {percent}%
                        </span>
                    </div>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isOverLimit ? "bg-red-500" :
                            percent > 80 ? "bg-amber-500" :
                            "bg-emerald-500"
                        )}
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <p className="text-xs text-gray-500">
                    Total disponible: <span className="text-gray-300 font-medium">{creditsLimit.toLocaleString()} (plan) + {currentExtra.toLocaleString()} (extra) = {totalLimit.toLocaleString()}</span>
                </p>
            </div>

            {/* Carga manual de créditos extra */}
            <div className="pt-4 border-t border-gray-700">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-3 flex items-center gap-1.5">
                    <Plus className="w-3 h-3" /> Cargar Créditos Extra
                </p>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        min="100"
                        step="100"
                        placeholder="Cantidad..."
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FF2E88]/50"
                    />
                    <button
                        onClick={handleAddCredits}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#FF2E88] hover:bg-[#e0206f] rounded-lg transition-all disabled:opacity-50"
                    >
                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Cargar Créditos
                    </button>
                </div>
            </div>
        </div>
    )
}

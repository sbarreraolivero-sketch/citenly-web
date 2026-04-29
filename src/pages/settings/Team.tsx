
import { useState, useEffect } from 'react'
import { Plus, Trash2, Mail, Shield, User, Clock, Copy } from 'lucide-react'
import { teamService, type ClinicMember } from '@/services/teamService'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export default function Team() {
    const { member, profile } = useAuth()
    const [members, setMembers] = useState<ClinicMember[]>([])
    const [loading, setLoading] = useState(true)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'admin' | 'professional' | 'receptionist'>('professional')
    const [inviteName, setInviteName] = useState('')
    const [maxUsers, setMaxUsers] = useState(3) // Default to 3
    const [planName, setPlanName] = useState('freemium')

    // Fallback to profile check if member context is missing
    const isOwner = member?.role === 'owner' || profile?.role === 'owner'
    const isAdmin = isOwner || member?.role === 'admin' || profile?.role === 'admin'
    const clinicId = member?.clinic_id || profile?.clinic_id

    const canInvite = isAdmin && members.filter(m => m.status !== 'disabled').length < maxUsers

    useEffect(() => {
        console.log('Team Page - Clinic ID Changed:', clinicId)
        if (clinicId) loadData()
    }, [clinicId])

    const loadData = async () => {
        if (!clinicId) {
            setLoading(false)
            return
        }

        try {
            console.log('Loading team data for clinic:', clinicId)

            // 1. Get Members (Try RPC, fallback to direct)
            let membersData: ClinicMember[] = []
            try {
                membersData = await teamService.getMembers(clinicId)
            } catch (rpcError) {
                console.warn('RPC check failed, fetching directly:', rpcError)
            }

            // If RPC returned empty or failed, try direct fetch (Safety Net)
            if (!membersData || membersData.length === 0) {
                const { data: directMembers, error: directError } = await supabase
                    .from('clinic_members')
                    .select('*')
                    .eq('clinic_id', clinicId)

                if (!directError && directMembers) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    membersData = directMembers as any[]
                }
            }

            console.log('Final Members List:', membersData)

            // Sort: Owner first, then by date
            const sortedMembers = (membersData || []).sort((a, b) => {
                if (a.role === 'owner' && b.role !== 'owner') return -1
                if (a.role !== 'owner' && b.role === 'owner') return 1
                return 0
            })
            setMembers(sortedMembers)

            // 2. Get Settings & Subscription (Source of Truth)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let settingsData: any = null
            try {
                settingsData = await teamService.getClinicSettings(clinicId)
            } catch (e) {
                console.warn('getClinicSettings RPC failed:', e)
            }

            if (!settingsData) {
                const { data: directSettings } = await supabase.from('clinic_settings').select('*').eq('id', clinicId).single()
                if (directSettings) settingsData = directSettings
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('clinic_id', clinicId)
                .single() as any

            console.log('Settings:', settingsData, 'Sub:', subData, 'SubError:', subError)

            if (subData) {
                // Subscription table is the ultimate authority
                setPlanName(subData.plan)
                if (subData.plan === 'prestige') {
                    setMaxUsers(10000)
                } else if (subData.plan === 'radiance' || subData.plan === 'radiance_plus') {
                    setMaxUsers(5)
                } else if (subData.plan === 'essence') {
                    setMaxUsers(2)
                } else {
                    // Fallback to settings or default for unknown plans
                    setMaxUsers(settingsData?.max_users || 3)
                }
            } else if (settingsData) {
                // Fallback to clinic_settings
                setPlanName(settingsData.subscription_plan || 'freemium')
                if (settingsData.subscription_plan === 'prestige') {
                    setMaxUsers(10000)
                } else if (settingsData.subscription_plan === 'radiance' || settingsData.subscription_plan === 'radiance_plus') {
                    setMaxUsers(5)
                } else {
                    setMaxUsers(settingsData.max_users || 3)
                }
            }

        } catch (error) {
            console.error('Error loading team data:', error)
            toast.error('Error al cargar el equipo')
        } finally {
            setLoading(false)
        }
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clinicId) return

        if (!canInvite) {
            toast.error(`Has alcanzado el límite de ${maxUsers} usuarios de tu plan ${planName}.`)
            return
        }

        try {
            await teamService.inviteMember(clinicId, inviteEmail, inviteRole, inviteName)
            toast.success('Invitación creada correctamente')
            setIsInviteModalOpen(false)
            setInviteEmail('')
            setInviteName('')
            loadData()
        } catch (error) {
            console.error('Error inviting member:', error)
            // Error handling improved in service/RPC but good to keep fallback
            toast.error('Error al enviar invitación. Verifica el límite de tu plan.')
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        e.stopPropagation()

        if (!confirm('¿Estás seguro de eliminar este miembro?')) return
        try {
            await teamService.deleteMember(id)
            toast.success('Miembro eliminado')
            loadData()
        } catch (error) {
            console.error('Error deleting member:', error)
            toast.error('Error al eliminar miembro')
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-primary-theme">Gestión de Equipo</h1>
                    <p className="text-secondary-theme">Administra los miembros de tu clínica y sus permisos.</p>
                    {!loading && (
                        <p className="text-xs mt-2 font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 inline-block px-3 py-1 rounded-full border border-[var(--accent-primary)]/20 uppercase tracking-widest">
                            {members.filter(m => m.status !== 'disabled').length} / {maxUsers > 100 ? 'Ilimitados' : maxUsers} usuarios activos
                        </p>
                    )}
                </div>
                {isAdmin && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/register?mode=join&clinic=${clinicId}`)
                                toast.success('Enlace de registro copiado al portapapeles')
                            }}
                            className="px-4 py-2 bg-secondary-theme border border-theme text-primary-theme rounded-lg hover:bg-primary-theme/5 flex items-center gap-2 transition-colors font-semibold text-sm"
                            title="Copiar enlace para que los miembros se registren ellos mismos"
                        >
                            <Copy size={18} />
                            Copiar Enlace
                        </button>
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            disabled={!canInvite}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-bold text-sm ${canInvite
                                ? 'bg-premium-gradient text-white shadow-lg hover:scale-105 active:scale-95'
                                : 'bg-secondary-theme text-secondary-theme/40 border border-theme cursor-not-allowed'
                                }`}
                            title={!canInvite ? 'Límite de usuarios alcanzado' : ''}
                        >
                            <Plus size={18} />
                            Invitar Miembro
                        </button>
                    </div>
                )}
            </div>

            <div className="card-premium overflow-hidden">
                <table className="w-full min-w-[600px]">
                    <thead className="bg-secondary-theme border-b border-theme">
                        <tr>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Miembro</th>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Rol</th>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Estado</th>
                            <th className="text-left py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Fecha Ingreso</th>
                            {isOwner && <th className="text-right py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-secondary-theme">Cargando...</td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-secondary-theme">No hay miembros en el equipo.</td></tr>
                        ) : (
                            members.map((m) => (
                                <tr key={m.id} className="hover:bg-primary-theme/5 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-bold">
                                                {(m.first_name?.[0] || m.email[0]).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-primary-theme">{m.first_name || 'Sin nombre'}</p>
                                                <p className="text-xs text-secondary-theme">{m.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                            ${m.role === 'owner' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                                                m.role === 'admin' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                                    m.role === 'professional' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                        'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                            {(m.role === 'owner' || m.role === 'admin') && <Shield size={12} />}
                                            {m.role === 'professional' && <User size={12} />}
                                            {m.role === 'receptionist' && <Clock size={12} />}
                                            {m.role === 'owner' ? 'Dueño' : m.role === 'admin' ? 'Administrador' : m.role === 'professional' ? 'Profesional' : 'Recepción'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                            ${m.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                m.status === 'invited' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                    'bg-secondary-theme text-secondary-theme/60 border border-theme'}`}>
                                            {m.status === 'active' ? 'Activo' : m.status === 'invited' ? 'Invitado' : 'Desactivado'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-xs text-secondary-theme font-medium">
                                        {new Date(m.created_at).toLocaleDateString()}
                                    </td>
                                    {isOwner && (
                                        <td className="py-4 px-6 text-right">
                                            {m.role !== 'owner' && (
                                                <button
                                                    onClick={(e) => handleDelete(e, m.id)}
                                                    className="text-secondary-theme hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-500/10"
                                                    title="Eliminar miembro"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-primary-theme border border-theme rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slide-up">
                        <h2 className="text-xl font-bold text-primary-theme mb-6">Invitar Nuevo Miembro</h2>
                        <form onSubmit={handleInvite} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-secondary-theme uppercase tracking-widest mb-2">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-theme" size={16} />
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="input-premium w-full pl-11"
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-secondary-theme uppercase tracking-widest mb-2">Nombre (Opcional)</label>
                                <input
                                    type="text"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    className="input-premium w-full"
                                    placeholder="Nombre del doctor/a"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-secondary-theme uppercase tracking-widest mb-2">Rol</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {isOwner && (
                                        <button
                                            type="button"
                                            onClick={() => setInviteRole('admin')}
                                            className={`p-3.5 rounded-xl border text-left transition-all ${inviteRole === 'admin' ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 ring-1 ring-[var(--accent-primary)]' : 'border-theme bg-secondary-theme/50 hover:border-secondary-theme'}`}
                                        >
                                            <div className="font-bold text-primary-theme text-sm mb-0.5">Admin</div>
                                            <div className="text-[11px] text-secondary-theme leading-tight">Gestiona equipo y calendarios de toda la clínica.</div>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setInviteRole('professional')}
                                        className={`p-3.5 rounded-xl border text-left transition-all ${inviteRole === 'professional' ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 ring-1 ring-[var(--accent-primary)]' : 'border-theme bg-secondary-theme/50 hover:border-secondary-theme'}`}
                                    >
                                        <div className="font-bold text-primary-theme text-sm mb-0.5">Profesional</div>
                                        <div className="text-[11px] text-secondary-theme leading-tight">Maneja su propia agenda, citas y pacientes.</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInviteRole('receptionist')}
                                        className={`p-3.5 rounded-xl border text-left transition-all ${inviteRole === 'receptionist' ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 ring-1 ring-[var(--accent-primary)]' : 'border-theme bg-secondary-theme/50 hover:border-secondary-theme'}`}
                                    >
                                        <div className="font-bold text-primary-theme text-sm mb-0.5">Recepción</div>
                                        <div className="text-[11px] text-secondary-theme leading-tight">Gestiona citas de todo el equipo clínico.</div>
                                    </button>
                                </div>
                            </div>
 
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 text-secondary-theme bg-secondary-theme rounded-xl hover:bg-secondary-theme/80 transition-colors font-bold text-sm border border-theme"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 text-white bg-premium-gradient rounded-xl hover:shadow-lg transition-all font-bold text-sm"
                                >
                                    Enviar Invitación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

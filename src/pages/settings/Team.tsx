
import { useState, useEffect } from 'react'
import { Plus, Trash2, Mail, Shield, User, Clock, Copy, ChevronDown, Save, SlidersHorizontal, RotateCcw, X } from 'lucide-react'
import { teamService, type ClinicMember } from '@/services/teamService'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { normalizePlanId } from '@/lib/mercadopago'
import { cn } from '@/lib/utils'
import {
    PAGE_SECTIONS,
    ACTION_SECTIONS,
    getEffectivePermissions,
    type MemberPermissions,
    type PageKey,
    type ActionKey,
} from '@/lib/permissions'

type StaffPermissions = { professional: string[]; receptionist: string[] }

const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
    professional: ['dashboard', 'messages', 'templates', 'patients', 'appointments'],
    receptionist: ['dashboard', 'messages', 'appointments', 'patients'],
}

const PERMISSION_SECTIONS = [
    { label: 'Principal', items: [{ key: 'dashboard', name: 'Dashboard' }, { key: 'messages', name: 'Mensajes' }, { key: 'templates', name: 'Plantillas' }] },
    { label: 'Clínica', items: [{ key: 'patients', name: 'Contactos' }, { key: 'crm', name: 'CRM' }, { key: 'appointments', name: 'Citas' }, { key: 'reminders', name: 'Recordatorios' }, { key: 'retention', name: 'Retención' }, { key: 'finance', name: 'Finanzas' }] },
    { label: 'Marketing', items: [{ key: 'campaigns', name: 'Campañas' }, { key: 'loyalty', name: 'Fidelización' }] },
    { label: 'Agente IA', items: [{ key: 'knowledge-base', name: 'Conocimiento' }, { key: 'integrations', name: 'Integraciones' }, { key: 'ai-settings', name: 'Ajustes IA' }] },
]

const ROLE_LABELS: Record<string, string> = {
    owner: 'Dueño',
    admin: 'Administrador',
    professional: 'Profesional',
    receptionist: 'Recepción',
}

function PermissionsModal({
    member,
    onClose,
    onSaved,
}: {
    member: ClinicMember
    onClose: () => void
    onSaved: (memberId: string, permissions: MemberPermissions | null) => void
}) {
    const effective = getEffectivePermissions(member.role, member.permissions ?? null)
    const [pages, setPages] = useState<PageKey[]>(effective.pages)
    const [actions, setActions] = useState<ActionKey[]>(effective.actions)
    const [saving, setSaving] = useState(false)

    const togglePage = (key: PageKey) => {
        setPages(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
    }

    const toggleAction = (key: ActionKey) => {
        setActions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
    }

    const handleRestore = () => {
        const defaults = getEffectivePermissions(member.role, null)
        setPages(defaults.pages)
        setActions(defaults.actions)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const newPerms: MemberPermissions = { pages, actions }
            await teamService.updateMemberPermissions(member.id, newPerms)
            toast.success('Permisos actualizados')
            onSaved(member.id, newPerms)
            onClose()
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const memberName = member.first_name || member.email

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-primary-theme border border-theme rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-theme shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-bold">
                            {memberName[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-primary-theme">{memberName}</p>
                            <span className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                                member.role === 'professional' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            )}>
                                {ROLE_LABELS[member.role]}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRestore}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-secondary-theme border border-theme rounded-lg hover:bg-secondary-theme transition-colors"
                            title="Restaurar defaults del rol"
                        >
                            <RotateCcw size={12} />
                            Restaurar defaults
                        </button>
                        <button onClick={onClose} className="p-1.5 text-secondary-theme hover:text-primary-theme rounded-lg hover:bg-secondary-theme transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Acceso a secciones */}
                    <div>
                        <h3 className="text-xs font-black text-secondary-theme uppercase tracking-widest mb-3">Acceso a secciones</h3>
                        <div className="space-y-4">
                            {PAGE_SECTIONS.map(section => (
                                <div key={section.label}>
                                    <p className="text-[10px] font-black text-secondary-theme/60 uppercase tracking-widest mb-2">{section.label}</p>
                                    <div className="space-y-1">
                                        {section.pages.map(item => (
                                            <label key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary-theme cursor-pointer transition-colors group">
                                                <span className="text-sm font-medium text-primary-theme">{item.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePage(item.key)}
                                                    className={cn(
                                                        'w-10 h-6 rounded-full transition-colors relative shrink-0',
                                                        pages.includes(item.key) ? 'bg-[var(--accent-primary)]' : 'bg-gray-200 dark:bg-gray-700'
                                                    )}
                                                >
                                                    <span className={cn(
                                                        'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                                                        pages.includes(item.key) ? 'translate-x-5' : 'translate-x-1'
                                                    )} />
                                                </button>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Acciones permitidas */}
                    <div>
                        <h3 className="text-xs font-black text-secondary-theme uppercase tracking-widest mb-3">Acciones permitidas</h3>
                        <div className="space-y-4">
                            {ACTION_SECTIONS.map(section => (
                                <div key={section.label}>
                                    <p className="text-[10px] font-black text-secondary-theme/60 uppercase tracking-widest mb-2">{section.label}</p>
                                    <div className="space-y-1">
                                        {section.actions.map(item => (
                                            <label key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary-theme cursor-pointer transition-colors">
                                                <span className="text-sm font-medium text-primary-theme">{item.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAction(item.key)}
                                                    className={cn(
                                                        'w-10 h-6 rounded-full transition-colors relative shrink-0',
                                                        actions.includes(item.key) ? 'bg-[var(--accent-primary)]' : 'bg-gray-200 dark:bg-gray-700'
                                                    )}
                                                >
                                                    <span className={cn(
                                                        'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                                                        actions.includes(item.key) ? 'translate-x-5' : 'translate-x-1'
                                                    )} />
                                                </button>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-theme shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-secondary-theme bg-secondary-theme rounded-xl hover:bg-secondary-theme/80 transition-colors font-bold text-sm border border-theme"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-premium-gradient rounded-xl hover:shadow-lg transition-all font-bold text-sm disabled:opacity-50"
                    >
                        <Save size={15} />
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Team() {
    const { member, profile } = useAuth()
    const [members, setMembers] = useState<ClinicMember[]>([])
    const [loading, setLoading] = useState(true)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'admin' | 'professional' | 'receptionist'>('professional')
    const [inviteName, setInviteName] = useState('')
    const [maxUsers, setMaxUsers] = useState(3)
    const [planName, setPlanName] = useState('freemium')
    const [staffPermissions, setStaffPermissions] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS)
    const [savingPermissions, setSavingPermissions] = useState(false)
    const [showPermissions, setShowPermissions] = useState(false)
    const [permissionsModalMember, setPermissionsModalMember] = useState<ClinicMember | null>(null)

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
                const normalizedPlan = normalizePlanId(subData.plan)
                setPlanName(normalizedPlan)
                const maxByPlan: Record<string, number> = { enterprise: 10000, pro: 5, starter: 2, core: 1 }
                setMaxUsers(maxByPlan[normalizedPlan] ?? settingsData?.max_users ?? 3)
            } else if (settingsData) {
                const normalizedPlan = normalizePlanId(settingsData.subscription_plan)
                setPlanName(normalizedPlan)
                const maxByPlan: Record<string, number> = { enterprise: 10000, pro: 5, starter: 2, core: 1 }
                setMaxUsers(maxByPlan[normalizedPlan] ?? settingsData?.max_users ?? 3)
            }

            if (settingsData?.staff_permissions) {
                setStaffPermissions(settingsData.staff_permissions as StaffPermissions)
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
            toast.error('Error al enviar invitación. Verifica el límite de tu plan.')
        }
    }

    const togglePermission = (role: 'professional' | 'receptionist', key: string) => {
        setStaffPermissions(prev => {
            const current = prev[role]
            const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
            return { ...prev, [role]: updated }
        })
    }

    const savePermissions = async () => {
        if (!clinicId) return
        setSavingPermissions(true)
        try {
            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({ staff_permissions: staffPermissions })
                .eq('id', clinicId)
            if (error) throw error
            toast.success('Permisos de acceso guardados')
        } catch (err: any) {
            toast.error('Error al guardar permisos: ' + err.message)
        } finally {
            setSavingPermissions(false)
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

    const handlePermissionsSaved = (memberId: string, permissions: MemberPermissions | null) => {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, permissions } : m))
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
                            {isAdmin && <th className="text-right py-4 px-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest">Acciones</th>}
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
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-primary-theme">{m.first_name || 'Sin nombre'}</p>
                                                    {m.permissions != null && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                            Personalizado
                                                        </span>
                                                    )}
                                                </div>
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
                                    {isAdmin && (
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {m.role !== 'owner' && m.role !== 'admin' && (
                                                    <button
                                                        onClick={() => setPermissionsModalMember(m)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-secondary-theme hover:text-[var(--accent-primary)] border border-theme hover:border-[var(--accent-primary)]/40 rounded-lg hover:bg-[var(--accent-primary)]/5 transition-all"
                                                        title="Editar permisos individuales"
                                                    >
                                                        <SlidersHorizontal size={13} />
                                                        Permisos
                                                    </button>
                                                )}
                                                {isOwner && m.role !== 'owner' && (
                                                    <button
                                                        onClick={(e) => handleDelete(e, m.id)}
                                                        className="text-secondary-theme hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-500/10"
                                                        title="Eliminar miembro"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Permisos de Acceso por Rol */}
            {isAdmin && (
                <div className="card-premium overflow-hidden mt-6">
                    <button
                        onClick={() => setShowPermissions(!showPermissions)}
                        className="w-full flex items-center justify-between p-5 hover:bg-secondary-theme transition-colors"
                    >
                        <div>
                            <p className="font-bold text-primary-theme text-left">Permisos por Defecto por Rol</p>
                            <p className="text-xs text-secondary-theme mt-0.5 text-left">Define los accesos predeterminados para nuevos profesionales y recepcionistas. Los permisos individuales tienen prioridad.</p>
                        </div>
                        <ChevronDown className={cn('w-5 h-5 text-secondary-theme transition-transform', showPermissions && 'rotate-180')} />
                    </button>

                    {showPermissions && (
                        <div className="border-t border-theme p-5 space-y-5">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="text-left py-2 pr-6 text-[10px] font-black text-secondary-theme uppercase tracking-widest w-48">Sección</th>
                                            <th className="text-center py-2 px-4 text-[10px] font-black text-blue-500 uppercase tracking-widest">Profesional</th>
                                            <th className="text-center py-2 px-4 text-[10px] font-black text-emerald-500 uppercase tracking-widest">Recepción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PERMISSION_SECTIONS.map(section => (
                                            <>
                                                <tr key={section.label}>
                                                    <td colSpan={3} className="pt-4 pb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary-theme/60">{section.label}</span>
                                                    </td>
                                                </tr>
                                                {section.items.map(item => (
                                                    <tr key={item.key} className="border-b border-theme/50 last:border-0">
                                                        <td className="py-2.5 pr-6 font-medium text-primary-theme">{item.name}</td>
                                                        <td className="py-2.5 px-4 text-center">
                                                            <button
                                                                onClick={() => togglePermission('professional', item.key)}
                                                                className={cn(
                                                                    'w-10 h-6 rounded-full transition-colors relative',
                                                                    staffPermissions.professional.includes(item.key) ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                                                                )}
                                                            >
                                                                <span className={cn(
                                                                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                                                                    staffPermissions.professional.includes(item.key) ? 'translate-x-5' : 'translate-x-1'
                                                                )} />
                                                            </button>
                                                        </td>
                                                        <td className="py-2.5 px-4 text-center">
                                                            <button
                                                                onClick={() => togglePermission('receptionist', item.key)}
                                                                className={cn(
                                                                    'w-10 h-6 rounded-full transition-colors relative',
                                                                    staffPermissions.receptionist.includes(item.key) ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                                                                )}
                                                            >
                                                                <span className={cn(
                                                                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                                                                    staffPermissions.receptionist.includes(item.key) ? 'translate-x-5' : 'translate-x-1'
                                                                )} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <p className="text-xs text-secondary-theme">Los dueños y administradores siempre tienen acceso a todo.</p>
                                <button
                                    onClick={savePermissions}
                                    disabled={savingPermissions}
                                    className="flex items-center gap-2 bg-[var(--accent-primary)] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {savingPermissions ? 'Guardando...' : 'Guardar Defaults'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal permisos individuales */}
            {permissionsModalMember && (
                <PermissionsModal
                    member={permissionsModalMember}
                    onClose={() => setPermissionsModalMember(null)}
                    onSaved={handlePermissionsSaved}
                />
            )}

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

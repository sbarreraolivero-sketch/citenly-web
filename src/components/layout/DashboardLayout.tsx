import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    MessageSquare,
    Calendar,
    Settings,
    Sparkles,
    Bell,
    User,
    LogOut,
    ChevronDown,
    CalendarPlus,
    CalendarX,
    Clock,
    Star,
    BookOpen,
    Target,
    Megaphone,
    DollarSign,
    ShieldAlert,
    Menu,
    X,
    FileText,
    BellOff,
    Moon,
    Sun,
    Users,
    SlidersHorizontal,
    Plug,
} from 'lucide-react'
import { AIChatWidget } from '../AIChatWidget'
import { CreditWarningBanner } from './CreditWarningBanner'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import BranchSwitcher from './BranchSwitcher'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
    created_at: string
}

const navigationSections = [
    {
        label: 'Principal',
        accent: { label: 'text-[#FF4DA6]/70', active: 'bg-[#FF2E88]/[0.18]', dot: 'bg-[#FF2E88]', icon: 'text-[#FF4DA6]' },
        items: [
            { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
            { name: 'Mensajes', href: '/app/messages', icon: MessageSquare },
            { name: 'Plantillas', href: '/app/templates', icon: FileText },
        ],
    },
    {
        label: 'Clínica',
        accent: { label: 'text-sky-400/70', active: 'bg-sky-500/[0.18]', dot: 'bg-sky-400', icon: 'text-sky-300' },
        items: [
            { name: 'Contactos', href: '/app/patients', icon: Users },
            { name: 'CRM', href: '/app/crm', icon: Target },
            { name: 'Citas', href: '/app/appointments', icon: Calendar },
            { name: 'Recordatorios', href: '/app/reminders', icon: Clock },
            { name: 'Retención', href: '/app/retention', icon: ShieldAlert },
            { name: 'Finanzas', href: '/app/finance', icon: DollarSign },
        ],
    },
    {
        label: 'Marketing',
        accent: { label: 'text-violet-400/70', active: 'bg-violet-500/[0.18]', dot: 'bg-violet-400', icon: 'text-violet-300' },
        items: [
            { name: 'Campañas', href: '/app/campaigns', icon: Megaphone },
            { name: 'Fidelización', href: '/app/loyalty', icon: Star },
        ],
    },
    {
        label: 'Agente IA',
        accent: { label: 'text-sky-400/70', active: 'bg-sky-500/[0.18]', dot: 'bg-sky-400', icon: 'text-sky-300' },
        items: [
            { name: 'Conocimiento', href: '/app/knowledge-base', icon: BookOpen },
            { name: 'Integraciones', href: '/app/integrations', icon: Plug },
            { name: 'Ajustes IA', href: '/app/ai-settings', icon: SlidersHorizontal },
        ],
    },
    {
        label: 'Configuración',
        accent: { label: 'text-amber-400/70', active: 'bg-amber-500/[0.18]', dot: 'bg-amber-400', icon: 'text-amber-300' },
        items: [
            { name: 'Ajustes', href: '/app/settings', icon: Settings },
        ],
    },
]

// Flat list for header title lookup
const navigation = navigationSections.flatMap(s => s.items)

// Items restricted to owner/admin
const RESTRICTED_ITEMS = ['Finanzas', 'Retención', 'CRM', 'Campañas']

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'new_appointment':
            return <CalendarPlus className="w-4 h-4 text-blue-500" />
        case 'confirmed':
        case 'confirmed_appointment':
        case 'appointment_confirmed':
        case 'scheduled':
        case 'booked':
            return <Bell className="w-4 h-4 text-amber-400" />
        case 'cancelled':
            return <CalendarX className="w-4 h-4 text-red-500" />
        case 'pending_reminder':
            return <Clock className="w-4 h-4 text-amber-500" />
        case 'new_message':
            return <MessageSquare className="w-4 h-4 text-[#FF2E88]" />
        case 'survey_response':
            return <Star className="w-4 h-4 text-yellow-500" />
        case 'human_handoff':
            return <BellOff className="w-4 h-4 text-red-500" />
        default:
            return <Bell className="w-4 h-4 text-white/30" />
    }
}

export default function DashboardLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, profile, member, signOut } = useAuth()

    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [notificationsLimit, setNotificationsLimit] = useState(10)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

    // Theme management
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light'
        document.body.dataset.theme = savedTheme
        if (savedTheme === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
        if (savedTheme !== theme) setTheme(savedTheme)
    }, [])

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark'
        document.body.dataset.theme = next
        if (next === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', next)
        setTheme(next)
    }

    // Check activation status and redirect
    useEffect(() => {
        const checkActivation = async () => {
            const ownerEmails = ['claubarreraolivero@gmail.com', 'sebabarreraolivero@gmail.com', 'sebabarrera@gmail.com']
            if (user?.email && ownerEmails.includes(user.email.toLowerCase().trim())) return

            if (profile?.clinic_id) {
                const { data } = await (supabase as any)
                    .from('clinic_settings')
                    .select('activation_status')
                    .eq('id', profile.clinic_id)
                    .single()

                if (data?.activation_status === 'pending_activation') {
                    navigate('/pending-activation', { replace: true })
                    return
                }

                const { data: subData } = await (supabase as any)
                    .from('subscriptions')
                    .select('status, trial_ends_at')
                    .eq('clinic_id', profile.clinic_id)
                    .single()

                if (subData) {
                    const trialExpired = subData.trial_ends_at && new Date(subData.trial_ends_at) < new Date()
                    const notActive = subData.status !== 'active'
                    if (trialExpired && notActive && location.pathname !== '/app/settings') {
                        navigate('/app/settings?tab=subscription&expired=1', { replace: true })
                    }
                }
            }
        }
        checkActivation()
    }, [user?.email, profile?.clinic_id, navigate])

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!profile?.clinic_id) return
            try {
                const { data, error } = await (supabase as any)
                    .from('notifications')
                    .select('*')
                    .eq('clinic_id', profile.clinic_id)
                    .order('created_at', { ascending: false })
                    .limit(notificationsLimit)

                if (error) throw error
                setNotifications(data || [])
                setHasMore((data?.length || 0) === notificationsLimit)
            } catch (error) {
                console.error('Error fetching notifications:', error)
            }
        }

        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [profile?.clinic_id, notificationsLimit])

    const handleLoadMore = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setLoadingMore(true)
        await new Promise(resolve => setTimeout(resolve, 400))
        setNotificationsLimit(prev => prev + 10)
        setLoadingMore(false)
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    const markAsRead = async (notificationId: string) => {
        try {
            await (supabase as any).from('notifications').update({ is_read: true }).eq('id', notificationId)
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
        if (unreadIds.length === 0) return
        try {
            await (supabase as any).from('notifications').update({ is_read: true }).in('id', unreadIds)
            setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n))
        } catch (error) {
            console.error('Error marking all as read:', error)
        }
    }

    useEffect(() => {
        if (!showNotifications && notifications.some(n => !n.is_read)) {
            markAllAsRead()
        }
    }, [showNotifications])

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id)
        setShowNotifications(false)
        switch (notification.type) {
            case 'new_appointment':
            case 'confirmed':
            case 'cancelled':
            case 'pending_reminder':
                navigate('/app/appointments')
                break
            case 'new_message':
            case 'human_handoff':
                navigate('/app/messages')
                break
            case 'survey_response':
                navigate('/app/retention')
                break
        }
    }

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)
        if (diffMins < 1) return 'Ahora'
        if (diffMins < 60) return `Hace ${diffMins}m`
        if (diffHours < 24) return `Hace ${diffHours}h`
        return `Hace ${diffDays}d`
    }

    const handleSignOut = async () => {
        try { await signOut() } catch (error) { console.error('Sign out error:', error) }
        finally { navigate('/login') }
    }

    const userName = profile?.full_name || 'Usuario Demo'
    const userRole = member?.job_title || (
        (profile as any)?.role === 'owner' ? 'Dueño' :
        (profile as any)?.role === 'admin' ? 'Administrador' :
        (profile as any)?.role === 'professional' ? 'Profesional' :
        (profile as any)?.role === 'receptionist' ? 'Recepción' : 'Staff'
    )

    const isOwnerOrAdmin = member?.role === 'owner' || profile?.role === 'owner' || member?.role === 'admin' || profile?.role === 'admin'
    const ownerEmails = ['claubarreraolivero@gmail.com', 'sebabarreraolivero@gmail.com', 'sebabarrera@gmail.com']
    const isNuclearOwner = user?.email ? ownerEmails.includes(user.email.toLowerCase().trim()) : false

    const getVisibleItems = (items: typeof navigationSections[0]['items']) =>
        items.filter(item => {
            if (RESTRICTED_ITEMS.includes(item.name)) return isOwnerOrAdmin || isNuclearOwner
            return true
        })

    const renderNavItems = (section: typeof navigationSections[0], collapsed: boolean, onClick?: () => void) => {
        const visibleItems = getVisibleItems(section.items)
        if (visibleItems.length === 0) return null

        return (
            <div key={section.label} className="mb-1">
                {!collapsed && (
                    <p className={cn('px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.1em]', section.accent.label)}>
                        {section.label}
                    </p>
                )}
                {visibleItems.map((item) => {
                    const [itemPath, itemQuery] = item.href.split('?')
                    const isActive = itemQuery
                        ? location.pathname === itemPath && location.search === `?${itemQuery}`
                        : location.pathname === item.href
                    return (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            title={collapsed ? item.name : undefined}
                            onClick={onClick}
                            className={cn(
                                'relative flex items-center gap-3 mx-2 px-3 py-[9px] rounded-lg text-[13px] font-medium transition-all duration-150',
                                isActive
                                    ? cn(section.accent.active, 'text-white')
                                    : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85',
                                collapsed && 'justify-center px-0 mx-1'
                            )}
                        >
                            {isActive && (
                                <span className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full', section.accent.dot)} />
                            )}
                            <item.icon className={cn(
                                'shrink-0 w-[18px] h-[18px]',
                                isActive ? section.accent.icon : 'text-white/40'
                            )} />
                            <span className={cn(
                                'transition-all duration-200 overflow-hidden whitespace-nowrap',
                                collapsed ? 'w-0 opacity-0' : 'opacity-100'
                            )}>
                                {item.name}
                            </span>
                        </NavLink>
                    )
                })}
            </div>
        )
    }

    const sidebarFooter = (collapsed: boolean) => (
        <div className="p-3 border-t border-white/[0.06] shrink-0">
            <div className={cn(
                'flex items-center gap-3 rounded-xl bg-[#FF2E88]/[0.12] border border-[#FF2E88]/25 transition-all duration-200',
                collapsed ? 'p-2 justify-center' : 'px-3 py-3'
            )}>
                <div className="shrink-0 w-2 h-2 bg-[#FF2E88] rounded-full animate-pulse" />
                <div className={cn('min-w-0 overflow-hidden transition-all duration-200', collapsed ? 'w-0 opacity-0' : 'opacity-100')}>
                    <p className="text-[13px] font-semibold text-white leading-tight">IA Activa</p>
                    <p className="text-[11px] text-white/40">Respondiendo 24/7</p>
                </div>
            </div>
        </div>
    )

    return (
        <div className="flex h-screen bg-primary-theme text-primary-theme overflow-hidden transition-colors duration-200">
            {/* Mobile Sidebar Overlay */}
            {showMobileMenu && (
                <div className="fixed inset-0 bg-charcoal/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)} />
            )}

            {/* Desktop Sidebar */}
            <aside className={cn(
                'fixed inset-y-0 left-0 z-50 bg-[#111827] flex flex-col transition-all duration-300 ease-in-out md:relative md:translate-x-0 hidden md:flex',
                isSidebarCollapsed ? 'w-[68px]' : 'w-[216px]'
            )}>
                {/* Logo */}
                <div
                    className="h-14 flex items-center gap-3 px-4 border-b border-white/[0.06] cursor-pointer hover:bg-white/[0.03] transition-colors shrink-0"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-[#FF2E88] to-[#FF4DA6] flex items-center justify-center shadow-[0_0_12px_rgba(255,46,136,0.3)]">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className={cn('transition-all duration-200 overflow-hidden', isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100')}>
                        <p className="text-[15px] font-bold text-white leading-tight tracking-tight">Citenly</p>
                        <p className="text-[10px] text-white/35 font-medium tracking-widest uppercase leading-none">Beauty AI</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-3 overflow-y-auto scrollbar-soft">
                    {navigationSections.map(section => renderNavItems(section, isSidebarCollapsed))}
                </nav>

                {sidebarFooter(isSidebarCollapsed)}
            </aside>

            {/* Mobile Sidebar */}
            <aside className={cn(
                'fixed inset-y-0 left-0 z-50 w-[216px] bg-[#111827] flex flex-col transition-transform duration-300 ease-in-out md:hidden',
                showMobileMenu ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF2E88] to-[#FF4DA6] flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-white leading-tight">Citenly</p>
                            <p className="text-[10px] text-white/35 uppercase tracking-widest">Beauty AI</p>
                        </div>
                    </div>
                    <button onClick={() => setShowMobileMenu(false)} className="p-1.5 text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <nav className="flex-1 py-3 overflow-y-auto scrollbar-soft">
                    {navigationSections.map(section => renderNavItems(section, false, () => setShowMobileMenu(false)))}
                </nav>
                {sidebarFooter(false)}
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col w-full min-w-0 relative">
                <CreditWarningBanner />

                {/* Header */}
                <header className="h-14 border-b border-theme flex items-center justify-between px-4 md:px-6 bg-primary-theme transition-colors duration-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            className="p-2 -ml-2 text-secondary-theme hover:text-primary-theme hover:bg-secondary-theme rounded-soft md:hidden"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-[15px] font-bold text-primary-theme tracking-tight truncate">
                            {navigation.find((n) => {
                                const [p] = n.href.split('?')
                                return p === location.pathname
                            })?.name || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-secondary-theme hover:text-primary-theme hover:bg-secondary-theme rounded-soft transition-colors"
                            title="Alternar Tema"
                        >
                            {theme === 'dark'
                                ? <Sun className="w-4 h-4 text-amber-400" />
                                : <Moon className="w-4 h-4" />
                            }
                        </button>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-secondary-theme hover:text-primary-theme hover:bg-secondary-theme rounded-soft transition-colors"
                            >
                                <Bell className="w-4 h-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#FF2E88] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="fixed top-14 left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-96 bg-white dark:bg-[#1a1a2e] rounded-soft shadow-soft-lg border border-silk-beige dark:border-white/10 z-[100]">
                                    <div className="px-4 py-3 border-b border-silk-beige dark:border-white/10 flex items-center justify-between">
                                        <h3 className="font-medium text-charcoal dark:text-white text-sm">Notificaciones</h3>
                                        <span className="text-xs text-charcoal/50 dark:text-white/40">{unreadCount} nuevas</span>
                                    </div>
                                    <div className="max-h-80 overflow-auto">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 text-center">
                                                <Bell className="w-8 h-8 text-charcoal/20 dark:text-white/20 mx-auto mb-3" />
                                                <p className="text-sm text-charcoal/50 dark:text-white/40">No tienes notificaciones</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-silk-beige dark:divide-white/10">
                                                {notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={cn(
                                                            'px-4 py-3 hover:bg-ivory/50 dark:hover:bg-white/5 cursor-pointer transition-colors',
                                                            !notification.is_read && 'bg-[#FF2E88]/5'
                                                        )}
                                                        onClick={() => handleNotificationClick(notification)}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={cn('text-sm text-charcoal dark:text-white', !notification.is_read && 'font-semibold')}>
                                                                    {notification.title}
                                                                </p>
                                                                <p className="text-xs text-charcoal/50 dark:text-white/40 mt-0.5 truncate">
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-[10px] text-charcoal/40 dark:text-white/30 mt-1">
                                                                    {formatTimeAgo(notification.created_at)}
                                                                </p>
                                                            </div>
                                                            {!notification.is_read && (
                                                                <div className="w-2 h-2 bg-[#FF2E88] rounded-full mt-1.5 shrink-0" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {hasMore && (
                                                    <button
                                                        onClick={handleLoadMore}
                                                        disabled={loadingMore}
                                                        className="w-full py-3 px-4 text-xs font-bold text-[#FF2E88] hover:bg-ivory/50 dark:hover:bg-white/5 transition-colors border-t border-silk-beige dark:border-white/10 flex items-center justify-center gap-2"
                                                    >
                                                        {loadingMore ? (
                                                            <><div className="w-3 h-3 border-2 border-[#FF2E88] border-t-transparent rounded-full animate-spin" />Cargando...</>
                                                        ) : 'Ver más notificaciones'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-2 border-t border-silk-beige dark:border-white/10">
                                        <button
                                            onClick={() => { setShowNotifications(false); navigate('/app/settings?tab=notifications') }}
                                            className="text-xs text-[#FF2E88] font-bold hover:underline"
                                        >
                                            Configurar notificaciones
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Menu */}
                        <div className="relative z-50 flex items-center gap-3">
                            <div className="hidden md:block w-48">
                                <BranchSwitcher />
                            </div>

                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 pl-3 border-l border-theme hover:bg-secondary-theme rounded-soft p-1.5 transition-colors"
                            >
                                <div className="text-right hidden md:block">
                                    <p className="text-[13px] font-medium text-primary-theme leading-tight">{userName}</p>
                                    <p className="text-[10px] text-secondary-theme">{userRole}</p>
                                </div>
                                <div className="w-8 h-8 bg-gradient-to-br from-[#FF2E88] to-[#FF4DA6] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-[0_0_10px_rgba(255,46,136,0.3)]">
                                    {getInitials(userName)}
                                </div>
                                <ChevronDown className={cn('w-3.5 h-3.5 text-secondary-theme transition-transform opacity-50', showUserMenu && 'rotate-180')} />
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#1a1a2e] rounded-soft shadow-soft-lg border border-silk-beige dark:border-white/10 py-1 z-50">
                                    <div className="px-4 py-3 border-b border-silk-beige dark:border-white/10 md:hidden">
                                        <p className="text-sm font-medium text-charcoal dark:text-white">{userName}</p>
                                        <p className="text-xs text-charcoal/50 dark:text-white/40">{profile?.email}</p>
                                    </div>
                                    <div className="md:hidden px-2 py-2 border-b border-silk-beige dark:border-white/10">
                                        <BranchSwitcher />
                                    </div>
                                    <Link to="/app/settings?tab=profile" onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-charcoal/70 dark:text-white/60 hover:bg-silk-beige/50 dark:hover:bg-white/5 transition-colors">
                                        <User className="w-4 h-4" /> Mi Perfil
                                    </Link>
                                    <Link to="/app/settings" onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-charcoal/70 dark:text-white/60 hover:bg-silk-beige/50 dark:hover:bg-white/5 transition-colors">
                                        <Settings className="w-4 h-4" /> Configuración
                                    </Link>
                                    <div className="border-t border-silk-beige dark:border-white/10 mt-1 pt-1">
                                        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                            <LogOut className="w-4 h-4" /> Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-3 sm:p-6 scrollbar-soft">
                    <Outlet />
                </main>
            </div>

            {/* Click outside to close menus */}
            {(showUserMenu || showNotifications) && (
                <div className="fixed inset-0 z-40" onClick={() => { setShowUserMenu(false); setShowNotifications(false) }} />
            )}

            <AIChatWidget variant="simulator" clinicId={profile?.clinic_id} />
        </div>
    )
}

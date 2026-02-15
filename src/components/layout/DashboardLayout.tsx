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
    Users,
    LogOut,
    ChevronDown,
    CalendarPlus,
    CalendarCheck,
    CalendarX,
    Clock,
    Star,
    BookOpen,
    Target,
    Megaphone,
    DollarSign,
    Menu,
    X,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
    created_at: string
}

const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Mensajes', href: '/app/messages', icon: MessageSquare },
    { name: 'Pacientes', href: '/app/patients', icon: Users },
    { name: 'Citas', href: '/app/appointments', icon: Calendar },
    { name: 'Campañas', href: '/app/campaigns', icon: Megaphone },
    { name: 'Finanzas', href: '/app/finance', icon: DollarSign },
    { name: 'CRM', href: '/app/crm', icon: Target },
    { name: 'Conocimiento', href: '/app/knowledge-base', icon: BookOpen },
    { name: 'Configuración', href: '/app/settings', icon: Settings },
]

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'new_appointment':
            return <CalendarPlus className="w-4 h-4 text-blue-500" />
        case 'confirmed':
            return <CalendarCheck className="w-4 h-4 text-emerald-500" />
        case 'cancelled':
            return <CalendarX className="w-4 h-4 text-red-500" />
        case 'pending_reminder':
            return <Clock className="w-4 h-4 text-amber-500" />
        case 'new_message':
            return <MessageSquare className="w-4 h-4 text-primary-500" />
        case 'survey_response':
            return <Star className="w-4 h-4 text-yellow-500" />
        default:
            return <Bell className="w-4 h-4 text-charcoal/50" />
    }
}

export default function DashboardLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const { profile, member, signOut } = useAuth()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!profile?.clinic_id) return

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (supabase as any)
                    .from('notifications')
                    .select('*')
                    .eq('clinic_id', profile.clinic_id)
                    .order('created_at', { ascending: false })
                    .limit(10)

                if (error) throw error
                setNotifications(data || [])
            } catch (error) {
                console.error('Error fetching notifications:', error)
            }
        }

        fetchNotifications()

        // Refresh notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [profile?.clinic_id])

    const unreadCount = notifications.filter(n => !n.is_read).length

    const markAsRead = async (notificationId: string) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            )
        } catch (error) {
            console.error('Error marking notification as read:', error)
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
        try {
            await signOut()
        } catch (error) {
            console.error('Sign out error:', error)
        } finally {
            navigate('/login')
        }
    }

    // For demo purposes, show placeholder if not authenticated
    const userName = profile?.full_name || 'Usuario Demo'
    const clinicName = 'Clínica Demo' // Will come from clinic_settings later
    const userRole = profile?.role === 'admin' ? 'Administrador' : 'Staff'

    const [showMobileMenu, setShowMobileMenu] = useState(false)

    return (
        <div className="flex h-screen bg-ivory overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {showMobileMenu && (
                <div
                    className="fixed inset-0 bg-charcoal/50 z-40 md:hidden"
                    onClick={() => setShowMobileMenu(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-ivory border-r border-silk-beige flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
                showMobileMenu ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-silk-beige">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-hero-gradient rounded-soft flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-charcoal">Citenly</h1>
                            <p className="text-xs text-charcoal/50 -mt-0.5">IA Assistant</p>
                        </div>
                    </div>
                    {/* Close Mobile Menu Button */}
                    <button
                        onClick={() => setShowMobileMenu(false)}
                        className="md:hidden p-2 -mr-2 text-charcoal/60 hover:text-charcoal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation.filter(item => {
                        // Hide Finance for non-owners
                        if (item.name === 'Finanzas' && member?.role !== 'owner') {
                            return false
                        }
                        return true
                    }).map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                onClick={() => setShowMobileMenu(false)}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-soft transition-all duration-200',
                                    isActive
                                        ? 'bg-primary-500/10 text-primary-600 font-medium'
                                        : 'text-charcoal/60 hover:bg-silk-beige/50 hover:text-charcoal'
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Footer - AI Status */}
                <div className="p-4 border-t border-silk-beige">
                    <div className="card-soft p-4 bg-gradient-to-br from-primary-500/5 to-accent-500/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-premium-gradient rounded-full flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-charcoal" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-charcoal truncate">IA Activa</p>
                                <p className="text-xs text-charcoal/50">Respondiendo 24/7</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col w-full min-w-0">
                {/* Header */}
                <header className="h-16 border-b border-silk-beige flex items-center justify-between px-4 md:px-6 bg-ivory">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            className="p-2 -ml-2 text-charcoal/60 hover:text-charcoal hover:bg-silk-beige/50 rounded-soft md:hidden"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <h2 className="text-lg font-semibold text-charcoal truncate">
                            {navigation.find((n) => n.href === location.pathname)?.name || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-charcoal/60 hover:text-charcoal hover:bg-silk-beige/50 rounded-soft transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-accent-500 rounded-full text-[10px] font-medium text-white flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-96 bg-white rounded-soft shadow-soft-lg border border-silk-beige z-50">
                                    <div className="px-4 py-3 border-b border-silk-beige flex items-center justify-between">
                                        <h3 className="font-medium text-charcoal">Notificaciones</h3>
                                        <span className="text-xs text-charcoal/50">{unreadCount} nuevas</span>
                                    </div>
                                    <div className="max-h-80 overflow-auto">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 text-center">
                                                <Bell className="w-10 h-10 text-charcoal/20 mx-auto mb-3" />
                                                <p className="text-sm text-charcoal/50">No tienes notificaciones</p>
                                                <p className="text-xs text-charcoal/40 mt-1">Las notificaciones aparecerán aquí</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-silk-beige">
                                                {notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={cn(
                                                            "px-4 py-3 hover:bg-ivory/50 cursor-pointer transition-colors",
                                                            !notification.is_read && "bg-primary-50/30"
                                                        )}
                                                        onClick={() => markAsRead(notification.id)}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5">
                                                                {getNotificationIcon(notification.type)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={cn(
                                                                    "text-sm text-charcoal",
                                                                    !notification.is_read && "font-medium"
                                                                )}>
                                                                    {notification.title}
                                                                </p>
                                                                <p className="text-xs text-charcoal/50 mt-0.5 truncate">
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-xs text-charcoal/40 mt-1">
                                                                    {formatTimeAgo(notification.created_at)}
                                                                </p>
                                                            </div>
                                                            {!notification.is_read && (
                                                                <div className="w-2 h-2 bg-primary-500 rounded-full mt-1.5" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-2 border-t border-silk-beige">
                                        <button
                                            onClick={() => {
                                                setShowNotifications(false)
                                                navigate('/app/settings?tab=notifications')
                                            }}
                                            className="text-xs text-primary-600 hover:underline"
                                        >
                                            Configurar notificaciones
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Menu */}
                        <div className="relative z-50">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-3 pl-4 border-l border-silk-beige hover:bg-silk-beige/30 rounded-soft p-2 transition-colors"
                            >
                                <div className="text-right">
                                    <p className="text-sm font-medium text-charcoal">{clinicName}</p>
                                    <p className="text-xs text-charcoal/50">{userRole}</p>
                                </div>
                                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                                    {getInitials(userName)}
                                </div>
                                <ChevronDown className={cn(
                                    "w-4 h-4 text-charcoal/40 transition-transform",
                                    showUserMenu && "rotate-180"
                                )} />
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-soft shadow-soft-lg border border-silk-beige py-1 z-50">
                                    <div className="px-4 py-3 border-b border-silk-beige">
                                        <p className="text-sm font-medium text-charcoal">{userName}</p>
                                        <p className="text-xs text-charcoal/50">{profile?.email || 'demo@citenly.com'}</p>
                                    </div>
                                    <Link
                                        to="/app/settings?tab=profile"
                                        onClick={() => setShowUserMenu(false)}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-charcoal/70 hover:bg-silk-beige/50 transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        Mi Perfil
                                    </Link>
                                    <Link
                                        to="/app/settings"
                                        onClick={() => setShowUserMenu(false)}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-charcoal/70 hover:bg-silk-beige/50 transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Configuración
                                    </Link>
                                    <div className="border-t border-silk-beige mt-1 pt-1">
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6 scrollbar-soft">
                    <Outlet />
                </main>
            </div>

            {/* Click outside to close menu */}
            {showUserMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                />
            )}
        </div>
    )
}


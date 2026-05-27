import { useState } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { ShieldAlert, LogOut, Users, Activity, Settings as SettingsIcon, Calendar, MessageSquare, Target, Menu, X } from 'lucide-react'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { cn } from '@/lib/utils'

const navigation = [
    { name: 'Activaciones', href: '/hq/dashboard', icon: Activity },
    { name: 'Mensajes',     href: '/hq/messages',  icon: MessageSquare },
    { name: 'Demos',        href: '/hq/calendar',  icon: Calendar },
    { name: 'CRM',          href: '/hq/crm',       icon: Target },
    { name: 'Clínicas',     href: '/hq/clinics',   icon: Users },
    { name: 'Configuración',href: '/hq/settings',  icon: SettingsIcon },
]

export default function AdminLayout() {
    const { signOutAdmin, adminUser } = useAdminAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleSignOut = async () => {
        await signOutAdmin()
        navigate('/hq/login', { replace: true })
    }

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-gray-800 shrink-0">
                <ShieldAlert className="w-6 h-6 text-[#FF2E88] mr-3" />
                <span className="text-xl font-bold text-white">Citenly HQ</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                isActive
                                    ? 'bg-[#FF2E88]/15 text-[#FF2E88]'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            )}
                        >
                            <Icon className={cn('mr-3 h-5 w-5', isActive ? 'text-[#FF2E88]' : 'text-gray-500')} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 shrink-0">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-[#FF2E88]/20 flex items-center justify-center text-[#FF2E88] font-bold text-sm">
                        {adminUser?.email?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Admin</p>
                        <p className="text-xs text-gray-500 truncate">{adminUser?.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="mt-3 w-full flex items-center justify-center px-4 py-2 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                </button>
            </div>
        </>
    )

    return (
        <div className="flex bg-gray-900 min-h-screen">
            {/* ── Desktop sidebar ──────────────────────────────────── */}
            <div className="hidden md:flex w-64 bg-gray-900 border-r border-gray-800 flex-col">
                <SidebarContent />
            </div>

            {/* ── Mobile drawer ────────────────────────────────────── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-900 border-r border-gray-800 flex flex-col">
                        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <SidebarContent />
                    </div>
                </div>
            )}

            {/* ── Main ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-950">
                {/* Mobile topbar */}
                <div className="md:hidden flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-[#FF2E88]" />
                        <span className="text-base font-bold text-white">Citenly HQ</span>
                    </div>
                    <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white p-1.5">
                        <Menu className="w-5 h-5" />
                    </button>
                </div>

                <main className="flex-1 overflow-y-auto w-full p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

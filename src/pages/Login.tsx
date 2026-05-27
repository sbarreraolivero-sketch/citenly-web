import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Bot, Calendar, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { signIn } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error } = await signIn(email, password)
        if (error) {
            setError('Credenciales incorrectas. Verifica tu email y contraseña.')
            setLoading(false)
            return
        }
        navigate('/dashboard')
    }

    return (
        <div className="min-h-screen bg-[#0A0A0F] flex">
            {/* ── Panel izquierdo — formulario ── */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 mb-10 w-fit group">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF2E88]/20 group-hover:scale-105 transition-transform">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">Citenly</span>
                    </Link>

                    <h1 className="text-3xl font-black text-white mb-2">Bienvenido de vuelta</h1>
                    <p className="text-white/50 text-sm mb-8">Ingresa a tu cuenta para gestionar tu centro estético.</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-2">Correo electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="tu@clinica.com"
                                    required
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2E88]/30 focus:border-[#FF2E88]/50 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-2">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2E88]/30 focus:border-[#FF2E88]/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link to="/forgot-password" className="text-sm text-[#FF2E88] hover:text-[#FF4DA6] transition-colors">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#FF2E88] hover:bg-[#e0287a] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#FF2E88]/20"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</>
                            ) : (
                                <>Ingresar <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-white/40 text-sm">
                        ¿No tienes cuenta?{' '}
                        <Link to="/register" className="text-[#FF2E88] font-medium hover:text-[#FF4DA6] transition-colors">
                            Registra tu centro estético
                        </Link>
                    </p>
                </div>
            </div>

            {/* ── Panel derecho — visual ── */}
            <div className="hidden lg:flex flex-1 bg-[#0D0D17] border-l border-white/5 items-center justify-center p-12 relative overflow-hidden">
                {/* Glows */}
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#FF2E88]/8 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-sm w-full">
                    <p className="text-xs font-black uppercase tracking-widest text-[#FF2E88] mb-3">Agente IA activo 24/7</p>
                    <h2 className="text-3xl font-black text-white mb-3 leading-tight">
                        Tu centro trabajando<br />mientras tú descansas
                    </h2>
                    <p className="text-white/50 text-sm mb-8">
                        El agente IA responde, agenda y confirma citas por WhatsApp en segundos, a cualquier hora.
                    </p>

                    {/* Mini chat mockup */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6">
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/8">
                            <div className="w-8 h-8 bg-[#FF2E88]/20 rounded-full flex items-center justify-center">
                                <Bot className="w-4 h-4 text-[#FF2E88]" />
                            </div>
                            <div>
                                <p className="text-white text-xs font-bold">Agente Citenly</p>
                                <p className="text-emerald-400 text-[10px] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                                    En línea
                                </p>
                            </div>
                            <span className="ml-auto text-white/20 text-[10px]">2:47 AM</span>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex justify-end">
                                <div className="bg-[#FF2E88]/20 text-white/80 text-xs rounded-2xl rounded-tr-sm px-3 py-2 max-w-[78%]">
                                    Hola! Quiero una limpieza facial 🌟
                                </div>
                            </div>
                            <div className="flex justify-start">
                                <div className="bg-white/8 text-white/80 text-xs rounded-2xl rounded-tl-sm px-3 py-2 max-w-[88%] leading-relaxed">
                                    ¡Hola María! Con gusto 💗 Tengo disponibilidad el miércoles a las 3 PM y el viernes a las 10 AM. ¿Cuál te viene mejor?
                                </div>
                            </div>
                        </div>
                        <p className="text-white/20 text-[10px] text-right mt-2">Respondido en 4 segundos</p>
                    </div>

                    {/* Bullets */}
                    <div className="space-y-3">
                        {[
                            { icon: Check, text: 'Hasta 50% menos no-shows' },
                            { icon: Calendar, text: 'Agenda 24/7 sin recepcionista' },
                            { icon: Check, text: 'Respuestas en menos de 1 minuto' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-[#FF2E88]/15 rounded-full flex items-center justify-center shrink-0">
                                    <item.icon className="w-3 h-3 text-[#FF2E88]" />
                                </div>
                                <span className="text-white/55 text-sm">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

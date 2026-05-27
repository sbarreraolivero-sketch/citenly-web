import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Mail, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Lock, Key } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        setErrorMessage('')
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            })
            if (error) throw error
            setStatus('success')
        } catch (error) {
            console.error('Error resetting password:', error)
            setStatus('error')
            setErrorMessage('No pudimos enviar el correo. Verifica que el email sea correcto e intenta de nuevo.')
        }
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

                    {status === 'success' ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h1 className="text-3xl font-black text-white mb-3">¡Correo enviado!</h1>
                            <p className="text-white/50 text-sm mb-8 leading-relaxed">
                                Enviamos un enlace de recuperación a{' '}
                                <span className="text-white font-medium">{email}</span>.
                                Revisa tu bandeja de entrada (y spam).
                            </p>
                            <Link
                                to="/login"
                                className="w-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Volver al inicio de sesión
                            </Link>
                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-4 text-sm text-[#FF2E88] hover:text-[#FF4DA6] transition-colors"
                            >
                                Intentar con otro correo
                            </button>
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-3xl font-black text-white mb-2">Recuperar contraseña</h1>
                            <p className="text-white/50 text-sm mb-8">
                                Ingresa tu correo y te enviamos las instrucciones para restablecer tu acceso.
                            </p>

                            {status === 'error' && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm">
                                    {errorMessage}
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
                                            disabled={status === 'loading'}
                                            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2E88]/30 focus:border-[#FF2E88]/50 transition-all disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full bg-[#FF2E88] hover:bg-[#e0287a] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#FF2E88]/20"
                                >
                                    {status === 'loading' ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                                    ) : (
                                        'Enviar enlace de recuperación'
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 text-center">
                                <Link
                                    to="/login"
                                    className="text-white/40 hover:text-white/70 flex items-center justify-center gap-2 text-sm transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Panel derecho — visual ── */}
            <div className="hidden lg:flex flex-1 bg-[#0D0D17] border-l border-white/5 items-center justify-center p-12 relative overflow-hidden">
                {/* Glows */}
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#FF2E88]/8 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-sm w-full">
                    <div className="w-14 h-14 bg-[#FF2E88]/15 border border-[#FF2E88]/20 rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck className="w-7 h-7 text-[#FF2E88]" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#FF2E88] mb-3">Acceso seguro</p>
                    <h2 className="text-3xl font-black text-white mb-4 leading-tight">
                        Tus datos protegidos<br />en todo momento
                    </h2>
                    <p className="text-white/50 text-sm mb-8">
                        Protegemos la información de tu centro estético y tus pacientes con los más altos estándares de seguridad.
                    </p>

                    <div className="space-y-3">
                        {[
                            { icon: Lock, text: 'Cifrado AES-256 en reposo y tránsito' },
                            { icon: Key, text: 'Recuperación de acceso en minutos' },
                            { icon: ShieldCheck, text: 'Sin acceso no autorizado a tus datos' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                                <div className="w-8 h-8 bg-[#FF2E88]/15 rounded-lg flex items-center justify-center shrink-0">
                                    <item.icon className="w-4 h-4 text-[#FF2E88]" />
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

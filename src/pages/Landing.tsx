import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import {
    Sparkles, ArrowRight, Check, Bot, Calendar, MessageSquare, Bell,
    TrendingUp, Users, Star, BarChart3, ChevronDown, Gift, Zap, Crown,
} from 'lucide-react'
import { AIChatWidget } from '../components/AIChatWidget'

// ── Scroll animation ────────────────────────────────────────────────────────
function useScrollReveal() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach(e => {
                if (e.isIntersecting) { e.target.classList.add('reveal-visible'); observer.unobserve(e.target) }
            }),
            { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
        )
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
        return () => observer.disconnect()
    }, [])
}

// ── Currency ────────────────────────────────────────────────────────────────
type CurrencyCode = 'USD' | 'CLP' | 'COP' | 'MXN' | 'PEN'
const RATES: Record<CurrencyCode, { rate: number; symbol: string; label: string; flag: string }> = {
    USD: { rate: 1,      symbol: 'US$', label: 'USD — Dólares',             flag: '🇺🇸' },
    CLP: { rate: 945,    symbol: '$',   label: 'CLP — Pesos Chilenos',      flag: '🇨🇱' },
    COP: { rate: 4200,   symbol: '$',   label: 'COP — Pesos Colombianos',   flag: '🇨🇴' },
    MXN: { rate: 18,     symbol: '$',   label: 'MXN — Pesos Mexicanos',     flag: '🇲🇽' },
    PEN: { rate: 3.75,   symbol: 'S/',  label: 'PEN — Soles Peruanos',      flag: '🇵🇪' },
}

// ── Conversation ────────────────────────────────────────────────────────────
const CONVERSATION = [
    { from: 'client', text: 'Hola! Quiero agendar una sesión de limpieza facial 🌟' },
    { from: 'ai',     text: '¡Hola María! Qué gusto saludarte 💗 Claro, tengo disponibilidad esta semana. ¿Te viene mejor el miércoles o el viernes?' },
    { from: 'client', text: 'El miércoles a las 15:00 si hay 🙏' },
    { from: 'ai',     text: '✅ ¡Perfecto! Agendé tu sesión de Limpieza Facial para el miércoles 28 a las 15:00. Te envío recordatorio el día anterior. ¿Algo más, María?' },
    { from: 'client', text: 'No, muchas gracias! 😊' },
    { from: 'ai',     text: '¡Con gusto! Te esperamos. 💗' },
]

// ── Feature modules (Vetly-style numbered cards) ───────────────────────────
const MODULES = [
    {
        num: '01', title: 'Agenda Inteligente', icon: Calendar,
        gradient: 'from-emerald-500 to-emerald-700',
        desc: 'Tus clientas eligen horario directamente en WhatsApp. Confirmaciones automáticas y sin idas y vueltas.',
        preview: (
            <div className="bg-white/10 rounded-xl p-3 space-y-2 mt-4">
                {[['10:30', 'Limpieza facial', 'Confirmada', 'text-emerald-300'], ['12:00', 'Depilación laser', 'Pendiente', 'text-amber-300'], ['15:00', 'Microblading', 'Confirmada', 'text-emerald-300']].map(([h, s, st, c]) => (
                    <div key={h} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2"><span className="text-xs font-bold text-white">{h}</span><span className="text-xs text-white/70">{s}</span></div>
                        <span className={`text-[10px] font-black ${c}`}>{st}</span>
                    </div>
                ))}
            </div>
        ),
    },
    {
        num: '02', title: 'Agente IA WhatsApp 24/7', icon: Bot,
        gradient: 'from-[#FF2E88] to-[#c0236a]',
        desc: 'Responde consultas, agenda citas y capta prospectos automáticamente. Sin recepcionista, sin tiempos muertos.',
        preview: (
            <div className="bg-white/10 rounded-xl p-3 space-y-2 mt-4">
                <div className="bg-[#202C33] rounded-xl rounded-tl-none p-2.5 max-w-[90%]"><p className="text-[11px] text-white/90">¡Hola! Soy la IA de Clínica Bella. ¿En qué te puedo ayudar hoy? 💗</p></div>
                <div className="bg-[#005C4B] rounded-xl rounded-tr-none p-2.5 max-w-[90%] ml-auto"><p className="text-[11px] text-white/90">Quiero saber el precio de la limpieza facial</p></div>
                <div className="bg-[#202C33] rounded-xl rounded-tl-none p-2.5 max-w-[90%]"><p className="text-[11px] text-white/90">La sesión de Limpieza Facial Profunda tiene un valor de $35.000. ¿Te agendo para esta semana? 😊</p></div>
            </div>
        ),
    },
    {
        num: '03', title: 'CRM de Prospectos', icon: Users,
        gradient: 'from-violet-500 to-violet-700',
        desc: 'Pipeline visual de leads. Sigue cada prospecto desde el primer mensaje hasta la conversión en cliente.',
        preview: (
            <div className="bg-white/10 rounded-xl p-3 space-y-1.5 mt-4">
                {[['Nuevo', '12', 'bg-indigo-400/30', 'text-indigo-300'], ['Contactado', '7', 'bg-sky-400/30', 'text-sky-300'], ['Convertido', '4', 'bg-emerald-400/30', 'text-emerald-300']].map(([s, n, bg, t]) => (
                    <div key={s} className={`flex items-center justify-between ${bg} rounded-lg px-3 py-2`}>
                        <span className="text-xs font-bold text-white">{s}</span>
                        <span className={`text-sm font-black ${t}`}>{n}</span>
                    </div>
                ))}
            </div>
        ),
    },
    {
        num: '04', title: 'Finanzas y Métricas', icon: BarChart3,
        gradient: 'from-sky-500 to-sky-700',
        desc: 'Ingresos, citas y conversiones en tiempo real. Toma decisiones de crecimiento con datos accionables.',
        preview: (
            <div className="bg-white/10 rounded-xl p-3 mt-4">
                <div className="grid grid-cols-3 gap-2 mb-2">
                    {[['$2.1M', 'Ingresos'], ['48', 'Citas'], ['82%', 'Retención']].map(([v, l]) => (
                        <div key={l} className="bg-white/15 rounded-lg p-2 text-center"><p className="text-sm font-black text-white">{v}</p><p className="text-[9px] text-white/50">{l}</p></div>
                    ))}
                </div>
                <div className="h-10 bg-white/10 rounded-lg flex items-end gap-1 px-2 pb-1">
                    {[60, 80, 45, 90, 70, 85, 65].map((h, i) => (
                        <div key={i} className="flex-1 bg-sky-400/60 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>
        ),
    },
    {
        num: '05', title: 'Recordatorios Automáticos', icon: Bell,
        gradient: 'from-amber-500 to-amber-700',
        desc: 'Envía recordatorios 24h y 2h antes de cada cita. Reduce ausencias hasta un 70%. Sin esfuerzo manual.',
        preview: (
            <div className="bg-white/10 rounded-xl p-3 mt-4 space-y-2">
                <div className="bg-amber-400/20 border border-amber-400/30 rounded-lg p-2.5">
                    <p className="text-[10px] font-black text-amber-300 uppercase mb-1">Recordatorio 24h antes</p>
                    <p className="text-[11px] text-white/80">¡Hola María! Mañana a las 15:00 tienes tu sesión de Limpieza Facial. Responde SI para confirmar 📅</p>
                </div>
                <div className="bg-emerald-400/20 border border-emerald-400/30 rounded-lg px-3 py-2 ml-auto w-fit"><p className="text-[11px] text-white font-bold">SI ✓</p></div>
            </div>
        ),
    },
    {
        num: '06', title: 'Retención y Campañas', icon: TrendingUp,
        gradient: 'from-rose-500 to-rose-700',
        desc: 'Detecta clientas que no vuelven y reactívalas con campañas personalizadas de WhatsApp en automático.',
        preview: (
            <div className="bg-white/10 rounded-xl p-3 mt-4 space-y-1.5">
                <p className="text-[10px] font-black text-rose-300 uppercase mb-2">Campaña de Reactivación</p>
                {[['Valentina M.', '45 días sin volver', '✓ enviado'], ['Daniela F.', '62 días sin volver', '✓ enviado'], ['Camila H.', '31 días sin volver', 'pendiente']].map(([n, d, s]) => (
                    <div key={n} className="flex items-center justify-between bg-white/10 rounded-lg px-2.5 py-1.5">
                        <div><p className="text-[10px] font-bold text-white">{n}</p><p className="text-[9px] text-white/40">{d}</p></div>
                        <span className="text-[9px] text-white/50">{s}</span>
                    </div>
                ))}
            </div>
        ),
    },
]

// ── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'core', name: 'Core', icon: Sparkles,
        tagline: 'Gestión completa sin IA conversacional.',
        priceUSD: 33,
        description: 'Todo lo necesario para gestionar tu centro sin depender de mensajería manual.',
        gradient: 'from-slate-500 to-slate-700',
        highlight: false,
        features: ['1 usuario · 1 agenda', 'Dashboard + métricas', 'Calendario de citas (manual)', 'Fichas de clientas', 'Módulo de finanzas', 'Sistema de referidos'],
        cta: 'Agendar Implementación',
    },
    {
        id: 'starter', name: 'Starter', icon: Zap,
        tagline: 'Para esteticistas independientes.',
        priceUSD: 89,
        description: 'Agente IA en WhatsApp + gestión completa para quien trabaja sola o con un equipo pequeño.',
        gradient: 'from-emerald-500 to-emerald-700',
        highlight: false,
        features: ['2 usuarios · 1 agenda', 'Todo lo de Core', 'Agente IA WhatsApp', '2.000 créditos IA/mes', 'Hasta 100 citas con IA/mes', '100 recordatorios/mes', 'Campañas básicas (50/mes)'],
        cta: 'Agendar Implementación',
    },
    {
        id: 'pro', name: 'Pro', icon: Zap,
        tagline: 'Para centros estéticos en crecimiento.',
        priceUSD: 149,
        description: 'La solución completa para captar, retener y automatizar tu clínica de estética.',
        gradient: 'from-[#FF2E88] to-[#c0236a]',
        highlight: true,
        badge: 'Más Popular',
        features: ['5 usuarios · 5 agendas', 'Todo lo de Starter', '5.000 créditos IA/mes', 'Citas con IA ilimitadas', '250 recordatorios/mes', 'Motor de retención activa', 'Encuestas de satisfacción', 'Soporte prioritario'],
        cta: 'Agendar Implementación',
    },
    {
        id: 'enterprise', name: 'Enterprise', icon: Crown,
        tagline: 'Redes de salones y multi-sucursal.',
        priceUSD: 349,
        description: 'Infraestructura empresarial para controlar y escalar múltiples sedes desde un solo panel.',
        gradient: 'from-[#1a1a2e] to-[#0f0f23]',
        highlight: false,
        features: ['Usuarios y agendas ilimitados', 'Todo lo de Pro', '12.000 créditos IA/mes', 'Recordatorios ilimitados', 'Multi-sucursal unificado', 'IA personalizada por servicio', 'Super Administrador', 'Soporte 24/7 dedicado'],
        cta: 'Agendar Implementación',
    },
]

const TESTIMONIALS = [
    { quote: 'Antes perdía 3 horas diarias respondiendo WhatsApp. Ahora Citenly lo hace todo y yo me enfoco en mis clientes.', name: 'Valentina Morales', role: 'Dueña · Centro de Estética Bella', initials: 'VM' },
    { quote: 'Mis ausencias bajaron un 70% con los recordatorios automáticos. No puedo creer que antes lo hacía a mano.', name: 'Daniela Fuentes', role: 'Esteticista · Salón DeLux', initials: 'DF' },
    { quote: 'El agente IA agenda citas mientras duermo. Llegué al trabajo y ya tenía 4 citas nuevas confirmadas.', name: 'Camila Herrera', role: 'Directora · Clínica Radiante', initials: 'CH' },
]

const FAQS = [
    { q: '¿Necesito saber de tecnología?', a: 'No. Nosotros configuramos todo por ti. En menos de 48 horas tu agente IA está operando.' },
    { q: '¿Funciona con mi WhatsApp actual?', a: 'Usamos WhatsApp Business API oficial (YCloud). Tu número actual puede migrar en la mayoría de los casos.' },
    { q: '¿Qué pasa si el cliente pregunta algo que la IA no sabe?', a: 'La IA escala a un humano automáticamente. Tú defines qué preguntas maneja sola.' },
    { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Sin contratos ni permanencia. Cancelas cuando quieras desde tu panel.' },
]

export default function Landing() {
    useScrollReveal()
    const [currency, setCurrency] = useState<CurrencyCode>('USD')
    const rate = RATES[currency]

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-white">
            <style>{`
                .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }
                .reveal-visible { opacity: 1; transform: translateY(0); }
                .reveal-delay-1 { transition-delay: 0.1s; }
                .reveal-delay-2 { transition-delay: 0.2s; }
                .reveal-delay-3 { transition-delay: 0.3s; }
                .reveal-delay-4 { transition-delay: 0.4s; }
                .reveal-delay-5 { transition-delay: 0.5s; }
                .reveal-delay-6 { transition-delay: 0.6s; }
                @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
                @keyframes pulseGlow { 0%,100%{opacity:.4} 50%{opacity:.8} }
                .float-y { animation: floatY 6s ease-in-out infinite; }
                .pulse-glow { animation: pulseGlow 4s ease-in-out infinite; }
                @keyframes chat-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                .chat-msg { animation: chat-in 0.4s ease forwards; }
                .chat-delay-1 { animation-delay: 0.5s; opacity: 0; }
                .chat-delay-2 { animation-delay: 1.0s; opacity: 0; }
                .chat-delay-3 { animation-delay: 1.5s; opacity: 0; }
                .chat-delay-4 { animation-delay: 2.0s; opacity: 0; }
                .chat-delay-5 { animation-delay: 2.5s; opacity: 0; }
                .chat-delay-6 { animation-delay: 3.0s; opacity: 0; }
            `}</style>

            {/* ── Banner top ───────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-center gap-3">
                    <p className="text-sm text-gray-800 font-medium text-center">
                        🚀 <strong>Implementación GRATIS incluida</strong> — el equipo de Citenly configura todo.
                    </p>
                    <a href="#planes" className="text-sm font-bold text-[#FF2E88] hover:underline whitespace-nowrap">Ver planes →</a>
                </div>
            </div>

            {/* ── Navbar ───────────────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF2E88]/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tight text-white">Citenly</span>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
                        <a href="#modulos"        className="hover:text-white transition-colors">El Producto</a>
                        <a href="#planes"          className="hover:text-white transition-colors">Precios</a>
                        <a href="#como-funciona"   className="hover:text-white transition-colors">Cómo funciona</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block">Iniciar sesión</Link>
                        <Link to="/demo" className="flex items-center gap-1.5 bg-[#FF2E88] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#e0007a] transition-colors">
                            <span className="hidden sm:inline">Agendar Reunión Demo</span>
                            <span className="sm:hidden">Agendar Demo</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden pt-16 pb-24 px-6">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FF2E88]/8 rounded-full blur-[120px] pointer-events-none pulse-glow" />
                <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    {/* Left — copy */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-base font-bold mb-6">
                            <Sparkles className="w-4 h-4" />
                            Agente IA para centros de estética y belleza
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">
                            Tu Centro Estético{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E88] to-[#FF80C0]">Lleno</span>{' '}
                            Mientras Tú{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-sky-400">Atiendes</span>
                        </h1>
                        <p className="text-xl text-white/70 leading-relaxed mb-8 max-w-xl">
                            Un agente IA responde por WhatsApp, agenda citas y reactiva clientas inactivas — todo en automático, las 24 horas.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/demo" className="flex items-center justify-center gap-2 bg-[#FF2E88] text-white font-bold px-7 py-4 rounded-2xl hover:bg-[#e0007a] transition-all shadow-lg shadow-[#FF2E88]/25 text-base">
                                <span className="hidden sm:inline">Agendar Reunión Demo</span>
                                <span className="sm:hidden">Agendar Demo</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <a href="#como-funciona" className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-bold px-7 py-4 rounded-2xl hover:bg-white/10 transition-all text-base">
                                Ver cómo funciona <ChevronDown className="w-5 h-5" />
                            </a>
                        </div>
                        <div className="flex items-center gap-6 mt-8">
                            <div className="flex -space-x-2">
                                {['VM','DF','CH'].map(i => (
                                    <div key={i} className="w-8 h-8 bg-gradient-to-br from-[#FF2E88] to-violet-500 rounded-full border-2 border-[#0A0A0F] flex items-center justify-center text-[9px] font-black text-white">{i}</div>
                                ))}
                            </div>
                            <p className="text-sm text-white/50">
                                <strong className="text-white">+120 centros</strong> ya automatizados en Chile y Latinoamérica
                            </p>
                        </div>
                    </div>

                    {/* Right — WhatsApp mock */}
                    <div className="flex justify-center md:justify-end float-y">
                        <div className="w-full max-w-sm bg-[#0E1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                            <div className="bg-[#075E54] px-5 py-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#FF2E88] rounded-full flex items-center justify-center text-white font-black text-sm">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Citenly IA · Tu clínica</p>
                                    <p className="text-emerald-300 text-xs flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" /> En línea
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 space-y-3 bg-[#0B141A] min-h-[280px]">
                                {CONVERSATION.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.from === 'client' ? 'justify-end' : 'justify-start'} chat-msg chat-delay-${i + 1}`}>
                                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.from === 'client' ? 'bg-[#005C4B] text-white rounded-tr-none' : 'bg-[#202C33] text-white rounded-tl-none'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-[#1F2C34] px-4 py-3 flex items-center gap-2">
                                <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2 text-xs text-white/20">Escribe un mensaje...</div>
                                <div className="w-8 h-8 bg-[#FF2E88] rounded-full flex items-center justify-center">
                                    <MessageSquare className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats ────────────────────────────────────────────────── */}
            <section className="px-6 py-14 border-t border-b border-white/5 bg-white/[0.02]">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[['70%','Menos ausencias'],['24/7','Atención continua'],['3h/día','Tiempo recuperado'],['+120','Centros activos']].map(([v, l], i) => (
                        <div key={l} className={`reveal reveal-delay-${i + 1}`}>
                            <p className="text-3xl font-black text-white mb-1">{v}</p>
                            <p className="text-sm text-white/50 font-medium">{l}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Módulos (Vetly-style numbered cards) ─────────────────── */}
            <section id="modulos" className="px-6 py-24">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <div className="inline-block px-4 py-1.5 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            Todo en un solo lugar
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-white">
                            Todo lo que necesitas para tu{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E88] to-violet-400">gestión estética</span>
                            {' '}en un solo lugar.
                        </h2>
                        <p className="text-white/60 mt-3 text-lg">No es solo un chatbot. Es el sistema operativo de tu centro.</p>
                        <p className="text-white/50 mt-1 text-base">Todas estas funcionalidades incluidas desde el <strong className="text-white">Plan Core · US$33/mes</strong></p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {MODULES.map((mod, i) => (
                            <div key={mod.num} className={`reveal reveal-delay-${(i % 3) + 1} bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all`}>
                                {/* Colored header */}
                                <div className={`bg-gradient-to-br ${mod.gradient} p-5 flex items-start justify-between`}>
                                    <div>
                                        <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">{mod.num}</p>
                                        <h3 className="text-xl font-black text-white">{mod.title}</h3>
                                    </div>
                                    <mod.icon className="w-8 h-8 text-white/40" />
                                </div>
                                {/* Body */}
                                <div className="p-5">
                                    <p className="text-sm text-white/70 leading-relaxed">{mod.desc}</p>
                                    {mod.preview}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Cálculo Real ─────────────────────────────────────────── */}
            <section className="px-6 py-24 bg-[#0D0D17] border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <p className="text-xs font-black uppercase tracking-widest text-[#FF2E88] mb-3">El Cálculo Real</p>
                        <h2 className="text-4xl sm:text-5xl font-black text-white">Esto no es un gasto.<br />Es una <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E88] to-violet-400">inversión.</span></h2>
                        <p className="text-white/50 mt-3 text-lg">Cada mes que operas sin Citenly, estás pagando más de lo que crees.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 items-stretch">
                        {/* Recepcionista */}
                        <div className="reveal bg-white/[0.03] border border-white/10 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center"><span className="text-red-400 font-black text-lg">✗</span></div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Recepcionista tradicional</h3>
                                    <p className="text-xs text-white/40">Lo que realmente cuesta</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {[
                                    ['~$650.000 CLP / mes', 'Sueldo base + leyes sociales + eventual finiquito'],
                                    ['Máximo 44 horas semanales', 'Fuera de horario, ninguna clienta recibe respuesta'],
                                    ['Rendimiento variable', 'Depende de su estado de ánimo y concentración'],
                                    ['Vacaciones y licencias', 'Cuando ella falla, la operación se paraliza'],
                                    ['Contrato y responsabilidades legales', 'AFP, salud, seguro de cesantía, SUSESO y más'],
                                ].map(([t, d]) => (
                                    <div key={t} className="flex items-start gap-3">
                                        <span className="text-red-400 font-black mt-0.5">✗</span>
                                        <div><p className="text-sm font-bold text-white">{t}</p><p className="text-xs text-white/40">{d}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Citenly IA */}
                        <div className="reveal reveal-delay-2 bg-gradient-to-br from-[#FF2E88]/15 to-violet-900/15 border border-[#FF2E88]/30 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center"><Check className="w-5 h-5 text-emerald-400" /></div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Citenly IA</h3>
                                    <p className="text-xs text-white/40">Lo que realmente obtienes</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {[
                                    ['Desde US$89 / mes', 'Plan Starter — sin contrato, sin finiquito, sin cotizaciones previsionales'],
                                    ['Responde en menos de 5 segundos, 24/7', 'Incluidos domingos, festivos y madrugadas'],
                                    ['Siempre en su mejor versión', 'Sin fatiga, sin errores por distracción, sin mal día'],
                                    ['Sin interrupciones operativas', 'Cuando tu equipo falla, la clínica sigue atendiendo'],
                                    ['Cancela cuando quieras', 'Sin cláusulas, sin permanencia mínima'],
                                ].map(([t, d]) => (
                                    <div key={t} className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                        <div><p className="text-sm font-bold text-white">{t}</p><p className="text-xs text-white/40">{d}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Cómo funciona ─────────────────────────────────────────── */}
            <section id="como-funciona" className="px-6 py-24">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 text-white/50 rounded-full text-xs font-black uppercase tracking-widest mb-4">Cero esfuerzo manual</div>
                        <h2 className="text-4xl font-black text-white">Tres pasos para automatizar tu centro</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { step: '01', title: 'Conectamos tu WhatsApp', desc: 'El equipo de Citenly configura tu agente IA con el conocimiento de tu negocio. Tú no tocas nada.' },
                            { step: '02', title: 'La IA atiende y agenda', desc: 'Tu agente responde consultas, confirma citas y maneja objeciones — 24/7 sin intervención.' },
                            { step: '03', title: 'Tú creces sin fricción', desc: 'Más citas, menos ausencias, clientas felices. Todo visible en tu dashboard en tiempo real.' },
                        ].map((s, i) => (
                            <div key={i} className={`reveal reveal-delay-${i + 1} bg-white/[0.03] border border-white/10 rounded-2xl p-7`}>
                                <p className="text-5xl font-black text-[#FF2E88]/30 mb-4">{s.step}</p>
                                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                                <p className="text-white/60 text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Referidos ────────────────────────────────────────────── */}
            <section className="px-6 py-24 bg-[#0D0D17] border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="reveal">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/15 border border-violet-500/30 text-violet-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                                <Gift className="w-3.5 h-3.5" /> Sistema de Referidos
                            </div>
                            <h2 className="text-4xl font-black text-white mb-6">
                                Tus clientas{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-[#FF2E88]">te traen más clientas</span>
                            </h2>
                            <p className="text-white/60 text-lg leading-relaxed mb-8">
                                Citenly incluye un programa de fidelización y referidos integrado. Cada clienta recibe un código único para compartir. Cuando alguien llega por su recomendación, ambas ganan automáticamente.
                            </p>
                            <div className="space-y-4">
                                {[
                                    ['Códigos únicos por clienta', 'Generados y enviados por WhatsApp automáticamente'],
                                    ['Recompensas configurables', 'Puntos, descuentos o sesiones gratuitas — tú decides'],
                                    ['Panel de referidos en tiempo real', 'Ve quién recomienda más y prémialas primero'],
                                ].map(([t, d]) => (
                                    <div key={t} className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-violet-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                            <Check className="w-3.5 h-3.5 text-violet-400" />
                                        </div>
                                        <div><p className="text-sm font-bold text-white">{t}</p><p className="text-xs text-white/40">{d}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Mini UI mockup */}
                        <div className="reveal reveal-delay-2">
                            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-white">Mis referidos</h4>
                                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs font-bold rounded-full">Activo</span>
                                </div>
                                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-4 text-center">
                                    <p className="text-xs text-white/40 mb-1">Tu código único</p>
                                    <p className="text-2xl font-black text-white tracking-widest">BELLA2025</p>
                                    <p className="text-xs text-violet-400 mt-1">Compartir por WhatsApp →</p>
                                </div>
                                <div className="space-y-2">
                                    {[['Valentina M.', 'Limpieza facial', '+500 pts', 'emerald'], ['Daniela F.', 'Microblading', '+500 pts', 'emerald'], ['Camila H.', 'En espera', 'Pendiente', 'amber']].map(([n, s, p, c]) => (
                                        <div key={n} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                            <div><p className="text-xs font-bold text-white">{n}</p><p className="text-[10px] text-white/30">{s}</p></div>
                                            <span className={`text-xs font-bold text-${c}-400`}>{p}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 bg-[#FF2E88]/10 border border-[#FF2E88]/20 rounded-xl p-3 text-center">
                                    <p className="text-xs text-white/50">Puntos acumulados</p>
                                    <p className="text-2xl font-black text-[#FF2E88]">1.250 pts</p>
                                    <p className="text-xs text-white/30">= 1 sesión de limpieza facial gratis</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Testimonios ───────────────────────────────────────────── */}
            <section className="px-6 py-24">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            <Star className="w-3 h-3" /> Historias reales
                        </div>
                        <h2 className="text-4xl font-black text-white">Lo que dicen nuestras clínicas</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className={`reveal reveal-delay-${i + 1} bg-white/[0.03] border border-white/10 rounded-2xl p-6`}>
                                <div className="flex mb-4 gap-0.5">
                                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                                </div>
                                <p className="text-white/80 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF2E88] to-violet-500 rounded-full flex items-center justify-center text-white font-black text-xs">{t.initials}</div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{t.name}</p>
                                        <p className="text-white/40 text-xs">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ───────────────────────────────────────────────── */}
            <section id="planes" className="px-6 py-24 bg-[#0D0D17] border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <p className="text-xs font-black uppercase tracking-widest text-[#FF2E88] mb-3">Planes Transparentes</p>
                        <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Invierte en Inteligencia Estética, NO en gastos operativos</h2>
                        <p className="text-white/60 text-lg max-w-3xl mx-auto mb-8">Selecciona la capacidad del motor inteligente que se adapte al volumen de tu centro de estética.</p>

                        {/* Currency selector */}
                        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl">
                            <span className="text-sm font-bold text-white/60">Moneda:</span>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                                className="bg-transparent text-white font-bold outline-none border-none focus:ring-0 cursor-pointer text-sm"
                            >
                                {Object.entries(RATES).map(([code, data]) => (
                                    <option key={code} value={code} className="bg-[#111] text-white">{data.flag} {data.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
                        {PLANS.map((plan, i) => (
                            <div
                                key={plan.id}
                                className={`reveal reveal-delay-${i + 1} relative flex flex-col rounded-2xl overflow-hidden border transition-all ${
                                    plan.highlight
                                        ? 'border-[#FF2E88]/50 shadow-xl shadow-[#FF2E88]/10 md:-translate-y-3'
                                        : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                {/* Colored gradient header */}
                                <div className={`bg-gradient-to-br ${plan.gradient} p-5 relative`}>
                                    {plan.badge && (
                                        <div className="absolute -top-0 right-4 bg-white text-[#FF2E88] text-[9px] font-black px-3 py-1 rounded-b-lg uppercase tracking-widest">
                                            {plan.badge}
                                        </div>
                                    )}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                                            <p className="text-white/70 text-xs mt-1 font-medium">{plan.tagline}</p>
                                        </div>
                                        <plan.icon className="w-8 h-8 text-white/40" />
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-white">
                                                {rate.symbol}{Math.round(plan.priceUSD * rate.rate).toLocaleString('es-CL')}
                                            </span>
                                            <span className="text-white/50 text-sm">/mes</span>
                                        </div>
                                        {currency !== 'USD' && (
                                            <p className="text-white/30 text-[10px] mt-0.5">≈ US${plan.priceUSD}/mes</p>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="flex flex-col flex-1 bg-white/[0.03] p-5">
                                    <p className="text-sm text-white/60 leading-relaxed mb-5 pb-5 border-b border-white/10 border-dashed">{plan.description}</p>
                                    <ul className="space-y-3 flex-1 mb-6">
                                        {plan.features.map((feat, fi) => (
                                            <li key={fi} className="flex items-start gap-2.5">
                                                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${plan.highlight ? 'bg-[#FF2E88]/20' : 'bg-white/10'}`}>
                                                    <Check className={`w-2.5 h-2.5 ${plan.highlight ? 'text-[#FF2E88]' : 'text-white/60'}`} strokeWidth={3} />
                                                </div>
                                                <span className="text-sm text-white/80 font-medium leading-tight">{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        to="/register"
                                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                                            plan.highlight
                                                ? 'bg-[#FF2E88] text-white hover:bg-[#e0007a]'
                                                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                        }`}
                                    >
                                        {plan.cta} <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Disponible en */}
                    <div className="text-center mt-12 reveal">
                        <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Disponible en</p>
                        <div className="flex items-center justify-center gap-6 flex-wrap">
                            {[['🇨🇱','Chile'],['🇲🇽','México'],['🇨🇴','Colombia'],['🇵🇪','Perú'],['🇦🇷','Argentina'],['🇺🇸','USA & más']].map(([flag, country]) => (
                                <div key={country} className="flex items-center gap-2">
                                    <span className="text-2xl">{flag}</span>
                                    <span className="text-sm text-white/50 font-medium">{country}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FAQ ───────────────────────────────────────────────────── */}
            <section id="faq" className="px-6 py-24">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12 reveal">
                        <h2 className="text-4xl font-black text-white">Preguntas frecuentes</h2>
                    </div>
                    <div className="space-y-4">
                        {FAQS.map((faq, i) => (
                            <div key={i} className={`reveal reveal-delay-${(i % 3) + 1} bg-white/[0.03] border border-white/10 rounded-xl p-6`}>
                                <h3 className="text-base font-bold text-white mb-2">{faq.q}</h3>
                                <p className="text-sm text-white/60 leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ─────────────────────────────────────────────── */}
            <section className="relative px-6 py-28 bg-gradient-to-br from-[#FF2E88]/20 via-[#0A0A0F] to-violet-900/20 border-t border-white/5 overflow-hidden">
                <div className="absolute inset-0 bg-[#FF2E88]/5 pointer-events-none pulse-glow" />
                <div className="relative max-w-3xl mx-auto text-center reveal">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <Sparkles className="w-3 h-3" /> Empieza hoy
                    </div>
                    <h2 className="text-5xl font-black text-white mb-6 leading-tight">
                        Tu clínica merece<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E88] to-[#FF80C0]">trabajar sola.</span>
                    </h2>
                    <p className="text-xl text-white/60 mb-10 leading-relaxed">
                        Implementación gratis. Sin contratos. Operativa en menos de 48 horas.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/demo" className="flex items-center justify-center gap-2 bg-[#FF2E88] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#e0007a] transition-all shadow-xl shadow-[#FF2E88]/30 text-base">
                            Agendar Reunión Demo <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link to="/pricing" className="flex items-center justify-center gap-2 bg-white/10 border border-white/15 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all text-base">
                            Ver todos los planes
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="px-6 py-12 border-t border-white/5 bg-[#0A0A0F]">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-base font-black text-white">Citenly</span>
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed">Automatización inteligente para centros de estética y belleza.</p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Producto</p>
                            <ul className="space-y-2">
                                {[['El Producto','#modulos'],['Precios','#planes'],['Demo','/demo']].map(([l,h]) => (
                                    <li key={l}><a href={h} className="text-sm text-white/50 hover:text-white transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Empresa</p>
                            <ul className="space-y-2">
                                {[['Ingresar','/login'],['Registrarse','/register']].map(([l,h]) => (
                                    <li key={l}><a href={h} className="text-sm text-white/50 hover:text-white transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Legal</p>
                            <ul className="space-y-2">
                                {[['Términos','/terminos'],['Privacidad','/privacidad']].map(([l,h]) => (
                                    <li key={l}><a href={h} className="text-sm text-white/50 hover:text-white transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-white/30">© 2026 Citenly. Todos los derechos reservados.</p>
                        <p className="text-xs text-white/20">Hecho con IA en Chile 🇨🇱</p>
                    </div>
                </div>
            </footer>

            <AIChatWidget />
        </div>
    )
}

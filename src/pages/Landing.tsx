import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Sparkles, ArrowRight, Check, Bot, Calendar, MessageSquare, Bell,
    TrendingUp, Users, Star, BarChart3, ChevronDown, Zap, Crown, Gift, Award, Share2, Menu, X,
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
        id: 'enterprise', name: 'Enterprise', icon: Crown,
        tagline: 'Redes de salones y multi-sucursal.',
        priceUSD: 297,
        annualUSD: 2851,
        description: 'Infraestructura empresarial para controlar hasta 2 sucursales desde un solo panel. Más sucursales, contactar ventas.',
        gradient: 'from-[#1a1a2e] to-[#0f0f23]',
        highlight: false,
        features: ['Usuarios y agendas ilimitados', 'Todo lo de Pro', 'Conversaciones ilimitadas', 'Recordatorios ilimitados', 'Multi-sucursal unificado', 'IA personalizada por servicio', 'Super Administrador', 'Soporte 24/7 dedicado'],
        cta: 'Agendar Implementación',
    },
    {
        id: 'pro', name: 'Pro', icon: Zap,
        tagline: 'Para centros estéticos en crecimiento.',
        priceUSD: 167,
        annualUSD: 1603,
        description: 'La solución completa para captar, retener y automatizar tu clínica de estética.',
        gradient: 'from-[#FF2E88] to-[#c0236a]',
        highlight: true,
        badge: 'Más Popular',
        features: ['5 usuarios · 5 agendas', 'Todo lo de Starter', '8.000 créditos IA/mes', 'Citas con IA ilimitadas', '250 recordatorios/mes', 'Motor de Retención de Ingresos (IA)', 'Encuestas de satisfacción', 'Soporte prioritario'],
        cta: 'Agendar Implementación',
    },
    {
        id: 'starter', name: 'Starter', icon: Zap,
        tagline: 'Para profesionales independientes.',
        priceUSD: 97,
        annualUSD: 931,
        description: 'Recepcionista IA en WhatsApp entrenada con tu marca + gestión completa para profesionales independientes',
        gradient: 'from-emerald-500 to-emerald-700',
        highlight: false,
        features: ['1 usuario · 1 agenda', 'Todo lo de Core', 'Agente IA WhatsApp', '4.000 créditos IA', 'Hasta 100 citas con IA/mes', '100 recordatorios/mes', '¿Más de 100 citas? Pasa a Pro →', '✗ Encuesta de satisfacción automatizada'],
        cta: 'Agendar Implementación',
    },
    {
        id: 'core', name: 'Core', icon: Sparkles,
        tagline: 'Gestión completa sin IA conversacional.',
        priceUSD: 39,
        description: 'Todo lo necesario para gestionar tu negocio pero sin IA conversacional',
        gradient: 'from-slate-500 to-slate-700',
        highlight: false,
        features: ['1 usuario · 1 agenda', 'Dashboard + métricas', 'Calendario de citas (manual)', 'Fichas de clientas', 'Módulo de finanzas', 'Sistema de referidos', 'Sin recordatorios automáticos', 'Recordatorios desde Plan Starter →'],
        cta: 'Agendar Implementación',
    },
]

type QuotePara = string | [string, string, string]
const TESTIMONIALS: { name: string; role: string; location: string; initials: string; photo?: string; paragraphs: QuotePara[] }[] = [
    {
        name: 'Elizabeth Hernández',
        role: 'Especialista en Microblading y Micropigmentación',
        location: 'Linares, Chile',
        initials: 'EH',
        photo: '/elizabeth.jpeg',
        paragraphs: [
            'Antes perdía dos o tres tardes al mes porque las clientas confirmaban y luego simplemente no llegaban. Sin avisar, sin cancelar — nada. Yo esperaba con todo listo, y nada.',
            'Desde que uso Citenly, pedir el abono antes lo cambió todo. Las clientas saben que para separar el horario hay que confirmar con un pago. Y las que no están dispuestas... de todas formas tampoco iban a llegar.',
            ['Pero lo que más me sorprendió fue algo que no esperaba: ', 'el asistente empezó a avisarles a mis clientas que les tocaba el retoque.', ' Tenía chicas que llevaban más de un año sin aparecer y de repente me escribían porque les llegó el mensaje. Eso no lo planifiqué — simplemente pasó solo.'],
            'Ahora mi agenda la maneja Citenly. Yo me dedico a trabajar.',
        ],
    },
    {
        name: 'Carla Cabello',
        role: 'Especialista en Depilación Láser',
        location: 'San Felipe, Chile',
        initials: 'CC',
        photo: '/carla-cabello.png',
        paragraphs: [
            'Antes pasaba horas confirmando citas por WhatsApp y aún así había muchas que no llegaban.',
            ['Desde que uso Citenly, ', 'mis recordatorios se envían solos y las clientas confirman antes de reservar.', ''],
            'He reducido las ausencias, tengo la agenda siempre organizada y puedo enfocarme en lo que realmente importa: mis clientas.',
            'Citenly me dio orden, tiempo y tranquilidad. 💗',
        ],
    },
    {
        name: 'Fabiola Olivares',
        role: 'Especialista en Tratamientos Corporales',
        location: 'Puente Alto, Santiago',
        initials: 'FO',
        photo: '/fabiola-olivares-testimonio.png',
        paragraphs: [
            ['Citenly es una ', 'gran inversión.', ' No solo me permite liberar mi tiempo del WhatsApp, sino que he podido recuperar dinero que antes se perdía.'],
            ['Sus ', 'funcionalidades de marketing', ' no las he visto en ningún otro software.'],
            ['', 'Gran alivio', ' haber encontrado a Citenly.'],
            ['', 'Los recomiendo sin duda.', ''],
        ],
    },
    {
        name: 'Fiorella Vásquez',
        role: 'Especialista en Armonización Facial',
        location: 'Maupú, Santiago',
        initials: 'FV',
        photo: '/fiorella-testimonio.png',
        paragraphs: [
            ['Citenly es una ', 'gran inversión.', ' Me da una tranquilidad que otros sistemas no entregan.'],
            ['Había contratado otro sistema similar, pero ni comparado con Citenly. Ellos me ', 'configuraron el asistente digital', ' exactamente como quería que atendiera a mis clientas.'],
            ['Me ', 'libera', ' demasiado tiempo que ahora dedico a la familia.'],
        ],
    },
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
                        <img src="/citenly-icon.png" alt="Citenly" className="w-9 h-9 rounded-xl shadow-lg shadow-[#FF2E88]/20" />
                        <span className="text-lg font-black tracking-tight text-white">Citenly</span>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
                        <a href="#modulos"       className="hover:text-white transition-colors">El Producto</a>
                        <a href="#planes"         className="hover:text-white transition-colors">Precios</a>
                        <a href="#como-funciona"  className="hover:text-white transition-colors">Cómo funciona</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block">Iniciar sesión</Link>
                        <Link to="/demo" onClick={() => (window as any).fbq?.("track","Lead")} className="flex items-center gap-1.5 bg-[#FF2E88] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#e0007a] transition-colors">
                            <span className="hidden sm:inline">Agendar Reunión Demo</span>
                            <span className="sm:hidden">Agendar Demo</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        {/* Botón hamburguesa — solo móvil */}
                        <button
                            onClick={() => setMobileMenuOpen(o => !o)}
                            className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label="Abrir menú"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                {/* Menú desplegable móvil */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-white/10 bg-[#0A0A0F]/95 backdrop-blur-md px-6 py-4 flex flex-col gap-1">
                        <a href="#modulos"      onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-white/70 hover:text-white transition-colors border-b border-white/5">El Producto</a>
                        <a href="#planes"        onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-white/70 hover:text-white transition-colors border-b border-white/5">Precios</a>
                        <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-white/70 hover:text-white transition-colors border-b border-white/5">Cómo funciona</a>
                        <Link to="/login"        onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-white/70 hover:text-white transition-colors border-b border-white/5">Iniciar sesión</Link>
                        <Link to="/demo"         onClick={() => { setMobileMenuOpen(false); (window as any).fbq?.("track","Lead"); }} className="mt-2 flex items-center justify-center gap-1.5 bg-[#FF2E88] text-white text-sm font-bold px-4 py-3 rounded-xl hover:bg-[#e0007a] transition-colors">
                            Agendar Reunión Demo <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </nav>

            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden pt-16 pb-24 px-6 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FF2E88]/12 rounded-full blur-[120px] pointer-events-none pulse-glow" />
                <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

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
                            <Link to="/demo" onClick={() => (window as any).fbq?.("track","Lead")} className="flex items-center justify-center gap-2 bg-[#FF2E88] text-white font-bold px-7 py-4 rounded-2xl hover:bg-[#e0007a] transition-all shadow-lg shadow-[#FF2E88]/25 text-base">
                                <span className="hidden sm:inline">Agendar Reunión Demo</span>
                                <span className="sm:hidden">Agendar Demo</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <a href="#como-funciona" className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-bold px-7 py-4 rounded-2xl hover:bg-white/10 transition-all text-base">
                                Ver cómo funciona <ChevronDown className="w-5 h-5" />
                            </a>
                        </div>
                        <div className="flex items-center gap-3 mt-8">
                            <div className="flex items-center gap-0.5 text-lg leading-none">
                                <span>🇨🇱</span><span>🇲🇽</span><span>🇨🇴</span><span>🇦🇷</span><span>🇵🇪</span>
                            </div>
                            <p className="text-sm text-white/50">
                                Operativo en <strong className="text-white">Chile y LATAM</strong>
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

            {/* ── Fidelización ─────────────────────────────────────────── */}
            <section className="px-6 py-24 bg-[#0D0D17] border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <div className="inline-block px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            Fidelización
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-white">
                            Tus clientas vuelven solas.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-[#FF2E88]">Y traen amigas.</span>
                        </h2>
                        <p className="text-white/60 mt-3 text-lg max-w-2xl mx-auto">
                            Un programa de puntos, cashback y referidos que premia la lealtad y convierte el boca a boca en un canal medible.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        {/* Billetera de puntos */}
                        <div className="reveal reveal-delay-1 bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all">
                            <div className="bg-gradient-to-br from-violet-600 to-violet-800 p-5 flex items-start justify-between">
                                <div>
                                    <p className="text-violet-200 text-xs font-black uppercase tracking-widest mb-1">01</p>
                                    <h3 className="text-xl font-black text-white">Billetera de Puntos</h3>
                                </div>
                                <Gift className="w-8 h-8 text-white/40" />
                            </div>
                            <div className="p-5">
                                <p className="text-sm text-white/70 leading-relaxed mb-4">Cada cita acumula saldo. Tú decides el modo: puntos clásicos, cashback en dinero real o porcentaje de descuento para la próxima visita.</p>
                                <div className="space-y-2">
                                    {['Puntos clásicos canjeables', 'Cashback en dinero real', '% descuento próxima cita', 'Ajuste manual por profesional'].map(f => (
                                        <div key={f} className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                                                <Check className="w-2.5 h-2.5 text-violet-400" strokeWidth={3} />
                                            </div>
                                            <span className="text-xs text-white/60 font-medium">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Programa de referidos */}
                        <div className="reveal reveal-delay-2 bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all">
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 flex items-start justify-between">
                                <div>
                                    <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">02</p>
                                    <h3 className="text-xl font-black text-white">Programa de Referidos</h3>
                                </div>
                                <Share2 className="w-8 h-8 text-white/40" />
                            </div>
                            <div className="p-5">
                                <p className="text-sm text-white/70 leading-relaxed mb-4">Cada clienta tiene un <strong className="text-white">Magic Link</strong> que abre WhatsApp de tu clínica con el código ya escrito. La amiga agenda — ambas ganan puntos automáticamente.</p>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Flujo automático</p>
                                    <div className="space-y-2 text-xs text-white/60">
                                        <p>① Clienta comparte su Magic Link</p>
                                        <p>② Amiga abre WhatsApp de la clínica</p>
                                        <p>③ Agenda su primera cita</p>
                                        <p className="text-emerald-400 font-bold">④ Ambas reciben bono automáticamente</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Catálogo de recompensas */}
                        <div className="reveal reveal-delay-3 bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all">
                            <div className="bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 p-5 flex items-start justify-between">
                                <div>
                                    <p className="text-fuchsia-200 text-xs font-black uppercase tracking-widest mb-1">03</p>
                                    <h3 className="text-xl font-black text-white">Catálogo de Recompensas</h3>
                                </div>
                                <Award className="w-8 h-8 text-white/40" />
                            </div>
                            <div className="p-5">
                                <p className="text-sm text-white/70 leading-relaxed mb-4">Define qué pueden canjear tus clientas con el saldo acumulado. Descuentos, tratamientos gratis o productos — tú decides el catálogo.</p>
                                <div className="space-y-2">
                                    {['Descuento en dinero ($)', 'Porcentaje de descuento (%)', 'Tratamiento gratuito', 'Ranking de embajadoras'].map(f => (
                                        <div key={f} className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full bg-fuchsia-500/20 flex items-center justify-center shrink-0">
                                                <Check className="w-2.5 h-2.5 text-fuchsia-400" strokeWidth={3} />
                                            </div>
                                            <span className="text-xs text-white/60 font-medium">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats strip */}
                    <div className="reveal grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                        {[
                            { value: '5×', label: 'más barato retener que adquirir' },
                            { value: '30%', label: 'más gasto promedio en clientes con puntos' },
                            { value: '100%', label: 'boca a boca rastreable y con incentivo' },
                        ].map(s => (
                            <div key={s.value} className="text-center bg-white/[0.03] border border-white/10 rounded-xl p-4">
                                <p className="text-2xl font-black text-violet-400">{s.value}</p>
                                <p className="text-[10px] text-white/40 font-medium mt-1 leading-tight">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Cómo funciona ─────────────────────────────────────────── */}
            <section id="como-funciona" className="px-6 py-24 bg-[#FEF6F2] relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-[#FF2E88]/15 to-transparent rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-[#4B9EE8]/12 to-transparent rounded-full blur-[100px] pointer-events-none" />
                <div className="max-w-5xl mx-auto relative">
                    <div className="text-center mb-16 reveal">
                        <div className="w-16 h-16 mx-auto mb-6 p-[2px] rounded-full" style={{background:'linear-gradient(135deg,#FF2E88,#4B9EE8)'}}>
                            <div className="w-full h-full rounded-full bg-[#FEF6F2] flex items-center justify-center">
                                <Zap className="w-7 h-7 text-[#FF2E88]" />
                            </div>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900">
                            Tres pasos para <span className="text-[#FF2E88]">automatizar</span> tu centro
                        </h2>
                        <div className="w-16 h-0.5 mx-auto mt-4 rounded" style={{background:'linear-gradient(to right,#FF2E88,#4B9EE8)'}} />
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { step: '01', title: 'Conectamos tu WhatsApp', desc: 'El equipo de Citenly configura tu agente IA con el conocimiento de tu negocio. Tú no tocas nada.' },
                            { step: '02', title: 'La IA atiende y agenda', desc: 'Tu agente responde consultas, confirma citas y maneja objeciones — 24/7 sin intervención.' },
                            { step: '03', title: 'Tú creces sin fricción', desc: 'Más citas, menos ausencias, clientas felices. Todo visible en tu dashboard en tiempo real.' },
                        ].map((s, i) => (
                            <div key={i} className={`reveal reveal-delay-${i + 1} bg-white rounded-2xl p-7 shadow-sm border border-rose-100`}>
                                <p className="text-5xl font-black text-[#FF2E88]/20 mb-4">{s.step}</p>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
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
                                    ['Desde US$97 / mes', 'Plan Starter — sin contrato, sin finiquito, sin cotizaciones previsionales'],
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

            {/* ── Resultados reales (Testimonios) ──────────────────────── */}
            <section className="px-6 py-24 bg-[#FEF6F2] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#FF2E88]/12 to-transparent rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#4B9EE8]/12 to-transparent rounded-full blur-[120px] pointer-events-none" />
                {/* Decorative arcs top-left */}
                <div className="absolute top-8 left-8 opacity-10 pointer-events-none">
                    {[1,2,3].map(n => <div key={n} className="border border-[#FF2E88] rounded-full absolute" style={{width:n*80,height:n*80,top:'50%',left:'50%',transform:'translate(-50%,-50%)'}} />)}
                </div>

                <div className="max-w-5xl mx-auto relative">
                    {/* Header */}
                    <div className="text-center mb-20 reveal">
                        <div className="w-16 h-16 mx-auto mb-6 p-[2px] rounded-full" style={{background:'linear-gradient(135deg,#FF2E88,#4B9EE8)'}}>
                            <div className="w-full h-full rounded-full bg-[#FEF6F2] flex items-center justify-center">
                                <Star className="w-6 h-6 text-[#FF2E88] fill-[#FF2E88]" />
                            </div>
                        </div>
                        <h2 className="text-5xl font-black text-gray-900 leading-tight mb-2">
                            Resultados<br /><span className="text-[#FF2E88]">reales.</span>
                        </h2>
                        <div className="w-16 h-0.5 mx-auto my-4 rounded" style={{background:'linear-gradient(to right,#FF2E88,#4B9EE8)'}} />
                        <p className="text-gray-600 text-lg">
                            De <span className="text-[#FF2E88] font-semibold">profesionales</span> reales.
                        </p>
                    </div>

                    {/* Testimonials — alternating layout */}
                    <div className="space-y-24">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className={`reveal flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-10 items-center`}>
                                {/* Avatar side */}
                                <div className="w-full md:w-5/12 shrink-0">
                                    <div className="relative">
                                        <div className="w-full aspect-[4/5] rounded-3xl overflow-hidden" style={{background:'linear-gradient(135deg,#FFE4EF,#EEE8FF)'}}>
                                            {t.photo ? (
                                                <img src={t.photo} alt={t.name} className="w-full h-full object-cover object-top" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="w-36 h-36 rounded-full bg-gradient-to-br from-[#FF2E88] to-violet-500 flex items-center justify-center text-white font-black text-5xl shadow-xl">
                                                        {t.initials}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-4 left-4 bg-[#1a1a2e] text-white rounded-2xl px-4 py-3 shadow-xl max-w-[80%]">
                                            <p className="font-bold text-sm">{t.name}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#FF2E88] to-violet-500 shrink-0" />
                                                <p className="text-white/60 text-xs">{t.role}</p>
                                            </div>
                                            <p className="text-[#FF2E88] text-xs mt-1.5 flex items-center gap-1">
                                                <span>📍</span> {t.location}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quote card */}
                                <div className="flex-1">
                                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-rose-100">
                                        <span className="text-6xl text-[#FF2E88] font-serif leading-none block mb-2" style={{fontFamily:'Georgia,serif'}}>"</span>
                                        <div className="flex gap-0.5 mb-5">
                                            {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                                        </div>
                                        <div className="space-y-3">
                                            {t.paragraphs.map((p, pi) =>
                                                typeof p === 'string'
                                                    ? <p key={pi} className="text-gray-700 text-sm leading-relaxed">{p}</p>
                                                    : <p key={pi} className="text-gray-700 text-sm leading-relaxed">{p[0]}<strong className="text-[#FF2E88]">{p[1]}</strong>{p[2]}</p>
                                            )}
                                        </div>
                                        <div className="mt-6 pt-5 border-t border-gray-100">
                                            <div className="w-16 h-0.5 rounded" style={{background:'linear-gradient(to right,#FF2E88,#4B9EE8)'}} />
                                        </div>
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
                                        {(plan as any).annualUSD && (
                                            <p className="text-emerald-400 text-[10px] font-bold mt-1">
                                                Pago anual: US${(plan as any).annualUSD} · <span className="text-emerald-300">2 meses gratis</span>
                                            </p>
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

                    {/* Nota contextual créditos */}
                    <div className="max-w-2xl mx-auto mt-10 mb-2 reveal">
                        <div className="flex items-start gap-3 bg-white/[0.04] border border-white/10 rounded-xl px-5 py-4">
                            <span className="text-lg shrink-0">💡</span>
                            <p className="text-sm text-white/60 leading-relaxed">
                                <strong className="text-white/90">¿Cuánto alcanza con 4.000 créditos?</strong> Según datos reales de clínicas activas en Citenly, equivalen a entre <strong className="text-white/90">200 y 250 conversaciones al mes</strong> — más que suficiente para un profesional independiente con ~100 citas mensuales.
                            </p>
                        </div>
                    </div>

                    {/* Garantía */}
                    <div className="mt-16 reveal">
                        <div className="max-w-3xl mx-auto bg-white/[0.04] border border-emerald-500/20 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                <span className="text-3xl">🔒</span>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">GARANTÍA — Prueba Citenly sin riesgo</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 justify-center md:justify-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <p className="text-sm font-medium text-white/70">Tienes 7 días para probar el sistema completo</p>
                                    </div>
                                    <div className="flex items-center gap-3 justify-center md:justify-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <p className="text-sm font-medium text-white/70">Implementación completa por nuestro equipo (llave en mano)</p>
                                    </div>
                                    <div className="flex items-center gap-3 justify-center md:justify-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <p className="text-sm font-medium text-white/70">Si no te ayuda a gestionar mejor tus citas, puedes cancelar.</p>
                                    </div>
                                </div>
                                <div className="mt-5 inline-flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/30">
                                    0 RIESGO COMPROMETIDO
                                </div>
                            </div>
                        </div>
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
                        <Link to="/demo" onClick={() => (window as any).fbq?.("track","Lead")} className="flex items-center justify-center gap-2 bg-[#FF2E88] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#e0007a] transition-all shadow-xl shadow-[#FF2E88]/30 text-base">
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
                                <img src="/citenly-icon.png" alt="Citenly" className="w-8 h-8 rounded-xl" />
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

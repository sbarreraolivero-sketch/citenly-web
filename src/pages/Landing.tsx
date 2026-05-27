import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import {
    Sparkles, ArrowRight, Check, Bot, Calendar, MessageSquare, Bell,
    TrendingUp, Users, Star, BarChart3, ChevronDown,
} from 'lucide-react'
import { AIChatWidget } from '../components/AIChatWidget'

// ── Scroll animation hook ──────────────────────────────────────────────────
function useScrollReveal() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('reveal-visible')
                        observer.unobserve(entry.target)
                    }
                })
            },
            { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
        )
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
        return () => observer.disconnect()
    }, [])
}

// ── Data ──────────────────────────────────────────────────────────────────
const FEATURES = [
    { icon: Bot,         title: 'Agente IA 24/7',          description: 'Responde, agenda y capta prospectos automáticamente. Sin recepcionista.', color: 'text-[#FF2E88]', bg: 'bg-[#FF2E88]/10', border: 'border-[#FF2E88]/20' },
    { icon: Calendar,    title: 'Agenda inteligente',       description: 'Tus clientas eligen horario en WhatsApp. Confirmaciones automáticas.', color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20' },
    { icon: Bell,        title: 'Recordatorios',            description: 'Envía avisos 24h y 2h antes. Reduce ausencias hasta un 70%.', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { icon: Users,       title: 'CRM de prospectos',        description: 'Pipeline visual. Sigue cada lead desde el primer mensaje hasta la venta.', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { icon: TrendingUp,  title: 'Retención activa',         description: 'Detecta clientas que no vuelven y reactívalas automáticamente.', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
    { icon: BarChart3,   title: 'Métricas en tiempo real',  description: 'Citas, ingresos y conversiones en un panel limpio y accionable.', color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20' },
]

const CONVERSATION = [
    { from: 'client', text: 'Hola! Quiero agendar una sesión de limpieza facial 🌟' },
    { from: 'ai', text: '¡Hola! Claro, tengo disponibilidad esta semana. ¿Te viene mejor el miércoles o el viernes?' },
    { from: 'client', text: 'El miércoles a las 15:00 si hay 🙏' },
    { from: 'ai', text: '✅ ¡Perfecto! Agendé tu sesión de Limpieza Facial para el miércoles 28 a las 15:00. Te envío recordatorio el día anterior. ¿Algo más?' },
    { from: 'client', text: 'No, muchas gracias! 😊' },
    { from: 'ai', text: '¡Con gusto! Te esperamos. 💗' },
]

const PLAN_FEATURES: Record<string, string[]> = {
    core: [
        'Agente IA básico (agendamiento)',
        'Hasta 500 créditos IA/mes',
        'Gestión de citas y pacientes',
        'Recordatorios automáticos',
        '1 usuario',
        'Soporte por email',
    ],
    starter: [
        'Agente IA completo (ventas + agenda)',
        'Hasta 2.000 créditos IA/mes',
        'CRM de prospectos',
        'Campañas de WhatsApp (100/mes)',
        'Plantillas de mensajes',
        '2 usuarios',
        'Soporte prioritario',
    ],
    pro: [
        'Agente IA avanzado (híbrido GPT-4o)',
        'Hasta 5.000 créditos IA/mes',
        'CRM + Motor de retención',
        'Campañas ilimitadas',
        'Fidelización y encuestas',
        'Analíticas avanzadas',
        '5 usuarios',
        'Soporte con SLA garantizado',
    ],
    enterprise: [
        'Todo lo de Pro, más:',
        'Multi-sede y sucursales',
        'Créditos IA ilimitados',
        'Agente IA personalizado',
        'Integraciones a medida',
        'Usuarios ilimitados',
        'Manager de cuenta dedicado',
        'Onboarding presencial',
    ],
}

const PLANS = [
    { id: 'core',       name: 'Core',       priceCLP: 33000,   priceUSD: 33,  highlight: false, badge: '' },
    { id: 'starter',    name: 'Starter',    priceCLP: 89000,   priceUSD: 89,  highlight: false, badge: '' },
    { id: 'pro',        name: 'Pro',        priceCLP: 149000,  priceUSD: 149, highlight: true,  badge: 'Más popular' },
    { id: 'enterprise', name: 'Enterprise', priceCLP: 349000,  priceUSD: 349, highlight: false, badge: '' },
]

const ADDONS = [
    { name: 'Pack de Recordatorios',   desc: '100 recordatorios adicionales por mes',         price: '$9.990 CLP / mes' },
    { name: 'Créditos IA Extra',        desc: '1.000 créditos IA adicionales (nunca vencen)',   price: '$14.990 CLP' },
    { name: 'Sucursal adicional',       desc: 'Agrega una nueva sede o punto de venta',         price: '$49.990 CLP / mes' },
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

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-white">
            {/* ── CSS para animaciones ──────────────────────────────────── */}
            <style>{`
                .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }
                .reveal-visible { opacity: 1; transform: translateY(0); }
                .reveal-delay-1 { transition-delay: 0.1s; }
                .reveal-delay-2 { transition-delay: 0.2s; }
                .reveal-delay-3 { transition-delay: 0.3s; }
                .reveal-delay-4 { transition-delay: 0.4s; }
                .reveal-delay-5 { transition-delay: 0.5s; }
                @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
                @keyframes pulse-glow { 0%,100%{opacity:.4} 50%{opacity:.8} }
                .float-y { animation: floatY 6s ease-in-out infinite; }
                .pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
                @keyframes chat-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                .chat-msg { animation: chat-in 0.4s ease forwards; }
                .chat-delay-1 { animation-delay: 0.5s; opacity: 0; }
                .chat-delay-2 { animation-delay: 1.0s; opacity: 0; }
                .chat-delay-3 { animation-delay: 1.5s; opacity: 0; }
                .chat-delay-4 { animation-delay: 2.0s; opacity: 0; }
                .chat-delay-5 { animation-delay: 2.5s; opacity: 0; }
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
                        <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
                        <a href="#features"       className="hover:text-white transition-colors">Funciones</a>
                        <a href="#planes"          className="hover:text-white transition-colors">Precios</a>
                        <a href="#faq"             className="hover:text-white transition-colors">FAQ</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block">Ingresar</Link>
                        <Link to="/demo" className="flex items-center gap-1.5 bg-[#FF2E88] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#e0007a] transition-colors">
                            Ver demo <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden pt-16 pb-24 px-6">
                {/* Glows */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FF2E88]/8 rounded-full blur-[120px] pointer-events-none pulse-glow" />
                <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    {/* Left — copy */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-sm font-bold mb-6">
                            <Sparkles className="w-4 h-4" />
                            Agente IA para clínicas de estética
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">
                            Tu clínica{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E88] to-[#FF80C0]">llena</span>
                            {' '}mientras tú{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-sky-400">atiendes</span>
                        </h1>
                        <p className="text-xl text-white/70 leading-relaxed mb-8 max-w-xl">
                            Un agente IA responde por WhatsApp, agenda citas y reactiva clientas inactivas — todo en automático, las 24 horas.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/demo" className="flex items-center justify-center gap-2 bg-[#FF2E88] text-white font-bold px-7 py-4 rounded-2xl hover:bg-[#e0007a] transition-all shadow-lg shadow-[#FF2E88]/25 text-base">
                                Agendar demo gratis <ArrowRight className="w-5 h-5" />
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
                                <strong className="text-white">+120 clínicas</strong> ya automatizadas en Chile
                            </p>
                        </div>
                    </div>

                    {/* Right — WhatsApp mock */}
                    <div className="flex justify-center md:justify-end float-y">
                        <div className="w-full max-w-sm bg-[#0E1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                            {/* WA header */}
                            <div className="bg-[#075E54] px-5 py-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#FF2E88] rounded-full flex items-center justify-center text-white font-black text-sm">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Citenly IA · Tu clínica</p>
                                    <p className="text-emerald-300 text-xs flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                                        En línea
                                    </p>
                                </div>
                            </div>
                            {/* Messages */}
                            <div className="p-4 space-y-3 bg-[#0B141A] min-h-[280px]">
                                {CONVERSATION.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.from === 'client' ? 'justify-end' : 'justify-start'} chat-msg chat-delay-${i + 1}`}>
                                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                            msg.from === 'client'
                                                ? 'bg-[#005C4B] text-white rounded-tr-none'
                                                : 'bg-[#202C33] text-white rounded-tl-none'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Input */}
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
                    {[
                        { value: '70%',    label: 'Menos ausencias' },
                        { value: '24/7',   label: 'Atención continua' },
                        { value: '3h/día', label: 'Tiempo recuperado' },
                        { value: '+120',   label: 'Clínicas activas' },
                    ].map((s, i) => (
                        <div key={i} className={`reveal reveal-delay-${i + 1}`}>
                            <p className="text-3xl font-black text-white mb-1">{s.value}</p>
                            <p className="text-sm text-white/50 font-medium">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Cómo funciona ─────────────────────────────────────────── */}
            <section id="como-funciona" className="px-6 py-24">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-white/50 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            Proceso simple
                        </div>
                        <h2 className="text-4xl font-black text-white">Tres pasos para automatizar tu clínica</h2>
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

            {/* ── El Problema / La Solución ─────────────────────────────── */}
            <section className="px-6 py-24 bg-[#0D0D17] border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Problema */}
                        <div className="reveal">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                                El problema
                            </div>
                            <h2 className="text-3xl font-black text-white mb-6">Tu clínica pierde dinero mientras respondes WhatsApp</h2>
                            <div className="space-y-3">
                                {[
                                    'Responder mensajes te quita 3+ horas diarias',
                                    'Citas sin confirmar que terminan siendo ausencias',
                                    'Prospectos que escriben y nadie responde a tiempo',
                                    'Clientas que no vuelven porque nadie las reactivó',
                                    'No tienes tiempo para enfocarte en lo que importa',
                                ].map((p, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="text-red-400 mt-0.5 font-black">✗</span>
                                        <p className="text-white/70 text-sm">{p}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Solución */}
                        <div className="reveal reveal-delay-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                                Con Citenly
                            </div>
                            <h2 className="text-3xl font-black text-white mb-6">Tu clínica funciona sola — tú apareces a trabajar</h2>
                            <div className="space-y-3">
                                {[
                                    'El agente IA responde instantáneo, a cualquier hora',
                                    'Confirmaciones automáticas → cero ausencias sorpresa',
                                    'Todos los prospectos atendidos en segundos',
                                    'Campañas de reactivación automáticas para clientas inactivas',
                                    'Tú te dedicas a brindar el mejor tratamiento',
                                ].map((s, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                        <p className="text-white/80 text-sm">{s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features grid ─────────────────────────────────────────── */}
            <section id="features" className="px-6 py-24">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-white/50 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            Funciones
                        </div>
                        <h2 className="text-4xl font-black text-white">Todo lo que tu clínica necesita</h2>
                        <p className="text-white/60 mt-3 text-lg">Una plataforma diseñada para clínicas de estética y belleza.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES.map((f, i) => (
                            <div key={i} className={`reveal reveal-delay-${(i % 3) + 1} bg-white/[0.03] border ${f.border} rounded-2xl p-6 hover:bg-white/[0.06] transition-all`}>
                                <div className={`w-11 h-11 ${f.bg} border ${f.border} rounded-xl flex items-center justify-center mb-5`}>
                                    <f.icon className={`w-5 h-5 ${f.color}`} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-white/60 leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonios ───────────────────────────────────────────── */}
            <section className="px-6 py-24 bg-[#0D0D17] border-t border-white/5">
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
            <section id="planes" className="px-6 py-24">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            Precios
                        </div>
                        <h2 className="text-4xl font-black text-white">Elige tu plan</h2>
                        <p className="text-white/60 mt-3">Todos los planes incluyen implementación gratuita.</p>
                    </div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {PLANS.map((plan, i) => (
                            <div
                                key={plan.id}
                                className={`reveal reveal-delay-${i + 1} relative flex flex-col rounded-2xl overflow-hidden border transition-all ${
                                    plan.highlight
                                        ? 'bg-gradient-to-b from-[#FF2E88]/15 to-[#0A0A0F] border-[#FF2E88]/40 shadow-xl shadow-[#FF2E88]/10'
                                        : 'bg-white/[0.03] border-white/10'
                                }`}
                            >
                                {plan.badge && (
                                    <div className="absolute top-0 inset-x-0 text-center py-1.5 bg-[#FF2E88] text-white text-[10px] font-black uppercase tracking-widest">
                                        {plan.badge}
                                    </div>
                                )}
                                <div className={`p-6 ${plan.badge ? 'pt-10' : ''}`}>
                                    <h3 className="text-lg font-black text-white mb-1">{plan.name}</h3>
                                    <div className="mb-6">
                                        <span className="text-4xl font-black text-white">${plan.priceCLP.toLocaleString('es-CL')}</span>
                                        <span className="text-white/40 text-sm ml-1">CLP/mes</span>
                                        <p className="text-white/30 text-xs mt-0.5">≈ US${plan.priceUSD}/mes</p>
                                    </div>
                                    <Link
                                        to="/register"
                                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all mb-6 ${
                                            plan.highlight
                                                ? 'bg-[#FF2E88] text-white hover:bg-[#e0007a]'
                                                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                        }`}
                                    >
                                        Empezar ahora <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <div className="space-y-2.5">
                                        {PLAN_FEATURES[plan.id]?.map((feat, fi) => (
                                            <div key={fi} className="flex items-start gap-2.5">
                                                <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-[#FF2E88]' : 'text-emerald-400'}`} />
                                                <span className="text-sm text-white/70">{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Addons ────────────────────────────────────────────────── */}
            <section className="px-6 pb-24 bg-[#0D0D17] border-t border-white/5 pt-24">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10 reveal">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            Extras opcionales
                        </div>
                        <h2 className="text-3xl font-black text-white">Potencia tu plan con extras</h2>
                        <p className="text-white/60 mt-2">Agrega solo lo que necesitas, cuando lo necesitas.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-5">
                        {ADDONS.map((addon, i) => (
                            <div key={i} className={`reveal reveal-delay-${i + 1} bg-white/[0.04] border border-emerald-500/20 rounded-2xl p-6`}>
                                <h3 className="text-base font-bold text-white mb-2">{addon.name}</h3>
                                <p className="text-sm text-white/60 mb-4 leading-relaxed">{addon.desc}</p>
                                <p className="text-emerald-400 font-black text-sm">{addon.price}</p>
                            </div>
                        ))}
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

            {/* ── Final CTA (full width, no container) ──────────────────── */}
            <section className="relative px-6 py-28 bg-gradient-to-br from-[#FF2E88]/20 via-[#0A0A0F] to-violet-900/20 border-t border-white/5 overflow-hidden">
                <div className="absolute inset-0 bg-[#FF2E88]/5 pointer-events-none pulse-glow" />
                <div className="relative max-w-3xl mx-auto text-center reveal">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <Sparkles className="w-3 h-3" />
                        Empieza hoy
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
                            Agendar demo ahora <ArrowRight className="w-5 h-5" />
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
                            <p className="text-sm text-white/40 leading-relaxed">
                                Automatización inteligente para clínicas de estética y belleza.
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Producto</p>
                            <ul className="space-y-2">
                                {[['Funciones','#features'],['Precios','#planes'],['Demo','/demo']].map(([l,h]) => (
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

            {/* ── Chat widget ───────────────────────────────────────────── */}
            <AIChatWidget />
        </div>
    )
}

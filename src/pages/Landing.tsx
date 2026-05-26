import { Link } from 'react-router-dom'
import {
    Sparkles,
    ArrowRight,
    Check,
    Bot,
    Calendar,
    MessageSquare,
    Bell,
    TrendingUp,
    Users,
    Star,
    Zap,
    Shield,
    BarChart3,
} from 'lucide-react'
import { AIChatWidget } from '../components/AIChatWidget'

const FEATURES = [
    {
        icon: Bot,
        title: 'Agente IA WhatsApp 24/7',
        description: 'Responde consultas, agenda citas y captura prospectos automáticamente. Sin necesidad de recepcionista.',
        color: 'text-[#FF2E88]',
        bg: 'bg-[#FF2E88]/10',
    },
    {
        icon: Calendar,
        title: 'Agenda inteligente',
        description: 'Los clientes eligen su horario directamente en WhatsApp. Sin idas y vueltas. Confirmaciones automáticas.',
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
    },
    {
        icon: Bell,
        title: 'Recordatorios automáticos',
        description: 'Envía recordatorios 24h y 2h antes de cada cita. Reduce ausencias y cancelaciones de último minuto.',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
    },
    {
        icon: Users,
        title: 'CRM de prospectos',
        description: 'Pipeline visual de leads. Sigue el camino de cada prospecto desde el primer mensaje hasta la conversión.',
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
    },
    {
        icon: TrendingUp,
        title: 'Retención y reactivación',
        description: 'Detecta clientes que no vuelven. Envía campañas de reactivación personalizadas por WhatsApp.',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
    },
    {
        icon: BarChart3,
        title: 'Dashboard de métricas',
        description: 'Citas, ingresos, conversiones y tasa de retención en tiempo real. Todo en un panel limpio y claro.',
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
    },
]

const CONVERSATION = [
    { from: 'client', text: 'Hola! Quiero agendar una sesión de limpieza facial 🌟' },
    { from: 'ai', text: '¡Hola María! Claro, tengo disponibilidad para esta semana. ¿Te viene mejor el miércoles o el viernes?' },
    { from: 'client', text: 'El miércoles a las 15:00 si hay 🙏' },
    { from: 'ai', text: '✅ ¡Perfecto! Agendé tu sesión de Limpieza Facial para el miércoles 28 a las 15:00 hrs. Te mandaré un recordatorio el día anterior. ¿Algo más en que te pueda ayudar?' },
    { from: 'client', text: 'No, muchas gracias! 😊' },
    { from: 'ai', text: '¡Con gusto! Te esperamos. 💗' },
]

const PLANS = [
    { id: 'core',       name: 'Core',       price: 33,  highlight: false },
    { id: 'starter',    name: 'Starter',    price: 89,  highlight: false },
    { id: 'pro',        name: 'Pro',        price: 149, highlight: true, badge: 'Popular' },
    { id: 'enterprise', name: 'Enterprise', price: 349, highlight: false },
]

const TESTIMONIALS = [
    {
        quote: 'Antes perdía 3 horas diarias respondiendo WhatsApp. Ahora Citenly lo hace todo y yo me enfoco en mis clientes.',
        name: 'Valentina Morales',
        role: 'Dueña · Centro de Estética Bella',
        initials: 'VM',
    },
    {
        quote: 'Mis ausencias bajaron un 70% con los recordatorios automáticos. No puedo creer que antes lo hacía a mano.',
        name: 'Daniela Fuentes',
        role: 'Esteticista · Salón DeLux',
        initials: 'DF',
    },
    {
        quote: 'El agente IA agenda citas mientras duermo. Llegué al trabajo y ya tenía 4 citas nuevas confirmadas.',
        name: 'Camila Herrera',
        role: 'Directora · Clínica Radiante',
        initials: 'CH',
    },
]

const FAQS = [
    {
        q: '¿Necesito saber de tecnología?',
        a: 'No. Nosotros configuramos todo por ti. En menos de 48 horas tu agente IA está operando.',
    },
    {
        q: '¿Funciona con mi WhatsApp actual?',
        a: 'Usamos WhatsApp Business API oficial (con YCloud). Tu número actual puede migrar en la mayoría de los casos.',
    },
    {
        q: '¿Qué pasa si el cliente pregunta algo que la IA no sabe?',
        a: 'La IA escala a un humano automáticamente. Tú defines qué preguntas maneja sola y cuáles te llega.',
    },
    {
        q: '¿Puedo cancelar en cualquier momento?',
        a: 'Sí. Sin contratos ni permanencia. Cancelas cuando quieras desde tu panel de configuración.',
    },
]

export default function Landing() {
    return (
        <div className="min-h-screen bg-[#0A0A0F] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#0A0A0F]/80">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF2E88]/20">
                            <Sparkles className="w-4.5 h-4.5 text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tight">Citenly</span>
                        <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-[#FF2E88]/60 border border-[#FF2E88]/20 px-2 py-0.5 rounded-full">Beauty AI</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/50">
                        <a href="#features" className="hover:text-white transition-colors">Características</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
                        <Link to="/demo" className="hover:text-white transition-colors">Demo</Link>
                        <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm text-white/40 hover:text-white transition-colors px-4 py-2 hidden sm:block">
                            Iniciar sesión
                        </Link>
                        <Link to="/register" className="text-sm bg-[#FF2E88] text-white font-black px-5 py-2.5 rounded-xl hover:bg-[#e0266f] transition-colors shadow-lg shadow-[#FF2E88]/20">
                            Empezar gratis
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden pt-20 pb-32 px-6">
                {/* Glow effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#FF2E88]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-20 left-20 w-[300px] h-[300px] bg-violet-600/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-sm font-bold mb-8">
                        <Sparkles className="w-3.5 h-3.5" />
                        La IA que atiende tu clínica por WhatsApp, 24/7
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-6">
                        Tu recepcionista
                        <br />
                        <span className="bg-gradient-to-r from-[#FF2E88] to-[#FF4DA6] bg-clip-text text-transparent">
                            nunca duerme.
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Citenly atiende a tus clientas por WhatsApp, agenda citas automáticamente,
                        envía recordatorios y reactiva clientes que no vuelven.
                        <span className="text-white/80"> Sin código. Sin contratos.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/register"
                            className="flex items-center gap-2 bg-[#FF2E88] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#e0266f] transition-all shadow-2xl shadow-[#FF2E88]/30 text-base w-full sm:w-auto justify-center"
                        >
                            Comenzar 7 días gratis
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/demo"
                            className="flex items-center gap-2 text-white/60 font-bold px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 hover:text-white transition-all w-full sm:w-auto justify-center"
                        >
                            <Calendar className="w-4.5 h-4.5" />
                            Ver demo en vivo
                        </Link>
                    </div>

                    <p className="mt-4 text-xs text-white/25">Sin tarjeta de crédito requerida · Cancelación en cualquier momento</p>
                </div>
            </section>

            {/* WhatsApp mock conversation */}
            <section className="px-6 pb-24">
                <div className="max-w-md mx-auto">
                    <div className="bg-[#0E1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        {/* Phone header */}
                        <div className="bg-[#075E54] px-5 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#FF2E88] rounded-full flex items-center justify-center text-white font-black text-sm">
                                ✨
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Clínica Bella · IA</p>
                                <p className="text-[11px] text-green-300/70">en línea</p>
                            </div>
                        </div>

                        {/* Chat */}
                        <div className="p-4 space-y-3 bg-[#0B141A] min-h-[300px]">
                            {CONVERSATION.map((msg, i) => (
                                <div key={i} className={`flex ${msg.from === 'client' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                        msg.from === 'client'
                                            ? 'bg-[#202C33] text-white/80 rounded-tl-sm'
                                            : 'bg-[#005C4B] text-white rounded-tr-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="bg-[#1F2C34] px-4 py-3 flex items-center gap-2">
                            <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2.5 text-xs text-white/20">
                                Escribe un mensaje...
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-xs text-white/30 mt-4 font-medium">
                        Así atiende Citenly a tus clientas. Automático. 24/7.
                    </p>
                </div>
            </section>

            {/* Social proof numbers */}
            <section className="px-6 py-16 border-t border-b border-white/5 bg-white/[0.02]">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { value: '500+', label: 'Clínicas activas' },
                        { value: '30h', label: 'Ahorradas/semana' },
                        { value: '70%', label: 'Menos ausencias' },
                        { value: '24/7', label: 'Atención online' },
                    ].map(stat => (
                        <div key={stat.label}>
                            <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
                            <p className="text-sm text-white/40 font-medium">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id="features" className="px-6 py-24">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 text-white/50 rounded-full text-sm font-bold mb-4">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            Todo lo que necesita tu clínica
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            Una plataforma.<br />
                            <span className="text-white/40">Infinitas posibilidades.</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="group p-6 bg-white/[0.03] border border-white/8 rounded-2xl hover:border-white/15 hover:bg-white/[0.05] transition-all">
                                <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center mb-5`}>
                                    <f.icon className={`w-5.5 h-5.5 ${f.color}`} />
                                </div>
                                <h3 className="text-base font-black text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-white/45 leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Problem / Solution */}
            <section className="px-6 py-24 bg-white/[0.02] border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                                El problema actual
                            </div>
                            <h2 className="text-3xl font-black tracking-tight mb-6 text-white/90">
                                ¿Cuánto tiempo pierdes respondiendo WhatsApp?
                            </h2>
                            <div className="space-y-3">
                                {[
                                    'Clientas que preguntan y nunca agendan',
                                    'Mensajes sin responder fuera de horario',
                                    'Citas que se pierden por olvido del cliente',
                                    'Horas respondiendo lo mismo una y otra vez',
                                    'Sin tiempo para crecer porque el operativo te consume',
                                ].map(item => (
                                    <div key={item} className="flex items-start gap-3 text-white/50">
                                        <span className="text-red-400 font-black mt-0.5">✕</span>
                                        <span className="text-sm">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                                Con Citenly
                            </div>
                            <h2 className="text-3xl font-black tracking-tight mb-6 text-white/90">
                                Tu clínica en piloto automático.
                            </h2>
                            <div className="space-y-3">
                                {[
                                    'La IA atiende y agenda en segundos, siempre',
                                    'Respuestas instantáneas a las 3am si es necesario',
                                    'Recordatorios automáticos = 70% menos ausencias',
                                    'La IA aprende tu negocio y responde igual que tú',
                                    'Tú solo supervisas. El sistema trabaja solo.',
                                ].map(item => (
                                    <div key={item} className="flex items-start gap-3 text-white/70">
                                        <span className="text-emerald-400 font-black mt-0.5">✓</span>
                                        <span className="text-sm">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="px-6 py-24">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="flex items-center justify-center gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                            ))}
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">Lo que dicen nuestras clientas</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {TESTIMONIALS.map(t => (
                            <div key={t.name} className="p-6 bg-white/[0.03] border border-white/8 rounded-2xl">
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    ))}
                                </div>
                                <p className="text-white/70 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-full flex items-center justify-center text-white text-xs font-black">
                                        {t.initials}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{t.name}</p>
                                        <p className="text-xs text-white/40">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="px-6 py-24 bg-white/[0.02] border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black tracking-tighter mb-3">Precios simples y honestos</h2>
                        <p className="text-white/40">Sin costos ocultos. Cancela cuando quieras.</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        {PLANS.map(plan => (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl border p-6 flex flex-col ${
                                    plan.highlight
                                        ? 'border-[#FF2E88] bg-[#FF2E88]/5 shadow-[0_0_40px_rgba(255,46,136,0.12)]'
                                        : 'border-white/10 bg-white/[0.03]'
                                }`}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF2E88] text-white text-[10px] font-black px-4 py-1 rounded-full whitespace-nowrap uppercase tracking-widest">
                                        {plan.badge}
                                    </div>
                                )}
                                <h3 className="text-base font-black text-white mb-3">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-5">
                                    <span className="text-3xl font-black text-white">US${plan.price}</span>
                                    <span className="text-white/30 text-sm">/mes</span>
                                </div>
                                <Link
                                    to="/register"
                                    className={`w-full py-2.5 rounded-xl font-black text-sm text-center transition-all mt-auto ${
                                        plan.highlight
                                            ? 'bg-[#FF2E88] text-white hover:bg-[#e0266f]'
                                            : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                                    }`}
                                >
                                    Comenzar
                                </Link>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-center">
                        <Link to="/pricing" className="text-sm text-white/40 hover:text-white transition-colors underline underline-offset-4">
                            Ver comparativa completa de planes →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Trust badges */}
            <section className="px-6 py-16 border-t border-white/5">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {[
                        { icon: Shield, label: 'WhatsApp Business API Oficial', color: 'text-emerald-400' },
                        { icon: Zap, label: 'Setup en menos de 48 horas', color: 'text-amber-400' },
                        { icon: Check, label: 'Sin contratos. Sin permanencia.', color: 'text-sky-400' },
                        { icon: Star, label: '7 días de prueba gratuita', color: 'text-[#FF2E88]' },
                    ].map(item => (
                        <div key={item.label} className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                                <item.icon className={`w-5 h-5 ${item.color}`} />
                            </div>
                            <p className="text-xs text-white/40 font-medium leading-tight">{item.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="px-6 py-24 bg-white/[0.02] border-t border-white/5">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-3xl font-black tracking-tighter text-center mb-10">Preguntas frecuentes</h2>
                    <div className="space-y-3">
                        {FAQS.map(faq => (
                            <div key={faq.q} className="p-5 bg-white/[0.03] border border-white/8 rounded-xl">
                                <p className="font-black text-white text-sm mb-2">{faq.q}</p>
                                <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA final */}
            <section className="px-6 py-24">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#FF2E88]/20 via-violet-600/10 to-transparent border border-[#FF2E88]/20 rounded-3xl p-14">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,46,136,0.08)_0%,_transparent_70%)]" />
                        <div className="relative">
                            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                                Tu clínica merece
                                <br />
                                <span className="bg-gradient-to-r from-[#FF2E88] to-[#FF4DA6] bg-clip-text text-transparent">
                                    trabajar sola.
                                </span>
                            </h2>
                            <p className="text-white/50 mb-8 max-w-xl mx-auto">
                                Únete a cientos de esteticistas que ya automatizaron su negocio con Citenly.
                                7 días gratis. Sin complicaciones.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    to="/register"
                                    className="flex items-center gap-2 bg-[#FF2E88] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#e0266f] transition-all shadow-2xl shadow-[#FF2E88]/30 w-full sm:w-auto justify-center"
                                >
                                    Comenzar gratis ahora
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link
                                    to="/demo"
                                    className="flex items-center gap-2 text-white/60 font-bold px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 hover:text-white transition-all w-full sm:w-auto justify-center"
                                >
                                    <MessageSquare className="w-4.5 h-4.5" />
                                    Agendar demo
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-10 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black text-white tracking-tight">Citenly</span>
                        <span className="text-xs text-white/20">Beauty AI</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-white/25">
                        <Link to="/terminos" className="hover:text-white transition-colors">Términos</Link>
                        <Link to="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
                        <Link to="/pricing" className="hover:text-white transition-colors">Precios</Link>
                        <Link to="/demo" className="hover:text-white transition-colors">Demo</Link>
                    </div>
                    <p className="text-xs text-white/20">© 2025 Citenly. Hecho con 💗 para esteticistas.</p>
                </div>
            </footer>

            {/* AI Chat Widget */}
            <AIChatWidget />
        </div>
    )
}

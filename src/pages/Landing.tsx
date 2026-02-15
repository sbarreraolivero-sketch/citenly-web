import { Link } from 'react-router-dom'
import {
    Sparkles,
    MessageSquare,
    Calendar,
    Clock,
    TrendingUp,
    ArrowRight,
    Play,
    Star
} from 'lucide-react'

const features = [
    {
        icon: MessageSquare,
        title: 'Atención 24/7 por WhatsApp',
        description: 'Tu asistente de IA responde mensajes instantáneamente, sin importar la hora.',
    },
    {
        icon: Calendar,
        title: 'Agendamiento Inteligente',
        description: 'Agenda, confirma y reprograma citas automáticamente según tu disponibilidad.',
    },
    {
        icon: Clock,
        title: 'Recordatorios Automáticos',
        description: 'Reduce los no-shows hasta un 50% con recordatorios personalizados.',
    },
    {
        icon: TrendingUp,
        title: 'Analytics en Tiempo Real',
        description: 'Monitorea el rendimiento de tu clínica con métricas claras y accionables.',
    },
]

const stats = [
    { value: '50%', label: 'Menos no-shows' },
    { value: '20hrs', label: 'Ahorradas por semana' },
    { value: '<1min', label: 'Tiempo de respuesta' },
    { value: '500+', label: 'Clínicas activas' },
]

const testimonials = [
    {
        name: 'Dra. Carolina Méndez',
        role: 'Clínica Derma Bella',
        content: 'Antes pasaba 3 horas diarias respondiendo mensajes. Ahora mi asistente de Citenly lo hace todo mientras yo me enfoco en mis pacientes.',
        rating: 5,
    },
    {
        name: 'Dr. Roberto Silva',
        role: 'Centro Estético Premium',
        content: 'Implementar Citenly fue la mejor decisión. Mis pacientes aman la velocidad de respuesta y yo recuperé tiempo para mi familia.',
        rating: 5,
    },
    {
        name: 'Dra. Ana García',
        role: 'Spa & Wellness Center',
        content: 'El ROI fue inmediato. En el primer mes redujimos los no-shows un 45% y aumentamos las reservas un 30%.',
        rating: 5,
    },
]

export default function Landing() {
    return (
        <div className="min-h-screen bg-ivory">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-silk-beige z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-hero-gradient rounded-soft flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-semibold text-charcoal">Citenly AI</span>
                        </div>

                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-charcoal/70 hover:text-charcoal transition-colors">Características</a>
                            <a href="#testimonials" className="text-charcoal/70 hover:text-charcoal transition-colors">Testimonios</a>
                            <Link to="/pricing" className="text-charcoal/70 hover:text-charcoal transition-colors">Precios</Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-charcoal/70 hover:text-charcoal transition-colors">
                                Iniciar Sesión
                            </Link>
                            <Link to="/register" className="btn-primary px-5 py-2">
                                Comenzar Gratis
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-primary-500/10 text-primary-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
                                <Sparkles className="w-4 h-4" />
                                Potenciado por IA
                            </div>

                            <h1 className="text-h1 text-charcoal mb-6">
                                Tu asistente virtual que{' '}
                                <span className="text-transparent bg-clip-text bg-hero-gradient">
                                    nunca duerme
                                </span>
                            </h1>

                            <p className="text-xl text-charcoal/60 mb-8 leading-relaxed">
                                Automatiza la gestión de citas de tu clínica estética con IA.
                                Responde WhatsApp, agenda citas y envía recordatorios mientras
                                tú te enfocas en lo que importa: tus pacientes.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link to="/register" className="btn-primary px-8 py-4 text-lg flex items-center justify-center gap-2">
                                    Prueba Gratis 14 Días
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <button className="btn-ghost px-8 py-4 text-lg flex items-center justify-center gap-2">
                                    <Play className="w-5 h-5" />
                                    Ver Demo
                                </button>
                            </div>

                            <p className="mt-4 text-sm text-charcoal/50">
                                Sin tarjeta de crédito • Configuración en 5 minutos
                            </p>
                        </div>

                        {/* Hero Image/Mockup */}
                        <div className="relative">
                            <div className="bg-white rounded-softer shadow-soft-xl p-6 border border-silk-beige">
                                {/* Chat Mockup */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 pb-4 border-b border-silk-beige">
                                        <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-charcoal">Citenly AI</p>
                                            <p className="text-xs text-primary-500">En línea</p>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="space-y-3">
                                        <div className="bg-silk-beige/50 rounded-soft p-3 max-w-[80%]">
                                            <p className="text-sm text-charcoal">Hola! Quiero agendar una cita para botox 💉</p>
                                        </div>

                                        <div className="bg-primary-500/10 rounded-soft p-3 max-w-[80%] ml-auto">
                                            <p className="text-sm text-charcoal">
                                                ¡Hola Ana! 👋 Con gusto te ayudo. Tenemos disponibilidad este jueves a las 3pm o viernes a las 11am. ¿Cuál te queda mejor?
                                            </p>
                                        </div>

                                        <div className="bg-silk-beige/50 rounded-soft p-3 max-w-[80%]">
                                            <p className="text-sm text-charcoal">El jueves está perfecto! ✨</p>
                                        </div>

                                        <div className="bg-primary-500/10 rounded-soft p-3 max-w-[80%] ml-auto">
                                            <p className="text-sm text-charcoal">
                                                ¡Listo! Tu cita quedó agendada para el jueves 15 de febrero a las 3:00 PM. Te enviaré un recordatorio un día antes. ¿Necesitas algo más?
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Stats Card */}
                            <div className="absolute -bottom-6 -left-6 bg-white rounded-soft shadow-soft-lg p-4 border border-silk-beige">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-accent-500/20 rounded-full flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-accent-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-charcoal">+47%</p>
                                        <p className="text-xs text-charcoal/50">Citas este mes</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-white border-y border-silk-beige">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="text-4xl font-bold text-transparent bg-clip-text bg-hero-gradient">
                                    {stat.value}
                                </p>
                                <p className="text-charcoal/60 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-h2 text-charcoal mb-4">
                            Todo lo que necesitas para automatizar tu clínica
                        </h2>
                        <p className="text-xl text-charcoal/60 max-w-2xl mx-auto">
                            Herramientas poderosas diseñadas específicamente para clínicas estéticas
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, i) => (
                            <div key={i} className="card-soft p-6 bg-white hover:shadow-soft-lg transition-shadow">
                                <div className="w-12 h-12 bg-primary-500/10 rounded-soft flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-primary-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-charcoal mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-charcoal/60">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-subtle-gradient">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-h2 text-charcoal mb-4">
                            Lo que dicen nuestros clientes
                        </h2>
                        <p className="text-xl text-charcoal/60">
                            Más de 500 clínicas confían en Citenly AI
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, i) => (
                            <div key={i} className="card-soft p-6 bg-white">
                                <div className="flex gap-1 mb-4">
                                    {Array.from({ length: testimonial.rating }).map((_, j) => (
                                        <Star key={j} className="w-5 h-5 text-accent-500 fill-accent-500" />
                                    ))}
                                </div>
                                <p className="text-charcoal/80 mb-6 italic">
                                    "{testimonial.content}"
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-silk-beige rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-charcoal">
                                            {testimonial.name.split(' ').map(n => n[0]).join('')}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-charcoal">{testimonial.name}</p>
                                        <p className="text-sm text-charcoal/50">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="bg-hero-gradient rounded-softer p-12 text-white">
                        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
                            ¿Listo para transformar tu clínica?
                        </h2>
                        <p className="text-xl text-white/80 mb-8">
                            Únete a cientos de profesionales que ya automatizaron su gestión de citas
                        </p>
                        <Link to="/register" className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-soft font-medium text-lg hover:bg-ivory transition-colors">
                            Comenzar Prueba Gratis
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <p className="mt-4 text-sm text-white/60">
                            14 días gratis • Sin compromiso • Cancela cuando quieras
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-charcoal text-white py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-white/10 rounded-soft flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-semibold">Citenly AI</span>
                            </div>
                            <p className="text-white/60 text-sm">
                                Automatiza la gestión de citas de tu clínica estética con inteligencia artificial.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Producto</h4>
                            <ul className="space-y-2 text-white/60 text-sm">
                                <li><a href="#features" className="hover:text-white transition-colors">Características</a></li>
                                <li><Link to="/pricing" className="hover:text-white transition-colors">Precios</Link></li>
                                <li><a href="#" className="hover:text-white transition-colors">Integraciones</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Soporte</h4>
                            <ul className="space-y-2 text-white/60 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-white/60 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Términos</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/40 text-sm">
                        © 2026 Citenly AI. Todos los derechos reservados.
                    </div>
                </div>
            </footer>
        </div>
    )
}

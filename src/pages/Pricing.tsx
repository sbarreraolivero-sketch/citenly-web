import { useState } from 'react'
import { Check, Sparkles, Zap, Crown, ArrowRight, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const plans = [
    {
        id: 'core',
        name: 'Core',
        tagline: 'Gestión completa sin IA conversacional.',
        promise: 'Todo lo que necesitas para administrar tu clínica estética.',
        icon: Star,
        gradient: 'from-slate-500 to-slate-700',
        highlight: false,
        badge: null,
        cta: 'Comenzar con Core',
        priceCLP: 33000,
        priceUSD: 33,
        features: [
            '1 usuario · 1 agenda',
            'Dashboard con métricas en tiempo real',
            'Calendario de citas (gestión manual)',
            'Fichas de clientes e historial de servicios',
            'CRM de prospectos',
            'Sistema de referidos',
            'Módulo de finanzas y reportes',
        ],
        upsells: [
            'Recordatorios automáticos — packs opcionales',
            'Mensajería masiva de marketing segmentada',
        ],
    },
    {
        id: 'starter',
        name: 'Starter',
        tagline: 'Ideal para esteticistas independientes.',
        promise: 'Agrega el agente IA que atiende y agenda por WhatsApp, 24/7.',
        icon: Sparkles,
        gradient: 'from-emerald-500 to-teal-600',
        highlight: false,
        badge: null,
        cta: 'Comenzar con Starter',
        priceCLP: 89000,
        priceUSD: 89,
        features: [
            'Todo lo de Core, más:',
            'Hasta 2 usuarios',
            'Agente IA WhatsApp (GPT-4o mini)',
            '1.000 créditos IA incluidos/mes',
            'Hasta 50 citas automatizadas/mes',
            '1 agenda disponible',
            '100 recordatorios/mes',
        ],
        upsells: [
            'Mensajería masiva de marketing segmentada',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        tagline: 'Para clínicas en pleno crecimiento.',
        promise: 'IA completa, recordatorios, campañas y citas ilimitadas.',
        icon: Zap,
        gradient: 'from-[#FF2E88] to-[#c0236a]',
        highlight: true,
        badge: 'Más Popular',
        cta: 'Elegir Pro',
        priceCLP: 149000,
        priceUSD: 149,
        features: [
            'Todo lo de Starter, más:',
            'Hasta 5 usuarios',
            '5 agendas independientes',
            'IA GPT-4o — citas ilimitadas',
            '4.000 créditos IA incluidos/mes',
            'Recordatorios automáticos (250/mes)',
            'Encuestas de satisfacción',
            'Soporte prioritario',
        ],
        upsells: [
            'Mensajería masiva de marketing segmentada',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        tagline: 'Para redes de salones y multi-sucursal.',
        promise: 'Infraestructura completa para escalar múltiples sedes.',
        icon: Crown,
        gradient: 'from-amber-500 to-orange-600',
        highlight: false,
        badge: null,
        cta: 'Contactar Ventas',
        priceCLP: 349000,
        priceUSD: 349,
        features: [
            'Todo lo de Pro, más:',
            'Usuarios y agendas ilimitados',
            'Multi-sucursal con dashboard unificado',
            '12.000 créditos IA incluidos/mes',
            'Recordatorios ilimitados',
            'IA personalizada por servicio',
            'Super Administrador',
            'Soporte prioritario 24/7',
        ],
        upsells: [],
    },
]

const faqs = [
    {
        question: '¿Puedo cambiar de plan en cualquier momento?',
        answer: 'Sí, puedes subir o bajar de plan cuando quieras. Los cambios se aplican en tu próximo ciclo de facturación.',
    },
    {
        question: '¿Qué pasa si supero el límite de citas del plan Starter?',
        answer: 'Te notificaremos cuando te acerques al límite y podrás subir al plan Pro para obtener citas ilimitadas.',
    },
    {
        question: '¿Necesito tener WhatsApp Business?',
        answer: 'Sí, necesitas una cuenta de WhatsApp Business API. Te guiamos en todo el proceso de configuración con YCloud.',
    },
    {
        question: '¿Desde cuándo comienzan los 7 días de prueba?',
        answer: 'Tus 7 días de prueba comienzan exclusivamente cuando validamos que el asistente de IA entiende y atiende perfectamente a tu clínica. Nosotros asumimos el costo y tiempo de la configuración inicial.',
    },
    {
        question: '¿Ofrecen descuento por pago anual?',
        answer: 'Sí, al pagar anualmente obtienes 2 meses gratis.',
    },
    {
        question: '¿El Core Plan incluye el agente IA de WhatsApp?',
        answer: 'No. Core es gestión manual sin IA conversacional. Para obtener el agente IA que atiende automáticamente por WhatsApp, necesitas el plan Starter o superior.',
    },
]

export default function Pricing() {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
    const [currency, setCurrency] = useState<'CLP' | 'USD'>('CLP')

    const getPrice = (plan: typeof plans[0]) => {
        const base = currency === 'CLP' ? plan.priceCLP : plan.priceUSD
        if (billingPeriod === 'annual') {
            return Math.round(base * 10 / 12)
        }
        return base
    }

    const formatPrice = (price: number) => {
        if (currency === 'CLP') return `$${price.toLocaleString('es-CL')}`
        return `US$${price}`
    }

    return (
        <div className="min-h-screen bg-[#0A0A0F]">
            {/* Header */}
            <header className="border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-[#0A0A0F]/80">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-xl flex items-center justify-center shadow-lg">
                            <Sparkles className="w-4.5 h-4.5 text-white" />
                        </div>
                        <span className="text-lg font-black text-white tracking-tight">Citenly</span>
                    </a>
                    <div className="flex items-center gap-3">
                        <a href="/login" className="text-sm text-white/50 hover:text-white transition-colors px-4 py-2">
                            Iniciar Sesión
                        </a>
                        <a href="/register" className="text-sm bg-[#FF2E88] text-white font-bold px-5 py-2.5 rounded-xl hover:bg-[#e0266f] transition-colors">
                            Comenzar Gratis
                        </a>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-20 pb-12 px-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF2E88]/10 border border-[#FF2E88]/20 text-[#FF4DA6] rounded-full text-sm font-bold mb-6">
                    <Sparkles className="w-3.5 h-3.5" />
                    Planes para clínicas estéticas y salones de belleza
                </div>
                <h1 className="text-5xl font-black text-white mb-4 tracking-tighter">
                    Simple. Transparente. Sin sorpresas.
                </h1>
                <p className="text-lg text-white/50 max-w-xl mx-auto">
                    Elige el plan que mejor se adapte a tu negocio. Cambia cuando quieras.
                </p>
            </section>

            {/* Toggles */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6 mb-12">
                {/* Currency */}
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                    {(['CLP', 'USD'] as const).map((c) => (
                        <button
                            key={c}
                            onClick={() => setCurrency(c)}
                            className={cn(
                                'px-5 py-2 rounded-lg text-sm font-bold transition-all',
                                currency === c ? 'bg-[#FF2E88] text-white' : 'text-white/40 hover:text-white'
                            )}
                        >
                            {c === 'CLP' ? '🇨🇱 CLP' : '🌍 USD'}
                        </button>
                    ))}
                </div>

                {/* Period */}
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                    {(['monthly', 'annual'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setBillingPeriod(p)}
                            className={cn(
                                'px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
                                billingPeriod === p ? 'bg-[#FF2E88] text-white' : 'text-white/40 hover:text-white'
                            )}
                        >
                            {p === 'monthly' ? 'Mensual' : (
                                <>
                                    Anual
                                    <span className="text-[10px] bg-emerald-400 text-emerald-900 px-1.5 py-0.5 rounded-full font-black">
                                        -17%
                                    </span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Plans Grid */}
            <section className="px-6 pb-20">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={cn(
                                'relative flex flex-col rounded-2xl border transition-all duration-300',
                                plan.highlight
                                    ? 'border-[#FF2E88] bg-[#FF2E88]/5 shadow-[0_0_60px_rgba(255,46,136,0.15)]'
                                    : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                            )}
                        >
                            {plan.badge && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF2E88] to-[#FF4DA6] text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest whitespace-nowrap">
                                    {plan.badge}
                                </div>
                            )}

                            {/* Gradient header */}
                            <div className={cn('h-2 rounded-t-2xl bg-gradient-to-r', plan.gradient)} />

                            <div className="p-7 flex flex-col flex-1">
                                {/* Icon + name */}
                                <div className="flex items-center gap-3 mb-5">
                                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br', plan.gradient)}>
                                        <plan.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">{plan.name}</h3>
                                        <p className="text-[11px] text-white/40 font-medium leading-tight">{plan.tagline}</p>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-5 pb-5 border-b border-white/10">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white tracking-tighter">
                                            {formatPrice(getPrice(plan))}
                                        </span>
                                        <span className="text-white/30 text-sm font-medium">/mes</span>
                                    </div>
                                    {billingPeriod === 'annual' && (
                                        <p className="text-emerald-400 text-xs font-bold mt-1">2 meses gratis</p>
                                    )}
                                    <p className="text-white/40 text-xs mt-2 leading-tight">{plan.promise}</p>
                                </div>

                                {/* CTA */}
                                <a
                                    href="/register"
                                    className={cn(
                                        'w-full py-3 rounded-xl font-black text-sm text-center transition-all mb-6',
                                        plan.highlight
                                            ? 'bg-[#FF2E88] text-white hover:bg-[#e0266f] shadow-lg'
                                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                    )}
                                >
                                    {plan.cta}
                                </a>

                                {/* Features */}
                                <ul className="space-y-2.5 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2.5">
                                            <div className={cn(
                                                'w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                                                feature.startsWith('Todo') ? 'bg-white/10' : 'bg-[#FF2E88]/20'
                                            )}>
                                                <Check className={cn(
                                                    'w-2.5 h-2.5',
                                                    feature.startsWith('Todo') ? 'text-white/40' : 'text-[#FF4DA6]'
                                                )} />
                                            </div>
                                            <span className={cn(
                                                'text-sm leading-tight',
                                                feature.startsWith('Todo') ? 'text-white/30 italic' : 'text-white/70'
                                            )}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Upsells */}
                                {plan.upsells.length > 0 && (
                                    <div className="mt-5 pt-4 border-t border-white/5">
                                        <p className="text-[10px] text-white/25 uppercase tracking-widest font-black mb-2">Extras opcionales</p>
                                        {plan.upsells.map((u, i) => (
                                            <p key={i} className="text-xs text-white/30 flex items-center gap-1.5 mb-1">
                                                <span className="text-[#FF2E88]/50">+</span> {u}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section className="px-6 pb-20 bg-white/[0.02] border-t border-white/5">
                <div className="max-w-3xl mx-auto pt-16">
                    <h2 className="text-3xl font-black text-white text-center mb-2 tracking-tighter">
                        Preguntas Frecuentes
                    </h2>
                    <p className="text-white/40 text-center mb-10">Todo lo que necesitas saber antes de empezar.</p>

                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <div key={i} className="p-5 bg-white/[0.03] border border-white/8 rounded-xl">
                                <h3 className="font-black text-white text-sm mb-1.5">{faq.question}</h3>
                                <p className="text-sm text-white/50 leading-relaxed">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA bottom */}
            <section className="px-6 py-20">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="bg-gradient-to-br from-[#FF2E88]/20 to-violet-600/10 border border-[#FF2E88]/20 rounded-2xl p-12">
                        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                            ¿Lista para transformar tu clínica?
                        </h2>
                        <p className="text-white/50 mb-8">
                            7 días de prueba gratis. Sin tarjeta de crédito requerida para empezar.
                        </p>
                        <a
                            href="/register"
                            className="inline-flex items-center gap-2 bg-[#FF2E88] text-white font-black px-8 py-4 rounded-xl hover:bg-[#e0266f] transition-colors text-base shadow-lg"
                        >
                            Comenzar Prueba Gratis
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FF2E88] to-[#c0236a] rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-black tracking-tight">Citenly</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-white/30">
                        <a href="/terms" className="hover:text-white transition-colors">Términos</a>
                        <a href="/privacy" className="hover:text-white transition-colors">Privacidad</a>
                        <a href="/demo" className="hover:text-white transition-colors">Agendar Demo</a>
                    </div>
                    <p className="text-sm text-white/20">© 2025 Citenly. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    )
}

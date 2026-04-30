import { supabase } from './supabase'

/**
 * Redirects user to Lemon Squeezy checkout (USD)
 */
export async function redirectToLemonCheckout(clinicId: string, email: string, planId: string) {
    const { data, error } = await supabase.functions.invoke('lemonsqueezy-create-checkout', {
        body: {
            clinic_id: clinicId,
            plan: planId,
            email: email,
            redirect_url: `${window.location.origin}/app/settings?payment=success`,
        },
    })

    if (error) {
        console.error('Error creating LS checkout:', error)
        throw new Error('Error al conectar con el servidor de pagos')
    }

    if (!data?.checkout_url) {
        throw new Error('No se pudo generar el enlace de pago')
    }

    window.location.href = data.checkout_url
}

/**
 * USD Plan Prices for Lemon Squeezy (International)
 */
export const LS_PLANS = {
    essence: {
        id: 'essence',
        name: 'Essence',
        tagline: 'Para clínicas que quieren dejar de perder clientas',
        promise: 'Recupera las clientas que hoy estás perdiendo por no responder a tiempo.',
        price: 67,
        currency: 'USD',
        monthlyAppointmentsMonthly: 50,
        maxUsers: 2,
        maxAgendas: 1,
        benefits: [
            'Responde automáticamente a cada mensaje',
            'Agenda citas sin fricción',
            'Evita perder clientas interesadas',
            'Centraliza tus conversaciones en un solo lugar'
        ],
        features: [
            '1 agenda inteligente',
            'Integración WhatsApp oficial',
            'Hasta 50 citas generadas automáticamente',
            'Panel básico de rendimiento'
        ],
        cta: 'EMPEZAR AHORA'
    },
    radiance: {
        id: 'radiance',
        name: 'Radiance',
        tagline: 'Más popular — Para clínicas que quieren crecer en serio',
        promise: 'Convierte conversaciones en citas todos los días, sin depender de ti.',
        price: 99,
        currency: 'USD',
        monthlyAppointmentsMonthly: -1,
        maxUsers: 5,
        maxAgendas: 5,
        popular: true,
        benefits: [
            'Seguimiento automático a cada prospecto',
            'Más citas sin invertir más en publicidad',
            'Menos “clientes que desaparecen”',
            'Flujo completo desde mensaje → cita → asistencia'
        ],
        features: [
            'Todo lo de Essence',
            'Hasta 5 usuarios',
            'CRM de prospectos y pacientes',
            'Recordatorios automáticos (reduce inasistencia)',
            'Campañas por WhatsApp',
            'Sistema de referidos automático',
            'Métricas de conversión'
        ],
        cta: 'ESCALAR MI CLÍNICA'
    },
    prestige: {
        id: 'prestige',
        name: 'Prestige',
        tagline: 'Para clínicas que quieren operar como negocio serio',
        promise: 'Un sistema completo que gestiona, convierte y optimiza tu clínica sin depender de tu tiempo.',
        price: 249,
        currency: 'USD',
        monthlyAppointmentsMonthly: -1,
        maxUsers: 1000,
        maxAgendas: 1000,
        benefits: [
            'Control total de tu operación',
            'Automatización avanzada de procesos',
            'Escala múltiples sucursales sin caos',
            'Decisiones basadas en datos reales'
        ],
        features: [
            'Todo lo de Radiance',
            'Usuarios ilimitados',
            'Multi-sucursal',
            'IA personalizada por servicio',
            'Reportes financieros avanzados',
            'Optimización continua del sistema'
        ],
        cta: 'QUIERO ESCALAR MI OPERACIÓN'
    },
} as const;

export type LSPlanId = keyof typeof LS_PLANS

/**
 * USD Credit Packs — GPT-4o-mini (económico)
 */
export const LS_CREDIT_PACKS = {
    'pack_500':  { id: 'pack_500',  name: 'Pack Inicial',    credits: 500,  price: 5,   description: '500 Créditos de IA' },
    'pack_1500': { id: 'pack_1500', name: 'Pack Pro',        credits: 1500, price: 12,  description: '1500 Créditos de IA' },
    'pack_4000': { id: 'pack_4000', name: 'Pack Enterprise',  credits: 4000, price: 25,  description: '4000 Créditos de IA' },
} as const

/**
 * USD Credit Packs — GPT-4o (premium)
 */
export const LS_CREDIT_PACKS_4O = {
    'pack_500_4o':  { id: 'pack_500_4o',  name: 'Pack Inicial',    credits: 500,  price: 10,  description: '500 Créditos de IA (GPT-4o)' },
    'pack_1500_4o': { id: 'pack_1500_4o', name: 'Pack Pro',        credits: 1500, price: 30,  description: '1500 Créditos de IA (GPT-4o)' },
    'pack_4000_4o': { id: 'pack_4000_4o', name: 'Pack Enterprise',  credits: 4000, price: 80,  description: '4000 Créditos de IA (GPT-4o)' },
} as const

export type LSCreditPackId = keyof typeof LS_CREDIT_PACKS
export type LSCreditPack4oId = keyof typeof LS_CREDIT_PACKS_4O

/**
 * Redirects user to Lemon Squeezy for credit pack purchase (USD)
 */
export async function redirectToLemonCreditsCheckout(clinicId: string, email: string, packId: string, model: 'mini' | '4o' = 'mini') {
    const { data, error } = await supabase.functions.invoke('lemonsqueezy-create-credits-checkout', {
        body: {
            clinic_id: clinicId,
            pack_id: packId,
            email: email,
            model: model,
            currency: 'USD',
            redirect_url: `${window.location.origin}/app/settings?tab=ai&payment=success`,
        },
    })

    if (error) {
        console.error('Error creating LS credit checkout:', error)
        throw new Error('Error al conectar con el servidor de pagos')
    }

    if (!data?.checkout_url) {
        throw new Error('No se pudo generar el enlace de pago')
    }

    window.location.href = data.checkout_url
}

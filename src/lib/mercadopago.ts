import { supabase } from './supabase'

// ──────────────────────────────────────────────
// Mercado Pago — Chile Local Payments (CLP)
// ──────────────────────────────────────────────

interface CreateSubscriptionParams {
    clinicId: string
    planId: 'essence' | 'radiance' | 'prestige'
    email: string
    externalReference?: string
}

interface MercadoPagoPreference {
    id: string
    init_point: string
    sandbox_init_point: string
}

/**
 * Creates a Mercado Pago subscription preference (CLP)
 */
export async function createSubscriptionPreference(
    params: CreateSubscriptionParams
): Promise<MercadoPagoPreference | null> {
    const { clinicId, planId, email, externalReference } = params

    const { data, error } = await supabase.functions.invoke('mercadopago-create-subscription', {
        body: {
            clinic_id: clinicId,
            plan: planId,
            email: email,
            currency: 'CLP',
            external_reference: externalReference || clinicId,
            back_urls: {
                success: `${window.location.origin}/app/settings?payment=success`,
                failure: `${window.location.origin}/app/settings?payment=failure`,
                pending: `${window.location.origin}/app/settings?payment=pending`,
            },
        },
    })

    if (error) {
        console.error('Error creating subscription:', error)
        return null
    }

    return data as MercadoPagoPreference
}

/**
 * Redirects user to Mercado Pago checkout (CLP)
 */
export async function redirectToCheckout(params: CreateSubscriptionParams) {
    const preference = await createSubscriptionPreference(params)

    if (!preference) {
        throw new Error('Failed to create payment preference')
    }

    window.location.href = preference.init_point
}

/**
 * Get subscription details for a clinic
 */
export async function getClinicSubscription(clinicId: string) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('clinic_id', clinicId)
        .single()

    if (error) {
        console.error('Error fetching subscription:', error)
        return null
    }

    return data
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
    const { data, error } = await supabase.functions.invoke('mercadopago-cancel-subscription', {
        body: { subscription_id: subscriptionId },
    })

    if (error) {
        console.error('Error cancelling subscription:', error)
        return { success: false, error }
    }

    return { success: true, data }
}

/**
 * CLP Plan Prices for Mercado Pago (Chile)
 */
export const PLANS = {
    essence: {
        id: 'essence',
        name: 'Essence',
        tagline: 'Para clínicas que quieren dejar de perder clientas',
        promise: 'Recupera las clientas que hoy estás perdiendo por no responder a tiempo.',
        price: 67000,
        currency: 'CLP',
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
        price: 99000,
        currency: 'CLP',
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
        price: 249000,
        currency: 'CLP',
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

export type PlanId = keyof typeof PLANS

/**
 * CLP Credit Packs — GPT-4o-mini (económico)
 */
export const CREDIT_PACKS = {
    'pack_500':  { id: 'pack_500',  name: 'Pack Inicial',    credits: 500,  price: 5000,  description: '500 Créditos de IA' },
    'pack_1500': { id: 'pack_1500', name: 'Pack Pro',        credits: 1500, price: 12000, description: '1500 Créditos de IA' },
    'pack_4000': { id: 'pack_4000', name: 'Pack Enterprise',  credits: 4000, price: 25000, description: '4000 Créditos de IA' },
} as const

/**
 * CLP Credit Packs — GPT-4o (premium)
 */
export const CREDIT_PACKS_4O = {
    'pack_500_4o':  { id: 'pack_500_4o',  name: 'Pack Inicial',    credits: 500,  price: 10000, description: '500 Créditos de IA (GPT-4o)' },
    'pack_1500_4o': { id: 'pack_1500_4o', name: 'Pack Pro',        credits: 1500, price: 30000, description: '1500 Créditos de IA (GPT-4o)' },
    'pack_4000_4o': { id: 'pack_4000_4o', name: 'Pack Enterprise',  credits: 4000, price: 80000, description: '4000 Créditos de IA (GPT-4o)' },
} as const

export type CreditPackId = keyof typeof CREDIT_PACKS
export type CreditPack4oId = keyof typeof CREDIT_PACKS_4O

/**
 * Redirects user to Mercado Pago for credit pack purchase (CLP)
 */
export async function redirectToCreditsCheckout(clinicId: string, email: string, packId: string, model: 'mini' | '4o' = 'mini') {
    const { data, error } = await supabase.functions.invoke('mercadopago-create-credits-preference', {
        body: {
            clinic_id: clinicId,
            pack_id: packId,
            email: email,
            model: model,
            currency: 'CLP',
            back_urls: {
                success: `${window.location.origin}/app/settings?tab=ai&payment=success`,
                failure: `${window.location.origin}/app/settings?tab=ai&payment=failure`,
                pending: `${window.location.origin}/app/settings?tab=ai&payment=pending`,
            },
        },
    })

    if (error) {
        console.error('Error creating credit preference:', error)
        const msg = error.message || 'Error al conectar con la función de pago'
        throw new Error(`Error en el servidor: ${msg}`)
    }

    if (!data?.init_point) {
        console.error('No init_point returned from function:', data)
        throw new Error('La respuesta del servidor no fue válida')
    }

    window.location.href = data.init_point
}

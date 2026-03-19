import { supabase } from './supabase'


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
 * Creates a Mercado Pago subscription preference
 * This will redirect the user to Mercado Pago to complete payment
 */
export async function createSubscriptionPreference(
    params: CreateSubscriptionParams
): Promise<MercadoPagoPreference | null> {
    const { clinicId, planId, email, externalReference } = params

    // Call our Edge Function to create the preference
    const { data, error } = await supabase.functions.invoke('mercadopago-create-subscription', {
        body: {
            clinic_id: clinicId,
            plan: planId,
            email: email,
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
 * Redirects user to Mercado Pago checkout
 */
export async function redirectToCheckout(params: CreateSubscriptionParams) {
    const preference = await createSubscriptionPreference(params)

    if (!preference) {
        throw new Error('Failed to create payment preference')
    }

    // Connect directly to the production endpoint since we're using production keys
    const checkoutUrl = preference.init_point

    window.location.href = checkoutUrl
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
 * Plan configuration with features
 */
export const PLANS = {
    item: {
        id: 'essence',
        name: 'Essence',
        price: 79,
        currency: 'USD',
        monthlyAppointments: 50,
        features: [
            'Hasta 2 usuarios',
            '1 Agente de IA (Soft Luxury)',
            'Hasta 50 citas mensuales',
            'Dashboard básico',
            'Integración 1 WhatsApp',
        ],
    },
    radiance: {
        id: 'radiance',
        name: 'Radiance',
        price: 159,
        currency: 'USD',
        monthlyAppointments: -1, // Unlimited
        popular: true,
        features: [
            'Todo lo de Essence, más:',
            'Hasta 5 usuarios (Invitaciones seguras)',
            'CRM Gestión de prospectos',
            'Campañas de Marketing (WhatsApp masivo)',
            'Módulo de Finanzas',
            'Gestión de Servicios + Upselling',
            'Citas ilimitadas',
            'IA Avanzada + Historial Clínico',
            'Analítica de conversaciones',
        ],
    },
    prestige: {
        id: 'prestige',
        name: 'Prestige',
        price: 299,
        currency: 'USD',
        monthlyAppointments: -1, // Unlimited
        features: [
            'Todo lo de Radiance, más:',
            'Usuarios ilimitados',
            'Multi-sucursal',
            'IA Personalizada (Manual de ventas)',
            'Reportes avanzados',
            'Concierge Onboarding',
        ],
    },
} as const

export type PlanId = keyof typeof PLANS

/**
 * AI Credit Packs configuration
 */
export const CREDIT_PACKS = {
    'pack_500': { id: 'pack_500', name: 'Pack Inicial', credits: 500, price: 5, description: "500 Créditos de IA" },
    'pack_1500': { id: 'pack_1500', name: 'Pack Pro', credits: 1500, price: 12, description: "1500 Créditos de IA" },
    'pack_4000': { id: 'pack_4000', name: 'Pack Enterprise', credits: 4000, price: 25, description: "4000 Créditos de IA" },
} as const

export type CreditPackId = keyof typeof CREDIT_PACKS

/**
 * Redirects user to Mercado Pago for credit pack purchase
 */
export async function redirectToCreditsCheckout(clinicId: string, email: string, packId: CreditPackId) {
    const { data, error } = await supabase.functions.invoke('mercadopago-create-credits-preference', {
        body: {
            clinic_id: clinicId,
            pack_id: packId,
            email: email,
            back_urls: {
                success: `${window.location.origin}/app/settings?tab=subscription&payment=success`,
                failure: `${window.location.origin}/app/settings?tab=subscription&payment=failure`,
                pending: `${window.location.origin}/app/settings?tab=subscription&payment=pending`,
            },
        },
    })

    if (error) {
        console.error('Error creating credit preference:', error)
        throw new Error('Failed to create payment preference')
    }

    window.location.href = data.init_point
}

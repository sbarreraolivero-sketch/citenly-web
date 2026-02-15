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

    // In production, use init_point; in sandbox, use sandbox_init_point
    // @ts-ignore - Vite's import.meta.env is available at runtime
    const checkoutUrl = import.meta.env.DEV
        ? preference.sandbox_init_point
        : preference.init_point

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
    essence: {
        id: 'essence',
        name: 'Essence',
        price: 79,
        currency: 'USD',
        monthlyAppointments: 50,
        features: [
            '1 Agente de IA con personalidad Soft Luxury',
            'Hasta 50 citas mensuales',
            'Dashboard básico (Citas + Mensajes)',
            'Integración con 1 número de WhatsApp',
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
            'Citas ilimitadas',
            'IA Avanzada con resolución de dudas',
            'Historial clínico digital en chat',
            'Ranking de servicios más vendidos',
            'Encuestas de satisfacción automáticas',
            'Tasa de conversión de citas',
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
            'Multi-sucursal: un dashboard para todo',
            'IA Personalizada con tu manual de ventas',
            'Reportes mensuales avanzados',
        ],
    },
} as const

export type PlanId = keyof typeof PLANS

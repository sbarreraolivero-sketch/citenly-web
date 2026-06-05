import { supabase } from './supabase'

// ──────────────────────────────────────────────
// Mercado Pago — Chile Local Payments (CLP)
// ──────────────────────────────────────────────

interface CreateSubscriptionParams {
    clinicId: string
    planId: 'core' | 'starter' | 'pro' | 'enterprise'
    email: string
    externalReference?: string
}

interface MercadoPagoPreference {
    id: string
    init_point: string
    sandbox_init_point: string
}

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

export async function redirectToCheckout(params: CreateSubscriptionParams) {
    const preference = await createSubscriptionPreference(params)
    if (!preference) throw new Error('Failed to create payment preference')
    window.location.href = preference.init_point
}

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

// ──────────────────────────────────────────────
// CLP Plan Prices (Chile)
// ──────────────────────────────────────────────
export const PLANS = {
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        tagline: 'Para redes de salones y multi-sucursal.',
        promise: 'Infraestructura completa para escalar múltiples sedes.',
        price: 282000,
        annualPrice: 2715000,
        currency: 'CLP',
        monthlyAppointmentsMonthly: -1,
        maxUsers: 999999,
        maxAgendas: 999999,
        aiCreditsLimit: -1,
        remindersPerMonth: -1,
        features: [
            'Todo lo de Pro, más:',
            'Usuarios y agendas ilimitados',
            'Multi-sucursal con dashboard unificado',
            'Conversaciones ilimitadas',
            'Recordatorios ilimitados',
            'IA personalizada por servicio',
            'Super Administrador',
            'Soporte prioritario 24/7',
        ],
        cta: 'Contactar Ventas',
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        tagline: 'Para clínicas en pleno crecimiento.',
        promise: 'IA completa, recordatorios, campañas y citas ilimitadas.',
        price: 159000,
        annualPrice: 1527000,
        currency: 'CLP',
        monthlyAppointmentsMonthly: -1,
        maxUsers: 5,
        maxAgendas: 5,
        aiCreditsLimit: 8000,
        remindersPerMonth: 250,
        popular: true,
        features: [
            'Todo lo de Starter, más:',
            'Hasta 5 usuarios',
            '5 agendas independientes',
            'IA GPT-4o — citas ilimitadas',
            '8.000 créditos IA incluidos/mes',
            'Recordatorios automáticos (250/mes)',
            'Encuestas de satisfacción',
            'Soporte prioritario',
        ],
        upsells: [
            'Mensajería masiva de marketing segmentada',
        ],
        cta: 'Elegir Pro',
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        tagline: 'Para profesionales independientes.',
        promise: 'Recepcionista IA en WhatsApp entrenada con tu marca + gestión completa para profesionales independientes',
        price: 92000,
        annualPrice: 883000,
        currency: 'CLP',
        monthlyAppointmentsMonthly: 100,
        maxUsers: 1,
        maxAgendas: 1,
        aiCreditsLimit: 4000,
        remindersPerMonth: 100,
        features: [
            'Todo lo de Core, más:',
            '1 usuario · 1 agenda',
            'Agente IA WhatsApp (GPT-4o mini)',
            '4.000 créditos IA',
            'Hasta 100 citas automatizadas/mes',
            '100 recordatorios/mes',
            '¿Más de 100 citas/mes? Pasa a Pro →',
            '✗ Encuesta de satisfacción automatizada',
        ],
        upsells: [
            'Mensajería masiva de marketing segmentada',
        ],
        cta: 'Comenzar con Starter',
    },
    core: {
        id: 'core',
        name: 'Core',
        tagline: 'Gestión completa sin IA conversacional.',
        promise: 'Todo lo necesario para gestionar tu negocio pero sin IA conversacional',
        price: 33000,
        currency: 'CLP',
        monthlyAppointmentsMonthly: 0,
        maxUsers: 1,
        maxAgendas: 1,
        aiCreditsLimit: 0,
        remindersPerMonth: 0,
        features: [
            '1 usuario · 1 agenda',
            'Dashboard con métricas en tiempo real',
            'Calendario de citas (gestión manual)',
            'Fichas de clientes e historial de servicios',
            'CRM de prospectos',
            'Sistema de referidos',
            'Módulo de finanzas y reportes',
            'Sin recordatorios automáticos',
            'Recordatorios automáticos disponibles desde Plan Starter →',
        ],
        upsells: [
            'Mensajería masiva de marketing segmentada',
        ],
        cta: 'Comenzar con Core',
    },
} as const

export type PlanId = keyof typeof PLANS

// Maps legacy DB plan IDs (essence/radiance/prestige) to current IDs
export function normalizePlanId(plan: string | null | undefined): PlanId {
    const legacy: Record<string, PlanId> = {
        essence: 'starter',
        radiance: 'pro',
        prestige: 'enterprise',
        freemium: 'core',
    }
    const normalized = legacy[plan ?? ''] ?? plan ?? 'core'
    return (normalized in PLANS ? normalized : 'core') as PlanId
}

// ──────────────────────────────────────────────
// CLP Credit Packs — GPT-4o-mini (económico)
// ──────────────────────────────────────────────
// Válidos 30 días desde la compra · No acumulables
export const CREDIT_PACKS = {
    'pack_500':  { id: 'pack_500',  name: 'Pack Inicial',    credits: 500,  price: 7000,  description: '500 mensajes de IA' },
    'pack_1500': { id: 'pack_1500', name: 'Pack Pro',        credits: 2000, price: 14000, description: '2.000 mensajes de IA' },
    'pack_4000': { id: 'pack_4000', name: 'Pack Enterprise', credits: 5000, price: 28000, description: '5.000 mensajes de IA' },
} as const

// ──────────────────────────────────────────────
// CLP Credit Packs — GPT-4o (premium)
// ──────────────────────────────────────────────
export const CREDIT_PACKS_4O = {
    'pack_500_4o':  { id: 'pack_500_4o',  name: 'Pack Inicial',    credits: 500,  price: 10000, description: '500 Créditos de IA (GPT-4o)' },
    'pack_1500_4o': { id: 'pack_1500_4o', name: 'Pack Pro',        credits: 1500, price: 30000, description: '1.500 Créditos de IA (GPT-4o)' },
    'pack_4000_4o': { id: 'pack_4000_4o', name: 'Pack Enterprise', credits: 4000, price: 80000, description: '4.000 Créditos de IA (GPT-4o)' },
} as const

export type CreditPackId = keyof typeof CREDIT_PACKS
export type CreditPack4oId = keyof typeof CREDIT_PACKS_4O

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

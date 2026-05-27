import { supabase } from './supabase'

// ──────────────────────────────────────────────
// LemonSqueezy — International Payments (USD)
// ──────────────────────────────────────────────

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

    if (!data?.checkout_url) throw new Error('No se pudo generar el enlace de pago')
    window.location.href = data.checkout_url
}

// ──────────────────────────────────────────────
// USD Plan Prices (International)
// ──────────────────────────────────────────────
export const LS_PLANS = {
    core: {
        id: 'core',
        name: 'Core',
        tagline: 'Gestión completa sin IA conversacional.',
        promise: 'Todo lo que necesitas para administrar tu clínica estética.',
        price: 33,
        currency: 'USD',
        monthlyAppointmentsMonthly: 0,
        maxUsers: 1,
        maxAgendas: 1,
        aiCreditsLimit: 0,
        remindersPerMonth: 0,
        features: [
            '1 usuario · 1 agenda',
            'Dashboard con métricas en tiempo real',
            'Calendario de citas (gestión manual)',
            'Fichas de clientes e historial',
            'CRM de prospectos',
            'Sistema de referidos',
            'Módulo de finanzas y reportes',
        ],
        upsells: [
            'Recordatorios automáticos — packs opcionales',
            'Mensajería masiva de marketing segmentada',
        ],
        cta: 'Comenzar con Core',
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        tagline: 'Ideal para esteticistas independientes.',
        promise: 'Agrega el agente IA que atiende y agenda por WhatsApp, 24/7.',
        price: 89,
        currency: 'USD',
        monthlyAppointmentsMonthly: 50,
        maxUsers: 2,
        maxAgendas: 1,
        aiCreditsLimit: 1000,
        remindersPerMonth: 100,
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
        cta: 'Comenzar con Starter',
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        tagline: 'Para clínicas en pleno crecimiento.',
        promise: 'IA completa, recordatorios, campañas y citas ilimitadas.',
        price: 149,
        currency: 'USD',
        monthlyAppointmentsMonthly: -1,
        maxUsers: 5,
        maxAgendas: 5,
        aiCreditsLimit: 4000,
        remindersPerMonth: 250,
        popular: true,
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
        cta: 'Elegir Pro',
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        tagline: 'Para redes de salones y multi-sucursal.',
        promise: 'Infraestructura completa para escalar múltiples sedes.',
        price: 349,
        currency: 'USD',
        monthlyAppointmentsMonthly: -1,
        maxUsers: 999999,
        maxAgendas: 999999,
        aiCreditsLimit: 12000,
        remindersPerMonth: -1,
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
        cta: 'Contactar Ventas',
    },
} as const

export type LSPlanId = keyof typeof LS_PLANS

// ──────────────────────────────────────────────
// USD Credit Packs — GPT-4o-mini
// ──────────────────────────────────────────────
export const LS_CREDIT_PACKS = {
    'pack_500':  { id: 'pack_500',  name: 'Pack Inicial',    credits: 500,  price: 5,  description: '500 Créditos de IA' },
    'pack_1500': { id: 'pack_1500', name: 'Pack Pro',        credits: 1500, price: 12, description: '1.500 Créditos de IA' },
    'pack_4000': { id: 'pack_4000', name: 'Pack Enterprise', credits: 4000, price: 25, description: '4.000 Créditos de IA' },
} as const

// ──────────────────────────────────────────────
// USD Credit Packs — GPT-4o (Premium)
// ──────────────────────────────────────────────
export const LS_CREDIT_PACKS_4O = {
    'pack_500_4o':  { id: 'pack_500_4o',  name: 'Pack Inicial',    credits: 500,  price: 10, description: '500 Créditos de IA (GPT-4o)' },
    'pack_1500_4o': { id: 'pack_1500_4o', name: 'Pack Pro',        credits: 1500, price: 30, description: '1.500 Créditos de IA (GPT-4o)' },
    'pack_4000_4o': { id: 'pack_4000_4o', name: 'Pack Enterprise', credits: 4000, price: 80, description: '4.000 Créditos de IA (GPT-4o)' },
} as const

export type LSCreditPackId = keyof typeof LS_CREDIT_PACKS
export type LSCreditPack4oId = keyof typeof LS_CREDIT_PACKS_4O

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

    if (!data?.checkout_url) throw new Error('No se pudo generar el enlace de pago')
    window.location.href = data.checkout_url
}

// ──────────────────────────────────────────────
// Reminder Packs (USD) — por unidad
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// Reminder Packs (USD) — fixed bundles
// Pricing: Pack 50=$9 · Pack 350=$19 · Unlimited=$29
// ──────────────────────────────────────────────
export type ReminderPackId = 'reminders_50' | 'reminders_350' | 'reminders_unlimited'

export const REMINDER_PACKS: Record<ReminderPackId, { id: ReminderPackId; name: string; credits: number; price: number; label: string }> = {
    reminders_50:        { id: 'reminders_50',        name: 'Pack Básico',     credits: 50,   price: 9,  label: '50 recordatorios' },
    reminders_350:       { id: 'reminders_350',       name: 'Pack Estándar',   credits: 350,  price: 19, label: '350 recordatorios' },
    reminders_unlimited: { id: 'reminders_unlimited', name: 'Pack Ilimitado',  credits: 9999, price: 29, label: 'Recordatorios ilimitados (mes)' },
}

export async function redirectToLemonReminderPackCheckout(clinicId: string, email: string, packId: ReminderPackId) {
    const { data, error } = await supabase.functions.invoke('lemonsqueezy-create-checkout', {
        body: {
            clinic_id: clinicId,
            email: email,
            type: 'reminders',
            plan_or_pack_id: packId,
            success_url: `${window.location.origin}/app/reminders?payment=success`,
        },
    })

    if (error) {
        console.error('Error creating LS reminder pack checkout:', error)
        throw new Error(error.message || 'Error al conectar con LemonSqueezy')
    }

    if (!data?.url) throw new Error('No se recibió una URL de pago válida')
    window.location.href = data.url
}

export async function redirectToLemonRemindersCheckout(clinicId: string, email: string, quantity: number) {
    const { data, error } = await supabase.functions.invoke('lemonsqueezy-create-checkout', {
        body: {
            clinic_id: clinicId,
            email: email,
            type: 'reminders',
            plan_or_pack_id: 'reminders',
            quantity: Math.max(10, quantity),
            success_url: `${window.location.origin}/app/reminders?payment=success`,
        },
    })

    if (error) {
        console.error('Error creating LS reminders checkout:', error)
        throw new Error(error.message || 'Error al conectar con LemonSqueezy')
    }

    if (!data?.url) throw new Error('No se recibió una URL de pago válida')
    window.location.href = data.url
}

// ──────────────────────────────────────────────
// Campaign Credits (USD) — US$0.15/crédito, mín 50
// ──────────────────────────────────────────────
export async function redirectToLemonCampaignCreditsCheckout(
    clinicId: string,
    email: string,
    quantity: number
) {
    const { data, error } = await supabase.functions.invoke('lemonsqueezy-create-checkout', {
        body: {
            clinic_id: clinicId,
            email: email,
            type: 'campaign_credits',
            plan_or_pack_id: 'campaign_credits',
            quantity: Math.max(50, quantity),
            success_url: `${window.location.origin}/app/campaigns?payment=success`,
        },
    })

    if (error) {
        console.error('Error creating campaign credits checkout:', error)
        throw new Error(error.message || 'Error al conectar con LemonSqueezy')
    }

    if (!data?.url) {
        const msg = data?.details || data?.error || 'No se recibió una URL de pago válida'
        throw new Error(msg)
    }

    window.location.href = data.url
}

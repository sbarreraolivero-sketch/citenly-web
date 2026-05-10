import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Building2,
    Clock,
    Key,
    Bell,
    Sparkles,
    Save,
    Plus,
    Trash2,
    ChevronRight,
    CreditCard,
    CheckCircle2,
    Zap,
    Copy,
    Check,
    MessageSquare,
    AlertCircle,
    X,
    Loader2,
    AlarmClock,
    User,
    Webhook,
    Globe,
    ToggleLeft,
    ToggleRight,
    Send,
    Tag,
    Users,
    ArrowLeft,
    Instagram,
    Facebook,
    Music,
    History,
    ExternalLink,
    RefreshCw,
    Calendar,
    ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, type PlanId, redirectToCheckout, CREDIT_PACKS, redirectToCreditsCheckout } from '@/lib/mercadopago'
import { LS_PLANS, type LSPlanId, LS_CREDIT_PACKS, redirectToLemonCheckout, redirectToLemonCreditsCheckout } from '@/lib/lemonsqueezy'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TagManager } from '@/components/settings/TagManager'
import Team from './settings/Team'
import MyProfile from './settings/MyProfile'
import { TemplateSelector } from '@/components/settings/TemplateSelector'
import { AITransactionHistory } from '@/components/dashboard/AITransactionHistory'

// Get the Supabase URL for webhook display
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

const tabs = [
    { id: 'profile', label: 'Mi Perfil', icon: User },
    { id: 'clinic', label: 'Clínica', icon: Building2 },
    { id: 'team', label: 'Equipo', icon: Users },
    { id: 'subscription', label: 'Plan', icon: CreditCard },
    { id: 'schedule', label: 'Horarios', icon: Clock },
    { id: 'integrations', label: 'Integraciones', icon: Key },
    { id: 'ai', label: 'Inteligencia Artificial', icon: Sparkles },
    { id: 'tags', label: 'Etiquetas', icon: Tag },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'reminders', label: 'Recordatorios', icon: AlarmClock },
]

// Mock services data
// Services state is now managed via DB

// Mock working hours
const mockWorkingHours = {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '18:00' },
    saturday: { open: '09:00', close: '14:00' },
    sunday: null,
}

const dayNames: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
}

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function Settings() {
    const { user, profile, member, refreshClinics } = useAuth()
    const [searchParams] = useSearchParams()

    const availableTabs = tabs.filter(tab => {
        if (!member || member.role === 'owner' || member.role === 'admin') return true

        // Allowed tabs for non-owners
        const allowedTabs = ['profile', 'schedule', 'team', 'notifications']
        return allowedTabs.includes(tab.id)
    })

    const [activeTab, setActiveTab] = useState('profile') // Default to profile for non-owners safety
    const [clinicName, setClinicName] = useState('Clínica Estética Demo')
    const [clinicAddress, setClinicAddress] = useState('')
    const [addressReferences, setAddressReferences] = useState('')
    const [googleMapsUrl, setGoogleMapsUrl] = useState('')
    const [instagramUrl, setInstagramUrl] = useState('')
    const [facebookUrl, setFacebookUrl] = useState('')
    const [tiktokUrl, setTiktokUrl] = useState('')
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [services, setServices] = useState<any[]>([])
    const [workingHours, setWorkingHours] = useState<any>(mockWorkingHours)
    const [businessModel, setBusinessModel] = useState<'physical' | 'mobile' | 'hybrid'>('physical')
    const [specialty, setSpecialty] = useState<'aesthetic' | 'dental' | 'general'>('aesthetic')
    const [showMobileList, setShowMobileList] = useState(true)

    // Service modal state
    const [showServiceModal, setShowServiceModal] = useState(false)
    const [newServiceName, setNewServiceName] = useState('')
    const [newServiceDuration, setNewServiceDuration] = useState<string>('30')
    const [newServicePrice, setNewServicePrice] = useState<string>('')

    // Upselling state for new service
    const [newUpsellEnabled, setNewUpsellEnabled] = useState(false)
    const [newUpsellDays, setNewUpsellDays] = useState<string>('7')
    const [newUpsellMessage, setNewUpsellMessage] = useState('')

    // Professional assignment state for service modal
    const [clinicProfessionals, setClinicProfessionals] = useState<any[]>([])
    const [assignedProfessionals, setAssignedProfessionals] = useState<Record<string, boolean>>({})
    const [primaryProfessional, setPrimaryProfessional] = useState<string>('')

    // Currency and templates
    const [currency, setCurrency] = useState('MXN')
    const [timezone, setTimezone] = useState('America/Mexico_City')
    const [templateSurvey, setTemplateSurvey] = useState('')
    const [templateReactivation, setTemplateReactivation] = useState('')
    const currencySymbols: Record<string, string> = {
        'MXN': '$',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CLP': '$',
        'ARS': '$',
        'COP': '$',
        'PEN': 'S/',
        'BRL': 'R$',
    }

    // Integration settings
    const [yCloudApiKey, setYCloudApiKey] = useState('')
    const [yCloudPhoneNumber, setYCloudPhoneNumber] = useState('')
    const [openaiModel] = useState('gpt-4o-mini')
    const [aiStrategy, setAiStrategy] = useState<'auto' | 'eco' | 'pro'>('auto')
    const [aiCreditsUsed, setAiCreditsUsed] = useState(0)
    const [aiCreditsLimit, setAiCreditsLimit] = useState(500)
    const [aiCreditsExtra, setAiCreditsExtra] = useState(0)
    
    // Legacy support for display (remaining metrics)
    
    const [aiAutoRespond, setAiAutoRespond] = useState(true)
    const [aiActiveModel, setAiActiveModel] = useState<'mini' | '4o'>('mini')
    const [savingAI, setSavingAI] = useState(false)
    const [aiSaved, setAiSaved] = useState(false)
    const [selectedAiModel] = useState<'mini' | '4o'>('mini') // For the purchase cards selector
    const [paymentRegion, setPaymentRegion] = useState<'chile' | 'international'>('chile')
    const [isSavingIntegrations, setIsSavingIntegrations] = useState(false)
    const [copiedWebhook, setCopiedWebhook] = useState(false)

    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

    // Webhook state
    interface WebhookConfig {
        id?: string
        name: string
        url: string
        events: string[]
        is_active: boolean
        secret: string
        last_triggered_at?: string | null
        last_status_code?: number | null
    }
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
    const [showWebhookModal, setShowWebhookModal] = useState(false)
    const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null)
    const [webhookForm, setWebhookForm] = useState<WebhookConfig>({
        name: '',
        url: '',
        events: [],
        is_active: true,
        secret: '',
    })
    const [savingWebhook, setSavingWebhook] = useState(false)
    const [testingWebhook, setTestingWebhook] = useState<string | null>(null)

    const WEBHOOK_EVENTS = [
        { value: 'appointment.created', label: 'Nueva cita creada' },
        { value: 'appointment.confirmed', label: 'Cita confirmada' },
        { value: 'appointment.cancelled', label: 'Cita cancelada' },
        { value: 'appointment.rescheduled', label: 'Cita reagendada' },
        { value: 'message.received', label: 'Mensaje recibido' },
        { value: 'message.sent', label: 'Mensaje enviado' },
        { value: 'patient.created', label: 'Nuevo paciente' },
        { value: 'patient.updated', label: 'Paciente actualizado' },
    ]

    // Notification preferences state
    const [notifPrefs, setNotifPrefs] = useState({
        new_appointment: true,
        confirmed: true,
        cancelled: true,
        pending_reminder: true,
        new_message: true,
        survey_response: true,
        ai_handoff: true
    })
    const [savingNotifications, setSavingNotifications] = useState(false)
    const [notificationsSaved, setNotificationsSaved] = useState(false)

    // Reminder settings state
    const [reminderSettings, setReminderSettings] = useState({
        reminder_24h_before: true,
        reminder_2h_before: true,
        reminder_1h_before: false,
        request_confirmation: true,
        confirmation_days_before: 1,
        preferred_hour: '09:00',
        template_24h: '',
        template_2h: '',
        template_1h: '',
        template_confirmation: '',
        template_followup: '',
        followup_enabled: false,
        followup_days_after: 7,
    })
    const [savingReminders, setSavingReminders] = useState(false)
    const [remindersSaved, setRemindersSaved] = useState(false)
    const [reminderLogs, setReminderLogs] = useState<any[]>([])
    const [isLoadingLogs, setIsLoadingLogs] = useState(false)

    // Clinic settings state
    const [savingClinic, setSavingClinic] = useState(false)
    const [clinicSaved, setClinicSaved] = useState(false)

    // Schedule settings state
    const [savingSchedule, setSavingSchedule] = useState(false)
    const [scheduleSaved, setScheduleSaved] = useState(false)

    // Blocked dates state
    const [blockedDates, setBlockedDates] = useState<any[]>([])
    const [loadingBlockedDates, setLoadingBlockedDates] = useState(false)
    const [newBlockedDate, setNewBlockedDate] = useState('')
    const [newBlockedReason, setNewBlockedReason] = useState('')
    const [isAddingBlockedDate, setIsAddingBlockedDate] = useState(false)

    // Profile settings state
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordSaved, setPasswordSaved] = useState(false)
    const [passwordError, setPasswordError] = useState('')

    // Subscription state
    const [subscription, setSubscription] = useState<{
        plan: string
        status: string
        trialEndsAt: string | null
        monthlyLimit: number
        monthlyUsed: number
    } | null>(null)

    // AI usage state - consolidated at top of component

    // Payment return message state
    const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error' | 'pending'; text: string } | null>(null)

    // Read tab from URL params (for deep linking) + handle payment returns
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        const paymentParam = searchParams.get('payment')

        if (paymentParam) {
            // User returned from MercadoPago checkout
            setActiveTab('subscription')
            switch (paymentParam) {
                case 'success':
                    setPaymentMessage({
                        type: 'success',
                        text: '¡Pago procesado exitosamente! Tu suscripción ha sido activada. Los cambios pueden demorar unos segundos en reflejarse.'
                    })
                    break
                case 'failure':
                    setPaymentMessage({
                        type: 'error',
                        text: 'El pago fue rechazado. Por favor intenta con otro método de pago o contacta a tu banco.'
                    })
                    break
                case 'pending':
                    setPaymentMessage({
                        type: 'pending',
                        text: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme. Esto puede demorar hasta 48 horas.'
                    })
                    break
            }
            // Clean URL params after reading
            const newUrl = window.location.pathname
            window.history.replaceState({}, '', newUrl)
        } else if (tabParam && ['profile', 'clinic', 'team', 'schedule', 'integrations', 'subscription', 'notifications', 'reminders', 'ai', 'tags'].includes(tabParam)) {
            setActiveTab(tabParam)
            if (window.innerWidth < 768) setShowMobileList(false)
        }
    }, [searchParams])

    // Load existing settings
    useEffect(() => {
        const fetchSettings = async () => {
            if (!profile?.clinic_id) return

            try {
                // Fetch notification preferences
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: notifData, error: notifError } = await (supabase as any)
                    .from('notification_preferences')
                    .select('*')
                    .eq('clinic_id', profile.clinic_id)
                    .single()

                if (notifError && notifError.code !== 'PGRST116') {
                    throw notifError
                }

                if (notifData) {
                    setNotifPrefs({
                        new_appointment: notifData.new_appointment,
                        confirmed: notifData.confirmed,
                        cancelled: notifData.cancelled,
                        pending_reminder: notifData.pending_reminder,
                        new_message: notifData.new_message,
                        survey_response: notifData.survey_response,
                        ai_handoff: notifData.ai_handoff !== undefined ? notifData.ai_handoff : true
                    })
                }

                // Fetch reminder settings
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: reminderData, error: reminderError } = await (supabase as any)
                    .from('reminder_settings')
                    .select('*')
                    .eq('clinic_id', profile.clinic_id)
                    .single()

                if (reminderError && reminderError.code !== 'PGRST116') {
                    throw reminderError
                }

                if (reminderData) {
                    setReminderSettings({
                        reminder_24h_before: reminderData.reminder_24h_before,
                        reminder_2h_before: reminderData.reminder_2h_before,
                        reminder_1h_before: reminderData.reminder_1h_before,
                        request_confirmation: reminderData.request_confirmation,
                        confirmation_days_before: reminderData.confirmation_days_before,
                        preferred_hour: reminderData.preferred_hour,
                        template_24h: reminderData.template_24h || '',
                        template_2h: reminderData.template_2h || '',
                        template_1h: reminderData.template_1h || '',
                        template_confirmation: reminderData.template_confirmation || '',
                        template_followup: reminderData.template_followup || '',
                        followup_enabled: reminderData.followup_enabled,
                        followup_days_after: reminderData.followup_days_after,
                    })
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (supabase as any)
                    .from('clinic_settings')
                    .select('*')
                    .eq('id', profile.clinic_id)
                    .single()

                if (error) {
                    // Ignore "Row not found" error (code PGRST116) as it just means no settings exist yet
                    if (error.code !== 'PGRST116') {
                        throw error
                    }
                }

                if (data) {
                    setClinicName(data.clinic_name)
                    setClinicAddress(data.clinic_address || '')
                    setAddressReferences(data.address_references || '')
                    setGoogleMapsUrl(data.google_maps_url || '')
                    setInstagramUrl(data.instagram_url || '')
                    setFacebookUrl(data.facebook_url || '')
                    setTiktokUrl(data.tiktok_url || '')
                    setWebsiteUrl(data.website_url || '')
                    setCurrency(data.currency || 'MXN')
                    setTimezone(data.timezone || 'America/Mexico_City')
                    setTemplateSurvey(data.template_survey || '')
                    setTemplateReactivation(data.template_reactivation || '')

                    setYCloudApiKey(data.ycloud_api_key || '')
                    setYCloudPhoneNumber(data.ycloud_phone_number || '')
                    
                    setAiActiveModel(data.ai_active_model || 'mini')
                    setAiStrategy(data.ai_strategy || 'auto')
                    setAiCreditsUsed(data.ai_credits_used || 0)
                    setAiCreditsLimit(data.ai_credits_limit || 500)
                    setAiCreditsExtra(data.ai_credits_extra || 0)

                    setAiAutoRespond(data.ai_auto_respond !== false) // default to true if undefined
                    setBusinessModel(data.business_model || 'physical')
                    setSpecialty(data.specialty || 'aesthetic')
                    setPaymentRegion(data.payment_provider === 'lemonsqueezy' ? 'international' : 'chile')
                    if (data.working_hours) setWorkingHours(data.working_hours)
                }

                // Fetch subscription data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: subData } = await (supabase as any)
                    .from('subscriptions')
                    .select('*')
                    .eq('clinic_id', profile.clinic_id)
                    .single()

                if (subData) {
                    setSubscription({
                        plan: subData.plan,
                        status: subData.status,
                        trialEndsAt: subData.trial_ends_at,
                        monthlyLimit: subData.monthly_appointments_limit,
                        monthlyUsed: subData.monthly_appointments_used || 0
                    })
                }
            } catch (error) {
                console.error('Error loading settings:', error)
            }

            // AI Usage is now tracked via unified credits (ai_credits_used)

            try {
                // Fetch services
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: servicesData, error: servicesError } = await (supabase as any).rpc('get_clinic_services_secure', {
                    p_clinic_id: profile.clinic_id
                })

                if (servicesError) {
                    console.error('Error fetching services:', servicesError)
                }

                if (servicesData) {
                    setServices(servicesData.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        duration: s.duration,
                        price: s.price,
                        upselling: {
                            enabled: s.upselling_enabled,
                            daysAfter: s.upselling_days_after || 0,
                            message: s.upselling_message || ''
                        }
                    })))
                } else {
                    console.warn('servicesData was empty or null')
                }
            } catch (error) {
                console.error('Error loading services:', error)
            }

            try {
                // Fetch clinic professionals for service assignment
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profData, error: profError } = await (supabase as any).rpc('get_clinic_professionals', {
                    p_clinic_id: profile.clinic_id
                })

                if (profError) {
                    console.error('Error fetching professionals:', profError)
                }

                if (profData) {
                    setClinicProfessionals(profData)
                }
            } catch (error) {
                console.error('Error loading professionals:', error)
            }

            // Fetch webhooks
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: webhooksData } = await (supabase as any)
                    .from('webhooks')
                    .select('*')
                    .eq('clinic_id', profile.clinic_id)
                    .order('created_at', { ascending: true })

                if (webhooksData) {
                    setWebhooks(webhooksData)
                }
            } catch (error) {
                console.error('Error loading webhooks:', error)
            }
        }

        fetchSettings()
    }, [profile?.clinic_id])

    // Fetch blocked dates when Schedule tab is active
    useEffect(() => {
        if (activeTab === 'schedule' && profile?.clinic_id) {
            fetchBlockedDates()
        }
    }, [activeTab, profile?.clinic_id])

    // Load reminder logs
    useEffect(() => {
        const fetchReminderLogs = async () => {
            if (!profile?.clinic_id || activeTab !== 'reminders') return

            setIsLoadingLogs(true)
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (supabase as any)
                    .from('reminder_logs')
                    .select('*, appointments(patient_name)')
                    .eq('clinic_id', profile.clinic_id)
                    .order('sent_at', { ascending: false })
                    .limit(20)

                if (error) throw error
                setReminderLogs(data || [])
            } catch (error) {
                console.error('Error fetching reminder logs:', error)
            } finally {
                setIsLoadingLogs(false)
            }
        }

        fetchReminderLogs()
    }, [activeTab, profile?.clinic_id])

    // Webhook URL for YCloud
    const webhookUrl = `${SUPABASE_URL}/functions/v1/ycloud-whatsapp-webhook`

    const copyWebhookUrl = async () => {
        await navigator.clipboard.writeText(webhookUrl)
        setCopiedWebhook(true)
        setTimeout(() => setCopiedWebhook(false), 2000)
    }

    const handleBuyCredits = async (packId: string) => {
        if (!profile?.clinic_id || !user?.email) return
        try {
            if (paymentRegion === 'international') {
                await redirectToLemonCreditsCheckout(profile.clinic_id, user.email, packId, selectedAiModel)
            } else {
                await redirectToCreditsCheckout(profile.clinic_id, user.email, packId, selectedAiModel)
            }
        } catch (error: any) {
            console.error('Error buying credits:', error)
            alert(error.message || 'Error al procesar el pago. Por favor intenta de nuevo.')
        }
    }

    const saveIntegrations = async () => {
        if (!profile?.clinic_id) return
        setIsSavingIntegrations(true)
        setSaveStatus('idle')
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({
                    ycloud_api_key: yCloudApiKey || null,
                    ycloud_phone_number: yCloudPhoneNumber || null,
                    openai_model: openaiModel,
                    ai_active_model: aiActiveModel,
                    ai_auto_respond: aiAutoRespond,
                    ai_strategy: aiStrategy,
                })
                .eq('id', profile.clinic_id)

            if (error) throw error
            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 3000)
        } catch (error) {
            console.error('Error saving integrations:', error)
            setSaveStatus('error')
            setTimeout(() => setSaveStatus('idle'), 3000)
        } finally {
            setIsSavingIntegrations(false)
        }
    }


    // Webhook CRUD
    const openWebhookModal = (webhook?: WebhookConfig) => {
        if (webhook) {
            setEditingWebhook(webhook)
            setWebhookForm({ ...webhook })
        } else {
            setEditingWebhook(null)
            setWebhookForm({ name: '', url: '', events: [], is_active: true, secret: '' })
        }
        setShowWebhookModal(true)
    }

    const closeWebhookModal = () => {
        setShowWebhookModal(false)
        setEditingWebhook(null)
        setWebhookForm({ name: '', url: '', events: [], is_active: true, secret: '' })
    }

    const handleSaveWebhook = async () => {
        if (!profile?.clinic_id || !webhookForm.url.trim() || !webhookForm.name.trim()) return
        setSavingWebhook(true)
        try {
            if (editingWebhook?.id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                    .from('webhooks')
                    .update({
                        name: webhookForm.name.trim(),
                        url: webhookForm.url.trim(),
                        events: webhookForm.events,
                        is_active: webhookForm.is_active,
                        secret: webhookForm.secret || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingWebhook.id)
                if (error) throw error
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                    .from('webhooks')
                    .insert({
                        clinic_id: profile.clinic_id,
                        name: webhookForm.name.trim(),
                        url: webhookForm.url.trim(),
                        events: webhookForm.events,
                        is_active: webhookForm.is_active,
                        secret: webhookForm.secret || null,
                    })
                if (error) throw error
            }
            closeWebhookModal()
            // Refresh webhooks
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any)
                .from('webhooks')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .order('created_at', { ascending: true })
            if (data) setWebhooks(data)
        } catch (error) {
            console.error('Error saving webhook:', error)
            alert('Error al guardar el webhook.')
        } finally {
            setSavingWebhook(false)
        }
    }

    const handleDeleteWebhook = async (id: string) => {
        if (!profile?.clinic_id) return
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from('webhooks').delete().eq('id', id)
            if (error) throw error
            setWebhooks(prev => prev.filter(w => w.id !== id))
        } catch (error) {
            console.error('Error deleting webhook:', error)
        }
    }

    const handleToggleWebhook = async (id: string, currentActive: boolean) => {
        if (!profile?.clinic_id) return
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('webhooks')
                .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
                .eq('id', id)
            if (error) throw error
            setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: !currentActive } : w))
        } catch (error) {
            console.error('Error toggling webhook:', error)
        }
    }

    const handleTestWebhook = async (webhook: WebhookConfig) => {
        if (!webhook.id) return
        setTestingWebhook(webhook.id)
        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}),
                },
                mode: 'no-cors',
                body: JSON.stringify({
                    event: 'test.ping',
                    timestamp: new Date().toISOString(),
                    data: { message: 'Test webhook from Citenly AI' },
                }),
            })
            // With no-cors we can't read status, so we just mark it as sent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('webhooks')
                .update({ last_triggered_at: new Date().toISOString(), last_status_code: response.status || 0 })
                .eq('id', webhook.id)
            setWebhooks(prev => prev.map(w => w.id === webhook.id
                ? { ...w, last_triggered_at: new Date().toISOString(), last_status_code: response.status || 0 }
                : w
            ))
            alert('✅ Webhook de prueba enviado correctamente.')
        } catch (error) {
            console.error('Error testing webhook:', error)
            alert('⚠️ No se pudo verificar la respuesta del webhook (puede ser un problema de CORS). El webhook podría haber sido recibido igualmente.')
        } finally {
            setTestingWebhook(null)
        }
    }

    const toggleWebhookEvent = (event: string) => {
        setWebhookForm(prev => ({
            ...prev,
            events: prev.events.includes(event)
                ? prev.events.filter(e => e !== event)
                : [...prev.events, event]
        }))
    }

    const handleSaveNotifications = async () => {
        if (!profile?.clinic_id) return

        setSavingNotifications(true)
        setNotificationsSaved(false)

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('notification_preferences')
                .upsert({
                    clinic_id: profile.clinic_id,
                    ...notifPrefs,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'clinic_id' })

            if (error) throw error

            setNotificationsSaved(true)
            setTimeout(() => setNotificationsSaved(false), 3000)
        } catch (error) {
            console.error('Error saving notification preferences:', error)
        } finally {
            setSavingNotifications(false)
        }
    }

    const handleSaveReminders = async () => {
        if (!profile?.clinic_id) return

        setSavingReminders(true)
        setRemindersSaved(false)

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('reminder_settings')
                .upsert({
                    clinic_id: profile.clinic_id,
                    ...reminderSettings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'clinic_id' })

            if (error) throw error

            setRemindersSaved(true)
            setTimeout(() => setRemindersSaved(false), 3000)
        } catch (error) {
            console.error('Error saving reminder settings:', error)
        } finally {
            setSavingReminders(false)
        }
    }

    const handleSaveAI = async () => {
        if (!profile?.clinic_id) return
        setSavingAI(true)
        setAiSaved(false)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({ 
                    ai_auto_respond: aiAutoRespond,
                    ai_strategy: aiStrategy,
                    ai_active_model: aiActiveModel, // Ensure model matches strategy if needed
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.clinic_id)

            if (error) throw error
            setAiSaved(true)
            setTimeout(() => setAiSaved(false), 3000)
        } catch (error) {
            console.error('Error saving AI settings:', error)
            alert('Error al guardar la configuración de IA')
        } finally {
            setSavingAI(false)
        }
    }

    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) {
            setPasswordError('Por favor ingresa y confirma tu nueva contraseña')
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Las contraseñas no coinciden')
            return
        }

        if (newPassword.length < 6) {
            setPasswordError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setSavingPassword(true)
        setPasswordError('')

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) throw error

            setPasswordSaved(true)
            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => setPasswordSaved(false), 3000)
        } catch (error) {
            console.error('Error updating password:', error)
            setPasswordError('Error al actualizar la contraseña. Inténtalo de nuevo.')
        } finally {
            setSavingPassword(false)
        }
    }

    const handleSaveClinic = async () => {
        setSavingClinic(true)
        setClinicSaved(false)

        if (!profile?.clinic_id) {
            setSavingClinic(false)
            return
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({
                    clinic_name: clinicName,
                    clinic_address: clinicAddress,
                    address_references: addressReferences,
                    google_maps_url: googleMapsUrl,
                    instagram_url: instagramUrl,
                    facebook_url: facebookUrl,
                    tiktok_url: tiktokUrl,
                    website_url: websiteUrl,
                    currency: currency,
                    timezone: timezone,
                    business_model: businessModel,
                    specialty: specialty,
                    template_survey: templateSurvey,
                    template_reactivation: templateReactivation,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.clinic_id)

            if (error) throw error

            // Refresh clinics context to update header
            await refreshClinics()

            setClinicSaved(true)
            setTimeout(() => setClinicSaved(false), 3000)
        } catch (error) {
            console.error('Error saving clinic settings:', error)
            alert('Error al guardar la configuración de la clínica')
        } finally {
            setSavingClinic(false)
        }
    }

    const handleSaveSchedule = async () => {
        if (!profile?.clinic_id) return
        setSavingSchedule(true)
        setScheduleSaved(false)

        try {
            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({
                    working_hours: workingHours,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.clinic_id)

            if (error) throw error
            setScheduleSaved(true)
            setTimeout(() => setScheduleSaved(false), 3000)
        } catch (error: any) {
            console.error('Error saving schedule:', error)
            alert('Error al guardar horarios: ' + (error.message || 'Intente nuevamente'))
        } finally {
            setSavingSchedule(false)
        }
    }

    const fetchBlockedDates = async () => {
        if (!profile?.clinic_id) return
        setLoadingBlockedDates(true)
        try {
            const { data, error } = await supabase
                .from('clinic_blocked_dates')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .gte('blocked_date', new Date().toISOString().split('T')[0])
                .order('blocked_date', { ascending: true })

            if (error) throw error
            setBlockedDates(data || [])
        } catch (error) {
            console.error('Error fetching blocked dates:', error)
        } finally {
            setLoadingBlockedDates(false)
        }
    }

    const handleAddBlockedDate = async () => {
        if (!profile?.clinic_id || !newBlockedDate) return
        setIsAddingBlockedDate(true)
        try {
            const { error } = await (supabase as any)
                .from('clinic_blocked_dates')
                .insert({
                    clinic_id: profile.clinic_id,
                    blocked_date: newBlockedDate,
                    reason: newBlockedReason
                })

            if (error) throw error
            setNewBlockedDate('')
            setNewBlockedReason('')
            fetchBlockedDates()
        } catch (error: any) {
            console.error('Error adding blocked date:', error)
            alert('Error al bloquear día: ' + (error.message || 'Intente nuevamente'))
        } finally {
            setIsAddingBlockedDate(false)
        }
    }

    const handleDeleteBlockedDate = async (id: string) => {
        try {
            const { error } = await supabase
                .from('clinic_blocked_dates')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchBlockedDates()
        } catch (error) {
            console.error('Error deleting blocked date:', error)
            alert('Error al eliminar bloqueo')
        }
    }

    const handlePlanSelection = async (planId: PlanId) => {
        console.log('handlePlanSelection called with:', planId)
        console.log('Profile:', profile)
        console.log('User:', user)

        // Validate clinic ID
        if (!profile?.clinic_id) {
            console.error('Missing clinic_id')
            alert('Error: No se encontró la información de la clínica. Por favor recarga la página.')
            return
        }

        // Validate user email
        if (!user?.email) {
            console.error('Missing email')
            alert('Error: No se encontró el email del usuario. Por favor recarga la página.')
            return
        }

        try {
            if (paymentRegion === 'international') {
                await redirectToLemonCheckout(profile.clinic_id, user.email, planId as LSPlanId)
            } else {
                await redirectToCheckout({
                    clinicId: profile.clinic_id,
                    planId: planId as "essence" | "radiance" | "prestige",
                    email: user.email,
                })
            }
        } catch (error) {
            console.error('Checkout error:', error)
            alert('Error al iniciar el proceso de pago. Por favor intenta más tarde.')
        }
    }

    const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

    const handleEditService = async (service: any) => {
        setEditingServiceId(service.id)
        setNewServiceName(service.name)
        setNewServiceDuration(service.duration.toString())
        setNewServicePrice(service.price.toString())
        setNewUpsellEnabled(service.upselling?.enabled || false)
        setNewUpsellDays(service.upselling?.daysAfter?.toString() || '7')
        setNewUpsellMessage(service.upselling?.message || '')
        setShowServiceModal(true)

        // Load assigned professionals for this service
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any)
                .from('service_professionals')
                .select('member_id, is_primary')
                .eq('service_id', service.id)
            if (data) {
                const assigned: Record<string, boolean> = {}
                let primary = ''
                data.forEach((sp: any) => {
                    assigned[sp.member_id] = true
                    if (sp.is_primary) primary = sp.member_id
                })
                setAssignedProfessionals(assigned)
                setPrimaryProfessional(primary)
            }
        } catch (err) {
            console.error('Error loading service professionals:', err)
        }
    }

    const handleSaveService = async () => {
        if (!newServiceName.trim() || !profile?.clinic_id) return

        try {
            const serviceData = {
                clinic_id: profile.clinic_id,
                name: newServiceName.trim(),
                duration: parseInt(newServiceDuration) || 0,
                price: parseFloat(newServicePrice) || 0,
                upselling_enabled: newUpsellEnabled,
                upselling_days_after: parseInt(newUpsellDays) || 0,
                upselling_message: newUpsellMessage
            }

            let savedServiceId = editingServiceId

            if (editingServiceId) {
                // Update existing service
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                    .from('services')
                    .update(serviceData)
                    .eq('id', editingServiceId)

                if (error) throw error

                setServices(services.map(s => s.id === editingServiceId ? {
                    id: editingServiceId,
                    name: serviceData.name,
                    duration: serviceData.duration,
                    price: serviceData.price,
                    upselling: {
                        enabled: serviceData.upselling_enabled,
                        daysAfter: serviceData.upselling_days_after,
                        message: serviceData.upselling_message
                    }
                } : s))
            } else {
                // Insert new service
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (supabase as any)
                    .from('services')
                    .insert(serviceData)
                    .select()
                    .single()

                if (error) throw error

                savedServiceId = data.id

                setServices([...services, {
                    id: data.id,
                    name: data.name,
                    duration: data.duration,
                    price: data.price,
                    upselling: {
                        enabled: data.upselling_enabled,
                        daysAfter: data.upselling_days_after || 0,
                        message: data.upselling_message || ''
                    }
                }])
            }

            // Save professional assignments before resetting state
            if (savedServiceId) {
                try {
                    // Delete existing assignments
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (supabase as any)
                        .from('service_professionals')
                        .delete()
                        .eq('service_id', savedServiceId)

                    // Insert new assignments
                    const assignments = Object.entries(assignedProfessionals)
                        .filter(([, isAssigned]) => isAssigned)
                        .map(([memberId]) => ({
                            service_id: savedServiceId,
                            member_id: memberId,
                            is_primary: memberId === primaryProfessional
                        }))

                    if (assignments.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await (supabase as any)
                            .from('service_professionals')
                            .insert(assignments)
                    }
                } catch (err) {
                    console.error('Error saving professional assignments:', err)
                }
            }

            // Reset form
            setNewServiceName('')
            setNewServiceDuration('30')
            setNewServicePrice('')
            setNewUpsellEnabled(false)
            setNewUpsellDays('7')
            setNewUpsellMessage('')
            setAssignedProfessionals({})
            setPrimaryProfessional('')
            setEditingServiceId(null)
            setShowServiceModal(false)

        } catch (error) {
            console.error('Error saving service:', error)
            alert('Error al guardar el servicio')
        }
    }

    const handleDeleteService = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('services')
                .delete()
                .eq('id', id)

            if (error) throw error

            setServices(services.filter(s => s.id !== id))
        } catch (error) {
            console.error('Error deleting service:', error)
            alert('Error al eliminar el servicio')
        }
    }

    return (
        <div className="animate-fade-in relative min-h-[calc(100vh-7rem)] p-4 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">

                {/* Mobile Content Header (Back Button) */}
                {!showMobileList && (
                    <div className="md:hidden flex items-center gap-3 p-4 bg-primary-theme rounded-soft border border-theme">
                        <button
                            onClick={() => setShowMobileList(true)}
                            className="p-1.5 -ml-1 text-secondary-theme hover:text-primary-theme hover:bg-secondary-theme rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-semibold text-primary-theme">
                            {availableTabs.find(t => t.id === activeTab)?.label}
                        </h2>
                    </div>
                )}

                {/* Sidebar Navigation */}
                <div className={cn(
                    "w-full md:w-64 flex-shrink-0",
                    !showMobileList && "hidden md:block" // hide on mobile if viewing content
                )}>
                    <div className="card-premium p-2">
                        {availableTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    if (window.innerWidth < 768) setShowMobileList(false)
                                }}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-3 rounded-soft text-left transition-colors',
                                    activeTab === tab.id && !showMobileList
                                        ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold border border-[var(--accent-primary)]/20'
                                        : 'text-secondary-theme hover:bg-secondary-theme hover:text-primary-theme'
                                )}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                                <ChevronRight
                                    className={cn(
                                        'w-4 h-4 ml-auto transition-transform',
                                        activeTab === tab.id && !showMobileList && 'rotate-90 hidden md:block'
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className={cn(
                    "flex-1",
                    showMobileList && "hidden md:block" // hide content on mobile if showing list
                )}>
                    {/* Profile Settings */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
                            <MyProfile />

                            <div className="card-premium p-6 space-y-4 max-w-3xl w-full">
                                <h3 className="font-medium text-primary-theme">Seguridad</h3>
                                <div className="space-y-4 w-full">
                                    <div className="w-full">
                                        <label className="block text-sm font-medium text-primary-theme mb-2">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="input-premium w-full max-w-md"
                                            placeholder="Ingresa tu nueva contraseña"
                                        />
                                    </div>
                                    <div className="w-full">
                                        <label className="block text-sm font-medium text-primary-theme mb-2">Confirmar Contraseña</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="input-premium w-full max-w-md"
                                            placeholder="Repite tu nueva contraseña"
                                        />
                                    </div>

                                    {passwordError && (
                                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-soft">
                                            <AlertCircle className="w-4 h-4" />
                                            {passwordError}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 pt-2">
                                        <button
                                            onClick={handleUpdatePassword}
                                            disabled={savingPassword || !newPassword}
                                            className="btn-premium-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {savingPassword ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                            ) : (
                                                <><Key className="w-4 h-4" /> Actualizar Contraseña</>
                                            )}
                                        </button>
                                        {passwordSaved && (
                                            <div className="flex items-center gap-2 text-emerald-600 text-sm animate-fade-in bg-emerald-50 px-4 py-2 rounded-soft">
                                                <CheckCircle2 className="w-4 h-4" />
                                                ¡Contraseña actualizada!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                    {/* Clinic Settings */}
                    {activeTab === 'clinic' && (
                        <div className="space-y-6">
                            <div className="card-premium p-6">
                                <h2 className="text-lg font-semibold text-primary-theme mb-6">Información de la Clínica</h2>

                                <div className="bg-secondary-theme p-4 rounded-soft border border-theme mb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center">
                                            {businessModel === 'physical' ? <Building2 className="w-5 h-5 text-primary-600" /> : businessModel === 'mobile' ? <Zap className="w-5 h-5 text-primary-600" /> : <RefreshCw className="w-5 h-5 text-primary-600" />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-primary-theme leading-none mb-1">Modelo de Atención</h3>
                                            <p className="text-xs text-primary-theme/50">Define cómo opera tu clínica para optimizar al asistente IA</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setBusinessModel('physical')}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-3 rounded-soft border transition-all",
                                                businessModel === 'physical' 
                                                    ? "bg-primary-theme border-[#FF2E88] shadow-sm ring-1 ring-[#FF2E88]" 
                                                    : "bg-secondary-theme border-theme hover:border-[#FF2E88]/30"
                                            )}
                                        >
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", businessModel === 'physical' ? "bg-[#FF2E88] text-white" : "bg-secondary-theme text-primary-theme/40")}>
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div className="text-center">
                                                <p className={cn("text-[11px] font-bold", businessModel === 'physical' ? "text-[#FF2E88]" : "text-primary-theme")}>Físico</p>
                                                <p className="text-[9px] text-primary-theme/40">Local Fijo</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setBusinessModel('mobile')}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-3 rounded-soft border transition-all",
                                                businessModel === 'mobile' 
                                                    ? "bg-primary-theme border-[#FF2E88] shadow-sm ring-1 ring-[#FF2E88]" 
                                                    : "bg-secondary-theme border-theme hover:border-[#FF2E88]/30"
                                            )}
                                        >
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", businessModel === 'mobile' ? "bg-[#FF2E88] text-white" : "bg-secondary-theme text-primary-theme/40")}>
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div className="text-center">
                                                <p className={cn("text-[11px] font-bold", businessModel === 'mobile' ? "text-[#FF2E88]" : "text-primary-theme")}>Móvil</p>
                                                <p className="text-[9px] text-primary-theme/40">A Domicilio</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setBusinessModel('hybrid')}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-3 rounded-soft border transition-all",
                                                businessModel === 'hybrid' 
                                                    ? "bg-primary-theme border-[#FF2E88] shadow-sm ring-1 ring-[#FF2E88]" 
                                                    : "bg-secondary-theme border-theme hover:border-[#FF2E88]/30"
                                            )}
                                        >
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", businessModel === 'hybrid' ? "bg-[#FF2E88] text-white" : "bg-secondary-theme text-primary-theme/40")}>
                                                <RefreshCw className="w-4 h-4" />
                                            </div>
                                            <div className="text-center">
                                                <p className={cn("text-[11px] font-bold", businessModel === 'hybrid' ? "text-[#FF2E88]" : "text-primary-theme")}>Híbrido</p>
                                                <p className="text-[9px] text-primary-theme/40">Ambos</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">
                                            Especialidad de la Clínica
                                        </label>
                                        <select
                                            value={specialty}
                                            onChange={(e) => setSpecialty(e.target.value as any)}
                                            className="input-premium"
                                        >
                                            <option value="aesthetic">🎀 Estética y Bienestar</option>
                                            <option value="dental">🦷 Odontología / Dental</option>
                                            <option value="general">🏥 Medicina General / Otros</option>
                                        </select>
                                        <p className="text-xs text-primary-theme/40 mt-1">
                                            Ajusta la interfaz y las herramientas según tu rubro
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">
                                            Nombre de la Clínica
                                        </label>
                                        <input
                                            type="text"
                                            value={clinicName}
                                            onChange={(e) => setClinicName(e.target.value)}
                                            className="input-premium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">
                                            Dirección del Establecimiento
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Av. Principal 123, Col. Centro, Ciudad"
                                            value={clinicAddress}
                                            onChange={(e) => setClinicAddress(e.target.value)}
                                            className="input-premium"
                                        />
                                        <p className="text-xs text-primary-theme/40 mt-1">
                                            Esta dirección será utilizada por el asistente IA para informar a los clientes
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">
                                            Referencias de la Dirección
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: A un costado de la farmacia, frente al parque..."
                                            value={addressReferences}
                                            onChange={(e) => setAddressReferences(e.target.value)}
                                            className="input-premium"
                                        />
                                        <p className="text-xs text-primary-theme/40 mt-1">
                                            Ayuda a tus clientes a llegar más fácilmente
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">
                                            Enlace de Google Maps
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://goo.gl/maps/..."
                                            value={googleMapsUrl}
                                            onChange={(e) => setGoogleMapsUrl(e.target.value)}
                                            className="input-premium"
                                        />
                                        <p className="text-xs text-primary-theme/40 mt-1">
                                            El enlace directo para que abran el mapa en su celular
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-medium text-primary-theme mb-2">
                                                <Instagram className="w-4 h-4 text-pink-600" />
                                                Instagram
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://instagram.com/..."
                                                value={instagramUrl}
                                                onChange={(e) => setInstagramUrl(e.target.value)}
                                                className="input-premium"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-medium text-primary-theme mb-2">
                                                <Facebook className="w-4 h-4 text-blue-600" />
                                                Facebook
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://facebook.com/..."
                                                value={facebookUrl}
                                                onChange={(e) => setFacebookUrl(e.target.value)}
                                                className="input-premium"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-medium text-primary-theme mb-2">
                                                <Music className="w-4 h-4 text-primary-theme/60" />
                                                TikTok
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://tiktok.com/@..."
                                                value={tiktokUrl}
                                                onChange={(e) => setTiktokUrl(e.target.value)}
                                                className="input-premium"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-medium text-primary-theme mb-2">
                                                <Globe className="w-4 h-4 text-primary-theme/60" />
                                                Sitio Web
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://www.tuclinica.com"
                                                value={websiteUrl}
                                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                                className="input-premium"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">
                                            Zona Horaria
                                        </label>
                                        <select
                                            value={timezone}
                                            onChange={(e) => setTimezone(e.target.value)}
                                            className="input-premium"
                                        >
                                            <optgroup label="🌎 América">
                                                <option value="America/New_York">Nueva York (GMT-5)</option>
                                                <option value="America/Chicago">Chicago (GMT-6)</option>
                                                <option value="America/Denver">Denver (GMT-7)</option>
                                                <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                                                <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                                                <option value="America/Tijuana">Tijuana (GMT-8)</option>
                                                <option value="America/Cancun">Cancún (GMT-5)</option>
                                                <option value="America/Bogota">Bogotá (GMT-5)</option>
                                                <option value="America/Lima">Lima (GMT-5)</option>
                                                <option value="America/Santiago">Santiago de Chile (GMT-3)</option>
                                                <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
                                                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                                                <option value="America/Caracas">Caracas (GMT-4)</option>
                                            </optgroup>
                                            <optgroup label="🌍 Europa">
                                                <option value="Europe/London">Londres (GMT+0)</option>
                                                <option value="Europe/Paris">París (GMT+1)</option>
                                                <option value="Europe/Madrid">Madrid (GMT+1)</option>
                                                <option value="Europe/Berlin">Berlín (GMT+1)</option>
                                                <option value="Europe/Rome">Roma (GMT+1)</option>
                                                <option value="Europe/Amsterdam">Ámsterdam (GMT+1)</option>
                                                <option value="Europe/Moscow">Moscú (GMT+3)</option>
                                            </optgroup>
                                            <optgroup label="🌏 Asia">
                                                <option value="Asia/Dubai">Dubái (GMT+4)</option>
                                                <option value="Asia/Kolkata">India (GMT+5:30)</option>
                                                <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
                                                <option value="Asia/Singapore">Singapur (GMT+8)</option>
                                                <option value="Asia/Hong_Kong">Hong Kong (GMT+8)</option>
                                                <option value="Asia/Shanghai">Shanghái (GMT+8)</option>
                                                <option value="Asia/Tokyo">Tokio (GMT+9)</option>
                                                <option value="Asia/Seoul">Seúl (GMT+9)</option>
                                            </optgroup>
                                            <optgroup label="🌍 África">
                                                <option value="Africa/Johannesburg">Johannesburgo (GMT+2)</option>
                                                <option value="Africa/Cairo">El Cairo (GMT+2)</option>
                                                <option value="Africa/Lagos">Lagos (GMT+1)</option>
                                            </optgroup>
                                            <optgroup label="🌏 Oceanía">
                                                <option value="Australia/Sydney">Sídney (GMT+11)</option>
                                                <option value="Australia/Melbourne">Melbourne (GMT+11)</option>
                                                <option value="Pacific/Auckland">Auckland (GMT+13)</option>
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">
                                            Moneda
                                        </label>
                                        <select
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="input-premium"
                                        >
                                            <optgroup label="🌎 América">
                                                <option value="USD">🇺🇸 USD - Dólar estadounidense</option>
                                                <option value="MXN">🇲🇽 MXN - Peso mexicano</option>
                                                <option value="CLP">🇨🇱 CLP - Peso chileno</option>
                                                <option value="ARS">🇦🇷 ARS - Peso argentino</option>
                                                <option value="COP">🇨🇴 COP - Peso colombiano</option>
                                                <option value="PEN">🇵🇪 PEN - Sol peruano</option>
                                                <option value="BRL">🇧🇷 BRL - Real brasileño</option>
                                            </optgroup>
                                            <optgroup label="🌍 Europa">
                                                <option value="EUR">🇪🇺 EUR - Euro</option>
                                                <option value="GBP">🇬🇧 GBP - Libra esterlina</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-theme flex items-center gap-4">
                                    <button
                                        onClick={handleSaveClinic}
                                        disabled={savingClinic}
                                        className="btn-premium-primary flex items-center gap-2"
                                    >
                                        {savingClinic ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                        ) : (
                                            <><Save className="w-4 h-4" /> Guardar Cambios</>
                                        )}
                                    </button>
                                    {clinicSaved && (
                                        <div className="flex items-center gap-2 text-[#FF2E88] text-sm animate-fade-in bg-[#FF2E88]/10 px-4 py-2 rounded-soft border border-[#FF2E88]/20">
                                            <CheckCircle2 className="w-4 h-4" />
                                            ¡Cambios guardados!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Clinic Templates - Independent Card */}
                            <div className="card-premium p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF2E88] to-[#FF4DA6] rounded-soft flex items-center justify-center shadow-lg shadow-[#FF2E88]/20">
                                        <MessageSquare className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-primary-theme">Plantillas de la Clínica</h2>
                                        <p className="text-sm text-primary-theme/50">Configura los mensajes automáticos que se envían a tus pacientes</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="p-4 bg-secondary-theme/50 rounded-soft border border-theme">
                                        <TemplateSelector
                                            label="Plantilla: Encuesta de Satisfacción"
                                            description="Se envía automáticamente horas después de que finaliza la cita."
                                            value={templateSurvey}
                                            onChange={setTemplateSurvey}
                                        />
                                    </div>

                                    <div className="p-4 bg-secondary-theme/50 rounded-soft border border-theme">
                                        <TemplateSelector
                                            label="Plantilla: Reactivación de Pacientes"
                                            description="Se envía a pacientes que no han visitado en meses para ofrecer un nuevo servicio y recuperar la relación."
                                            value={templateReactivation}
                                            onChange={setTemplateReactivation}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Services */}
                            <div className="card-premium p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-primary-theme">Servicios</h2>
                                    <button
                                        onClick={() => {
                                            setAssignedProfessionals({})
                                            setPrimaryProfessional('')
                                            setShowServiceModal(true)
                                        }}
                                        className="btn-premium-secondary flex items-center gap-2 text-primary-500"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar Servicio
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {services.map((service) => (
                                        <div
                                            key={service.id}
                                            className="flex items-center gap-4 p-4 bg-secondary-theme rounded-soft"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-primary-theme">{service.name}</p>
                                                <p className="text-sm text-primary-theme/50">
                                                    {service.duration} minutos · {currencySymbols[currency]}{service.price.toLocaleString()} {currency}
                                                </p>
                                                {service.upselling?.enabled && (
                                                    <p className="text-xs text-primary-500 mt-1 flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        Upselling: {service.upselling.daysAfter} días después
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditService(service)}
                                                    className="p-2 text-primary-theme/40 hover:text-primary-500 hover:bg-primary-50 rounded-soft transition-colors"
                                                    title="Editar servicio"
                                                >
                                                    <CreditCard className="w-4 h-4" /> {/* Using generic icon, maybe Edit/Pencil is better but relying on import */}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteService(service.id)}
                                                    className="p-2 text-primary-theme/40 hover:text-red-500 hover:bg-red-50 rounded-soft transition-colors"
                                                    title="Eliminar servicio"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {services.length === 0 && (
                                        <p className="text-center text-primary-theme/50 py-8">No hay servicios configurados. Agrega tu primer servicio.</p>
                                    )}
                                </div>
                            </div>

                            {/* Add/Edit Service Modal */}
                            {showServiceModal && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                                    <div className="bg-primary-theme rounded-soft p-6 w-full max-w-md shadow-xl border border-theme">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-semibold text-primary-theme">{editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
                                            <button
                                                onClick={() => {
                                                    setShowServiceModal(false);
                                                    setEditingServiceId(null);
                                                    setNewServiceName('');
                                                    setNewServiceDuration('30');
                                                    setNewServicePrice('');
                                                    setNewUpsellEnabled(false);
                                                    setNewUpsellDays('7');
                                                    setNewUpsellMessage('');
                                                }}
                                                className="p-2 hover:bg-secondary-theme rounded-soft transition-colors"
                                            >
                                                <X className="w-5 h-5 text-primary-theme/60" />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-primary-theme mb-2">Nombre del Servicio</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Limpieza Facial Profunda"
                                                    value={newServiceName}
                                                    onChange={(e) => setNewServiceName(e.target.value)}
                                                    className="input-premium"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-primary-theme mb-2">Duración (min)</label>
                                                    <input
                                                        type="number"
                                                        min="5"
                                                        step="5"
                                                        value={newServiceDuration}
                                                        onChange={(e) => setNewServiceDuration(e.target.value)}
                                                        className="input-premium"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-primary-theme mb-2">Precio ({currency})</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={newServicePrice}
                                                        onChange={(e) => setNewServicePrice(e.target.value)}
                                                        className="input-premium"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Upselling Section */}
                                        <div className="border-t border-theme pt-4 mt-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <p className="text-sm font-medium text-primary-theme flex items-center gap-2">
                                                        <Zap className="w-4 h-4 text-primary-500" />
                                                        Upselling Automático
                                                    </p>
                                                    <p className="text-xs text-primary-theme/50">Mensaje de seguimiento post-tratamiento</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewUpsellEnabled(!newUpsellEnabled)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newUpsellEnabled ? 'bg-primary-500' : 'bg-charcoal/20'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newUpsellEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>

                                            {newUpsellEnabled && (
                                                <div className="space-y-3 animate-fade-in">
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary-theme mb-2">Días después del tratamiento</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="365"
                                                            value={newUpsellDays}
                                                            onChange={(e) => setNewUpsellDays(e.target.value)}
                                                            className="input-premium"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary-theme mb-2">Mensaje de seguimiento</label>
                                                        <textarea
                                                            placeholder="Ej: ¿Te gustaría agendar tu próxima sesión? Los mejores resultados se obtienen con tratamientos periódicos."
                                                            value={newUpsellMessage}
                                                            onChange={(e) => setNewUpsellMessage(e.target.value)}
                                                            rows={3}
                                                            className="input-premium resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Professional Assignment Section */}
                                        {clinicProfessionals.length > 0 && (
                                            <div className="border-t border-theme pt-4 mt-4">
                                                <p className="text-sm font-medium text-primary-theme flex items-center gap-2 mb-3">
                                                    <Users className="w-4 h-4 text-primary-500" />
                                                    Profesionales Asignados
                                                </p>
                                                <p className="text-xs text-primary-theme/50 mb-3">Selecciona quién realiza este servicio. Marca ⭐ al profesional principal.</p>
                                                <div className="space-y-2">
                                                    {clinicProfessionals.map((prof: any) => {
                                                        const isAssigned = assignedProfessionals[prof.member_id] || false
                                                        const isPrimary = primaryProfessional === prof.member_id
                                                        return (
                                                            <div
                                                                key={prof.member_id}
                                                                className={cn(
                                                                    "flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer",
                                                                    isAssigned ? "bg-primary-50 border border-primary-200" : "bg-gray-50 border border-transparent hover:border-gray-200"
                                                                )}
                                                                onClick={() => {
                                                                    setAssignedProfessionals(prev => ({
                                                                        ...prev,
                                                                        [prof.member_id]: !prev[prof.member_id]
                                                                    }))
                                                                    // Clear primary if unassigning
                                                                    if (isAssigned && isPrimary) {
                                                                        setPrimaryProfessional('')
                                                                    }
                                                                }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAssigned}
                                                                    readOnly
                                                                    className="accent-primary-500 w-4 h-4 pointer-events-none"
                                                                />
                                                                <div
                                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: prof.color || '#8B5CF6' }}
                                                                />
                                                                <span className={cn("text-sm flex-1", isAssigned ? "text-primary-theme font-medium" : "text-primary-theme/60")}>
                                                                    {prof.first_name || ''} {prof.last_name || ''}
                                                                    {prof.job_title ? ` · ${prof.job_title}` : ''}
                                                                </span>
                                                                {isAssigned && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setPrimaryProfessional(isPrimary ? '' : prof.member_id)
                                                                        }}
                                                                        className={cn(
                                                                            "text-sm transition-colors",
                                                                            isPrimary ? "text-amber-500" : "text-primary-theme/20 hover:text-amber-400"
                                                                        )}
                                                                        title={isPrimary ? 'Profesional principal' : 'Marcar como principal'}
                                                                    >
                                                                        ⭐
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-3 mt-6">
                                            <button
                                                onClick={() => {
                                                    setShowServiceModal(false);
                                                    setEditingServiceId(null);
                                                    setNewServiceName(''); // Reset form
                                                }}
                                                className="btn-premium-secondary flex-1"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleSaveService}
                                                disabled={!newServiceName.trim()}
                                                className="btn-premium-primary flex-1"
                                            >
                                                {editingServiceId ? 'Guardar Cambios' : 'Agregar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Subscription Settings */}
                    {activeTab === 'subscription' && (
                        <div className="space-y-6">
                            {/* Payment Return Message */}
                            {paymentMessage && (
                                <div className={`p-4 rounded-soft flex items-center gap-3 animate-fade-in ${paymentMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                                    paymentMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                                        'bg-amber-50 border border-amber-200 text-amber-800'
                                    }`}>
                                    {paymentMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> :
                                        paymentMessage.type === 'error' ? <CreditCard className="w-5 h-5 flex-shrink-0" /> :
                                            <Clock className="w-5 h-5 flex-shrink-0" />}
                                    <p className="text-sm font-bold">{paymentMessage.text}</p>
                                    <button onClick={() => setPaymentMessage(null)} className="ml-auto p-1 hover:opacity-70">✕</button>
                                </div>
                            )}

                            <div className="card-premium p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary-100 rounded-soft flex items-center justify-center">
                                            <CreditCard className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-primary-theme">Tu Suscripción</h2>
                                            <p className="text-sm text-primary-theme/50">Gestiona tu plan y facturación</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                        subscription?.status === 'trial' ? 'bg-amber-100 text-amber-700' :
                                        subscription?.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-charcoal/10 text-primary-theme/60'
                                    )}>
                                        {subscription?.status === 'trial' ? 'En Prueba' :
                                         subscription?.status === 'active' ? 'Plan Activo' : 'Inactivo'}
                                    </div>
                                </div>

                                <div className="bg-secondary-theme border border-theme rounded-soft p-6 mb-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <p className="text-xs font-bold text-primary-theme/40 uppercase tracking-widest mb-1">Plan Actual</p>
                                            <h3 className="text-3xl font-black text-primary-theme capitalize tracking-tight">
                                                Plan {subscription?.plan || 'Essence (Trial)'}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Sparkles className="w-4 h-4 text-primary-500" />
                                                <p className="text-sm font-medium text-primary-theme/70">
                                                    {subscription?.plan === 'essence' ? 'Control Esencial y Automatización' :
                                                     subscription?.plan === 'radiance' ? 'Escalamiento Profesional y Retención' :
                                                     subscription?.plan === 'prestige' ? 'Potencia Empresarial Multi-Sede' :
                                                     'Prueba gratuita - 7 días de acceso total'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-primary-theme">
                                                {paymentRegion === 'international' ? 'US$' : '$'}
                                                {subscription?.plan && subscription.plan !== 'trial' 
                                                    ? (paymentRegion === 'international' 
                                                        ? LS_PLANS[subscription.plan as LSPlanId]?.price
                                                        : PLANS[subscription.plan as PlanId]?.price)
                                                    : '0'}
                                                <span className="text-sm font-medium text-primary-theme/40 ml-1">
                                                    {paymentRegion === 'international' ? 'USD' : 'CLP'} / mes
                                                </span>
                                            </p>
                                            {subscription?.trialEndsAt && (
                                                <div className="mt-2 flex items-center justify-end gap-2 text-amber-600">
                                                    <Clock className="w-4 h-4" />
                                                    <p className="text-xs font-bold">
                                                        Termina en {Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} días
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    {subscription?.status === 'trial' && (
                                        <button 
                                            onClick={() => document.getElementById('compare-plans')?.scrollIntoView({ behavior: 'smooth' })}
                                            className="btn-premium-primary"
                                        >
                                            Activar Plan Premium
                                        </button>
                                    )}
                                    <a 
                                        href="https://www.mercadopago.com.mx/subscriptions" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn-premium-secondary"
                                    >
                                        Gestionar en Mercado Pago
                                    </a>
                                </div>
                            </div>

                             {/* Plan Cards */}
                            <div id="compare-plans" className="space-y-10 py-10">
                                <div className="text-center space-y-4 mb-12">
                                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/20 shadow-sm animate-bounce">
                                        <Sparkles className="w-4 h-4" />
                                        Más de 50 clínicas ya están automatizando sus citas
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-primary-theme tracking-tighter leading-none">
                                        Deja de perder citas todos los días.<br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2E88] to-[#FF4DA6]">
                                            Empieza a convertirlas automáticamente.
                                        </span>
                                    </h2>
                                    <p className="text-lg text-primary-theme/60 font-medium max-w-2xl mx-auto">
                                        Elige el sistema según el nivel de crecimiento de tu clínica.<br />
                                        Todos incluyen implementación guiada + prueba sin riesgo.
                                    </p>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-center gap-4 px-2 mb-8">

                                    <div className="flex items-center gap-3 bg-secondary-theme p-1.5 rounded-soft border border-theme shadow-sm">
                                        <button
                                            onClick={async () => {
                                                setPaymentRegion('chile');
                                                if (profile?.clinic_id) {
                                                    await (supabase as any).from('clinic_settings').update({ payment_provider: 'mercadopago' }).eq('id', profile.clinic_id);
                                                }
                                            }}
                                            className={cn(
                                                "px-4 py-2 rounded-soft text-xs font-bold transition-all flex items-center gap-2",
                                                paymentRegion === 'chile'
                                                    ? "bg-white text-primary-theme shadow-sm"
                                                    : "text-primary-theme/40 hover:text-primary-theme/60"
                                            )}
                                        >
                                            🇨🇱 Chile (CLP)
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setPaymentRegion('international');
                                                if (profile?.clinic_id) {
                                                    await (supabase as any).from('clinic_settings').update({ payment_provider: 'lemonsqueezy' }).eq('id', profile.clinic_id);
                                                }
                                            }}
                                            className={cn(
                                                "px-4 py-2 rounded-soft text-xs font-bold transition-all flex items-center gap-2",
                                                paymentRegion === 'international'
                                                    ? "bg-white text-primary-theme shadow-sm"
                                                    : "text-primary-theme/40 hover:text-primary-theme/60"
                                            )}
                                        >
                                            🌎 Internacional (USD)
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {(Object.keys(PLANS) as PlanId[]).map((planId) => {
                                        const mpPlan = PLANS[planId]
                                        const lsPlan = LS_PLANS[planId as LSPlanId]
                                        const plan = paymentRegion === 'international' ? lsPlan : mpPlan
                                        const price = plan.price
                                        const currencySymbol = paymentRegion === 'international' ? 'US$' : '$'
                                        const currencyCode = paymentRegion === 'international' ? 'USD' : 'CLP'
                                        const isCurrentPlan = planId === subscription?.plan
                                        const isRadiance = planId === 'radiance'

                                        return (
                                            <div 
                                                key={planId.toString()}
                                                className={cn(
                                                    "relative flex flex-col p-8 rounded-[2rem] border-2 transition-all duration-500",
                                                    isCurrentPlan ? "border-[#FF2E88] bg-[#FF2E88]/5 ring-8 ring-[#FF2E88]/5" : "border-theme bg-secondary-theme hover:border-[#FF2E88]/30 hover:shadow-2xl hover:-translate-y-1",
                                                    isRadiance && !isCurrentPlan && "md:scale-105 shadow-[0_20px_50px_rgba(255,46,136,0.15)] border-[#FF2E88] z-10 bg-white dark:bg-charcoal"
                                                )}
                                            >
                                                {isRadiance && (
                                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF2E88] to-[#FF4DA6] text-white text-[11px] font-black px-6 py-2 rounded-full shadow-xl uppercase tracking-[0.2em] whitespace-nowrap z-20">
                                                        Más Popular
                                                    </div>
                                                )}

                                                <div className="mb-8">
                                                    <div className={cn(
                                                        "w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4",
                                                        planId === 'essence' ? "bg-emerald-100 text-emerald-700" :
                                                        planId === 'radiance' ? "bg-purple-100 text-purple-700" :
                                                        "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {planId === 'essence' ? 'Para clínicas que quieren dejar de perder clientas' :
                                                         planId === 'radiance' ? 'Para clínicas que quieren crecer en serio' :
                                                         'Para clínicas que quieren operar como negocio serio'}
                                                    </div>
                                                    <h3 className="text-3xl font-black text-primary-theme uppercase tracking-tighter mb-1">{plan.name}</h3>
                                                    <p className="text-sm font-bold text-[#FF2E88] leading-tight mb-4">{plan.promise}</p>
                                                    
                                                    <div className="flex items-baseline gap-1 pt-4 border-t border-theme">
                                                        <span className="text-5xl font-black text-primary-theme tracking-tighter">
                                                            {currencySymbol}{price.toLocaleString()}
                                                        </span>
                                                        <span className="text-sm font-black text-primary-theme/30 uppercase tracking-widest">/{currencyCode}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 mb-10 flex-grow">
                                                    {/* Benefits Section */}
                                                    <div>
                                                        <p className="text-[10px] font-black text-primary-theme/30 uppercase tracking-[0.2em] mb-4">Beneficios principales</p>
                                                        <ul className="space-y-3">
                                                            {(plan as any).benefits?.map((benefit: string, idx: number) => (
                                                                <li key={idx} className="flex items-start gap-3">
                                                                    <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                    </div>
                                                                    <span className="text-sm font-bold text-primary-theme leading-snug">{benefit}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {/* Features Section */}
                                                    <div className="pt-6 border-t border-dashed border-theme">
                                                        <p className="text-[10px] font-black text-primary-theme/30 uppercase tracking-[0.2em] mb-4">Lo que incluye</p>
                                                        <ul className="space-y-2">
                                                            {plan.features.map((feature: string, idx: number) => (
                                                                <li key={idx} className="flex items-center gap-2 text-xs font-medium text-primary-theme/60">
                                                                    <div className="w-1 h-1 rounded-full bg-primary-theme/30" />
                                                                    {feature}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handlePlanSelection(planId)}
                                                    disabled={isCurrentPlan}
                                                    className={cn(
                                                        "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-lg hover:shadow-2xl active:scale-95",
                                                        isCurrentPlan
                                                            ? "bg-secondary-theme text-primary-theme/20 cursor-not-allowed border border-theme" 
                                                            : isRadiance 
                                                                ? "bg-gradient-to-r from-[#FF2E88] to-[#FF4DA6] text-white hover:opacity-90" 
                                                                : "bg-primary-theme text-primary-theme border-2 border-theme hover:bg-secondary-theme"
                                                    )}
                                                >
                                                    {isCurrentPlan ? "Sistema Activo" : (plan as any).cta || "Activar sistema"}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Guarantee Block */}
                                <div className="mt-20 max-w-4xl mx-auto">
                                    <div className="card-premium p-10 border-2 border-emerald-500/20 bg-emerald-500/[0.02] overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                            <ShieldCheck className="w-40 h-40 text-emerald-500" />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex flex-col md:flex-row items-center gap-8">
                                                <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center flex-shrink-0 border-2 border-emerald-500/20 shadow-lg">
                                                    <ShieldCheck className="w-10 h-10 text-emerald-600" />
                                                </div>
                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="text-2xl font-black text-primary-theme uppercase tracking-tight mb-2">🔒 GARANTÍA — Prueba Citenly sin riesgo</h3>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3 justify-center md:justify-start">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            <p className="text-sm font-bold text-primary-theme/70">Tienes 7 días para probar el sistema completo</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 justify-center md:justify-start">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            <p className="text-sm font-bold text-primary-theme/70">Implementación completa por nuestro equipo (llave en mano)</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 justify-center md:justify-start">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            <p className="text-sm font-bold text-primary-theme/70">Si no te ayuda a gestionar mejor tus citas, puedes cancelar.</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-6 inline-flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/30">
                                                        0 RIESGO COMPROMETIDO
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Implicit Comparison Text */}
                                    <p className="text-center mt-12 text-sm font-medium text-primary-theme/40 italic">
                                        "Si no tomas el sistema Radiance hoy, tu clínica seguirá perdiendo clientas que la competencia está capturando por responder más rápido."
                                    </p>
                                </div>
                                
                                {/* AI Transaction History Section */}
                                <div className="mt-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-soft flex items-center justify-center shadow-lg shrink-0 border border-indigo-500/20">
                                            <History className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-primary-theme">Control de Créditos y Recargas</h2>
                                            <p className="text-sm text-secondary-theme font-medium">Historial transparente de consumos y renovaciones mensuales.</p>
                                        </div>
                                    </div>
                                    
                                    {profile?.clinic_id && (
                                        <AITransactionHistory clinicId={profile.clinic_id} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Team Settings */}
                    {activeTab === 'team' && (
                        <Team />
                    )}

                    {/* Schedule Settings */}
                    {activeTab === 'schedule' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="card-premium p-6">
                                <h2 className="text-lg font-semibold text-primary-theme mb-6">Horarios de Atención</h2>

                                <div className="space-y-3">
                                    {dayOrder.map((day) => {
                                        const hours = workingHours[day];
                                        return (
                                            <div
                                                key={day}
                                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-secondary-theme rounded-soft border border-theme/30"
                                            >
                                                <div className="flex items-center justify-between w-full sm:w-28 flex-shrink-0">
                                                    <p className="font-bold text-primary-theme uppercase tracking-wider text-xs sm:text-sm">{dayNames[day]}</p>
                                                    <label className="flex items-center gap-2 sm:hidden">
                                                        <input
                                                            type="checkbox"
                                                            checked={hours !== null}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setWorkingHours((prev: any) => ({
                                                                    ...prev,
                                                                    [day]: checked ? { open: '09:00', close: '18:00' } : null
                                                                }))
                                                            }}
                                                            className="w-4 h-4 rounded border-theme text-[#FF2E88] focus:ring-[#FF2E88]"
                                                        />
                                                        <span className="text-[10px] font-bold text-primary-theme/60 uppercase">Abierto</span>
                                                    </label>
                                                </div>

                                                <label className="hidden sm:flex items-center gap-2 mr-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={hours !== null}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setWorkingHours((prev: any) => ({
                                                                ...prev,
                                                                [day]: checked ? { open: '09:00', close: '18:00' } : null
                                                            }))
                                                        }}
                                                        className="w-4 h-4 rounded border-theme text-[#FF2E88] focus:ring-[#FF2E88]"
                                                    />
                                                    <span className="text-sm font-medium text-primary-theme/60">Abierto</span>
                                                </label>

                                                {hours ? (
                                                    <div className="flex flex-col gap-4 flex-1 w-full sm:min-w-0">
                                                        <div className="flex flex-col xs:flex-row items-center gap-2 w-full">
                                                            <div className="w-full xs:flex-1 relative">
                                                                <input
                                                                    type="time"
                                                                    value={(hours as any).open}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setWorkingHours((prev: any) => ({
                                                                            ...prev,
                                                                            [day]: { ...prev[day], open: val }
                                                                        }))
                                                                    }}
                                                                    className="w-full px-3 py-2.5 bg-primary-theme/5 border border-theme rounded-xl text-sm text-primary-theme font-bold focus:ring-2 focus:ring-[#FF2E88]/20 focus:outline-none appearance-none"
                                                                />
                                                            </div>
                                                            <span className="text-primary-theme/40 font-black text-[10px] uppercase px-1 xs:rotate-0 rotate-90">a</span>
                                                            <div className="w-full xs:flex-1 relative">
                                                                <input
                                                                    type="time"
                                                                    value={(hours as any).close}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setWorkingHours((prev: any) => ({
                                                                            ...prev,
                                                                            [day]: { ...prev[day], close: val }
                                                                        }))
                                                                    }}
                                                                    className="w-full px-3 py-2.5 bg-primary-theme/5 border border-theme rounded-xl text-sm text-primary-theme font-bold focus:ring-2 focus:ring-[#FF2E88]/20 focus:outline-none appearance-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Colación UI */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-4 border-l-2 border-[#FF2E88]/30 ml-1">
                                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                                <div className="relative inline-flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(hours as any).lunch_break?.enabled || false}
                                                                        onChange={(e) => {
                                                                            const checked = e.target.checked;
                                                                            setWorkingHours((prev: any) => ({
                                                                                ...prev,
                                                                                [day]: {
                                                                                    ...prev[day],
                                                                                    lunch_break: {
                                                                                        ...(prev[day].lunch_break || { start: '14:00', end: '15:00' }),
                                                                                        enabled: checked
                                                                                    }
                                                                                }
                                                                            }))
                                                                        }}
                                                                        className="sr-only peer"
                                                                    />
                                                                    <div className="w-9 h-5 bg-charcoal/20 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF2E88] shadow-inner"></div>
                                                                </div>
                                                                <span className="text-[11px] font-black uppercase tracking-wider text-primary-theme/50 group-hover:text-primary-theme/80 transition-colors">Colación</span>
                                                            </label>

                                                            {(hours as any).lunch_break?.enabled && (
                                                                <div className="flex flex-col xs:flex-row items-center gap-2 animate-fade-in sm:ml-4 w-full xs:w-auto">
                                                                    <input
                                                                        type="time"
                                                                        value={(hours as any).lunch_break.start}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setWorkingHours((prev: any) => ({
                                                                                ...prev,
                                                                                [day]: {
                                                                                    ...prev[day],
                                                                                    lunch_break: { ...prev[day].lunch_break, start: val }
                                                                                }
                                                                            }))
                                                                        }}
                                                                        className="px-2 py-1.5 bg-primary-theme/5 border border-theme rounded-lg text-xs w-full xs:w-24 text-primary-theme font-bold focus:ring-2 focus:ring-[#FF2E88]/20 focus:outline-none"
                                                                    />
                                                                    <span className="text-primary-theme/40 text-[9px] font-black uppercase px-1 xs:rotate-0 rotate-90">a</span>
                                                                    <input
                                                                        type="time"
                                                                        value={(hours as any).lunch_break.end}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setWorkingHours((prev: any) => ({
                                                                                ...prev,
                                                                                [day]: {
                                                                                    ...prev[day],
                                                                                    lunch_break: { ...prev[day].lunch_break, end: val }
                                                                                }
                                                                            }))
                                                                        }}
                                                                        className="px-2 py-1.5 bg-primary-theme/5 border border-theme rounded-lg text-xs w-full xs:w-24 text-primary-theme font-bold focus:ring-2 focus:ring-[#FF2E88]/20 focus:outline-none"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 py-2">
                                                        <span className="text-xs font-bold uppercase tracking-widest text-primary-theme/30 bg-primary-theme/5 px-3 py-1 rounded-full border border-theme/20">Cerrado</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="mt-6 pt-6 border-t border-theme flex items-center gap-4">
                                    <button
                                        onClick={handleSaveSchedule}
                                        disabled={savingSchedule}
                                        className="btn-premium-primary flex items-center gap-2"
                                    >
                                        {savingSchedule ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                        ) : (
                                            <><Save className="w-4 h-4" /> Guardar Horarios</>
                                        )}
                                    </button>
                                    {scheduleSaved && (
                                        <div className="flex items-center gap-2 text-[#FF2E88] text-sm animate-fade-in bg-[#FF2E88]/10 px-4 py-2 rounded-soft border border-[#FF2E88]/20">
                                            <CheckCircle2 className="w-4 h-4" />
                                            ¡Horarios guardados!
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card-premium p-6">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 bg-[#FF2E88]/5 rounded-2xl flex items-center justify-center border border-[#FF2E88]/10 shadow-[0_8px_16px_rgba(255,46,136,0.08)]">
                                        <Calendar className="w-7 h-7 text-[#FF2E88]" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[#0B0B0F] tracking-tight">Días de Cierre Especial</h2>
                                        <p className="text-sm text-[#0B0B0F]/50 font-medium">Bloquea días específicos (feriados o vacaciones) para que la IA no agende citas.</p>
                                    </div>
                                </div>

                                <div className="bg-[#FFF5F9] border border-[#FF2E88]/20 rounded-2xl p-6 mb-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-[#FF2E88] uppercase tracking-[0.2em] mb-3">Fecha de Cierre</label>
                                            <input
                                                type="date"
                                                value={newBlockedDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setNewBlockedDate(e.target.value)}
                                                className="input-premium w-full bg-white font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#FF2E88] uppercase tracking-[0.2em] mb-3">Motivo (Opcional)</label>
                                            <input
                                                type="text"
                                                value={newBlockedReason}
                                                onChange={(e) => setNewBlockedReason(e.target.value)}
                                                placeholder="Ej: Feriado Nacional"
                                                className="input-premium w-full bg-white font-bold"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleAddBlockedDate}
                                                disabled={isAddingBlockedDate || !newBlockedDate}
                                                className={cn(
                                                    "w-full py-4 flex items-center justify-center gap-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_8px_16px_rgba(255,46,136,0.2)] hover:-translate-y-0.5 active:translate-y-0",
                                                    !newBlockedDate ? "bg-charcoal/10 text-charcoal/30 cursor-not-allowed shadow-none" : "bg-[#FF2E88] text-white hover:bg-[#E61E75] hover:shadow-[0_12px_24px_rgba(255,46,136,0.3)]"
                                                )}
                                            >
                                                {isAddingBlockedDate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                                                Bloquear Día
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em] flex items-center gap-2.5">
                                        <History className="w-4 h-4 text-[#FF2E88]" />
                                        Próximos Días Bloqueados
                                    </h3>

                                    {loadingBlockedDates ? (
                                        <div className="py-12 text-center">
                                            <Loader2 className="w-10 h-10 text-[#FF2E88] animate-spin mx-auto" />
                                        </div>
                                    ) : blockedDates.length === 0 ? (
                                        <div className="py-16 bg-white rounded-2xl border-2 border-dashed border-silk-beige flex flex-col items-center justify-center text-center group transition-colors hover:border-[#FF2E88]/30">
                                            <div className="w-16 h-16 bg-silk-beige/30 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#FF2E88]/5 transition-colors">
                                                <Calendar className="w-8 h-8 text-charcoal/20 group-hover:text-[#FF2E88]/30 transition-colors" />
                                            </div>
                                            <p className="text-[#0B0B0F]/40 text-sm font-bold italic">No hay días bloqueados próximamente.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {blockedDates.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between p-5 bg-white border border-silk-beige rounded-2xl hover:border-[#FF2E88]/40 hover:shadow-[0_10px_20px_rgba(255,46,136,0.06)] transition-all group relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-[#FF2E88]/20 group-hover:bg-[#FF2E88] transition-colors" />
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 bg-[#FFF5F9] rounded-xl flex flex-col items-center justify-center border border-[#FF2E88]/10 flex-shrink-0 group-hover:bg-[#FF2E88] transition-colors duration-300">
                                                            <span className="text-[10px] font-black text-[#FF2E88] uppercase leading-none group-hover:text-white transition-colors">
                                                                {new Date(item.blocked_date + 'T12:00:00Z').toLocaleString('es-ES', { month: 'short' })}
                                                            </span>
                                                            <span className="text-xl font-black text-[#FF2E88] leading-none mt-1 group-hover:text-white transition-colors">
                                                                {new Date(item.blocked_date + 'T12:00:00Z').getDate()}
                                                            </span>
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-sm font-black text-[#0B0B0F] capitalize truncate">
                                                                {new Date(item.blocked_date + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </p>
                                                            {item.reason && <p className="text-[11px] text-[#0B0B0F]/50 font-medium italic truncate mt-0.5">{item.reason}</p>}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteBlockedDate(item.id)}
                                                        className="p-2.5 text-charcoal/20 hover:text-white hover:bg-[#FF2E88] rounded-xl transition-all flex-shrink-0 border border-transparent hover:border-[#FF2E88] shadow-sm hover:shadow-lg active:scale-95"
                                                        title="Eliminar bloqueo"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Integrations Settings */}
                    {activeTab === 'integrations' && (
                        <div className="space-y-6">
                            {/* YCloud */}
                            <div className="card-premium p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-soft flex items-center justify-center">
                                        <MessageSquare className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-primary-theme">YCloud WhatsApp API</h2>
                                        <p className="text-sm text-primary-theme/50">Conecta tu número de WhatsApp Business</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">API Key</label>
                                        <input
                                            type="password"
                                            placeholder="yc_xxxxxxxxxxxxxxxxxxxxxx"
                                            value={yCloudApiKey}
                                            onChange={(e) => setYCloudApiKey(e.target.value)}
                                            className="input-premium"
                                        />
                                        <p className="text-xs text-primary-theme/40 mt-1">
                                            Obtén tu API Key desde <a href="https://www.ycloud.com" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">ycloud.com</a>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">Número de WhatsApp</label>
                                        <input
                                            type="text"
                                            placeholder="+521234567890"
                                            value={yCloudPhoneNumber}
                                            onChange={(e) => setYCloudPhoneNumber(e.target.value)}
                                            className="input-premium"
                                        />
                                        <p className="text-xs text-primary-theme/40 mt-1">
                                            El número de WhatsApp Business registrado en YCloud (con código de país)
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary-theme mb-2">Webhook URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={webhookUrl}
                                                disabled
                                                className="input-premium bg-secondary-theme text-primary-theme/60 font-mono text-sm"
                                            />
                                            <button
                                                onClick={copyWebhookUrl}
                                                className="btn-premium-secondary text-primary-500 flex items-center gap-1"
                                            >
                                                {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                {copiedWebhook ? 'Copiado' : 'Copiar'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-primary-theme/40 mt-1">
                                            Configura esta URL como webhook en tu panel de YCloud (Developer → Webhooks)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Webhooks / n8n */}
                            <div className="card-premium p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-orange-100 rounded-soft flex items-center justify-center">
                                            <Webhook className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-primary-theme">Webhooks</h2>
                                            <p className="text-sm text-primary-theme/50">Conecta con n8n, Make, Zapier y otras automatizaciones</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openWebhookModal()}
                                        className="btn-premium-primary flex items-center gap-2 text-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Añadir Webhook
                                    </button>
                                </div>

                                {webhooks.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed border-theme rounded-soft">
                                        <Globe className="w-10 h-10 text-primary-theme/20 mx-auto mb-3" />
                                        <p className="text-primary-theme/50 text-sm mb-1">No hay webhooks configurados</p>
                                        <p className="text-primary-theme/40 text-xs">Añade un webhook para enviar eventos a herramientas externas como n8n</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {webhooks.map((wh) => (
                                            <div
                                                key={wh.id}
                                                className={cn(
                                                    'border rounded-soft p-4 transition-all',
                                                    wh.is_active
                                                        ? 'border-theme bg-secondary-theme hover:shadow-sm'
                                                        : 'border-theme bg-secondary-theme/50 opacity-60'
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'w-2.5 h-2.5 rounded-full',
                                                            wh.is_active ? 'bg-emerald-400' : 'bg-gray-300'
                                                        )} />
                                                        <h3 className="font-medium text-primary-theme text-sm">{wh.name}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleTestWebhook(wh)}
                                                            disabled={!wh.is_active || testingWebhook === wh.id}
                                                            className="p-1.5 rounded-soft hover:bg-blue-50 transition-colors disabled:opacity-50"
                                                            title="Enviar prueba"
                                                        >
                                                            {testingWebhook === wh.id ? (
                                                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                                            ) : (
                                                                <Send className="w-4 h-4 text-blue-500" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleWebhook(wh.id!, wh.is_active)}
                                                            className="p-1.5 rounded-soft hover:bg-secondary-theme transition-colors"
                                                            title={wh.is_active ? 'Desactivar' : 'Activar'}
                                                        >
                                                            {wh.is_active ? (
                                                                <ToggleRight className="w-5 h-5 text-emerald-500" />
                                                            ) : (
                                                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => openWebhookModal(wh)}
                                                            className="p-1.5 rounded-soft hover:bg-secondary-theme transition-colors"
                                                            title="Editar"
                                                        >
                                                            <ChevronRight className="w-4 h-4 text-primary-theme/50" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteWebhook(wh.id!)}
                                                            className="p-1.5 rounded-soft hover:bg-red-50 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-primary-theme/40 font-mono truncate mb-2 pl-5">{wh.url}</p>
                                                <div className="flex items-center gap-2 flex-wrap pl-5">
                                                    {wh.events.length > 0 ? wh.events.map(ev => (
                                                        <span key={ev} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">
                                                            {ev}
                                                        </span>
                                                    )) : (
                                                        <span className="text-xs text-primary-theme/30">Sin eventos seleccionados</span>
                                                    )}
                                                    {wh.last_triggered_at && (
                                                        <span className="text-xs text-primary-theme/30 ml-auto">
                                                            Último envío: {new Date(wh.last_triggered_at).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 p-3 bg-amber-50/80 rounded-soft border border-amber-200/50">
                                    <p className="text-xs text-amber-700">
                                        <strong>💡 Tip:</strong> En n8n, usa el nodo "Webhook" y pega la URL generada por n8n aquí. Selecciona los eventos que deseas recibir y n8n procesará la información automáticamente.
                                    </p>
                                </div>
                            </div>

                            {/* Webhook Create/Edit Modal */}
                            {showWebhookModal && (
                                <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                    <div className="bg-primary-theme rounded-soft shadow-premium-lg w-full max-w-lg animate-scale-in">
                                        <div className="flex items-center justify-between p-6 border-b border-theme">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                                                    <Webhook className="w-5 h-5 text-orange-500" />
                                                </div>
                                                <h2 className="text-lg font-bold text-primary-theme">
                                                    {editingWebhook ? 'Editar Webhook' : 'Nuevo Webhook'}
                                                </h2>
                                            </div>
                                            <button onClick={closeWebhookModal} className="p-2 hover:bg-secondary-theme rounded-soft transition-colors">
                                                <X className="w-5 h-5 text-primary-theme/50" />
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-5">
                                            <div>
                                                <label className="block text-sm font-medium text-primary-theme mb-2">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={webhookForm.name}
                                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Ej: n8n - Notificaciones"
                                                    className="input-premium w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary-theme mb-2">URL del Webhook</label>
                                                <input
                                                    type="url"
                                                    value={webhookForm.url}
                                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                                                    placeholder="https://tu-n8n-instance.com/webhook/..."
                                                    className="input-premium w-full font-mono text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary-theme mb-2">Secret (opcional)</label>
                                                <input
                                                    type="password"
                                                    value={webhookForm.secret}
                                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                                                    placeholder="Tu clave secreta para verificar webhooks"
                                                    className="input-premium w-full"
                                                />
                                                <p className="text-xs text-primary-theme/40 mt-1">Se envía como header <code className="bg-secondary-theme px-1 rounded text-xs">X-Webhook-Secret</code></p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary-theme mb-2">Eventos a escuchar</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {WEBHOOK_EVENTS.map(ev => (
                                                        <label
                                                            key={ev.value}
                                                            className={cn(
                                                                'flex items-center gap-2 p-2.5 rounded-soft border cursor-pointer transition-all text-sm',
                                                                webhookForm.events.includes(ev.value)
                                                                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                                                                    : 'bg-secondary-theme border-theme text-primary-theme/60 hover:bg-primary-theme/50'
                                                            )}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={webhookForm.events.includes(ev.value)}
                                                                onChange={() => toggleWebhookEvent(ev.value)}
                                                                className="sr-only"
                                                            />
                                                            <div className={cn(
                                                                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                                                                webhookForm.events.includes(ev.value)
                                                                    ? 'bg-orange-500 border-orange-500'
                                                                    : 'border-gray-300'
                                                            )}>
                                                                {webhookForm.events.includes(ev.value) && (
                                                                    <Check className="w-3 h-3 text-white" />
                                                                )}
                                                            </div>
                                                            {ev.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 p-6 border-t border-theme">
                                            <button onClick={closeWebhookModal} className="btn-premium-secondary">Cancelar</button>
                                            <button
                                                onClick={handleSaveWebhook}
                                                disabled={savingWebhook || !webhookForm.name.trim() || !webhookForm.url.trim()}
                                                className="btn-premium-primary flex items-center gap-2"
                                            >
                                                {savingWebhook ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                                ) : (
                                                    <><Save className="w-4 h-4" /> {editingWebhook ? 'Guardar' : 'Crear Webhook'}</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-4 flex-wrap">
                                <button
                                    onClick={saveIntegrations}
                                    disabled={isSavingIntegrations}
                                    className="btn-premium-primary flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingIntegrations ? 'Guardando...' : 'Guardar Integraciones'}
                                </button>

                                {saveStatus === 'success' && (
                                    <div className="flex items-center gap-2 text-emerald-600 text-sm animate-fade-in bg-emerald-50 px-4 py-2 rounded-soft">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Integraciones guardadas correctamente
                                    </div>
                                )}

                                {saveStatus === 'error' && (
                                    <div className="flex items-center gap-2 text-red-600 text-sm animate-fade-in bg-red-50 px-4 py-2 rounded-soft">
                                        <AlertCircle className="w-4 h-4" />
                                        Error al guardar. Intenta nuevamente.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notifications Settings */}
                    {activeTab === 'notifications' && (
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-semibold text-primary-theme mb-2">Configuración de Notificaciones</h2>
                            <p className="text-sm text-primary-theme/50 mb-6">Elige qué notificaciones recibir en tu panel</p>

                            {notificationsSaved && (
                                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-soft flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    <p className="text-sm text-emerald-700 font-medium">¡Preferencias de notificaciones guardadas exitosamente!</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-soft">
                                    <div>
                                        <p className="font-medium text-primary-theme">Nuevas Citas</p>
                                        <p className="text-sm text-primary-theme/50">Cuando se agenda una nueva cita</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.new_appointment}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, new_appointment: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-soft">
                                    <div>
                                        <p className="font-medium text-primary-theme">Citas Confirmadas</p>
                                        <p className="text-sm text-primary-theme/50">Cuando un paciente confirma su cita</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.confirmed}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, confirmed: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-soft">
                                    <div>
                                        <p className="font-medium text-primary-theme">Citas Canceladas</p>
                                        <p className="text-sm text-primary-theme/50">Cuando se cancela una cita</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.cancelled}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, cancelled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-soft">
                                    <div>
                                        <p className="font-medium text-primary-theme">Recordatorios Pendientes</p>
                                        <p className="text-sm text-primary-theme/50">Citas que necesitan confirmación</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.pending_reminder}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, pending_reminder: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-soft">
                                    <div>
                                        <p className="font-medium text-primary-theme">Nuevos Mensajes</p>
                                        <p className="text-sm text-primary-theme/50">Mensajes que requieren atención</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.new_message}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, new_message: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-soft">
                                    <div>
                                        <p className="font-medium text-primary-theme">Encuestas Respondidas</p>
                                        <p className="text-sm text-primary-theme/50">Cuando un paciente responde una encuesta</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.survey_response}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, survey_response: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-secondary-theme rounded-soft border border-orange-200">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-primary-theme">Derivación a Humano</p>
                                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">IA Agent</span>
                                        </div>
                                        <p className="text-sm text-primary-theme/50">Cuando el Asistente de IA requiere de un humano para continuar el chat</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.ai_handoff}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, ai_handoff: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-theme">
                                <button
                                    onClick={handleSaveNotifications}
                                    disabled={savingNotifications}
                                    className="btn-premium-primary flex items-center gap-2"
                                >
                                    {savingNotifications ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Guardar Notificaciones</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reminders Settings */}
                    {activeTab === 'reminders' && (
                        <div className="card-premium p-6">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-soft flex items-center justify-center">
                                    <AlarmClock className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-primary-theme">Configuración de Recordatorios</h2>
                                    <p className="text-sm text-primary-theme/50">Personaliza cuándo y cómo enviar recordatorios</p>
                                </div>
                            </div>

                            {remindersSaved && (
                                <div className="my-6 p-4 bg-[#FF2E88]/10 border border-[#FF2E88]/20 rounded-soft flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-[#FF2E88]" />
                                    <p className="text-sm text-[#FF2E88] font-medium">¡Configuración de recordatorios guardada!</p>
                                </div>
                            )}

                            {/* Timing Section */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-primary-theme mb-4">Tiempo de recordatorios</h3>
                                <div className="space-y-3">
                                    <div className="bg-secondary-theme rounded-soft overflow-hidden shadow-soft-md border border-theme">
                                        <div className="flex items-center justify-between p-5 bg-secondary-theme/50">
                                            <div>
                                                <p className="font-semibold text-primary-theme">24 horas antes</p>
                                                <p className="text-sm text-primary-theme/60">Enviar recordatorio un día antes</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={reminderSettings.reminder_24h_before}
                                                    onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_24h_before: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                            </label>
                                        </div>
                                        {reminderSettings.reminder_24h_before && (
                                            <div className="px-4 pb-4 border-t border-charcoal/5 pt-3">
                                                <TemplateSelector
                                                    label="Plantilla: Recordatorio 24h"
                                                    description="Se enviará este mensaje a tus pacientes 24 horas antes de la cita."
                                                    value={reminderSettings.template_24h}
                                                    onChange={(val) => setReminderSettings({ ...reminderSettings, template_24h: val })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-secondary-theme rounded-soft overflow-hidden shadow-soft-md border border-theme">
                                        <div className="flex items-center justify-between p-5 bg-secondary-theme/50">
                                            <div>
                                                <p className="font-semibold text-primary-theme">2 horas antes</p>
                                                <p className="text-sm text-primary-theme/60">Recordatorio cercano a la cita</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={reminderSettings.reminder_2h_before}
                                                    onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_2h_before: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                            </label>
                                        </div>
                                        {reminderSettings.reminder_2h_before && (
                                            <div className="px-4 pb-4 border-t border-charcoal/5 pt-3">
                                                <TemplateSelector
                                                    label="Plantilla: Recordatorio 2h"
                                                    description="Se enviará este mensaje a tus pacientes 2 horas antes de la cita."
                                                    value={reminderSettings.template_2h}
                                                    onChange={(val) => setReminderSettings({ ...reminderSettings, template_2h: val })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-secondary-theme rounded-soft overflow-hidden shadow-soft-md border border-theme">
                                        <div className="flex items-center justify-between p-5 bg-secondary-theme/50">
                                            <div>
                                                <p className="font-semibold text-primary-theme">1 hora antes</p>
                                                <p className="text-sm text-primary-theme/60">Último recordatorio antes de la cita</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={reminderSettings.reminder_1h_before}
                                                    onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_1h_before: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                            </label>
                                        </div>
                                        {reminderSettings.reminder_1h_before && (
                                            <div className="px-4 pb-4 border-t border-charcoal/5 pt-3">
                                                <TemplateSelector
                                                    label="Plantilla: Recordatorio 1h"
                                                    description="Se enviará este mensaje a tus pacientes 1 hora antes de la cita."
                                                    value={reminderSettings.template_1h}
                                                    onChange={(val) => setReminderSettings({ ...reminderSettings, template_1h: val })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Preferred Hour */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-primary-theme mb-4">Hora preferida de envío</h3>
                                <div className="flex items-center justify-between p-5 bg-secondary-theme rounded-soft shadow-soft-md border border-theme">
                                    <div>
                                        <p className="font-semibold text-primary-theme">Hora de recordatorios</p>
                                        <p className="text-sm text-primary-theme/60">Para recordatorios de 24h, enviar a esta hora</p>
                                    </div>
                                    <input
                                        type="time"
                                        value={reminderSettings.preferred_hour}
                                        onChange={(e) => setReminderSettings({ ...reminderSettings, preferred_hour: e.target.value })}
                                        className="px-3 py-2 bg-secondary-theme text-primary-theme border border-theme rounded-soft text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Confirmation Section */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-primary-theme mb-4">Solicitar confirmación</h3>
                                <div className="space-y-3">
                                    <div className="bg-secondary-theme rounded-soft overflow-hidden shadow-soft-md border border-theme">
                                        <div className="flex items-center justify-between p-5 bg-secondary-theme/50">
                                            <div>
                                                <p className="font-semibold text-primary-theme">Pedir confirmación</p>
                                                <p className="text-sm text-primary-theme/60">Solicitar al paciente que confirme su asistencia</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={reminderSettings.request_confirmation}
                                                    onChange={(e) => setReminderSettings({ ...reminderSettings, request_confirmation: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                            </label>
                                        </div>
                                        {reminderSettings.request_confirmation && (
                                            <div className="px-4 pb-4 border-t border-charcoal/5 pt-3">
                                                <TemplateSelector
                                                    label="Plantilla: Confirmación Requerida"
                                                    description="Se utiliza cuando requieres que el paciente confirme expresamente. Incluye mensaje y botones."
                                                    value={reminderSettings.template_confirmation}
                                                    onChange={(val) => setReminderSettings({ ...reminderSettings, template_confirmation: val })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>


                            {/* Follow-up Section */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-primary-theme mb-4">Seguimiento post-cita</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-5 bg-secondary-theme rounded-soft shadow-soft-md border border-theme">
                                        <div>
                                            <p className="font-semibold text-primary-theme">Recordatorio de seguimiento</p>
                                            <p className="text-sm text-primary-theme/60">Enviar mensaje después de la cita para reagendar</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={reminderSettings.followup_enabled}
                                                onChange={(e) => setReminderSettings({ ...reminderSettings, followup_enabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-charcoal/15 dark:bg-white/10 rounded-full peer peer-checked:bg-[#FF2E88] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                                        </label>
                                    </div>

                                    {reminderSettings.followup_enabled && (
                                        <>
                                            <div className="flex items-center justify-between p-5 bg-secondary-theme rounded-soft shadow-soft-md border border-theme">
                                                <div>
                                                    <p className="font-semibold text-primary-theme">Días después de la cita</p>
                                                    <p className="text-sm text-primary-theme/60">Cuántos días esperar antes de enviar</p>
                                                </div>
                                                <select
                                                    value={reminderSettings.followup_days_after}
                                                    onChange={(e) => setReminderSettings({ ...reminderSettings, followup_days_after: parseInt(e.target.value) })}
                                                    className="px-3 py-2 bg-secondary-theme text-primary-theme border border-theme rounded-soft text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                >
                                                    <option value={3}>3 días</option>
                                                    <option value={7}>7 días</option>
                                                    <option value={14}>14 días</option>
                                                    <option value={30}>30 días</option>
                                                </select>
                                            </div>

                                            <div className="mt-4">
                                                <TemplateSelector
                                                    label="Plantilla de Seguimiento"
                                                    value={reminderSettings.template_followup}
                                                    onChange={(val) => setReminderSettings({ ...reminderSettings, template_followup: val })}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-theme">
                                <button
                                    onClick={handleSaveReminders}
                                    disabled={savingReminders}
                                    className="btn-premium-primary flex items-center gap-2"
                                >
                                    {savingReminders ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Guardar Recordatorios</>
                                    )}
                                </button>
                            </div>

                            {/* Visual Record / History Section */}
                            <div className="mt-12">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                                            <History className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-primary-theme">Registro de Envíos</h3>
                                            <p className="text-sm text-primary-theme/50">Historial reciente de recordatorios enviados</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            // Trigger reload
                                            setActiveTab('profile');
                                            setTimeout(() => setActiveTab('reminders'), 10);
                                        }}
                                        className="btn-premium-secondary text-primary-theme/50 hover:bg-secondary-theme flex items-center gap-2 text-sm"
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isLoadingLogs && "animate-spin")} />
                                        Sincronizar
                                    </button>
                                </div>

                                <div className="bg-secondary-theme rounded-soft shadow-soft-md border border-theme overflow-hidden">
                                    {isLoadingLogs ? (
                                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                                            <p className="text-sm text-primary-theme/40">Cargando historial...</p>
                                        </div>
                                    ) : reminderLogs.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <div className="w-16 h-16 bg-secondary-theme/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <AlarmClock className="w-8 h-8 text-primary-theme/20" />
                                            </div>
                                            <p className="text-primary-theme/50 font-medium">Sin actividad reciente</p>
                                            <p className="text-primary-theme/40 text-xs mt-1">Los recordatorios enviados aparecerán aquí.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-secondary-theme/50 border-b border-theme text-[11px] uppercase tracking-wider text-primary-theme/40 font-bold">
                                                        <th className="px-6 py-4">Paciente</th>
                                                        <th className="px-6 py-4">Tipo</th>
                                                        <th className="px-6 py-4">Estado</th>
                                                        <th className="px-6 py-4">Fecha/Hora</th>
                                                        <th className="px-6 py-4 text-right">Detalle</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-silk-beige/50">
                                                    {reminderLogs.map((log) => (
                                                        <tr key={log.id} className="hover:bg-secondary-theme/30 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-semibold text-primary-theme text-sm">
                                                                    {log.appointments?.patient_name || 'Paciente'}
                                                                </p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={cn(
                                                                    "text-xs font-bold font-bold px-2 py-0.5 rounded-full font-bold uppercase",
                                                                    log.type === '24h' && "bg-amber-100 text-amber-700",
                                                                    log.type === '2h' && "bg-blue-100 text-blue-700",
                                                                    log.type === '1h' && "bg-indigo-100 text-indigo-700",
                                                                    log.type === 'confirmation' && "bg-emerald-100 text-emerald-700"
                                                                )}>
                                                                    {log.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    {log.status === 'sent' ? (
                                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                    ) : (
                                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                                    )}
                                                                    <span className={cn(
                                                                        "text-xs font-medium",
                                                                        log.status === 'sent' ? "text-emerald-700" : "text-red-700"
                                                                    )}>
                                                                        {log.status === 'sent' ? 'Enviado' : 'Fallido'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className="text-xs text-primary-theme/60">
                                                                    {new Date(log.sent_at).toLocaleString()}
                                                                </p>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {log.error_message && (
                                                                    <div className="group relative inline-block">
                                                                        <AlertCircle className="w-4 h-4 text-red-400 cursor-help" />
                                                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-charcoal text-white text-xs font-bold font-bold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                                            {log.error_message}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex items-center justify-between text-[11px] text-primary-theme/40 bg-secondary-theme/20 p-3 rounded-soft border border-dashed border-theme">
                                    <p><strong>Nota:</strong> Los logs muestran los últimos 20 intentos de envío. Si un recordatorio falla, verifica tu saldo en YCloud o la configuración del número.</p>
                                    <a href="https://www.ycloud.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary-500 font-bold">
                                        Ir a YCloud Console <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* AI Settings */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            {/* Hybrid Router Header */}
                            <div className="card-premium p-6 bg-secondary-theme/30 border-theme">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-violet-600 rounded-soft flex items-center justify-center shadow-lg shadow-violet-200">
                                            <Zap className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-primary-theme">Citenly Hybrid Intelligence</h2>
                                            <p className="text-sm text-primary-theme/50">Motor de ruteo inteligente de modelos AI</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-primary-theme/40 uppercase tracking-widest">Atención Automática</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={aiAutoRespond}
                                                onChange={(e) => setAiAutoRespond(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-charcoal/20 dark:bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#FF2E88] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'eco', title: 'Ahorro Máximo', desc: 'Fuerza al sistema a mantenerse en Nivel 1 (Ideal para bajo presupuesto).', icon: ToggleLeft, color: 'emerald' },
                                        { id: 'auto', title: 'Híbrido Automático', desc: 'Enrutador inteligente (Recomendado). La opción más rentable.', icon: Sparkles, color: 'violet', badge: 'Popular' },
                                        { id: 'pro', title: 'Máximo Poder', desc: 'Fuerza el uso de modelos Pro siempre (Máxima precisión).', icon: Zap, color: 'orange' },
                                    ].map((strat) => (
                                        <button
                                            key={strat.id}
                                            onClick={() => setAiStrategy(strat.id as any)}
                                            className={cn(
                                                "p-4 rounded-soft border-2 text-left transition-all relative group",
                                                aiStrategy === strat.id 
                                                    ? `bg-primary-theme border-[#FF2E88] shadow-md ring-1 ring-[#FF2E88]/50`
                                                    : "bg-secondary-theme border-theme hover:border-[#FF2E88]/30"
                                            )}
                                        >
                                            {strat.badge && (
                                                <span className="absolute -top-2 -right-2 bg-violet-600 text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                                    {strat.badge}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                                    aiStrategy === strat.id ? `bg-${strat.color}-500 text-white` : "bg-secondary-theme text-primary-theme/40"
                                                )}>
                                                    <strat.icon className="w-4 h-4" />
                                                </div>
                                                <h3 className={cn("font-bold text-sm", aiStrategy === strat.id ? `text-[#FF2E88]` : "text-primary-theme")}>
                                                    {strat.title}
                                                </h3>
                                            </div>
                                            <p className="text-xs text-primary-theme/50 leading-relaxed">{strat.desc}</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 pt-6 border-t border-violet-100 flex items-center gap-4">
                                    <button
                                        onClick={handleSaveAI}
                                        disabled={savingAI}
                                        className="btn-premium-primary bg-violet-600 hover:bg-violet-700 flex items-center gap-2 shadow-lg shadow-violet-200"
                                    >
                                        {savingAI ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                        ) : (
                                            <><Save className="w-4 h-4" /> Guardar Configuración</>
                                        )}
                                    </button>
                                    {aiSaved && (
                                        <div className="flex items-center gap-2 text-[#FF2E88] text-sm animate-fade-in bg-[#FF2E88]/10 px-4 py-2 rounded-soft border border-[#FF2E88]/20">
                                            <CheckCircle2 className="w-4 h-4" />
                                            ¡Configuración guardada!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Unified Credits Dashboard */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="card-premium p-6 border-l-4 border-l-[#FF2E88] bg-secondary-theme/50">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary-50 rounded-soft flex items-center justify-center">
                                                <CreditCard className="w-5 h-5 text-primary-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-primary-theme">Citenly Credits</h3>
                                                <p className="text-xs text-primary-theme/50">Saldo unificado de inteligencia artificial</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-primary-theme">{(aiCreditsLimit + aiCreditsExtra) - aiCreditsUsed}</span>
                                            <p className="text-[10px] text-primary-theme/40 font-bold uppercase">Créditos Disponibles</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="h-3 bg-charcoal/5 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-500",
                                                    (aiCreditsUsed / (aiCreditsLimit + aiCreditsExtra)) > 0.9 ? "bg-rose-500" : "bg-primary-500"
                                                )}
                                                style={{ width: `${Math.min(100, (aiCreditsUsed / (aiCreditsLimit + aiCreditsExtra)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-secondary-theme/50 p-3 rounded-soft border border-theme">
                                                <p className="text-[10px] text-primary-theme/40 font-bold uppercase mb-1">Plan</p>
                                                <p className="text-sm font-bold text-primary-theme">{aiCreditsLimit}</p>
                                            </div>
                                            <div className="bg-secondary-theme/50 p-3 rounded-soft border border-theme">
                                                <p className="text-[10px] text-primary-theme/40 font-bold uppercase mb-1">Cargas</p>
                                                <p className="text-sm font-bold text-primary-theme">{aiCreditsExtra}</p>
                                            </div>
                                            <div className="bg-secondary-theme/50 p-3 rounded-soft border border-theme">
                                                <p className="text-[10px] text-primary-theme/40 font-bold uppercase mb-1">Consumo</p>
                                                <p className="text-sm font-bold text-primary-theme">{aiCreditsUsed}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-premium p-6 bg-secondary-theme/50 flex flex-col justify-center">
                                    <h3 className="text-sm font-bold text-primary-theme mb-4 uppercase tracking-wider text-primary-theme/40">Tabla de Costos Híbridos</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-2 bg-emerald-50/50 rounded-soft border border-emerald-100">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">N1</span>
                                                <span className="text-xs font-semibold text-emerald-800">Flash Mini - GPT-5.4</span>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-700">1x Créditos</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-violet-50/50 rounded-soft border border-violet-100">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-violet-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">N2</span>
                                                <span className="text-xs font-semibold text-violet-800">Standard - GPT-5.4</span>
                                            </div>
                                            <span className="text-xs font-bold text-violet-700">8x Créditos</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-orange-50/50 rounded-soft border border-orange-100">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-orange-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">N3</span>
                                                <span className="text-xs font-semibold text-orange-800">Sovereign Pro - GPT-5</span>
                                            </div>
                                            <span className="text-xs font-bold text-orange-700">60x Créditos</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Credit Recharge */}
                            <div id="ai-credits-packs" className="card-premium p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-soft flex items-center justify-center shadow-lg">
                                            <Plus className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-primary-theme">Recarga de Citenly Credits</h2>
                                            <p className="text-sm text-primary-theme/50">Selecciona el paquete que mejor se adapte a tu clínica</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {(() => {
                                        const currentPacks = paymentRegion === 'international' ? LS_CREDIT_PACKS : CREDIT_PACKS;
                                        const currencySymbol = paymentRegion === 'international' ? 'US$' : '$';
                                        
                                        return Object.entries(currentPacks).map(([packId, pack]: [string, any]) => (
                                            <div key={packId} className="group p-6 bg-secondary-theme border border-theme rounded-soft hover:shadow-premium-lg hover:border-[#FF2E88]/30 transition-all flex flex-col relative overflow-hidden">
                                                <div className="mb-6">
                                                    <h3 className="text-lg font-bold text-primary-theme">{pack.name}</h3>
                                                    <div className="flex items-baseline gap-1 mt-2">
                                                        <span className="text-3xl font-black text-violet-600">
                                                            {currencySymbol}{pack.price.toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] text-primary-theme/40 font-bold uppercase tracking-widest">{paymentRegion === 'international' ? 'USD' : 'CLP'}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-grow space-y-3 mb-6">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-sm text-primary-theme/70"><strong>{pack.credits.toLocaleString()}</strong> Citenly Credits</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-sm text-primary-theme/70">Uso Híbrido (N1, N2, N3)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-sm text-primary-theme/70">Sin fecha de vencimiento</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleBuyCredits(packId)}
                                                    className="w-full py-3 bg-charcoal text-white rounded-soft font-bold text-sm hover:bg-violet-600 transition-colors shadow-sm group-hover:shadow-violet-200"
                                                >
                                                    Seleccionar Pack
                                                </button>
                                            </div>
                                        ))
                                    })()}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-center gap-4 py-4 border-t border-dashed border-theme">
                                <button
                                    onClick={saveIntegrations}
                                    disabled={isSavingIntegrations}
                                    className="btn-premium-primary flex items-center gap-2"
                                >
                                    {isSavingIntegrations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar Configuración Citenly
                                </button>
                                {saveStatus === 'success' && (
                                    <span className="text-emerald-600 text-sm font-bold animate-fade-in flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Guardado
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tags Settings */}
                    {activeTab === 'tags' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-lg font-semibold text-primary-theme mb-1">Etiquetas de Pacientes</h2>
                                <p className="text-sm text-primary-theme/50">Personaliza las etiquetas para organizar a tus pacientes.</p>
                            </div>
                            <TagManager />
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
    )
}

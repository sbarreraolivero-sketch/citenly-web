import { ScheduleSettingsTab } from "./settings/ScheduleSettingsTab";import { AISettingsTab } from "./settings/AISettingsTab";import { useState, useEffect } from 'react'
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
                    {activeTab === "profile" && (
                        <MyProfile />
                    )}

                    {activeTab === "team" && (
                        <Team />
                    )}

                    {activeTab === 'schedule' && (
                        <ScheduleSettingsTab 
                            dayOrder={dayOrder}
                            dayNames={dayNames}
                            workingHours={workingHours}
                            setWorkingHours={setWorkingHours}
                            handleSaveSchedule={handleSaveSchedule}
                            savingSchedule={savingSchedule}
                            scheduleSaved={scheduleSaved}
                            blockedDates={blockedDates}
                            loadingBlockedDates={loadingBlockedDates}
                            newBlockedDate={newBlockedDate}
                            setNewBlockedDate={setNewBlockedDate}
                            newBlockedReason={newBlockedReason}
                            setNewBlockedReason={setNewBlockedReason}
                            handleAddBlockedDate={handleAddBlockedDate}
                            handleDeleteBlockedDate={handleDeleteBlockedDate}
                            isAddingBlockedDate={isAddingBlockedDate}
                        />
                    )}

                    {activeTab === "ai" && (
                        <AISettingsTab 
                            aiAutoRespond={aiAutoRespond}
                            setAiAutoRespond={setAiAutoRespond}
                            aiStrategy={aiStrategy}
                            setAiStrategy={setAiStrategy}
                            handleSaveAI={handleSaveAI}
                            savingAI={savingAI}
                            aiSaved={aiSaved}
                            aiCreditsLimit={aiCreditsLimit}
                            aiCreditsExtra={aiCreditsExtra}
                            aiCreditsUsed={aiCreditsUsed}
                            paymentRegion={paymentRegion}
                            handleBuyCredits={handleBuyCredits}
                            profile={profile}
                        />
                    )}

                    {activeTab === "tags" && (
                        <div className="space-y-6 animate-fade-in">
                            <TagManager />
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
    )
}

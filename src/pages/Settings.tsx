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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, type PlanId, redirectToCheckout } from '@/lib/mercadopago'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TagManager } from '@/components/settings/TagManager'

// Get the Supabase URL for webhook display
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

const tabs = [
    { id: 'profile', label: 'Mi Perfil', icon: User },
    { id: 'clinic', label: 'Clínica', icon: Building2 },
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

export default function Settings() {
    const { user, profile } = useAuth()
    const [searchParams] = useSearchParams()

    const [activeTab, setActiveTab] = useState('clinic')
    const [clinicName, setClinicName] = useState('Clínica Estética Demo')
    const [clinicAddress, setClinicAddress] = useState('')
    const [services, setServices] = useState<any[]>([])
    const [workingHours, _setWorkingHours] = useState(mockWorkingHours)

    // Service modal state
    const [showServiceModal, setShowServiceModal] = useState(false)
    const [newServiceName, setNewServiceName] = useState('')
    const [newServiceDuration, setNewServiceDuration] = useState<string>('30')
    const [newServicePrice, setNewServicePrice] = useState<string>('')

    // Upselling state for new service
    const [newUpsellEnabled, setNewUpsellEnabled] = useState(false)
    const [newUpsellDays, setNewUpsellDays] = useState<string>('7')
    const [newUpsellMessage, setNewUpsellMessage] = useState('')

    // Currency setting
    const [currency, setCurrency] = useState('MXN')
    const [timezone, setTimezone] = useState('America/Mexico_City')
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
    const [openaiApiKey, setOpenaiApiKey] = useState('')
    const [openaiModel] = useState('gpt-4o')
    const [aiBehaviorRules, setAiBehaviorRules] = useState('')
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
        survey_response: true
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
        reminder_message: '¡Hola {nombre}! Te recordamos tu cita de {servicio} mañana a las {hora}. ¿Confirmas tu asistencia?',
        followup_enabled: false,
        followup_days_after: 7,
        followup_message: '¡Hola {nombre}! Hace {dias} días que nos visitaste. ¿Te gustaría agendar otra cita?'
    })
    const [savingReminders, setSavingReminders] = useState(false)
    const [remindersSaved, setRemindersSaved] = useState(false)

    // Clinic settings state
    const [savingClinic, setSavingClinic] = useState(false)
    const [clinicSaved, setClinicSaved] = useState(false)

    // Schedule settings state
    const [savingSchedule, setSavingSchedule] = useState(false)
    const [scheduleSaved, setScheduleSaved] = useState(false)

    // AI settings state
    const [savingAI, setSavingAI] = useState(false)
    const [aiSaved, setAiSaved] = useState(false)

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

    // Read tab from URL params (for deep linking)
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && ['profile', 'clinic', 'schedule', 'integrations', 'subscription', 'notifications', 'reminders', 'ai', 'tags'].includes(tabParam)) {
            setActiveTab(tabParam)
        }
    }, [searchParams])

    // Load existing settings
    useEffect(() => {
        const fetchSettings = async () => {
            if (!profile?.clinic_id) return

            try {
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
                        reminder_message: reminderData.reminder_message,
                        followup_enabled: reminderData.followup_enabled,
                        followup_days_after: reminderData.followup_days_after,
                        followup_message: reminderData.followup_message,
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
                    setCurrency(data.currency || 'MXN')
                    setTimezone(data.timezone || 'America/Mexico_City')

                    setYCloudApiKey(data.ycloud_api_key || '')
                    setYCloudPhoneNumber(data.ycloud_phone_number || '')
                    setOpenaiApiKey(data.openai_api_key || '')
                    setAiBehaviorRules(data.ai_behavior_rules || '')
                    // setOpenaiModel(data.openai_model || 'gpt-4o') - removed since model is fixed
                    if (data.working_hours) _setWorkingHours(data.working_hours)
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

                // Fetch services
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: servicesData } = await (supabase as any)
                    .from('services')
                    .select('*')
                    .eq('clinic_id', profile.clinic_id)
                    .order('created_at', { ascending: true })

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
                }
            } catch (error) {
                console.error('Error loading settings:', error)
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

    // Webhook URL for YCloud
    const webhookUrl = `${SUPABASE_URL}/functions/v1/ycloud-whatsapp-webhook`

    const copyWebhookUrl = async () => {
        await navigator.clipboard.writeText(webhookUrl)
        setCopiedWebhook(true)
        setTimeout(() => setCopiedWebhook(false), 2000)
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
                    openai_api_key: openaiApiKey || null,
                    openai_model: openaiModel,
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
                    currency: currency,
                    timezone: timezone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.clinic_id)

            if (error) throw error

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
        setSavingSchedule(true)
        setScheduleSaved(false)

        // Simulate save - in real implementation, this would save to Supabase
        setTimeout(() => {
            setSavingSchedule(false)
            setScheduleSaved(true)
            setTimeout(() => setScheduleSaved(false), 3000)
        }, 1000)
    }

    const handleSaveAI = async () => {
        setSavingAI(true)
        setAiSaved(false)

        if (!profile?.clinic_id) {
            setSavingAI(false)
            return
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('clinic_settings')
                .update({
                    openai_api_key: openaiApiKey,
                    ai_behavior_rules: aiBehaviorRules,
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
            await redirectToCheckout({
                clinicId: profile.clinic_id,
                planId,
                email: user.email
            })
        } catch (error) {
            console.error('Checkout error:', error)
            alert('Error al iniciar el proceso de pago. Por favor intenta más tarde.')
        }
    }

    const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

    const handleEditService = (service: any) => {
        setEditingServiceId(service.id)
        setNewServiceName(service.name)
        setNewServiceDuration(service.duration.toString())
        setNewServicePrice(service.price.toString())
        setNewUpsellEnabled(service.upselling?.enabled || false)
        setNewUpsellDays(service.upselling?.daysAfter?.toString() || '7')
        setNewUpsellMessage(service.upselling?.message || '')
        setShowServiceModal(true)
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

            // Reset form
            setNewServiceName('')
            setNewServiceDuration('30')
            setNewServicePrice('')
            setNewUpsellEnabled(false)
            setNewUpsellDays('7')
            setNewUpsellMessage('')
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
        <div className="animate-fade-in">
            <div className="flex gap-6">
                {/* Sidebar Navigation */}
                <div className="w-64 flex-shrink-0">
                    <div className="card-soft p-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-3 rounded-soft text-left transition-colors',
                                    activeTab === tab.id
                                        ? 'bg-primary-500/10 text-primary-600 font-medium'
                                        : 'text-charcoal/60 hover:bg-silk-beige/50 hover:text-charcoal'
                                )}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                                <ChevronRight
                                    className={cn(
                                        'w-4 h-4 ml-auto transition-transform',
                                        activeTab === tab.id && 'rotate-90'
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {/* Profile Settings */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-lg font-semibold text-charcoal mb-1">Mi Perfil</h2>
                                <p className="text-sm text-charcoal/50">Gestiona tu información personal y seguridad.</p>
                            </div>

                            <div className="card-soft p-6 space-y-4">
                                <h3 className="font-medium text-charcoal">Información Personal</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={profile?.full_name || ''}
                                            disabled
                                            className="input-soft bg-gray-50 text-charcoal/60 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-charcoal/40 mt-1">Para cambiar tu nombre, contacta a soporte.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={profile?.email || ''}
                                            disabled
                                            className="input-soft bg-gray-50 text-charcoal/60 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-charcoal/40 mt-1">El email no se puede modificar.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="card-soft p-6 space-y-4">
                                <h3 className="font-medium text-charcoal">Seguridad</h3>
                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="input-soft"
                                            placeholder="Ingresa tu nueva contraseña"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">Confirmar Contraseña</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="input-soft"
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
                                            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        </div>
                    )}

                    {/* Clinic Settings */}
                    {activeTab === 'clinic' && (
                        <div className="space-y-6">
                            <div className="card-soft p-6">
                                <h2 className="text-lg font-semibold text-charcoal mb-6">Información de la Clínica</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">
                                            Nombre de la Clínica
                                        </label>
                                        <input
                                            type="text"
                                            value={clinicName}
                                            onChange={(e) => setClinicName(e.target.value)}
                                            className="input-soft"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">
                                            Dirección del Establecimiento
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Av. Principal 123, Col. Centro, Ciudad"
                                            value={clinicAddress}
                                            onChange={(e) => setClinicAddress(e.target.value)}
                                            className="input-soft"
                                        />
                                        <p className="text-xs text-charcoal/40 mt-1">
                                            Esta dirección será utilizada por el asistente IA para informar a los clientes
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">
                                            Zona Horaria
                                        </label>
                                        <select
                                            value={timezone}
                                            onChange={(e) => setTimezone(e.target.value)}
                                            className="input-soft"
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
                                        <label className="block text-sm font-medium text-charcoal mb-2">
                                            Moneda
                                        </label>
                                        <select
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="input-soft"
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

                                <div className="mt-6 pt-6 border-t border-silk-beige flex items-center gap-4">
                                    <button
                                        onClick={handleSaveClinic}
                                        disabled={savingClinic}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        {savingClinic ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                        ) : (
                                            <><Save className="w-4 h-4" /> Guardar Cambios</>
                                        )}
                                    </button>
                                    {clinicSaved && (
                                        <div className="flex items-center gap-2 text-emerald-600 text-sm animate-fade-in bg-emerald-50 px-4 py-2 rounded-soft">
                                            <CheckCircle2 className="w-4 h-4" />
                                            ¡Cambios guardados!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Services */}
                            <div className="card-soft p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-charcoal">Servicios</h2>
                                    <button
                                        onClick={() => setShowServiceModal(true)}
                                        className="btn-ghost flex items-center gap-2 text-primary-500"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar Servicio
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {services.map((service) => (
                                        <div
                                            key={service.id}
                                            className="flex items-center gap-4 p-4 bg-ivory rounded-soft"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-charcoal">{service.name}</p>
                                                <p className="text-sm text-charcoal/50">
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
                                                    className="p-2 text-charcoal/40 hover:text-primary-500 hover:bg-primary-50 rounded-soft transition-colors"
                                                    title="Editar servicio"
                                                >
                                                    <CreditCard className="w-4 h-4" /> {/* Using generic icon, maybe Edit/Pencil is better but relying on import */}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteService(service.id)}
                                                    className="p-2 text-charcoal/40 hover:text-red-500 hover:bg-red-50 rounded-soft transition-colors"
                                                    title="Eliminar servicio"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {services.length === 0 && (
                                        <p className="text-center text-charcoal/50 py-8">No hay servicios configurados. Agrega tu primer servicio.</p>
                                    )}
                                </div>
                            </div>

                            {/* Add/Edit Service Modal */}
                            {showServiceModal && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                                    <div className="bg-white rounded-soft p-6 w-full max-w-md shadow-xl">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-semibold text-charcoal">{editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
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
                                                className="p-2 hover:bg-silk-beige rounded-soft transition-colors"
                                            >
                                                <X className="w-5 h-5 text-charcoal/60" />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-charcoal mb-2">Nombre del Servicio</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Limpieza Facial Profunda"
                                                    value={newServiceName}
                                                    onChange={(e) => setNewServiceName(e.target.value)}
                                                    className="input-soft"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-charcoal mb-2">Duración (min)</label>
                                                    <input
                                                        type="number"
                                                        min="5"
                                                        step="5"
                                                        value={newServiceDuration}
                                                        onChange={(e) => setNewServiceDuration(e.target.value)}
                                                        className="input-soft"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-charcoal mb-2">Precio ({currency})</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={newServicePrice}
                                                        onChange={(e) => setNewServicePrice(e.target.value)}
                                                        className="input-soft"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Upselling Section */}
                                        <div className="border-t border-silk-beige pt-4 mt-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <p className="text-sm font-medium text-charcoal flex items-center gap-2">
                                                        <Zap className="w-4 h-4 text-primary-500" />
                                                        Upselling Automático
                                                    </p>
                                                    <p className="text-xs text-charcoal/50">Mensaje de seguimiento post-tratamiento</p>
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
                                                        <label className="block text-sm font-medium text-charcoal mb-2">Días después del tratamiento</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="365"
                                                            value={newUpsellDays}
                                                            onChange={(e) => setNewUpsellDays(e.target.value)}
                                                            className="input-soft"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-charcoal mb-2">Mensaje de seguimiento</label>
                                                        <textarea
                                                            placeholder="Ej: ¿Te gustaría agendar tu próxima sesión? Los mejores resultados se obtienen con tratamientos periódicos."
                                                            value={newUpsellMessage}
                                                            onChange={(e) => setNewUpsellMessage(e.target.value)}
                                                            rows={3}
                                                            className="input-soft resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3 mt-6">
                                            <button
                                                onClick={() => {
                                                    setShowServiceModal(false);
                                                    setEditingServiceId(null);
                                                    setNewServiceName(''); // Reset form
                                                }}
                                                className="btn-ghost flex-1"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleSaveService}
                                                disabled={!newServiceName.trim()}
                                                className="btn-primary flex-1"
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
                            {/* Current Plan */}
                            <div className="card-soft p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-lg font-semibold text-charcoal">Tu Plan Actual</h2>
                                        <p className="text-sm text-charcoal/50">Gestiona tu suscripción</p>
                                    </div>
                                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${subscription?.status === 'trial'
                                        ? 'bg-primary-500/10 text-primary-600'
                                        : subscription?.status === 'active'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {subscription?.status === 'trial' ? 'Período de Prueba' :
                                            subscription?.status === 'active' ? 'Activo' : 'Pendiente'}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-primary-500/5 to-accent-500/5 rounded-soft p-6 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-hero-gradient rounded-soft flex items-center justify-center">
                                            <Sparkles className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-semibold text-charcoal capitalize">
                                                Plan {subscription?.plan || 'Trial'}
                                            </h3>
                                            <p className="text-charcoal/60">
                                                {subscription?.plan === 'essence' ? '$79 USD/mes' :
                                                    subscription?.plan === 'radiance' ? '$159 USD/mes' :
                                                        subscription?.plan === 'prestige' ? '$299 USD/mes' :
                                                            'Gratis durante el período de prueba'}
                                            </p>
                                        </div>
                                    </div>
                                    {subscription?.trialEndsAt && (
                                        <div className="mt-4 pt-4 border-t border-silk-beige">
                                            <p className="text-sm text-charcoal/70">
                                                Tu período de prueba termina en <span className="font-medium text-primary-600">
                                                    {Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} días
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handlePlanSelection('radiance')}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        Activar Suscripción
                                    </button>
                                    <button
                                        onClick={() => document.getElementById('compare-plans')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="btn-ghost text-charcoal/60"
                                    >
                                        Cambiar Plan
                                    </button>
                                </div>
                            </div>

                            {/* Plan Comparison */}
                            <div id="compare-plans" className="card-soft p-6">
                                <h2 className="text-lg font-semibold text-charcoal mb-6">Compara Planes</h2>

                                <div className="grid md:grid-cols-3 gap-4">
                                    {(Object.keys(PLANS) as PlanId[]).map((planId) => {
                                        const plan = PLANS[planId]
                                        const isCurrentPlan = planId === 'radiance'

                                        return (
                                            <div
                                                key={planId}
                                                className={cn(
                                                    "rounded-soft p-5 border-2 transition-all",
                                                    isCurrentPlan
                                                        ? "border-primary-500 bg-primary-500/5"
                                                        : "border-silk-beige hover:border-primary-300"
                                                )}
                                            >
                                                {'popular' in plan && plan.popular && (
                                                    <div className="flex justify-end mb-2">
                                                        <span className="px-2 py-1 bg-accent-500/10 text-accent-600 text-xs font-medium rounded-full flex items-center gap-1">
                                                            <Zap className="w-3 h-3" />
                                                            Popular
                                                        </span>
                                                    </div>
                                                )}

                                                <h3 className="text-lg font-semibold text-charcoal">{plan.name}</h3>
                                                <p className="text-2xl font-bold text-charcoal mt-2">
                                                    ${plan.price}
                                                    <span className="text-sm font-normal text-charcoal/50">/mes</span>
                                                </p>

                                                <ul className="mt-4 space-y-2">
                                                    {plan.features.map((feature, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-charcoal/70">
                                                            <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                <button
                                                    onClick={() => handlePlanSelection(planId)}
                                                    className={cn(
                                                        "w-full mt-4 py-2 rounded-soft font-medium transition-colors",
                                                        isCurrentPlan
                                                            ? "bg-primary-500 text-white"
                                                            : "bg-silk-beige text-charcoal hover:bg-primary-500 hover:text-white"
                                                    )}
                                                    disabled={isCurrentPlan}
                                                >
                                                    {isCurrentPlan ? 'Plan Actual' : 'Seleccionar'}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Usage Stats */}
                            <div className="card-soft p-6">
                                <h2 className="text-lg font-semibold text-charcoal mb-4">Uso del Mes</h2>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-charcoal/60">Citas agendadas</span>
                                            <span className="font-medium text-charcoal">
                                                {subscription?.monthlyUsed || 0} / {subscription?.monthlyLimit ? subscription.monthlyLimit : '∞'}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-silk-beige rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                                style={{ width: subscription?.monthlyLimit ? `${Math.min(100, ((subscription?.monthlyUsed || 0) / subscription.monthlyLimit) * 100)}%` : '0%' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-charcoal/60">Mensajes de IA</span>
                                            <span className="font-medium text-charcoal">0 / ∞</span>
                                        </div>
                                        <div className="h-2 bg-silk-beige rounded-full overflow-hidden">
                                            <div className="h-full bg-accent-500 rounded-full" style={{ width: '0%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Schedule Settings */}
                    {activeTab === 'schedule' && (
                        <div className="card-soft p-6">
                            <h2 className="text-lg font-semibold text-charcoal mb-6">Horarios de Atención</h2>

                            <div className="space-y-3">
                                {Object.entries(workingHours).map(([day, hours]) => (
                                    <div
                                        key={day}
                                        className="flex items-center gap-4 p-4 bg-ivory rounded-soft"
                                    >
                                        <div className="w-28">
                                            <p className="font-medium text-charcoal">{dayNames[day]}</p>
                                        </div>

                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={hours !== null}
                                                onChange={() => { }}
                                                className="w-4 h-4 rounded border-silk-beige text-primary-500 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-charcoal/60">Abierto</span>
                                        </label>

                                        {hours && (
                                            <>
                                                <input
                                                    type="time"
                                                    value={hours.open}
                                                    onChange={() => { }}
                                                    className="px-3 py-2 bg-white border border-silk-beige rounded-soft text-sm"
                                                />
                                                <span className="text-charcoal/40">a</span>
                                                <input
                                                    type="time"
                                                    value={hours.close}
                                                    onChange={() => { }}
                                                    className="px-3 py-2 bg-white border border-silk-beige rounded-soft text-sm"
                                                />
                                            </>
                                        )}

                                        {!hours && (
                                            <span className="text-sm text-charcoal/40">Cerrado</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-silk-beige flex items-center gap-4">
                                <button
                                    onClick={handleSaveSchedule}
                                    disabled={savingSchedule}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {savingSchedule ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Guardar Horarios</>
                                    )}
                                </button>
                                {scheduleSaved && (
                                    <div className="flex items-center gap-2 text-emerald-600 text-sm animate-fade-in bg-emerald-50 px-4 py-2 rounded-soft">
                                        <CheckCircle2 className="w-4 h-4" />
                                        ¡Horarios guardados!
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Integrations Settings */}
                    {activeTab === 'integrations' && (
                        <div className="space-y-6">
                            {/* YCloud */}
                            <div className="card-soft p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-soft flex items-center justify-center">
                                        <MessageSquare className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-charcoal">YCloud WhatsApp API</h2>
                                        <p className="text-sm text-charcoal/50">Conecta tu número de WhatsApp Business</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">API Key</label>
                                        <input
                                            type="password"
                                            placeholder="yc_xxxxxxxxxxxxxxxxxxxxxx"
                                            value={yCloudApiKey}
                                            onChange={(e) => setYCloudApiKey(e.target.value)}
                                            className="input-soft"
                                        />
                                        <p className="text-xs text-charcoal/40 mt-1">
                                            Obtén tu API Key desde <a href="https://www.ycloud.com" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">ycloud.com</a>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">Número de WhatsApp</label>
                                        <input
                                            type="text"
                                            placeholder="+521234567890"
                                            value={yCloudPhoneNumber}
                                            onChange={(e) => setYCloudPhoneNumber(e.target.value)}
                                            className="input-soft"
                                        />
                                        <p className="text-xs text-charcoal/40 mt-1">
                                            El número de WhatsApp Business registrado en YCloud (con código de país)
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">Webhook URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={webhookUrl}
                                                disabled
                                                className="input-soft bg-ivory text-charcoal/60 font-mono text-sm"
                                            />
                                            <button
                                                onClick={copyWebhookUrl}
                                                className="btn-ghost text-primary-500 flex items-center gap-1"
                                            >
                                                {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                {copiedWebhook ? 'Copiado' : 'Copiar'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-charcoal/40 mt-1">
                                            Configura esta URL como webhook en tu panel de YCloud (Developer → Webhooks)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* OpenAI */}
                            <div className="card-soft p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-violet-100 rounded-soft flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-violet-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-charcoal">OpenAI API</h2>
                                        <p className="text-sm text-charcoal/50">Configura el modelo de IA para el asistente</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal mb-2">API Key</label>
                                        <input
                                            type="password"
                                            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxx"
                                            value={openaiApiKey}
                                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                                            className="input-soft"
                                        />
                                        <p className="text-xs text-charcoal/40 mt-1">
                                            Obtén tu API Key desde <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">platform.openai.com</a>
                                        </p>
                                    </div>
                                    <div className="p-3 bg-violet-50 rounded-soft">
                                        <p className="text-sm text-violet-700">
                                            <strong>Modelo:</strong> GPT-4o (el más inteligente)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Webhooks / n8n */}
                            <div className="card-soft p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-orange-100 rounded-soft flex items-center justify-center">
                                            <Webhook className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-charcoal">Webhooks</h2>
                                            <p className="text-sm text-charcoal/50">Conecta con n8n, Make, Zapier y otras automatizaciones</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openWebhookModal()}
                                        className="btn-primary flex items-center gap-2 text-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Añadir Webhook
                                    </button>
                                </div>

                                {webhooks.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed border-silk-beige rounded-soft">
                                        <Globe className="w-10 h-10 text-charcoal/20 mx-auto mb-3" />
                                        <p className="text-charcoal/50 text-sm mb-1">No hay webhooks configurados</p>
                                        <p className="text-charcoal/40 text-xs">Añade un webhook para enviar eventos a herramientas externas como n8n</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {webhooks.map((wh) => (
                                            <div
                                                key={wh.id}
                                                className={cn(
                                                    'border rounded-soft p-4 transition-all',
                                                    wh.is_active
                                                        ? 'border-silk-beige bg-white hover:shadow-sm'
                                                        : 'border-gray-200 bg-gray-50/50 opacity-60'
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'w-2.5 h-2.5 rounded-full',
                                                            wh.is_active ? 'bg-emerald-400' : 'bg-gray-300'
                                                        )} />
                                                        <h3 className="font-medium text-charcoal text-sm">{wh.name}</h3>
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
                                                            className="p-1.5 rounded-soft hover:bg-ivory transition-colors"
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
                                                            className="p-1.5 rounded-soft hover:bg-ivory transition-colors"
                                                            title="Editar"
                                                        >
                                                            <ChevronRight className="w-4 h-4 text-charcoal/50" />
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
                                                <p className="text-xs text-charcoal/40 font-mono truncate mb-2 pl-5">{wh.url}</p>
                                                <div className="flex items-center gap-2 flex-wrap pl-5">
                                                    {wh.events.length > 0 ? wh.events.map(ev => (
                                                        <span key={ev} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">
                                                            {ev}
                                                        </span>
                                                    )) : (
                                                        <span className="text-xs text-charcoal/30">Sin eventos seleccionados</span>
                                                    )}
                                                    {wh.last_triggered_at && (
                                                        <span className="text-xs text-charcoal/30 ml-auto">
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
                                    <div className="bg-white rounded-soft shadow-premium-lg w-full max-w-lg animate-scale-in">
                                        <div className="flex items-center justify-between p-6 border-b border-silk-beige">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                                                    <Webhook className="w-5 h-5 text-orange-500" />
                                                </div>
                                                <h2 className="text-lg font-bold text-charcoal">
                                                    {editingWebhook ? 'Editar Webhook' : 'Nuevo Webhook'}
                                                </h2>
                                            </div>
                                            <button onClick={closeWebhookModal} className="p-2 hover:bg-ivory rounded-soft transition-colors">
                                                <X className="w-5 h-5 text-charcoal/50" />
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-5">
                                            <div>
                                                <label className="block text-sm font-medium text-charcoal mb-2">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={webhookForm.name}
                                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Ej: n8n - Notificaciones"
                                                    className="input-soft w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-charcoal mb-2">URL del Webhook</label>
                                                <input
                                                    type="url"
                                                    value={webhookForm.url}
                                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                                                    placeholder="https://tu-n8n-instance.com/webhook/..."
                                                    className="input-soft w-full font-mono text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-charcoal mb-2">Secret (opcional)</label>
                                                <input
                                                    type="password"
                                                    value={webhookForm.secret}
                                                    onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                                                    placeholder="Tu clave secreta para verificar webhooks"
                                                    className="input-soft w-full"
                                                />
                                                <p className="text-xs text-charcoal/40 mt-1">Se envía como header <code className="bg-ivory px-1 rounded text-xs">X-Webhook-Secret</code></p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-charcoal mb-2">Eventos a escuchar</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {WEBHOOK_EVENTS.map(ev => (
                                                        <label
                                                            key={ev.value}
                                                            className={cn(
                                                                'flex items-center gap-2 p-2.5 rounded-soft border cursor-pointer transition-all text-sm',
                                                                webhookForm.events.includes(ev.value)
                                                                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                                                                    : 'bg-white border-silk-beige text-charcoal/60 hover:bg-ivory'
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

                                        <div className="flex justify-end gap-3 p-6 border-t border-silk-beige">
                                            <button onClick={closeWebhookModal} className="btn-ghost">Cancelar</button>
                                            <button
                                                onClick={handleSaveWebhook}
                                                disabled={savingWebhook || !webhookForm.name.trim() || !webhookForm.url.trim()}
                                                className="btn-primary flex items-center gap-2"
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
                                    className="btn-primary flex items-center gap-2"
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
                        <div className="card-soft p-6">
                            <h2 className="text-lg font-semibold text-charcoal mb-2">Configuración de Notificaciones</h2>
                            <p className="text-sm text-charcoal/50 mb-6">Elige qué notificaciones recibir en tu panel</p>

                            {notificationsSaved && (
                                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-soft flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    <p className="text-sm text-emerald-700 font-medium">¡Preferencias de notificaciones guardadas exitosamente!</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                    <div>
                                        <p className="font-medium text-charcoal">🆕 Nuevas Citas</p>
                                        <p className="text-sm text-charcoal/50">Cuando se agenda una nueva cita</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.new_appointment}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, new_appointment: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                    <div>
                                        <p className="font-medium text-charcoal">✅ Citas Confirmadas</p>
                                        <p className="text-sm text-charcoal/50">Cuando un paciente confirma su cita</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.confirmed}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, confirmed: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                    <div>
                                        <p className="font-medium text-charcoal">❌ Citas Canceladas</p>
                                        <p className="text-sm text-charcoal/50">Cuando se cancela una cita</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.cancelled}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, cancelled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                    <div>
                                        <p className="font-medium text-charcoal">⏰ Recordatorios Pendientes</p>
                                        <p className="text-sm text-charcoal/50">Citas que necesitan confirmación</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.pending_reminder}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, pending_reminder: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                    <div>
                                        <p className="font-medium text-charcoal">💬 Nuevos Mensajes</p>
                                        <p className="text-sm text-charcoal/50">Mensajes que requieren atención</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.new_message}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, new_message: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                    <div>
                                        <p className="font-medium text-charcoal">⭐ Encuestas Respondidas</p>
                                        <p className="text-sm text-charcoal/50">Cuando un paciente responde una encuesta</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifPrefs.survey_response}
                                            onChange={(e) => setNotifPrefs({ ...notifPrefs, survey_response: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-silk-beige">
                                <button
                                    onClick={handleSaveNotifications}
                                    disabled={savingNotifications}
                                    className="btn-primary flex items-center gap-2"
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
                        <div className="card-soft p-6">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-soft flex items-center justify-center">
                                    <AlarmClock className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-charcoal">Configuración de Recordatorios</h2>
                                    <p className="text-sm text-charcoal/50">Personaliza cuándo y cómo enviar recordatorios</p>
                                </div>
                            </div>

                            {remindersSaved && (
                                <div className="my-6 p-4 bg-emerald-50 border border-emerald-200 rounded-soft flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    <p className="text-sm text-emerald-700 font-medium">¡Configuración de recordatorios guardada!</p>
                                </div>
                            )}

                            {/* Timing Section */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-charcoal mb-4">⏰ Tiempo de recordatorios</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                        <div>
                                            <p className="font-medium text-charcoal">24 horas antes</p>
                                            <p className="text-sm text-charcoal/50">Enviar recordatorio un día antes</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={reminderSettings.reminder_24h_before}
                                                onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_24h_before: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                        <div>
                                            <p className="font-medium text-charcoal">2 horas antes</p>
                                            <p className="text-sm text-charcoal/50">Recordatorio cercano a la cita</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={reminderSettings.reminder_2h_before}
                                                onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_2h_before: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                        <div>
                                            <p className="font-medium text-charcoal">1 hora antes</p>
                                            <p className="text-sm text-charcoal/50">Último recordatorio antes de la cita</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={reminderSettings.reminder_1h_before}
                                                onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_1h_before: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Preferred Hour */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-charcoal mb-4">🕐 Hora preferida de envío</h3>
                                <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                    <div>
                                        <p className="font-medium text-charcoal">Hora de recordatorios</p>
                                        <p className="text-sm text-charcoal/50">Para recordatorios de 24h, enviar a esta hora</p>
                                    </div>
                                    <input
                                        type="time"
                                        value={reminderSettings.preferred_hour}
                                        onChange={(e) => setReminderSettings({ ...reminderSettings, preferred_hour: e.target.value })}
                                        className="px-3 py-2 bg-white border border-silk-beige rounded-soft text-sm"
                                    />
                                </div>
                            </div>

                            {/* Confirmation Section */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-charcoal mb-4">✅ Solicitar confirmación</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                        <div>
                                            <p className="font-medium text-charcoal">Pedir confirmación</p>
                                            <p className="text-sm text-charcoal/50">Solicitar al paciente que confirme su asistencia</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={reminderSettings.request_confirmation}
                                                onChange={(e) => setReminderSettings({ ...reminderSettings, request_confirmation: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Message Template */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-charcoal mb-4">💬 Mensaje de recordatorio</h3>
                                <div className="p-4 bg-ivory rounded-soft">
                                    <textarea
                                        value={reminderSettings.reminder_message}
                                        onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_message: e.target.value })}
                                        rows={3}
                                        className="input-soft w-full resize-none"
                                        placeholder="Escribe el mensaje de recordatorio..."
                                    />
                                    <p className="text-xs text-charcoal/40 mt-2">
                                        Variables disponibles: {'{nombre}'}, {'{servicio}'}, {'{hora}'}, {'{fecha}'}
                                    </p>
                                </div>
                            </div>

                            {/* Follow-up Section */}
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-charcoal mb-4">📅 Seguimiento post-cita</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                        <div>
                                            <p className="font-medium text-charcoal">Recordatorio de seguimiento</p>
                                            <p className="text-sm text-charcoal/50">Enviar mensaje después de la cita para reagendar</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={reminderSettings.followup_enabled}
                                                onChange={(e) => setReminderSettings({ ...reminderSettings, followup_enabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-silk-beige rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                                        </label>
                                    </div>

                                    {reminderSettings.followup_enabled && (
                                        <>
                                            <div className="flex items-center justify-between p-4 bg-ivory rounded-soft">
                                                <div>
                                                    <p className="font-medium text-charcoal">Días después de la cita</p>
                                                    <p className="text-sm text-charcoal/50">Cuántos días esperar antes de enviar</p>
                                                </div>
                                                <select
                                                    value={reminderSettings.followup_days_after}
                                                    onChange={(e) => setReminderSettings({ ...reminderSettings, followup_days_after: parseInt(e.target.value) })}
                                                    className="px-3 py-2 bg-white border border-silk-beige rounded-soft text-sm"
                                                >
                                                    <option value={3}>3 días</option>
                                                    <option value={7}>7 días</option>
                                                    <option value={14}>14 días</option>
                                                    <option value={30}>30 días</option>
                                                </select>
                                            </div>

                                            <div className="p-4 bg-ivory rounded-soft">
                                                <label className="block text-sm font-medium text-charcoal mb-2">Mensaje de seguimiento</label>
                                                <textarea
                                                    value={reminderSettings.followup_message}
                                                    onChange={(e) => setReminderSettings({ ...reminderSettings, followup_message: e.target.value })}
                                                    rows={2}
                                                    className="input-soft w-full resize-none"
                                                    placeholder="Escribe el mensaje de seguimiento..."
                                                />
                                                <p className="text-xs text-charcoal/40 mt-2">
                                                    Variables: {'{nombre}'}, {'{dias}'}, {'{servicio}'}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-silk-beige">
                                <button
                                    onClick={handleSaveReminders}
                                    disabled={savingReminders}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {savingReminders ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Guardar Recordatorios</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}



                    {/* AI Settings */}
                    {activeTab === 'ai' && (
                        <div className="card-soft p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-violet-100 rounded-soft flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-violet-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-charcoal">Configuración de IA</h2>
                                    <p className="text-sm text-charcoal/50">Personaliza el comportamiento del Agente</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal mb-2">
                                        Instrucciones de Comportamiento (System Prompt)
                                    </label>
                                    <div className="bg-amber-50 border border-amber-200 rounded-soft p-4 mb-2 text-sm text-amber-800">
                                        <p className="font-medium mb-1">💡 Reglas que el Agente debe seguir</p>
                                        <p>Define aquí cómo debe comportarse el asistente, reglas de precios, contraindicaciones obligatorias, y flujo de conversación. Estas reglas se inyectan directamente en el "cerebro" de la IA.</p>
                                    </div>
                                    <textarea
                                        value={aiBehaviorRules}
                                        onChange={(e) => setAiBehaviorRules(e.target.value)}
                                        rows={15}
                                        placeholder="Ej: 1. Siempre saluda cordialmente. 2. No des precios a menos que pregunten..."
                                        className="input-soft w-full font-mono text-sm leading-relaxed"
                                    />
                                    <p className="text-xs text-charcoal/40 mt-2">
                                        Estas instrucciones tienen prioridad sobre el comportamiento base. Sé claro y específico.
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-silk-beige flex items-center gap-4">
                                    <button
                                        onClick={handleSaveAI}
                                        disabled={savingAI}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        {savingAI ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                        ) : (
                                            <><Save className="w-4 h-4" /> Guardar Reglas</>
                                        )}
                                    </button>
                                    {aiSaved && (
                                        <div className="flex items-center gap-2 text-emerald-600 text-sm animate-fade-in bg-emerald-50 px-4 py-2 rounded-soft">
                                            <CheckCircle2 className="w-4 h-4" />
                                            ¡Reglas actualizadas!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tags Settings */}
                    {activeTab === 'tags' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-lg font-semibold text-charcoal mb-1">Etiquetas de Pacientes</h2>
                                <p className="text-sm text-charcoal/50">Personaliza las etiquetas para organizar a tus pacientes.</p>
                            </div>
                            <TagManager />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

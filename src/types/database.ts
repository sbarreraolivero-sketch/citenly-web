export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            clinic_settings: {
                Row: {
                    id: string
                    clinic_name: string
                    services: Json
                    working_hours: Json
                    timezone: string
                    ycloud_api_key: string | null
                    ycloud_phone_number: string | null
                    openai_api_key: string | null
                    openai_model: string | null
                    ai_personality: string | null
                    ai_welcome_message: string | null
                    ai_auto_respond: boolean
                    reminders_enabled: boolean
                    reminders_time: string | null
                    reminders_hours_before: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    clinic_name: string
                    services?: Json
                    working_hours?: Json
                    timezone?: string
                    ycloud_api_key?: string | null
                    ycloud_phone_number?: string | null
                    openai_api_key?: string | null
                    openai_model?: string | null
                    ai_personality?: string | null
                    ai_welcome_message?: string | null
                    ai_auto_respond?: boolean
                    reminders_enabled?: boolean
                    reminders_time?: string | null
                    reminders_hours_before?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_name?: string
                    services?: Json
                    working_hours?: Json
                    timezone?: string
                    ycloud_api_key?: string | null
                    ycloud_phone_number?: string | null
                    openai_api_key?: string | null
                    openai_model?: string | null
                    ai_personality?: string | null
                    ai_welcome_message?: string | null
                    ai_auto_respond?: boolean
                    reminders_enabled?: boolean
                    reminders_time?: string | null
                    reminders_hours_before?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            appointments: {
                Row: {
                    id: string
                    clinic_id: string | null
                    patient_name: string
                    phone_number: string
                    service: string | null
                    appointment_date: string
                    duration: number
                    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
                    notes: string | null
                    reminder_sent: boolean
                    reminder_sent_at: string | null
                    confirmation_received: boolean
                    confirmation_response: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    clinic_id?: string | null
                    patient_name: string
                    phone_number: string
                    service?: string | null
                    appointment_date: string
                    duration?: number
                    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
                    notes?: string | null
                    reminder_sent?: boolean
                    reminder_sent_at?: string | null
                    confirmation_received?: boolean
                    confirmation_response?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string | null
                    patient_name?: string
                    phone_number?: string
                    service?: string | null
                    appointment_date?: string
                    duration?: number
                    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
                    notes?: string | null
                    reminder_sent?: boolean
                    reminder_sent_at?: string | null
                    confirmation_received?: boolean
                    confirmation_response?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            messages: {
                Row: {
                    id: string
                    clinic_id: string | null
                    phone_number: string
                    direction: 'inbound' | 'outbound'
                    content: string
                    message_type: string
                    ycloud_message_id: string | null
                    ycloud_status: string | null
                    ai_generated: boolean
                    ai_function_called: string | null
                    ai_function_result: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    clinic_id?: string | null
                    phone_number: string
                    direction: 'inbound' | 'outbound'
                    content: string
                    message_type?: string
                    ycloud_message_id?: string | null
                    ycloud_status?: string | null
                    ai_generated?: boolean
                    ai_function_called?: string | null
                    ai_function_result?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string | null
                    phone_number?: string
                    direction?: 'inbound' | 'outbound'
                    content?: string
                    message_type?: string
                    ycloud_message_id?: string | null
                    ycloud_status?: string | null
                    ai_generated?: boolean
                    ai_function_called?: string | null
                    ai_function_result?: Json | null
                    created_at?: string
                }
            }
            user_profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string
                    clinic_id: string | null
                    role: 'admin' | 'staff' | 'super_admin'
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name: string
                    clinic_id?: string | null
                    role?: 'admin' | 'staff' | 'super_admin'
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string
                    clinic_id?: string | null
                    role?: 'admin' | 'staff' | 'super_admin'
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            subscriptions: {
                Row: {
                    id: string
                    clinic_id: string | null
                    plan: 'essence' | 'radiance' | 'prestige' | 'trial'
                    status: 'active' | 'cancelled' | 'past_due' | 'trial'
                    mercadopago_subscription_id: string | null
                    current_period_start: string | null
                    current_period_end: string | null
                    trial_ends_at: string | null
                    monthly_appointments_limit: number | null
                    monthly_appointments_used: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    clinic_id?: string | null
                    plan: 'essence' | 'radiance' | 'prestige' | 'trial'
                    status?: 'active' | 'cancelled' | 'past_due' | 'trial'
                    mercadopago_subscription_id?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    trial_ends_at?: string | null
                    monthly_appointments_limit?: number | null
                    monthly_appointments_used?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string | null
                    plan?: 'essence' | 'radiance' | 'prestige' | 'trial'
                    status?: 'active' | 'cancelled' | 'past_due' | 'trial'
                    mercadopago_subscription_id?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    trial_ends_at?: string | null
                    monthly_appointments_limit?: number | null
                    monthly_appointments_used?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            patients: {
                Row: {
                    id: string
                    clinic_id: string | null
                    phone_number: string
                    name: string | null
                    email: string | null
                    address: string | null
                    service: string | null
                    notes: string | null
                    total_appointments: number
                    last_appointment_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    clinic_id?: string | null
                    phone_number: string
                    name?: string | null
                    email?: string | null
                    address?: string | null
                    service?: string | null
                    notes?: string | null
                    total_appointments?: number
                    last_appointment_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string | null
                    phone_number?: string
                    name?: string | null
                    email?: string | null
                    address?: string | null
                    service?: string | null
                    notes?: string | null
                    total_appointments?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            clinical_records: {
                Row: {
                    id: string
                    clinic_id: string | null
                    patient_id: string | null
                    date: string
                    treatment_name: string
                    description: string | null
                    notes: string | null
                    attachments: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    clinic_id?: string | null
                    patient_id?: string | null
                    date: string
                    treatment_name: string
                    description?: string | null
                    notes?: string | null
                    attachments?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string | null
                    patient_id?: string | null
                    date?: string
                    treatment_name?: string
                    description?: string | null
                    notes?: string | null
                    attachments?: Json | null
                    created_at?: string
                    updated_at?: string
                }
            }
            tags: {
                Row: {
                    id: string
                    clinic_id: string | null
                    name: string
                    color: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    clinic_id?: string | null
                    name: string
                    color: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    clinic_id?: string | null
                    name?: string
                    color?: string
                    created_at?: string
                }
            }
            patient_tags: {
                Row: {
                    id: string
                    patient_id: string | null
                    tag_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    patient_id?: string | null
                    tag_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    patient_id?: string | null
                    tag_id?: string | null
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}

// Derived types for easier use
export type ClinicSettings = Database['public']['Tables']['clinic_settings']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type Message = Database['public']['Tables']['messages']['Row']

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type MessageDirection = 'inbound' | 'outbound'

// Service type
export interface Service {
    id: string
    name: string
    duration: number // in minutes
    price: number
}

// Working hours type
export interface WorkingHours {
    [day: string]: {
        open: string // "09:00"
        close: string // "18:00"
        breaks?: { start: string; end: string }[]
    } | null // null means closed
}

// Conversation type for UI
export interface Conversation {
    phone_number: string
    patient_name?: string
    last_message: string
    last_message_at: string
    unread_count?: number
}

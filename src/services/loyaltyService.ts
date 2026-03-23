import { supabase } from '@/lib/supabase'

export interface LoyaltyStats {
    total_points: number
    active_points: number
    redeemed_points: number
    referral_count: number
    referral_earnings: number
}

export interface LoyaltyTransaction {
    id: string
    patient_id: string
    type: 'earn' | 'redeem' | 'adjustment' | 'referral_bonus'
    points: number
    description: string
    created_at: string
}

export interface LoyaltySettings {
    loyalty_enabled: boolean
    loyalty_points_percentage: number
    loyalty_referral_bonus: number
    loyalty_welcome_bonus: number
}

export const loyaltyService = {
    // Get stats for a patient
    async getPatientLoyalty(patientId: string) {
        const { data, error } = await supabase
            .from('patients')
            .select('loyalty_points, referral_code, referral_count')
            .eq('id', patientId)
            .single()
        if (error) throw error
        return data
    },

    // Get transactions for a patient
    async getTransactions(patientId: string): Promise<LoyaltyTransaction[]> {
        const { data, error } = await supabase
            .from('loyalty_transactions')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data as LoyaltyTransaction[]
    },

    // Add or Remove points (Adjustment)
    async adjustPoints(clinicId: string, patientId: string, points: number, description: string) {
        const { error: txError } = await (supabase as any)
            .from('loyalty_transactions')
            .insert({
                clinic_id: clinicId,
                patient_id: patientId,
                type: 'adjustment',
                points: points,
                description: description
            })
        if (txError) throw txError

        // Update patient balance
        const { error: pError } = await (supabase as any).rpc('increment_loyalty_points', {
            p_patient_id: patientId,
            p_amount: points
        })
        if (pError) throw pError
    },

    // Get clinic settings for loyalty
    async getSettings(clinicId: string): Promise<LoyaltySettings> {
        const { data, error } = await supabase
            .from('clinic_settings')
            .select('loyalty_enabled, loyalty_points_percentage, loyalty_referral_bonus, loyalty_welcome_bonus')
            .eq('id', clinicId)
            .single()
        if (error) throw error
        return data as LoyaltySettings
    },

    // Update loyalty settings
    async updateSettings(clinicId: string, settings: Partial<LoyaltySettings>) {
        const { error } = await (supabase as any)
            .from('clinic_settings')
            .update(settings)
            .eq('id', clinicId)
        if (error) throw error
    },

    // Generate WhatsApp message with variables for points
    // This is a helper for the trigger logic
    formatLoyaltyMessage(template: string, patientName: string, points: number, treatment?: string) {
        // Simple client-side preview, actual replacement happens in Supabase Edge Function
        return template
            .replace('{{1}}', patientName)
            .replace('{{7}}', points.toString())
            .replace('{{4}}', treatment || 'tu tratamiento')
    }
}

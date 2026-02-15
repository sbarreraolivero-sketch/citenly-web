
import { supabase } from '@/lib/supabase'

export type UserRole = 'owner' | 'professional' | 'receptionist'
export type MemberStatus = 'active' | 'invited' | 'disabled'

export interface ClinicMember {
    id: string
    clinic_id: string
    user_id: string | null
    email: string
    role: UserRole
    status: MemberStatus
    first_name?: string
    last_name?: string
    specialty?: string
    color?: string
    created_at: string
}

export const teamService = {
    async getMembers(clinicId: string) {
        const { data, error } = await supabase
            .from('clinic_members')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as ClinicMember[]
    },

    async inviteMember(clinicId: string, email: string, role: UserRole, firstName?: string) {
        const { data, error } = await supabase.rpc('invite_member_v2', {
            p_clinic_id: clinicId,
            p_email: email,
            p_role: role,
            p_first_name: firstName
        })

        if (error) throw error
        return data
    },

    async updateMember(id: string, updates: Partial<ClinicMember>) {
        const { data, error } = await supabase
            .from('clinic_members')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as ClinicMember
    },

    async deleteMember(id: string) {
        const { error } = await supabase
            .from('clinic_members')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // Get current user's member profile
    async getCurrentMember() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data, error } = await supabase
            .from('clinic_members')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single()

        // If no member found, it might be an issue or first login after migration without trigger.
        // We handle null gracefully.
        if (error && error.code !== 'PGRST116') throw error
        return data as ClinicMember | null
    },

    async getClinicSettings(clinicId: string) {
        const { data, error } = await supabase
            .from('clinic_settings')
            .select('*')
            .eq('id', clinicId)
            .single()

        if (error) throw error
        return data
    }
}

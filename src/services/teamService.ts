
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
        // Use RPC to bypass potential RLS issues and ensure consistent data access
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_clinic_members_secure', {
            p_clinic_id: clinicId
        })

        if (error) {
            console.error('Error fetching members via RPC:', error)
            throw error
        }

        return data as ClinicMember[]
    },

    async inviteMember(clinicId: string, email: string, role: UserRole, firstName?: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('invite_member_v2', {
            p_clinic_id: clinicId,
            p_email: email,
            p_role: role,
            p_first_name: firstName
        })

        if (error) throw error
        return data
    },

    async updateMember(id: string, updates: Partial<ClinicMember>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('clinic_members') as any)
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
        try {
            // Use RPC to bypass potential RLS complexity and ensure correct retrieval
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc('get_myself_clinical_member')

            if (error) {
                console.error('Error fetching member via RPC:', error)
                return null
            }

            return data as ClinicMember | null
        } catch (err) {
            console.error('getCurrentMember exception:', err)
            return null
        }
    },

    async getClinicSettings(clinicId: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_clinic_settings_secure', {
            p_clinic_id: clinicId
        })

        if (error) {
            console.error('Error fetching settings via RPC:', error)
            throw error
        }

        // RPC returns array (SETOF), take first
        return data && data.length > 0 ? data[0] : null
    },

    async createBranch(name: string, address?: string) {
        const { data, error } = await supabase.rpc('create_clinic_branch', {
            p_name: name,
            p_address: address
        })

        if (error) throw error
        return data
    }
}

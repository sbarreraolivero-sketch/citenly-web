
import { supabase } from '@/lib/supabase'

export interface Expense {
    id: string
    clinic_id: string
    description: string
    amount: number
    category: 'rent' | 'supplies' | 'payroll' | 'marketing' | 'utilities' | 'other'
    date: string
    created_at: string
}

export interface FinanceStats {
    total_income: number
    total_expenses: number
    net_profit: number
    pending_payments: number
    appointments_count: number
}

export const financeService = {
    // Get Finance Stats via RPC
    async getStats(clinicId: string, startDate: Date, endDate: Date) {
        const { data, error } = await (supabase as any).rpc('get_finance_stats', {
            p_clinic_id: clinicId,
            p_start_date: startDate.toISOString(),
            p_end_date: endDate.toISOString()
        })

        if (error) throw error
        // RPC returns an array of one object
        return data?.[0] as FinanceStats
    },

    // Expenses CRUD
    async getExpenses(clinicId: string) {
        const { data, error } = await (supabase as any)
            .from('expenses')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('date', { ascending: false })

        if (error) throw error
        return data as Expense[]
    },

    async addExpense(expense: Omit<Expense, 'id' | 'created_at'>) {
        const { data, error } = await (supabase as any)
            .from('expenses')
            .insert(expense)
            .select()
            .single()

        if (error) throw error
        return data as Expense
    },

    async updateExpense(id: string, updates: Partial<Expense>) {
        const { data, error } = await (supabase as any)
            .from('expenses')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as Expense
    },

    async deleteExpense(id: string) {
        const { error } = await (supabase as any)
            .from('expenses')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // Transactions (Completed Appointments)
    async getTransactions(clinicId: string) {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', clinicId)
            .in('status', ['completed', 'confirmed']) // Confirmed might be paid too
            .order('appointment_date', { ascending: false })
            .limit(50)

        if (error) throw error
        return data
    },

    async updatePaymentStatus(appointmentId: string, status: string, method?: string) {
        const updates: any = { payment_status: status }
        if (method) updates.payment_method = method

        const { data, error } = await (supabase as any)
            .from('appointments')
            .update(updates)
            .eq('id', appointmentId)
            .select()
            .single()

        if (error) throw error
        return data
    }
}

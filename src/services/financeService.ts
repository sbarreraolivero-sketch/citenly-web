
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_clinic_expenses_secure', {
            p_clinic_id: clinicId
        })

        if (error) throw error
        return data as Expense[]
    },

    async addExpense(expense: Omit<Expense, 'id' | 'created_at'>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('create_clinic_expense', {
            p_clinic_id: expense.clinic_id,
            p_description: expense.description,
            p_amount: expense.amount,
            p_category: expense.category,
            p_date: expense.date
        })

        if (error) throw error
        return data?.[0] as Expense
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_clinic_transactions_secure', {
            p_clinic_id: clinicId
        })

        if (error) throw error
        return data
    },

    async updatePaymentStatus(appointmentId: string, status: string, method?: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('update_appointment_payment_status', {
            p_appointment_id: appointmentId,
            p_status: status
        })

        if (error) throw error
        return data?.[0]
    }
}


import { useState, useEffect } from 'react'
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Plus,
    Download,
    X
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import { financeService, type FinanceStats, type Expense } from '@/services/financeService'
import { cn } from '@/lib/utils'

const Finance = () => {
    const { profile } = useAuth()
    const [stats, setStats] = useState<FinanceStats | null>(null)
    const [expenses, setExpenses] = useState<Expense[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'expenses'>('dashboard')
    const [showExpenseModal, setShowExpenseModal] = useState(false)

    useEffect(() => {
        loadData()
    }, [profile?.clinic_id])

    const loadData = async () => {
        if (!profile?.clinic_id) return
        setLoading(true)
        try {
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

            const [statsData, expensesData, transactionsData] = await Promise.all([
                financeService.getStats(profile.clinic_id, startOfMonth, endOfMonth),
                financeService.getExpenses(profile.clinic_id),
                financeService.getTransactions(profile.clinic_id)
            ])

            setStats(statsData)
            setExpenses(expensesData)
            setTransactions(transactionsData || [])
        } catch (error) {
            console.error('Error loading finance data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile?.clinic_id) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = e.target as any
        const description = form.description.value
        const amount = parseFloat(form.amount.value)
        const category = form.category.value
        const date = form.date.value

        try {
            await financeService.addExpense({
                clinic_id: profile.clinic_id,
                description,
                amount,
                category,
                date: new Date(date).toISOString()
            })
            toast.success('Gasto registrado exitosamente')
            setShowExpenseModal(false)
            loadData()
        } catch (error) {
            console.error('Error adding expense:', error)
            toast.error('Error al registrar el gasto')
        }
    }

    const handleRegisterPayment = async (appointmentId: string) => {
        try {
            await financeService.updatePaymentStatus(appointmentId, 'paid')
            toast.success('Pago registrado')
            loadData()
        } catch (error) {
            console.error('Error registering payment:', error)
            toast.error('Error al registrar el pago')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-charcoal">Finanzas</h1>
                    <p className="text-charcoal/60">Gestiona los ingresos y gastos de tu clínica</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportar</span>
                    </button>
                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Gasto</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-soft p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        {/* 
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            +12.5%
                        </span>
                        */}
                    </div>
                    <p className="text-sm text-charcoal/60">Ingresos (Mes)</p>
                    <p className="text-2xl font-bold text-charcoal mt-1">
                        {loading ? '...' : formatCurrency(stats?.total_income || 0)}
                    </p>
                </div>

                <div className="card-soft p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                    <p className="text-sm text-charcoal/60">Gastos (Mes)</p>
                    <p className="text-2xl font-bold text-charcoal mt-1">
                        {loading ? '...' : formatCurrency(stats?.total_expenses || 0)}
                    </p>
                </div>

                <div className="card-soft p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-charcoal/40 bg-gray-100 px-2 py-1 rounded-full">
                            Neto
                        </span>
                    </div>
                    <p className="text-sm text-charcoal/60">Ganancia Neta</p>
                    <p className={cn(
                        "text-2xl font-bold mt-1",
                        (stats?.net_profit || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                        {loading ? '...' : formatCurrency(stats?.net_profit || 0)}
                    </p>
                </div>

                <div className="card-soft p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            {stats?.appointments_count || 0} Citas
                        </span>
                    </div>
                    <p className="text-sm text-charcoal/60">Por Cobrar</p>
                    <p className="text-2xl font-bold text-charcoal mt-1">
                        {loading ? '...' : formatCurrency(stats?.pending_payments || 0)}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-soft border-b border-silk-beige px-6 sticky top-0 z-10">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={cn(
                            "py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === 'dashboard'
                                ? "border-primary-500 text-primary-600"
                                : "border-transparent text-charcoal/60 hover:text-charcoal"
                        )}
                    >
                        Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={cn(
                            "py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === 'transactions'
                                ? "border-primary-500 text-primary-600"
                                : "border-transparent text-charcoal/60 hover:text-charcoal"
                        )}
                    >
                        Transacciones
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={cn(
                            "py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === 'expenses'
                                ? "border-primary-500 text-primary-600"
                                : "border-transparent text-charcoal/60 hover:text-charcoal"
                        )}
                    >
                        Gastos
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-6">
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart Placeholders */}
                        <div className="lg:col-span-2 card-soft p-6">
                            <h3 className="font-semibold text-charcoal mb-4">Ingresos vs Gastos</h3>
                            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-soft border border-dashed border-gray-200">
                                <p className="text-charcoal/40 text-sm">Gráfico de barras (Próximamente)</p>
                            </div>
                        </div>

                        {/* Recent Transactions Mini List */}
                        <div className="card-soft p-6">
                            <h3 className="font-semibold text-charcoal mb-4">Recientes</h3>
                            <div className="space-y-4">
                                {transactions.slice(0, 5).map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                                                <DollarSign className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-charcoal">{tx.patient_name}</p>
                                                <p className="text-xs text-charcoal/50">{format(new Date(tx.appointment_date), 'd MMM')}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "font-medium",
                                            tx.price > 0 ? "text-emerald-600" : "text-charcoal/60"
                                        )}>
                                            +{formatCurrency(tx.price || 0)}
                                        </span>
                                    </div>
                                ))}
                                {transactions.length === 0 && (
                                    <p className="text-sm text-charcoal/50 text-center py-4">No hay transacciones recientes</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div className="card-soft overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-silk-beige/30 text-charcoal/70 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Fecha</th>
                                        <th className="px-6 py-3 font-medium">Paciente</th>
                                        <th className="px-6 py-3 font-medium">Servicio</th>
                                        <th className="px-6 py-3 font-medium">Monto</th>
                                        <th className="px-6 py-3 font-medium">Estado</th>
                                        <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-silk-beige">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-ivory/50">
                                            <td className="px-6 py-3 text-charcoal/80">
                                                {format(new Date(tx.appointment_date), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-charcoal">
                                                {tx.patient_name}
                                            </td>
                                            <td className="px-6 py-3 text-charcoal/60">
                                                {tx.service || '-'}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-charcoal">
                                                {formatCurrency(tx.price || 0)}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-medium",
                                                    tx.payment_status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                                                        tx.payment_status === 'pending' ? "bg-amber-100 text-amber-700" :
                                                            "bg-gray-100 text-gray-600"
                                                )}>
                                                    {tx.payment_status === 'paid' ? 'Pagado' :
                                                        tx.payment_status === 'pending' ? 'Pendiente' : tx.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                {tx.payment_status === 'pending' && (
                                                    <button
                                                        className="text-xs text-primary-600 font-medium hover:underline"
                                                        onClick={() => handleRegisterPayment(tx.id)}
                                                    >
                                                        Registrar Pago
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-charcoal/50">
                                                No se encontraron transacciones
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="card-soft overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-silk-beige/30 text-charcoal/70 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Fecha</th>
                                        <th className="px-6 py-3 font-medium">Concepto</th>
                                        <th className="px-6 py-3 font-medium">Categoría</th>
                                        <th className="px-6 py-3 font-medium text-right">Monto</th>
                                        <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-silk-beige">
                                    {expenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-ivory/50">
                                            <td className="px-6 py-3 text-charcoal/80">
                                                {format(new Date(expense.date), 'dd/MM/yyyy', { locale: es })}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-charcoal">
                                                {expense.description}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="bg-gray-100 text-charcoal/70 px-2 py-1 rounded text-xs capitalize">
                                                    {expense.category === 'rent' ? 'Alquiler' :
                                                        expense.category === 'supplies' ? 'Insumos' :
                                                            expense.category === 'payroll' ? 'Nómina' :
                                                                expense.category === 'marketing' ? 'Marketing' :
                                                                    expense.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 font-medium text-right text-red-600">
                                                -{formatCurrency(expense.amount)}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button className="text-charcoal/40 hover:text-red-500">
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-charcoal/50">
                                                No hay gastos registrados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Gastos */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-charcoal/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-soft w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-charcoal">Registrar Nuevo Gasto</h3>
                            <button onClick={() => setShowExpenseModal(false)}>
                                <X className="w-5 h-5 text-charcoal/50 hover:text-charcoal" />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Descripción</label>
                                <input
                                    name="description"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Ej. Compra de insumos"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal mb-1">Monto</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal mb-1">Fecha</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Categoría</label>
                                <select
                                    name="category"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="supplies">Insumos</option>
                                    <option value="rent">Alquiler</option>
                                    <option value="payroll">Nómina</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="utilities">Servicios Básicos</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowExpenseModal(false)}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    Guardar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Finance

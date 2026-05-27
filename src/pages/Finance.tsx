
import { useState, useEffect, useRef } from 'react'
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Plus,
    Download,
    X,
    FileText,
    ChevronDown,
    Trash2,
    Calendar,
    Lightbulb,
    Pencil,
    Check,
    Search,
    User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useClinicTimezone } from '@/hooks/useClinicTimezone'
import { financeService, type FinanceStats, type Expense, type Income } from '@/services/financeService'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { GuideBox } from '@/components/ui/GuideBox'

const CATEGORY_LABELS_EXPENSE: Record<string, string> = {
    rent: 'Alquiler',
    supplies: 'Insumos',
    payroll: 'Nómina',
    marketing: 'Marketing',
    utilities: 'Servicios Básicos',
    other: 'Otro',
}

const CATEGORY_LABELS_INCOME: Record<string, string> = {
    service: 'Servicio',
    product: 'Producto',
    adjustment: 'Ajuste',
    other: 'Otro',
}

const STATUS_LABELS: Record<string, string> = {
    paid: 'Pagado',
    pending: 'Pendiente',
    partial: 'Parcial',
    refunded: 'Reembolsado',
}

const translateCategoryExpense = (cat: string) => CATEGORY_LABELS_EXPENSE[cat] ?? cat
const translateCategoryIncome = (cat: string) => CATEGORY_LABELS_INCOME[cat] ?? cat
const translateStatus = (st: string) => STATUS_LABELS[st] ?? st

// parseLocalDate now comes from useClinicTimezone hook

// ── Component ────────────────────────────────────────────────────────
const Finance = () => {
    const { profile, member } = useAuth()
    const clinicId = member?.clinic_id || profile?.clinic_id
    const clinicName = (member as any)?.clinic_name || (profile as any)?.clinic_name || 'Clínica'

    // Timezone-aware date utilities from clinic settings
    const {
        timezone,
        formatInTz,
        getDateRange,
        getDateRangeLabel,
    } = useClinicTimezone()

    const [stats, setStats] = useState<FinanceStats | null>(null)
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [incomes, setIncomes] = useState<Income[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'expenses' | 'incomes'>('dashboard')
    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const [showIncomeModal, setShowIncomeModal] = useState(false)
    const [filterType, setFilterType] = useState<'day' | 'week' | 'month' | 'year'>('month')
    const [showExportMenu, setShowExportMenu] = useState(false)

    // Patient selector for income modal
    const [incomePatientSearch, setIncomePatientSearch] = useState('')
    const [incomePatientName, setIncomePatientName] = useState('')
    const [patientSuggestions, setPatientSuggestions] = useState<{ id: string; name: string }[]>([])
    const [showPatientSuggestions, setShowPatientSuggestions] = useState(false)

    // Inline amount editing for transactions
    const [editingAmountId, setEditingAmountId] = useState<string | null>(null)
    const [editingAmountValue, setEditingAmountValue] = useState('')

    const exportMenuRef = useRef<HTMLDivElement>(null)

    // ── Close export dropdown on click-outside ──
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false)
            }
        }
        if (showExportMenu) {
            document.addEventListener('mousedown', handler)
        }
        return () => document.removeEventListener('mousedown', handler)
    }, [showExportMenu])

    const getFilterLabel = () => {
        switch (filterType) {
            case 'day': return 'Hoy'
            case 'week': return 'Semana'
            case 'month': return 'Mes'
            case 'year': return 'Año'
        }
    }

    // ── Data loading ──
    useEffect(() => {
        loadData()
    }, [clinicId, filterType, timezone])

    const loadData = async () => {
        if (!clinicId) return
        setLoading(true)
        try {
            const { start, end } = getDateRange(filterType)

            const [statsData, expensesData, incomesData, transactionsData] = await Promise.all([
                financeService.getStats(clinicId, start, end),
                financeService.getExpenses(clinicId, start, end),
                financeService.getIncomes(clinicId, start, end),
                financeService.getTransactions(clinicId, start, end)
            ])

            setStats(statsData)
            setExpenses(expensesData)
            setIncomes(incomesData)
            setTransactions(transactionsData || [])
        } catch (error) {
            console.error('Error loading finance data:', error)
        } finally {
            setLoading(false)
        }
    }

    // ── Currency formatter ──
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    // ── Patient search for income modal ──
    useEffect(() => {
        if (!incomePatientSearch.trim() || incomePatientSearch.length < 2) {
            setPatientSuggestions([])
            return
        }
        const search = async () => {
            const { data } = await (supabase as any)
                .from('patients')
                .select('id, first_name, last_name')
                .eq('clinic_id', clinicId)
                .ilike('first_name', `%${incomePatientSearch}%`)
                .limit(6)
            if (data) {
                setPatientSuggestions(data.map((p: any) => ({ id: p.id, name: `${p.first_name} ${p.last_name || ''}`.trim() })))
                setShowPatientSuggestions(true)
            }
        }
        const t = setTimeout(search, 250)
        return () => clearTimeout(t)
    }, [incomePatientSearch, clinicId])

    // ── Inline amount editing ──
    const handleSaveAmount = async (appointmentId: string) => {
        const amount = parseFloat(editingAmountValue)
        if (isNaN(amount) || amount < 0) return
        try {
            await financeService.updateTransactionPrice(appointmentId, amount)
            toast.success('Monto actualizado')
            setEditingAmountId(null)
            loadData()
        } catch {
            toast.error('Error al actualizar el monto')
        }
    }

    // ── Export handlers ──
    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 100)
    }

    const handleExport = (type: 'csv' | 'json') => {
        try {
            const periodLabel = getDateRangeLabel(filterType)
            const dateStamp = formatInTz(new Date(), 'yyyy-MM-dd')

            if (type === 'json') {
                const data = {
                    reporte: {
                        clinica: clinicName,
                        periodo: periodLabel,
                        filtro: getFilterLabel(),
                        generado: formatInTz(new Date(), 'dd/MM/yyyy HH:mm')
                    },
                    resumen: {
                        ingresos: stats?.total_income ?? 0,
                        gastos: stats?.total_expenses ?? 0,
                        ganancia_neta: stats?.net_profit ?? 0,
                        por_cobrar: stats?.pending_payments ?? 0,
                        total_citas: stats?.appointments_count ?? 0
                    },
                    transacciones: transactions.map(tx => ({
                        fecha: formatInTz(tx.appointment_date, 'dd/MM/yyyy HH:mm'),
                        paciente: tx.patient_name,
                        servicio: tx.service || '-',
                        monto: tx.price ?? 0,
                        estado: translateStatus(tx.payment_status),
                        metodo_pago: tx.payment_method || 'N/A'
                    })),
                    gastos: expenses.map(exp => ({
                        fecha: formatInTz(exp.date, 'dd/MM/yyyy'),
                        descripcion: exp.description,
                        categoria: translateCategoryExpense(exp.category),
                        monto: exp.amount
                    })),
                    ingresos_manuales: incomes.map(inc => ({
                        fecha: formatInTz(inc.date, 'dd/MM/yyyy'),
                        descripcion: inc.description,
                        categoria: translateCategoryIncome(inc.category),
                        monto: inc.amount
                    }))
                }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                downloadBlob(blob, `reporte_finanzas_${dateStamp}.json`)
            } else {
                // ── CSV generation ──
                const lines: string[] = []
                const sep = ','

                // Report header
                lines.push(`REPORTE FINANCIERO - ${clinicName}`)
                lines.push(`Período: ${periodLabel}`)
                lines.push(`Generado: ${formatInTz(new Date(), 'dd/MM/yyyy HH:mm')}`)
                lines.push('')

                // Summary
                lines.push('RESUMEN')
                lines.push(`Ingresos${sep}${formatCurrency(stats?.total_income ?? 0)}`)
                lines.push(`Gastos${sep}${formatCurrency(stats?.total_expenses ?? 0)}`)
                lines.push(`Ganancia Neta${sep}${formatCurrency(stats?.net_profit ?? 0)}`)
                lines.push(`Por Cobrar${sep}${formatCurrency(stats?.pending_payments ?? 0)}`)
                lines.push(`Total Citas${sep}${stats?.appointments_count ?? 0}`)
                lines.push('')

                // Transactions
                lines.push('TRANSACCIONES')
                lines.push(`Fecha${sep}Paciente${sep}Servicio${sep}Monto${sep}Estado${sep}Método de Pago`)
                if (transactions.length > 0) {
                    transactions.forEach(tx => {
                        lines.push([
                            formatInTz(tx.appointment_date, 'dd/MM/yyyy HH:mm'),
                            `"${(tx.patient_name || '').replace(/"/g, '""')}"`,
                            `"${(tx.service || '-').replace(/"/g, '""')}"`,
                            formatCurrency(tx.price ?? 0),
                            translateStatus(tx.payment_status),
                            tx.payment_method || 'N/A'
                        ].join(sep))
                    })
                } else {
                    lines.push('Sin transacciones en este período')
                }
                lines.push('')

                // Expenses
                lines.push('GASTOS')
                lines.push(`Fecha${sep}Descripción${sep}Categoría${sep}Monto`)
                if (expenses.length > 0) {
                    expenses.forEach(exp => {
                        lines.push([
                            formatInTz(exp.date, 'dd/MM/yyyy'),
                            `"${exp.description.replace(/"/g, '""')}"`,
                            translateCategoryExpense(exp.category),
                            formatCurrency(exp.amount)
                        ].join(sep))
                    })
                } else {
                    lines.push('Sin gastos en este período')
                }
                lines.push('')

                // Manual Incomes
                lines.push('INGRESOS MANUALES')
                lines.push(`Fecha${sep}Descripción${sep}Categoría${sep}Monto`)
                if (incomes.length > 0) {
                    incomes.forEach(inc => {
                        lines.push([
                            formatInTz(inc.date, 'dd/MM/yyyy'),
                            `"${inc.description.replace(/"/g, '""')}"`,
                            translateCategoryIncome(inc.category),
                            formatCurrency(inc.amount)
                        ].join(sep))
                    })
                } else {
                    lines.push('Sin ingresos manuales en este período')
                }

                const csvContent = '\uFEFF' + lines.join('\n') // BOM for Excel compatibility
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                downloadBlob(blob, `reporte_finanzas_${filterType}_${dateStamp}.csv`)
            }
            setShowExportMenu(false)
            toast.success('Exportación completada')
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Error al exportar datos')
        }
    }

    // ── Expense handlers ──
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clinicId) {
            toast.error('No se pudo identificar la clínica')
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = e.target as any
        const description = form.description.value
        const amount = parseFloat(form.amount.value)
        const category = form.category.value
        const date = form.date.value

        try {
            await financeService.addExpense({
                clinic_id: clinicId,
                description,
                amount,
                category,
                date
            })
            toast.success('Gasto registrado exitosamente')
            setShowExpenseModal(false)
            loadData()
        } catch (error) {
            console.error('Error adding expense:', error)
            toast.error('Error al registrar el gasto')
        }
    }

    const handleDeleteExpense = async (expenseId: string, description: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar el gasto "${description}"?`)) return

        try {
            await financeService.deleteExpense(expenseId)
            toast.success('Gasto eliminado')
            loadData()
        } catch (error) {
            console.error('Error deleting expense:', error)
            toast.error('Error al eliminar el gasto')
        }
    }

    // ── Income handlers ──
    const handleAddIncome = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clinicId) {
            toast.error('No se pudo identificar la clínica')
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = e.target as any
        const rawDescription = form.description.value
        const description = incomePatientName ? `${rawDescription} — Clienta: ${incomePatientName}` : rawDescription
        const amount = parseFloat(form.amount.value)
        const category = form.category.value
        const date = form.date.value

        try {
            await financeService.addIncome({
                clinic_id: clinicId,
                description,
                amount,
                category,
                date
            })
            toast.success('Ingreso registrado exitosamente')
            setShowIncomeModal(false)
            setIncomePatientName('')
            setIncomePatientSearch('')
            loadData()
        } catch (error) {
            console.error('Error adding income:', error)
            toast.error('Error al registrar el ingreso')
        }
    }

    const handleDeleteIncome = async (incomeId: string, description: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar el ingreso "${description}"?`)) return

        try {
            await financeService.deleteIncome(incomeId)
            toast.success('Ingreso eliminado')
            loadData()
        } catch (error) {
            console.error('Error deleting income:', error)
            toast.error('Error al eliminar el ingreso')
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

    const handleDeletePayment = async (appointmentId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este pago? La transacción volverá a estado pendiente y se descontará de los ingresos.')) return
        try {
            await financeService.updatePaymentStatus(appointmentId, 'pending')
            toast.success('Pago eliminado')
            loadData()
        } catch (error) {
            console.error('Error deleting payment:', error)
            toast.error('Error al eliminar el pago')
        }
    }

    const handleClearTransaction = async (appointmentId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta transacción pendiente? Esto pondrá el precio en $0 para que no afecte tus reportes ni deudas.')) return
        try {
            setLoading(true)
            await financeService.updateTransactionPrice(appointmentId, 0)
            toast.success('Transacción eliminada de finanzas')
            loadData()
        } catch (error) {
            console.error('Error clearing transaction:', error)
            toast.error('Error al eliminar la transacción')
        } finally {
            setLoading(false)
        }
    }

    // ── Render ──
    return (
        <div className="space-y-6">
            {/* Banner — Clínica */}
            <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-2xl overflow-hidden shadow-soft-md mb-8">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-widest text-sky-200 mb-2">Clínica</p>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Finanzas</h1>
                            <p className="text-sm text-sky-100/80 font-light mt-1">Gestiona los ingresos y gastos de tu clínica. Revisa la rentabilidad y el historial financiero detallado.</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap justify-end">
                            {/* Export dropdown */}
                            <div className="relative" ref={exportMenuRef}>
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors border border-white/20"
                                >
                                    <Download className="w-4 h-4" />
                                    Exportar
                                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showExportMenu && "rotate-180")} />
                                </button>

                                {showExportMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-primary-theme rounded-lg shadow-xl border border-theme py-1 z-50 animate-in fade-in slide-in-from-top-2">
                                        <p className="px-4 py-2 text-xs font-medium text-secondary-theme uppercase tracking-wide">Formato de archivo</p>
                                        <button
                                            onClick={() => handleExport('csv')}
                                            className="w-full text-left px-4 py-2.5 text-sm text-primary-theme hover:bg-secondary-theme flex items-center gap-3"
                                        >
                                            <FileText className="w-4 h-4 text-emerald-500" />
                                            <div>
                                                <p className="font-medium">CSV</p>
                                                <p className="text-xs text-secondary-theme">Compatible con Excel</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => handleExport('json')}
                                            className="w-full text-left px-4 py-2.5 text-sm text-primary-theme hover:bg-secondary-theme flex items-center gap-3"
                                        >
                                            <FileText className="w-4 h-4 text-amber-500" />
                                            <div>
                                                <p className="font-medium">JSON</p>
                                                <p className="text-xs text-secondary-theme">Datos para analítica</p>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowIncomeModal(true)}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors border border-white/20"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Ingreso
                            </button>

                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors border border-white/20"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Gasto
                            </button>
                            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center shrink-0">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <GuideBox 
                title="Guía: Salud Financiera" 
                summary="Aprende a interpretar tus ingresos vs gastos y el flujo de caja de tu clínica."
            >
                <p>El control financiero es el corazón de tu negocio. Aquí puedes ver cómo interactúan tus egresos con las ventas generadas por el equipo.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="bg-white p-3.5 rounded-soft border border-silk-beige/30">
                        <p className="font-bold text-primary-700 text-[11px] mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                            <TrendingUp className="w-3.5 h-3.5" /> Ingresos vs Gastos:
                        </p>
                        <p className="text-[11.5px] text-[#0B0B0F] leading-relaxed font-medium">
                            Mantén tus gastos generales (nómina, alquiler, insumos) controlados. Una ganancia neta saludable suele estar por encima del 20-30% tras cubrir todos los costos operativos.
                        </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-soft border border-silk-beige/30">
                        <p className="font-bold text-[var(--accent-primary)] text-[11px] mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                            <CreditCard className="w-3.5 h-3.5" /> Pagos por Cobrar:
                        </p>
                        <p className="text-[11.5px] text-[#0B0B0F] leading-relaxed font-medium">
                            Las transacciones que aparecen como "Pendientes" son citas realizadas que aún no han sido marcadas como pagadas. Hazles seguimiento para mantener un flujo de caja positivo.
                        </p>
                    </div>
                </div>
                <div className="bg-white p-3 rounded-soft border border-silk-beige/20 flex items-center gap-2 mt-4">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[11px] text-[#0B0B0F] font-medium leading-relaxed">
                        <b>Tip:</b> Registra cada ingreso manual (ej: venta de cremas o productos) para que tus reportes de exportación sean 100% precisos al final del mes.
                    </p>
                </div>
            </GuideBox>

            {/* Date filter pills & Date display */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="text-xs text-[#FF2E88] font-black uppercase tracking-widest flex items-center gap-3 bg-[#FF2E88]/5 px-5 py-2.5 rounded-xl border border-[#FF2E88]/20 w-fit">
                    <Calendar className="w-4 h-4" />
                    {getDateRangeLabel(filterType)}
                </div>
                
                <div className="flex bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-2xl border border-[#FF2E88]/20 p-1.5 w-fit shadow-sm">
                    {(['day', 'week', 'month', 'year'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterType(f)}
                            className={cn(
                                "px-6 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                filterType === f
                                    ? "bg-[#FF2E88] text-white shadow-[0_5px_15px_rgba(255,46,136,0.3)]"
                                    : "text-secondary-theme hover:text-[#FF2E88] hover:bg-[#FF2E88]/5"
                            )}
                        >
                            {f === 'day' ? 'Día' : f === 'week' ? 'Semana' : f === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards: Premium Redesign */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white dark:bg-black rounded-[24px] p-6 border border-[#FF2E88]/10 shadow-[0_10px_30px_rgba(0,0,0,0.02)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] group hover:border-[#FF2E88]/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10 uppercase tracking-tighter">Ingresos</span>
                    </div>
                    <p className="text-[11px] font-black text-secondary-theme uppercase tracking-widest mb-1">Total {getFilterLabel()}</p>
                    <p className="text-lg sm:text-3xl font-black text-[#0B0B0F] dark:text-white tracking-tighter">
                        {loading ? '...' : formatCurrency(stats?.total_income || 0)}
                    </p>
                </div>

                <div className="bg-white dark:bg-black rounded-[24px] p-6 border border-[#FF2E88]/10 shadow-[0_10px_30px_rgba(0,0,0,0.02)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] group hover:border-[#FF2E88]/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TrendingDown className="w-6 h-6 text-red-500" />
                        </div>
                        <span className="text-[10px] font-black text-red-600 bg-red-500/5 px-2.5 py-1 rounded-full border border-red-500/10 uppercase tracking-tighter">Gastos</span>
                    </div>
                    <p className="text-[11px] font-black text-secondary-theme uppercase tracking-widest mb-1">Total {getFilterLabel()}</p>
                    <p className="text-lg sm:text-3xl font-black text-[#0B0B0F] dark:text-white tracking-tighter">
                        {loading ? '...' : formatCurrency(stats?.total_expenses || 0)}
                    </p>
                </div>

                <div className="bg-white dark:bg-black rounded-[24px] p-6 border border-[#FF2E88]/10 shadow-[0_10px_30px_rgba(0,0,0,0.02)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] group hover:border-[#FF2E88]/30 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <DollarSign className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-500/5 px-2.5 py-1 rounded-full border border-blue-500/10 uppercase tracking-tighter">Neto</span>
                    </div>
                    <p className="text-[11px] font-black text-secondary-theme uppercase tracking-widest mb-1">Rentabilidad</p>
                    <p className={cn(
                        "text-lg sm:text-3xl font-black tracking-tighter relative z-10",
                        (stats?.net_profit || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                        {loading ? '...' : formatCurrency(stats?.net_profit || 0)}
                    </p>
                </div>

                <div className="bg-white dark:bg-black rounded-[24px] p-6 border border-[#FF2E88]/10 shadow-[0_10px_30px_rgba(0,0,0,0.02)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] group hover:border-[#FF2E88]/30 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6 text-amber-500" />
                        </div>
                        <span className="text-[10px] font-black text-amber-600 bg-amber-500/5 px-2.5 py-1 rounded-full border border-amber-500/10 uppercase tracking-tighter">Pendiente</span>
                    </div>
                    <p className="text-[11px] font-black text-secondary-theme uppercase tracking-widest mb-1">Cuentas por Cobrar</p>
                    <p className="text-lg sm:text-3xl font-black text-[#0B0B0F] dark:text-white tracking-tighter relative z-10">
                        {loading ? '...' : formatCurrency(stats?.pending_payments || 0)}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-primary-theme rounded-soft border-b border-theme px-6 sticky top-0 z-10">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={cn(
                            "py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === 'dashboard'
                                ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                                : "border-transparent text-secondary-theme hover:text-primary-theme"
                        )}
                    >
                        Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={cn(
                            "py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === 'transactions'
                                ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                                : "border-transparent text-secondary-theme hover:text-primary-theme"
                        )}
                    >
                        Transacciones
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={cn(
                            "py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === 'expenses'
                                ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                                : "border-transparent text-secondary-theme hover:text-primary-theme"
                        )}
                    >
                        Gastos
                    </button>
                    <button
                        onClick={() => setActiveTab('incomes')}
                        className={cn(
                            "py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === 'incomes'
                                ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                                : "border-transparent text-secondary-theme hover:text-primary-theme"
                        )}
                    >
                        Otros Ingresos
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
                                                <p className="text-xs text-charcoal/50">{formatInTz(tx.appointment_date, 'd MMM')}</p>
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
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Transacciones de citas</h3>
                                <p className="text-xs text-gray-500">{transactions.filter(tx => tx.patient_name !== 'Bloqueo de Agenda').length} registros en el período</p>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {transactions
                                .filter(tx => tx.patient_name !== 'Bloqueo de Agenda')
                                .map((tx) => (
                                <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2E88]/10 to-violet-100 dark:from-[#FF2E88]/20 dark:to-violet-900/20 flex items-center justify-center flex-shrink-0 border border-[#FF2E88]/10">
                                        <User className="w-4 h-4 text-[#FF2E88]" />
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{tx.patient_name}</p>
                                        <p className="text-xs text-gray-500 truncate">{tx.service || 'Sin servicio'} · {formatInTz(tx.appointment_date, 'dd MMM yyyy, HH:mm')}</p>
                                    </div>
                                    {/* Monto con edición inline */}
                                    <div className="flex-shrink-0">
                                        {editingAmountId === tx.id ? (
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    value={editingAmountValue}
                                                    onChange={(e) => setEditingAmountValue(e.target.value)}
                                                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2E88]/30"
                                                    autoFocus
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAmount(tx.id); if (e.key === 'Escape') setEditingAmountId(null) }}
                                                />
                                                <button onClick={() => handleSaveAmount(tx.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingAmountId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(tx.price || 0)}</span>
                                                <button
                                                    onClick={() => { setEditingAmountId(tx.id); setEditingAmountValue(String(tx.price || 0)) }}
                                                    className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                                    title="Editar monto"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Estado */}
                                    <span className={cn(
                                        "flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold",
                                        tx.payment_status === 'paid' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                        tx.payment_status === 'pending' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    )}>
                                        {translateStatus(tx.payment_status)}
                                    </span>
                                    {/* Acciones */}
                                    <div className="flex-shrink-0 flex items-center gap-1">
                                        {tx.payment_status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleRegisterPayment(tx.id)}
                                                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                                                >
                                                    Cobrar
                                                </button>
                                                <button
                                                    onClick={() => handleClearTransaction(tx.id)}
                                                    className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                        {tx.payment_status === 'paid' && (
                                            <button
                                                onClick={() => handleDeletePayment(tx.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Revertir pago"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {transactions.filter(tx => tx.patient_name !== 'Bloqueo de Agenda').length === 0 && (
                                <div className="py-16 text-center">
                                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <CreditCard className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <p className="text-sm text-gray-500">No hay transacciones en este período</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Gastos</h3>
                                    <p className="text-xs text-gray-500">{expenses.length} registros</p>
                                </div>
                            </div>
                            <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Nuevo Gasto
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {expenses.map((expense) => (
                                <div key={expense.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0 border border-red-100 dark:border-red-800">
                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{expense.description}</p>
                                        <p className="text-xs text-gray-500">{formatInTz(expense.date, 'dd MMM yyyy')}</p>
                                    </div>
                                    <span className="flex-shrink-0 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                                        {translateCategoryExpense(expense.category)}
                                    </span>
                                    <span className="flex-shrink-0 text-sm font-bold text-red-600 dark:text-red-400">
                                        -{formatCurrency(expense.amount)}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteExpense(expense.id, expense.description)}
                                        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {expenses.length === 0 && (
                                <div className="py-16 text-center">
                                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <TrendingDown className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <p className="text-sm text-gray-500">No hay gastos registrados en este período</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'incomes' && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Otros Ingresos</h3>
                                    <p className="text-xs text-gray-500">{incomes.length} registros</p>
                                </div>
                            </div>
                            <button onClick={() => setShowIncomeModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Nuevo Ingreso
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {incomes.map((income) => (
                                <div key={income.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-emerald-800">
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{income.description}</p>
                                        <p className="text-xs text-gray-500">{formatInTz(income.date, 'dd MMM yyyy')}</p>
                                    </div>
                                    <span className="flex-shrink-0 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                                        {translateCategoryIncome(income.category)}
                                    </span>
                                    <span className="flex-shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        +{formatCurrency(income.amount)}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteIncome(income.id, income.description)}
                                        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {incomes.length === 0 && (
                                <div className="py-16 text-center">
                                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <TrendingUp className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <p className="text-sm text-gray-500">No hay ingresos registrados en este período</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Gastos */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900">Nuevo Gasto</h3>
                            </div>
                            <button onClick={() => setShowExpenseModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Descripción</label>
                                <input
                                    name="description"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                                    placeholder="Ej. Compra de insumos"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Monto</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Fecha</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Categoría</label>
                                <select
                                    name="category"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                                >
                                    {(Object.entries(CATEGORY_LABELS_EXPENSE)).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowExpenseModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors">
                                    Guardar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Ingresos */}
            {showIncomeModal && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900">Nuevo Ingreso</h3>
                            </div>
                            <button onClick={() => { setShowIncomeModal(false); setIncomePatientName(''); setIncomePatientSearch('') }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddIncome} className="p-6 space-y-4">
                            {/* Selector de clienta */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Clienta (opcional)</label>
                                {incomePatientName ? (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-emerald-700 flex-1">{incomePatientName}</span>
                                        <button type="button" onClick={() => { setIncomePatientName(''); setIncomePatientSearch('') }} className="text-emerald-400 hover:text-emerald-600">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={incomePatientSearch}
                                            onChange={(e) => setIncomePatientSearch(e.target.value)}
                                            onFocus={() => incomePatientSearch.length >= 2 && setShowPatientSuggestions(true)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                                            placeholder="Buscar clienta por nombre..."
                                        />
                                        {showPatientSuggestions && patientSuggestions.length > 0 && (
                                            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                                                {patientSuggestions.map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => { setIncomePatientName(p.name); setIncomePatientSearch(''); setShowPatientSuggestions(false) }}
                                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 text-left transition-colors"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                            <User className="w-3 h-3 text-emerald-600" />
                                                        </div>
                                                        {p.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Descripción</label>
                                <input
                                    name="description"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                                    placeholder="Ej. Venta crema hidratante"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Monto</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Fecha</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Categoría</label>
                                <select
                                    name="category"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                                >
                                    {(Object.entries(CATEGORY_LABELS_INCOME)).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowIncomeModal(false); setIncomePatientName(''); setIncomePatientSearch('') }}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                                    Guardar Ingreso
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

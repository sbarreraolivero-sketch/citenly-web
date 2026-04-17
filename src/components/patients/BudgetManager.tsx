import { useState, useEffect } from 'react'
import { 
    Plus, Trash2, Save, Loader2, DollarSign, 
    FileText, CheckCircle2, AlertCircle, Clock,
    Download, Printer
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Defining for local scope - Moving to top to avoid block-scoped variable error
const Activity = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>

interface BudgetManagerProps {
    patientId: string
    clinicId: string
}

interface BudgetItem {
    id?: string
    description: string
    tooth_number?: number
    surface?: string
    quantity: number
    unit_price: number
    total_price: number
}

interface Budget {
    id: string
    title: string
    total_amount: number
    paid_amount: number
    status: 'draft' | 'active' | 'completed' | 'cancelled'
    notes?: string
    created_at: string
    items?: BudgetItem[]
}

const STATUS_CONFIG = {
    draft: { label: 'Borrador', color: 'bg-charcoal/10 text-charcoal/60', icon: Clock },
    active: { label: 'Vigente', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Activity },
    completed: { label: 'Completado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 },
    cancelled: { label: 'Anulado', color: 'bg-red-50 text-red-600 border-red-100', icon: AlertCircle }
} as any

export function BudgetManager({ patientId, clinicId }: BudgetManagerProps) {
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [loading, setLoading] = useState(true)
    const [showNewModal, setShowNewModal] = useState(false)
    const [saving, setSaving] = useState(false)
    
    // New Budget Form
    const [newTitle, setNewTitle] = useState('')
    const [newItems, setNewItems] = useState<BudgetItem[]>([
        { description: '', quantity: 1, unit_price: 0, total_price: 0 }
    ])

    useEffect(() => {
        fetchBudgets()
    }, [patientId])

    const fetchBudgets = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('dental_budgets')
                .select('*, items:dental_budget_items(*)')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })

            if (data) setBudgets(data as any[])
            if (error) throw error
        } catch (error) {
            console.error('Error fetching budgets:', error)
        } finally {
            setLoading(false)
        }
    }

    const addItem = () => {
        setNewItems([...newItems, { description: '', quantity: 1, unit_price: 0, total_price: 0 }])
    }

    const removeItem = (index: number) => {
        setNewItems(newItems.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, updates: Partial<BudgetItem>) => {
        const updated = [...newItems]
        updated[index] = { ...updated[index], ...updates }
        updated[index].total_price = updated[index].quantity * updated[index].unit_price
        setNewItems(updated)
    }

    const calculateTotal = () => {
        return newItems.reduce((acc, item) => acc + item.total_price, 0)
    }

    const handleCreateBudget = async () => {
        if (!newTitle || newItems.length === 0) return
        setSaving(true)
        try {
            const total = calculateTotal()
            const { data: budget, error: budgetError } = await (supabase as any)
                .from('dental_budgets')
                .insert({
                    clinic_id: clinicId,
                    patient_id: patientId,
                    title: newTitle,
                    total_amount: total,
                    status: 'draft'
                })
                .select()
                .single()

            if (budgetError) throw budgetError

            const itemsToInsert = newItems.map(item => ({
                budget_id: budget.id,
                description: item.description,
                tooth_number: item.tooth_number,
                surface: item.surface,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price
            }))

            const { error: itemsError } = await (supabase as any)
                .from('dental_budget_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            setShowNewModal(false)
            setNewTitle('')
            setNewItems([{ description: '', quantity: 1, unit_price: 0, total_price: 0 }])
            fetchBudgets()
        } catch (error) {
            console.error('Error creating budget:', error)
            alert('Error al crear el presupuesto')
        } finally {
            setSaving(false)
        }
    }

    const updateStatus = async (budgetId: string, status: string) => {
        try {
            const { error } = await (supabase as any)
                .from('dental_budgets')
                .update({ status })
                .eq('id', budgetId)
            
            if (error) throw error
            fetchBudgets()
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    if (loading) return (
        <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6 mt-4 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-charcoal flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                        Planes de Tratamiento y Presupuestos
                    </h3>
                    <p className="text-sm text-charcoal/40">Gestiona los presupuestos asignados a este paciente</p>
                </div>
                <button 
                    onClick={() => setShowNewModal(true)}
                    className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Presupuesto
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {budgets.map((budget) => (
                    <div 
                        key={budget.id} 
                        className="bg-white rounded-soft border border-silk-beige overflow-hidden hover:shadow-md transition-all group"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-ivory rounded-softer flex items-center justify-center border border-silk-beige">
                                        <FileText className="w-6 h-6 text-charcoal/20" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-charcoal text-lg">{budget.title}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-charcoal/40">Ref: {budget.id.slice(0, 8)}</span>
                                            <span className="text-xs text-charcoal/40">·</span>
                                            <span className="text-xs text-charcoal/40">{new Date(budget.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm",
                                        STATUS_CONFIG[budget.status]?.color
                                    )}>
                                        {budget.status === 'draft' && <Clock className="w-3.5 h-3.5" />}
                                        {budget.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        {budget.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        {budget.status === 'cancelled' && <AlertCircle className="w-3.5 h-3.5" />}
                                        {STATUS_CONFIG[budget.status]?.label}
                                    </div>
                                    <select 
                                        value={budget.status}
                                        onChange={(e) => updateStatus(budget.id, e.target.value)}
                                        className="text-xs bg-silk-beige/20 border-silk-beige rounded-soft p-1 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                    >
                                        <option value="draft">Borrador</option>
                                        <option value="active">Activar</option>
                                        <option value="completed">Completado</option>
                                        <option value="cancelled">Anular</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-ivory/50 rounded-soft p-4 border border-silk-beige/30">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-charcoal/40 text-left border-b border-silk-beige pb-2">
                                            <th className="font-bold py-2 uppercase text-[10px] tracking-wider">Procedimiento</th>
                                            <th className="font-bold py-2 uppercase text-[10px] tracking-wider text-center">Cant</th>
                                            <th className="font-bold py-2 uppercase text-[10px] tracking-wider text-right">Precio Unit.</th>
                                            <th className="font-bold py-2 uppercase text-[10px] tracking-wider text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-silk-beige/20">
                                        {budget.items?.map((item, idx) => (
                                            <tr key={idx} className="group/row hover:bg-white/40">
                                                <td className="py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-charcoal">{item.description}</span>
                                                        {item.tooth_number && (
                                                            <span className="text-[10px] text-primary-600 font-bold uppercase mt-0.5">
                                                                Pieza {item.tooth_number} {item.surface ? `· Cara ${item.surface}` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-center text-charcoal/60">{item.quantity}</td>
                                                <td className="py-3 text-right text-charcoal/60">${item.unit_price.toLocaleString()}</td>
                                                <td className="py-3 text-right font-bold text-charcoal">${item.total_price.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex items-center justify-between pt-6 border-t border-silk-beige">
                                <div className="flex items-center gap-4">
                                    <button className="flex items-center gap-2 text-xs font-bold text-charcoal/40 hover:text-primary-600 transition-colors">
                                        <Download className="w-4 h-4" /> Exportar PDF
                                    </button>
                                    <button className="flex items-center gap-2 text-xs font-bold text-charcoal/40 hover:text-primary-600 transition-colors">
                                        <Printer className="w-4 h-4" /> Imprimir
                                    </button>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs uppercase font-bold text-charcoal/30 tracking-widest leading-none mb-1">Total Presupuesto</p>
                                    <p className="text-2xl font-black text-charcoal tracking-tight">
                                        <span className="text-sm font-bold text-charcoal/40 mr-1">$</span>
                                        {budget.total_amount.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {budgets.length === 0 && (
                    <div className="py-20 text-center bg-ivory rounded-soft border border-dashed border-silk-beige">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-silk-beige">
                            <DollarSign className="w-8 h-8 text-charcoal/10" />
                        </div>
                        <h4 className="font-bold text-charcoal">Sin presupuestos</h4>
                        <p className="text-sm text-charcoal/40 mt-1 max-w-xs mx-auto">Comienza creando tu primer presupuesto para los tratamientos de este paciente.</p>
                        <button 
                            onClick={() => setShowNewModal(true)}
                            className="btn-soft mt-6"
                        >
                            Crear presupuesto ahora
                        </button>
                    </div>
                )}
            </div>

            {/* New Budget Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-softer w-full max-w-4xl shadow-2xl relative animate-scale-in max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-silk-beige bg-ivory/50 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-charcoal">Nuevo Presupuesto Dental</h3>
                            <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-silk-beige rounded-full transition-colors">
                                <Plus className="w-6 h-6 rotate-45 text-charcoal/40" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-charcoal/40 tracking-widest mb-2">Nombre / Título del Presupuesto</label>
                                <input 
                                    type="text"
                                    placeholder="Ej: Tratamiento Ortodoncia Integral"
                                    className="input-soft w-full text-lg font-bold"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-black uppercase text-charcoal/40 tracking-widest">Ítems del Presupuesto</label>
                                <div className="space-y-4">
                                    {newItems.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-ivory/30 p-4 rounded-soft border border-silk-beige/30 relative group">
                                            <div className="col-span-5">
                                                <label className="text-[10px] font-bold text-charcoal/40 uppercase mb-1 block">Descripción del Procedimiento</label>
                                                <input 
                                                    type="text"
                                                    className="input-soft w-full"
                                                    placeholder="Ej: Profilaxis Dental Profunda"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-charcoal/40 uppercase mb-1 block">Pieza #</label>
                                                <input 
                                                    type="number"
                                                    className="input-soft w-full"
                                                    placeholder="-"
                                                    value={item.tooth_number || ''}
                                                    onChange={(e) => updateItem(idx, { tooth_number: parseInt(e.target.value) || undefined })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-charcoal/40 uppercase mb-1 block">Precio Unit.</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30">$</span>
                                                    <input 
                                                        type="number"
                                                        className="input-soft w-full pl-7"
                                                        value={item.unit_price}
                                                        onChange={(e) => updateItem(idx, { unit_price: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-charcoal/40 uppercase mb-1 block">Cant</label>
                                                <input 
                                                    type="number"
                                                    className="input-soft w-full"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-charcoal/40 uppercase mb-1 block">Total</label>
                                                <div className="h-10 flex items-center font-bold text-charcoal">
                                                    ${item.total_price.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button 
                                                    onClick={() => removeItem(idx)}
                                                    className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={addItem}
                                    className="btn-ghost text-primary-600 flex items-center gap-2 py-3 border border-dashed border-primary-200 w-full justify-center bg-primary-50/10 hover:bg-primary-50"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Línea
                                </button>
                            </div>

                            <div className="flex flex-col gap-4 border-t border-silk-beige pt-6">
                                <label className="block text-xs font-black uppercase text-charcoal/40 tracking-widest">Notas del Presupuesto (Opcional)</label>
                                <textarea className="input-soft w-full min-h-[80px]" placeholder="Ej: Válido por 30 días. Incluye radiografía inicial..." />
                            </div>
                        </div>

                        <div className="p-6 border-t border-silk-beige bg-white flex items-center justify-between shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                            <div>
                                <p className="text-xs uppercase font-bold text-charcoal/40 mb-1 tracking-widest">Total del Presupuesto</p>
                                <p className="text-3xl font-black text-charcoal">${calculateTotal().toLocaleString()}</p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowNewModal(false)} className="btn-ghost">Cancelar</button>
                                <button 
                                    onClick={handleCreateBudget}
                                    disabled={saving || !newTitle}
                                    className="btn-primary px-8 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Crear Presupuesto</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

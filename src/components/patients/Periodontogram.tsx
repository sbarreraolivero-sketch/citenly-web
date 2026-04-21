import { useState, useEffect } from 'react'
import { Save, Loader2, Check, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface PeriodontogramProps {
    patientId: string
    clinicId?: string
}

interface ToothPeriodontalData {
    toothId: string
    probing: [number, number, number] // D, M, M
    margin: [number, number, number]
    nic: [number, number, number]
    bleeding: [boolean, boolean, boolean]
    exudation: [boolean, boolean, boolean]
    plaque: [boolean, boolean, boolean]
    mobility: 0 | 1 | 2 | 3
    furca: 0 | 1 | 2 | 3
}

export function Periodontogram({ patientId }: PeriodontogramProps) {
    const [data, setData] = useState<Record<string, ToothPeriodontalData>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'upper' | 'lower'>('upper')

    useEffect(() => {
        fetchPeriodontogram()
    }, [patientId])

    const fetchPeriodontogram = async () => {
        try {
            const { data: record } = await (supabase as any)
                .from('dental_odontograms')
                .select('periodontogram_data')
                .eq('patient_id', patientId)
                .single()

            if (record && record.periodontogram_data) {
                setData(record.periodontogram_data)
            }
        } catch (error) {
            console.error('Error fetching periodontogram:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await (supabase as any)
                .from('dental_odontograms')
                .update({ periodontogram_data: data })
                .eq('patient_id', patientId)

            if (error) throw error
            toast.success('Periodontograma guardado')
        } catch (error) {
            console.error('Error saving periodontogram:', error)
            toast.error('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const updateTooth = (toothId: string, field: keyof ToothPeriodontalData, index: number, value: any) => {
        setData(prev => {
            const current = prev[toothId] || {
                toothId,
                probing: [0, 0, 0],
                margin: [0, 0, 0],
                nic: [0, 0, 0],
                bleeding: [false, false, false],
                exudation: [false, false, false],
                plaque: [false, false, false],
                mobility: 0,
                furca: 0
            }

            const updated = { ...current }
            if (Array.isArray(updated[field])) {
                (updated[field] as any)[index] = value
                
                // Recalculate NIC if probing or margin changed
                if (field === 'probing' || field === 'margin') {
                    updated.nic[index] = updated.probing[index] + updated.margin[index]
                }
            } else {
                (updated as any)[field] = value
            }

            return { ...prev, [toothId]: updated }
        })
    }

    const teethUpper = ['1.8', '1.7', '1.6', '1.5', '1.4', '1.3', '1.2', '1.1', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8']
    const teethLower = ['4.8', '4.7', '4.6', '4.5', '4.4', '4.3', '4.2', '4.1', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8']
    const currentTeeth = activeTab === 'upper' ? teethUpper : teethLower

    if (loading) return <div>Cargando...</div>

    return (
        <div className="space-y-6 animate-fade-in p-2">
            <div className="bg-white p-6 rounded-softer border border-silk-beige shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-charcoal tracking-tight">Periodontograma Clínico</h3>
                            <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-widest leading-none">Evaluación Periodontal Detallada</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex p-1 bg-silk-beige/20 rounded-full border border-silk-beige/50">
                            <button 
                                onClick={() => setActiveTab('upper')}
                                className={cn("px-6 py-2 text-[10px] font-black rounded-full transition-all", activeTab === 'upper' ? "bg-white text-emerald-600 shadow-sm" : "text-charcoal/40")}
                            >
                                MAXILAR SUPERIOR
                            </button>
                            <button 
                                onClick={() => setActiveTab('lower')}
                                className={cn("px-6 py-2 text-[10px] font-black rounded-full transition-all", activeTab === 'lower' ? "bg-white text-emerald-600 shadow-sm" : "text-charcoal/40")}
                            >
                                MAXILAR INFERIOR
                            </button>
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2 px-6 py-2 shadow-lg shadow-emerald-500/20 bg-emerald-600 border-none hover:bg-emerald-700"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span className="font-black text-xs uppercase tracking-widest text-white">Guardar</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto scrollbar-hide pb-4">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-silk-beige/20">
                                <th className="p-3 border border-silk-beige text-[10px] font-black text-charcoal/40 uppercase">Pieza</th>
                                {currentTeeth.map(id => (
                                    <th key={id} className="p-3 border border-silk-beige text-sm font-black text-charcoal bg-white/50">{id}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Probing Depth Row */}
                            <tr className="hover:bg-ivory/50">
                                <td className="p-3 border border-silk-beige text-[9px] font-black uppercase text-charcoal/60 bg-ivory/20">Profundidad (mm)</td>
                                {currentTeeth.map(id => (
                                    <td key={id} className="p-2 border border-silk-beige">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(idx => (
                                                <input 
                                                    key={idx}
                                                    type="number"
                                                    value={data[id]?.probing[idx] || 0}
                                                    onChange={(e) => updateTooth(id, 'probing', idx, parseInt(e.target.value) || 0)}
                                                    className="w-10 h-10 text-center text-xs font-black bg-white border border-silk-beige rounded-soft focus:ring-2 focus:ring-emerald-500 outline-none"
                                                />
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            {/* Margin Row */}
                            <tr className="hover:bg-ivory/50">
                                <td className="p-3 border border-silk-beige text-[9px] font-black uppercase text-charcoal/60 bg-ivory/20">Margen (mm)</td>
                                {currentTeeth.map(id => (
                                    <td key={id} className="p-2 border border-silk-beige">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(idx => (
                                                <input 
                                                    key={idx}
                                                    type="number"
                                                    value={data[id]?.margin[idx] || 0}
                                                    onChange={(e) => updateTooth(id, 'margin', idx, parseInt(e.target.value) || 0)}
                                                    className="w-10 h-10 text-center text-xs font-black bg-white border border-silk-beige rounded-soft focus:ring-2 focus:ring-emerald-500 outline-none"
                                                />
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            {/* NIC Row - Calculated */}
                            <tr className="bg-emerald-50/30">
                                <td className="p-3 border border-silk-beige text-[9px] font-black uppercase text-emerald-800">NIC (calc)</td>
                                {currentTeeth.map(id => (
                                    <td key={id} className="p-2 border border-silk-beige">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(idx => (
                                                <div key={idx} className="w-10 h-10 flex items-center justify-center text-xs font-black text-emerald-700 bg-white border border-emerald-100 rounded-soft">
                                                    {(data[id]?.nic[idx]) || 0}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            {/* Bleeding Row */}
                            <tr className="hover:bg-ivory/50">
                                <td className="p-3 border border-silk-beige text-[9px] font-black uppercase text-charcoal/60">Sangrado</td>
                                {currentTeeth.map(id => (
                                    <td key={id} className="p-2 border border-silk-beige">
                                        <div className="flex gap-1 justify-center">
                                            {[0, 1, 2].map(idx => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => updateTooth(id, 'bleeding', idx, !data[id]?.bleeding[idx])}
                                                    className={cn("w-10 h-10 rounded-soft border flex items-center justify-center transition-all", data[id]?.bleeding[idx] ? "bg-red-500 border-red-600 shadow-md scale-95" : "bg-white border-silk-beige")}
                                                >
                                                    {data[id]?.bleeding[idx] && <Check className="w-4 h-4 text-white" />}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            {/* Plaque Row */}
                            <tr className="hover:bg-ivory/50">
                                <td className="p-3 border border-silk-beige text-[9px] font-black uppercase text-charcoal/60">Placa</td>
                                {currentTeeth.map(id => (
                                    <td key={id} className="p-2 border border-silk-beige">
                                        <div className="flex gap-1 justify-center">
                                            {[0, 1, 2].map(idx => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => updateTooth(id, 'plaque', idx, !data[id]?.plaque[idx])}
                                                    className={cn("w-10 h-10 rounded-soft border flex items-center justify-center transition-all", data[id]?.plaque[idx] ? "bg-yellow-400 border-yellow-500 shadow-md scale-95" : "bg-white border-silk-beige")}
                                                >
                                                    {data[id]?.plaque[idx] && <Check className="w-4 h-4 text-white" />}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            {/* Mobility Row */}
                            <tr className="hover:bg-ivory/50">
                                <td className="p-3 border border-silk-beige text-[9px] font-black uppercase text-charcoal/60 bg-ivory/10">Movilidad</td>
                                {currentTeeth.map(id => (
                                    <td key={id} className="p-2 border border-silk-beige">
                                        <select 
                                            value={data[id]?.mobility || 0}
                                            onChange={(e) => updateTooth(id, 'mobility', 0, parseInt(e.target.value))}
                                            className="w-full h-10 text-xs font-black bg-white border border-silk-beige rounded-soft outline-none text-center"
                                        >
                                            <option value={0}>0</option>
                                            <option value={1}>1</option>
                                            <option value={2}>2</option>
                                            <option value={3}>3</option>
                                        </select>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-soft p-6">
                    <h4 className="text-sm font-black text-charcoal uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-600" /> Guía de Diligenciamiento
                    </h4>
                    <div className="space-y-3 text-xs text-charcoal/60 font-medium">
                        <p>• Los valores de <strong>Profundidad</strong> y <strong>Margen</strong> se ingresan por cada una de las 3 caras por pieza (D, M, M).</p>
                        <p>• El <strong>NIC</strong> se calcula automáticamente sumando Profundidad y Margen.</p>
                        <p>• El sangrado se marca en color <span className="text-red-500 font-bold">ROJO</span> y la placa en <span className="text-yellow-600 font-bold">AMARILLO</span>.</p>
                    </div>
                </div>
                <div className="card-soft p-6 flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] font-black uppercase text-emerald-800 tracking-[0.2em] mb-2">Resumen Clínico</p>
                    <div className="flex gap-8">
                        <div>
                            <p className="text-3xl font-black text-charcoal">{Object.values(data).filter(t => t.bleeding.some(b => b)).length}</p>
                            <p className="text-[9px] font-black text-charcoal/40 uppercase">Piezas con Sangrado</p>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-charcoal">{Object.values(data).filter(t => t.mobility > 0).length}</p>
                            <p className="text-[9px] font-black text-charcoal/40 uppercase">Con Movilidad</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

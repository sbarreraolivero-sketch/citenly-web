import { useState, useEffect } from 'react'
import { Save, Loader2, Info, ChevronRight, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface OdontogramProps {
    patientId: string
    clinicId: string
}

interface ToothData {
    id: number
    status: 'healthy' | 'caries' | 'filling' | 'extraction' | 'missing' | 'crown' | 'endo'
    notes?: string
    surfaces: {
        vestibular: boolean
        lingual: boolean
        mesial: boolean
        distal: boolean
        oclusal: boolean
    }
}

const TOOTH_STATES = {
    healthy: { label: 'Sano', color: 'bg-emerald-500' },
    caries: { label: 'Caries', color: 'bg-red-500' },
    filling: { label: 'Obturación', color: 'bg-blue-500' },
    extraction: { label: 'Extracción Indicada', color: 'bg-yellow-600' },
    missing: { label: 'Ausente', color: 'bg-charcoal/20' },
    crown: { label: 'Corona', color: 'bg-purple-500' },
    endo: { label: 'Endodoncia', color: 'bg-orange-500' }
}

export function Odontogram({ patientId, clinicId }: OdontogramProps) {
    const [teeth, setTeeth] = useState<Record<number, ToothData>>({})
    const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [view, setView] = useState<'adult' | 'child'>('adult')

    useEffect(() => {
        fetchOdontogram()
    }, [patientId])

    const fetchOdontogram = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('dental_odontograms')
                .select('*')
                .eq('patient_id', patientId)
                .single()

            if (data) {
                setTeeth(data.data as any)
            } else if (error && error.code !== 'PGRST116') {
                throw error
            }
        } catch (error) {
            console.error('Error fetching odontogram:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await (supabase as any)
                .from('dental_odontograms')
                .upsert({
                    patient_id: patientId,
                    clinic_id: clinicId,
                    data: teeth,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'clinic_id,patient_id' })

            if (error) throw error
        } catch (error) {
            console.error('Error saving odontogram:', error)
        } finally {
            setSaving(false)
        }
    }

    const updateToothStatus = (toothId: number, status: ToothData['status']) => {
        setTeeth(prev => ({
            ...prev,
            [toothId]: {
                ...(prev[toothId] || { id: toothId, surfaces: {} as any }),
                status
            }
        }))
    }

    const toggleSurface = (toothId: number, surface: keyof ToothData['surfaces']) => {
        setTeeth(prev => {
            const current = prev[toothId] || { 
                id: toothId, 
                status: 'healthy', 
                surfaces: { vestibular: false, lingual: false, mesial: false, distal: false, oclusal: false } 
            }
            return {
                ...prev,
                [toothId]: {
                    ...current,
                    surfaces: {
                        ...current.surfaces,
                        [surface]: !current.surfaces[surface]
                    }
                }
            }
        })
    }

    const renderTooth = (id: number) => {
        const data = teeth[id]
        const isSelected = selectedTooth === id
        const statusColor = data?.status ? TOOTH_STATES[data.status].color : 'bg-white'

        return (
            <div 
                key={id} 
                className={cn(
                    "relative flex flex-col items-center p-1 transition-all rounded-soft border border-transparent cursor-pointer",
                    isSelected ? "bg-primary-50 border-primary-200" : "hover:bg-ivory"
                )}
                onClick={() => setSelectedTooth(id)}
            >
                <span className="text-[10px] font-bold text-charcoal/40 mb-1">{id}</span>
                <div className="relative w-10 h-10 border-2 border-charcoal/20 rounded-soft overflow-hidden bg-white shadow-inner">
                    {/* Simplified Tooth SVG with surfaces */}
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Vestibular (Top) */}
                        <path 
                            d="M0,0 L100,0 L80,20 L20,20 Z" 
                            className={cn("transition-colors", data?.surfaces?.vestibular ? "fill-red-400" : "fill-transparent stroke-charcoal/10 stroke-1 hover:fill-primary-100")}
                            onClick={(e) => { e.stopPropagation(); toggleSurface(id, 'vestibular') }}
                        />
                        {/* Distal (Right) */}
                        <path 
                            d="M100,0 L100,100 L80,80 L80,20 Z" 
                            className={cn("transition-colors", data?.surfaces?.distal ? "fill-red-400" : "fill-transparent stroke-charcoal/10 stroke-1 hover:fill-primary-100")}
                            onClick={(e) => { e.stopPropagation(); toggleSurface(id, 'distal') }}
                        />
                        {/* Lingual (Bottom) */}
                        <path 
                            d="M0,100 L100,100 L80,80 L20,80 Z" 
                            className={cn("transition-colors", data?.surfaces?.lingual ? "fill-red-400" : "fill-transparent stroke-charcoal/10 stroke-1 hover:fill-primary-100")}
                            onClick={(e) => { e.stopPropagation(); toggleSurface(id, 'lingual') }}
                        />
                        {/* Mesial (Left) */}
                        <path 
                            d="M0,0 L0,100 L20,80 L20,20 Z" 
                            className={cn("transition-colors", data?.surfaces?.mesial ? "fill-red-400" : "fill-transparent stroke-charcoal/10 stroke-1 hover:fill-primary-100")}
                            onClick={(e) => { e.stopPropagation(); toggleSurface(id, 'mesial') }}
                        />
                        {/* Oclusal (Center) */}
                        <rect 
                            x="20" y="20" width="60" height="60" 
                            className={cn("transition-colors", data?.surfaces?.oclusal ? "fill-red-400" : "fill-transparent stroke-charcoal/10 stroke-1 hover:fill-primary-100")}
                            onClick={(e) => { e.stopPropagation(); toggleSurface(id, 'oclusal') }}
                        />
                    </svg>
                    
                    {/* Status Marker */}
                    {data?.status && data.status !== 'healthy' && (
                        <div className={cn("absolute inset-0 bg-opacity-20 pointer-events-none", statusColor)} />
                    )}
                </div>
                {data?.status && data.status !== 'healthy' && (
                    <div className={cn("w-2 h-2 rounded-full mt-1", statusColor)} />
                )}
            </div>
        )
    }

    const adultTeethUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
    const adultTeethLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 bg-ivory rounded-soft border border-silk-beige mt-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
            <p className="text-charcoal/60">Cargando odontograma...</p>
        </div>
    )

    return (
        <div className="space-y-6 mt-4 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Odontogram Visualizer */}
                <div className="flex-1 bg-white p-6 rounded-soft border border-silk-beige shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-charcoal">Ficha Odontológica</h3>
                            <p className="text-xs text-charcoal/40">Visualización interactiva de piezas dentales</p>
                        </div>
                        <div className="flex p-1 bg-silk-beige rounded-soft">
                            <button 
                                onClick={() => setView('adult')}
                                className={cn("px-4 py-1.5 text-xs font-bold rounded-soft transition-all", view === 'adult' ? "bg-white text-primary-600 shadow-sm" : "text-charcoal/40")}
                            >
                                Adulto
                            </button>
                            <button 
                                onClick={() => setView('child')}
                                className={cn("px-4 py-1.5 text-xs font-bold rounded-soft transition-all", view === 'child' ? "bg-white text-primary-600 shadow-sm" : "text-charcoal/40")}
                            >
                                Infantil
                            </button>
                        </div>
                    </div>

                    <div className="space-y-12 overflow-x-auto pb-4">
                        {/* Upper Arch */}
                        <div className="flex justify-center gap-1 min-w-[700px]">
                            {adultTeethUpper.map(id => renderTooth(id))}
                        </div>
                        
                        {/* Lower Arch */}
                        <div className="flex justify-center gap-1 min-w-[700px]">
                            {adultTeethLower.map(id => renderTooth(id))}
                        </div>
                    </div>

                    <div className="mt-12 flex flex-wrap gap-4 pt-6 border-t border-silk-beige">
                        <div className="flex items-center gap-2 group cursor-help transition-all">
                            <div className="w-3 h-3 rounded-full bg-red-400 group-hover:scale-125 transition-transform" />
                            <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/60">Caries / Afectado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/60">Curado / Obturado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/60">Corona</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-charcoal/20" />
                            <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/60">Pieza Ausente</span>
                        </div>
                    </div>
                </div>

                {/* Tooth Editor Side Panel */}
                <div className="w-full md:w-80 space-y-4">
                    <div className="card-soft border border-primary-100 bg-white p-6 sticky top-24">
                        {selectedTooth ? (
                            <div className="animate-fade-in">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-primary-500 text-white rounded-softer flex items-center justify-center text-xl font-bold shadow-soft">
                                        {selectedTooth}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-charcoal">Pieza Dental</h4>
                                        <p className="text-xs text-primary-600 font-medium">Editar Estado</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-charcoal/40 mb-2">Estado General</p>
                                    {Object.entries(TOOTH_STATES).map(([id, data]) => (
                                        <button
                                            key={id}
                                            onClick={() => updateToothStatus(selectedTooth, id as any)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-soft border transition-all text-sm",
                                                teeth[selectedTooth]?.status === id 
                                                    ? "bg-primary-50 border-primary-200 text-primary-700 font-bold" 
                                                    : "bg-ivory border-transparent text-charcoal/70 hover:bg-silk-beige/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", data.color)} />
                                                {data.label}
                                            </div>
                                            {teeth[selectedTooth]?.status === id && <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 pt-6 border-t border-silk-beige">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-charcoal/40 mb-3">Notas de la pieza</p>
                                    <textarea 
                                        className="w-full p-3 rounded-soft border border-silk-beige bg-ivory text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all min-h-[100px]"
                                        placeholder="Ej: Caries profunda, requiere endodoncia..."
                                        value={teeth[selectedTooth]?.notes || ''}
                                        onChange={(e) => setTeeth(prev => ({
                                            ...prev,
                                            [selectedTooth]: {
                                                ...(prev[selectedTooth] || { id: selectedTooth, status: 'healthy', surfaces: {} as any }),
                                                notes: e.target.value
                                            }
                                        }))}
                                    />
                                </div>
                                
                                <button
                                    onClick={() => setSelectedTooth(null)}
                                    className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-bold text-charcoal/40 hover:text-charcoal transition-colors py-2"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Cerrar Editor
                                </button>
                            </div>
                        ) : (
                            <div className="py-12 text-center space-y-4 animate-fade-in">
                                <div className="w-16 h-16 bg-ivory rounded-full flex items-center justify-center mx-auto border border-silk-beige">
                                    <Info className="w-8 h-8 text-charcoal/20" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-charcoal leading-tight">Selecciona un diente</p>
                                    <p className="text-xs text-charcoal/40 mt-1">Toca una pieza dental o una de sus caras para editar su estado detallado.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-4 shadow-xl shadow-primary-500/20"
                    >
                        {saving ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                        ) : (
                            <><Save className="w-5 h-5" /> Guardar Todo el Odontograma</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

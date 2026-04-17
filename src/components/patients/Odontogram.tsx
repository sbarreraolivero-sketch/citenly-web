import { useState, useEffect } from 'react'
import { Save, Loader2, Info, ChevronRight, RotateCcw, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface OdontogramProps {
    patientId: string
    clinicId: string
    onAddTreatment?: (item: { description: string, tooth_number: number, unit_price: number }) => void
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
export function Odontogram({ patientId, clinicId, onAddTreatment }: OdontogramProps) {
    const [teeth, setTeeth] = useState<Record<string | number, ToothData>>({})
    const [selectedTooth, setSelectedTooth] = useState<string | number | null>(null)
    const [dentition, setDentition] = useState<'adult' | 'child'>('adult')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

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
            toast.success('Odontograma guardado correctamente')
        } catch (error) {
            console.error('Error saving odontogram:', error)
            toast.error('Error al guardar el odontograma')
        } finally {
            setSaving(false)
        }
    }

    const updateToothStatus = (toothId: string | number, status: ToothData['status']) => {
        setTeeth(prev => ({
            ...prev,
            [toothId]: {
                ...(prev[toothId] || { id: toothId, surfaces: { vestibular: false, lingual: false, mesial: false, distal: false, oclusal: false } as any }),
                status
            }
        }))
    }

    const toggleSurface = (toothId: string | number, surface: keyof ToothData['surfaces']) => {
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

    const renderTooth = (id: string | number) => {
        const data = teeth[id]
        const isSelected = selectedTooth === id
        const statusColor = data?.status ? TOOTH_STATES[data.status].color : 'bg-white'
        
        // Determine tooth type
        const isMolar = typeof id === 'number' && ([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(id)) || ['A', 'B', 'I', 'J', 'K', 'L', 'S', 'T'].includes(id.toString())

        return (
            <div 
                key={id} 
                className={cn(
                    "relative flex flex-col items-center p-1 transition-all rounded-soft border border-transparent cursor-pointer",
                    isSelected ? "bg-primary-50 border-primary-300 shadow-md ring-1 ring-primary-500/20" : "hover:bg-ivory",
                    isMolar ? "min-w-[55px]" : "min-w-[45px]"
                )}
                onClick={() => setSelectedTooth(id)}
            >
                <span className="text-[11px] font-black text-charcoal/80 mb-1">{id}</span>
                <div className={cn(
                    "relative flex flex-col items-center transition-transform",
                    isSelected ? "scale-110" : "hover:scale-105",
                    isMolar ? "w-12 h-24" : "w-9 h-24"
                )}>
                    {/* Anatomical Tooth SVG - High Contrast */}
                    <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-sm overflow-visible">
                        {/* Root Structure - Darker & Better defined */}
                        <path 
                            d={isMolar ? "M15,80 Q15,185 50,195 Q85,185 85,80" : "M30,80 Q30,185 50,195 Q70,185 70,80"} 
                            className="fill-charcoal/10 stroke-charcoal/60 stroke-[1.5]"
                        />
                        
                        {/* Interactive Crown - Professional Clinical Look */}
                        <g transform="translate(10, 10)">
                            {/* Vestibular (Top) */}
                            <path 
                                d="M0,8 Q40,-5 80,8 L60,25 Q40,15 20,25 Z" 
                                className={cn("transition-all duration-300 cursor-pointer stroke-charcoal/80 stroke-[2]", data?.surfaces?.vestibular ? "fill-red-500" : "fill-white hover:fill-primary-100")}
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'vestibular') }}
                            />
                            {/* Distal (Left) */}
                            <path 
                                d="M0,8 Q-5,35 0,62 L20,45 Q15,35 20,25 Z" 
                                className={cn("transition-all duration-300 cursor-pointer stroke-charcoal/80 stroke-[2]", data?.surfaces?.distal ? "fill-red-500" : "fill-white hover:fill-primary-100")}
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'distal') }}
                            />
                            {/* Mesial (Right) */}
                            <path 
                                d="M80,8 Q85,35 80,62 L60,45 Q65,35 60,25 Z" 
                                className={cn("transition-all duration-300 cursor-pointer stroke-charcoal/80 stroke-[2]", data?.surfaces?.mesial ? "fill-red-500" : "fill-white hover:fill-primary-100")}
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'mesial') }}
                            />
                            {/* Palatino/Lingual (Bottom) */}
                            <path 
                                d="M0,62 Q40,75 80,62 L60,45 Q40,55 20,45 Z" 
                                className={cn("transition-all duration-300 cursor-pointer stroke-charcoal/80 stroke-[2]", data?.surfaces?.lingual ? "fill-red-500" : "fill-white hover:fill-primary-100")}
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'lingual') }}
                            />
                            {/* Oclusal (Center) */}
                            <path 
                                d="M20,25 Q40,15 60,25 L60,45 Q40,55 20,45 Z" 
                                className={cn("transition-all duration-300 cursor-pointer stroke-charcoal/80 stroke-[2]", data?.surfaces?.oclusal ? "fill-red-500" : "fill-white hover:fill-primary-100")}
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'oclusal') }}
                            />
                            
                            {/* High-Readability Labels */}
                            <text x="40" y="8" fontSize="12" textAnchor="middle" className="fill-charcoal/60 pointer-events-none font-black">V</text>
                            <text x="10" y="38" fontSize="12" textAnchor="middle" className="fill-charcoal/60 pointer-events-none font-black">D</text>
                            <text x="70" y="38" fontSize="12" textAnchor="middle" className="fill-charcoal/60 pointer-events-none font-black">M</text>
                            <text x="40" y="38" fontSize="12" textAnchor="middle" className="fill-charcoal/60 pointer-events-none font-black">O</text>
                            <text x="40" y="68" fontSize="12" textAnchor="middle" className="fill-charcoal/60 pointer-events-none font-black">P</text>
                        </g>
                    </svg>
                    
                    {/* Status Symbols Overlay - Stronger contrast */}
                    {data?.status && data.status !== 'healthy' && (
                        <g className="absolute inset-0 pointer-events-none">
                            <svg viewBox="0 0 100 200" className="w-full h-full overflow-visible">
                                <circle cx="50" cy="45" r="38" className={cn("opacity-40", statusColor)} />
                                
                                {data.status === 'extraction' && (
                                    <path d="M25,20 L75,70 M75,20 L25,70" className="stroke-red-700 stroke-[10] shadow-sm" />
                                )}
                                {data.status === 'missing' && (
                                    <circle cx="50" cy="45" r="30" fill="none" className="stroke-charcoal/80 stroke-6" strokeDasharray="8 4" />
                                )}
                                {data.status === 'endo' && (
                                    <path d="M50,45 L50,150" className="stroke-orange-500 stroke-[7]" />
                                )}
                                {data.status === 'crown' && (
                                    <rect x="10" y="5" width="80" height="40" rx="6" fill="none" className="stroke-purple-600 stroke-6" />
                                )}
                            </svg>
                        </g>
                    )}
                </div>
            </div>
        )
    }

    const adultTeethUpper = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
    const adultTeethLower = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17]

    const childTeethUpper = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    const childTeethLower = ['T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L', 'K']

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
                                onClick={() => { setDentition('adult'); setSelectedTooth(null) }}
                                className={cn("px-4 py-1.5 text-xs font-bold rounded-soft transition-all", dentition === 'adult' ? "bg-white text-primary-600 shadow-sm" : "text-charcoal/40")}
                            >
                                Adulto
                            </button>
                            <button 
                                onClick={() => { setDentition('child'); setSelectedTooth(null) }}
                                className={cn("px-4 py-1.5 text-xs font-bold rounded-soft transition-all", dentition === 'child' ? "bg-white text-primary-600 shadow-sm" : "text-charcoal/40")}
                            >
                                Infantil
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8 overflow-x-auto pb-4 scrollbar-hide">
                        {/* Upper Arch */}
                        <div className="flex justify-center gap-0.5 min-w-max px-4">
                            {(dentition === 'adult' ? adultTeethUpper : childTeethUpper).map(id => renderTooth(id))}
                        </div>
                        
                        {/* Lower Arch */}
                        <div className="flex justify-center gap-0.5 min-w-max px-4">
                            {(dentition === 'adult' ? adultTeethLower : childTeethLower).map(id => renderTooth(id))}
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
                                                ...(prev[selectedTooth] || { id: selectedTooth, status: 'healthy', surfaces: { vestibular: false, lingual: false, mesial: false, distal: false, oclusal: false } as any }),
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
                                
                                {selectedTooth && (
                                    <div className="mt-4 pt-4 border-t border-silk-beige">
                                        <button
                                            onClick={() => {
                                                const status = teeth[selectedTooth]?.status ? TOOTH_STATES[teeth[selectedTooth]!.status!].label : 'Consulta'
                                                onAddTreatment?.({
                                                    description: `${status}${teeth[selectedTooth]?.notes ? `: ${teeth[selectedTooth]?.notes}` : ''}`,
                                                    tooth_number: selectedTooth as any,
                                                    unit_price: 0
                                                })
                                            }}
                                            className="w-full btn-soft text-primary-600 border-primary-200 flex items-center justify-center gap-2 py-3 hover:bg-primary-50 transition-all font-bold"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Presupuestar Tratamiento
                                        </button>
                                    </div>
                                )}
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

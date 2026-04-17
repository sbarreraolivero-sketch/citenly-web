import { useState, useEffect } from 'react'
import { Save, Loader2, Info, RotateCcw, Plus } from 'lucide-react'
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
    healthy: { label: 'Sano', color: 'bg-emerald-500', hex: '#10b981' },
    caries: { label: 'Caries', color: 'bg-red-500', hex: '#ef4444' },
    filling: { label: 'Obturación', color: 'bg-blue-500', hex: '#3b82f6' },
    extraction: { label: 'Extracción Indicada', color: 'bg-yellow-600', hex: '#ca8a04' },
    missing: { label: 'Ausente', color: 'bg-charcoal/20', hex: '#94a3b8' },
    crown: { label: 'Corona', color: 'bg-purple-500', hex: '#a855f7' },
    endo: { label: 'Endodoncia', color: 'bg-orange-500', hex: '#f97316' }
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

    const handleSaveOdontogram = async () => {
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
            
            const newSurfaces = {
                ...current.surfaces,
                [surface]: !current.surfaces[surface]
            }
            
            // Auto-sync: only overwrite if current status is healthy or caries
            const hasActiveSurface = Object.values(newSurfaces).some(v => v === true)
            const newStatus: ToothData['status'] = hasActiveSurface ? 'caries' : 'healthy'
            
            const isManualStatus = ['filling', 'crown', 'endo', 'missing', 'extraction'].includes(current.status)

            return {
                ...prev,
                [toothId]: {
                    ...current,
                    status: isManualStatus ? current.status : newStatus,
                    surfaces: newSurfaces
                }
            }
        })
    }

    const renderTooth = (id: string | number) => {
        const data = teeth[id]
        const isSelected = selectedTooth === id
        
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
                    
                    {/* Status Symbols Overlay - High Visibility */}
                    {data?.status && data.status !== 'healthy' && (
                        <g className="absolute inset-0 pointer-events-none">
                            <svg viewBox="0 0 100 200" className="w-full h-full overflow-visible">
                                <circle 
                                    cx="50" cy="45" r="38" 
                                    style={{ fill: TOOTH_STATES[data.status].hex }}
                                    className="opacity-40" 
                                />
                                
                                {data.status === 'extraction' && (
                                    <path 
                                        d="M25,20 L75,70 M75,20 L25,70" 
                                        style={{ stroke: TOOTH_STATES.extraction.hex }}
                                        className="stroke-[10] drop-shadow-sm" 
                                    />
                                )}
                                {data.status === 'missing' && (
                                    <circle 
                                        cx="50" cy="45" r="30" 
                                        fill="none" 
                                        style={{ stroke: TOOTH_STATES.missing.hex }}
                                        className="stroke-6" 
                                        strokeDasharray="8 4" 
                                    />
                                )}
                                {data.status === 'endo' && (
                                    <path 
                                        d="M50,45 L50,155" 
                                        style={{ stroke: TOOTH_STATES.endo.hex }}
                                        className="stroke-[8]" 
                                    />
                                )}
                                {data.status === 'crown' && (
                                    <rect 
                                        x="10" y="5" width="80" height="40" rx="6" 
                                        fill="none" 
                                        style={{ stroke: TOOTH_STATES.crown.hex }}
                                        className="stroke-8" 
                                    />
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

                    <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 pt-6 border-t border-silk-beige">
                        {Object.entries(TOOTH_STATES).map(([id, data]) => (
                            <div key={id} className="flex items-center gap-2">
                                <div className={cn("w-3 h-3 rounded-full", data.color)} />
                                <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/60">{data.label}</span>
                            </div>
                        ))}
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
                                                "w-full flex items-center justify-between p-3 rounded-soft border transition-all text-sm group",
                                                teeth[selectedTooth]?.status === id 
                                                    ? "bg-primary-50 border-primary-200 text-primary-700 font-bold" 
                                                    : "bg-ivory border-transparent text-charcoal/70 hover:bg-silk-beige/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", data.color)} />
                                                {data.label}
                                            </div>
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
                                                const tooth = teeth[selectedTooth]
                                                const statusLabel = tooth?.status ? TOOTH_STATES[tooth.status].label : 'Consulta'
                                                
                                                // Get active surfaces
                                                const surfaces = tooth?.surfaces || {}
                                                const activeSurfaces = Object.entries(surfaces)
                                                    .filter(([_, active]) => active)
                                                    .map(([name]) => name.charAt(0).toUpperCase()) // V, D, M, O, P/L
                                                    .join(', ')

                                                const fullDescription = `${statusLabel} en Pieza ${selectedTooth}${activeSurfaces ? ` - Caras: ${activeSurfaces}` : ''}${tooth?.notes ? `: ${tooth.notes}` : ''}`

                                                onAddTreatment?.({
                                                    description: fullDescription,
                                                    tooth_number: selectedTooth as any,
                                                    unit_price: 0
                                                })
                                                toast.success('Tratamiento añadido a la cola de presupuesto')
                                            }}
                                            className="w-full btn-soft text-primary-600 border-primary-200 flex items-center justify-center gap-2 py-3 hover:bg-primary-50 transition-all font-bold shadow-sm"
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
                        onClick={handleSaveOdontogram}
                        disabled={saving}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-6 mb-4"
                    >
                        {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                        ) : (
                            <><Save className="w-5 h-5" /> Guardar Todo el Odontograma</>
                        )}
                    </button>

                    {/* Global Budget Button - Always accessible at bottom of sidebar */}
                    <div className="mt-4 pt-6 border-t-2 border-dashed border-silk-beige">
                        <button
                            onClick={() => {
                                const findings = Object.entries(teeth).filter(([_, t]) => t.status && t.status !== 'healthy')
                                if (findings.length === 0) {
                                    toast.error('No hay tratamientos marcados para presupuestar')
                                    return
                                }
                                
                                findings.forEach(([id, tooth]) => {
                                    const statusLabel = tooth.status ? TOOTH_STATES[tooth.status].label : 'Consulta'
                                    const surfaces = tooth.surfaces || {}
                                    const activeSurfaces = Object.entries(surfaces)
                                        .filter(([_, active]) => active)
                                        .map(([name]) => name.charAt(0).toUpperCase())
                                        .join(', ')

                                    const fullDescription = `${statusLabel} en Pieza ${id}${activeSurfaces ? ` - Caras: ${activeSurfaces}` : ''}${tooth.notes ? `: ${tooth.notes}` : ''}`
                                    
                                    onAddTreatment?.({
                                        description: fullDescription,
                                        tooth_number: id as any,
                                        unit_price: 0
                                    })
                                })
                                
                                toast.success(`Se han añadido ${findings.length} tratamientos al presupuesto`)
                            }}
                            className="w-full btn-soft text-primary-600 border-primary-200 flex items-center justify-center gap-3 py-4 shadow-md hover:scale-[1.02] transition-all font-black text-lg"
                        >
                            <Plus className="w-6 h-6" />
                            Presupuestar TODO
                        </button>
                        <p className="text-[10px] text-center text-charcoal/40 mt-3 uppercase tracking-widest font-bold">
                            Envía todos los hallazgos a presupuestos
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

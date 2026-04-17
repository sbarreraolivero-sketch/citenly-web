import { useState, useEffect } from 'react'
import { Save, Loader2, Info, RotateCcw, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface OdontogramProps {
    patientId: string
    clinicId: string
    onAddTreatment?: (item: any) => void
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

            if (data && data.data) {
                setTeeth(data.data as any)
            } else {
                setTeeth({})
            }
        } catch (error) {
            console.error('Error fetching odontogram:', error)
            setTeeth({})
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
                    isMolar ? "min-w-[90px]" : "min-w-[75px]"
                )}
                onClick={() => setSelectedTooth(id)}
            >
                <span className="text-[11px] font-black text-charcoal/80 mb-3">{id}</span>
                <div className={cn(
                    "relative flex flex-col items-center transition-transform",
                    isSelected ? "scale-110" : "hover:scale-105",
                    isMolar ? "w-20 h-40" : "w-16 h-40"
                )}>
                    {/* Anatomical Tooth SVG - High Contrast */}
                    <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-md overflow-visible">
                        {/* Root Structure */}
                        <path 
                            d={isMolar ? "M15,80 Q15,185 50,195 Q85,185 85,80" : "M30,80 Q30,185 50,195 Q70,185 70,80"} 
                            className="fill-charcoal/10 stroke-charcoal/40 stroke-[2]"
                        />
                        
                        {/* Interactive Crown */}
                        <g transform="translate(10, 10)">
                            {/* Vestibular (Top) */}
                            <path 
                                d="M0,8 Q40,-5 80,8 L60,25 Q40,15 20,25 Z" 
                                style={{ fill: data?.surfaces?.vestibular ? TOOTH_STATES[data.status || 'caries'].hex : '#ffffff' }}
                                className="transition-all duration-300 cursor-pointer stroke-charcoal stroke-[2.5] hover:fill-primary-50"
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'vestibular') }}
                            />
                            {/* Distal (Left) */}
                            <path 
                                d="M0,8 Q-5,35 0,62 L20,45 Q15,35 20,25 Z" 
                                style={{ fill: data?.surfaces?.distal ? TOOTH_STATES[data.status || 'caries'].hex : '#ffffff' }}
                                className="transition-all duration-300 cursor-pointer stroke-charcoal stroke-[2.5] hover:fill-primary-50"
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'distal') }}
                            />
                            {/* Mesial (Right) */}
                            <path 
                                d="M80,8 Q85,35 80,62 L60,45 Q65,35 60,25 Z" 
                                style={{ fill: data?.surfaces?.mesial ? TOOTH_STATES[data.status || 'caries'].hex : '#ffffff' }}
                                className="transition-all duration-300 cursor-pointer stroke-charcoal stroke-[2.5] hover:fill-primary-50"
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'mesial') }}
                            />
                            {/* Palatino/Lingual (Bottom) */}
                            <path 
                                d="M0,62 Q40,75 80,62 L60,45 Q40,55 20,45 Z" 
                                style={{ fill: data?.surfaces?.lingual ? TOOTH_STATES[data.status || 'caries'].hex : '#ffffff' }}
                                className="transition-all duration-300 cursor-pointer stroke-charcoal stroke-[2.5] hover:fill-primary-50"
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'lingual') }}
                            />
                            {/* Oclusal (Center) */}
                            <path 
                                d="M20,25 Q40,15 60,25 L60,45 Q40,55 20,45 Z" 
                                style={{ fill: data?.surfaces?.oclusal ? TOOTH_STATES[data.status || 'caries'].hex : '#ffffff' }}
                                className="transition-all duration-300 cursor-pointer stroke-charcoal stroke-[2.5] hover:fill-primary-50"
                                onClick={(e) => { e.stopPropagation(); setSelectedTooth(id); toggleSurface(id, 'oclusal') }}
                            />
                            
                            {/* High-Readability Labels - Centered for better aesthetics */}
                            <text x="40" y="14" fontSize="16" textAnchor="middle" className="fill-charcoal pointer-events-none font-black drop-shadow-sm">V</text>
                            <text x="18" y="42" fontSize="16" textAnchor="middle" className="fill-charcoal pointer-events-none font-black drop-shadow-sm">D</text>
                            <text x="62" y="42" fontSize="16" textAnchor="middle" className="fill-charcoal pointer-events-none font-black drop-shadow-sm">M</text>
                            <text x="40" y="42" fontSize="16" textAnchor="middle" className="fill-charcoal pointer-events-none font-black drop-shadow-sm">O</text>
                            <text x="40" y="65" fontSize="16" textAnchor="middle" className="fill-charcoal pointer-events-none font-black drop-shadow-sm">P</text>
                        </g>
                    </svg>
                    
                    {data?.status && data.status !== 'healthy' && (
                        <g className="absolute inset-0 pointer-events-none">
                            <svg viewBox="0 0 100 200" className="w-full h-full overflow-visible">
                                <circle 
                                    cx="50" cy="45" r="38" 
                                    style={{ fill: TOOTH_STATES[data.status].hex }}
                                    className="opacity-40" 
                                />
                                {data.status === 'extraction' && <path d="M25,20 L75,70 M75,20 L25,70" style={{ stroke: TOOTH_STATES.extraction.hex }} className="stroke-[10]" />}
                                {data.status === 'missing' && <circle cx="50" cy="45" r="30" fill="none" style={{ stroke: TOOTH_STATES.missing.hex }} className="stroke-6" strokeDasharray="8 4" />}
                                {data.status === 'endo' && <path d="M50,45 L50,155" style={{ stroke: TOOTH_STATES.endo.hex }} className="stroke-[8]" />}
                                {data.status === 'crown' && <rect x="10" y="5" width="80" height="40" rx="6" fill="none" style={{ stroke: TOOTH_STATES.crown.hex }} className="stroke-8" />}
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

    const findings = Object.entries(teeth).filter(([_, t]) => t.status && t.status !== 'healthy')

    return (
        <div className="space-y-8 mt-4 animate-fade-in pb-20">
            {/* 1. Odontogram Visualizer - Full Width */}
            <div className="bg-white p-6 md:p-10 rounded-softer border border-silk-beige shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-charcoal tracking-tight">Ficha Odontológica</h3>
                        <p className="text-sm text-charcoal/40 font-medium italic">Alta resolución clínica e interacción precisa</p>
                    </div>
                    <div className="flex p-1 bg-silk-beige/30 rounded-full border border-silk-beige/50 shadow-inner">
                        <button 
                            onClick={() => { setDentition('adult'); setSelectedTooth(null) }}
                            className={cn("px-10 py-3 text-xs font-black rounded-full transition-all", dentition === 'adult' ? "bg-white text-primary-600 shadow-premium scale-105" : "text-charcoal/40 hover:text-charcoal")}
                        >
                            ADULTO
                        </button>
                        <button 
                            onClick={() => { setDentition('child'); setSelectedTooth(null) }}
                            className={cn("px-10 py-3 text-xs font-black rounded-full transition-all", dentition === 'child' ? "bg-white text-primary-600 shadow-premium scale-105" : "text-charcoal/40")}
                        >
                            INFANTIL
                        </button>
                    </div>
                </div>

                <div className="space-y-16 overflow-x-auto pb-10 scrollbar-hide py-10">
                    <div className="flex justify-center gap-3 min-w-max px-4">
                        {(dentition === 'adult' ? adultTeethUpper : childTeethUpper).map(id => renderTooth(id))}
                    </div>
                    <div className="flex justify-center gap-3 min-w-max px-4">
                        {(dentition === 'adult' ? adultTeethLower : childTeethLower).map(id => renderTooth(id))}
                    </div>
                </div>

                <div className="mt-12 pt-10 border-t border-silk-beige/50 flex flex-wrap justify-center gap-x-10 gap-y-4">
                    {Object.entries(TOOTH_STATES).map(([id, data]) => (
                        <div key={id} className="flex items-center gap-3 group cursor-help transition-all">
                            <div className={cn("w-3.5 h-3.5 rounded-full shadow-inner ring-2 ring-white", data.color)} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/40 group-hover:text-charcoal">{data.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Control Layout - Side by Side below */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* Left: Tooth Editor */}
                <div className="bg-white p-8 rounded-softer border border-silk-beige shadow-sm min-h-[500px]">
                    {selectedTooth ? (
                        <div className="animate-fade-in space-y-8 h-full">
                            <div className="flex items-center justify-between border-b border-silk-beige pb-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-primary-600 text-white rounded-softer flex items-center justify-center text-3xl font-black shadow-2xl shadow-primary-500/30 ring-4 ring-primary-50">
                                        {selectedTooth}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-charcoal text-xl tracking-tight leading-none">Pieza Dental</h4>
                                        <p className="text-xs text-charcoal/40 mt-1 uppercase font-black tracking-widest">Edición Activa</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTooth(null)} className="p-4 hover:bg-silk-beige/50 rounded-full transition-all text-charcoal/20 hover:text-charcoal"><RotateCcw className="w-6 h-6" /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(TOOTH_STATES).map(([id, data]) => (
                                    <button
                                        key={id}
                                        onClick={() => updateToothStatus(selectedTooth, id as any)}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-soft border transition-all text-xs font-black uppercase tracking-wider text-left",
                                            teeth[selectedTooth]?.status === id 
                                                ? "bg-primary-50 border-primary-300 text-primary-700 shadow-md ring-2 ring-primary-50" 
                                                : "bg-ivory/40 border-transparent text-charcoal/60 hover:bg-silk-beige/30"
                                        )}
                                    >
                                        <div className={cn("w-2.5 h-2.5 rounded-full shadow-inner", data.color)} />
                                        {data.label}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-4">
                                <label className="block text-[10px] font-black uppercase text-charcoal/40 tracking-widest mb-3 border-l-4 border-primary-500 pl-3">Notas Clínicas</label>
                                <textarea 
                                    className="w-full p-5 rounded-soft border border-silk-beige bg-ivory/20 text-sm font-medium focus:ring-4 focus:ring-primary-500/5 focus:border-primary-500 transition-all min-h-[160px] resize-none outline-none shadow-inner"
                                    placeholder="Observaciones de la pieza..."
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
                        </div>
                    ) : (
                        <div className="h-full py-20 text-center space-y-6 animate-fade-in flex flex-col items-center justify-center">
                            <div className="w-24 h-24 bg-ivory rounded-full flex items-center justify-center border-2 border-dashed border-silk-beige text-charcoal/5">
                                <Info className="w-12 h-12" />
                            </div>
                            <h4 className="font-black text-charcoal text-xl tracking-tight uppercase">Panel de Selección</h4>
                            <p className="text-sm text-charcoal/40 max-w-[280px] mx-auto font-medium">Pulsa una pieza dental para editarla</p>
                        </div>
                    )}
                </div>

                {/* Right: Smart Summary Card */}
                <div className="bg-charcoal text-white p-10 rounded-softer shadow-2xl flex flex-col h-full relative">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h4 className="text-xl font-black tracking-tight uppercase">Resumen de Diagnósticos</h4>
                            <p className="text-xs text-white font-bold tracking-widest uppercase">Tratamientos detectados</p>
                        </div>
                        <div className="bg-primary-500 text-[11px] font-black px-4 py-2 rounded-sm shadow-2xl shadow-primary-500/40 border border-primary-400">
                            {findings.length} HALLAZGOS
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] mb-10 custom-scrollbar">
                        {findings.length === 0 ? (
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-softer">
                                <p className="text-white/20 text-xs font-black uppercase tracking-widest text-center px-12 leading-relaxed">No hay diagnósticos pendientes</p>
                            </div>
                        ) : (
                            findings.map(([id, tooth]) => (
                                <div key={id} className="flex items-center justify-between p-5 bg-white/5 rounded-soft border border-white/5 group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-white/10 rounded-softer flex items-center justify-center text-xl font-black text-primary-400">{id}</div>
                                        <div>
                                            <p className="font-black text-lg leading-none mb-2 uppercase">{TOOTH_STATES[tooth.status!].label}</p>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {Object.entries(tooth.surfaces).filter(([_, active]) => active).map(([name]) => (
                                                    <span key={name} className="text-[10px] font-black bg-primary-500/20 border border-primary-500/30 px-2.5 py-1 rounded-sm text-primary-300">
                                                        {name.charAt(0).toUpperCase()}
                                                    </span>
                                                ))}
                                                {Object.values(tooth.surfaces).every(v => !v) && (
                                                    <span className="text-[10px] font-black bg-white/5 border border-white/10 px-2.5 py-1 rounded-sm text-white/40 italic">PIEZA COMPLETA</span>
                                                )}
                                            </div>
                                            {tooth.notes && (
                                                <p className="text-[10px] text-white/40 italic bg-white/5 p-2 rounded border-l border-primary-500 max-w-[200px] truncate group-hover:max-w-none group-hover:whitespace-normal transition-all">
                                                    "{tooth.notes}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setTeeth(prev => ({ ...prev, [id]: { ...prev[id], status: 'healthy', surfaces: { vestibular: false, lingual: false, mesial: false, distal: false, oclusal: false } as any } }))}
                                        className="opacity-0 group-hover:opacity-100 p-3 hover:bg-white/10 rounded-full transition-all text-white/20 hover:text-red-400"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleSaveOdontogram}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 rounded-soft text-sm font-black border border-white/10 transition-all uppercase tracking-widest active:scale-95"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            GUARDAR FICHA
                        </button>

                        <button
                            onClick={() => {
                                if (findings.length === 0) {
                                    toast.error('No hay tratamientos marcados')
                                    return
                                }
                                
                                const allItems = findings.map(([id, tooth]) => {
                                    const statusLabel = TOOTH_STATES[tooth.status!].label
                                    const activeSurfaces = Object.entries(tooth.surfaces)
                                        .filter(([_, active]) => active)
                                        .map(([name]) => name.charAt(0).toUpperCase())
                                        .join(', ')

                                    return {
                                        description: `${statusLabel} en Pieza ${id}${activeSurfaces ? ` (${activeSurfaces})` : ''}${tooth.notes ? ` - ${tooth.notes}` : ''}`,
                                        tooth_number: parseInt(id.toString()) || 0,
                                        quantity: 1,
                                        unit_price: 0
                                    }
                                })
                                
                                onAddTreatment?.(allItems)
                            }}
                            className="w-full py-7 bg-primary-500 hover:bg-primary-600 rounded-soft font-black text-3xl transition-all shadow-2xl flex items-center justify-center gap-5 active:scale-95 group border-2 border-primary-400"
                        >
                            <Plus className="w-10 h-10 group-hover:rotate-90 transition-transform duration-500" />
                            PRESUPUESTAR TODO
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

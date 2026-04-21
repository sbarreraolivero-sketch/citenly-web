import { useState, useEffect } from 'react'
import { Save, Loader2, Info, RotateCcw, Plus, Activity, Layers, Grid3X3, Check, X, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface OdontogramProps {
    patientId: string
    clinicId: string
    onAddTreatment?: (item: any) => void
    onAddClinicalRecord?: (data: any) => void
}

interface ToothData {
    id: string
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

const SEXTANTS = [
    { id: 1, label: 'Sextante 1', teeth: ['1.8', '1.7', '1.6', '1.5', '1.4'] },
    { id: 2, label: 'Sextante 2', teeth: ['1.3', '1.2', '1.1', '2.1', '2.2', '2.3'] },
    { id: 3, label: 'Sextante 3', teeth: ['2.4', '2.5', '2.6', '2.7', '2.8'] },
    { id: 4, label: 'Sextante 4', teeth: ['3.8', '3.7', '3.6', '3.5', '3.4'] },
    { id: 5, label: 'Sextante 5', teeth: ['3.3', '3.2', '3.1', '4.1', '4.2', '4.3'] },
    { id: 6, label: 'Sextante 6', teeth: ['4.4', '4.5', '4.6', '4.7', '4.8'] }
]

const ARCHES = [
    { id: 'superior', label: 'Arcada Superior', teeth: ['1.8', '1.7', '1.6', '1.5', '1.4', '1.3', '1.2', '1.1', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8'] },
    { id: 'inferior', label: 'Arcada Inferior', teeth: ['4.8', '4.7', '4.6', '4.5', '4.4', '4.3', '4.2', '4.1', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'] }
]

export function Odontogram({ patientId, clinicId, onAddTreatment, onAddClinicalRecord }: OdontogramProps) {
    const [teeth, setTeeth] = useState<Record<string, ToothData>>({})
    const [selectedTeeth, setSelectedTeeth] = useState<string[]>([])
    const [dentition, setDentition] = useState<'adult' | 'child'>('adult')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showProcedureModal, setShowProcedureModal] = useState(false)
    const [services, setServices] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchOdontogram()
        fetchServices()
    }, [patientId])

    const fetchOdontogram = async () => {
        try {
            const { data } = await (supabase as any)
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

    const fetchServices = async () => {
        try {
            const { data, error } = await (supabase as any).rpc('get_clinic_services_secure', {
                p_clinic_id: clinicId
            })
            if (data) setServices(data)
        } catch (error) {
            console.error('Error fetching services:', error)
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

    const toggleToothSelection = (id: string) => {
        setSelectedTeeth(prev => 
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        )
    }

    const applyProcedure = (service: any) => {
        if (selectedTeeth.length === 0) return

        const newTreatments = selectedTeeth.map(toothId => ({
            description: `${service.name} (Pieza ${toothId})`,
            tooth_number: toothId,
            quantity: 1,
            unit_price: service.price,
            total_price: service.price
        }))

        if (onAddTreatment) {
            onAddTreatment(newTreatments)
            toast.success(`${service.name} aplicado a ${selectedTeeth.length} piezas`)
        }

        // Update tooth status to something representative if it matches a state
        const statusToApply: ToothData['status'] = service.name.toLowerCase().includes('caries') ? 'caries' : 
                                               service.name.toLowerCase().includes('resina') || service.name.toLowerCase().includes('obturación') ? 'filling' : 'healthy'
        
        const updatedTeeth = { ...teeth }
        selectedTeeth.forEach(id => {
            updatedTeeth[id] = {
                ...(updatedTeeth[id] || { id, surfaces: { vestibular: false, lingual: false, mesial: false, distal: false, oclusal: false } }),
                status: statusToApply
            }
        })
        setTeeth(updatedTeeth)
        setSelectedTeeth([])
        setShowProcedureModal(false)
    }

    const selectSextant = (sextantTeeth: string[]) => {
        setSelectedTeeth(sextantTeeth)
        setShowProcedureModal(true)
    }

    const selectArch = (archTeeth: string[]) => {
        setSelectedTeeth(archTeeth)
        setShowProcedureModal(true)
    }

    const renderToothSVG = (id: string, isSelected: boolean) => {
        const data = teeth[id]
        const isMolar = id.includes('.8') || id.includes('.7') || id.includes('.6') || id.includes('.5') || id.includes('.4')

        return (
            <div 
                key={id} 
                className={cn(
                    "relative flex flex-col items-center p-1 transition-all rounded-soft border-2 cursor-pointer group",
                    isSelected ? "bg-primary-50 border-primary-500 shadow-lg scale-105 z-10" : "hover:bg-ivory border-transparent",
                    isMolar ? "min-w-[70px]" : "min-w-[60px]"
                )}
                onClick={() => toggleToothSelection(id)}
            >
                <span className={cn("text-[10px] font-black mb-2 transition-colors", isSelected ? "text-primary-700" : "text-charcoal/40 group-hover:text-charcoal")}>{id}</span>
                <div className={cn(
                    "relative flex flex-col items-center transition-transform",
                    isMolar ? "w-14 h-28" : "w-12 h-28"
                )}>
                    <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-sm overflow-visible">
                        <path 
                            d={isMolar ? "M15,80 Q15,185 50,195 Q85,185 85,80" : "M30,80 Q30,185 50,195 Q70,185 70,80"} 
                            className={cn("transition-colors", isSelected ? "fill-primary-100 stroke-primary-400" : "fill-charcoal/5 stroke-charcoal/20", "stroke-[2]")}
                        />
                        
                        <g transform="translate(10, 10)">
                            {/* Crown Background */}
                            <path 
                                d="M0,8 Q40,-5 80,8 L80,62 Q40,75 0,62 Z" 
                                style={{ fill: data?.status && data.status !== 'healthy' ? TOOTH_STATES[data.status].hex : '#ffffff' }}
                                className="stroke-charcoal/40 stroke-[2]"
                            />
                            
                            {/* Surface Segments - Smaller visual nodes for a cleaner look */}
                            <rect x="35" y="10" width="10" height="10" rx="2" className={cn("stroke-charcoal/40 stroke-[1]", data?.surfaces?.vestibular ? "fill-red-500" : "fill-white/80")} />
                            <rect x="10" y="30" width="10" height="10" rx="2" className={cn("stroke-charcoal/40 stroke-[1]", data?.surfaces?.distal ? "fill-red-500" : "fill-white/80")} />
                            <rect x="60" y="30" width="10" height="10" rx="2" className={cn("stroke-charcoal/40 stroke-[1]", data?.surfaces?.mesial ? "fill-red-500" : "fill-white/80")} />
                            <rect x="35" y="50" width="10" height="10" rx="2" className={cn("stroke-charcoal/40 stroke-[1]", data?.surfaces?.lingual ? "fill-red-500" : "fill-white/80")} />
                            <rect x="35" y="30" width="10" height="10" rx="2" className={cn("stroke-charcoal/40 stroke-[1]", data?.surfaces?.oclusal ? "fill-red-500" : "fill-white/80")} />
                        </g>

                        {/* Status Overlay Icons */}
                        {data?.status === 'missing' && <path d="M20,20 L80,80 M80,20 L20,80" className="stroke-red-500/40 stroke-[8]" />}
                        {data?.status === 'extraction' && <path d="M50,10 L50,70" className="stroke-orange-500 stroke-[8] stroke-dasharray-4" />}
                    </svg>
                </div>
            </div>
        )
    }

    const fdiUpper = ['1.8', '1.7', '1.6', '1.5', '1.4', '1.3', '1.2', '1.1', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8']
    const fdiLower = ['4.8', '4.7', '4.6', '4.5', '4.4', '4.3', '4.2', '4.1', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8']

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 bg-ivory rounded-soft border border-silk-beige mt-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
            <p className="text-charcoal/60">Cargando odontograma...</p>
        </div>
    )

    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6 mt-4 animate-fade-in pb-20">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-softer border border-silk-beige shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-700 text-white rounded-full flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-black text-charcoal tracking-tight">Odontograma FDI</h3>
                        <p className="text-[10px] text-charcoal/40 uppercase font-black tracking-widest leading-none">Notación Internacional</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSaveOdontogram}
                        disabled={saving}
                        className="btn-soft text-primary-700 border-primary-100 flex items-center gap-2 px-6"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Cambios
                    </button>
                    {selectedTeeth.length > 0 && (
                        <button 
                            onClick={() => setShowProcedureModal(true)}
                            className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary-500/20 animate-bounce-subtle"
                        >
                            <Plus className="w-4 h-4" />
                            Definir Procedimiento ({selectedTeeth.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Selection Shortcuts (Sextants & Arches) */}
            <div className="flex flex-wrap items-center gap-2 px-2">
                <div className="flex items-center gap-2 border-r border-silk-beige pr-4 mr-2">
                    <span className="text-[9px] font-black text-charcoal/40 uppercase tracking-widest">Sextantes:</span>
                    {SEXTANTS.map(s => (
                        <button 
                            key={s.id}
                            onClick={() => selectSextant(s.teeth)}
                            className="px-2 py-1 bg-white border border-silk-beige rounded-soft text-[10px] font-bold hover:bg-primary-50 hover:border-primary-200 transition-colors"
                        >
                            S{s.id}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-charcoal/40 uppercase tracking-widest">Arcadas:</span>
                    {ARCHES.map(a => (
                        <button 
                            key={a.id}
                            onClick={() => selectArch(a.teeth)}
                            className="px-3 py-1 bg-white border border-silk-beige rounded-soft text-[10px] font-bold hover:bg-primary-50 hover:border-primary-200 transition-colors uppercase"
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Odontogram Visualization */}
            <div className="bg-white p-8 rounded-softer border border-silk-beige shadow-sm overflow-x-auto scrollbar-hide">
                <div className="space-y-12 min-w-max">
                    {/* Upper Jaws */}
                    <div className="flex justify-center gap-1">
                        {fdiUpper.map(id => renderToothSVG(id, selectedTeeth.includes(id)))}
                    </div>
                    {/* Lower Jaws */}
                    <div className="flex justify-center gap-1 pt-12 border-t-2 border-dashed border-silk-beige/30">
                        {fdiLower.map(id => renderToothSVG(id, selectedTeeth.includes(id)))}
                    </div>
                </div>
            </div>

            {/* Procedures Side Panel / Modal (User requested emergent) */}
            {showProcedureModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-softer shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
                        <div className="p-6 border-b border-silk-beige bg-ivory flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-charcoal tracking-tight">Definir Procedimiento</h3>
                                <p className="text-xs text-charcoal/40 font-bold uppercase tracking-widest">Piezas: {selectedTeeth.join(', ')}</p>
                            </div>
                            <button onClick={() => setShowProcedureModal(false)} className="p-2 hover:bg-silk-beige rounded-full transition-colors text-charcoal/40">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 border-b border-silk-beige">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar prestación (ej: Resina, Limpieza...)"
                                    className="input-soft w-full pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-silk-beige/10">
                            {filteredServices.length === 0 ? (
                                <div className="py-12 text-center text-charcoal/40 text-sm italic">No se encontraron prestaciones.</div>
                            ) : (
                                filteredServices.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => applyProcedure(service)}
                                        className="w-full flex items-center justify-between p-4 bg-white border border-silk-beige rounded-soft hover:border-primary-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="text-left">
                                            <p className="font-bold text-charcoal group-hover:text-primary-700">{service.name}</p>
                                            <p className="text-[10px] text-charcoal/40 uppercase font-bold tracking-widest">{service.duration} MIN · ${service.price.toLocaleString()}</p>
                                        </div>
                                        <Plus className="w-5 h-5 text-charcoal/20 group-hover:text-primary-500" />
                                    </button>
                                ))
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-silk-beige bg-white">
                            <button 
                                onClick={() => setShowProcedureModal(false)}
                                className="btn-ghost w-full py-4 text-sm font-black uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

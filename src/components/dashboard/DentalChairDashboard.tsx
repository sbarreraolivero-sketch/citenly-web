import { Monitor, User, UserPlus, LogOut, Clock, Loader2, RefreshCw, Plus, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface Box {
    id: string
    name: string
    is_active: boolean
}

interface Session {
    id: string
    box_id: string
    patient_id: string
    professional_id: string
    started_at: string
    status: 'active' | 'completed' | 'waiting' | 'maintenance'
    patient?: { name: string }
    professional?: { full_name: string }
}

export function DentalChairDashboard() {
    const { profile } = useAuth()
    const [boxes, setBoxes] = useState<Box[]>([])
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [initializing, setInitializing] = useState(false)
    const [showAddBox, setShowAddBox] = useState(false)
    const [newBoxName, setNewBoxName] = useState('')

    useEffect(() => {
        if (profile?.clinic_id) {
            fetchData()
        }
    }, [profile?.clinic_id])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Boxes
            const { data: boxesData } = await (supabase as any)
                .from('dental_boxes')
                .select('*')
                .eq('clinic_id', profile?.clinic_id)
                .eq('is_active', true)
                .order('name')

            if (boxesData) setBoxes(boxesData)

            // Fetch Active Sessions
            const { data: sessionsData } = await (supabase as any)
                .from('dental_sessions')
                .select(`
                    *,
                    patient:patients(name),
                    professional:user_profiles(full_name)
                `)
                .eq('clinic_id', profile?.clinic_id)
                .eq('status', 'active')

            if (sessionsData) setSessions(sessionsData)
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const initializeDefaultBoxes = async () => {
        if (!profile?.clinic_id) return
        setInitializing(true)
        try {
            const defaults = [
                { clinic_id: profile.clinic_id, name: 'BOX 1' },
                { clinic_id: profile.clinic_id, name: 'BOX 2' },
                { clinic_id: profile.clinic_id, name: 'BOX 3' },
                { clinic_id: profile.clinic_id, name: 'Sillón Principal' }
            ]

            const { error } = await (supabase as any)
                .from('dental_boxes')
                .insert(defaults)

            if (error) throw error
            toast.success('Sillones inicializados')
            fetchData()
        } catch (error) {
            console.error('Error initializing boxes:', error)
            toast.error('Error al inicializar')
        } finally {
            setInitializing(false)
        }
    }

    const handleAddBox = async () => {
        if (!newBoxName.trim() || !profile?.clinic_id) return
        setInitializing(true)
        try {
            const { error } = await (supabase as any)
                .from('dental_boxes')
                .insert({ clinic_id: profile.clinic_id, name: newBoxName.trim() })

            if (error) throw error
            toast.success('Box agregado')
            setNewBoxName('')
            setShowAddBox(false)
            fetchData()
        } catch (error) {
            toast.error('Error al agregar')
        } finally {
            setInitializing(false)
        }
    }

    const handleEndSession = async (sessionId: string) => {
        try {
            const { error } = await (supabase as any)
                .from('dental_sessions')
                .update({ 
                    status: 'completed',
                    ended_at: new Date().toISOString()
                })
                .eq('id', sessionId)

            if (error) throw error
            toast.success('Sesión finalizada')
            fetchData()
        } catch (error) {
            toast.error('Error al finalizar sesión')
        }
    }

    const getOccupancyColor = (status?: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500 border-emerald-600'
            case 'waiting': return 'bg-amber-500 border-amber-600'
            case 'maintenance': return 'bg-gray-400 border-gray-500'
            default: return 'bg-white border-silk-beige'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black text-charcoal">Tablero de Sillones</h3>
                    <p className="text-sm text-charcoal/40 font-bold uppercase tracking-widest">Estado de la clínica en tiempo real</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowAddBox(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-silk-beige text-charcoal/60 text-[10px] font-black uppercase tracking-widest rounded-soft hover:bg-ivory transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Agregar Box
                    </button>
                    <button 
                        onClick={fetchData}
                        className="p-2.5 hover:bg-ivory rounded-full border border-silk-beige text-charcoal/40 hover:text-primary-600 transition-all"
                    >
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {showAddBox && (
                <div className="bg-ivory/50 p-6 rounded-softer border border-silk-beige flex items-center justify-between animate-scale-in">
                    <div className="flex-1 max-w-md">
                        <label className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest block mb-2">Nombre del Nuevo Box / Sillón</label>
                        <div className="flex gap-3">
                            <input 
                                type="text"
                                value={newBoxName}
                                onChange={(e) => setNewBoxName(e.target.value)}
                                placeholder="Ej: BOX 4 o Sillón Cirugía"
                                className="input-soft flex-1 font-bold"
                                autoFocus
                            />
                            <button 
                                onClick={handleAddBox}
                                disabled={initializing || !newBoxName.trim()}
                                className="px-6 py-2 bg-primary-600 text-white rounded-soft flex items-center gap-2 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                            >
                                {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Confirmar
                            </button>
                            <button 
                                onClick={() => setShowAddBox(false)}
                                className="p-2 text-charcoal/40 hover:text-red-500 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {boxes.map(box => {
                    const session = sessions.find(s => s.box_id === box.id)
                    const isOccupied = !!session

                    return (
                        <div 
                            key={box.id}
                            className={cn(
                                "group relative bg-white rounded-softer shadow-xl border-2 transition-all p-6 flex flex-col gap-5",
                                isOccupied ? "border-emerald-500/30 scale-[1.02]" : "border-silk-beige opacity-80 hover:opacity-100"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full shadow-inner flex items-center justify-center text-white border-2",
                                        getOccupancyColor(session?.status)
                                    )}>
                                        <Monitor className="w-6 h-6" />
                                    </div>
                                    <span className="text-lg font-black text-charcoal tracking-tight">{box.name}</span>
                                </div>
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                    isOccupied ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"
                                )}>
                                    {isOccupied ? 'Ocupado' : 'Disponible'}
                                </div>
                            </div>

                            {isOccupied ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 bg-ivory/50 p-3 rounded-soft border border-silk-beige/50">
                                            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary-500">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest leading-none mb-1">Paciente</span>
                                                <span className="text-sm font-black text-charcoal">{session.patient?.name}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-ivory/50 p-3 rounded-soft border border-silk-beige/50">
                                            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary-500">
                                                <UserPlus className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest leading-none mb-1">Doctor</span>
                                                <span className="text-sm font-black text-charcoal">{session.professional?.full_name}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between px-2 pt-2">
                                            <div className="flex items-center gap-2 text-charcoal/40">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-xs font-black">
                                                    {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => handleEndSession(session.id)}
                                                className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 uppercase tracking-widest"
                                            >
                                                <LogOut className="w-3.5 h-3.5" /> Finalizar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-silk-beige rounded-soft bg-ivory/20 group-hover:bg-ivory/50 transition-colors">
                                    <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest text-center px-4">
                                        Asigna un paciente desde su ficha para ocupar este sillón
                                    </p>
                                </div>
                            )}
                        </div>
                    )
                })}

                    <div className="col-span-full py-20 text-center space-y-6">
                        <Monitor className="w-16 h-16 text-charcoal/10 mx-auto" />
                        <div className="space-y-2">
                            <h4 className="text-xl font-black text-charcoal/40">No hay boxes configurados</h4>
                            <p className="text-sm text-charcoal/30 max-w-sm mx-auto">Inicializa los sillones básicos o agrega los tuyos manualmente para empezar a monitorear la clínica.</p>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <button 
                                onClick={initializeDefaultBoxes}
                                disabled={initializing}
                                className="px-8 py-3 bg-primary-600 text-white rounded-soft font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-500/20 hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center gap-3"
                            >
                                {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Inicializar Básicos
                            </button>
                            <button 
                                onClick={() => setShowAddBox(true)}
                                className="px-8 py-3 bg-white border border-silk-beige text-charcoal/60 rounded-soft font-black text-xs uppercase tracking-widest hover:bg-ivory transition-all shadow-sm flex items-center gap-3"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar Manualmente
                            </button>
                        </div>
                    </div>
            </div>
        </div>
    )
}

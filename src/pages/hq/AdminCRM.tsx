import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Target, Loader2, Building2, Mail, Phone, Calendar, ChevronDown, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemoRequest {
    id: string
    name: string
    clinic_name: string
    phone: string
    email: string
    clinic_type: string
    needs: string
    role: string
    scheduled_at: string | null
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
    crm_stage: string | null
    crm_notes: string | null
    created_at: string
}

// Etapas que la IA puede mover automáticamente según comportamiento del lead (igual que Vetly)
const STAGES = [
    { id: 'nuevo',               label: 'Nuevo',               color: 'bg-indigo-500',   bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  text: 'text-indigo-400' },
    { id: 'contactado',          label: 'Contactado',          color: 'bg-sky-500',      bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     text: 'text-sky-400' },
    { id: 'prueba_iniciada',     label: 'Prueba Iniciada',     color: 'bg-amber-500',    bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400' },
    { id: 'convertido',          label: 'Convertido',          color: 'bg-emerald-500',  bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    { id: 'postergado_perdido',  label: 'Postergado/Perdido',  color: 'bg-red-500',      bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400' },
]

export default function AdminCRM() {
    const [leads, setLeads] = useState<DemoRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [notesEdit, setNotesEdit] = useState<{ id: string; value: string } | null>(null)

    const fetchLeads = useCallback(async () => {
        setLoading(true)
        const { data } = await (supabase as any)
            .from('demo_requests')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setLeads(data)
        setLoading(false)
    }, [])

    useEffect(() => { fetchLeads() }, [fetchLeads])

    const updateStage = async (id: string, stage: string) => {
        setUpdatingId(id)
        await (supabase as any).from('demo_requests').update({ crm_stage: stage }).eq('id', id)
        setLeads(prev => prev.map(l => l.id === id ? { ...l, crm_stage: stage } : l))
        setUpdatingId(null)
    }

    const saveNotes = async (id: string, notes: string) => {
        await (supabase as any).from('demo_requests').update({ crm_notes: notes }).eq('id', id)
        setLeads(prev => prev.map(l => l.id === id ? { ...l, crm_notes: notes } : l))
        setNotesEdit(null)
    }

    const stageGroups = STAGES.map(stage => ({
        ...stage,
        leads: leads.filter(l => (l.crm_stage || 'nuevo') === stage.id),
    }))

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Target className="w-6 h-6 text-[#FF2E88]" />
                        CRM de Prospectos
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Pipeline de demos y conversiones de Citenly</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-[#FF2E88]/10 text-[#FF2E88] border border-[#FF2E88]/20 rounded-lg text-sm font-bold">
                        {leads.length} prospectos en total
                    </span>
                </div>
            </div>

            {/* Kanban */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {stageGroups.map(stage => (
                    <div key={stage.id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
                        {/* Column header */}
                        <div className={cn('flex items-center justify-between px-4 py-3 border-b border-white/10', stage.bg)}>
                            <div className="flex items-center gap-2">
                                <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                                <span className={cn('text-sm font-black uppercase tracking-wider', stage.text)}>{stage.label}</span>
                            </div>
                            <span className={cn('text-xs font-black w-5 h-5 rounded-full flex items-center justify-center', stage.bg, stage.border, 'border', stage.text)}>
                                {stage.leads.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="p-3 space-y-2 min-h-[120px]">
                            {stage.leads.length === 0 ? (
                                <div className="flex items-center justify-center py-6">
                                    <p className="text-xs text-gray-700">Sin prospectos</p>
                                </div>
                            ) : stage.leads.map(lead => (
                                <div key={lead.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                                    {/* Card header */}
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{lead.name}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Building2 className="w-3 h-3 shrink-0" />
                                                    <span className="truncate">{lead.clinic_name}</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                                                className="text-gray-600 hover:text-gray-400 transition-colors shrink-0 mt-0.5"
                                            >
                                                <ChevronDown className={cn('w-4 h-4 transition-transform', expandedId === lead.id && 'rotate-180')} />
                                            </button>
                                        </div>

                                        {/* Quick contact */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <a
                                                href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Hola ${lead.name}, te contactamos desde Citenly.`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg hover:bg-emerald-500/20 transition-colors"
                                            >
                                                <MessageSquare className="w-3 h-3" /> WA
                                            </a>
                                            {lead.scheduled_at && (
                                                <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(lead.scheduled_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {expandedId === lead.id && (
                                        <div className="border-t border-white/10 p-3 space-y-3">
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] text-gray-600 flex items-center gap-1.5">
                                                    <Mail className="w-3 h-3" /> {lead.email}
                                                </p>
                                                <p className="text-[10px] text-gray-600 flex items-center gap-1.5">
                                                    <Phone className="w-3 h-3" /> {lead.phone}
                                                </p>
                                                {lead.clinic_type && (
                                                    <p className="text-[10px] text-gray-600">{lead.clinic_type}</p>
                                                )}
                                                {lead.needs && (
                                                    <p className="text-[10px] text-gray-600 italic">{lead.needs}</p>
                                                )}
                                            </div>

                                            {/* Stage selector */}
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">Mover a etapa</p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {STAGES.filter(s => s.id !== stage.id).map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => updateStage(lead.id, s.id)}
                                                            disabled={updatingId === lead.id}
                                                            className={cn(
                                                                'text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all',
                                                                s.bg, s.border, s.text,
                                                                'hover:opacity-80'
                                                            )}
                                                        >
                                                            {s.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">Notas</p>
                                                {notesEdit?.id === lead.id ? (
                                                    <div className="space-y-1.5">
                                                        <textarea
                                                            value={notesEdit.value}
                                                            onChange={e => setNotesEdit({ id: lead.id, value: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#FF2E88]/40 resize-none"
                                                            rows={3}
                                                            placeholder="Escribe notas sobre este prospecto…"
                                                        />
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => saveNotes(lead.id, notesEdit.value)}
                                                                className="flex-1 text-[10px] font-black bg-[#FF2E88]/20 text-[#FF2E88] border border-[#FF2E88]/30 py-1 rounded-lg hover:bg-[#FF2E88]/30 transition-colors"
                                                            >
                                                                Guardar
                                                            </button>
                                                            <button
                                                                onClick={() => setNotesEdit(null)}
                                                                className="flex-1 text-[10px] font-black bg-white/5 text-gray-500 border border-white/10 py-1 rounded-lg hover:bg-white/10 transition-colors"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setNotesEdit({ id: lead.id, value: lead.crm_notes || '' })}
                                                        className="w-full text-left text-[10px] text-gray-600 bg-white/[0.03] border border-white/5 rounded-lg p-2 hover:border-white/15 transition-colors"
                                                    >
                                                        {lead.crm_notes || 'Sin notas — click para agregar'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

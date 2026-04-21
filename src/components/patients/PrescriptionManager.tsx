import { useState, useEffect } from 'react'
import { Plus, Trash2, Printer, Save, Loader2, Pill, Search, ClipboardList, Building2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface PrescriptionManagerProps {
    patientId: string
    clinicId: string
    patientName: string
    clinicName?: string
}

interface Medication {
    name: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
}

export function PrescriptionManager({ patientId, clinicId, patientName, clinicName = "Nuestra Clínica" }: PrescriptionManagerProps) {
    const [prescriptions, setPrescriptions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [currentMedications, setCurrentMedications] = useState<Medication[]>([
        { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ])
    const [generalNotes, setGeneralNotes] = useState('')
    const [clinicLogo, setClinicLogo] = useState<string | null>(null)

    useEffect(() => {
        fetchPrescriptions()
        fetchClinicBranding()
    }, [patientId])

    const fetchClinicBranding = async () => {
        try {
            const { data } = await (supabase as any)
                .from('clinic_settings')
                .select('logo_url')
                .eq('id', clinicId)
                .single()
            if (data?.logo_url) setClinicLogo(data.logo_url)
        } catch (err) {
            console.error('Error fetching branding:', err)
        }
    }

    const fetchPrescriptions = async () => {
        try {
            const { data } = await (supabase as any)
                .from('dental_prescriptions')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
            
            if (data) setPrescriptions(data)
        } catch (error) {
            console.error('Error fetching prescriptions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddMedication = () => {
        setCurrentMedications([...currentMedications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }])
    }

    const handleRemoveMedication = (index: number) => {
        setCurrentMedications(currentMedications.filter((_, i) => i !== index))
    }

    const updateMedication = (index: number, field: keyof Medication, value: string) => {
        const updated = [...currentMedications]
        updated[index][field] = value
        setCurrentMedications(updated)
    }

    const handleSave = async () => {
        if (currentMedications.some(m => !m.name)) {
            toast.error('Debe ingresar al menos un nombre de medicamento')
            return
        }

        setSaving(true)
        try {
            const { error } = await (supabase as any)
                .from('dental_prescriptions')
                .insert({
                    patient_id: patientId,
                    clinic_id: clinicId,
                    medications: currentMedications,
                    notes: generalNotes,
                    created_at: new Date().toISOString()
                } as any)

            if (error) throw error
            toast.success('Receta creada exitosamente')
            setShowForm(false)
            setCurrentMedications([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }])
            setGeneralNotes('')
            fetchPrescriptions()
        } catch (error) {
            console.error('Error saving prescription:', error)
            toast.error('Error al guardar la receta')
        } finally {
            setSaving(false)
        }
    }

    const printPrescription = (prescription: any) => {
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const medsHtml = prescription.medications.map((m: Medication) => `
            <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div style="font-size: 16px; font-weight: bold; color: #1a202c;">${m.name} ${m.dosage}</div>
                <div style="font-size: 14px; color: #4a5568; margin-top: 4px;">Tomar cada ${m.frequency} por un periodo de ${m.duration}</div>
                <div style="font-size: 13px; color: #718096; italic; margin-top: 4px;">Instrucciones: ${m.instructions}</div>
            </div>
        `).join('')

        printWindow.document.write(`
            <html>
                <head>
                    <title>Receta - ${patientName}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a202c; line-height: 1.5; }
                        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #2d3748; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo { max-height: 60px; }
                        .clinic-info { text-align: right; }
                        .patient-info { background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
                        .prescription-title { font-size: 24px; font-weight: 900; letter-spacing: -0.025em; text-transform: uppercase; margin-bottom: 20px; color: #2d3748; }
                        .footer { margin-top: 60px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #a0aec0; text-align: center; }
                        .signature { margin-top: 80px; text-align: center; border-top: 1px solid #2d3748; width: 250px; margin-left: auto; margin-right: auto; padding-top: 10px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        ${clinicLogo ? `<img src="${clinicLogo}" class="logo" />` : `<div><h1 style="margin:0; font-size:20px;">${clinicName}</h1></div>`}
                        <div class="clinic-info">
                            <div style="font-weight: bold;">Receta Médica Electrónica</div>
                            <div style="font-size: 12px; color: #718096;">Fecha: ${new Date(prescription.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    
                    <div class="patient-info">
                        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.05em;">Paciente</div>
                        <div style="font-size: 18px; font-weight: 800;">${patientName}</div>
                    </div>

                    <div class="prescription-title">Rp. / Indicación Médica</div>
                    
                    <div style="min-height: 400px;">
                        ${medsHtml}
                        ${prescription.notes ? `<div style="margin-top: 30px; padding: 15px; background: #fffbe6; border-radius: 6px; font-size: 13px;"><strong>Notas Adicionales:</strong><br/>${prescription.notes}</div>` : ''}
                    </div>

                    <div class="signature">Firma del Profesional</div>

                    <div class="footer">
                        Este documento ha sido generado por el sistema de gestión odontológica Citenly.
                    </div>
                </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.print()
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between bg-white p-6 rounded-softer border border-silk-beige shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-charcoal tracking-tight">Recetario Digital</h3>
                        <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-widest leading-none">Generación de indicaciones farmacológicas</p>
                    </div>
                </div>

                <button 
                    onClick={() => setShowForm(true)}
                    className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-primary-500/20"
                >
                    <Plus className="w-4 h-4" />
                    <span className="font-black text-xs uppercase tracking-widest">Nueva Receta</span>
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-softer shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
                        <div className="p-8 border-b border-silk-beige flex items-center justify-between bg-ivory/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-soft shadow-inner flex items-center justify-center border border-silk-beige">
                                    <Pill className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-charcoal tracking-tight">Crear Nueva Receta</h3>
                                    <p className="text-xs text-charcoal/40 font-bold uppercase tracking-widest">Paciente: {patientName}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-silk-beige rounded-full transition-colors text-charcoal/40">
                                <X className="w-7 h-7" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black uppercase text-charcoal/40 tracking-widest flex items-center gap-2">
                                        Medicamentos Indicados
                                    </label>
                                    <button 
                                        onClick={handleAddMedication}
                                        className="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Añadir Fármaco
                                    </button>
                                </div>

                                {currentMedications.map((med, idx) => (
                                    <div key={idx} className="group relative bg-silk-beige/10 border border-silk-beige/50 p-6 rounded-soft hover:border-indigo-200 transition-all">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="text-[9px] font-black text-charcoal/30 uppercase mb-1 block">Nombre y Presentación</label>
                                                <input 
                                                    placeholder="Ej: Amoxicilina 500mg"
                                                    value={med.name}
                                                    onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                                                    className="input-soft w-full font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-charcoal/30 uppercase mb-1 block">Frecuencia</label>
                                                <input 
                                                    placeholder="Cada 8 horas"
                                                    value={med.frequency}
                                                    onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                                                    className="input-soft w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-charcoal/30 uppercase mb-1 block">Duración</label>
                                                <input 
                                                    placeholder="7 días"
                                                    value={med.duration}
                                                    onChange={(e) => updateMedication(idx, 'duration', e.target.value)}
                                                    className="input-soft w-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label className="text-[9px] font-black text-charcoal/30 uppercase mb-1 block">Dosificación e Instrucciones específicas</label>
                                            <textarea 
                                                placeholder="Ej: Tomar 1 comprimido después del desayuno..."
                                                value={med.instructions}
                                                onChange={(e) => updateMedication(idx, 'instructions', e.target.value)}
                                                className="input-soft w-full h-20 resize-none text-xs"
                                            />
                                        </div>
                                        {currentMedications.length > 1 && (
                                            <button 
                                                onClick={() => handleRemoveMedication(idx)}
                                                className="absolute -right-3 -top-3 bg-white text-red-400 hover:text-red-500 p-2 rounded-full shadow-lg border border-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4">
                                <label className="text-[11px] font-black uppercase text-charcoal/40 tracking-widest block mb-2">Observaciones / Recomendaciones Generales</label>
                                <textarea 
                                    className="input-soft w-full h-32 text-sm p-4"
                                    placeholder="Indicaciones dietéticas, cuidados, etc..."
                                    value={generalNotes}
                                    onChange={(e) => setGeneralNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-8 border-t border-silk-beige flex gap-4 bg-white">
                            <button 
                                onClick={() => setShowForm(false)}
                                className="btn-ghost flex-1 py-4 font-black text-sm uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary flex-[2] py-4 shadow-xl shadow-primary-500/10 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Emitir y Guardar Receta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-silk-beige/10 animate-pulse rounded-soft" />)
                ) : prescriptions.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-softer border border-dashed border-silk-beige">
                        <p className="text-charcoal/40 font-bold uppercase tracking-[0.2em] text-xs leading-loose">No hay recetas emitidas aún</p>
                    </div>
                ) : (
                    prescriptions.map((pr) => (
                        <div key={pr.id} className="card-soft p-6 group hover:shadow-xl transition-all border-l-4 border-indigo-500 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-sm text-[10px] font-black uppercase tracking-widest">
                                        Emitida el {new Date(pr.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => printPrescription(pr)}
                                            className="p-2 hover:bg-primary-50 rounded-full text-charcoal/20 hover:text-primary-600 transition-colors"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 mb-6">
                                    {pr.medications.slice(0, 2).map((m: any, i: number) => (
                                        <p key={i} className="text-sm font-bold text-charcoal truncate flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                            {m.name}
                                        </p>
                                    ))}
                                    {pr.medications.length > 2 && (
                                        <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest">+ {pr.medications.length - 2} fármacos más</p>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => printPrescription(pr)}
                                className="w-full py-2.5 bg-indigo-600 text-white rounded-soft text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Maximize2 className="w-3.5 h-3.5" /> Ver Detalle / Imprimir
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

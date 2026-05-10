import React from 'react'
import { 
    Clock, 
    Save, 
    Loader2, 
    CheckCircle2, 
    Calendar,
    Plus,
    History,
    Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduleSettingsTabProps {
    dayOrder: string[];
    dayNames: Record<string, string>;
    workingHours: any;
    setWorkingHours: (val: any) => void;
    handleSaveSchedule: () => void;
    savingSchedule: boolean;
    scheduleSaved: boolean;
    blockedDates: any[];
    loadingBlockedDates: boolean;
    newBlockedDate: string;
    setNewBlockedDate: (val: string) => void;
    newBlockedReason: string;
    setNewBlockedReason: (val: string) => void;
    handleAddBlockedDate: () => void;
    handleDeleteBlockedDate: (id: string) => void;
    isAddingBlockedDate: boolean;
}

export const ScheduleSettingsTab: React.FC<ScheduleSettingsTabProps> = ({
    dayOrder,
    dayNames,
    workingHours,
    setWorkingHours,
    handleSaveSchedule,
    savingSchedule,
    scheduleSaved,
    blockedDates,
    loadingBlockedDates,
    newBlockedDate,
    setNewBlockedDate,
    newBlockedReason,
    setNewBlockedReason,
    handleAddBlockedDate,
    handleDeleteBlockedDate,
    isAddingBlockedDate
}) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="card-premium p-6">
                <h2 className="text-lg font-semibold text-primary-theme mb-6 text-primary-theme">Horarios de Atención</h2>
                <div className="space-y-3">
                    {dayOrder.map((day) => {
                        const hours = workingHours[day];
                        return (
                            <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-secondary-theme rounded-soft border border-theme/30">
                                <div className="flex items-center justify-between w-full sm:w-28 flex-shrink-0">
                                    <p className="font-bold text-primary-theme uppercase tracking-wider text-xs">{dayNames[day]}</p>
                                    <input
                                        type="checkbox"
                                        checked={hours !== null}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setWorkingHours((prev: any) => ({
                                                ...prev,
                                                [day]: checked ? { open: '09:00', close: '18:00' } : null
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-theme text-[#FF2E88]"
                                    />
                                </div>
                                {hours && (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            type="time"
                                            value={hours.open}
                                            onChange={(e) => setWorkingHours((prev: any) => ({
                                                ...prev,
                                                [day]: { ...prev[day], open: e.target.value }
                                            }))}
                                            className="px-3 py-2 bg-primary-theme/5 border border-theme rounded-xl text-sm font-bold text-primary-theme"
                                        />
                                        <span className="text-primary-theme/40 text-xs">a</span>
                                        <input
                                            type="time"
                                            value={hours.close}
                                            onChange={(e) => setWorkingHours((prev: any) => ({
                                                ...prev,
                                                [day]: { ...prev[day], close: e.target.value }
                                            }))}
                                            className="px-3 py-2 bg-primary-theme/5 border border-theme rounded-xl text-sm font-bold text-primary-theme"
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-6 pt-6 border-t border-theme flex items-center gap-4">
                    <button onClick={handleSaveSchedule} disabled={savingSchedule} className="btn-premium-primary flex items-center gap-2">
                        {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Horarios
                    </button>
                    {scheduleSaved && <span className="text-[#FF2E88] text-sm animate-fade-in">¡Guardado!</span>}
                </div>
            </div>

            <div className="card-premium p-6">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-[#FF2E88]/5 rounded-2xl flex items-center justify-center border border-[#FF2E88]/10">
                        <Calendar className="w-7 h-7 text-[#FF2E88]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#0B0B0F] tracking-tight">Días de Cierre Especial</h2>
                        <p className="text-sm text-[#0B0B0F]/50 font-medium">Bloquea días específicos para que la IA no agende citas.</p>
                    </div>
                </div>
                {/* Bloqueo de días UI... simplificado pero funcional */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="date" value={newBlockedDate} onChange={(e) => setNewBlockedDate(e.target.value)} className="input-premium" />
                    <input type="text" value={newBlockedReason} onChange={(e) => setNewBlockedReason(e.target.value)} placeholder="Motivo" className="input-premium" />
                    <button onClick={handleAddBlockedDate} disabled={isAddingBlockedDate} className="btn-premium-primary">
                        {isAddingBlockedDate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Bloquear Día
                    </button>
                </div>
            </div>
        </div>
    )
}

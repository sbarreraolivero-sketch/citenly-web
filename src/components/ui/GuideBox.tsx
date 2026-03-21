import React, { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuideBoxProps {
    title: string;
    summary: string;
    children: React.ReactNode;
    className?: string;
}

export const GuideBox = ({ title, summary, children, className }: GuideBoxProps) => {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <div className={cn("bg-silk-beige/10 border border-silk-beige/50 rounded-soft overflow-hidden transition-all duration-300 mt-2 mb-4", className)}>
            <button
                onClick={() => (setIsOpen(!isOpen))}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-silk-beige/20 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-premium-gradient rounded-full flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                        <HelpCircle className="w-4.5 h-4.5 text-charcoal" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-charcoal uppercase tracking-widest">{title}</p>
                        <p className="text-[11px] text-charcoal/60 mt-0.5 font-medium">{summary}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {isOpen ? 'Cerrar Guía' : 'Ver Guía Completa'}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-charcoal/40" /> : <ChevronDown className="w-4 h-4 text-charcoal/40" />}
                </div>
            </button>
            {isOpen && (
                <div className="px-5 pb-5 animate-slide-up">
                    <div className="pt-3 border-t border-silk-beige/30 text-[12.5px] text-charcoal/75 leading-relaxed">
                        <div className="space-y-3">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

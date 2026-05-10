import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Zap, 
  Calendar,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'monthly_refill' | 'purchase' | 'usage' | 'adjustment';
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  metadata?: any;
}

export const AITransactionHistory: React.FC<{ clinicId: string }> = ({ clinicId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [clinicId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_credit_transactions')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'monthly_refill': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'purchase': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'usage': return 'text-[#FF2E88] bg-[#FF2E88]/5 border-[#FF2E88]/10';
      default: return 'text-amber-600 bg-amber-50 border-amber-100';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly_refill': return 'Recarga Plan';
      case 'purchase': return 'Compra Extra';
      case 'usage': return 'Consumo';
      default: return 'Ajuste';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-10 h-10 border-4 border-[#FF2E88]/20 border-t-[#FF2E88] rounded-full animate-spin"></div>
        <p className="text-primary-theme/40 text-sm font-bold italic animate-pulse">Cargando historial de créditos...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
        {/* Header Estilo Citenly */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF2E88]/10 rounded-xl flex items-center justify-center border border-[#FF2E88]/20">
                    <History className="w-5 h-5 text-[#FF2E88]" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-primary-theme uppercase tracking-wider">Historial de Transacciones</h3>
                    <p className="text-[11px] text-primary-theme/50 font-medium">Transparencia total en el consumo de tu IA</p>
                </div>
            </div>
            <button 
                onClick={fetchTransactions}
                className="p-2 hover:bg-primary-theme/5 rounded-lg transition-colors text-primary-theme/30 hover:text-[#FF2E88]"
            >
                <Filter className="w-4 h-4" />
            </button>
        </div>

        <div className="bg-white rounded-2xl border border-theme/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-secondary-theme/30 border-b border-theme/30">
                            <th className="px-6 py-4 text-[10px] font-black text-primary-theme/40 uppercase tracking-[0.2em]">Fecha</th>
                            <th className="px-6 py-4 text-[10px] font-black text-primary-theme/40 uppercase tracking-[0.2em]">Concepto</th>
                            <th className="px-6 py-4 text-[10px] font-black text-primary-theme/40 uppercase tracking-[0.2em] text-right">Cantidad</th>
                            <th className="px-6 py-4 text-[10px] font-black text-primary-theme/40 uppercase tracking-[0.2em] text-right">Saldo</th>
                            <th className="px-6 py-4 text-[10px] font-black text-primary-theme/40 uppercase tracking-[0.2em]">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme/10">
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="w-16 h-16 bg-primary-theme/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-theme/20">
                                        <Zap className="w-8 h-8 text-primary-theme/10" />
                                    </div>
                                    <p className="text-sm text-primary-theme/30 font-bold italic">No hay transacciones registradas aún</p>
                                </td>
                            </tr>
                        ) : (
                            transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-primary-theme/[0.01] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-primary-theme/70 group-hover:text-primary-theme transition-colors">
                                                {format(new Date(t.created_at), 'dd MMM, yyyy', { locale: es })}
                                            </span>
                                            <span className="text-[10px] text-primary-theme/30 font-medium">
                                                {format(new Date(t.created_at), 'HH:mm', { locale: es })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className={cn("p-1.5 rounded-lg border transition-all duration-300", getTypeStyle(t.type))}>
                                                {t.type === 'usage' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-primary-theme group-hover:text-[#FF2E88] transition-colors">{t.description}</span>
                                                <span className="text-[10px] text-primary-theme/40 font-medium uppercase tracking-tighter">{getTypeLabel(t.type)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={cn(
                                            "text-xs font-black px-2.5 py-1 rounded-full border",
                                            t.amount > 0 
                                                ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
                                                : "text-[#FF2E88] bg-[#FF2E88]/5 border-[#FF2E88]/10"
                                        )}>
                                            {t.amount > 0 ? `+${t.amount.toLocaleString()}` : t.amount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-bold text-primary-theme/60 bg-secondary-theme px-2 py-1 rounded-lg border border-theme/20">
                                            {t.balance_after?.toLocaleString() || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Confirmado</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer de la tabla */}
            <div className="px-6 py-4 bg-secondary-theme/20 border-t border-theme/30 flex items-center justify-between">
                <p className="text-[10px] text-primary-theme/40 font-bold italic">* Los créditos remanentes se suman automáticamente al inicio de cada ciclo mensual.</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-primary-theme/40 uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" />
                    Siguiente recarga: Próximo mes
                </div>
            </div>
        </div>
    </div>
  );
};

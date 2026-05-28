import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Zap,
  Calendar,
  ChevronDown,
  TrendingDown,
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

// Genera los últimos N meses como opciones de selector
function buildMonthOptions(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = subMonths(now, i);
    return {
      label: format(d, 'MMMM yyyy', { locale: es }),
      value: format(d, 'yyyy-MM'),
      start: startOfMonth(d).toISOString(),
      end: endOfMonth(d).toISOString(),
    };
  });
}

export const AITransactionHistory: React.FC<{ clinicId: string }> = ({ clinicId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ consumed: 0, messages: 0, recharged: 0, adjustments: 0, total: 0 });

  const monthOptions = buildMonthOptions(6);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const currentMonthOpt = monthOptions.find(m => m.value === selectedMonth)!;

  useEffect(() => {
    fetchTransactions();
  }, [clinicId, selectedMonth]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const opt = monthOptions.find(m => m.value === selectedMonth)!;

      // Query 1: totales completos sin límite (solo amount y type para el resumen)
      const { data: allTxs } = await (supabase as any)
        .from('ai_credit_transactions')
        .select('type, amount')
        .eq('clinic_id', clinicId)
        .gte('created_at', opt.start)
        .lte('created_at', opt.end);

      if (allTxs) {
        const s = { consumed: 0, messages: 0, recharged: 0, adjustments: 0, total: (allTxs as any[]).length };
        for (const tx of allTxs as any[]) {
          if (tx.type === 'usage') { s.consumed += Math.abs(tx.amount); s.messages++; }
          else if (tx.type === 'monthly_refill' || tx.type === 'purchase') s.recharged += tx.amount;
          else if (tx.type === 'adjustment') s.adjustments += tx.amount;
        }
        setSummary(s);
      }

      // Query 2: tabla con límite para display (las más recientes)
      const { data, error } = await supabase
        .from('ai_credit_transactions')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('created_at', opt.start)
        .lte('created_at', opt.end)
        .order('created_at', { ascending: false })
        .limit(200);

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
        <p className="text-primary-theme/40 text-sm font-bold italic animate-pulse">Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header con selector de mes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF2E88]/10 rounded-xl flex items-center justify-center border border-[#FF2E88]/20">
            <History className="w-5 h-5 text-[#FF2E88]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-primary-theme uppercase tracking-wider">Historial de Transacciones</h3>
            <p className="text-[11px] text-primary-theme/50 font-medium">Transparencia total en el consumo de tu IA</p>
          </div>
        </div>

        {/* Selector de mes */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-xs font-bold text-primary-theme bg-secondary-theme border border-theme/30 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF2E88]/30 capitalize"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-theme/40 pointer-events-none" />
        </div>
      </div>

      {/* Tarjetas resumen del mes — datos completos sin límite */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#FF2E88]/5 border border-[#FF2E88]/15 rounded-xl p-4 text-center">
          <TrendingDown className="w-4 h-4 text-[#FF2E88] mx-auto mb-1.5" />
          <p className="text-2xl font-black text-primary-theme">{summary.consumed.toLocaleString()}</p>
          <p className="text-[10px] text-primary-theme/50 font-bold uppercase tracking-wider mt-0.5">Créditos usados</p>
        </div>
        <div className="bg-secondary-theme border border-theme/20 rounded-xl p-4 text-center">
          <Zap className="w-4 h-4 text-primary-theme/40 mx-auto mb-1.5" />
          <p className="text-2xl font-black text-primary-theme">{summary.messages.toLocaleString()}</p>
          <p className="text-[10px] text-primary-theme/50 font-bold uppercase tracking-wider mt-0.5">Mensajes IA</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
          <ArrowDownLeft className="w-4 h-4 text-emerald-600 mx-auto mb-1.5" />
          <p className="text-2xl font-black text-emerald-700">{summary.recharged.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">Recargado</p>
        </div>
        {summary.adjustments !== 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
            <Calendar className="w-4 h-4 text-amber-600 mx-auto mb-1.5" />
            <p className="text-2xl font-black text-amber-700">{summary.adjustments.toLocaleString()}</p>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">Ajustes</p>
          </div>
        )}
      </div>

      {/* Tabla de transacciones */}
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
                    <p className="text-sm text-primary-theme/30 font-bold italic">
                      Sin transacciones en {currentMonthOpt.label}
                    </p>
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
                        {t.balance_after?.toLocaleString() ?? '—'}
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

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary-theme/20 border-t border-theme/30 flex items-center justify-between">
          <p className="text-[10px] text-primary-theme/40 font-bold italic">
            Mostrando {transactions.length} de {summary.total} transacciones de {currentMonthOpt.label}
          </p>
          <div className="flex items-center gap-2 text-[10px] font-black text-primary-theme/40 uppercase tracking-widest">
            <Calendar className="w-3.5 h-3.5" />
            {currentMonthOpt.label}
          </div>
        </div>
      </div>
    </div>
  );
};

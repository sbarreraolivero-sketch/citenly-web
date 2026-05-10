import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
      case 'monthly_refill': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'purchase': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'usage': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
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
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm animate-pulse">Cargando historial de créditos...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <History className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Historial de Transacciones</h3>
            <p className="text-sm text-slate-400">Transparencia total en el consumo de tu IA</p>
          </div>
        </div>
        <button 
          onClick={fetchTransactions}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-800/30">
              <th className="px-6 py-4 font-medium">Fecha</th>
              <th className="px-6 py-4 font-medium">Concepto</th>
              <th className="px-6 py-4 font-medium text-right">Cantidad</th>
              <th className="px-6 py-4 font-medium text-right">Saldo</th>
              <th className="px-6 py-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <Zap className="w-8 h-8 text-slate-700" />
                    <p className="text-slate-500 text-sm">No hay transacciones registradas aún</p>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-300 font-medium">
                        {format(new Date(t.created_at), 'dd MMM, yyyy', { locale: es })}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(t.created_at), 'HH:mm', { locale: es })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-md border ${getTypeStyle(t.type)}`}>
                        {t.type === 'usage' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">{t.description}</span>
                        <span className="text-xs text-slate-500">{getTypeLabel(t.type)}</span>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${t.amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {t.amount > 0 ? `+${t.amount}` : t.amount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-white px-2 py-1 bg-slate-800 rounded-md">
                      {t.balance_after}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1.5 text-emerald-500/80">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Confirmado</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex items-center justify-between">
        <p className="text-xs text-slate-500 italic">
          * Los créditos remanentes se suman automáticamente al inicio de cada ciclo mensual.
        </p>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>Siguiente recarga: Próximo mes</span>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Lock, Calendar, CheckCircle, AlertCircle, Shield, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface FiscalPeriod {
  id: string;
  period_type: 'month' | 'quarter' | 'year';
  period_start: string;
  period_end: string;
  status: 'open' | 'closed' | 'archived';
  invoices_count: number;
  total_revenue: number;
  total_tax: number;
  payments_count: number;
  total_paid: number;
  net_revenue: number;
  net_tax: number;
  closed_at: string | null;
  seal_hash: string | null;
}

export default function DentistFiscalPeriodsManager() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingPeriod, setClosingPeriod] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPeriods();
    }
  }, [user]);

  const loadPeriods = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dentist_fiscal_periods')
        .select('*')
        .eq('dentist_id', user.id)
        .order('period_start', { ascending: false });

      if (error) throw error;
      setPeriods(data || []);
    } catch (error) {
      console.error('Error loading periods:', error);
    } finally {
      setLoading(false);
    }
  };

  const closePeriod = async (periodId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir clôturer cette période ? Cette action est irréversible.')) {
      return;
    }

    setClosingPeriod(periodId);
    try {
      const { data, error } = await supabase
        .rpc('seal_dentist_fiscal_period', {
          p_period_id: periodId,
        });

      if (error) throw error;

      alert(`Période clôturée avec succès!\n\nHash de scellement: ${data.combined_hash}\nNombre de factures: ${data.invoices_count}\nNombre d'enregistrements audit: ${data.records_count}`);
      await loadPeriods();
    } catch (error: any) {
      console.error('Error closing period:', error);
      alert(`Erreur lors de la clôture: ${error.message}`);
    } finally {
      setClosingPeriod(null);
    }
  };

  const createPeriod = async (year: number, month: number) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('create_dentist_fiscal_periods_for_month', {
          p_dentist_id: user.id,
          p_year: year,
          p_month: month,
        });

      if (error) throw error;
      await loadPeriods();
      alert('Période créée avec succès!');
    } catch (error: any) {
      console.error('Error creating period:', error);
      alert(`Erreur lors de la création: ${error.message}`);
    }
  };

  const formatPeriod = (start: string, end: string, type: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (type === 'month') {
      return startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } else if (type === 'year') {
      return startDate.getFullYear().toString();
    }
    return `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`;
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  };

  const getPreviousMonth = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const { year: prevYear, month: prevMonth } = getPreviousMonth();
  const previousMonthPeriod = periods.find(
    p => p.period_type === 'month' &&
      new Date(p.period_start).getFullYear() === prevYear &&
      new Date(p.period_start).getMonth() + 1 === prevMonth
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Gestion des Périodes Fiscales</h3>
            <p className="text-sm text-slate-600 mb-4">
              Clôturez vos périodes mensuelles et annuelles pour garantir la conformité anti-fraude TVA.
              Une fois clôturée, une période ne peut plus être modifiée.
            </p>

            {previousMonthPeriod && previousMonthPeriod.status === 'open' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Action requise</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      La période du mois précédent ({formatPeriod(previousMonthPeriod.period_start, previousMonthPeriod.period_end, 'month')}) n'est pas encore clôturée.
                      Il est recommandé de clôturer avant le 5 du mois.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Actions rapides</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const { year, month } = getCurrentMonth();
              createPeriod(year, month);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer période du mois en cours
          </button>
          <button
            onClick={() => {
              const { year, month } = getPreviousMonth();
              createPeriod(year, month);
            }}
            className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer période du mois précédent
          </button>
        </div>
      </div>

      {/* Liste des périodes */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Factures
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  CA HT
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  TVA
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Encaissé
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Aucune période fiscale créée. Créez une période pour commencer.
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {formatPeriod(period.period_start, period.period_end, period.period_type)}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">
                            {period.period_type === 'month' ? 'Mensuel' : period.period_type === 'year' ? 'Annuel' : 'Trimestriel'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {period.status === 'open' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                          Ouverte
                        </span>
                      )}
                      {period.status === 'closed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          <Lock className="w-3 h-3" />
                          Clôturée
                        </span>
                      )}
                      {period.status === 'archived' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <CheckCircle className="w-3 h-3" />
                          Archivée
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm text-slate-900">
                        {period.invoices_count}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-medium text-slate-900">
                        {(period.net_revenue || 0).toFixed(2)} €
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm text-slate-900">
                        {(period.net_tax || 0).toFixed(2)} €
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm text-green-600 font-medium">
                        {(period.total_paid || 0).toFixed(2)} €
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {period.status === 'open' && (
                          <button
                            onClick={() => closePeriod(period.id)}
                            disabled={closingPeriod === period.id}
                            className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {closingPeriod === period.id ? 'Clôture...' : 'Clôturer'}
                          </button>
                        )}
                        {period.status === 'closed' && period.seal_hash && (
                          <div className="text-xs text-slate-500" title={`Hash: ${period.seal_hash}`}>
                            Scellée
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

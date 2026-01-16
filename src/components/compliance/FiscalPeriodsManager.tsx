import { useState, useEffect } from 'react';
import { Lock, Calendar, CheckCircle, AlertCircle, Download, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FiscalPeriod {
  id: string;
  period_type: 'month' | 'quarter' | 'year';
  period_start: string;
  period_end: string;
  status: 'open' | 'closed' | 'archived';
  invoices_count: number;
  total_revenue: number;
  total_tax: number;
  credit_notes_count: number;
  credit_notes_total: number;
  net_revenue: number;
  net_tax: number;
  closed_at: string | null;
  seal_hash: string | null;
}

export function FiscalPeriodsManager() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingPeriod, setClosingPeriod] = useState<string | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('fiscal_periods')
        .select('*')
        .eq('laboratory_id', user.id)
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
        .rpc('seal_fiscal_period', {
          p_period_id: periodId,
        });

      if (error) throw error;

      alert(`Période clôturée avec succès!\n\nHash de scellement: ${data.combined_hash}\nNombre d'enregistrements: ${data.records_count}`);
      await loadPeriods();
    } catch (error: any) {
      console.error('Error closing period:', error);
      alert(`Erreur lors de la clôture: ${error.message}`);
    } finally {
      setClosingPeriod(null);
    }
  };

  const createPeriod = async (year: number, month: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc('create_fiscal_periods_for_month', {
          p_laboratory_id: user.id,
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

  const downloadReport = async (period: FiscalPeriod) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le profil du laboratoire
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Récupérer toutes les factures de la période
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, dentists(name)')
        .eq('user_id', user.id)
        .gte('date', period.period_start)
        .lte('date', period.period_end)
        .order('invoice_number');

      // Récupérer tous les avoirs de la période
      const { data: creditNotes } = await supabase
        .from('credit_notes')
        .select('*, dentists(name)')
        .eq('user_id', user.id)
        .gte('date', period.period_start)
        .lte('date', period.period_end)
        .order('credit_note_number');

      // Générer le rapport via l'edge function
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Session non disponible');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-certificate`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period,
          profile,
          invoices,
          creditNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du rapport');
      }

      // Télécharger le PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-fiscal-${formatPeriod(period.period_start, period.period_end, period.period_type).replace(/\s/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading report:', error);
      alert(`Erreur lors du téléchargement: ${error.message}`);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
      <div className="bg-gradient-to-r from-primary-50 to-cyan-50 rounded-xl p-6 border border-primary-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            Créer période du mois en cours
          </button>
          <button
            onClick={() => {
              const { year, month } = getPreviousMonth();
              createPeriod(year, month);
            }}
            className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            Créer période du mois précédent
          </button>
        </div>
      </div>

      {/* Liste des périodes */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
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
                Documents
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider" title="Chiffre d'affaires net (après avoirs)">
                CA HT Net
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider" title="TVA nette (après avoirs)">
                TVA Nette
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {periods.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
                      {period.invoices_count} fact.
                    </div>
                    {period.credit_notes_count > 0 && (
                      <div className="text-xs text-red-600">
                        -{period.credit_notes_count} avoir{period.credit_notes_count > 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {(period.net_revenue || 0).toFixed(2)} €
                    </div>
                    {period.credit_notes_count > 0 && (
                      <div className="text-xs text-slate-500" title={`Brut: ${period.total_revenue.toFixed(2)} € - Avoirs: ${((period.total_revenue || 0) - (period.net_revenue || 0)).toFixed(2)} €`}>
                        (brut: {period.total_revenue.toFixed(2)} €)
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-slate-900">
                      {(period.net_tax || 0).toFixed(2)} €
                    </div>
                    {period.credit_notes_count > 0 && (
                      <div className="text-xs text-slate-500" title={`Brut: ${period.total_tax.toFixed(2)} € - Avoirs: ${((period.total_tax || 0) - (period.net_tax || 0)).toFixed(2)} €`}>
                        (brut: {period.total_tax.toFixed(2)} €)
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {period.status === 'open' && (
                        <button
                          onClick={() => closePeriod(period.id)}
                          disabled={closingPeriod === period.id}
                          className="px-3 py-1.5 bg-primary-500 text-white text-xs font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {closingPeriod === period.id ? 'Clôture...' : 'Clôturer'}
                        </button>
                      )}
                      {period.status === 'closed' && period.seal_hash && (
                        <button
                          onClick={() => downloadReport(period)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                          title={`Hash: ${period.seal_hash}`}
                        >
                          <Download className="w-3 h-3" />
                          Rapport
                        </button>
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
  );
}

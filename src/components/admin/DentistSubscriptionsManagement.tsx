import { useState, useEffect } from 'react';
import { Users, TrendingUp, Clock, DollarSign, Filter, Plus, Calendar, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DentistSubscriptionData {
  id: string;
  name: string;
  email: string;
  subscription_status: string;
  subscription_plan_id: string;
  subscription_end_date: string | null;
  trial_used: boolean;
  plan_name?: string;
  plan_price?: number;
}

interface SubscriptionStats {
  total_active: number;
  total_trial: number;
  total_expired: number;
  monthly_revenue: number;
  trial_conversion_rate: number;
}

export default function DentistSubscriptionsManagement() {
  const [subscriptions, setSubscriptions] = useState<DentistSubscriptionData[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<DentistSubscriptionData[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    total_active: 0,
    total_trial: 0,
    total_expired: 0,
    monthly_revenue: 0,
    trial_conversion_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'trial' | 'active' | 'expired'>('all');
  const [showAccessCodeGenerator, setShowAccessCodeGenerator] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, subscriptions]);

  const loadData = async () => {
    try {
      // Load dentist accounts
      const { data: dentistData, error } = await supabase
        .from('dentist_accounts')
        .select(`
          id,
          name,
          email,
          subscription_status,
          subscription_plan_id,
          subscription_end_date,
          trial_used
        `);

      if (error) throw error;

      // Load all subscription plans
      const { data: plansData } = await supabase
        .from('dentist_subscription_plans')
        .select('id, name, price_monthly');

      const plansMap = new Map(
        (plansData || []).map(plan => [plan.id, plan])
      );

      // Merge data
      const formattedData = (dentistData || []).map(d => {
        const plan = d.subscription_plan_id ? plansMap.get(d.subscription_plan_id) : null;
        return {
          ...d,
          plan_name: plan?.name,
          plan_price: plan?.price_monthly
        };
      });

      setSubscriptions(formattedData);
      calculateStats(formattedData);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: any[]) => {
    const activeCount = data.filter(d => d.subscription_status === 'active').length;
    const trialCount = data.filter(d => d.subscription_status === 'trial').length;
    const expiredCount = data.filter(d => d.subscription_status === 'expired').length;

    const monthlyRevenue = data
      .filter(d => d.subscription_status === 'active')
      .reduce((sum, d) => sum + (d.plan_price || 0), 0);

    const totalTrialUsers = data.filter(d => d.trial_used).length;
    const convertedUsers = data.filter(d => d.trial_used && d.subscription_status === 'active').length;
    const conversionRate = totalTrialUsers > 0 ? (convertedUsers / totalTrialUsers) * 100 : 0;

    setStats({
      total_active: activeCount,
      total_trial: trialCount,
      total_expired: expiredCount,
      monthly_revenue: monthlyRevenue,
      trial_conversion_rate: conversionRate
    });
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredSubscriptions(subscriptions);
    } else {
      setFilteredSubscriptions(subscriptions.filter(s => s.subscription_status === filter));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">ACTIF</span>;
      case 'trial':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">ESSAI</span>;
      case 'expired':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">EXPIRÉ</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-semibold">INACTIF</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestion des Abonnements Dentistes</h1>
            <p className="text-slate-600">Suivez et gérez les abonnements Cabinet Premium</p>
          </div>
          <button
            onClick={() => setShowAccessCodeGenerator(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Créer un code promo
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.total_active}</span>
          </div>
          <p className="text-sm text-slate-600">Abonnés actifs</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.total_trial}</span>
          </div>
          <p className="text-sm text-slate-600">Essais actifs</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.monthly_revenue.toFixed(0)}€</span>
          </div>
          <p className="text-sm text-slate-600">MRR (Mensuel)</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.trial_conversion_rate.toFixed(0)}%</span>
          </div>
          <p className="text-sm text-slate-600">Taux conversion</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-red-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.total_expired}</span>
          </div>
          <p className="text-sm text-slate-600">Expirés</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Liste des Abonnements</h2>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous ({subscriptions.length})</option>
              <option value="trial">Essais ({stats.total_trial})</option>
              <option value="active">Actifs ({stats.total_active})</option>
              <option value="expired">Expirés ({stats.total_expired})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Dentiste</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Plan</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date de fin</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prix/mois</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Aucun abonnement trouvé
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map(sub => (
                  <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{sub.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{sub.email}</td>
                    <td className="py-3 px-4 text-sm">{sub.plan_name || 'Gratuit'}</td>
                    <td className="py-3 px-4">{getStatusBadge(sub.subscription_status)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {sub.subscription_end_date
                        ? new Date(sub.subscription_end_date).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {sub.plan_price ? `${sub.plan_price.toFixed(2)}€` : 'Gratuit'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAccessCodeGenerator && (
        <AccessCodeGeneratorModal
          onClose={() => setShowAccessCodeGenerator(false)}
          onSuccess={() => {
            setShowAccessCodeGenerator(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AccessCodeGeneratorModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    code: generateRandomCode(),
    plan_id: '',
    duration_months: 1,
    max_uses: '',
    valid_until: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('dentist_subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data) {
      setPlans(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, plan_id: data[0].id }));
      }
    }
  };

  function generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plan_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dentist_access_codes')
        .insert({
          code: formData.code.toUpperCase().replace(/\s/g, ''),
          plan_id: formData.plan_id,
          duration_months: formData.duration_months,
          max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
          valid_until: formData.valid_until || null,
          notes: formData.notes || null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedCode(formData.code);
      alert('Code créé avec succès !');
    } catch (error: any) {
      console.error('Error creating access code:', error);
      alert(error.message || 'Erreur lors de la création du code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      alert('Code copié dans le presse-papier !');
    }
  };

  if (generatedCode) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Code Créé avec Succès</h2>

          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-4 border-2 border-blue-300">
            <p className="text-sm text-slate-600 mb-2">Votre code d'accès :</p>
            <p className="text-3xl font-bold text-center font-mono text-blue-700 mb-4">{generatedCode}</p>
            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Copier le code
            </button>
          </div>

          <button
            onClick={onSuccess}
            className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Créer un Code Promotionnel</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Code d'accès
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, code: generateRandomCode() })}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                Générer
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Plan à débloquer
            </label>
            <select
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.price_monthly === 0 ? 'Gratuit' : `${plan.price_monthly}€/mois`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Durée (mois)
            </label>
            <input
              type="number"
              min="1"
              value={formData.duration_months}
              onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre max d'utilisations (vide = illimité)
            </label>
            <input
              type="number"
              min="1"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Illimité"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date d'expiration (optionnelle)
            </label>
            <input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes internes (optionnelles)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Ex: Code pour partenaire X..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer le code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

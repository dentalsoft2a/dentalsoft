import { useState, useEffect } from 'react';
import { Save, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  stripe_price_id: string | null;
  features: string[];
  is_active: boolean;
}

export function SubscriptionSettings() {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError) {
      console.error('Error loading plan:', fetchError);
      setError('Erreur lors du chargement du plan: ' + fetchError.message);
    } else if (data) {
      setPlan({
        ...data,
        price_monthly: typeof data.price_monthly === 'string'
          ? parseFloat(data.price_monthly)
          : data.price_monthly
      });
    } else {
      setError('Aucun plan actif trouvé');
    }

    setLoading(false);
  };

  const savePlan = async () => {
    if (!plan) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const { data, error: updateError } = await supabase
      .from('subscription_plans')
      .update({
        name: plan.name,
        description: plan.description,
        price_monthly: plan.price_monthly,
        stripe_price_id: plan.stripe_price_id,
        features: plan.features,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id)
      .select();

    if (updateError) {
      console.error('Error saving plan:', updateError);
      setError('Erreur lors de la sauvegarde: ' + updateError.message);
    } else if (!data || data.length === 0) {
      setError('Impossible de mettre à jour le plan. Vérifiez vos permissions.');
    } else {
      setSuccess('Plan d\'abonnement mis à jour avec succès!');

      const user = await supabase.auth.getUser();
      await supabase.from('admin_audit_log').insert({
        admin_id: user.data.user?.id,
        action: 'update_subscription_plan',
        details: { plan_id: plan.id, price: plan.price_monthly }
      });

      await loadPlan();
    }

    setSaving(false);
  };

  const updatePrice = (value: string) => {
    if (!plan) return;

    const numValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numValue)) {
      setPlan({ ...plan, price_monthly: numValue });
    }
  };

  const addFeature = () => {
    if (plan) {
      setPlan({ ...plan, features: [...plan.features, ''] });
    }
  };

  const updateFeature = (index: number, value: string) => {
    if (plan) {
      const newFeatures = [...plan.features];
      newFeatures[index] = value;
      setPlan({ ...plan, features: newFeatures });
    }
  };

  const removeFeature = (index: number) => {
    if (plan) {
      const newFeatures = plan.features.filter((_, i) => i !== index);
      setPlan({ ...plan, features: newFeatures });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        {error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="text-slate-600">Aucun plan d'abonnement configuré</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary-50 to-cyan-50 rounded-xl p-6 border border-primary-200">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-primary-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Configuration de l'abonnement</h2>
            <p className="text-sm text-slate-600">Gérez le plan d'abonnement mensuel</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">{success}</div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom du plan
            </label>
            <input
              type="text"
              value={plan.name}
              onChange={(e) => setPlan({ ...plan, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Prix mensuel (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={plan.price_monthly}
              onChange={(e) => updatePrice(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            value={plan.description || ''}
            onChange={(e) => setPlan({ ...plan, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Stripe Price ID (optionnel)
          </label>
          <input
            type="text"
            value={plan.stripe_price_id || ''}
            onChange={(e) => setPlan({ ...plan, stripe_price_id: e.target.value })}
            placeholder="price_xxxxxxxxxxxxx"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">
              Fonctionnalités incluses
            </label>
            <button
              onClick={addFeature}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
            >
              Ajouter une fonctionnalité
            </button>
          </div>

          <div className="space-y-2">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  placeholder="Description de la fonctionnalité"
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
                <button
                  onClick={() => removeFeature(index)}
                  className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={savePlan}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-primary-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}

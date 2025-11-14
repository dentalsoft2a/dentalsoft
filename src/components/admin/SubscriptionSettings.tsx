import { useState, useEffect } from 'react';
import { Save, DollarSign, CreditCard, Webhook, Copy, CheckCircle, ExternalLink, Crown, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  stripe_price_id: string | null;
  features: string[];
  is_active: boolean;
  plan_type: 'standard' | 'premium_complete';
  unlocks_all_extensions: boolean;
  display_order: number;
}

export function SubscriptionSettings() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhooks`;

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading plans:', error);
    } else if (data) {
      const processedPlans = data.map(plan => ({
        ...plan,
        price_monthly: typeof plan.price_monthly === 'string' ? parseFloat(plan.price_monthly) : plan.price_monthly
      }));
      setPlans(processedPlans);
    }
    setLoading(false);
  };

  const savePlan = async (plan: SubscriptionPlan) => {
    setSaving(true);

    const { error } = await supabase
      .from('subscription_plans')
      .update({
        name: plan.name,
        description: plan.description,
        price_monthly: plan.price_monthly,
        stripe_price_id: plan.stripe_price_id,
        features: plan.features,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id);

    if (error) {
      console.error('Error saving:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } else {
      await supabase.from('admin_audit_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'update_subscription_plan',
        details: { plan_id: plan.id, plan_type: plan.plan_type, price: plan.price_monthly }
      });

      alert('Plan mis à jour avec succès!');
      await loadPlans();
    }

    setSaving(false);
  };

  const updatePlan = (index: number, updates: Partial<SubscriptionPlan>) => {
    const newPlans = [...plans];
    newPlans[index] = { ...newPlans[index], ...updates };
    setPlans(newPlans);
  };

  const addFeature = (planIndex: number) => {
    const newPlans = [...plans];
    newPlans[planIndex].features = [...newPlans[planIndex].features, ''];
    setPlans(newPlans);
  };

  const updateFeature = (planIndex: number, featureIndex: number, value: string) => {
    const newPlans = [...plans];
    newPlans[planIndex].features[featureIndex] = value;
    setPlans(newPlans);
  };

  const removeFeature = (planIndex: number, featureIndex: number) => {
    const newPlans = [...plans];
    newPlans[planIndex].features = newPlans[planIndex].features.filter((_, i) => i !== featureIndex);
    setPlans(newPlans);
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-primary-50 to-cyan-50 rounded-xl p-6 border border-primary-200">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-8 h-8 text-primary-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gestion des Abonnements</h2>
            <p className="text-sm text-slate-600">Configurez vos plans d'abonnement et l'intégration Stripe</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {plans.map((plan, planIndex) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border-2 shadow-lg overflow-hidden ${
              plan.plan_type === 'premium_complete'
                ? 'border-amber-400 ring-2 ring-amber-200'
                : 'border-slate-200'
            }`}
          >
            <div
              className={`p-6 ${
                plan.plan_type === 'premium_complete'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                  : 'bg-gradient-to-br from-primary-500 to-cyan-600'
              }`}
            >
              <div className="flex items-center gap-3 text-white mb-2">
                {plan.plan_type === 'premium_complete' ? (
                  <Crown className="w-8 h-8" />
                ) : (
                  <Star className="w-8 h-8" />
                )}
                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="text-sm opacity-90">
                    {plan.plan_type === 'premium_complete' ? 'Toutes les extensions incluses' : 'Plan de base'}
                  </p>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-4">
                {plan.price_monthly.toFixed(2)}€
                <span className="text-lg font-normal opacity-80">/mois</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du plan
                </label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => updatePlan(planIndex, { name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prix mensuel (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={plan.price_monthly}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      updatePlan(planIndex, { price_monthly: value });
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={plan.description || ''}
                  onChange={(e) => updatePlan(planIndex, { description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Stripe Price ID
                </label>
                <input
                  type="text"
                  value={plan.stripe_price_id || ''}
                  onChange={(e) => updatePlan(planIndex, { stripe_price_id: e.target.value })}
                  placeholder="price_xxxxxxxxxxxxx"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Fonctionnalités
                  </label>
                  <button
                    onClick={() => addFeature(planIndex)}
                    className="text-sm px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                  >
                    + Ajouter
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(planIndex, featureIndex, e.target.value)}
                        placeholder="Fonctionnalité..."
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-200 outline-none"
                      />
                      <button
                        onClick={() => removeFeature(planIndex, featureIndex)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => savePlan(plan)}
                disabled={saving}
                className={`w-full px-4 py-3 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  plan.plan_type === 'premium_complete'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg'
                    : 'bg-gradient-to-r from-primary-500 to-cyan-500 hover:shadow-lg'
                }`}
              >
                <Save className="w-5 h-5" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Webhook className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Configuration Webhook Stripe</h3>
              <p className="text-sm text-violet-100">Synchronisation automatique des abonnements</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              URL du Webhook
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-600 font-mono text-sm"
              />
              <button
                onClick={copyWebhookUrl}
                className="px-4 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors flex items-center gap-2 font-medium"
              >
                {copiedWebhook ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copier
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Configuration Stripe requise</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Variables d'environnement nécessaires:
                </p>
                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                  <li>VITE_STRIPE_PUBLIC_KEY (frontend)</li>
                  <li>STRIPE_SECRET_KEY (backend)</li>
                  <li>STRIPE_WEBHOOK_SECRET (webhook)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Événements Stripe à configurer
            </h4>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                'customer.subscription.deleted',
                'customer.subscription.updated',
                'invoice.payment_failed',
                'invoice.payment_succeeded'
              ].map((event) => (
                <code key={event} className="text-xs font-mono bg-white px-3 py-2 rounded border border-slate-200 block">
                  {event}
                </code>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

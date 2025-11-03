import { useState, useEffect } from 'react';
import { Save, DollarSign, CreditCard, Webhook, Copy, CheckCircle, ExternalLink } from 'lucide-react';
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
  const [stripePublicKey, setStripePublicKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhooks`;

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error loading plan:', error);
    } else if (data) {
      setPlan(data);
    }
    setLoading(false);
  };

  const savePlan = async () => {
    if (!plan) return;

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
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } else {
      await supabase.from('admin_audit_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'update_subscription_plan',
        details: { plan_id: plan.id, price: plan.price_monthly }
      });

      alert('Plan d\'abonnement mis à jour avec succès!');
    }

    setSaving(false);
  };

  const addFeature = () => {
    if (plan) {
      setPlan({
        ...plan,
        features: [...plan.features, '']
      });
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

  if (!plan) {
    return (
      <div className="text-center py-12 text-slate-600">
        Aucun plan d'abonnement configuré
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-primary-50 to-cyan-50 rounded-xl p-6 border border-primary-200">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-8 h-8 text-primary-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Configuration de l'abonnement</h2>
            <p className="text-sm text-slate-600">Gérez le plan d'abonnement et l'intégration Stripe</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
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
              value={plan.price_monthly}
              onChange={(e) => setPlan({ ...plan, price_monthly: parseFloat(e.target.value) })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
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
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Stripe Price ID
            </label>
            <input
              type="text"
              value={plan.stripe_price_id || ''}
              onChange={(e) => setPlan({ ...plan, stripe_price_id: e.target.value })}
              placeholder="price_xxxxxxxxxxxxx"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              ID du prix Stripe pour ce plan d'abonnement
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 mb-1">Configuration Stripe</h4>
                <p className="text-sm text-amber-700">
                  Pour activer les paiements Stripe, configurez vos clés API dans les variables d'environnement :
                </p>
                <ul className="text-xs text-amber-600 mt-2 space-y-1 list-disc list-inside">
                  <li>VITE_STRIPE_PUBLIC_KEY</li>
                  <li>STRIPE_SECRET_KEY (serveur)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Webhook className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Configuration Webhook Stripe</h3>
              <p className="text-sm text-violet-100">Configurez les webhooks pour synchroniser automatiquement les abonnements</p>
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

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Événements à configurer dans Stripe
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200">customer.subscription.deleted</code>
                  <p className="text-xs text-slate-600 mt-1">Déclenché quand un abonnement est annulé</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200">customer.subscription.updated</code>
                  <p className="text-xs text-slate-600 mt-1">Déclenché quand un abonnement est modifié</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200">invoice.payment_failed</code>
                  <p className="text-xs text-slate-600 mt-1">Déclenché quand un paiement échoue</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200">invoice.payment_succeeded</code>
                  <p className="text-xs text-slate-600 mt-1">Déclenché quand un paiement réussit</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Instructions de configuration</h4>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Connectez-vous à votre <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-900">tableau de bord Stripe</a></li>
                  <li>Accédez à la section "Développeurs" puis "Webhooks"</li>
                  <li>Cliquez sur "Ajouter un point de terminaison"</li>
                  <li>Collez l'URL du webhook ci-dessus</li>
                  <li>Sélectionnez les 4 événements listés ci-dessus</li>
                  <li>Enregistrez le webhook</li>
                  <li>Copiez le secret de signature du webhook (commence par "whsec_")</li>
                  <li>Configurez la variable d'environnement STRIPE_WEBHOOK_SECRET avec ce secret</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-emerald-900 mb-1">Fonctionnement automatique</h4>
                <p className="text-sm text-emerald-800">
                  Une fois configuré, le webhook mettra automatiquement à jour le statut d'abonnement des utilisateurs lorsque :
                </p>
                <ul className="text-sm text-emerald-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Un abonnement est annulé sur Stripe</li>
                  <li>Un paiement échoue (statut "past_due")</li>
                  <li>Un paiement réussit (réactivation)</li>
                  <li>Un abonnement expire</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
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

      <div className="flex justify-end pt-4 border-t border-slate-200">
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

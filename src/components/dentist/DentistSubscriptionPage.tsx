import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, Sparkles, Key, Download, Calendar, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDentistSubscription, DentistSubscriptionPlan } from '../../hooks/useDentistSubscription';
import { generateDentistSubscriptionInvoicePDF } from '../../utils/dentistSubscriptionInvoicePdfGenerator';
import { useCompanyLegalInfo } from '../../hooks/useCompanyLegalInfo';

interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  amount_ht: number;
  amount_ttc: number;
  tax_rate: number;
  period_start: string;
  period_end: string;
  payment_status: string;
  issued_at: string;
  paid_at: string | null;
  due_date: string;
  billing_details: any;
}

export default function DentistSubscriptionPage() {
  const { user } = useAuth();
  const {
    hasAccess,
    subscriptionStatus,
    currentPlan,
    trialDaysRemaining,
    subscriptionEndsAt,
    canStartTrial,
    activateTrial,
    refreshSubscription
  } = useDentistSubscription();

  const { companyInfo } = useCompanyLegalInfo();
  const [plans, setPlans] = useState<DentistSubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [activating, setActivating] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [plansRes, invoicesRes, accountRes] = await Promise.all([
        supabase
          .from('dentist_subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('dentist_subscription_invoices')
          .select('*')
          .eq('dentist_id', user!.id)
          .order('issued_at', { ascending: false }),
        supabase
          .from('dentist_accounts')
          .select('stripe_subscription_id')
          .eq('id', user!.id)
          .maybeSingle()
      ]);

      if (plansRes.data) setPlans(plansRes.data);
      if (invoicesRes.data) setInvoices(invoicesRes.data);
      if (accountRes.data) setStripeSubscriptionId(accountRes.data.stripe_subscription_id);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setActivating(true);
    try {
      const result = await activateTrial();
      if (result.success) {
        alert(result.message);
        await refreshSubscription();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('Une erreur est survenue');
    } finally {
      setActivating(false);
    }
  };

  const handleSubscribeStripe = async (planId: string) => {
    setSubscribingPlanId(planId);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-dentist-subscription-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          planId: planId,
          billingPeriod: billingPeriod
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la création de la session de paiement');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      alert(`Erreur lors de la création de la session de paiement: ${(error as Error).message}`);
      setSubscribingPlanId(null);
    }
  };

  const handleDownloadInvoice = async (invoice: SubscriptionInvoice) => {
    if (!companyInfo) {
      alert('Impossible de générer la facture : informations entreprise manquantes');
      return;
    }

    setDownloadingInvoice(invoice.id);
    try {
      await generateDentistSubscriptionInvoicePDF(invoice, companyInfo);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!stripeSubscriptionId) {
      alert('Aucun abonnement Stripe actif trouvé');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir annuler le renouvellement automatique ? Votre abonnement restera actif jusqu\'à la fin de la période en cours.')) {
      return;
    }

    setCancellingSubscription(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-stripe-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          dentistAccountId: user!.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'annulation');
      }

      alert('Renouvellement automatique annulé avec succès. Votre abonnement restera actif jusqu\'à la fin de la période en cours.');
      await refreshSubscription();
      await loadData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert(`Erreur lors de l'annulation: ${(error as Error).message}`);
    } finally {
      setCancellingSubscription(false);
    }
  };

  const getStatusBadge = () => {
    switch (subscriptionStatus) {
      case 'active':
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
            <CheckCircle className="w-5 h-5" />
            ACTIF
          </div>
        );
      case 'trial':
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold">
            <Clock className="w-5 h-5" />
            ESSAI GRATUIT - {trialDaysRemaining} jour{trialDaysRemaining! > 1 ? 's' : ''} restant{trialDaysRemaining! > 1 ? 's' : ''}
          </div>
        );
      case 'expired':
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold">
            <Clock className="w-5 h-5" />
            EXPIRÉ
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-800 rounded-full font-semibold">
            INACTIF
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const premiumPlan = plans.find(p => p.unlocks_cabinet_features);
  const freePlan = plans.find(p => !p.unlocks_cabinet_features);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Mon Abonnement</h1>
        <p className="text-slate-600">Gérez votre abonnement Cabinet Premium</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Statut Actuel</h2>
          {getStatusBadge()}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-1">Plan actuel</p>
            <p className="text-lg font-semibold text-slate-900">
              {currentPlan?.name || 'Gratuit'}
            </p>
          </div>

          {subscriptionEndsAt && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">
                {subscriptionStatus === 'trial' ? 'Fin de l\'essai' : 'Renouvellement'}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {new Date(subscriptionEndsAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          {currentPlan && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Prix mensuel</p>
              <p className="text-lg font-semibold text-slate-900">
                {currentPlan.price_monthly === 0 ? 'Gratuit' : `${currentPlan.price_monthly.toFixed(2)}€`}
              </p>
            </div>
          )}
        </div>

        {stripeSubscriptionId && subscriptionStatus === 'active' && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={handleCancelSubscription}
              disabled={cancellingSubscription}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {cancellingSubscription ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-700/30 border-t-red-700 rounded-full animate-spin" />
                  Annulation en cours...
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Annuler le renouvellement automatique
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Votre abonnement restera actif jusqu'à la fin de la période en cours
            </p>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Plans Disponibles</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {freePlan && (
            <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{freePlan.name}</h3>
              <p className="text-slate-600 mb-4">{freePlan.description}</p>

              <div className="mb-6">
                <div className="text-3xl font-bold text-slate-900">Gratuit</div>
              </div>

              <div className="space-y-3 mb-6">
                {freePlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              {!hasAccess && (
                <button
                  disabled
                  className="w-full px-6 py-3 bg-slate-100 text-slate-500 rounded-lg font-semibold cursor-not-allowed"
                >
                  Plan actif
                </button>
              )}
            </div>
          )}

          {premiumPlan && (
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-lg border-2 border-blue-300 p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full text-sm font-bold shadow-md">
                  <Sparkles className="w-4 h-4" />
                  RECOMMANDÉ
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2 mt-4">{premiumPlan.name}</h3>
              <p className="text-slate-600 mb-4">{premiumPlan.description}</p>

              <div className="mb-6">
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {premiumPlan.price_monthly.toFixed(2)}€
                  <span className="text-xl font-normal text-slate-600">/mois</span>
                </div>
                <p className="text-sm text-blue-600 font-semibold">
                  + {premiumPlan.trial_period_days} jours d'essai gratuit
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {premiumPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              {!hasAccess && canStartTrial ? (
                <button
                  onClick={handleStartTrial}
                  disabled={activating}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {activating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Activation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Démarrer l'essai gratuit
                    </>
                  )}
                </button>
              ) : hasAccess ? (
                <button
                  disabled
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Plan actif
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => handleSubscribeStripe(premiumPlan.id)}
                    disabled={subscribingPlanId === premiumPlan.id}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {subscribingPlanId === premiumPlan.id ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Redirection...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Souscrire avec Stripe
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowAccessCodeModal(true)}
                    className="w-full px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                  >
                    Utiliser un code promo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 mb-8 border border-yellow-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="font-bold text-slate-900">Vous avez un code promo ?</h3>
              <p className="text-sm text-slate-600">Activez votre abonnement instantanément</p>
            </div>
          </div>
          <button
            onClick={() => setShowAccessCodeModal(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Entrer un code
          </button>
        </div>
      </div>

      {invoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Historique de Facturation
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Période</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-sm">{invoice.invoice_number}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(invoice.period_start).toLocaleDateString('fr-FR')} - {new Date(invoice.period_end).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 font-semibold">{invoice.amount_ttc.toFixed(2)}€</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.payment_status === 'paid' ? 'Payé' :
                         invoice.payment_status === 'pending' ? 'En attente' :
                         'Impayé'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        disabled={downloadingInvoice === invoice.id}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        {downloadingInvoice === invoice.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            Génération...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Télécharger
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAccessCodeModal && (
        <AccessCodeModal
          onClose={() => setShowAccessCodeModal(false)}
          onSuccess={() => {
            setShowAccessCodeModal(false);
            refreshSubscription();
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AccessCodeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('redeem_dentist_access_code', {
        p_dentist_id: user!.id,
        p_code: code.trim().toUpperCase()
      });

      if (rpcError) throw rpcError;

      if (data && data.success) {
        alert(data.message);
        onSuccess();
      } else {
        setError(data?.message || 'Code invalide');
      }
    } catch (err: any) {
      console.error('Error redeeming code:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Entrer un Code Promo</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Code d'accès
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase font-mono text-lg"
              maxLength={20}
            />
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Vérification...' : 'Activer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

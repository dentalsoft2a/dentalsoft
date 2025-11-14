import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, AlertCircle, DollarSign, Key, FileText, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import { generateSubscriptionInvoicePDF } from '../../utils/subscriptionInvoicePdfGenerator';

interface UserProfile {
  subscription_status: string;
  subscription_plan: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  trial_used: boolean;
  stripe_customer_id: string | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  features: string[];
  plan_type: 'standard' | 'premium_complete';
  unlocks_all_extensions: boolean;
}

interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  amount_ht: number;
  tax_rate: number;
  amount_ttc: number;
  period_start: string;
  period_end: string;
  payment_status: string;
  issued_at: string;
  paid_at: string | null;
}

export function SubscriptionPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

  useLockScroll(showRedeemModal);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const subscription = supabase
      .channel('subscription_plans_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'subscription_plans'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [profileRes, plansRes, invoicesRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('display_order'),
      supabase.from('subscription_invoices').select('*').eq('user_id', user.id).order('issued_at', { ascending: false })
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (plansRes.data) setPlans(plansRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-600';
      case 'trial': return 'text-blue-600';
      case 'cancelled': return 'text-orange-600';
      case 'inactive': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'trial': return Clock;
      case 'cancelled': return AlertCircle;
      case 'inactive': return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Abonnement actif';
      case 'trial': return 'Période d\'essai';
      case 'cancelled': return 'Abonnement annulé';
      case 'inactive': return 'Abonnement inactif';
      default: return status;
    }
  };

  const handleSubscribe = async (planId: string) => {
    setSubscribingPlanId(planId);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          planId: planId
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

  const handleCancelSubscription = async () => {
    if (!confirm('Êtes-vous sûr de vouloir résilier votre abonnement? Vous perdrez l\'accès à toutes les fonctionnalités premium à la fin de la période en cours.')) {
      return;
    }

    setCancellingSubscription(true);
    try {
      if (!profile?.stripe_subscription_id) {
        throw new Error('Aucun abonnement Stripe trouvé');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-stripe-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          subscriptionId: profile.stripe_subscription_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la résiliation de l\'abonnement');
      }

      alert('Votre abonnement a été résilié avec succès. Vous conserverez l\'accès jusqu\'à la fin de la période payée.');
      loadData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert(`Erreur lors de la résiliation: ${(error as Error).message}`);
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      await generateSubscriptionInvoicePDF(invoiceId);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Erreur lors de la génération de la facture');
    }
  };

  const handleRedeemCode = async () => {
    if (!user || !accessCode.trim()) return;

    setRedeeming(true);
    try {
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .select('*, subscription_plan:subscription_plans(id, name, plan_type, unlocks_all_extensions)')
        .eq('code', accessCode.trim().toUpperCase())
        .eq('is_used', false)
        .maybeSingle();

      if (codeError) throw codeError;

      if (!codeData) {
        alert('Code invalide ou déjà utilisé');
        setRedeeming(false);
        return;
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        alert('Ce code a expiré');
        setRedeeming(false);
        return;
      }

      // Check if user already used this code
      const { data: usageData } = await supabase
        .from('access_code_usage')
        .select('id')
        .eq('access_code_id', codeData.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageData) {
        alert('Vous avez déjà utilisé ce code');
        setRedeeming(false);
        return;
      }

      const currentEndDate = profile?.subscription_end_date
        ? new Date(profile.subscription_end_date)
        : new Date();

      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + codeData.duration_days);

      const updateData: any = {
        subscription_start_date: profile?.subscription_start_date || new Date().toISOString(),
        subscription_end_date: newEndDate.toISOString(),
        subscription_status: 'active'
      };

      if (codeData.subscription_plan_id) {
        updateData.subscription_plan_id = codeData.subscription_plan_id;
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      const { error: codeUpdateError } = await supabase
        .from('access_codes')
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString()
        })
        .eq('id', codeData.id);

      if (codeUpdateError) {
        console.error('Error updating code:', codeUpdateError);
        // Code is already updated in profile, just log the error
      }

      // Record that this user used this code
      const { error: usageError } = await supabase
        .from('access_code_usage')
        .insert({
          access_code_id: codeData.id,
          user_id: user.id
        });

      if (usageError) {
        console.error('Error recording usage:', usageError);
        // Non-critical, continue
      }

      const planInfo = codeData.subscription_plan
        ? ` Vous avez maintenant accès au plan ${codeData.subscription_plan.name}.`
        : '';
      alert(`Code activé avec succès! ${codeData.duration_days} jours ajoutés à votre abonnement.${planInfo}`);
      setShowRedeemModal(false);
      setAccessCode('');
      loadData();
    } catch (error: any) {
      console.error('Error redeeming code:', error);

      // Check if it's just an audit log error (non-critical)
      if (error?.message?.includes('admin_audit_log')) {
        alert(`Code activé avec succès! ${codeData?.duration_days || 0} jours ajoutés.`);
        setShowRedeemModal(false);
        setAccessCode('');
        loadData();
      } else {
        alert('Erreur lors de l\'activation du code: ' + (error?.message || 'Erreur inconnue'));
      }
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  if (!profile || plans.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Erreur de chargement</div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(profile.subscription_status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mon abonnement</h1>
          <p className="text-slate-600">Gérez votre abonnement et vos informations de facturation</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center`}>
              <StatusIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{getStatusLabel(profile.subscription_status)}</h2>
              <p className={`text-sm font-medium ${getStatusColor(profile.subscription_status)}`}>
                {profile.subscription_status === 'trial' && profile.subscription_end_date && (
                  `Expire le ${new Date(profile.subscription_end_date).toLocaleDateString('fr-FR')}`
                )}
                {profile.subscription_status === 'active' && profile.subscription_end_date && (
                  `Actif jusqu'au ${new Date(profile.subscription_end_date).toLocaleDateString('fr-FR')}`
                )}
                {profile.subscription_status === 'expired' && (
                  'Votre abonnement a expiré'
                )}
              </p>
            </div>
          </div>

          {profile.subscription_status === 'trial' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Période d'essai gratuite</h4>
                  <p className="text-sm text-blue-700">
                    Profitez de toutes les fonctionnalités gratuitement jusqu'au {' '}
                    {profile.subscription_end_date && new Date(profile.subscription_end_date).toLocaleDateString('fr-FR')}.
                    Utilisez un code d'accès pour prolonger après cette date.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(profile.subscription_status === 'inactive' || profile.subscription_status === 'expired') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 mb-1">Abonnement expiré</h4>
                  <p className="text-sm text-red-700">
                    Votre abonnement a expiré. Utilisez un code d'accès ou contactez le support pour continuer à utiliser DentalCloud.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowRedeemModal(true)}
            className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
          >
            <Key className="w-5 h-5" />
            Utiliser un code d'accès
          </button>
        </div>

        <div className="space-y-6 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Plans disponibles</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${
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
                    <h4 className="text-2xl font-bold text-white mb-1">{plan.name}</h4>
                    <p className="text-white/90 text-sm mb-4">{plan.description}</p>
                    <div className="text-3xl font-bold text-white">
                      {plan.price_monthly.toFixed(2)}€
                      <span className="text-lg font-normal opacity-80">/mois</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {(profile.subscription_status === 'trial' || profile.subscription_status === 'inactive' || profile.subscription_status === 'expired') && (
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={subscribingPlanId === plan.id}
                        className={`w-full px-4 py-3 rounded-lg text-white font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                          plan.plan_type === 'premium_complete'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                            : 'bg-gradient-to-r from-primary-500 to-cyan-500'
                        }`}
                      >
                        {subscribingPlanId === plan.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Redirection vers le paiement...
                          </span>
                        ) : (
                          `S'abonner pour ${plan.price_monthly.toFixed(2)}€/mois`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {profile.subscription_status === 'active' && profile.stripe_subscription_id && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-emerald-900 mb-2 text-lg">Abonnement actif</h4>
                  <p className="text-sm text-emerald-700 mb-4">
                    Vous avez accès à toutes les fonctionnalités de DentalCloud. Pour toute question, contactez notre support.
                  </p>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancellingSubscription}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancellingSubscription ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Résiliation en cours...
                      </span>
                    ) : (
                      'Résilier mon abonnement'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {profile.subscription_status === 'active' && !profile.stripe_subscription_id && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-emerald-900 mb-2 text-lg">Abonnement actif</h4>
                  <p className="text-sm text-emerald-700">
                    Vous avez accès à toutes les fonctionnalités de DentalCloud. Pour toute question, contactez notre support.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4">Besoin d'aide ?</h3>
          <p className="text-slate-600 mb-4">
            Notre équipe support est disponible pour vous aider avec votre abonnement, vos questions de facturation ou toute autre demande.
          </p>
          <button
            onClick={() => window.location.href = '/#/support'}
            className="px-6 py-3 bg-white text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors font-medium"
          >
            Contacter le support
          </button>
        </div>

        {showRedeemModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Key className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Activer un code d'accès</h3>
              </div>

              <p className="text-slate-600 mb-6">
                Entrez votre code d'accès pour prolonger votre abonnement.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Code d'accès
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-center text-lg"
                  maxLength={14}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setAccessCode('');
                  }}
                  disabled={redeeming}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRedeemCode}
                  disabled={!accessCode.trim() || redeeming}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {redeeming ? 'Activation...' : 'Activer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section des factures */}
        {invoices.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Mes factures d'abonnement
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Historique de vos paiements d'abonnement
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">N° Facture</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Période</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Montant HT</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">TVA</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Montant TTC</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-slate-700">Statut</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-sm font-medium text-slate-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(invoice.issued_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(invoice.period_start).toLocaleDateString('fr-FR')} au{' '}
                        {new Date(invoice.period_end).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                        {invoice.amount_ht.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">
                        {invoice.tax_rate}%
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                        {invoice.amount_ttc.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : invoice.payment_status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {invoice.payment_status === 'paid' && <CheckCircle className="w-3 h-3" />}
                          {invoice.payment_status === 'paid' && 'Payée'}
                          {invoice.payment_status === 'pending' && 'En attente'}
                          {invoice.payment_status === 'failed' && 'Échouée'}
                          {invoice.payment_status === 'cancelled' && 'Annulée'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          title="Télécharger la facture"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Télécharger</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

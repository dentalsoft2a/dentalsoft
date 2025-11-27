import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DentistSubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  trial_period_days: number;
  features: string[];
  is_active: boolean;
  unlocks_cabinet_features: boolean;
  display_order: number;
}

export interface DentistSubscriptionStatus {
  hasAccess: boolean;
  loading: boolean;
  subscriptionStatus: 'none' | 'trial' | 'active' | 'expired';
  currentPlan: DentistSubscriptionPlan | null;
  trialDaysRemaining: number | null;
  subscriptionEndsAt: string | null;
  canStartTrial: boolean;
  activateTrial: () => Promise<{ success: boolean; message: string }>;
  refreshSubscription: () => Promise<void>;
}

export function useDentistSubscription(): DentistSubscriptionStatus {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'none' | 'trial' | 'active' | 'expired'>('none');
  const [currentPlan, setCurrentPlan] = useState<DentistSubscriptionPlan | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string | null>(null);
  const [canStartTrial, setCanStartTrial] = useState(false);

  const loadSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: dentistAccount, error } = await supabase
        .from('dentist_accounts')
        .select(`
          subscription_status,
          subscription_plan_id,
          subscription_end_date,
          trial_used,
          cabinet_billing_enabled
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!dentistAccount) {
        setHasAccess(false);
        setSubscriptionStatus('none');
        setCanStartTrial(false);
        setLoading(false);
        return;
      }

      const status = dentistAccount.subscription_status || 'none';

      // Load plan separately if there's a plan_id
      let plan: DentistSubscriptionPlan | null = null;
      if (dentistAccount.subscription_plan_id) {
        const { data: planData } = await supabase
          .from('dentist_subscription_plans')
          .select('*')
          .eq('id', dentistAccount.subscription_plan_id)
          .maybeSingle();
        plan = planData;
      }

      setSubscriptionStatus(status);
      setCurrentPlan(plan);
      setSubscriptionEndsAt(dentistAccount.subscription_end_date);
      setCanStartTrial(!dentistAccount.trial_used && status === 'none');

      // Check if subscription is actually valid by verifying the end date
      let actualAccess = false;
      if (dentistAccount.subscription_end_date && (status === 'trial' || status === 'active')) {
        const endDate = new Date(dentistAccount.subscription_end_date);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Only grant access if subscription hasn't expired yet
        if (diffDays > 0) {
          actualAccess = true;
          setTrialDaysRemaining(diffDays);
        } else {
          // Subscription date has passed, no access even if status says trial/active
          actualAccess = false;
          setTrialDaysRemaining(0);
        }
      } else if (status === 'trial' || status === 'active') {
        // Has status but no end date - should not happen but grant access to be safe
        actualAccess = true;
        setTrialDaysRemaining(null);
      } else {
        setTrialDaysRemaining(null);
      }

      setHasAccess(actualAccess);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const activateTrial = async (): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Utilisateur non connecté' };
    }

    try {
      const { data, error } = await supabase.rpc('activate_dentist_trial', {
        p_dentist_id: user.id
      });

      if (error) throw error;

      if (data && data.success) {
        await loadSubscriptionData();
        return {
          success: true,
          message: data.message || 'Essai gratuit activé avec succès !'
        };
      } else {
        return {
          success: false,
          message: data?.message || 'Impossible d\'activer l\'essai gratuit'
        };
      }
    } catch (error: any) {
      console.error('Error activating trial:', error);
      return {
        success: false,
        message: error.message || 'Une erreur est survenue'
      };
    }
  };

  const refreshSubscription = async () => {
    await loadSubscriptionData();
  };

  return {
    hasAccess,
    loading,
    subscriptionStatus,
    currentPlan,
    trialDaysRemaining,
    subscriptionEndsAt,
    canStartTrial,
    activateTrial,
    refreshSubscription
  };
}

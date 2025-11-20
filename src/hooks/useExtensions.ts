import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook pour gérer les extensions et leurs fonctionnalités
 *
 * Comportement:
 * - Si l'utilisateur est un propriétaire de laboratoire:
 *   Charge ses propres extensions
 *
 * - Si l'utilisateur est un employé actif:
 *   Charge les extensions du laboratoire auquel il appartient
 *   Perd l'accès si désactivé (is_active = false)
 *
 * - Si l'utilisateur a un plan avec unlocks_all_extensions:
 *   Toutes les fonctionnalités sont débloquées automatiquement
 */

export interface Extension {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  is_active: boolean;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExtensionFeature {
  id: string;
  extension_id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  created_at: string;
}

export interface UserExtension {
  id: string;
  user_id: string;
  profile_id: string | null;
  extension_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  start_date: string;
  expiry_date: string | null;
  auto_renew: boolean;
  stripe_subscription_id: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  extension?: Extension;
}

export interface ExtensionWithFeatures extends Extension {
  features: ExtensionFeature[];
}

export function useExtensions() {
  const [extensions, setExtensions] = useState<ExtensionWithFeatures[]>([]);
  const [userExtensions, setUserExtensions] = useState<UserExtension[]>([]);
  const [hasUnlockAllAccess, setHasUnlockAllAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: extensionsData, error: extensionsError } = await supabase
        .from('extensions')
        .select('id, name, description, monthly_price, is_active, icon, sort_order, stripe_price_id, created_at, updated_at')
        .order('sort_order');

      if (extensionsError) throw extensionsError;

      const { data: featuresData, error: featuresError } = await supabase
        .from('extension_features')
        .select('id, extension_id, feature_key, feature_name, description, created_at');

      if (featuresError) throw featuresError;

      const { data: userData } = await supabase.auth.getUser();

      let userIsEmployee = false;
      let laboratoryId = userData.user?.id || null;

      if (userData.user) {
        const { data: employeeData } = await supabase
          .from('laboratory_employees')
          .select('id, laboratory_profile_id, is_active')
          .eq('user_profile_id', userData.user.id)
          .eq('is_active', true)
          .maybeSingle();

        userIsEmployee = !!employeeData;
        if (employeeData) {
          laboratoryId = employeeData.laboratory_profile_id;
        }

        console.log('[useExtensions] User context:', {
          userId: userData.user.id,
          isEmployee: userIsEmployee,
          laboratoryId,
        });
      }

      const { data: userExtensionsData, error: userExtensionsError } = await supabase
        .from('user_extensions')
        .select('*, extension:extensions(*)');

      if (userExtensionsError) throw userExtensionsError;

      console.log('[useExtensions] Extensions loaded:', {
        totalExtensions: extensionsData?.length || 0,
        activeUserExtensions: userExtensionsData?.length || 0,
      });

      let unlocksAll = false;
      if (userData.user && laboratoryId) {
        const { data: userProfileData } = await supabase
          .from('user_profiles')
          .select(`
            subscription_plan_id,
            subscription_plans!inner(unlocks_all_extensions)
          `)
          .eq('id', laboratoryId)
          .maybeSingle();

        if (userProfileData?.subscription_plans?.unlocks_all_extensions) {
          unlocksAll = true;
        }
      }

      const extensionsWithFeatures = extensionsData?.map(ext => ({
        ...ext,
        features: featuresData?.filter(f => f.extension_id === ext.id) || []
      })) || [];

      setExtensions(extensionsWithFeatures);
      setUserExtensions(userExtensionsData || []);
      setHasUnlockAllAccess(unlocksAll);
      setIsEmployee(userIsEmployee);
    } catch (err) {
      console.error('Error loading extensions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load extensions');
    } finally {
      setLoading(false);
    }
  };

  const hasFeatureAccess = (featureKey: string): boolean => {
    if (hasUnlockAllAccess) {
      return true;
    }

    const extensionForFeature = extensions.find(ext =>
      ext.features.some(f => f.feature_key === featureKey)
    );

    if (!extensionForFeature) return true;

    if (!extensionForFeature.is_active) {
      return true;
    }

    return userExtensions.some(ue => {
      if (ue.status !== 'active') return false;
      if (ue.expiry_date && new Date(ue.expiry_date) < new Date()) return false;

      const extension = extensions.find(e => e.id === ue.extension_id);
      return extension?.features.some(f => f.feature_key === featureKey) || false;
    });
  };

  const hasExtension = (extensionId: string): boolean => {
    return userExtensions.some(ue => {
      if (ue.extension_id !== extensionId) return false;
      if (ue.status !== 'active') return false;
      if (ue.expiry_date && new Date(ue.expiry_date) < new Date()) return false;
      return true;
    });
  };

  const getActiveExtensions = (): UserExtension[] => {
    return userExtensions.filter(ue => {
      if (ue.status !== 'active') return false;
      if (ue.expiry_date && new Date(ue.expiry_date) < new Date()) return false;
      return true;
    });
  };

  const getExtensionByFeature = (featureKey: string): ExtensionWithFeatures | null => {
    return extensions.find(ext =>
      ext.features.some(f => f.feature_key === featureKey)
    ) || null;
  };

  return {
    extensions,
    userExtensions,
    hasUnlockAllAccess,
    loading,
    error,
    isEmployee,
    hasFeatureAccess,
    hasExtension,
    getActiveExtensions,
    getExtensionByFeature,
    reloadExtensions: loadExtensions
  };
}

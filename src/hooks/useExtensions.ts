import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: extensionsData, error: extensionsError } = await supabase
        .from('extensions')
        .select('*')
        .order('sort_order');

      if (extensionsError) throw extensionsError;

      const { data: featuresData, error: featuresError } = await supabase
        .from('extension_features')
        .select('*');

      if (featuresError) throw featuresError;

      const { data: userExtensionsData, error: userExtensionsError } = await supabase
        .from('user_extensions')
        .select('*, extension:extensions(*)');

      if (userExtensionsError) throw userExtensionsError;

      const extensionsWithFeatures = extensionsData?.map(ext => ({
        ...ext,
        features: featuresData?.filter(f => f.extension_id === ext.id) || []
      })) || [];

      setExtensions(extensionsWithFeatures);
      setUserExtensions(userExtensionsData || []);
    } catch (err) {
      console.error('Error loading extensions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load extensions');
    } finally {
      setLoading(false);
    }
  };

  const hasFeatureAccess = (featureKey: string): boolean => {
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
    loading,
    error,
    hasFeatureAccess,
    hasExtension,
    getActiveExtensions,
    getExtensionByFeature,
    reloadExtensions: loadExtensions
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

export interface OnboardingProgress {
  id: string;
  user_id: string;
  current_step: number;
  completed_steps: Record<string, any>;
  selected_catalog_items: string[];
  selected_resources: string[];
  configuration_data: Record<string, any>;
  completed_at: string | null;
}

export interface PredefinedCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  default_unit: string;
}

export interface PredefinedResource {
  id: string;
  name: string;
  description: string;
  unit: string;
  has_variants: boolean;
}

export function useOnboardingProgress() {
  const { user, userProfile } = useAuth();

  return useQuery({
    queryKey: ['onboarding-progress', user?.id],
    queryFn: async () => {
      if (!userProfile) return null;

      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (error) throw error;
      return data as OnboardingProgress | null;
    },
    enabled: !!user && !!userProfile,
    staleTime: 30 * 1000,
  });
}

export function usePredefinedCatalogItems() {
  return useQuery({
    queryKey: ['predefined-catalog-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predefined_catalog_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as PredefinedCatalogItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePredefinedResources() {
  return useQuery({
    queryKey: ['predefined-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predefined_resources')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as PredefinedResource[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompleteOnboardingStep() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ step, data }: { step: number; data: any }) => {
      if (!user || !userProfile) throw new Error('User not authenticated');

      logger.info('[Onboarding] Completing step:', step);

      const { data: result, error } = await supabase.rpc('complete_onboarding_step', {
        p_user_id: userProfile.id,
        p_step_number: step,
        p_step_data: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
}

export function useInitializeUserData() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      catalogItemIds,
      resourceIds,
      configuration,
    }: {
      catalogItemIds: string[];
      resourceIds: string[];
      configuration: Record<string, any>;
    }) => {
      if (!user || !userProfile) throw new Error('User not authenticated');

      logger.info('[Onboarding] Initializing user data');

      const { data, error } = await supabase.rpc('initialize_user_starter_data', {
        p_user_id: userProfile.id,
        p_catalog_item_ids: catalogItemIds,
        p_resource_ids: resourceIds,
        p_configuration: configuration,
      });

      if (error) {
        logger.error('[Onboarding] Error initializing data:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['dentists'] });
      window.location.reload();
    },
  });
}

export function useSkipOnboarding() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user || !userProfile) throw new Error('User not authenticated');

      logger.info('[Onboarding] Skipping onboarding');

      const { error } = await supabase
        .from('user_profiles')
        .update({
          onboarding_skipped: true,
          onboarding_completed: true,
        })
        .eq('id', userProfile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
      window.location.reload();
    },
  });
}

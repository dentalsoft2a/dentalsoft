import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

export interface DentalOnboardingProgress {
  id: string;
  dentist_id: string;
  current_step: number;
  completed_steps: Record<string, any>;
  selected_services: string[];
  selected_supplies: string[];
  configuration_data: Record<string, any>;
  completed_at: string | null;
}

export interface PredefinedDentalSupply {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  has_batch_tracking: boolean;
  has_expiry_date: boolean;
}

export interface PredefinedDentalService {
  id: string;
  name: string;
  description: string;
  category: string;
  ccam_code: string;
  default_price: number;
  cpam_reimbursement: number;
}

export function usePredefinedDentalSupplies() {
  return useQuery({
    queryKey: ['predefined-dental-supplies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predefined_dental_supplies')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as PredefinedDentalSupply[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePredefinedDentalServices() {
  return useQuery({
    queryKey: ['predefined-dental-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predefined_dental_services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as PredefinedDentalService[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useInitializeDentalCabinet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceIds,
      supplyIds,
      configuration,
    }: {
      serviceIds: string[];
      supplyIds: string[];
      configuration: Record<string, any>;
    }) => {
      if (!user) throw new Error('User not authenticated');

      logger.info('[Dental Onboarding] Initializing cabinet data');

      // Copier les actes dentaires sélectionnés
      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from('predefined_dental_services')
          .select('*')
          .in('id', serviceIds);

        if (services) {
          const catalogItems = services.map(service => ({
            dentist_id: user.id,
            name: service.name,
            description: service.description,
            category: service.category,
            ccam_code: service.ccam_code,
            price: service.default_price,
            cpam_reimbursement: service.cpam_reimbursement,
            unit: 'acte',
            is_active: true,
          }));

          const { error } = await supabase
            .from('dental_catalog_items')
            .insert(catalogItems);

          if (error) throw error;
        }
      }

      // Copier les fournitures sélectionnées
      if (supplyIds.length > 0) {
        const { data: supplies } = await supabase
          .from('predefined_dental_supplies')
          .select('*')
          .in('id', supplyIds);

        if (supplies) {
          const resources = supplies.map(supply => ({
            dentist_id: user.id,
            name: supply.name,
            description: supply.description,
            category: supply.category,
            unit: supply.unit,
            stock_quantity: 0,
            low_stock_threshold: 10,
            cost_per_unit: 0,
            has_batch_tracking: supply.has_batch_tracking,
            has_expiry_date: supply.has_expiry_date,
            is_active: true,
          }));

          const { error } = await supabase
            .from('dental_resources')
            .insert(resources);

          if (error) throw error;
        }
      }

      // Activer le module de facturation
      const { error: enableError } = await supabase.rpc('enable_dental_billing_module', {
        p_dentist_id: user.id,
      });

      if (enableError) throw enableError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dental-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['dental-resources'] });
      queryClient.invalidateQueries({ queryKey: ['dentist-account'] });
    },
  });
}

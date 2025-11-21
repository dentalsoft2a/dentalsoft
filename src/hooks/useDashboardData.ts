import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchDashboardData,
  fetchDentists,
  startDelivery,
  updateStock,
  recordPayment,
  fetchInvoicePayments,
  type DashboardData,
} from '../services/dashboardService';

/**
 * Hook principal pour récupérer toutes les données du dashboard
 * Cache: 5 minutes (données assez dynamiques)
 * Remplace 15+ requêtes SQL par 1 seule
 */
export function useDashboardData() {
  const { user } = useAuth();

  return useQuery<DashboardData>({
    queryKey: ['dashboard', user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook pour récupérer la liste des dentistes
 * Cache: 15 minutes (données peu volatiles)
 * Partagé entre Dashboard et autres pages
 */
export function useDentists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dentists', user?.id],
    queryFn: () => fetchDentists(user!.id),
    enabled: !!user,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}

/**
 * Hook pour récupérer les paiements d'une facture
 */
export function useInvoicePayments(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoicePayments', invoiceId],
    queryFn: () => fetchInvoicePayments(invoiceId!),
    enabled: !!invoiceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Mutation pour démarrer un bon de livraison
 * Invalide automatiquement le cache du dashboard
 */
export function useStartDelivery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (deliveryId: string) => startDelivery(deliveryId),
    onSuccess: () => {
      // Invalider le cache du dashboard pour recharger les données
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
    },
  });
}

/**
 * Mutation pour mettre à jour le stock
 * Invalide le cache du dashboard et des stocks
 */
export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      itemId,
      itemType,
      newQuantity,
    }: {
      itemId: string;
      itemType: 'catalog' | 'resource' | 'variant';
      newQuantity: number;
    }) => updateStock(itemId, itemType, newQuantity),
    onSuccess: () => {
      // Invalider le cache du dashboard (contient lowStock)
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
      // Invalider aussi les caches spécifiques si nécessaire
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

/**
 * Mutation pour enregistrer un paiement
 * Invalide le cache du dashboard et des factures
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      invoiceId,
      amount,
      method,
      date,
      reference,
      notes,
    }: {
      invoiceId: string;
      amount: number;
      method: string;
      date: string;
      reference?: string;
      notes?: string;
    }) => recordPayment(invoiceId, amount, method, date, reference, notes),
    onSuccess: (_, variables) => {
      // Invalider le cache du dashboard
      queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
      // Invalider le cache des factures
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Invalider les paiements de cette facture spécifique
      queryClient.invalidateQueries({ queryKey: ['invoicePayments', variables.invoiceId] });
    },
  });
}

/**
 * Helper pour invalider manuellement le cache du dashboard
 * Utile après des opérations qui affectent le dashboard mais ne sont pas trackées
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
  };
}

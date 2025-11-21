import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface DashboardStats {
  proformasCount: number;
  pendingProformas: number;
  invoicesCount: number;
  monthlyRevenue: number;
  deliveryNotesCount: number;
  inProgressDeliveries: number;
  urgentDeliveries: number;
}

export interface TopItem {
  code: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface DeliveryNote {
  id: string;
  delivery_number: string;
  date: string;
  status: string;
  patient_name?: string;
  dentist: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  total: number;
  status: string;
  dentists?: { name: string };
}

export interface LowStockItem {
  type: 'catalog' | 'resource' | 'variant';
  id: string;
  name: string;
  current_stock: number;
  low_stock_threshold: number;
  unit: string;
}

export interface LowStockData {
  catalog: LowStockItem[];
  resources: LowStockItem[];
  variants: LowStockItem[];
}

export interface DashboardData {
  stats: DashboardStats;
  topItems: TopItem[];
  urgentDeliveries: DeliveryNote[];
  inProgressDeliveries: DeliveryNote[];
  unpaidInvoices: Invoice[];
  lowStock: LowStockData;
}

/**
 * Récupère toutes les données du dashboard en une seule requête RPC
 * Remplace 15+ requêtes SQL individuelles par 1 seule
 */
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  try {
    logger.debug('[DashboardService] Fetching dashboard data for user:', userId);

    const { data, error } = await supabase.rpc('get_dashboard_data', {
      p_user_id: userId
    });

    if (error) {
      logger.error('[DashboardService] Error fetching dashboard data:', error);
      throw error;
    }

    logger.debug('[DashboardService] Dashboard data fetched successfully');

    return data as DashboardData;
  } catch (error) {
    logger.error('[DashboardService] Failed to fetch dashboard data:', error);
    throw error;
  }
}

/**
 * Récupère la liste des dentistes pour les filtres
 * Mise en cache séparée car moins volatile
 */
export async function fetchDentists(userId: string) {
  try {
    const { data, error } = await supabase
      .from('dentists')
      .select('id, name, email, phone, address')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[DashboardService] Error loading dentists:', error);
    throw error;
  }
}

/**
 * Démarre un bon de livraison (change le statut à "in_progress")
 */
export async function startDelivery(deliveryId: string) {
  try {
    const { error } = await supabase
      .from('delivery_notes')
      .update({ status: 'in_progress' })
      .eq('id', deliveryId);

    if (error) throw error;

    logger.info('[DashboardService] Delivery started:', deliveryId);
  } catch (error) {
    logger.error('[DashboardService] Error starting delivery:', error);
    throw error;
  }
}

/**
 * Met à jour le stock d'un article
 */
export async function updateStock(
  itemId: string,
  itemType: 'catalog' | 'resource' | 'variant',
  newQuantity: number
) {
  try {
    let tableName: string;

    switch (itemType) {
      case 'catalog':
        tableName = 'catalog_items';
        break;
      case 'resource':
        tableName = 'resources';
        break;
      case 'variant':
        tableName = 'resource_variants';
        break;
      default:
        throw new Error(`Unknown item type: ${itemType}`);
    }

    const { error } = await supabase
      .from(tableName)
      .update({ stock_quantity: newQuantity })
      .eq('id', itemId);

    if (error) throw error;

    logger.info('[DashboardService] Stock updated:', { itemId, itemType, newQuantity });
  } catch (error) {
    logger.error('[DashboardService] Error updating stock:', error);
    throw error;
  }
}

/**
 * Enregistre un paiement sur une facture
 */
export async function recordPayment(
  invoiceId: string,
  amount: number,
  method: string,
  date: string,
  reference?: string,
  notes?: string
) {
  try {
    const { error } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id: invoiceId,
        amount,
        payment_method: method,
        payment_date: date,
        reference,
        notes
      });

    if (error) throw error;

    logger.info('[DashboardService] Payment recorded:', { invoiceId, amount });
  } catch (error) {
    logger.error('[DashboardService] Error recording payment:', error);
    throw error;
  }
}

/**
 * Récupère les paiements d'une facture
 */
export async function fetchInvoicePayments(invoiceId: string) {
  try {
    const { data, error } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[DashboardService] Error loading invoice payments:', error);
    throw error;
  }
}

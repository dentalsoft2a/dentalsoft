import { useEffect, useState } from 'react';
import { FileText, Receipt, Truck, TrendingUp, AlertCircle, Package, Clock, User, Calendar, CheckCircle, Download, BarChart3, Filter, X, AlertTriangle, Archive, Save, DollarSign, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type DeliveryNote = Database['public']['Tables']['delivery_notes']['Row'];
type Dentist = Database['public']['Tables']['dentists']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  dentists?: { name: string };
};

interface DeliveryWithDentist extends DeliveryNote {
  dentist: Dentist;
  patient_name?: string;
  status?: string;
}

interface Stats {
  proformasCount: number;
  pendingProformas: number;
  invoicesCount: number;
  monthlyRevenue: number;
  deliveryNotesCount: number;
  inProgressDeliveries: number;
  urgentDeliveries: number;
}

interface ItemStats {
  code: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  dentistId: string;
  category: string;
}

interface ReportData {
  totalRevenue: number;
  totalInvoices: number;
  totalDeliveryNotes: number;
  revenueByDentist: { dentist: string; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  deliveryStatusBreakdown: { status: string; count: number }[];
  topItems: ItemStats[];
}

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps = {}) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    proformasCount: 0,
    pendingProformas: 0,
    invoicesCount: 0,
    monthlyRevenue: 0,
    deliveryNotesCount: 0,
    inProgressDeliveries: 0,
    urgentDeliveries: 0,
  });
  const [itemStats, setItemStats] = useState<ItemStats[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryWithDentist[]>([]);
  const [urgentDeliveries, setUrgentDeliveries] = useState<DeliveryWithDentist[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [lowStockResources, setLowStockResources] = useState<any[]>([]);
  const [lowStockVariants, setLowStockVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    dentistId: 'all',
    category: 'all',
  });
  const [showQuickFill, setShowQuickFill] = useState<{ id: string; name: string; currentStock: number; type: 'catalog' | 'resource' | 'variant' } | null>(null);
  const [quickFillQuantity, setQuickFillQuantity] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadItemStats();
    loadDeliveries();
    loadDentists();
    loadLowStockItems();
    loadUnpaidInvoices();
  }, [user]);

  const loadDentists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setDentists(data || []);
    } catch (error) {
      console.error('Error loading dentists:', error);
    }
  };

  const loadLowStockItems = async () => {
    if (!user) return;

    try {
      // catalog_items doesn't have stock tracking, skip it
      setLowStockItems([]);

      // Load low stock resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_stock', true);

      if (resourcesError) throw resourcesError;

      const lowStockRes = (resourcesData || []).filter(
        resource => !resource.has_variants && resource.stock_quantity <= resource.low_stock_threshold
      );

      setLowStockResources(lowStockRes);

      const { data: variantsData, error: variantsError } = await supabase
        .from('resource_variants')
        .select('*, resource:resources!inner(name, user_id)')
        .eq('resource.user_id', user.id)
        .eq('is_active', true)
        .order('subcategory', { ascending: true })
        .order('variant_name', { ascending: true });

      if (variantsError) throw variantsError;

      const lowStockVars = (variantsData || []).filter(
        variant => variant.stock_quantity <= variant.low_stock_threshold
      );

      setLowStockVariants(lowStockVars);
    } catch (error) {
      console.error('Error loading low stock items:', error);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const [proformasRes, pendingRes, invoicesRes, revenueRes, deliveriesRes, inProgressRes, urgentRes] = await Promise.all([
        supabase
          .from('proformas')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('proformas')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('invoices')
          .select('total')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .eq('year', currentYear),
        supabase
          .from('delivery_notes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('delivery_notes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'in_progress'),
        supabase
          .from('delivery_notes')
          .select('id, date, status', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'completed')
          .gte('date', now.toISOString().split('T')[0])
          .lte('date', twoDaysFromNow.toISOString().split('T')[0]),
      ]);

      const monthlyRevenue = revenueRes.data?.reduce((sum, invoice) => sum + Number(invoice.total), 0) || 0;

      setStats({
        proformasCount: proformasRes.count || 0,
        pendingProformas: pendingRes.count || 0,
        invoicesCount: invoicesRes.count || 0,
        monthlyRevenue,
        deliveryNotesCount: deliveriesRes.count || 0,
        inProgressDeliveries: inProgressRes.count || 0,
        urgentDeliveries: urgentRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadItemStats = async () => {
    if (!user) return;

    try {
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .eq('user_id', user.id);

      if (invoicesError) throw invoicesError;

      if (!invoices || invoices.length === 0) {
        setItemStats([]);
        return;
      }

      const invoiceIds = invoices.map((inv) => inv.id);

      const { data: proformaLinks, error: linksError } = await supabase
        .from('invoice_proformas')
        .select('proforma_id')
        .in('invoice_id', invoiceIds);

      if (linksError) throw linksError;

      if (!proformaLinks || proformaLinks.length === 0) {
        setItemStats([]);
        return;
      }

      const proformaIds = proformaLinks.map((link) => link.proforma_id);

      const { data: proformaItems, error: itemsError } = await supabase
        .from('proforma_items')
        .select('description, quantity, unit_price')
        .in('proforma_id', proformaIds);

      if (itemsError) throw itemsError;

      const itemMap = new Map<string, { quantity: number; revenue: number }>();

      proformaItems?.forEach((item) => {
        const existing = itemMap.get(item.description) || { quantity: 0, revenue: 0 };
        itemMap.set(item.description, {
          quantity: existing.quantity + Number(item.quantity),
          revenue: existing.revenue + Number(item.quantity) * Number(item.unit_price),
        });
      });

      const itemStatsData: ItemStats[] = Array.from(itemMap.entries()).map(([description, stats]) => ({
        code: description.substring(0, 30),
        name: description,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }));

      itemStatsData.sort((a, b) => b.revenue - a.revenue);

      setItemStats(itemStatsData.slice(0, 10));
    } catch (error) {
      console.error('Error loading item stats:', error);
    }
  };

  const loadDeliveries = async () => {
    if (!user) return;

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const { data: allDeliveries, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          dentist:dentists(*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      const deliveriesWithDentist = allDeliveries as DeliveryWithDentist[];

      const urgent = deliveriesWithDentist.filter(delivery => {
        if (delivery.status === 'completed') return false;
        const deliveryDate = new Date(delivery.date);
        deliveryDate.setHours(0, 0, 0, 0);
        return deliveryDate >= now && deliveryDate <= twoDaysFromNow;
      });

      const inProgress = deliveriesWithDentist.filter(delivery =>
        delivery.status === 'in_progress'
      ).slice(0, 5);

      setUrgentDeliveries(urgent);
      setRecentDeliveries(inProgress);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  };

  const loadUnpaidInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, dentists(name)')
        .eq('user_id', user.id)
        .in('status', ['draft', 'partial'])
        .order('date', { ascending: false });

      if (error) throw error;
      setUnpaidInvoices(data || []);
    } catch (error) {
      console.error('Error loading unpaid invoices:', error);
    }
  };

  const getDaysUntilDelivery = (dateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(dateStr);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffTime = deliveryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCompleteDelivery = async (deliveryId: string) => {
    try {
      const { error } = await supabase
        .from('delivery_notes')
        .update({ status: 'completed' })
        .eq('id', deliveryId);

      if (error) throw error;
      await loadDeliveries();
      await loadStats();
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const statCards = [
    {
      title: 'Bons de livraison',
      value: stats.deliveryNotesCount,
      icon: Truck,
      color: 'blue',
    },
    {
      title: 'En cours',
      value: stats.inProgressDeliveries,
      icon: Clock,
      color: 'cyan',
    },
    {
      title: 'Urgents (48h)',
      value: stats.urgentDeliveries,
      icon: AlertCircle,
      color: 'orange',
    },
    {
      title: 'CA du mois',
      value: `${stats.monthlyRevenue.toFixed(2)} €`,
      icon: TrendingUp,
      color: 'emerald',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <span className="text-slate-600 font-medium">Chargement...</span>
        </div>
      </div>
    );
  }

  const generateReport = async () => {
    if (!user) return;

    setGeneratingReport(true);
    try {
      const startDate = new Date(reportFilters.startDate);
      const endDate = new Date(reportFilters.endDate);
      endDate.setHours(23, 59, 59, 999);

      let invoicesQuery = supabase
        .from('invoices')
        .select(`
          *,
          invoice_proformas(
            proforma:proformas(
              *,
              dentist:dentists(*),
              proforma_items(*)
            )
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { data: invoices, error: invoicesError } = await invoicesQuery;
      if (invoicesError) throw invoicesError;

      let deliveryNotesQuery = supabase
        .from('delivery_notes')
        .select('*, dentist:dentists(*)')
        .eq('user_id', user.id)
        .gte('date', reportFilters.startDate)
        .lte('date', reportFilters.endDate);

      if (reportFilters.dentistId !== 'all') {
        deliveryNotesQuery = deliveryNotesQuery.eq('dentist_id', reportFilters.dentistId);
      }

      const { data: deliveryNotes, error: deliveryError } = await deliveryNotesQuery;
      if (deliveryError) throw deliveryError;

      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
      const totalInvoices = invoices?.length || 0;
      const totalDeliveryNotes = deliveryNotes?.length || 0;

      const dentistRevenueMap = new Map<string, number>();
      invoices?.forEach(invoice => {
        invoice.invoice_proformas?.forEach((ip: any) => {
          const dentistName = ip.proforma?.dentist?.name || 'Inconnu';
          const current = dentistRevenueMap.get(dentistName) || 0;
          dentistRevenueMap.set(dentistName, current + Number(invoice.total) / (invoice.invoice_proformas?.length || 1));
        });
      });

      const revenueByDentist = Array.from(dentistRevenueMap.entries())
        .map(([dentist, revenue]) => ({ dentist, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      const monthRevenueMap = new Map<string, number>();
      invoices?.forEach(invoice => {
        const date = new Date(invoice.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthRevenueMap.get(monthKey) || 0;
        monthRevenueMap.set(monthKey, current + Number(invoice.total));
      });

      const revenueByMonth = Array.from(monthRevenueMap.entries())
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const statusMap = new Map<string, number>();
      deliveryNotes?.forEach(dn => {
        const status = dn.status || 'pending';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const deliveryStatusBreakdown = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }));

      const itemRevenueMap = new Map<string, { quantity: number; revenue: number }>();
      invoices?.forEach(invoice => {
        invoice.invoice_proformas?.forEach((ip: any) => {
          ip.proforma?.proforma_items?.forEach((item: any) => {
            const existing = itemRevenueMap.get(item.description) || { quantity: 0, revenue: 0 };
            itemRevenueMap.set(item.description, {
              quantity: existing.quantity + Number(item.quantity),
              revenue: existing.revenue + Number(item.quantity) * Number(item.unit_price),
            });
          });
        });
      });

      const topItems: ItemStats[] = Array.from(itemRevenueMap.entries())
        .map(([name, stats]) => ({
          code: name.substring(0, 30),
          name,
          quantity: stats.quantity,
          revenue: stats.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setReportData({
        totalRevenue,
        totalInvoices,
        totalDeliveryNotes,
        revenueByDentist,
        revenueByMonth,
        deliveryStatusBreakdown,
        topItems,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      in_progress: 'En cours',
      completed: 'Terminé',
    };
    return labels[status] || status;
  };

  const handleQuickFill = async () => {
    if (!showQuickFill || !user) return;

    try {
      const newStock = showQuickFill.currentStock + quickFillQuantity;

      if (showQuickFill.type === 'catalog') {
        const { error } = await supabase
          .from('catalog_items')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', showQuickFill.id);

        if (error) throw error;
      } else if (showQuickFill.type === 'resource') {
        const { error } = await supabase
          .from('resources')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', showQuickFill.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resource_variants')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', showQuickFill.id);

        if (error) throw error;
      }

      await loadLowStockItems();
      setShowQuickFill(null);
      setQuickFillQuantity(0);
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Erreur lors de la mise à jour du stock');
    }
  };

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  const openPaymentModal = async (invoice: Invoice) => {
    setShowPaymentModal(invoice);
    setPaymentAmount('');
    setPaymentMethod('bank_transfer');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference('');
    setPaymentNotes('');

    await loadInvoicePayments(invoice.id);
  };

  const loadInvoicePayments = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setInvoicePayments(data || []);
    } catch (error) {
      console.error('Error loading invoice payments:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!showPaymentModal || !user) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    try {
      const noteText = paymentReference
        ? `Référence: ${paymentReference}${paymentNotes ? '\n' + paymentNotes : ''}`
        : paymentNotes || null;

      const paymentData = {
        invoice_id: showPaymentModal.id,
        user_id: user.id,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: noteText,
      };

      console.log('Inserting payment:', paymentData);

      const { data, error } = await supabase
        .from('invoice_payments')
        .insert(paymentData)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Payment inserted successfully:', data);

      await loadInvoicePayments(showPaymentModal.id);
      await loadUnpaidInvoices();
      await loadStats();

      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
    } catch (error: any) {
      console.error('Error adding payment:', error);
      alert(`Erreur lors de l'ajout du paiement: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Supprimer ce paiement ?')) return;
    if (!showPaymentModal) return;

    try {
      const { error } = await supabase
        .from('invoice_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      await loadInvoicePayments(showPaymentModal.id);
      await loadUnpaidInvoices();
      await loadStats();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Erreur lors de la suppression du paiement');
    }
  };

  const getTotalPaid = () => {
    return invoicePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  };

  const getRemainingAmount = () => {
    if (!showPaymentModal) return 0;
    return Number(showPaymentModal.total) - getTotalPaid();
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      'bank_transfer': 'Virement',
      'check': 'Chèque',
      'cash': 'Espèces',
      'credit_card': 'Carte bancaire',
    };
    return labels[method] || method;
  };

  return (
    <div>
      <div className="mb-8 animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-primary-900 to-slate-900 bg-clip-text text-transparent">Tableau de bord</h1>
          <p className="text-slate-600 mt-2">Vue d'ensemble de votre activité</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 hover:scale-105"
        >
          <BarChart3 className="w-5 h-5" />
          Générer un rapport
        </button>
      </div>

      {(lowStockItems.length > 0 || lowStockResources.length > 0 || lowStockVariants.length > 0) && (
        <div className="mb-6 bg-gradient-to-br from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-xl p-5 shadow-lg animate-pulse-slow">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-orange-900 flex items-center gap-2">
                  Alerte stock faible
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                    {lowStockItems.length + lowStockResources.length + lowStockVariants.length}
                  </span>
                </h3>
                <div className="flex gap-2">
                  {lowStockItems.length > 0 && (
                    <button
                      onClick={() => onNavigate?.('catalog')}
                      className="text-sm font-medium text-orange-700 hover:text-orange-900 underline"
                    >
                      Voir le catalogue
                    </button>
                  )}
                  {lowStockResources.length > 0 && (
                    <button
                      onClick={() => onNavigate?.('resources')}
                      className="text-sm font-medium text-orange-700 hover:text-orange-900 underline"
                    >
                      Voir les ressources
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-orange-800 mb-3">
                {lowStockItems.length + lowStockResources.length + lowStockVariants.length === 1
                  ? 'Un article/ressource nécessite un réapprovisionnement'
                  : `${lowStockItems.length + lowStockResources.length + lowStockVariants.length} articles/ressources nécessitent un réapprovisionnement`}
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-200 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-slate-900">{item.name}</span>
                      <span className="text-orange-600 font-bold">
                        {item.stock_quantity}/{item.low_stock_threshold}
                      </span>
                      <span className="text-xs text-slate-500">(Catalogue)</span>
                    </div>
                    <button
                      onClick={() => setShowQuickFill({
                        id: item.id,
                        name: item.name,
                        currentStock: item.stock_quantity,
                        type: 'catalog'
                      })}
                      className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors font-medium"
                    >
                      Remplir
                    </button>
                  </div>
                ))}
                {lowStockResources.slice(0, 8).map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-200 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-slate-900">{resource.name}</span>
                      <span className="text-orange-600 font-bold">
                        {resource.stock_quantity}/{resource.low_stock_threshold}
                      </span>
                      <span className="text-xs text-slate-500">(Ressource)</span>
                    </div>
                    <button
                      onClick={() => setShowQuickFill({
                        id: resource.id,
                        name: resource.name,
                        currentStock: resource.stock_quantity,
                        type: 'resource'
                      })}
                      className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors font-medium"
                    >
                      Remplir
                    </button>
                  </div>
                ))}
                {lowStockVariants.slice(0, 8).map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-200 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-slate-900">
                        {variant.resource.name}
                        {variant.subcategory && ` - ${variant.subcategory}`}
                        {' - '}{variant.variant_name}
                      </span>
                      <span className="text-orange-600 font-bold">
                        {variant.stock_quantity}/{variant.low_stock_threshold}
                      </span>
                      <span className="text-xs text-slate-500">(Variante)</span>
                    </div>
                    <button
                      onClick={() => setShowQuickFill({
                        id: variant.id,
                        name: `${variant.resource.name}${variant.subcategory ? ` - ${variant.subcategory}` : ''} - ${variant.variant_name}`,
                        currentStock: variant.stock_quantity,
                        type: 'variant'
                      })}
                      className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors font-medium"
                    >
                      Remplir
                    </button>
                  </div>
                ))}
                {(lowStockItems.length + lowStockResources.length + lowStockVariants.length > 7) && (
                  <div className="flex items-center gap-2 bg-orange-100 rounded-lg px-3 py-2 text-sm font-medium text-orange-700">
                    +{lowStockItems.length + lowStockResources.length + lowStockVariants.length - 7} autres
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {urgentDeliveries.length > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden animate-slide-in">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3 border-b border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Travaux Urgents</h2>
                  <p className="text-xs text-slate-600">Livraisons dans les 48h</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">
                {urgentDeliveries.length}
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {urgentDeliveries.map((delivery) => {
                const daysUntil = getDaysUntilDelivery(delivery.date);
                return (
                  <div
                    key={delivery.id}
                    className="p-2 bg-slate-50 rounded-lg border border-slate-200 hover:border-red-400 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="font-medium text-slate-900 text-xs truncate flex-1 mr-1">
                        {delivery.dentist.name}
                      </h4>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                        daysUntil === 0
                          ? 'bg-red-500 text-white'
                          : daysUntil === 1
                          ? 'bg-orange-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {daysUntil === 0 ? "Auj." : daysUntil === 1 ? 'Demain' : `${daysUntil}j`}
                      </span>
                    </div>

                    <div className="space-y-0.5 mb-2">
                      <p className="text-[10px] text-slate-500">N° {delivery.delivery_number}</p>
                      {delivery.patient_name && (
                        <p className="text-[10px] text-slate-600 truncate">{delivery.patient_name}</p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        {new Date(delivery.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCompleteDelivery(delivery.id)}
                      className="w-full py-1 px-2 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-semibold transition-all duration-200 flex items-center justify-center gap-1"
                      title="Marquer comme terminé"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Terminé
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const colors = {
            blue: 'from-primary-500 to-cyan-500',
            cyan: 'from-cyan-500 to-blue-500',
            orange: 'from-orange-500 to-amber-500',
            green: 'from-green-500 to-emerald-500',
            emerald: 'from-emerald-500 to-teal-500',
          };
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${colors[card.color as keyof typeof colors]} shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">{card.value}</p>
            </div>
          );
        })}
      </div>

      {recentDeliveries.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all duration-300 animate-slide-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Travaux en cours</h2>
              <p className="text-sm text-slate-600">Commandes actuellement en production</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold">
                      {delivery.dentist.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{delivery.dentist.name}</h4>
                      <p className="text-xs text-slate-500">N° {delivery.delivery_number}</p>
                    </div>
                  </div>
                </div>

                {delivery.patient_name && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{delivery.patient_name}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-4 h-4" />
                    {new Date(delivery.date).toLocaleDateString('fr-FR')}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    En cours
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unpaidInvoices.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-red-200/50 p-6 hover:shadow-xl transition-all duration-300 animate-slide-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Factures impayées</h2>
              <p className="text-sm text-slate-600">Factures non payées et partiellement payées</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpaidInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-red-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">
                      {invoice.dentists?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{invoice.dentists?.name || 'Dentiste inconnu'}</h4>
                      <p className="text-xs text-slate-500">N° {invoice.invoice_number}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Période</span>
                    <span className="font-medium text-slate-900">
                      {new Date(invoice.year, invoice.month - 1).toLocaleDateString('fr-FR', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Montant</span>
                    <span className="text-base font-bold text-red-600">{Number(invoice.total).toFixed(2)} €</span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(invoice.date).toLocaleDateString('fr-FR')}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                      invoice.status === 'draft'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {invoice.status === 'draft' ? 'Non payée' : 'Partiellement payée'}
                    </span>
                  </div>

                  <button
                    onClick={() => openPaymentModal(invoice)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition text-xs font-medium"
                  >
                    <span className="text-sm font-bold">€</span>
                    Gérer les paiements
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all duration-300 animate-slide-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">CA par article</h2>
              <p className="text-sm text-slate-600">Top 10 des articles les plus rentables</p>
            </div>
          </div>

          {itemStats.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune donnée disponible pour le moment.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {itemStats.map((item, index) => {
                const maxRevenue = Math.max(...itemStats.map((i) => i.revenue));
                const percentage = (item.revenue / maxRevenue) * 100;

                return (
                  <div key={item.code} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 text-white text-xs font-bold shadow-md">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{item.code}</p>
                          <p className="text-xs text-slate-500 truncate">{item.name}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right ml-4">
                        <p className="font-bold text-slate-900 text-base">{item.revenue.toFixed(2)} €</p>
                        <p className="text-xs text-slate-500">{item.quantity} unités</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all duration-300 animate-slide-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Quantités vendues</h2>
              <p className="text-sm text-slate-600">Top 10 des articles les plus commandés</p>
            </div>
          </div>

          {itemStats.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune donnée disponible pour le moment.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {itemStats.sort((a, b) => b.quantity - a.quantity).map((item, index) => {
                const maxQuantity = Math.max(...itemStats.map((i) => i.quantity));
                const percentage = (item.quantity / maxQuantity) * 100;

                return (
                  <div key={`qty-${item.code}`} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{item.code}</p>
                          <p className="text-xs text-slate-500 truncate">{item.name}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right ml-4">
                        <p className="font-bold text-slate-900 text-xl">{item.quantity}</p>
                        <p className="text-xs text-slate-500">unités</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Rapport d'activité</h2>
                  <p className="text-sm text-slate-600">Analyse complète de votre activité</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportData(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Filtres du rapport</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Dentiste
                    </label>
                    <select
                      value={reportFilters.dentistId}
                      onChange={(e) => setReportFilters({ ...reportFilters, dentistId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="all">Tous les dentistes</option>
                      {dentists.map(dentist => (
                        <option key={dentist.id} value={dentist.id}>{dentist.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={generateReport}
                      disabled={generatingReport}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition disabled:opacity-50 font-medium"
                    >
                      {generatingReport ? 'Génération...' : 'Générer'}
                    </button>
                  </div>
                </div>
              </div>

              {reportData && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-emerald-700 font-medium">Chiffre d'affaires</p>
                          <p className="text-2xl font-bold text-emerald-900">{reportData.totalRevenue.toFixed(2)} €</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-700 font-medium">Factures</p>
                          <p className="text-2xl font-bold text-blue-900">{reportData.totalInvoices}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-orange-700 font-medium">Bons de livraison</p>
                          <p className="text-2xl font-bold text-orange-900">{reportData.totalDeliveryNotes}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary-600" />
                        CA par dentiste
                      </h3>
                      {reportData.revenueByDentist.length === 0 ? (
                        <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
                      ) : (
                        <div className="space-y-3">
                          {reportData.revenueByDentist.slice(0, 10).map((item, index) => {
                            const maxRevenue = reportData.revenueByDentist[0].revenue;
                            const percentage = (item.revenue / maxRevenue) * 100;
                            return (
                              <div key={index}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="font-medium text-slate-900">{item.dentist}</span>
                                  <span className="font-bold text-slate-900">{item.revenue.toFixed(2)} €</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                  <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary-600" />
                        CA par mois
                      </h3>
                      {reportData.revenueByMonth.length === 0 ? (
                        <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
                      ) : (
                        <div className="space-y-3">
                          {reportData.revenueByMonth.map((item, index) => {
                            const maxRevenue = Math.max(...reportData.revenueByMonth.map(m => m.revenue));
                            const percentage = (item.revenue / maxRevenue) * 100;
                            return (
                              <div key={index}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="font-medium text-slate-900">{getMonthLabel(item.month)}</span>
                                  <span className="font-bold text-slate-900">{item.revenue.toFixed(2)} €</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary-600" />
                        Statut des bons de livraison
                      </h3>
                      {reportData.deliveryStatusBreakdown.length === 0 ? (
                        <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
                      ) : (
                        <div className="space-y-3">
                          {reportData.deliveryStatusBreakdown.map((item, index) => {
                            const total = reportData.deliveryStatusBreakdown.reduce((sum, s) => sum + s.count, 0);
                            const percentage = (item.count / total) * 100;
                            const colors = {
                              pending: 'from-amber-500 to-orange-500',
                              in_progress: 'from-blue-500 to-cyan-500',
                              completed: 'from-emerald-500 to-teal-500',
                            };
                            return (
                              <div key={index}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="font-medium text-slate-900">{getStatusLabel(item.status)}</span>
                                  <span className="font-bold text-slate-900">{item.count} ({percentage.toFixed(0)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                  <div
                                    className={`h-full bg-gradient-to-r ${colors[item.status as keyof typeof colors] || 'from-slate-500 to-slate-600'} rounded-full`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary-600" />
                        Top 10 articles
                      </h3>
                      {reportData.topItems.length === 0 ? (
                        <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
                      ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {reportData.topItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 text-white text-xs font-bold">
                                  {index + 1}
                                </span>
                                <span className="font-medium text-slate-900 truncate">{item.code}</span>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-bold text-slate-900">{item.revenue.toFixed(2)} €</p>
                                <p className="text-xs text-slate-500">{item.quantity} unités</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Gestion des paiements</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Facture N° {showPaymentModal.invoice_number} - {showPaymentModal.dentists?.name}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">Montant total</p>
                  <p className="text-2xl font-bold text-slate-900">{Number(showPaymentModal.total).toFixed(2)} €</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-700 mb-1">Total payé</p>
                  <p className="text-2xl font-bold text-green-700">{getTotalPaid().toFixed(2)} €</p>
                </div>
                <div className={`rounded-lg p-4 border ${
                  getRemainingAmount() > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`text-xs mb-1 ${
                    getRemainingAmount() > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>Reste à payer</p>
                  <p className={`text-2xl font-bold ${
                    getRemainingAmount() > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>{getRemainingAmount().toFixed(2)} €</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Ajouter un paiement</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Montant *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Méthode de paiement *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="bank_transfer">Virement</option>
                      <option value="check">Chèque</option>
                      <option value="cash">Espèces</option>
                      <option value="credit_card">Carte bancaire</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Référence
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="N° chèque, référence..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                      placeholder="Notes sur le paiement..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddPayment}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-medium"
                >
                  <Check className="w-4 h-4" />
                  Ajouter le paiement
                </button>
              </div>

              {invoicePayments.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Historique des paiements</h3>
                  <div className="space-y-2">
                    {invoicePayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-bold text-slate-900">
                                {Number(payment.amount).toFixed(2)} €
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                {getPaymentMethodLabel(payment.payment_method)}
                              </span>
                              <span className="text-sm text-slate-500">
                                {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            {payment.notes && (
                              <p className="text-xs text-slate-600 whitespace-pre-line">
                                {payment.notes}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showQuickFill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Remplir le stock</h2>
              <button
                onClick={() => {
                  setShowQuickFill(null);
                  setQuickFillQuantity(0);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  {showQuickFill.type === 'catalog' ? 'Article' : 'Ressource'}
                </p>
                <p className="font-bold text-slate-900">{showQuickFill.name}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Stock actuel</span>
                  <span className="text-2xl font-bold text-slate-900">{showQuickFill.currentStock}</span>
                </div>
                <div className="flex items-center justify-center my-3">
                  <span className="text-3xl text-slate-400">+</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Quantité à ajouter</span>
                  <input
                    type="number"
                    min="0"
                    value={quickFillQuantity}
                    onChange={(e) => setQuickFillQuantity(parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-right font-bold text-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    autoFocus
                  />
                </div>
                <div className="border-t border-slate-300 my-3"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Nouveau stock</span>
                  <span className="text-3xl font-bold text-emerald-600">{showQuickFill.currentStock + quickFillQuantity}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickFill(null);
                    setQuickFillQuantity(0);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  disabled={quickFillQuantity <= 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

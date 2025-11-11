import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Users, Package, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ProductionStats {
  totalDeliveries: number;
  completedDeliveries: number;
  inProgressDeliveries: number;
  pendingDeliveries: number;
  overdueDeliveries: number;
  averageCompletionTime: number;
  onTimeRate: number;
  totalItems: number;
  topEmployees: Array<{
    name: string;
    completedCount: number;
  }>;
}

interface Props {
  startDate?: Date;
  endDate?: Date;
}

export default function ProductionAnalytics({ startDate, endDate }: Props) {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProductionStats>({
    totalDeliveries: 0,
    completedDeliveries: 0,
    inProgressDeliveries: 0,
    pendingDeliveries: 0,
    overdueDeliveries: 0,
    averageCompletionTime: 0,
    onTimeRate: 0,
    totalItems: 0,
    topEmployees: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, startDate, endDate]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Définir la période par défaut (30 derniers jours)
      const end = endDate || new Date();
      const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Charger les livraisons de la période
      let query = supabase
        .from('delivery_notes')
        .select(`
          *,
          assigned_employee:laboratory_employees(id, full_name)
        `)
        .eq('user_id', user.id)
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0]);

      const { data: deliveries, error } = await query;

      if (error) throw error;

      // Calculer les statistiques
      const total = deliveries?.length || 0;
      const completed = deliveries?.filter(d => d.status === 'completed').length || 0;
      const inProgress = deliveries?.filter(d => d.status === 'in_progress').length || 0;
      const pending = deliveries?.filter(d => d.status === 'pending').length || 0;

      // Calculer les retards
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const overdue = deliveries?.filter(d => {
        if (d.status === 'completed') return false;
        const deliveryDate = new Date(d.date);
        deliveryDate.setHours(0, 0, 0, 0);
        return deliveryDate < now;
      }).length || 0;

      // Calculer le temps moyen de complétion (en jours)
      const completedWithDates = deliveries?.filter(d =>
        d.status === 'completed' && d.created_at && d.updated_at
      ) || [];

      let avgTime = 0;
      if (completedWithDates.length > 0) {
        const totalTime = completedWithDates.reduce((sum, d) => {
          const created = new Date(d.created_at);
          const updated = new Date(d.updated_at);
          const days = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgTime = totalTime / completedWithDates.length;
      }

      // Calculer le taux de livraison à temps
      const completedOnTime = deliveries?.filter(d => {
        if (d.status !== 'completed') return false;
        if (!d.estimated_completion_date || !d.updated_at) return false;

        const estimated = new Date(d.estimated_completion_date);
        const actual = new Date(d.updated_at);
        estimated.setHours(0, 0, 0, 0);
        actual.setHours(0, 0, 0, 0);

        return actual <= estimated;
      }).length || 0;

      const onTime = completed > 0 ? (completedOnTime / completed) * 100 : 0;

      // Compter le total d'articles
      const totalItems = deliveries?.reduce((sum, d) => {
        const items = Array.isArray(d.items) ? d.items : [];
        return sum + items.length;
      }, 0) || 0;

      // Top employés
      const employeeStats: Record<string, { name: string; count: number }> = {};

      deliveries?.forEach(d => {
        if (d.assigned_employee && d.status === 'completed') {
          const empId = d.assigned_employee.id;
          if (!employeeStats[empId]) {
            employeeStats[empId] = {
              name: d.assigned_employee.full_name,
              count: 0
            };
          }
          employeeStats[empId].count++;
        }
      });

      const topEmployees = Object.values(employeeStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(e => ({
          name: e.name,
          completedCount: e.count
        }));

      setStats({
        totalDeliveries: total,
        completedDeliveries: completed,
        inProgressDeliveries: inProgress,
        pendingDeliveries: pending,
        overdueDeliveries: overdue,
        averageCompletionTime: avgTime,
        onTimeRate: onTime,
        totalItems,
        topEmployees
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const completionRate = stats.totalDeliveries > 0
    ? (stats.completedDeliveries / stats.totalDeliveries) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-6 border border-primary-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">Total livraisons</p>
          <p className="text-3xl font-bold text-slate-900">{stats.totalDeliveries}</p>
          <p className="text-xs text-slate-500 mt-2">{stats.totalItems} articles au total</p>
        </div>

        {/* Terminées */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-6 border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-emerald-600 font-bold text-lg">{completionRate.toFixed(0)}%</span>
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">Terminées</p>
          <p className="text-3xl font-bold text-slate-900">{stats.completedDeliveries}</p>
          <p className="text-xs text-slate-500 mt-2">Taux de complétion</p>
        </div>

        {/* En cours */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">En cours</p>
          <p className="text-3xl font-bold text-slate-900">{stats.inProgressDeliveries}</p>
          <p className="text-xs text-slate-500 mt-2">{stats.pendingDeliveries} en attente</p>
        </div>

        {/* Retards */}
        <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-6 border border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            {stats.overdueDeliveries > 0 && (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">En retard</p>
          <p className="text-3xl font-bold text-slate-900">{stats.overdueDeliveries}</p>
          <p className="text-xs text-slate-500 mt-2">À traiter en priorité</p>
        </div>
      </div>

      {/* Métriques de performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temps moyen */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Temps moyen de complétion</h3>
              <p className="text-sm text-slate-600">Durée moyenne de production</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-slate-900">
              {stats.averageCompletionTime.toFixed(1)}
            </p>
            <p className="text-lg text-slate-600">jours</p>
          </div>
        </div>

        {/* Taux de livraison à temps */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Livraisons à temps</h3>
              <p className="text-sm text-slate-600">Respect des délais estimés</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-4xl font-bold text-slate-900">
              {stats.onTimeRate.toFixed(0)}%
            </p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.onTimeRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top employés */}
      {stats.topEmployees.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Top employés</h3>
              <p className="text-sm text-slate-600">Meilleurs contributeurs de la période</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.topEmployees.map((employee, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{employee.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((employee.completedCount / (stats.topEmployees[0]?.completedCount || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-12 text-right">
                      {employee.completedCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

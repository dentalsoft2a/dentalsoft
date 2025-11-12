import { useEffect, useState } from 'react';
import { Database, Archive, Trash2, RefreshCw, BarChart3, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface OptimizationLog {
  id: string;
  operation_type: string;
  table_name: string;
  rows_affected: number;
  size_before_bytes: number;
  size_after_bytes: number;
  execution_time_ms: number;
  status: string;
  error_message: string | null;
  executed_at: string;
}

interface TableMetrics {
  table_name: string;
  row_count: number;
  size: string;
  size_bytes: number;
}

export default function DatabaseOptimization() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<OptimizationLog[]>([]);
  const [tableMetrics, setTableMetrics] = useState<TableMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastMaintenance, setLastMaintenance] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOptimizationLogs(),
        loadTableMetrics(),
        loadLastMaintenance()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOptimizationLogs = async () => {
    const { data, error } = await supabase
      .from('database_optimization_log')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setLogs(data || []);
  };

  const loadTableMetrics = async () => {
    const { data, error } = await supabase.rpc('get_table_sizes', {});

    if (error) {
      const { data: fallbackData } = await supabase
        .from('database_optimization_log')
        .select('table_name, size_before_bytes')
        .order('executed_at', { ascending: false })
        .limit(30);

      if (fallbackData) {
        const uniqueTables = Array.from(new Set(fallbackData.map(d => d.table_name)))
          .map(tableName => {
            const latest = fallbackData.find(d => d.table_name === tableName);
            return {
              table_name: tableName,
              row_count: 0,
              size: formatBytes(latest?.size_before_bytes || 0),
              size_bytes: latest?.size_before_bytes || 0
            };
          });
        setTableMetrics(uniqueTables);
      }
    } else {
      setTableMetrics(data || []);
    }
  };

  const loadLastMaintenance = async () => {
    const { data, error } = await supabase
      .from('database_optimization_log')
      .select('executed_at')
      .in('operation_type', ['cleanup', 'vacuum'])
      .order('executed_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setLastMaintenance(data.executed_at);
    }
  };

  const runMaintenance = async (type: 'daily' | 'weekly') => {
    setRunning(true);
    try {
      const functionName = type === 'daily' ? 'run_daily_maintenance' : 'run_weekly_maintenance';

      const { data, error } = await supabase.rpc(functionName, {});

      if (error) throw error;

      alert(`Maintenance ${type === 'daily' ? 'quotidienne' : 'hebdomadaire'} exécutée avec succès:\n\n${data}`);
      await loadData();
    } catch (error: any) {
      console.error('Error running maintenance:', error);
      alert('Erreur lors de l\'exécution de la maintenance: ' + error.message);
    } finally {
      setRunning(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'cleanup': return <Trash2 className="w-4 h-4" />;
      case 'archive': return <Archive className="w-4 h-4" />;
      case 'vacuum': return <RefreshCw className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'partial': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default: return null;
    }
  };

  const totalSize = tableMetrics.reduce((sum, t) => sum + t.size_bytes, 0);
  const totalRows = tableMetrics.reduce((sum, t) => sum + t.row_count, 0);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Chargement des métriques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Optimisation de la Base de Données</h2>
          <p className="text-slate-600 mt-1">Monitoring et maintenance automatique</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700">Taille Totale</p>
              <p className="text-2xl font-bold text-blue-900">{formatBytes(totalSize)}</p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">{tableMetrics.length} tables</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700">Total Enregistrements</p>
              <p className="text-2xl font-bold text-green-900">{totalRows.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">Toutes tables confondues</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700">Dernière Maintenance</p>
              <p className="text-lg font-bold text-purple-900">
                {lastMaintenance
                  ? new Date(lastMaintenance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                  : 'Jamais'}
              </p>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2">
            {lastMaintenance
              ? new Date(lastMaintenance).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : 'Aucune maintenance'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Actions de Maintenance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => runMaintenance('daily')}
            disabled={running}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
            <div className="text-left">
              <p className="font-medium">Maintenance Quotidienne</p>
              <p className="text-xs text-blue-100">Nettoyage des données temporaires</p>
            </div>
          </button>

          <button
            onClick={() => runMaintenance('weekly')}
            disabled={running}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Archive className="w-5 h-5" />
            <div className="text-left">
              <p className="font-medium">Maintenance Hebdomadaire</p>
              <p className="text-xs text-purple-100">Archivage et optimisation</p>
            </div>
          </button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Automatisation:</strong> La maintenance quotidienne s'exécute automatiquement tous les jours à 2h du matin.
            La maintenance hebdomadaire s'exécute le dimanche à 3h du matin.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Historique des Optimisations</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Opération</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Table</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">Lignes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">Gain</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">Temps</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {new Date(log.executed_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getOperationIcon(log.operation_type)}
                      <span className="text-sm text-slate-900 capitalize">{log.operation_type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{log.table_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                    {log.rows_affected.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                    {log.size_before_bytes && log.size_after_bytes
                      ? formatBytes(log.size_before_bytes - log.size_after_bytes)
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                    {log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusIcon(log.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="p-12 text-center text-slate-600">
            <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p>Aucun log d'optimisation disponible</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Taille des Tables</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Table</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">Taille</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase">% du Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableMetrics.slice(0, 20).map((metric) => {
                const percentage = totalSize > 0 ? (metric.size_bytes / totalSize) * 100 : 0;
                return (
                  <tr key={metric.table_name} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{metric.table_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                      {metric.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                      {percentage.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

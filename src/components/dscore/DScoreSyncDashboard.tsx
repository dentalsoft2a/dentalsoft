import { useState, useEffect } from 'react';
import { Cloud, Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, Download, TrendingUp, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  files_retrieved: number;
  files_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string;
  created_at: string;
}

export default function DScoreSyncDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    totalFilesRetrieved: 0,
    totalFilesFailed: 0,
  });

  useEffect(() => {
    if (user) {
      loadSyncLogs();
    }
  }, [user]);

  const loadSyncLogs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dscore_sync_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSyncLogs(data || []);

      const totalSyncs = data?.length || 0;
      const successfulSyncs = data?.filter(log => log.status === 'success').length || 0;
      const totalFilesRetrieved = data?.reduce((sum, log) => sum + (log.files_retrieved || 0), 0) || 0;
      const totalFilesFailed = data?.reduce((sum, log) => sum + (log.files_failed || 0), 0) || 0;

      setStats({
        totalSyncs,
        successfulSyncs,
        totalFilesRetrieved,
        totalFilesFailed,
      });
    } catch (error) {
      console.error('Error loading sync logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return CheckCircle;
      case 'partial':
        return AlertCircle;
      case 'failed':
        return XCircle;
      default:
        return Activity;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Réussie';
      case 'partial':
        return 'Partielle';
      case 'failed':
        return 'Échouée';
      default:
        return status;
    }
  };

  const getSyncTypeLabel = (type: string) => {
    switch (type) {
      case 'manual':
        return 'Manuelle';
      case 'automatic':
        return 'Automatique';
      case 'scheduled':
        return 'Planifiée';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des synchronisations...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Synchronisations DS-Core</h2>
          <p className="text-slate-600 mt-1 text-sm md:text-base">Historique et statistiques des synchronisations</p>
        </div>
        <button
          onClick={loadSyncLogs}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-5 h-5" />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <TrendingUp className="w-6 h-6 text-white/60" />
          </div>
          <p className="text-white/90 text-sm mb-1">Total Synchronisations</p>
          <p className="text-3xl font-bold">{stats.totalSyncs}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <TrendingUp className="w-6 h-6 text-white/60" />
          </div>
          <p className="text-white/90 text-sm mb-1">Synchronisations Réussies</p>
          <p className="text-3xl font-bold">{stats.successfulSyncs}</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <TrendingUp className="w-6 h-6 text-white/60" />
          </div>
          <p className="text-white/90 text-sm mb-1">Photos Récupérées</p>
          <p className="text-3xl font-bold">{stats.totalFilesRetrieved}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <TrendingUp className="w-6 h-6 text-white/60" />
          </div>
          <p className="text-white/90 text-sm mb-1">Échecs</p>
          <p className="text-3xl font-bold">{stats.totalFilesFailed}</p>
        </div>
      </div>

      {syncLogs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Cloud className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune synchronisation</h3>
          <p className="text-slate-600">Les synchronisations DS-Core apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Historique des Synchronisations</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Récupérés
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Échoués
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {syncLogs.map((log) => {
                  const StatusIcon = getStatusIcon(log.status);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-900">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{getSyncTypeLabel(log.sync_type)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold ${getStatusColor(log.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {getStatusLabel(log.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-green-600">{log.files_retrieved}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-red-600">{log.files_failed}</span>
                      </td>
                      <td className="px-6 py-4">
                        {log.error_message ? (
                          <div className="text-xs text-red-600 max-w-xs truncate" title={log.error_message}>
                            {log.error_message}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Aucune erreur</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

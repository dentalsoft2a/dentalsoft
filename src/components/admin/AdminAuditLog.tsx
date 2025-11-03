import { useState, useEffect } from 'react';
import { Activity, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
  admin_profile: {
    email: string;
  };
}

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    loadLogs();
  }, [filterAction]);

  const loadLogs = async () => {
    setLoading(true);

    let query = supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterAction !== 'all') {
      query = query.eq('action', filterAction);
    }

    const { data: logsData, error } = await query;

    if (error) {
      console.error('Error loading audit log:', error);
      setLoading(false);
      return;
    }

    const logsWithProfiles = await Promise.all(
      (logsData || []).map(async (log) => {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', log.admin_id)
          .maybeSingle();

        return {
          ...log,
          admin_profile: { email: profile?.email || 'Unknown' }
        };
      })
    );

    setLogs(logsWithProfiles);
    setLoading(false);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'update_user_subscription': 'Mise à jour abonnement',
      'update_user_role': 'Modification rôle',
      'update_subscription_plan': 'Modification plan',
      'update_ticket_status': 'Statut ticket modifié'
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'update_user_subscription': 'bg-blue-100 text-blue-700',
      'update_user_role': 'bg-violet-100 text-violet-700',
      'update_subscription_plan': 'bg-emerald-100 text-emerald-700',
      'update_ticket_status': 'bg-orange-100 text-orange-700'
    };
    return colors[action] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-slate-900">Journal d'audit</h2>
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        >
          <option value="all">Toutes les actions</option>
          <option value="update_user_subscription">Abonnements</option>
          <option value="update_user_role">Rôles</option>
          <option value="update_subscription_plan">Plans</option>
          <option value="update_ticket_status">Tickets</option>
        </select>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                    {getActionLabel(log.action)}
                  </span>
                  <span className="text-sm text-slate-600">
                    par {log.admin_profile.email}
                  </span>
                </div>

                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 mt-2">
                    <p className="text-xs font-medium text-slate-700 mb-2">Détails:</p>
                    <div className="text-xs text-slate-600 space-y-1">
                      {Object.entries(log.details).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-medium">{key}:</span>
                          <span>{JSON.stringify(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right text-xs text-slate-500">
                {new Date(log.created_at).toLocaleString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Aucune entrée dans le journal d'audit
          </div>
        )}
      </div>
    </div>
  );
}

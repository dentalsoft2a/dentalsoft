import { useState, useEffect } from 'react';
import { Cloud, Link as LinkIcon, Unlink, CheckCircle, RefreshCw, Power } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { threeshapeApi } from '../../services/threeshapeApi';
import { supabase } from '../../lib/supabase';

export default function ThreeShapeConnection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    lastSync?: Date;
    autoSyncEnabled: boolean;
  }>({ connected: false, autoSyncEnabled: false });
  const [syncStats, setSyncStats] = useState<{
    totalSyncs: number;
    lastSyncFiles: number;
  }>({ totalSyncs: 0, lastSyncFiles: 0 });

  useEffect(() => {
    if (user) {
      loadConnectionStatus();
      loadSyncStats();
    }
  }, [user]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state && user) {
      handleOAuthCallback(code);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const loadConnectionStatus = async () => {
    if (!user) return;

    try {
      const status = await threeshapeApi.getConnectionStatus(user.id);
      setConnectionStatus(status);
    } catch (error) {
      console.error('Error loading connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('threeshape_sync_log')
        .select('files_retrieved')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSyncStats({
        totalSyncs: data?.length || 0,
        lastSyncFiles: data?.[0]?.files_retrieved || 0,
      });
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const handleConnect = async () => {
    if (!user) return;

    setConnecting(true);
    try {
      const authUrl = await threeshapeApi.getAuthorizationUrl(user.id);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to 3Shape Communicate:', error);
      alert('Erreur lors de la connexion à 3Shape Communicate');
      setConnecting(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    if (!user) return;

    setConnecting(true);
    try {
      const credentials = await threeshapeApi.exchangeCodeForTokens(code);
      await threeshapeApi.saveCredentials(user.id, credentials);

      await loadConnectionStatus();
      alert('Connexion à 3Shape Communicate réussie!');
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      alert('Erreur lors de la connexion à 3Shape Communicate');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter de 3Shape Communicate?')) return;

    setConnecting(true);
    try {
      await threeshapeApi.disconnect3Shape(user.id);
      await loadConnectionStatus();
      alert('Déconnexion réussie');
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Erreur lors de la déconnexion');
    } finally {
      setConnecting(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-3shape-photos`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id, manual: true }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();

      await loadConnectionStatus();
      await loadSyncStats();

      alert(`Synchronisation réussie!\n${result.filesRetrieved} photo(s) récupérée(s)`);
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (!user) return;

    try {
      const newValue = !connectionStatus.autoSyncEnabled;
      await threeshapeApi.toggleAutoSync(user.id, newValue);
      setConnectionStatus({ ...connectionStatus, autoSyncEnabled: newValue });
    } catch (error) {
      console.error('Error toggling auto-sync:', error);
      alert('Erreur lors de la modification de la synchronisation automatique');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border-2 border-green-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Connexion 3Shape Communicate</h2>
              <p className="text-sm text-white/90">Intégration avec 3Shape</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-slate-300'} animate-pulse`}></div>
              <div>
                <p className="font-semibold text-slate-900">
                  {connectionStatus.connected ? 'Connecté' : 'Non connecté'}
                </p>
                {connectionStatus.lastSync && (
                  <p className="text-sm text-slate-600">
                    Dernière sync: {connectionStatus.lastSync.toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            </div>

            {connectionStatus.connected ? (
              <div className="flex gap-2">
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Synchronisation...' : 'Synchroniser'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={connecting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  <Unlink className="w-4 h-4" />
                  Déconnecter
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LinkIcon className="w-5 h-5" />
                {connecting ? 'Connexion...' : 'Connecter à 3Shape Communicate'}
              </button>
            )}
          </div>

          {connectionStatus.connected && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Synchronisations</p>
                      <p className="text-2xl font-bold text-slate-900">{syncStats.totalSyncs}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl p-4 border-2 border-teal-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                      <Cloud className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Dernière sync</p>
                      <p className="text-2xl font-bold text-slate-900">{syncStats.lastSyncFiles}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border-2 border-emerald-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <Power className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Sync automatique</p>
                      <p className="text-lg font-bold text-slate-900">
                        {connectionStatus.autoSyncEnabled ? 'Activée' : 'Désactivée'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">Synchronisation automatique</p>
                    <p className="text-sm text-slate-600">
                      Récupérer automatiquement les nouvelles photos toutes les 15 minutes
                    </p>
                  </div>
                  <button
                    onClick={handleToggleAutoSync}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      connectionStatus.autoSyncEnabled ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                        connectionStatus.autoSyncEnabled ? 'translate-x-7' : ''
                      }`}
                    ></div>
                  </button>
                </div>
              </div>
            </>
          )}

          {!connectionStatus.connected && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-800">
                Connectez votre compte 3Shape Communicate pour récupérer automatiquement les scans et photos envoyés par vos dentistes partenaires.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Comment ça fonctionne?</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Les dentistes uploadent leurs scans et photos sur 3Shape Communicate</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Votre laboratoire récupère automatiquement ces fichiers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Les scans apparaissent dans votre page "Photos Reçues"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Tout est centralisé dans une seule interface</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

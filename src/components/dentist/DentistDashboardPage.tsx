import { useState, useEffect } from 'react';
import { Package, Users, Clock, CheckCircle, Camera, AlertCircle, TrendingUp, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalPhotos: number;
  connectedLabs: number;
  pendingQuotes: number;
}

export default function DentistDashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalPhotos: 0,
    connectedLabs: 0,
    pendingQuotes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [ordersResult, photosResult, labsResult, quotesResult] = await Promise.all([
        supabase
          .from('delivery_notes')
          .select('id, status, delivery_number, patient_name, created_at')
          .eq('dentist_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('photo_submissions')
          .select('id')
          .eq('dentist_id', user.id),
        supabase
          .from('dentist_favorite_laboratories')
          .select('laboratory_profile_id')
          .eq('dentist_id', user.id),
        supabase
          .from('quote_requests')
          .select('id')
          .eq('dentist_id', user.id)
          .eq('status', 'pending')
      ]);

      const orders = ordersResult.data || [];
      const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_progress');
      const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered');

      setStats({
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        completedOrders: completedOrders.length,
        totalPhotos: photosResult.data?.length || 0,
        connectedLabs: labsResult.data?.length || 0,
        pendingQuotes: quotesResult.data?.length || 0,
      });

      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminé';
      case 'delivered':
        return 'Livré';
      case 'refused':
        return 'Refusé';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Bienvenue sur votre espace dentiste</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <Package className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Commandes actives</p>
              <p className="text-3xl font-bold">{stats.activeOrders}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dentist-orders')}
            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium backdrop-blur-sm"
          >
            Voir les commandes
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Commandes complétées</p>
              <p className="text-3xl font-bold">{stats.completedOrders}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dentist-orders')}
            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium backdrop-blur-sm"
          >
            Voir l'historique
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <Camera className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Photos envoyées</p>
              <p className="text-3xl font-bold">{stats.totalPhotos}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dentist-photos')}
            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium backdrop-blur-sm"
          >
            Voir les photos
          </button>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Laboratoires</p>
              <p className="text-3xl font-bold">{stats.connectedLabs}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dentist-laboratories')}
            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium backdrop-blur-sm"
          >
            Gérer les laboratoires
          </button>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Devis en attente</p>
              <p className="text-3xl font-bold">{stats.pendingQuotes}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dentist-orders')}
            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium backdrop-blur-sm"
          >
            Voir les devis
          </button>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-green-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Total commandes</p>
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dentist-orders')}
            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium backdrop-blur-sm"
          >
            Statistiques
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Commandes récentes</h2>
          <p className="text-sm text-slate-600">Vos 5 dernières commandes</p>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium">Aucune commande pour le moment</p>
            <p className="text-slate-500 text-sm mt-2">Vos commandes apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 md:p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onNavigate('dentist-orders')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">BL {order.delivery_number}</h3>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Patient: {order.patient_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <button
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Voir détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-2">Envoyer des photos</h3>
              <p className="text-sm text-slate-600 mb-4">
                Envoyez des photos de vos cas cliniques aux laboratoires partenaires
              </p>
              <button
                onClick={() => onNavigate('dentist-photos')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Accéder aux photos
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-2">Trouver un laboratoire</h3>
              <p className="text-sm text-slate-600 mb-4">
                Connectez-vous avec de nouveaux laboratoires pour vos travaux
              </p>
              <button
                onClick={() => onNavigate('dentist-laboratories')}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Voir les laboratoires
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

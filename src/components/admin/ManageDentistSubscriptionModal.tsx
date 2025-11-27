import { useState } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DentistSubscriptionData {
  id: string;
  name: string;
  email: string;
  subscription_status: string;
  subscription_plan_id: string;
  subscription_end_date: string | null;
  trial_used: boolean;
  plan_name?: string;
  plan_price?: number;
}

interface ManageDentistSubscriptionModalProps {
  dentist: DentistSubscriptionData;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageDentistSubscriptionModal({
  dentist,
  onClose,
  onSuccess
}: ManageDentistSubscriptionModalProps) {
  const [action, setAction] = useState<'extend' | 'cancel' | 'reset' | null>(null);
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleExtend = async () => {
    if (!months || months < 1) {
      alert('Veuillez entrer un nombre de mois valide');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_extend_dentist_subscription', {
        p_dentist_id: dentist.id,
        p_months: months
      });

      if (error) throw error;

      if (data && data.success) {
        alert(data.message);
        onSuccess();
      } else {
        alert(data?.message || 'Erreur lors de la prolongation');
      }
    } catch (error: any) {
      console.error('Error extending subscription:', error);
      alert(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir résilier l'abonnement de ${dentist.name}? Cette action est immédiate.`)) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_cancel_dentist_subscription', {
        p_dentist_id: dentist.id
      });

      if (error) throw error;

      if (data && data.success) {
        alert(data.message);
        onSuccess();
      } else {
        alert(data?.message || 'Erreur lors de la résiliation');
      }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      alert(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTrial = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir réinitialiser l'essai gratuit de ${dentist.name}? Cela leur permettra de l'utiliser à nouveau.`)) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_reset_dentist_trial', {
        p_dentist_id: dentist.id
      });

      if (error) throw error;

      if (data && data.success) {
        alert(data.message);
        onSuccess();
      } else {
        alert(data?.message || 'Erreur lors de la réinitialisation');
      }
    } catch (error: any) {
      console.error('Error resetting trial:', error);
      alert(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Gérer l'Abonnement</h2>
        <p className="text-sm text-slate-600 mb-6">{dentist.name} ({dentist.email})</p>

        {!action ? (
          <div className="space-y-3">
            <button
              onClick={() => setAction('extend')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left flex items-center gap-3"
            >
              <Calendar className="w-5 h-5" />
              <div>
                <div className="font-semibold">Prolonger l'abonnement</div>
                <div className="text-sm text-blue-100">Ajouter des mois supplémentaires</div>
              </div>
            </button>

            <button
              onClick={() => setAction('reset')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left flex items-center gap-3"
            >
              <Clock className="w-5 h-5" />
              <div>
                <div className="font-semibold">Réinitialiser l'essai gratuit</div>
                <div className="text-sm text-green-100">Permettre un nouvel essai de 15 jours</div>
              </div>
            </button>

            <button
              onClick={() => setAction('cancel')}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-left flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5" />
              <div>
                <div className="font-semibold">Résilier l'abonnement</div>
                <div className="text-sm text-red-100">Annulation immédiate</div>
              </div>
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Fermer
            </button>
          </div>
        ) : action === 'extend' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nombre de mois à ajouter
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAction(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Retour
              </button>
              <button
                onClick={handleExtend}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'En cours...' : 'Prolonger'}
              </button>
            </div>
          </div>
        ) : action === 'cancel' ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Attention :</strong> Cette action va immédiatement résilier l'abonnement.
                Le dentiste perdra accès aux fonctionnalités premium.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAction(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'En cours...' : 'Résilier'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Cela va réinitialiser le statut d'essai gratuit et permettre au dentiste
                d'activer un nouvel essai de 15 jours.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAction(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleResetTrial}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'En cours...' : 'Réinitialiser'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

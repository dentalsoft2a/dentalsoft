import { useState, useEffect } from 'react';
import { Gift, Users, Check, X, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReferralReward {
  id: string;
  user_id: string;
  referral_id: string | null;
  reward_type: 'referrer_bonus' | 'referee_bonus';
  days_added: number;
  status: 'pending' | 'applied' | 'expired';
  created_at: string;
  applied_at: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    laboratory_name: string;
  };
  user_profiles: {
    email: string;
  };
}

interface ReferralStats {
  totalReferrals: number;
  pendingRewards: number;
  appliedRewards: number;
  totalDaysAwarded: number;
}

export function ReferralManagement() {
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    pendingRewards: 0,
    appliedRewards: 0,
    totalDaysAwarded: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'applied'>('all');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load referrals stats
      const { count: totalReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

      // Load rewards with user info
      let query = supabase
        .from('referral_rewards')
        .select(`
          *,
          user_profiles!inner(email)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: rewardsData, error: rewardsError } = await query;

      if (rewardsError) throw rewardsError;

      // Load profiles data for each reward
      if (rewardsData && rewardsData.length > 0) {
        const userIds = rewardsData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, laboratory_name')
          .in('id', userIds);

        // Merge profiles data into rewards
        const enrichedRewards = rewardsData.map(reward => ({
          ...reward,
          profiles: profilesData?.find(p => p.id === reward.user_id)
        }));

        setRewards(enrichedRewards);
      } else {
        setRewards([]);
      }

      // Calculate stats
      const pending = rewardsData?.filter(r => r.status === 'pending').length || 0;
      const applied = rewardsData?.filter(r => r.status === 'applied').length || 0;
      const totalDays = rewardsData?.filter(r => r.status === 'applied')
        .reduce((sum, r) => sum + r.days_added, 0) || 0;

      setStats({
        totalReferrals: totalReferrals || 0,
        pendingRewards: pending,
        appliedRewards: applied,
        totalDaysAwarded: totalDays
      });
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReward = async (reward: ReferralReward) => {
    const firstName = reward.profiles?.first_name || 'Utilisateur';
    const lastName = reward.profiles?.last_name || '';
    if (!confirm(`Appliquer la récompense de ${reward.days_added} jours pour ${firstName} ${lastName} ?`)) {
      return;
    }

    try {
      // Update user subscription
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('subscription_end_date, subscription_ends_at, subscription_status')
        .eq('id', reward.user_id)
        .single();

      let newEndDate: Date;
      // Use subscription_end_date as primary field (used in UI)
      if (userProfile?.subscription_end_date) {
        newEndDate = new Date(userProfile.subscription_end_date);
      } else if (userProfile?.subscription_ends_at) {
        newEndDate = new Date(userProfile.subscription_ends_at);
      } else {
        newEndDate = new Date();
      }
      newEndDate.setDate(newEndDate.getDate() + reward.days_added);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          subscription_end_date: newEndDate.toISOString(),
          subscription_ends_at: newEndDate.toISOString(),
          subscription_status: 'active'
        })
        .eq('id', reward.user_id);

      if (updateError) throw updateError;

      // Mark reward as applied
      const { error: rewardError } = await supabase
        .from('referral_rewards')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', reward.id);

      if (rewardError) throw rewardError;

      alert('Récompense appliquée avec succès');
      loadData();
    } catch (error) {
      console.error('Error applying reward:', error);
      alert('Erreur lors de l\'application de la récompense');
    }
  };

  const handleRejectReward = async (rewardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette récompense ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('referral_rewards')
        .update({ status: 'expired' })
        .eq('id', rewardId);

      if (error) throw error;

      alert('Récompense refusée');
      loadData();
    } catch (error) {
      console.error('Error rejecting reward:', error);
      alert('Erreur lors du refus de la récompense');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Gift className="w-8 h-8 text-purple-600" />
          Gestion des affiliations
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
          <Users className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold mb-1">{stats.totalReferrals}</div>
          <div className="text-sm opacity-90">Parrainages totaux</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
          <Calendar className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold mb-1">{stats.pendingRewards}</div>
          <div className="text-sm opacity-90">Récompenses en attente</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
          <Check className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold mb-1">{stats.appliedRewards}</div>
          <div className="text-sm opacity-90">Récompenses appliquées</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
          <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold mb-1">{stats.totalDaysAwarded}</div>
          <div className="text-sm opacity-90">Jours offerts au total</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Récompenses</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter('applied')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'applied'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Appliquées
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-slate-600 mt-4">Chargement...</p>
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Aucune récompense trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Utilisateur</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Jours</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Statut</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          {reward.profiles?.first_name || 'N/A'} {reward.profiles?.last_name || ''}
                        </div>
                        <div className="text-sm text-slate-500">{reward.profiles?.laboratory_name || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{reward.user_profiles.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        reward.reward_type === 'referrer_bonus'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {reward.reward_type === 'referrer_bonus' ? 'Parrain' : 'Filleul'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-purple-600">+{reward.days_added}j</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        reward.status === 'pending'
                          ? 'bg-orange-100 text-orange-700'
                          : reward.status === 'applied'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {reward.status === 'pending' && 'En attente'}
                        {reward.status === 'applied' && 'Appliquée'}
                        {reward.status === 'expired' && 'Expirée'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(reward.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {reward.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApplyReward(reward)}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            title="Appliquer la récompense"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectReward(reward.id)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Refuser la récompense"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {reward.status === 'applied' && reward.applied_at && (
                        <div className="text-sm text-green-600">
                          Appliquée le {new Date(reward.applied_at).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

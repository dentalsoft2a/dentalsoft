import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Ban, Check, Trash2, Mail, Users, Stethoscope, UserCog } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  subscription_status: string;
  subscription_plan: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
}

interface DentistAccount {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  created_at: string;
}

type UserType = 'laboratories' | 'dentists';

interface UsersManagementProps {
  onStatsUpdate: () => void;
}

export function UsersManagement({ onStatsUpdate }: UsersManagementProps) {
  const { impersonateUser } = useAuth();
  const [userType, setUserType] = useState<UserType>('laboratories');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dentists, setDentists] = useState<DentistAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [selectedUserForImpersonation, setSelectedUserForImpersonation] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    loadBothLists();
  }, []);

  useEffect(() => {
    if (userType === 'laboratories' && filterStatus !== 'all') {
      loadUsers();
    }
  }, [filterStatus]);

  const loadBothLists = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadDentists()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    let query = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('subscription_status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading users:', error);
    } else {
      // Filtrer pour exclure les dentistes (au cas où ils seraient dans user_profiles)
      const filteredData = (data || []).filter(user => {
        // Exclure les utilisateurs qui ont un compte dentiste
        return !dentists.some(dentist => dentist.id === user.id);
      });
      setUsers(filteredData);
    }
  };

  const loadDentists = async () => {
    const { data, error } = await supabase
      .from('dentist_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading dentists:', error);
    } else {
      setDentists(data || []);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ subscription_status: status, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      alert('Erreur lors de la mise à jour: ' + error.message);
      return;
    }

    await supabase.from('admin_audit_log').insert({
      admin_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'update_user_subscription',
      target_user_id: userId,
      details: { new_status: status }
    });

    await loadUsers();
    onStatsUpdate();
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'user' ? 'super_admin' : 'user';

    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      alert('Erreur lors de la mise à jour: ' + error.message);
      return;
    }

    await supabase.from('admin_audit_log').insert({
      admin_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'update_user_role',
      target_user_id: userId,
      details: { new_role: newRole }
    });

    await loadUsers();
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userEmail} ?\n\nCette action est irréversible et supprimera :\n- Le compte utilisateur\n- Toutes les données associées\n- Les proformas et factures\n- Tous les autres enregistrements`)) {
      return;
    }

    try {
      const currentUser = (await supabase.auth.getUser()).data.user;

      if (currentUser?.id === userId) {
        alert('Vous ne pouvez pas supprimer votre propre compte');
        return;
      }

      await supabase.from('admin_audit_log').insert({
        admin_id: currentUser?.id,
        action: 'delete_user',
        target_user_id: userId,
        details: { email: userEmail }
      });

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      alert('Utilisateur supprimé avec succès');
      await loadUsers();
      onStatsUpdate();
    } catch (error: any) {
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleImpersonateClick = (userId: string, userEmail: string) => {
    setSelectedUserForImpersonation({ id: userId, email: userEmail });
    setShowImpersonateModal(true);
  };

  const confirmImpersonate = async () => {
    if (!selectedUserForImpersonation) return;

    setImpersonating(selectedUserForImpersonation.id);
    setShowImpersonateModal(false);

    const { error } = await impersonateUser(selectedUserForImpersonation.id);

    if (error) {
      alert('Erreur lors de la connexion: ' + error.message);
      setImpersonating(null);
    }
  };

  const deleteDentist = async (dentistId: string, dentistName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le dentiste ${dentistName} ?\n\nCette action supprimera également toutes les soumissions de photos associées.`)) {
      return;
    }

    const { error } = await supabase
      .from('dentist_accounts')
      .delete()
      .eq('id', dentistId);

    if (error) {
      alert('Erreur lors de la suppression: ' + error.message);
      return;
    }

    const currentUser = (await supabase.auth.getUser()).data.user;
    await supabase.from('admin_audit_log').insert({
      admin_id: currentUser?.id,
      action: 'delete_dentist',
      details: { dentist_name: dentistName }
    });

    alert('Dentiste supprimé avec succès');
    await loadDentists();
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDentists = dentists.filter(dentist =>
    dentist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dentist.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'trial': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-orange-100 text-orange-700';
      case 'inactive': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'trial': return 'Essai';
      case 'cancelled': return 'Annulé';
      case 'inactive': return 'Inactif';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setUserType('laboratories')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            userType === 'laboratories'
              ? 'bg-white text-blue-600 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-5 h-5" />
          Laboratoires ({users.length})
        </button>
        <button
          onClick={() => setUserType('dentists')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            userType === 'dentists'
              ? 'bg-white text-emerald-600 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-5 h-5" />
          Dentistes ({dentists.length})
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={userType === 'laboratories' ? "Rechercher par email..." : "Rechercher par nom ou email..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        {userType === 'laboratories' && (
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              loadUsers();
            }}
            className="px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="trial">En essai</option>
            <option value="cancelled">Annulés</option>
            <option value="inactive">Inactifs</option>
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-slate-600">Chargement...</div>
        </div>
      ) : userType === 'laboratories' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Rôle</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Inscription</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleUserRole(user.id, user.role)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'super_admin'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.role === 'super_admin' ? 'Admin' : 'Utilisateur'}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user.subscription_status)}`}>
                      {getStatusLabel(user.subscription_status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleImpersonateClick(user.id, user.email)}
                        disabled={impersonating === user.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Se connecter comme cet utilisateur"
                      >
                        <UserCog className="w-4 h-4" />
                      </button>
                      {user.subscription_status !== 'active' && (
                        <button
                          onClick={() => updateUserStatus(user.id, 'active')}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Activer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {user.subscription_status === 'active' && (
                        <button
                          onClick={() => updateUserStatus(user.id, 'cancelled')}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Suspendre"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer l'utilisateur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              Aucun laboratoire trouvé
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Téléphone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Inscription</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDentists.map((dentist) => (
                <tr key={dentist.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {dentist.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{dentist.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{dentist.email}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{dentist.phone || '-'}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {new Date(dentist.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteDentist(dentist.id, dentist.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer le dentiste"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDentists.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              Aucun dentiste trouvé
            </div>
          )}
        </div>
      )}

      {showImpersonateModal && selectedUserForImpersonation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <UserCog className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Connexion en tant qu'utilisateur</h3>
                <p className="text-sm text-slate-600">Mode impersonnement</p>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-bold text-lg">!</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-2">Avertissement Important</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Vous allez vous connecter au compte de <strong>{selectedUserForImpersonation.email}</strong></li>
                    <li>• Toutes vos actions seront auditées et enregistrées</li>
                    <li>• La session expirera automatiquement après 2 heures</li>
                    <li>• Une bannière sera visible en permanence pendant la session</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImpersonateModal(false);
                  setSelectedUserForImpersonation(null);
                }}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmImpersonate}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-amber-500/30"
              >
                Confirmer la connexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

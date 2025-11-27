import { useEffect, useState } from 'react';
import { Search, Mail, Phone, MapPin, Star, StarOff, Building2, Package, TrendingUp, Plus, X, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import PaginationControls from '../common/PaginationControls';

interface Laboratory {
  id: string;
  laboratory_name: string;
  laboratory_email: string;
  laboratory_phone: string;
  laboratory_address: string;
  isFavorite?: boolean;
  totalOrders?: number;
  activeOrders?: number;
}

interface Invitation {
  id: string;
  laboratory_email: string;
  laboratory_name: string;
  laboratory_phone: string | null;
  laboratory_address: string | null;
  invitation_code: string;
  status: 'pending' | 'accepted' | 'expired' | 'rejected';
  sent_at: string;
  expires_at: string;
  accepted_at: string | null;
  message: string | null;
}

export default function DentistLaboratoriesPage() {
  const { user } = useAuth();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    laboratory_name: '',
    laboratory_email: '',
    laboratory_phone: '',
    laboratory_address: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (user) {
      loadLaboratories();
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('laboratory_invitations')
        .select('*')
        .eq('dentist_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const loadLaboratories = async () => {
    if (!user) return;

    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, laboratory_name, laboratory_email, laboratory_phone, laboratory_address')
        .not('laboratory_name', 'is', null)
        .order('laboratory_name');

      if (profilesError) throw profilesError;

      // Filtrer les laboratoires qui ont un nom valide et au moins un email
      const validLabs = (profilesData || []).filter(lab =>
        lab.laboratory_name &&
        lab.laboratory_name.trim().length > 0 &&
        lab.laboratory_email &&
        lab.laboratory_email.trim().length > 0
      );

      const { data: favoritesData } = await supabase
        .from('dentist_favorite_laboratories')
        .select('laboratory_profile_id')
        .eq('dentist_id', user.id);

      const favoriteIds = new Set(favoritesData?.map(f => f.laboratory_profile_id) || []);

      const labsWithStats = await Promise.all(
        validLabs.map(async (lab) => {
          const { data: ordersData } = await supabase
            .from('delivery_notes')
            .select('id, status')
            .eq('dentist_id', user.id)
            .eq('user_id', lab.id);

          const orders = ordersData || [];
          const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_progress');

          return {
            ...lab,
            isFavorite: favoriteIds.has(lab.id),
            totalOrders: orders.length,
            activeOrders: activeOrders.length,
          };
        })
      );

      labsWithStats.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });

      setLaboratories(labsWithStats);
    } catch (error) {
      console.error('Error loading laboratories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (labId: string) => {
    if (!user) return;

    try {
      const lab = laboratories.find(l => l.id === labId);
      if (!lab) return;

      if (lab.isFavorite) {
        const { error } = await supabase
          .from('dentist_favorite_laboratories')
          .delete()
          .eq('dentist_id', user.id)
          .eq('laboratory_profile_id', labId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dentist_favorite_laboratories')
          .insert({
            dentist_id: user.id,
            laboratory_profile_id: labId,
          });

        if (error) throw error;
      }

      await loadLaboratories();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Erreur lors de la mise à jour des favoris');
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSubmitting(true);

    try {
      // Validation
      if (!inviteForm.laboratory_name || !inviteForm.laboratory_email) {
        throw new Error('Le nom et l\'email du laboratoire sont requis');
      }

      // Vérifier si l'email est valide
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteForm.laboratory_email)) {
        throw new Error('Email invalide');
      }

      // Vérifier si le laboratoire est déjà inscrit
      const { data: existingLab } = await supabase
        .from('profiles')
        .select('id')
        .eq('laboratory_email', inviteForm.laboratory_email)
        .maybeSingle();

      if (existingLab) {
        throw new Error('Ce laboratoire est déjà inscrit sur la plateforme');
      }

      // Vérifier s'il y a déjà une invitation en attente
      const { data: existingInvitation } = await supabase
        .from('laboratory_invitations')
        .select('id, status, expires_at')
        .eq('dentist_user_id', user.id)
        .eq('laboratory_email', inviteForm.laboratory_email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingInvitation) {
        throw new Error('Une invitation est déjà en attente pour ce laboratoire');
      }

      // Générer le code d'invitation
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invitation_code');

      if (codeError) throw codeError;

      const invitationCode = codeData;

      // Calculer la date d'expiration (30 jours)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Créer l'invitation
      const { error: insertError } = await supabase
        .from('laboratory_invitations')
        .insert({
          dentist_user_id: user.id,
          laboratory_email: inviteForm.laboratory_email,
          laboratory_name: inviteForm.laboratory_name,
          laboratory_phone: inviteForm.laboratory_phone || null,
          laboratory_address: inviteForm.laboratory_address || null,
          invitation_code: invitationCode,
          message: inviteForm.message || null,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) throw insertError;

      // TODO: Envoyer l'email d'invitation via Edge Function
      // await supabase.functions.invoke('send-laboratory-invitation', {
      //   body: { invitation_code: invitationCode }
      // });

      // Réinitialiser le formulaire
      setInviteForm({
        laboratory_name: '',
        laboratory_email: '',
        laboratory_phone: '',
        laboratory_address: '',
        message: ''
      });

      setShowInviteModal(false);
      await loadInvitations();

      alert('Invitation envoyée avec succès !');
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      setError(err.message || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!user) return;

    try {
      // Générer un nouveau code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invitation_code');

      if (codeError) throw codeError;

      // Nouvelle date d'expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Mettre à jour l'invitation
      const { error } = await supabase
        .from('laboratory_invitations')
        .update({
          invitation_code: codeData,
          sent_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .eq('id', invitationId);

      if (error) throw error;

      // TODO: Renvoyer l'email
      // await supabase.functions.invoke('send-laboratory-invitation', {
      //   body: { invitation_code: codeData }
      // });

      await loadInvitations();
      alert('Invitation renvoyée avec succès !');
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Erreur lors du renvoi de l\'invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!user) return;
    if (!confirm('Êtes-vous sûr de vouloir annuler cette invitation ?')) return;

    try {
      const { error } = await supabase
        .from('laboratory_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) throw error;

      await loadInvitations();
      alert('Invitation annulée');
    } catch (error) {
      console.error('Error canceling invitation:', error);
      alert('Erreur lors de l\'annulation de l\'invitation');
    }
  };

  const filteredLaboratories = laboratories.filter((lab) =>
    lab.laboratory_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    lab.laboratory_email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const pagination = usePagination(filteredLaboratories, { initialPageSize: 12 });
  const paginatedLaboratories = pagination.paginatedItems;

  const getInvitationStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, label: 'En attente', className: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'accepted':
        return { icon: CheckCircle, label: 'Acceptée', className: 'bg-green-100 text-green-700 border-green-200' };
      case 'expired':
        return { icon: XCircle, label: 'Expirée', className: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'rejected':
        return { icon: XCircle, label: 'Annulée', className: 'bg-red-100 text-red-700 border-red-200' };
      default:
        return { icon: AlertCircle, label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div>
      <div className="mb-6 md:mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Laboratoires</h1>
            <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Gérez vos laboratoires partenaires</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>Inviter un laboratoire</span>
          </button>
        </div>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un laboratoire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-12 pr-4 md:pr-5 py-2.5 md:py-3.5 border border-slate-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all duration-200 hover:border-slate-400 bg-white shadow-sm placeholder:text-slate-400 text-sm md:text-base"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-600 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="animate-pulse">Chargement...</div>
        </div>
      ) : filteredLaboratories.length === 0 ? (
        <div className="p-12 text-center bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-sm border border-slate-200">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {searchTerm ? 'Aucun laboratoire trouvé' : 'Aucun laboratoire disponible'}
          </p>
          {!searchTerm && (
            <p className="text-slate-500 text-sm mt-2">
              Les laboratoires partenaires apparaîtront ici
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedLaboratories.map((lab) => (
              <div
                key={lab.id}
                className="bg-white rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {lab.laboratory_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors">
                              {lab.laboratory_name}
                            </h3>
                            {lab.isFavorite && (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="text-xs font-bold text-amber-700">Favori</span>
                              </div>
                            )}
                          </div>
                          {lab.activeOrders !== undefined && lab.activeOrders > 0 ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
                              <span className="text-xs font-medium text-emerald-600">
                                {lab.activeOrders} commande{lab.activeOrders > 1 ? 's' : ''} active{lab.activeOrders > 1 ? 's' : ''}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                              <span className="text-xs font-medium text-slate-500">
                                Aucune commande active
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {lab.laboratory_email && (
                      <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-blue-600 transition-colors">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-blue-50 transition-colors">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="truncate">{lab.laboratory_email}</span>
                      </div>
                    )}

                    {lab.laboratory_phone && (
                      <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-blue-600 transition-colors">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-blue-50 transition-colors">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span>{lab.laboratory_phone}</span>
                      </div>
                    )}

                    {lab.laboratory_address && (
                      <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-blue-600 transition-colors">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-blue-50 transition-colors">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="line-clamp-2">{lab.laboratory_address}</span>
                      </div>
                    )}
                  </div>

                  {lab.totalOrders !== undefined && lab.totalOrders > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Package className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">
                            {lab.totalOrders} commande{lab.totalOrders === 1 ? '' : 's'}
                          </span>
                        </div>
                        {lab.activeOrders !== undefined && lab.activeOrders > 0 && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium">
                              {lab.activeOrders} en cours
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => toggleFavorite(lab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md font-medium ${
                        lab.isFavorite
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      }`}
                    >
                      {lab.isFavorite ? (
                        <>
                          <StarOff className="w-4 h-4" />
                          <span>Retirer des favoris</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4" />
                          <span>Ajouter aux favoris</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLaboratories.length > 0 && (
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              onNextPage={pagination.nextPage}
              onPrevPage={pagination.prevPage}
              onGoToPage={pagination.goToPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[12, 24, 48]}
            />
          )}
        </>
      )}

      {/* Section des invitations */}
      {invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Invitations envoyées</h2>
          <div className="space-y-3">
            {invitations.map((invitation) => {
              const statusBadge = getInvitationStatusBadge(invitation.status);
              const StatusIcon = statusBadge.icon;
              const isExpired = new Date(invitation.expires_at) < new Date();

              return (
                <div
                  key={invitation.id}
                  className="bg-white rounded-xl shadow-md border border-slate-200 p-4 md:p-6 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {invitation.laboratory_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900">{invitation.laboratory_name}</h3>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${statusBadge.className}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{invitation.laboratory_email}</p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 mt-2 space-y-1">
                        <p>Envoyée le {new Date(invitation.sent_at).toLocaleDateString('fr-FR')}</p>
                        {invitation.status === 'pending' && (
                          <p className={isExpired ? 'text-red-600 font-medium' : ''}>
                            Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        {invitation.accepted_at && (
                          <p className="text-green-600 font-medium">
                            Acceptée le {new Date(invitation.accepted_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>

                    {invitation.status === 'pending' && !isExpired && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                        >
                          Annuler
                        </button>
                      </div>
                    )}

                    {(invitation.status === 'expired' || (invitation.status === 'pending' && isExpired)) && (
                      <button
                        onClick={() => handleResendInvitation(invitation.id)}
                        className="px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium flex items-center gap-1"
                      >
                        <Send className="w-4 h-4" />
                        Renvoyer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Inviter un nouveau laboratoire</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <form onSubmit={handleSendInvitation} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Nom du laboratoire <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.laboratory_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, laboratory_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all"
                  placeholder="Ex: Laboratoire Dentaire XYZ"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.laboratory_email}
                  onChange={(e) => setInviteForm({ ...inviteForm, laboratory_email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all"
                  placeholder="contact@laboratoire.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={inviteForm.laboratory_phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, laboratory_phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all"
                    placeholder="01 23 45 67 89"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={inviteForm.laboratory_address}
                    onChange={(e) => setInviteForm({ ...inviteForm, laboratory_address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all"
                    placeholder="Adresse complète"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Message personnalisé
                </label>
                <textarea
                  rows={4}
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all resize-none"
                  placeholder="Ajoutez un message personnel au laboratoire..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  Une invitation sera envoyée par email au laboratoire avec un lien pour s'inscrire sur la plateforme. L'invitation sera valide pendant 30 jours.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer l'invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

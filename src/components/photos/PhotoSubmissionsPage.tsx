import { useEffect, useState } from 'react';
import { Camera, User, Calendar, Clock, Eye, CheckCircle, XCircle, AlertCircle, Search, Filter, Download, Info, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PhotoSubmission {
  id: string;
  dentist_id: string;
  laboratory_id: string;
  patient_name: string;
  photo_url: string;
  notes: string | null;
  status: string;
  created_at: string;
  dentist_accounts?: {
    name: string;
    email: string;
    phone: string | null;
  };
}

export default function PhotoSubmissionsPage() {
  const { laboratoryId } = useAuth();
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSubmission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'dentist' | 'patient'>('dentist');

  useEffect(() => {
    loadSubmissions();
  }, [laboratoryId]);

  const loadSubmissions = async () => {
    if (!laboratoryId) return;

    try {
      const { data, error } = await supabase
        .from('photo_submissions')
        .select(`
          *,
          dentist_accounts (
            name,
            email,
            phone
          )
        `)
        .eq('laboratory_id', laboratoryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('photo_submissions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      loadSubmissions();
      if (selectedPhoto?.id === id) {
        setSelectedPhoto({ ...selectedPhoto, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('photo_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSelectedPhoto(null);
      loadSubmissions();
      alert('Photo supprimée avec succès');
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Erreur lors de la suppression de la photo');
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch =
      sub.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.dentist_accounts?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedSubmissions = filteredSubmissions.reduce((acc, sub) => {
    const key = groupBy === 'dentist'
      ? sub.dentist_accounts?.name || 'Inconnu'
      : sub.patient_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(sub);
    return acc;
  }, {} as Record<string, PhotoSubmission[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'viewed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return AlertCircle;
      case 'viewed': return Eye;
      case 'completed': return CheckCircle;
      case 'rejected': return XCircle;
      default: return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'viewed': return 'Vue';
      case 'completed': return 'Terminé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Photos Reçues</h1>
            <p className="text-slate-600">Photos envoyées par les dentistes</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Conservation des photos</p>
            <p>Les photos sont automatiquement supprimées après 1 mois pour optimiser le stockage. Pensez à télécharger ou sauvegarder les images importantes.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par dentiste ou patient..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="viewed">Vue</option>
            <option value="completed">Terminé</option>
            <option value="rejected">Rejeté</option>
          </select>

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'dentist' | 'patient')}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="dentist">Grouper par dentiste</option>
            <option value="patient">Grouper par patient</option>
          </select>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune photo reçue</h3>
          <p className="text-slate-600">Les photos envoyées par les dentistes apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSubmissions).map(([group, items]) => (
            <div key={group} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">{group}</h2>
                <p className="text-sm text-slate-600">{items.length} photo{items.length > 1 ? 's' : ''}</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((submission) => {
                    const StatusIcon = getStatusIcon(submission.status);
                    return (
                      <div
                        key={submission.id}
                        className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group"
                      >
                        <div
                          className="aspect-square relative bg-slate-200 cursor-pointer"
                          onClick={() => setSelectedPhoto(submission)}
                        >
                          <img
                            src={submission.photo_url}
                            alt={`Photo - ${submission.patient_name}`}
                            className="w-full h-full object-cover"
                          />
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 ${getStatusColor(submission.status)}`}>
                            <StatusIcon className="w-3 h-3" />
                            {getStatusLabel(submission.status)}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSubmission(submission.id);
                            }}
                            className="absolute top-2 left-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Supprimer la photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-900 text-sm truncate">
                              {submission.patient_name}
                            </span>
                          </div>

                          {groupBy === 'patient' && (
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-xs text-slate-600 truncate">
                                Dr. {submission.dentist_accounts?.name}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(submission.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPhoto(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Détails de la photo</h2>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <XCircle className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <img
                  src={selectedPhoto.photo_url}
                  alt={`Photo - ${selectedPhoto.patient_name}`}
                  className="w-full rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Informations patient</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-900">{selectedPhoto.patient_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        {new Date(selectedPhoto.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Dentiste</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-900">Dr. {selectedPhoto.dentist_accounts?.name}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {selectedPhoto.dentist_accounts?.email}
                    </div>
                    {selectedPhoto.dentist_accounts?.phone && (
                      <div className="text-sm text-slate-600">
                        {selectedPhoto.dentist_accounts.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedPhoto.notes && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
                  <p className="text-slate-700">{selectedPhoto.notes}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Statut</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selectedPhoto.id, 'pending')}
                    className={`px-4 py-2 rounded-lg border font-medium transition ${
                      selectedPhoto.status === 'pending'
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    En attente
                  </button>
                  <button
                    onClick={() => updateStatus(selectedPhoto.id, 'viewed')}
                    className={`px-4 py-2 rounded-lg border font-medium transition ${
                      selectedPhoto.status === 'viewed'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Vue
                  </button>
                  <button
                    onClick={() => updateStatus(selectedPhoto.id, 'completed')}
                    className={`px-4 py-2 rounded-lg border font-medium transition ${
                      selectedPhoto.status === 'completed'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Terminé
                  </button>
                  <button
                    onClick={() => updateStatus(selectedPhoto.id, 'rejected')}
                    className={`px-4 py-2 rounded-lg border font-medium transition ${
                      selectedPhoto.status === 'rejected'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Rejeté
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={selectedPhoto.photo_url}
                  download
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
                >
                  <Download className="w-5 h-5" />
                  Télécharger
                </a>
                <button
                  onClick={() => deleteSubmission(selectedPhoto.id)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
                >
                  <Trash2 className="w-5 h-5" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

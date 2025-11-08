import { useEffect, useState } from 'react';
import { Camera, User, Calendar, Clock, Eye, CheckCircle, XCircle, AlertCircle, Search, Filter, Download, Info, Trash2, Plus, Upload, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';

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

interface DentistAccount {
  id: string;
  name: string;
  email: string;
}

export default function PhotoSubmissionsPage() {
  const { laboratoryId } = useAuth();
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSubmission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'dentist' | 'patient'>('dentist');
  const [showAddModal, setShowAddModal] = useState(false);

  useLockScroll(!!selectedPhoto || showAddModal);
  const [dentists, setDentists] = useState<DentistAccount[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dentistSearchTerm, setDentistSearchTerm] = useState('');
  const [showDentistDropdown, setShowDentistDropdown] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);

  useEffect(() => {
    loadSubmissions();
    loadDentists();
  }, [laboratoryId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dentist-dropdown-container')) {
        setShowDentistDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDentists = async () => {
    try {
      const { data, error } = await supabase
        .from('dentist_accounts')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      setDentists(data || []);
    } catch (error) {
      console.error('Error loading dentists:', error);
    }
  };

  const loadSubmissions = async () => {
    if (!laboratoryId) return;

    setLoading(true);
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

  const handleAddSubmission = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!laboratoryId || !selectedDentistId || !patientName || !photoFile) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setUploading(true);

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${laboratoryId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dentist-photos')
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dentist-photos')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('photo_submissions')
        .insert({
          dentist_id: selectedDentistId,
          laboratory_id: laboratoryId,
          patient_name: patientName,
          photo_url: publicUrl,
          notes: notes || null,
          status: 'pending'
        });

      if (insertError) throw insertError;

      alert('Photo ajoutée avec succès');
      setShowAddModal(false);
      setSelectedDentistId('');
      setDentistSearchTerm('');
      setPatientName('');
      setNotes('');
      setPhotoFile(null);
      loadSubmissions();
    } catch (error) {
      console.error('Error adding submission:', error);
      alert('Erreur lors de l\'ajout de la photo');
    } finally {
      setUploading(false);
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

  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-amber-500',
    'from-red-500 to-rose-500',
    'from-indigo-500 to-purple-500',
    'from-teal-500 to-green-500',
    'from-pink-500 to-rose-500',
  ];

  const borderColors = [
    'border-blue-200',
    'border-purple-200',
    'border-green-200',
    'border-orange-200',
    'border-red-200',
    'border-indigo-200',
    'border-teal-200',
    'border-pink-200',
  ];

  const getGroupColor = (index: number) => {
    return {
      gradient: gradients[index % gradients.length],
      border: borderColors[index % borderColors.length],
    };
  };

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
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-8">
        <div className="flex flex-col gap-3 md:gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg md:rounded-xl">
                <Camera className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-900">Photos Reçues</h1>
                <p className="text-xs md:text-sm text-slate-600 hidden sm:block">Photos envoyées par les dentistes</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={loadSubmissions}
              disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base whitespace-nowrap"
              title="Actualiser la liste"
            >
              <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition text-sm md:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Ajouter
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 flex items-start gap-2 md:gap-3 mb-4 md:mb-6">
          <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-blue-800">
            <p className="font-medium mb-1">Conservation des photos</p>
            <p>Les photos sont automatiquement supprimées après 1 mois pour optimiser le stockage. Pensez à télécharger ou sauvegarder les images importantes.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par dentiste ou patient..."
              className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 md:px-4 py-2 text-sm md:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-3 md:px-4 py-2 text-sm md:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="dentist">Grouper par dentiste</option>
              <option value="patient">Grouper par patient</option>
            </select>
          </div>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-8 md:py-12 bg-white rounded-xl md:rounded-2xl border border-slate-200">
          <Camera className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">Aucune photo reçue</h3>
          <p className="text-sm md:text-base text-slate-600 px-4">Les photos envoyées par les dentistes apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {Object.entries(groupedSubmissions).map(([group, items], index) => {
            const colors = getGroupColor(index);
            return (
            <div key={group} className={`bg-white rounded-xl md:rounded-2xl shadow-lg border-2 ${colors.border} overflow-hidden hover:shadow-xl transition-shadow`}>
              <div className={`bg-gradient-to-r ${colors.gradient} px-4 md:px-6 py-3 md:py-4 border-b border-white/30`}>
                <h2 className="text-base md:text-lg font-bold text-white drop-shadow-sm">{group}</h2>
                <p className="text-xs md:text-sm text-white/90">{items.length} photo{items.length > 1 ? 's' : ''}</p>
              </div>

              <div className="p-3 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
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
                          <div className={`absolute top-1.5 md:top-2 right-1.5 md:right-2 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg border text-[10px] md:text-xs font-semibold flex items-center gap-0.5 md:gap-1 ${getStatusColor(submission.status)}`}>
                            <StatusIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span className="hidden sm:inline">{getStatusLabel(submission.status)}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSubmission(submission.id);
                            }}
                            className="absolute top-1.5 md:top-2 left-1.5 md:left-2 p-1.5 md:p-2 bg-red-500 text-white rounded-md md:rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 active:scale-95"
                            title="Supprimer la photo"
                          >
                            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </button>
                        </div>

                        <div className="p-3 md:p-4">
                          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                            <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 flex-shrink-0" />
                            <span className="font-medium text-slate-900 text-xs md:text-sm truncate">
                              {submission.patient_name}
                            </span>
                          </div>

                          {groupBy === 'patient' && (
                            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                              <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-[10px] md:text-xs text-slate-600 truncate">
                                Dr. {submission.dentist_accounts?.name}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-slate-500">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {new Date(submission.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/90 via-blue-900/30 to-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedPhoto(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white drop-shadow-lg">Détails de la photo</h2>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm"
              >
                <XCircle className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 bg-gradient-to-br from-slate-50 to-cyan-50 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="mb-6 flex justify-center">
                <div className="relative group w-1/2 cursor-pointer" onClick={() => setFullscreenImage(true)}>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                  <img
                    src={selectedPhoto.photo_url}
                    alt={`Photo - ${selectedPhoto.patient_name}`}
                    className="w-full rounded-2xl shadow-2xl relative z-10 border-4 border-white hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Informations patient</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-lg p-3">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-900">{selectedPhoto.patient_name}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-lg p-3">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-700">
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

                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-5 border-2 border-cyan-200 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Dentiste</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-lg p-3">
                      <User className="w-4 h-4 text-cyan-600" />
                      <span className="font-semibold text-slate-900">Dr. {selectedPhoto.dentist_accounts?.name}</span>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
                      <div className="text-sm text-slate-700">
                        {selectedPhoto.dentist_accounts?.email}
                      </div>
                      {selectedPhoto.dentist_accounts?.phone && (
                        <div className="text-sm text-slate-600 mt-1">
                          {selectedPhoto.dentist_accounts.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedPhoto.notes && (
                <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Notes</h3>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-slate-700">{selectedPhoto.notes}</p>
                  </div>
                </div>
              )}

              <div className="mb-6 bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center shadow-md">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Modifier le statut</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => updateStatus(selectedPhoto.id, 'pending')}
                    className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all duration-300 hover:scale-105 ${
                      selectedPhoto.status === 'pending'
                        ? 'bg-gradient-to-br from-yellow-500 to-amber-500 text-white border-yellow-400 shadow-lg shadow-yellow-500/50'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-yellow-50 hover:border-yellow-300'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs">En attente</div>
                  </button>
                  <button
                    onClick={() => updateStatus(selectedPhoto.id, 'viewed')}
                    className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all duration-300 hover:scale-105 ${
                      selectedPhoto.status === 'viewed'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-blue-400 shadow-lg shadow-blue-500/50'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <Eye className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs">Vue</div>
                  </button>
                  <button
                    onClick={() => updateStatus(selectedPhoto.id, 'completed')}
                    className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all duration-300 hover:scale-105 ${
                      selectedPhoto.status === 'completed'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/50'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-green-50 hover:border-green-300'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs">Terminé</div>
                  </button>
                  <button
                    onClick={() => updateStatus(selectedPhoto.id, 'rejected')}
                    className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all duration-300 hover:scale-105 ${
                      selectedPhoto.status === 'rejected'
                        ? 'bg-gradient-to-br from-red-500 to-rose-500 text-white border-red-400 shadow-lg shadow-red-500/50'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-red-50 hover:border-red-300'
                    }`}
                  >
                    <XCircle className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs">Rejeté</div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={selectedPhoto.photo_url}
                  download
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white rounded-2xl font-bold hover:from-blue-700 hover:via-cyan-700 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-blue-500/50 hover:shadow-xl hover:scale-[1.02]"
                >
                  <Download className="w-5 h-5" />
                  Télécharger
                </a>
                <button
                  onClick={() => deleteSubmission(selectedPhoto.id)}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-bold hover:from-red-700 hover:to-rose-700 transition-all duration-300 shadow-lg shadow-red-500/50 hover:shadow-xl hover:scale-[1.02]"
                >
                  <Trash2 className="w-5 h-5" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[60]"
          onClick={() => setFullscreenImage(false)}
        >
          <button
            onClick={() => setFullscreenImage(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all duration-300 z-10"
          >
            <XCircle className="w-8 h-8 text-white" />
          </button>
          <img
            src={selectedPhoto.photo_url}
            alt={`Photo - ${selectedPhoto.patient_name}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Ajouter une photo</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <XCircle className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleAddSubmission} className="p-6">
              <div className="space-y-6">
                <div className="relative dentist-dropdown-container">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Dentiste *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={dentistSearchTerm}
                      onChange={(e) => {
                        setDentistSearchTerm(e.target.value);
                        setShowDentistDropdown(true);
                      }}
                      onFocus={() => setShowDentistDropdown(true)}
                      placeholder="Rechercher un dentiste..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  {showDentistDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {dentists
                        .filter((dentist) => {
                          const search = dentistSearchTerm.toLowerCase();
                          return (
                            dentist.name.toLowerCase().includes(search) ||
                            dentist.email.toLowerCase().includes(search)
                          );
                        })
                        .map((dentist) => (
                          <button
                            key={dentist.id}
                            type="button"
                            onClick={() => {
                              setSelectedDentistId(dentist.id);
                              setDentistSearchTerm(`Dr. ${dentist.name}`);
                              setShowDentistDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition ${
                              selectedDentistId === dentist.id ? 'bg-purple-50' : ''
                            }`}
                          >
                            <div className="font-medium text-slate-900">Dr. {dentist.name}</div>
                            <div className="text-sm text-slate-600">{dentist.email}</div>
                          </button>
                        ))}
                      {dentists.filter((dentist) => {
                        const search = dentistSearchTerm.toLowerCase();
                        return (
                          dentist.name.toLowerCase().includes(search) ||
                          dentist.email.toLowerCase().includes(search)
                        );
                      }).length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                          Aucun dentiste trouvé
                        </div>
                      )}
                    </div>
                  )}
                  {selectedDentistId && !showDentistDropdown && (
                    <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                      Dentiste sélectionné: {dentistSearchTerm}
                    </div>
                  )}
                  <input
                    type="hidden"
                    value={selectedDentistId}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nom du patient *
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Jean Dupont"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Photo *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                    {photoFile && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        Fichier sélectionné: {photoFile.name}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="Ajoutez des notes ou commentaires..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                  disabled={uploading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Ajouter la photo
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

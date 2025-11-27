import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';

interface PhotoSubmission {
  id: string;
  patient_name: string;
  photo_url: string;
  notes: string | null;
  status: 'pending' | 'viewed' | 'processed' | 'rejected';
  created_at: string;
  laboratory_name: string;
  laboratory_response: string | null;
}

export default function DentistPhotoHistory() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSubmission | null>(null);

  useLockScroll(!!selectedPhoto);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    if (!user) return;

    try {
      console.log('Current user ID:', user.id);

      const { data: dentistAccount, error: dentistError } = await supabase
        .from('dentist_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (dentistError) {
        console.error('Error fetching dentist account:', dentistError);
      }

      console.log('Dentist account:', dentistAccount);

      const { data, error } = await supabase
        .from('photo_submissions')
        .select(`
          id,
          patient_name,
          photo_url,
          notes,
          status,
          created_at,
          laboratory_response,
          laboratory_id,
          dentist_id
        `)
        .eq('dentist_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Photo submissions query result:', { data, error });

      if (error) {
        console.error('Error fetching submissions:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const laboratoryIds = [...new Set(data.map(item => item.laboratory_id))];

      const { data: labData, error: labError } = await supabase
        .from('profiles')
        .select('id, laboratory_name')
        .in('id', laboratoryIds);

      if (labError) {
        console.error('Error fetching laboratories:', labError);
      }

      const labMap = new Map(labData?.map(lab => [lab.id, lab.laboratory_name]) || []);

      const formatted = data.map((item: any) => ({
        ...item,
        laboratory_name: labMap.get(item.laboratory_id) || 'Laboratoire inconnu'
      }));

      setSubmissions(formatted);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            En attente
          </span>
        );
      case 'viewed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <Eye className="w-4 h-4" />
            Vue
          </span>
        );
      case 'processed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Traitée
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Rejetée
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubmissions();
    setRefreshing(false);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Historique des photos</h2>
            <p className="text-sm text-slate-600">Toutes vos photos envoyées</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">Aucune photo envoyée pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition cursor-pointer"
                  onClick={() => setSelectedPhoto(submission)}
                >
                  <div className="flex gap-4">
                    <img
                      src={submission.photo_url}
                      alt={submission.patient_name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {submission.patient_name}
                          </h3>
                          <p className="text-sm text-slate-600">{submission.laboratory_name}</p>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>
                      <p className="text-sm text-slate-500">{formatDate(submission.created_at)}</p>
                      {submission.notes && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{submission.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60]" onClick={() => setSelectedPhoto(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900">Détails de la photo</h2>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.patient_name}
                className="w-full rounded-xl"
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
                  <p className="text-lg font-semibold text-slate-900">{selectedPhoto.patient_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Laboratoire</label>
                  <p className="text-slate-900">{selectedPhoto.laboratory_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                  <div>{getStatusBadge(selectedPhoto.status)}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date d'envoi</label>
                  <p className="text-slate-900">{formatDate(selectedPhoto.created_at)}</p>
                </div>

                {selectedPhoto.notes && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vos notes</label>
                    <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{selectedPhoto.notes}</p>
                  </div>
                )}

                {selectedPhoto.laboratory_response && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Réponse du laboratoire</label>
                    <p className="text-slate-900 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      {selectedPhoto.laboratory_response}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, Eye, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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

interface DentistPhotoHistoryProps {
  onClose?: () => void;
}

const ITEMS_PER_PAGE = 12;

export default function DentistPhotoHistory({ onClose }: DentistPhotoHistoryProps = {}) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSubmission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [patientsList, setPatientsList] = useState<string[]>([]);

  useLockScroll(!!selectedPhoto || !!onClose);

  useEffect(() => {
    loadPatientsList();
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [currentPage, selectedPatient]);

  const loadPatientsList = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('photo_submissions')
        .select('patient_name')
        .eq('dentist_id', user.id);

      if (data) {
        const uniquePatients = [...new Set(data.map(item => item.patient_name))].sort();
        setPatientsList(uniquePatients);
      }
    } catch (error) {
      console.error('Error loading patients list:', error);
    }
  };

  const loadSubmissions = async () => {
    if (!user) return;

    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let countQuery = supabase
        .from('photo_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('dentist_id', user.id);

      if (selectedPatient) {
        countQuery = countQuery.eq('patient_name', selectedPatient);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      let dataQuery = supabase
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
        .eq('dentist_id', user.id);

      if (selectedPatient) {
        dataQuery = dataQuery.eq('patient_name', selectedPatient);
      }

      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(from, to);

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
    await loadPatientsList();
    await loadSubmissions();
    setRefreshing(false);
  };

  const handlePatientChange = (patient: string) => {
    setSelectedPatient(patient);
    setCurrentPage(1);
    setLoading(true);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setLoading(true);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setLoading(true);
    }
  };

  const historyContent = (
    <div className={`bg-white ${onClose ? '' : 'rounded-xl shadow-lg border border-slate-200'} h-full flex flex-col overflow-hidden`}>
      {/* Header - Mobile optimized */}
      <div className={`${onClose ? 'px-4 py-3' : 'px-6 py-4'} border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex-shrink-0`}>
        {onClose ? (
          // Mobile header
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Historique</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 active:scale-95"
                  title="Actualiser"
                >
                  <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-200 rounded-lg transition active:scale-95"
                  title="Fermer"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-slate-300">
                <Filter className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <select
                  value={selectedPatient}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="flex-1 text-sm text-slate-700 bg-transparent border-none outline-none"
                >
                  <option value="">Tous les patients</option>
                  {patientsList.map((patient) => (
                    <option key={patient} value={patient}>
                      {patient}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedPatient && (
              <p className="text-xs text-slate-600 px-1">
                Photos de {selectedPatient}
              </p>
            )}
          </div>
        ) : (
          // Desktop header (unchanged)
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Historique des photos</h2>
              <p className="text-sm text-slate-600">
                {selectedPatient ? `Photos de ${selectedPatient}` : 'Toutes vos photos envoyées'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-300">
                <Filter className="w-4 h-4 text-slate-600" />
                <select
                  value={selectedPatient}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="text-sm text-slate-700 bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value="">Tous les patients</option>
                  {patientsList.map((patient) => (
                    <option key={patient} value={patient}>
                      {patient}
                    </option>
                  ))}
                </select>
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
          </div>
        )}
      </div>

        <div className={`${onClose ? 'p-3' : 'p-6'} flex-1 overflow-y-auto`}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">
                {selectedPatient
                  ? `Aucune photo trouvée pour ${selectedPatient}`
                  : 'Aucune photo envoyée pour le moment'}
              </p>
              {selectedPatient && (
                <button
                  onClick={() => handlePatientChange('')}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium active:scale-95 transition"
                >
                  Afficher tous les patients
                </button>
              )}
            </div>
          ) : (
            <div className={onClose ? 'space-y-3' : 'space-y-4'}>
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`bg-white rounded-xl border border-slate-200 hover:border-blue-300 active:scale-[0.98] transition cursor-pointer shadow-sm hover:shadow-md ${
                    onClose ? 'p-3' : 'bg-slate-50 p-4'
                  }`}
                  onClick={() => setSelectedPhoto(submission)}
                >
                  <div className={`flex ${onClose ? 'gap-3' : 'gap-4'}`}>
                    <img
                      src={submission.photo_url}
                      alt={submission.patient_name}
                      className={`${onClose ? 'w-20 h-20' : 'w-24 h-24'} object-cover rounded-lg flex-shrink-0`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-start justify-between ${onClose ? 'mb-1' : 'mb-2'}`}>
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className={`font-semibold text-slate-900 ${onClose ? 'text-base' : 'text-lg'} truncate`}>
                            {submission.patient_name}
                          </h3>
                          <p className="text-xs text-slate-600 truncate">{submission.laboratory_name}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(submission.status)}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(submission.created_at)}</p>
                      {submission.notes && (
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{submission.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && totalCount > 0 && (
            <div className={`${onClose ? 'mt-4 pt-4' : 'mt-6 pt-6'} border-t border-slate-200`}>
              {onClose ? (
                // Mobile pagination - compact
                <div className="space-y-3">
                  <div className="text-xs text-slate-600 text-center">
                    {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="p-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage === 1) {
                          pageNumber = i + 1;
                        } else if (currentPage === totalPages) {
                          pageNumber = totalPages - 2 + i;
                        } else {
                          pageNumber = currentPage - 1 + i;
                        }

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => {
                              setCurrentPage(pageNumber);
                              setLoading(true);
                            }}
                            className={`w-9 h-9 rounded-lg transition active:scale-95 ${
                              currentPage === pageNumber
                                ? 'bg-blue-500 text-white font-semibold'
                                : 'bg-white border border-slate-300 text-slate-700'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="p-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                // Desktop pagination (unchanged)
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-slate-600">
                    Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount} photo{totalCount > 1 ? 's' : ''}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Précédent</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => {
                              setCurrentPage(pageNumber);
                              setLoading(true);
                            }}
                            className={`w-10 h-10 rounded-lg transition ${
                              currentPage === pageNumber
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      <span>Suivant</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );

  return (
    <>
      {onClose ? (
        <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
          {historyContent}
        </div>
      ) : (
        historyContent
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-0 md:p-4" onClick={() => setSelectedPhoto(null)}>
          <div
            className="bg-white md:rounded-2xl shadow-2xl max-w-4xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between md:rounded-t-2xl flex-shrink-0 z-10">
              <h2 className="text-lg md:text-xl font-bold text-slate-900">Détails</h2>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition active:scale-95"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto">
              <div className="relative">
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.patient_name}
                  className="w-full rounded-xl"
                />
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="bg-slate-50 rounded-xl p-3 md:p-4">
                  <label className="block text-xs md:text-sm font-medium text-slate-600 mb-1">Patient</label>
                  <p className="text-base md:text-lg font-semibold text-slate-900">{selectedPhoto.patient_name}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 md:p-4">
                  <label className="block text-xs md:text-sm font-medium text-slate-600 mb-1">Laboratoire</label>
                  <p className="text-sm md:text-base text-slate-900">{selectedPhoto.laboratory_name}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 md:p-4">
                  <label className="block text-xs md:text-sm font-medium text-slate-600 mb-2">Statut</label>
                  <div>{getStatusBadge(selectedPhoto.status)}</div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 md:p-4">
                  <label className="block text-xs md:text-sm font-medium text-slate-600 mb-1">Date d'envoi</label>
                  <p className="text-sm md:text-base text-slate-900">{formatDate(selectedPhoto.created_at)}</p>
                </div>

                {selectedPhoto.notes && (
                  <div className="bg-amber-50 rounded-xl p-3 md:p-4 border border-amber-200">
                    <label className="block text-xs md:text-sm font-medium text-amber-900 mb-1.5">Vos notes</label>
                    <p className="text-sm md:text-base text-slate-900">{selectedPhoto.notes}</p>
                  </div>
                )}

                {selectedPhoto.laboratory_response && (
                  <div className="bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-200">
                    <label className="block text-xs md:text-sm font-medium text-blue-900 mb-1.5">Réponse du laboratoire</label>
                    <p className="text-sm md:text-base text-slate-900">
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

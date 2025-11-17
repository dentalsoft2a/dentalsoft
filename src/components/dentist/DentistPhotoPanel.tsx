import { useState, useRef, useEffect } from 'react';
import { Camera, X, Send, CheckCircle, LogOut, History, ClipboardList, Package, Trash2, Images } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import DentistPhotoHistory from './DentistPhotoHistory';
import DentistDeliveryRequestModal from './DentistDeliveryRequestModal';
import DentistDeliveryHistory from './DentistDeliveryHistory';
import LaboratorySelector from './LaboratorySelector';

interface CapturedPhoto {
  id: string;
  imageData: string;
  timestamp: number;
}

const MAX_PHOTOS = 3;
const MIN_PHOTOS = 1;

export default function DentistPhotoPanel() {
  const { user, signOut } = useAuth();
  const [dentistId, setDentistId] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLab, setSelectedLab] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeliveryRequest, setShowDeliveryRequest] = useState(false);
  const [showDeliveryHistory, setShowDeliveryHistory] = useState(false);

  useLockScroll(showModal || showHistory || showDeliveryRequest || showDeliveryHistory);

  useEffect(() => {
    loadDentistId();
    startCamera();
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const loadDentistId = async () => {
    try {
      if (!user) {
        console.log('No user available');
        return;
      }

      console.log('Loading dentist ID for user:', user.id, user.email);

      const { data, error } = await supabase
        .from('dentist_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error querying dentist_accounts:', error);
        throw error;
      }

      if (data) {
        console.log('Dentist ID loaded:', data.id);
        setDentistId(data.id);
      } else {
        console.log('No dentist account found for user ID:', user.id);
      }
    } catch (error) {
      console.error('Error loading dentist ID:', error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Impossible d\'accéder à la caméra. Veuillez autoriser l\'accès.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (capturedPhotos.length >= MAX_PHOTOS) {
      alert(`Vous ne pouvez prendre que ${MAX_PHOTOS} photos maximum par envoi.`);
      return;
    }

    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);

        const newPhoto: CapturedPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          imageData,
          timestamp: Date.now()
        };

        setCapturedPhotos(prev => [...prev, newPhoto]);
      }
    }
  };

  const removePhoto = (photoId: string) => {
    setCapturedPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const openSendModal = () => {
    if (capturedPhotos.length < MIN_PHOTOS) {
      alert(`Vous devez prendre au moins ${MIN_PHOTOS} photo avant d'envoyer.`);
      return;
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (capturedPhotos.length === 0 || !selectedLab || !patientName || !user) return;

    if (capturedPhotos.length < MIN_PHOTOS) {
      alert(`Vous devez envoyer au moins ${MIN_PHOTOS} photo.`);
      return;
    }

    if (capturedPhotos.length > MAX_PHOTOS) {
      alert(`Vous ne pouvez envoyer que ${MAX_PHOTOS} photos maximum.`);
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const submissionGroupId = crypto.randomUUID();
      const totalPhotos = capturedPhotos.length;

      for (let i = 0; i < capturedPhotos.length; i++) {
        const photo = capturedPhotos[i];
        const photoSequence = i + 1;

        const blob = await fetch(photo.imageData).then(r => r.blob());
        const fileName = `${user.id}/${submissionGroupId}_${photoSequence}_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('dentist-photos')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('dentist-photos')
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('photo_submissions')
          .insert({
            dentist_id: user.id,
            laboratory_id: selectedLab,
            patient_name: patientName,
            photo_url: publicUrl,
            notes: notes || null,
            status: 'pending',
            submission_group_id: submissionGroupId,
            photo_sequence: photoSequence
          });

        if (insertError) throw insertError;

        setUploadProgress(Math.round(((i + 1) / totalPhotos) * 100));
      }

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setCapturedPhotos([]);
        setSelectedLab('');
        setPatientName('');
        setNotes('');
        setSuccess(false);
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Error submitting photos:', error);
      alert('Erreur lors de l\'envoi des photos');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLab('');
    setPatientName('');
    setNotes('');
    setSuccess(false);
    setUploadProgress(0);
  };

  const clearAllPhotos = () => {
    if (confirm('Voulez-vous supprimer toutes les photos capturées ?')) {
      setCapturedPhotos([]);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const canCaptureMore = capturedPhotos.length < MAX_PHOTOS;
  const canSend = capturedPhotos.length >= MIN_PHOTOS;

  return (
    <div className="fixed inset-0 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h1 className="text-xl font-bold">Envoi de Photo</h1>
            <p className="text-sm text-white/80">
              {capturedPhotos.length === 0
                ? 'Prenez 1 à 3 photos pour le laboratoire'
                : `${capturedPhotos.length}/${MAX_PHOTOS} photo${capturedPhotos.length > 1 ? 's' : ''} capturée${capturedPhotos.length > 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                console.log('Button clicked, dentistId:', dentistId);
                setShowDeliveryRequest(true);
              }}
              className="p-3 bg-white/30 hover:bg-white/40 rounded-lg backdrop-blur-sm transition-all shadow-lg"
              title="Nouvelle demande"
            >
              <ClipboardList className="w-6 h-6 text-white drop-shadow-lg" />
            </button>
            <button
              onClick={() => setShowDeliveryHistory(true)}
              className="p-3 bg-white/30 hover:bg-white/40 rounded-lg backdrop-blur-sm transition-all shadow-lg"
              title="Mes commandes"
            >
              <Package className="w-6 h-6 text-white drop-shadow-lg" />
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="p-3 bg-white/30 hover:bg-white/40 rounded-lg backdrop-blur-sm transition-all shadow-lg"
              title="Historique des photos"
            >
              <History className="w-6 h-6 text-white drop-shadow-lg" />
            </button>
            <button
              onClick={handleLogout}
              className="p-3 bg-white/30 hover:bg-white/40 rounded-lg backdrop-blur-sm transition-all shadow-lg"
              title="Se déconnecter"
            >
              <LogOut className="w-6 h-6 text-white drop-shadow-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Camera View */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Photo Counter Badge */}
      {capturedPhotos.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white/20 backdrop-blur-md rounded-full px-6 py-3 border-2 border-white/40 shadow-2xl">
            <div className="flex items-center gap-3">
              <Images className="w-6 h-6 text-white" />
              <span className="text-white font-bold text-xl">{capturedPhotos.length} / {MAX_PHOTOS}</span>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Gallery - Right Side Minimaliste */}
      {capturedPhotos.length > 0 && (
        <div className="absolute bottom-8 right-8 z-10">
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-2 border border-white/20 shadow-2xl">
            <div className="flex flex-col gap-2">
              {capturedPhotos.map((photo, index) => (
                <div key={photo.id} className="relative group">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-white/40 shadow-lg">
                    <img
                      src={photo.imageData}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute top-1 left-1 bg-white/90 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-900">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Supprimer"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {capturedPhotos.length > 0 && (
                <button
                  onClick={clearAllPhotos}
                  className="mt-1 px-2 py-1.5 bg-red-500/80 hover:bg-red-600 text-white text-xs rounded-lg transition-all backdrop-blur-sm"
                  title="Tout supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="relative flex items-center justify-center">
          {/* Send Button - Minimaliste à gauche */}
          {capturedPhotos.length > 0 && (
            <button
              onClick={openSendModal}
              disabled={!canSend}
              className={`absolute left-4 p-4 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                canSend
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white hover:scale-110 active:scale-95'
                  : 'bg-white/30 text-white/50 cursor-not-allowed'
              }`}
              title={canSend ? 'Envoyer les photos' : `Prenez au moins ${MIN_PHOTOS} photo`}
            >
              <Send className="w-6 h-6" />
            </button>
          )}

          {/* Capture Button - Centre (Principal) */}
          <button
            onClick={capturePhoto}
            disabled={!canCaptureMore}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all border-4 ${
              canCaptureMore
                ? 'bg-white hover:scale-110 active:scale-95 border-white/30'
                : 'bg-white/30 border-white/10 cursor-not-allowed'
            }`}
            title={canCaptureMore ? 'Prendre une photo' : 'Limite de 3 photos atteinte'}
          >
            <Camera className={`w-10 h-10 ${canCaptureMore ? 'text-slate-900' : 'text-white/50'}`} />
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Envoyer les photos</h2>
                <p className="text-sm text-slate-600">{capturedPhotos.length} photo{capturedPhotos.length > 1 ? 's' : ''} à envoyer</p>
              </div>
              <button
                onClick={closeModal}
                disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {success ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Photos envoyées !</h3>
                <p className="text-slate-600">
                  Le laboratoire a bien reçu vos {capturedPhotos.length} photo{capturedPhotos.length > 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="p-6">
                {/* Photo Preview Grid */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Aperçu des photos</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {capturedPhotos.map((photo, index) => (
                      <div key={photo.id} className="relative">
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                          <img
                            src={photo.imageData}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {dentistId && (
                    <LaboratorySelector
                      value={selectedLab}
                      onChange={setSelectedLab}
                      dentistId={dentistId}
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom et prénom du patient *
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="Jean Dupont"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (optionnel)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      rows={3}
                      placeholder="Informations complémentaires..."
                      disabled={loading}
                    />
                  </div>

                  {loading && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Envoi en cours...</span>
                        <span className="font-semibold text-blue-600">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    <Send className="w-5 h-5" />
                    {loading ? 'Envoi en cours...' : `Envoyer ${capturedPhotos.length} photo${capturedPhotos.length > 1 ? 's' : ''} au laboratoire`}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {showHistory && <DentistPhotoHistory onClose={() => setShowHistory(false)} />}
      {showDeliveryHistory && <DentistDeliveryHistory onClose={() => setShowDeliveryHistory(false)} />}
      {showDeliveryRequest && (
        dentistId ? (
          <DentistDeliveryRequestModal
            onClose={() => setShowDeliveryRequest(false)}
            dentistId={dentistId}
          />
        ) : (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Compte dentiste non trouvé</h3>
              <p className="text-slate-600 mb-6">
                Impossible de charger votre compte dentiste. Veuillez vous reconnecter.
              </p>
              <button
                onClick={() => setShowDeliveryRequest(false)}
                className="w-full py-3 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Send, CheckCircle, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import DentistPhotoHistory from './DentistPhotoHistory';
import LaboratorySelector from './LaboratorySelector';
import DentistNavigation from './DentistNavigation';
import DentistDeliveryTracking from './DentistDeliveryTracking';
import DentistQuoteRequest from './DentistQuoteRequest';
import DentistOrderForm from './DentistOrderForm';

interface Laboratory {
  laboratory_id: string;
  laboratory_name: string;
  allow_orders: boolean;
  allow_quotes: boolean;
  portal_message: string | null;
}

export default function DentistPortal() {
  const { user, signOut } = useAuth();
  const [dentistId, setDentistId] = useState<string | null>(null);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [activeTab, setActiveTab] = useState('photos');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLab, setSelectedLab] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useLockScroll(showModal);

  useEffect(() => {
    if (user) {
      loadDentistData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'photos' && !stream) {
      startCamera();
    }
    return () => {
      if (activeTab !== 'photos' && stream) {
        stopCamera();
      }
    };
  }, [activeTab]);

  const loadDentistData = async () => {
    if (!user) return;

    try {
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentist_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (dentistError) throw dentistError;
      if (dentistData) {
        setDentistId(dentistData.id);
        await loadLaboratories(dentistData.id);
        await loadUnreadNotifications(dentistData.id);
      }
    } catch (error) {
      console.error('Error loading dentist data:', error);
    }
  };

  const loadLaboratories = async (dentistAccountId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_dentist_laboratories', { p_dentist_account_id: dentistAccountId });

      if (error) throw error;
      setLaboratories(data || []);
    } catch (error) {
      console.error('Error loading laboratories:', error);
    }
  };

  const loadUnreadNotifications = async (dentistAccountId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('count_unread_notifications', { p_dentist_account_id: dentistAccountId });

      if (error) throw error;
      setUnreadNotifications(data || 0);
    } catch (error) {
      console.error('Error loading notifications count:', error);
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
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        setShowModal(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImage || !selectedLab || !patientName || !user) return;

    setLoading(true);
    try {
      const blob = await fetch(capturedImage).then(r => r.blob());
      const fileName = `${user.id}/${Date.now()}.jpg`;

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
          status: 'pending'
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setCapturedImage(null);
        setSelectedLab('');
        setPatientName('');
        setNotes('');
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting photo:', error);
      alert('Erreur lors de l\'envoi de la photo');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCapturedImage(null);
    setSelectedLab('');
    setPatientName('');
    setNotes('');
    setSuccess(false);
  };

  const handleLogout = async () => {
    stopCamera();
    await signOut();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'photos':
        return (
          <div className="fixed inset-0 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-8">
              <div className="flex items-center justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 border-4 border-white/30"
                >
                  <Camera className="w-10 h-10 text-slate-900" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'quotes':
        return <DentistQuoteRequest laboratories={laboratories} />;
      case 'orders':
        return <DentistOrderForm laboratories={laboratories} />;
      case 'history':
        return <DentistDeliveryTracking />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Portail Dentiste</h1>
              <p className="text-sm text-slate-600 mt-1">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <DentistNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        laboratories={laboratories}
        unreadNotifications={unreadNotifications}
      />

      {/* Portal Message */}
      {laboratories.length > 0 && laboratories.some(lab => lab.portal_message) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {laboratories.map((lab) =>
            lab.portal_message ? (
              <div
                key={lab.laboratory_id}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"
              >
                <p className="text-sm text-blue-900">
                  <strong>{lab.laboratory_name}:</strong> {lab.portal_message}
                </p>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Content */}
      <div className={activeTab === 'photos' ? '' : 'bg-slate-50'}>
        {renderContent()}
      </div>

      {/* Photo Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900">Envoyer la photo</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {success ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Photo envoyée !</h3>
                <p className="text-slate-600">Le laboratoire a bien reçu votre photo</p>
              </div>
            ) : (
              <>
                <div className="p-6">
                  {capturedImage && (
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full rounded-xl mb-6"
                    />
                  )}

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
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                    >
                      <Send className="w-5 h-5" />
                      {loading ? 'Envoi en cours...' : 'Envoyer au laboratoire'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

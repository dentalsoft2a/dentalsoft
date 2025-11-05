import { useState, useRef, useEffect } from 'react';
import { Camera, X, Send, CheckCircle, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Laboratory {
  id: string;
  laboratory_name: string;
}

export default function DentistPhotoPanel() {
  const { user, signOut } = useAuth();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLab, setSelectedLab] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    loadLaboratories();
    startCamera();
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const loadLaboratories = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, laboratory_name')
        .not('laboratory_name', 'is', null)
        .order('laboratory_name');

      if (error) throw error;
      setLaboratories(data || []);
    } catch (error) {
      console.error('Error loading laboratories:', error);
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
    await signOut();
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h1 className="text-xl font-bold">Envoi de Photo</h1>
            <p className="text-sm text-white/80">Prenez une photo pour le laboratoire</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition"
          >
            <LogOut className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Capture Button */}
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

      {/* Modal */}
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
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Laboratoire *
                      </label>
                      <select
                        value={selectedLab}
                        onChange={(e) => setSelectedLab(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        required
                      >
                        <option value="">Sélectionner un laboratoire</option>
                        {laboratories.map((lab) => (
                          <option key={lab.id} value={lab.id}>
                            {lab.laboratory_name}
                          </option>
                        ))}
                      </select>
                    </div>

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

import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import DentistPhotoPanel from './DentistPhotoPanel';
import DentistPhotoHistory from './DentistPhotoHistory';
import { useState } from 'react';
import { Camera, Upload, History, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function DentistPhotosPage() {
  const { isMobile } = useDeviceDetection();
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedLab, setSelectedLab] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<any[]>([]);

  if (isMobile) {
    return <DentistPhotoPanel />;
  }

  const loadLaboratories = async () => {
    if (!user) return;

    try {
      const { data: favoritesData } = await supabase
        .from('dentist_favorite_laboratories')
        .select('laboratory_id')
        .eq('dentist_id', user.id);

      const favoriteIds = favoritesData?.map(f => f.laboratory_id) || [];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, laboratory_name, laboratory_email')
        .in('id', favoriteIds);

      setLaboratories(profilesData || []);
    } catch (error) {
      console.error('Error loading laboratories:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 3) {
      alert('Vous ne pouvez sélectionner que 3 photos maximum');
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedFiles.length === 0 || !selectedLab || !patientName) return;

    setLoading(true);

    try {
      const submissionGroupId = crypto.randomUUID();

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const photoSequence = i + 1;
        const fileName = `${user.id}/${submissionGroupId}_${photoSequence}_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('dentist-photos')
          .upload(fileName, file);

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
      }

      alert('Photos envoyées avec succès !');
      setShowUploadModal(false);
      setSelectedFiles([]);
      setSelectedLab('');
      setPatientName('');
      setNotes('');
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Erreur lors de l\'envoi des photos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 md:mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Photos</h1>
            <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Envoyez des photos à vos laboratoires</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 hover:scale-105 active:scale-95 font-medium"
            >
              <History className="w-5 h-5" />
              <span>Historique</span>
            </button>
            <button
              onClick={() => {
                setShowUploadModal(true);
                loadLaboratories();
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 hover:scale-105 active:scale-95 font-medium"
            >
              <Upload className="w-5 h-5" />
              <span>Envoyer des photos</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 mb-2">Mode Bureau</h3>
              <p className="text-slate-600">
                Sur ordinateur, utilisez le bouton "Envoyer des photos" pour sélectionner des images depuis votre ordinateur.
              </p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-2">Fonctionnalités :</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Envoyez jusqu'à 3 photos par soumission</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Sélectionnez le laboratoire destinataire</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Ajoutez des notes pour le laboratoire</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <History className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 mb-2">Historique</h3>
              <p className="text-slate-600">
                Consultez toutes vos photos envoyées et leur statut de traitement par les laboratoires.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            Voir l'historique complet
          </button>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Camera className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Astuce pour mobile</p>
            <p>Sur votre smartphone, vous aurez accès à la caméra pour prendre des photos directement depuis l'application.</p>
          </div>
        </div>
      </div>

      {showHistory && <DentistPhotoHistory onClose={() => setShowHistory(false)} />}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Envoyer des photos</h2>
                <p className="text-sm text-slate-600">Sélectionnez jusqu'à 3 photos</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sélectionner des photos *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {selectedFiles.length}/3 photo{selectedFiles.length > 1 ? 's' : ''} sélectionnée{selectedFiles.length > 1 ? 's' : ''}
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Laboratoire destinataire *
                </label>
                <select
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  <option value="">Sélectionnez un laboratoire</option>
                  {laboratories.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.laboratory_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom du patient *
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Jean Dupont"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Informations complémentaires..."
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || selectedFiles.length === 0 || !selectedLab || !patientName}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Envoyer {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

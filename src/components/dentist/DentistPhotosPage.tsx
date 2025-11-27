import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import DentistPhotoPanel from './DentistPhotoPanel';
import DentistPhotoHistory from './DentistPhotoHistory';
import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function DentistPhotosPage() {
  const { isMobile } = useDeviceDetection();
  const { user } = useAuth();
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
      // Load all linked laboratories via dentists table
      const { data: linkedDentists } = await supabase
        .from('dentists')
        .select('id, user_id')
        .eq('linked_dentist_account_id', user.id);

      if (!linkedDentists || linkedDentists.length === 0) {
        setLaboratories([]);
        return;
      }

      const linkedLabIds = [...new Set(linkedDentists.map(d => d.user_id))];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, laboratory_name, laboratory_email')
        .in('id', linkedLabIds);

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

      setShowUploadModal(false);
      setSelectedFiles([]);
      setSelectedLab('');
      setPatientName('');
      setNotes('');
      alert('Photos envoyées avec succès !');
      window.location.reload();
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
            <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Historique de vos photos envoyées</p>
          </div>
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

      <DentistPhotoHistory />

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

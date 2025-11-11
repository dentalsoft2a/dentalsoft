import { useState, useEffect } from 'react';
import { Users, Link as LinkIcon, CheckCircle, AlertCircle, Search, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface DScoreMapping {
  id: string;
  dscore_dentist_id: string;
  dscore_dentist_name: string;
  dscore_dentist_email: string;
  local_dentist_id: string | null;
  auto_created: boolean;
}

interface LocalDentist {
  id: string;
  name: string;
  email: string;
}

export default function DScoreDentistMapping() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<DScoreMapping[]>([]);
  const [localDentists, setLocalDentists] = useState<LocalDentist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [selectedDentistId, setSelectedDentistId] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadMappings();
      loadLocalDentists();
    }
  }, [user]);

  const loadMappings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dscore_dentist_mapping')
        .select('*')
        .eq('user_id', user.id)
        .order('dscore_dentist_name');

      if (error) throw error;
      setMappings(data || []);
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalDentists = async () => {
    try {
      const { data, error } = await supabase
        .from('dentist_accounts')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      setLocalDentists(data || []);
    } catch (error) {
      console.error('Error loading local dentists:', error);
    }
  };

  const handleSaveMapping = async (mappingId: string) => {
    if (!selectedDentistId) {
      alert('Veuillez sélectionner un dentiste');
      return;
    }

    try {
      const { error } = await supabase
        .from('dscore_dentist_mapping')
        .update({ local_dentist_id: selectedDentistId })
        .eq('id', mappingId);

      if (error) throw error;

      await loadMappings();
      setEditingMapping(null);
      setSelectedDentistId('');
      alert('Mapping mis à jour avec succès');
    } catch (error) {
      console.error('Error updating mapping:', error);
      alert('Erreur lors de la mise à jour du mapping');
    }
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
    setSelectedDentistId('');
  };

  const filteredMappings = mappings.filter(
    (mapping) =>
      mapping.dscore_dentist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.dscore_dentist_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unmappedCount = mappings.filter((m) => !m.local_dentist_id).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des mappings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">Mapping Dentistes DS-Core</h2>
        <p className="text-slate-600 mt-1 text-sm md:text-base">Associez les dentistes DS-Core à vos comptes locaux</p>
      </div>

      {unmappedCount > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-900">Attention: {unmappedCount} dentiste(s) non mappé(s)</p>
            <p className="text-sm text-yellow-800">
              Des dentistes DS-Core n'ont pas de compte local associé. Configurez-les pour une meilleure organisation.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un dentiste DS-Core..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredMappings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun dentiste DS-Core</h3>
          <p className="text-slate-600">Les dentistes apparaîtront ici après la première synchronisation</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Dentistes DS-Core</h2>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredMappings.map((mapping) => {
              const linkedDentist = localDentists.find((d) => d.id === mapping.local_dentist_id);
              const isEditing = editingMapping === mapping.id;

              return (
                <div key={mapping.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{mapping.dscore_dentist_name}</h3>
                          <p className="text-sm text-slate-600">{mapping.dscore_dentist_email}</p>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-4 space-y-3">
                          <select
                            value={selectedDentistId}
                            onChange={(e) => setSelectedDentistId(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Sélectionner un dentiste local</option>
                            {localDentists.map((dentist) => (
                              <option key={dentist.id} value={dentist.id}>
                                {dentist.name} - {dentist.email}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveMapping(mapping.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                              <Save className="w-4 h-4" />
                              Enregistrer
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                            >
                              <X className="w-4 h-4" />
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-3">
                          {linkedDentist ? (
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-800">
                                Lié à: <strong>{linkedDentist.name}</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm text-yellow-800">Non mappé</span>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setEditingMapping(mapping.id);
                              setSelectedDentistId(mapping.local_dentist_id || '');
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                          >
                            <LinkIcon className="w-4 h-4" />
                            {linkedDentist ? 'Modifier' : 'Configurer'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

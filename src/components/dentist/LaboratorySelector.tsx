import { useState, useEffect } from 'react';
import { Search, Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Laboratory {
  id: string;
  laboratory_name: string;
  isFavorite?: boolean;
}

interface LaboratorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  dentistId: string;
}

export default function LaboratorySelector({ value, onChange, dentistId }: LaboratorySelectorProps) {
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [filteredLabs, setFilteredLabs] = useState<Laboratory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadLaboratories();
  }, [dentistId]);

  useEffect(() => {
    filterLaboratories();
  }, [searchTerm, laboratories, favorites]);

  const loadLaboratories = async () => {
    try {
      setLoading(true);

      const [labsResult, favoritesResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, laboratory_name')
          .eq('role', 'laboratory')
          .not('laboratory_name', 'is', null)
          .neq('laboratory_name', '')
          .order('laboratory_name'),
        supabase
          .from('dentist_favorite_laboratories')
          .select('laboratory_profile_id')
          .eq('dentist_id', dentistId)
      ]);

      if (labsResult.error) throw labsResult.error;

      const labs = (labsResult.data || []).filter(
        lab => lab.laboratory_name && lab.laboratory_name.trim() !== ''
      );

      const favoriteIds = new Set(
        (favoritesResult.data || []).map(fav => fav.laboratory_profile_id)
      );

      setLaboratories(labs);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error loading laboratories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLaboratories = () => {
    let filtered = [...laboratories];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(lab =>
        lab.laboratory_name.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => {
      const aFav = favorites.has(a.id);
      const bFav = favorites.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.laboratory_name.localeCompare(b.laboratory_name);
    });

    setFilteredLabs(filtered);
  };

  const toggleFavorite = async (labId: string) => {
    const isFavorite = favorites.has(labId);
    console.log('Toggle favorite clicked', { labId, dentistId, isFavorite });

    try {
      if (isFavorite) {
        console.log('Removing from favorites...');
        const { error } = await supabase
          .from('dentist_favorite_laboratories')
          .delete()
          .eq('dentist_id', dentistId)
          .eq('laboratory_profile_id', labId);

        if (error) {
          console.error('Error removing favorite:', error);
          throw error;
        }

        console.log('Favorite removed successfully');
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(labId);
          return newFavorites;
        });
      } else {
        console.log('Adding to favorites...');
        const { error } = await supabase
          .from('dentist_favorite_laboratories')
          .insert({
            dentist_id: dentistId,
            laboratory_profile_id: labId
          });

        if (error) {
          console.error('Error adding favorite:', error);
          throw error;
        }

        console.log('Favorite added successfully');
        setFavorites(prev => new Set(prev).add(labId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Erreur lors de la mise à jour des favoris: ' + (error as any).message);
    }
  };

  const selectLab = (labId: string) => {
    onChange(labId);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const selectedLab = laboratories.find(lab => lab.id === value);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Laboratoire *
      </label>

      <div
        onClick={() => setShowDropdown(true)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer bg-white"
      >
        {selectedLab ? (
          <div className="flex items-center justify-between">
            <span>{selectedLab.laboratory_name}</span>
            {favorites.has(value) && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            )}
          </div>
        ) : (
          <span className="text-slate-400">Sélectionner un laboratoire</span>
        )}
      </div>

      {showDropdown && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Sélectionner un laboratoire
              </h3>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  setSearchTerm('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un laboratoire..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredLabs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {searchTerm ? 'Aucun laboratoire trouvé' : 'Aucun laboratoire disponible'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLabs.map((lab) => {
                    const isFavorite = favorites.has(lab.id);
                    return (
                      <div
                        key={lab.id}
                        className={`flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition cursor-pointer group ${
                          value === lab.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                        }`}
                        onClick={() => selectLab(lab.id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavorite(lab.id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded transition"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                isFavorite
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-300 group-hover:text-slate-400'
                              }`}
                            />
                          </button>
                          <span className="text-slate-900 font-medium">
                            {lab.laboratory_name}
                          </span>
                        </div>
                        {value === lab.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {favorites.size > 0 && !searchTerm && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{favorites.size} favori{favorites.size > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

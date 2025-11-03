import { useState, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type Dentist = Database['public']['Tables']['dentists']['Row'];

interface DentistSelectorProps {
  selectedDentistId: string;
  onSelectDentist: (dentistId: string) => void;
  required?: boolean;
}

export default function DentistSelector({ selectedDentistId, onSelectDentist, required = false }: DentistSelectorProps) {
  const { user } = useAuth();
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDentists();
  }, [user]);

  const loadDentists = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setDentists(data || []);
    } catch (error) {
      console.error('Error loading dentists:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedDentist = dentists.find(d => d.id === selectedDentistId);

  const filteredDentists = dentists.filter(dentist =>
    dentist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dentist.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (dentistId: string) => {
    onSelectDentist(dentistId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary-500"></span>
        Dentiste {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300 cursor-pointer flex items-center justify-between"
      >
        {selectedDentist ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              {selectedDentist.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{selectedDentist.name}</div>
              {selectedDentist.email && (
                <div className="text-xs text-slate-500">{selectedDentist.email}</div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400">Sélectionner un dentiste...</span>
        )}
        <Search className="w-5 h-5 text-slate-400" />
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un dentiste..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-600">Chargement...</div>
              ) : filteredDentists.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600">
                    {searchTerm ? 'Aucun dentiste trouvé' : 'Aucun dentiste enregistré'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredDentists.map(dentist => (
                    <div
                      key={dentist.id}
                      onClick={() => handleSelect(dentist.id)}
                      className={`p-3 hover:bg-gradient-to-r hover:from-primary-50 hover:to-cyan-50 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                        dentist.id === selectedDentistId ? 'bg-primary-50/50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                        {dentist.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{dentist.name}</div>
                        {dentist.email && (
                          <div className="text-xs text-slate-500 truncate">{dentist.email}</div>
                        )}
                        {dentist.phone && (
                          <div className="text-xs text-slate-500">{dentist.phone}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

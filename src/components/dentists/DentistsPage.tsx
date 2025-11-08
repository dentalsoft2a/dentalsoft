import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Search, Mail, Phone, MapPin, User, CheckCircle2, Clock, Download, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type Dentist = Database['public']['Tables']['dentists']['Row'];

interface DentistWithStats extends Dentist {
  total_delivery_notes?: number;
  active_delivery_notes?: number;
}

export default function DentistsPage() {
  const { user } = useAuth();
  const [dentists, setDentists] = useState<DentistWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDentist, setEditingDentist] = useState<Dentist | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDentists();
  }, [user]);

  const loadDentists = async () => {
    if (!user) return;

    try {
      const { data: dentistsData, error: dentistsError } = await supabase
        .from('dentists')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (dentistsError) throw dentistsError;

      const dentistsWithStats = await Promise.all(
        (dentistsData || []).map(async (dentist) => {
          const { data: deliveryNotes } = await supabase
            .from('delivery_notes')
            .select('status')
            .eq('dentist_id', dentist.id);

          const total = deliveryNotes?.length || 0;
          const active = deliveryNotes?.filter(dn => dn.status === 'pending' || dn.status === 'in_progress').length || 0;

          return {
            ...dentist,
            total_delivery_notes: total,
            active_delivery_notes: active,
          };
        })
      );

      setDentists(dentistsWithStats);
    } catch (error) {
      console.error('Error loading dentists:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDentists = dentists.filter((dentist) =>
    dentist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dentist.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (dentist: Dentist) => {
    setEditingDentist(dentist);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dentiste ?')) return;

    try {
      const { error } = await supabase.from('dentists').delete().eq('id', id);
      if (error) throw error;
      await loadDentists();
    } catch (error) {
      console.error('Error deleting dentist:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleExport = () => {
    const exportData = dentists.map(({ id, user_id, created_at, updated_at, total_delivery_notes, active_delivery_notes, ...rest }) => rest);
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dentistes_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const text = await file.text();
      const importedDentists = JSON.parse(text);

      if (!Array.isArray(importedDentists)) {
        alert('Format de fichier invalide');
        return;
      }

      const dentistsToInsert = importedDentists.map(dentist => ({
        ...dentist,
        user_id: user.id,
      }));

      const { error } = await supabase.from('dentists').insert(dentistsToInsert);

      if (error) throw error;

      alert(`${dentistsToInsert.length} dentiste(s) importé(s) avec succès`);
      await loadDentists();
    } catch (error) {
      console.error('Error importing dentists:', error);
      alert('Erreur lors de l\'importation. Vérifiez le format du fichier.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="mb-4 md:mb-8">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-900">Dentistes</h1>
            <p className="text-xs md:text-base text-slate-600 mt-1 md:mt-2">Gérez vos clients dentistes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1">
          <button
            onClick={handleExport}
            disabled={dentists.length === 0}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base whitespace-nowrap"
          >
            <Download className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition text-sm md:text-base whitespace-nowrap"
          >
            <Upload className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Importer</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => {
              setEditingDentist(null);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition text-sm md:text-base whitespace-nowrap"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Ajouter un dentiste</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un dentiste..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-12 pr-4 md:pr-5 py-2.5 md:py-3.5 border border-slate-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-200 hover:border-slate-400 bg-white shadow-sm placeholder:text-slate-400 text-sm md:text-base"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-600 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="animate-pulse">Chargement...</div>
        </div>
      ) : filteredDentists.length === 0 ? (
        <div className="p-12 text-center bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-sm border border-slate-200">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {searchTerm ? 'Aucun dentiste trouvé' : 'Aucun dentiste enregistré'}
          </p>
          {!searchTerm && (
            <p className="text-slate-500 text-sm mt-2">
              Commencez par ajouter votre premier dentiste
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDentists.map((dentist) => (
            <div
              key={dentist.id}
              className="bg-white rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-primary-300 transition-all duration-300 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                        {dentist.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary-700 transition-colors">
                          {dentist.name}
                        </h3>
                        {dentist.active_delivery_notes !== undefined && dentist.active_delivery_notes > 0 ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
                            <span className="text-xs font-medium text-emerald-600">
                              {dentist.active_delivery_notes} en cours
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                            <span className="text-xs font-medium text-slate-500">
                              Aucune commande active
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {dentist.email && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-primary-600 transition-colors">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-primary-50 transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                      <span className="truncate">{dentist.email}</span>
                    </div>
                  )}

                  {dentist.phone && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-primary-600 transition-colors">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-primary-50 transition-colors">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span>{dentist.phone}</span>
                    </div>
                  )}

                  {dentist.address && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-primary-600 transition-colors">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-primary-50 transition-colors">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="line-clamp-2">{dentist.address}</span>
                    </div>
                  )}
                </div>

                {dentist.total_delivery_notes !== undefined && dentist.total_delivery_notes > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium">
                          {dentist.total_delivery_notes} {dentist.total_delivery_notes === 1 ? 'commande' : 'commandes'}
                        </span>
                      </div>
                      {dentist.active_delivery_notes !== undefined && dentist.active_delivery_notes > 0 && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="font-medium">
                            {dentist.active_delivery_notes} active{dentist.active_delivery_notes > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(dentist)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => handleDelete(dentist.id)}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <DentistModal
          dentist={editingDentist}
          onClose={() => {
            setShowModal(false);
            setEditingDentist(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingDentist(null);
            loadDentists();
          }}
        />
      )}
    </div>
  );
}

interface DentistModalProps {
  dentist: Dentist | null;
  onClose: () => void;
  onSave: () => void;
}

function DentistModal({ dentist, onClose, onSave }: DentistModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: dentist?.name || '',
    email: dentist?.email || '',
    phone: dentist?.phone || '',
    address: dentist?.address || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (dentist) {
        const { error } = await supabase
          .from('dentists')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dentist.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('dentists').insert({
          ...formData,
          user_id: user.id,
        });

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving dentist:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {dentist ? 'Modifier le dentiste' : 'Ajouter un dentiste'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

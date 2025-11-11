import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, GripVertical, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';

interface ProductionStage {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  color: string;
  requires_approval: boolean;
}

export default function ProductionStagesManager() {
  const { user } = useAuth();
  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState<ProductionStage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    requires_approval: false
  });

  useLockScroll(showModal);

  useEffect(() => {
    if (user) {
      loadStages();
    }
  }, [user]);

  const loadStages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('production_stages')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (stage?: ProductionStage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData({
        name: stage.name,
        description: stage.description || '',
        color: stage.color,
        requires_approval: stage.requires_approval
      });
    } else {
      setEditingStage(null);
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        requires_approval: false
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStage(null);
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      requires_approval: false
    });
  };

  const handleSave = async () => {
    if (!user || !formData.name.trim()) {
      alert('Le nom de l\'étape est requis');
      return;
    }

    try {
      if (editingStage) {
        // Mise à jour
        const { error } = await supabase
          .from('production_stages')
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            requires_approval: formData.requires_approval
          })
          .eq('id', editingStage.id);

        if (error) throw error;
      } else {
        // Création
        const maxOrder = stages.length > 0
          ? Math.max(...stages.map(s => s.order_index))
          : -1;

        const { error } = await supabase
          .from('production_stages')
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            requires_approval: formData.requires_approval,
            order_index: maxOrder + 1
          });

        if (error) throw error;
      }

      await loadStages();
      handleCloseModal();
      alert(editingStage ? 'Étape mise à jour!' : 'Étape créée!');
    } catch (error) {
      console.error('Error saving stage:', error);
      alert('Erreur lors de la sauvegarde de l\'étape');
    }
  };

  const handleDelete = async (stageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette étape ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('production_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      await loadStages();
      alert('Étape supprimée avec succès');
    } catch (error) {
      console.error('Error deleting stage:', error);
      alert('Erreur lors de la suppression de l\'étape');
    }
  };

  const colorOptions = [
    { value: '#EF4444', label: 'Rouge' },
    { value: '#F97316', label: 'Orange' },
    { value: '#EAB308', label: 'Jaune' },
    { value: '#22C55E', label: 'Vert' },
    { value: '#3B82F6', label: 'Bleu' },
    { value: '#8B5CF6', label: 'Violet' },
    { value: '#EC4899', label: 'Rose' },
    { value: '#64748B', label: 'Gris' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Étapes de production</h2>
          <p className="text-sm text-slate-600 mt-1">
            Définissez les étapes de votre workflow de production
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 font-medium shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Ajouter une étape
        </button>
      </div>

      {stages.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">Aucune étape de production définie</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Créer la première étape
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-3 flex-1">
                <GripVertical className="w-5 h-5 text-slate-400" />

                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md"
                  style={{ backgroundColor: stage.color }}
                >
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{stage.name}</h3>
                    {stage.requires_approval && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                        Validation requise
                      </span>
                    )}
                  </div>
                  {stage.description && (
                    <p className="text-sm text-slate-600 mt-1">{stage.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenModal(stage)}
                  className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(stage.id)}
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-primary-600 to-cyan-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                {editingStage ? 'Modifier l\'étape' : 'Nouvelle étape'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom de l'étape *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Moulage, Cuisson, Finition..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de l'étape (optionnel)"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Couleur */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Couleur
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`h-10 rounded-lg transition-all duration-200 ${
                        formData.color === color.value
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Validation requise */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="requires-approval"
                  checked={formData.requires_approval}
                  onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="requires-approval" className="text-sm text-slate-700 cursor-pointer">
                  Cette étape nécessite une validation
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 font-medium shadow-lg"
              >
                <Save className="w-4 h-4" />
                {editingStage ? 'Mettre à jour' : 'Créer l\'étape'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

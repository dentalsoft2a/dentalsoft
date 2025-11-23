import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Search, Save, X, Box, AlertTriangle, TrendingUp, RefreshCw, Palette, BookOpen, ChevronDown, ChevronUp, HelpCircle, Package, CheckCircle2, Tag, Layers, Download, Upload, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import PaginationControls from '../common/PaginationControls';
import ResourceVariantManager from './ResourceVariantManager';
import ResourceBatchLinkManager from '../batch/ResourceBatchLinkManager';
import { ExtensionGuard } from '../common/ExtensionGuard';

interface Resource {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  is_active: boolean;
  has_variants: boolean;
  created_at: string;
  updated_at: string;
}

type PredefinedResource = {
  id: string;
  name: string;
  description: string;
  unit: string;
  has_variants: boolean;
  is_active: boolean;
};

interface ResourceWithVariantStock extends Resource {
  total_variant_stock?: number;
}

interface ResourcesPageProps {
  onStockUpdate?: () => void;
}

export default function ResourcesPage({ onStockUpdate }: ResourcesPageProps = {}) {
  const { user } = useAuth();
  const [resources, setResources] = useState<ResourceWithVariantStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showVariantManager, setShowVariantManager] = useState<{ id: string; name: string } | null>(null);
  const [showBatchLinkManager, setShowBatchLinkManager] = useState<{ id: string; name: string; type: 'resource' | 'variant' } | null>(null);
  const [lowStockVariants, setLowStockVariants] = useState<any[]>([]);
  const [showQuickFill, setShowQuickFill] = useState<{ id: string; name: string; currentStock: number; type: 'resource' | 'variant' } | null>(null);
  const [showPredefinedModal, setShowPredefinedModal] = useState(false);
  const [predefinedResources, setPredefinedResources] = useState<PredefinedResource[]>([]);
  const [predefinedSearchTerm, setPredefinedSearchTerm] = useState('');

  useLockScroll(showModal || !!showVariantManager || !!showBatchLinkManager || !!showQuickFill || showPredefinedModal);
  const [quickFillQuantity, setQuickFillQuantity] = useState<number>(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'unité',
    stock_quantity: 0,
    low_stock_threshold: 5,
    cost_per_unit: 0,
    is_active: true,
  });

  useEffect(() => {
    loadResources();
    loadPredefinedResources();

    const interval = setInterval(() => {
      loadResources();
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  const loadResources = async (showRefreshIndicator = false) => {
    if (!user) return;

    if (onStockUpdate) {
      onStockUpdate();
    }

    if (showRefreshIndicator) {
      setRefreshing(true);
    }

    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const resourcesWithVariantStock = await Promise.all(
        (data || []).map(async (resource) => {
          if (resource.has_variants) {
            const { data: variants } = await supabase
              .from('resource_variants')
              .select('*')
              .eq('resource_id', resource.id);

            const totalVariantStock = variants?.reduce(
              (sum, variant) => sum + (variant.stock_quantity || 0),
              0
            ) || 0;

            const lowStockVars = (variants || []).filter(
              v => v.is_active && v.stock_quantity <= v.low_stock_threshold
            ).map(v => ({ ...v, resource_name: resource.name, resource_id: resource.id }));

            if (lowStockVars.length > 0) {
              setLowStockVariants(prev => [...prev.filter(lv => lv.resource_id !== resource.id), ...lowStockVars]);
            }

            return { ...resource, total_variant_stock: totalVariantStock };
          }
          return resource;
        })
      );

      if (!(data || []).some(r => r.has_variants)) {
        setLowStockVariants([]);
      }

      setResources(resourcesWithVariantStock);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
      if (showRefreshIndicator) {
        setRefreshing(false);
      }
    }
  };

  const loadPredefinedResources = async () => {
    try {
      const { data, error } = await supabase
        .from('predefined_resources')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setPredefinedResources(data || []);
    } catch (error) {
      console.error('Error loading predefined resources:', error);
    }
  };

  const handleRefresh = () => {
    loadResources(true);
  };

  const lowStockResources = resources.filter((r) => {
    const currentStock = r.has_variants && r.total_variant_stock !== undefined
      ? r.total_variant_stock
      : r.stock_quantity;
    return r.is_active && currentStock <= r.low_stock_threshold;
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredResources = resources.filter((resource) =>
    resource.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const pagination = usePagination(filteredResources, { initialPageSize: 15 });
  const paginatedResources = pagination.paginatedItems;

  const filteredPredefinedResources = predefinedResources.filter((resource) =>
    resource.name.toLowerCase().includes(predefinedSearchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(predefinedSearchTerm.toLowerCase())
  );

  const handleOpenModal = (resource?: Resource) => {
    if (resource) {
      setEditingResource(resource);
      setFormData({
        name: resource.name,
        description: resource.description || '',
        unit: resource.unit,
        stock_quantity: resource.stock_quantity,
        low_stock_threshold: resource.low_stock_threshold,
        cost_per_unit: Number(resource.cost_per_unit),
        is_active: resource.is_active,
      });
    } else {
      setEditingResource(null);
      setFormData({
        name: '',
        description: '',
        unit: 'unité',
        stock_quantity: 0,
        low_stock_threshold: 5,
        cost_per_unit: 0,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingResource(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const dataToSave = {
        ...formData,
        cost_per_unit: formData.cost_per_unit === '' ? 0 : Number(formData.cost_per_unit),
        stock_quantity: formData.stock_quantity === '' ? 0 : Number(formData.stock_quantity),
        low_stock_threshold: formData.low_stock_threshold === '' ? 5 : Number(formData.low_stock_threshold),
      };

      if (editingResource) {
        const { error } = await supabase
          .from('resources')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingResource.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('resources').insert({
          ...dataToSave,
          user_id: user.id,
        });

        if (error) throw error;
      }

      await loadResources();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) return;

    try {
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) throw error;
      await loadResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await Promise.all(
        resources.map(async ({ id, user_id, created_at, updated_at, total_variant_stock, ...rest }) => {
          const { data: variants } = await supabase
            .from('resource_variants')
            .select('*')
            .eq('resource_id', id);

          const cleanedVariants = (variants || []).map(({ id: variantId, resource_id, created_at: vCreatedAt, updated_at: vUpdatedAt, ...variantRest }) => variantRest);

          return {
            ...rest,
            variants: cleanedVariants
          };
        })
      );

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ressources_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting resources:', error);
      alert('Erreur lors de l\'exportation');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const text = await file.text();
      const importedResources = JSON.parse(text);

      console.log('Imported resources:', importedResources);

      if (!Array.isArray(importedResources)) {
        alert('Format de fichier invalide');
        return;
      }

      let totalVariantsImported = 0;

      for (const resource of importedResources) {
        const { variants, ...resourceData } = resource;

        console.log('Inserting resource:', resourceData);

        const { data: insertedResource, error: resourceError } = await supabase
          .from('resources')
          .insert({
            ...resourceData,
            user_id: user.id,
          })
          .select()
          .single();

        if (resourceError) {
          console.error('Resource insert error:', resourceError);
          throw resourceError;
        }

        console.log('Inserted resource:', insertedResource);

        if (variants && Array.isArray(variants) && variants.length > 0) {
          const variantsToInsert = variants.map((variant: any) => ({
            ...variant,
            resource_id: insertedResource.id,
            user_id: user.id,
          }));

          console.log('Inserting variants:', variantsToInsert);

          const { error: variantsError } = await supabase
            .from('resource_variants')
            .insert(variantsToInsert);

          if (variantsError) {
            console.error('Variants insert error:', variantsError);
            throw variantsError;
          }

          totalVariantsImported += variantsToInsert.length;
        }
      }

      alert(
        `${importedResources.length} ressource(s) et ${totalVariantsImported} variante(s) importée(s) avec succès`
      );
      await loadResources();
    } catch (error: any) {
      console.error('Error importing resources:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      alert(`Erreur lors de l'importation: ${errorMessage}\n\nVérifiez le format du fichier et consultez la console pour plus de détails.`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddPredefinedResource = async (predefinedResource: PredefinedResource, costPerUnit: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('resources').insert({
        user_id: user.id,
        name: predefinedResource.name,
        description: predefinedResource.description,
        unit: predefinedResource.unit,
        stock_quantity: 0,
        low_stock_threshold: 5,
        cost_per_unit: costPerUnit,
        is_active: true,
        track_stock: true,
        has_variants: predefinedResource.has_variants,
      });

      if (error) throw error;
      await loadResources();
    } catch (error) {
      console.error('Error adding predefined resource:', error);
      alert('Erreur lors de l\'ajout de la ressource');
    }
  };

  const handleQuickFill = async () => {
    if (!showQuickFill || !user) return;

    try {
      const newStock = showQuickFill.currentStock + quickFillQuantity;

      if (showQuickFill.type === 'resource') {
        const { error } = await supabase
          .from('resources')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', showQuickFill.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resource_variants')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', showQuickFill.id);

        if (error) throw error;
      }

      await loadResources();
      setShowQuickFill(null);
      setQuickFillQuantity(0);
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Erreur lors de la mise à jour du stock');
    }
  };

  return (
    <ExtensionGuard
      featureKey="resource_management"
      fallbackMessage="La gestion avancée des ressources et matériaux avec variantes et suivi de stock nécessite l'extension Gestion des Ressources."
    >
      <div>
        <div className="mb-6 md:mb-8 animate-fade-in">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Ressources</h1>
                <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Gérez vos matières premières (disques, blocs, etc.)</p>
              </div>
            </div>
          <div className="flex gap-2 md:gap-3 md:justify-end">
            <button
              onClick={() => setShowPredefinedModal(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-3 bg-white border-2 border-sky-300 text-sky-700 rounded-lg md:rounded-xl hover:bg-sky-50 hover:border-sky-400 transition-all duration-200 hover:scale-105 active:scale-95 text-sm md:text-base font-medium"
            >
              <List className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Ressources prédéfinies</span>
            </button>
            <button
              onClick={handleExport}
              disabled={resources.length === 0}
              className="flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg md:rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm md:text-base font-medium"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg md:rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 hover:scale-105 active:scale-95 text-sm md:text-base font-medium"
            >
              <Upload className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
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
              onClick={() => setShowTutorial(!showTutorial)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-3 bg-white border-2 border-primary-300 text-primary-700 rounded-lg md:rounded-xl hover:bg-primary-50 hover:border-primary-400 transition-all duration-200 hover:scale-105 active:scale-95 text-sm md:text-base font-medium"
              title="Afficher le tutoriel"
            >
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg md:rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm md:text-base font-medium"
              title="Actualiser les stocks"
            >
              <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg md:rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 hover:scale-105 active:scale-95 text-sm md:text-base font-medium"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Nouveau</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
        </div>
      </div>

      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-cyan-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Guide des Ressources</h2>
                    <p className="text-white/80 text-sm mt-1">Comprendre la gestion des matières premières et variantes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <section className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5">
                <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Qu'est-ce qu'une ressource ?
                </h3>
                <p className="text-blue-800 mb-3">
                  Une ressource représente une matière première ou un consommable utilisé dans votre laboratoire dentaire
                  (disques, blocs, porcelaine, résine, etc.). Chaque ressource peut être gérée de façon simple ou avec des variantes.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-slate-600" />
                  Deux modes de gestion de stock
                </h3>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
                  <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <Box className="w-5 h-5" />
                    1. Gestion simple (sans variantes)
                  </h4>
                  <p className="text-emerald-800 mb-3">
                    Un seul stock global pour toute la ressource. Idéal pour les matériaux sans différenciation.
                  </p>
                  <div className="bg-white border border-emerald-200 rounded p-3 space-y-2">
                    <p className="text-sm text-emerald-900"><strong>Quand l'utiliser :</strong></p>
                    <ul className="text-sm text-emerald-800 space-y-1 ml-4 list-disc">
                      <li>Matériaux homogènes (résine liquide, colle, poudre)</li>
                      <li>Pas de besoin de différencier par couleur ou taille</li>
                      <li>Stock unique et simple à gérer</li>
                    </ul>
                  </div>
                  <div className="mt-3 p-3 bg-emerald-100 rounded border border-emerald-300">
                    <p className="text-sm text-emerald-900">
                      <strong>Exemple :</strong> Résine liquide - 500ml en stock. Chaque utilisation diminue le stock total.
                    </p>
                  </div>
                </div>

                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-5">
                  <h4 className="font-bold text-cyan-900 mb-2 flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    2. Gestion avec variantes
                  </h4>
                  <p className="text-cyan-800 mb-3">
                    Stock séparé pour chaque combinaison de teinte/taille/sous-catégorie. Idéal pour les matériaux différenciés.
                  </p>
                  <div className="bg-white border border-cyan-200 rounded p-3 space-y-2">
                    <p className="text-sm text-cyan-900"><strong>Quand l'utiliser :</strong></p>
                    <ul className="text-sm text-cyan-800 space-y-1 ml-4 list-disc">
                      <li>Disques avec différentes teintes et tailles</li>
                      <li>Blocs disponibles en plusieurs couleurs</li>
                      <li>Besoin de tracer précisément chaque variante</li>
                    </ul>
                  </div>
                  <div className="mt-3 p-3 bg-cyan-100 rounded border border-cyan-300">
                    <p className="text-sm text-cyan-900 mb-2">
                      <strong>Exemple :</strong> Disques de zircone avec stocks séparés :
                    </p>
                    <ul className="text-sm text-cyan-800 space-y-1 ml-4 list-disc">
                      <li>Teinte A1 - Taille 14mm - Sous-catégorie HT : 5 disques</li>
                      <li>Teinte A2 - Taille 14mm - Sous-catégorie HT : 8 disques</li>
                      <li>Teinte A3 - Taille 16mm - Sous-catégorie ST : 3 disques</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-5">
                <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Règle importante
                </h3>
                <p className="text-amber-800 mb-2">
                  <strong>Vous devez choisir un seul mode de gestion par ressource !</strong>
                </p>
                <p className="text-amber-800">
                  Si vous activez "Utiliser les variantes", le stock principal est ignoré et seuls les stocks des variantes comptent.
                  Si vous n'utilisez pas de variantes, c'est le stock principal qui est utilisé.
                </p>
              </section>

              <section className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-slate-600" />
                  Comment créer des variantes ?
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-700 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Créez votre ressource</p>
                      <p className="text-sm text-slate-600">Ajoutez le nom, l'unité, et les informations de base (ex: "Disque Zircone")</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-700 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Cliquez sur "Variantes"</p>
                      <p className="text-sm text-slate-600">Sur la carte de la ressource, cliquez sur le bouton cyan "Variantes"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-700 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Ajoutez vos variantes</p>
                      <p className="text-sm text-slate-600">Pour chaque variante, indiquez la teinte, la taille, la sous-catégorie (optionnelle), le stock et le seuil d'alerte</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-700 font-bold text-sm">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Activez "Utiliser les variantes"</p>
                      <p className="text-sm text-slate-600">Cochez cette option sur la ressource pour que les variantes soient utilisées lors des bons de livraison</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-violet-50 border border-violet-200 rounded-lg p-5">
                <h3 className="text-lg font-bold text-violet-900 mb-3 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Structure des variantes
                </h3>
                <p className="text-violet-800 mb-3">
                  Chaque variante est identifiée par trois caractéristiques combinables :
                </p>
                <div className="space-y-3">
                  <div className="bg-white border border-violet-200 rounded p-3">
                    <p className="font-medium text-violet-900 mb-1">Teinte</p>
                    <p className="text-sm text-violet-800">Couleur du matériau (A1, A2, B1, etc.)</p>
                  </div>
                  <div className="bg-white border border-violet-200 rounded p-3">
                    <p className="font-medium text-violet-900 mb-1">Taille</p>
                    <p className="text-sm text-violet-800">Dimension du matériau (14mm, 16mm, 18mm, etc.)</p>
                  </div>
                  <div className="bg-white border border-violet-200 rounded p-3">
                    <p className="font-medium text-violet-900 mb-1">Sous-catégorie (optionnelle)</p>
                    <p className="text-sm text-violet-800">Classification supplémentaire (HT, ST, ML, etc.)</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-violet-100 rounded border border-violet-300">
                  <p className="text-sm text-violet-900">
                    <strong>Note :</strong> La combinaison Teinte + Taille + Sous-catégorie doit être unique pour chaque variante d'une même ressource.
                  </p>
                </div>
              </section>

              <section className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Alertes de stock bas
                </h3>
                <p className="text-orange-800 mb-3">
                  Définissez un seuil d'alerte pour chaque ressource ou variante. Vous serez alerté automatiquement
                  quand le stock descend à ce niveau ou en dessous.
                </p>
                <div className="bg-white border border-orange-200 rounded p-3">
                  <p className="text-sm text-orange-900 mb-1"><strong>Exemple :</strong></p>
                  <p className="text-sm text-orange-800">
                    Seuil à 5 disques → Alerte affichée quand stock ≤ 5 disques
                  </p>
                </div>
              </section>

              <section className="bg-gradient-to-r from-primary-50 to-cyan-50 border border-primary-200 rounded-lg p-5">
                <h3 className="text-lg font-bold text-primary-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Conseils pratiques
                </h3>
                <ul className="space-y-2 text-primary-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Utilisez les variantes uniquement si nécessaire pour éviter la complexité inutile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Les seuils d'alerte vous aident à anticiper les réapprovisionnements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Le bouton "Réappro rapide" permet d'ajuster rapidement les stocks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Les mouvements de stock sont automatiquement enregistrés lors des bons de livraison</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Désactivez une ressource au lieu de la supprimer pour garder l'historique</span>
                  </li>
                </ul>
              </section>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 rounded-b-xl">
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition font-medium"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

      {(lowStockResources.length > 0 || lowStockVariants.length > 0) && (
        <div className="mb-4 md:mb-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50/80 to-orange-50/80 px-3 md:px-4 py-3 border-b border-red-200/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-1.5 md:gap-2">
                  Alerte stock faible
                  <span className="px-1.5 md:px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] md:text-xs font-bold rounded-full">
                    {lowStockResources.length + lowStockVariants.length}
                  </span>
                </h3>
                <p className="text-xs md:text-sm text-slate-600 mt-0.5">
                  {lowStockResources.length + lowStockVariants.length === 1
                    ? 'Une ressource/variante nécessite un réapprovisionnement'
                    : `${lowStockResources.length + lowStockVariants.length} ressources/variantes nécessitent un réapprovisionnement`}
                </p>
              </div>
            </div>
          </div>
          <div className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:flex-wrap gap-2">
              {lowStockResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 text-xs md:text-sm transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Box className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <span className="font-medium text-slate-900 truncate">{resource.name}</span>
                    <span className="text-red-600 font-bold whitespace-nowrap">
                      {resource.has_variants && resource.total_variant_stock !== undefined
                        ? resource.total_variant_stock
                        : resource.stock_quantity}/{resource.low_stock_threshold}
                    </span>
                    <span className="text-xs text-slate-500 hidden sm:inline">(Ressource)</span>
                  </div>
                  <button
                    onClick={() => setShowQuickFill({
                      id: resource.id,
                      name: resource.name,
                      currentStock: resource.stock_quantity,
                      type: 'resource'
                    })}
                    className="px-2 py-1 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded text-xs hover:from-primary-700 hover:to-cyan-700 transition-all font-medium shadow-sm ml-2 flex-shrink-0"
                  >
                    Remplir
                  </button>
                </div>
              ))}
              {lowStockVariants.sort((a, b) => {
                const aName = `${a.resource_name}${a.subcategory ? ` - ${a.subcategory}` : ''} - ${a.variant_name}`;
                const bName = `${b.resource_name}${b.subcategory ? ` - ${b.subcategory}` : ''} - ${b.variant_name}`;
                return aName.localeCompare(bName);
              }).map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 text-xs md:text-sm transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Box className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <span className="font-medium text-slate-900 truncate">
                      {variant.resource_name}
                      {variant.subcategory && ` - ${variant.subcategory}`}
                      {' - '}{variant.variant_name}
                    </span>
                    <span className="text-red-600 font-bold whitespace-nowrap">
                      {variant.stock_quantity}/{variant.low_stock_threshold}
                    </span>
                    <span className="text-xs text-slate-500 hidden sm:inline">(Variante)</span>
                  </div>
                  <button
                    onClick={() => setShowQuickFill({
                      id: variant.id,
                      name: `${variant.resource_name}${variant.subcategory ? ` - ${variant.subcategory}` : ''} - ${variant.variant_name}`,
                      currentStock: variant.stock_quantity,
                      type: 'variant'
                    })}
                    className="px-2 py-1 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded text-xs hover:from-primary-700 hover:to-cyan-700 transition-all font-medium shadow-sm ml-2 flex-shrink-0"
                  >
                    Remplir
                  </button>
                </div>
              ))}
              {(lowStockResources.length + lowStockVariants.length > 8) && (
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 text-xs md:text-sm font-medium text-slate-700 border border-slate-200">
                  +{lowStockResources.length + lowStockVariants.length - 8} autres
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 md:mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une ressource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-12 pr-4 md:pr-5 py-2.5 md:py-3.5 border border-slate-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-200 hover:border-slate-400 bg-white shadow-sm text-sm md:text-base"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-600 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="animate-pulse">Chargement...</div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="p-12 text-center bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-sm border border-slate-200">
          <Box className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {searchTerm ? 'Aucune ressource trouvée' : 'Aucune ressource enregistrée'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedResources.map((resource) => {
            const currentStock = resource.has_variants && resource.total_variant_stock !== undefined
              ? resource.total_variant_stock
              : resource.stock_quantity;
            const isLowStock = currentStock <= resource.low_stock_threshold;
            const totalValue = currentStock * Number(resource.cost_per_unit);

            return (
              <div
                key={resource.id}
                className={`rounded-2xl shadow-md border ${
                  isLowStock
                    ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-400'
                    : 'bg-white border-slate-200'
                } hover:shadow-xl transition-all duration-300 overflow-hidden group`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-12 h-12 ${
                          isLowStock ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-primary-500 to-cyan-500'
                        } rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Box className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary-700 transition-colors">
                            {resource.name}
                          </h3>
                          {resource.is_active ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-medium text-emerald-600">Actif</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                              <span className="text-xs font-medium text-slate-500">Inactif</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {resource.description && (
                    <div className="mb-4">
                      <p className="text-sm text-slate-600 line-clamp-2">{resource.description}</p>
                    </div>
                  )}

                  <div className={`p-4 rounded-lg ${
                    isLowStock ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50 border border-slate-200'
                  } mb-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Stock actuel</span>
                      {isLowStock && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                    </div>
                    <p className={`text-2xl font-bold ${
                      isLowStock ? 'text-orange-600' : 'text-slate-900'
                    }`}>
                      {currentStock}
                    </p>
                    {resource.has_variants && resource.total_variant_stock !== undefined && (
                      <p className="text-xs text-cyan-600 mt-1 font-medium">
                        ✓ Stock total des variantes
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Seuil: {resource.low_stock_threshold}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Coût unitaire</span>
                      <span className="font-medium text-slate-900">
                        {Number(resource.cost_per_unit).toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Valeur totale</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {totalValue.toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowVariantManager({ id: resource.id, name: resource.name })}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-all duration-200 font-medium"
                        title="Gérer les variantes"
                      >
                        <Palette className="w-4 h-4" />
                        <span>Variantes</span>
                      </button>
                      <button
                        onClick={() => setShowBatchLinkManager({ id: resource.id, name: resource.name, type: 'resource' })}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all duration-200 font-medium"
                        title="Gérer les numéros de lot"
                      >
                        <Tag className="w-4 h-4" />
                        <span>N° Lot</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(resource)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-all duration-200 font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredResources.length > 0 && (
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onNextPage={pagination.nextPage}
            onPrevPage={pagination.prevPage}
            onGoToPage={pagination.goToPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={[15, 30, 50]}
          />
        )}
        </>
      )}

      {showVariantManager && (
        <ResourceVariantManager
          resourceId={showVariantManager.id}
          resourceName={showVariantManager.name}
          onClose={() => {
            setShowVariantManager(null);
            loadResources();
          }}
        />
      )}

      {showBatchLinkManager && (
        <ResourceBatchLinkManager
          resourceId={showBatchLinkManager.type === 'resource' ? showBatchLinkManager.id : undefined}
          variantId={showBatchLinkManager.type === 'variant' ? showBatchLinkManager.id : undefined}
          resourceName={showBatchLinkManager.name}
          onClose={() => {
            setShowBatchLinkManager(null);
            loadResources();
          }}
        />
      )}

      {showQuickFill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Remplir le stock</h2>
              <button
                onClick={() => {
                  setShowQuickFill(null);
                  setQuickFillQuantity(0);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-slate-600 mb-2">Ressource</p>
                <p className="font-bold text-slate-900">{showQuickFill.name}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Stock actuel</span>
                  <span className="text-2xl font-bold text-slate-900">{showQuickFill.currentStock}</span>
                </div>
                <div className="flex items-center justify-center my-3">
                  <span className="text-3xl text-slate-400">+</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Quantité à ajouter</span>
                  <input
                    type="number"
                    min="0"
                    value={quickFillQuantity}
                    onChange={(e) => setQuickFillQuantity(parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-right font-bold text-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    autoFocus
                  />
                </div>
                <div className="border-t border-slate-300 my-3"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Nouveau stock</span>
                  <span className="text-3xl font-bold text-emerald-600">{showQuickFill.currentStock + quickFillQuantity}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickFill(null);
                    setQuickFillQuantity(0);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  disabled={quickFillQuantity <= 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingResource ? 'Modifier la ressource' : 'Nouvelle ressource'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom de la ressource *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ex: Disque Zircone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Description de la ressource"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unité *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Ex: disque, bloc, ml"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Coût unitaire (€) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.cost_per_unit || ''}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {!editingResource?.has_variants && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quantité en stock *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value === '' ? '' as any : parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Seuil d'alerte *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.low_stock_threshold || ''}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value === '' ? '' as any : parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="5"
                    />
                  </div>
                </div>
              )}

              {editingResource?.has_variants && (
                <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Palette className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-cyan-900 mb-1">
                        Cette ressource utilise des variantes
                      </p>
                      <p className="text-sm text-cyan-700">
                        Le stock et le seuil d'alerte sont gérés au niveau de chaque variante. Utilisez le bouton "Variantes" pour les gérer.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                  Ressource active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition"
                >
                  <Save className="w-4 h-4" />
                  {editingResource ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPredefinedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <List className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ressources prédéfinies</h2>
                  <p className="text-sky-100 text-sm">Ajoutez rapidement des ressources standards</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPredefinedModal(false);
                  setPredefinedSearchTerm('');
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une ressource..."
                  value={predefinedSearchTerm}
                  onChange={(e) => setPredefinedSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-slate-600 mt-3">
                {filteredPredefinedResources.length} ressource{filteredPredefinedResources.length > 1 ? 's' : ''} disponible{filteredPredefinedResources.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-3">
                {filteredPredefinedResources.map((resource) => (
                  <PredefinedResourceCard
                    key={resource.id}
                    resource={resource}
                    onAdd={handleAddPredefinedResource}
                  />
                ))}
                {filteredPredefinedResources.length === 0 && (
                  <div className="text-center py-12">
                    <Box className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Aucune ressource trouvée</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ExtensionGuard>
  );
}

function PredefinedResourceCard({ resource, onAdd }: { resource: PredefinedResource; onAdd: (resource: PredefinedResource, costPerUnit: number) => void }) {
  const [costPerUnit, setCostPerUnit] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (costPerUnit < 0) {
      alert('Le coût ne peut pas être négatif');
      return;
    }
    setIsAdding(true);
    await onAdd(resource, costPerUnit);
    setIsAdding(false);
    setCostPerUnit(0);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-slate-900">{resource.name}</h3>
          {resource.has_variants && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              Avec variantes
            </span>
          )}
        </div>
        {resource.description && (
          <p className="text-sm text-slate-600">{resource.description}</p>
        )}
        <p className="text-xs text-slate-500 mt-1">Unité: {resource.unit}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            step="0.01"
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(Number(e.target.value))}
            placeholder="Coût"
            className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
          />
          <span className="text-slate-500 text-sm">€</span>
        </div>
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-lg hover:from-sky-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>
    </div>
  );
}

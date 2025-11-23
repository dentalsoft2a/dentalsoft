import { useEffect, useState, useMemo } from 'react';
import { ShoppingCart, Download, Printer, Copy, CheckSquare, Square, RefreshCw, Filter, Search, Package, Box, Tag, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generatePurchaseOrderPDF } from '../../utils/purchaseOrderPdfGenerator';
import type { Database } from '../../lib/database.types';

type CatalogItem = Database['public']['Tables']['catalog_items']['Row'];
type Resource = Database['public']['Tables']['resources']['Row'];

interface ResourceVariant {
  id: string;
  resource_id: string;
  resource_name: string;
  subcategory: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_unit: string;
}

interface PurchaseOrderItem {
  id: string;
  type: 'catalog' | 'resource' | 'variant';
  name: string;
  description: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  suggested_quantity: number;
  order_quantity: number;
  selected: boolean;
  category?: string;
  subcategory?: string;
}

export default function PurchaseOrderPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [variants, setVariants] = useState<ResourceVariant[]>([]);
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'catalog' | 'resource' | 'variant'>('all');
  const [multiplier, setMultiplier] = useState(1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadLowStockData();
    }
  }, [user]);

  useEffect(() => {
    const savedData = localStorage.getItem('purchase_order_draft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const timestamp = parsed.timestamp;
        const now = Date.now();
        if (now - timestamp < 24 * 60 * 60 * 1000) {
          const savedItems = parsed.items;
          setOrderItems(prevItems =>
            prevItems.map(item => {
              const saved = savedItems.find((s: PurchaseOrderItem) => s.id === item.id && s.type === item.type);
              return saved ? { ...item, order_quantity: saved.order_quantity, selected: saved.selected } : item;
            })
          );
        } else {
          localStorage.removeItem('purchase_order_draft');
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [catalogItems, resources, variants]);

  useEffect(() => {
    if (orderItems.length > 0) {
      const dataToSave = {
        timestamp: Date.now(),
        items: orderItems.map(item => ({
          id: item.id,
          type: item.type,
          order_quantity: item.order_quantity,
          selected: item.selected
        }))
      };
      localStorage.setItem('purchase_order_draft', JSON.stringify(dataToSave));
    }
  }, [orderItems]);

  const loadLowStockData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: catalogData, error: catalogError } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('track_stock', true)
        .eq('is_active', true)
        .order('name');

      if (catalogError) throw catalogError;

      const lowStockCatalog = (catalogData || []).filter(
        item => item.stock_quantity <= item.low_stock_threshold
      );

      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('has_variants', false)
        .order('name');

      if (resourcesError) throw resourcesError;

      const lowStockResources = (resourcesData || []).filter(
        resource => resource.stock_quantity <= resource.low_stock_threshold
      );

      const { data: variantsData, error: variantsError } = await supabase
        .from('resource_variants')
        .select(`
          id,
          resource_id,
          subcategory,
          stock_quantity,
          low_stock_threshold,
          stock_unit,
          resources:resource_id (
            name
          )
        `)
        .order('subcategory');

      if (variantsError) throw variantsError;

      const lowStockVariants = (variantsData || [])
        .filter(v => v.stock_quantity <= v.low_stock_threshold)
        .map(v => ({
          id: v.id,
          resource_id: v.resource_id,
          resource_name: (v.resources as any)?.name || 'Ressource inconnue',
          subcategory: v.subcategory,
          stock_quantity: v.stock_quantity,
          low_stock_threshold: v.low_stock_threshold,
          stock_unit: v.stock_unit
        }));

      setCatalogItems(lowStockCatalog);
      setResources(lowStockResources);
      setVariants(lowStockVariants);

      const items: PurchaseOrderItem[] = [
        ...lowStockCatalog.map(item => ({
          id: item.id,
          type: 'catalog' as const,
          name: item.name,
          description: item.description,
          stock_quantity: item.stock_quantity,
          low_stock_threshold: item.low_stock_threshold,
          unit: item.stock_unit,
          suggested_quantity: Math.max(1, item.low_stock_threshold - item.stock_quantity),
          order_quantity: Math.max(1, item.low_stock_threshold - item.stock_quantity),
          selected: true,
          category: item.category || undefined
        })),
        ...lowStockResources.map(resource => ({
          id: resource.id,
          type: 'resource' as const,
          name: resource.name,
          description: resource.description,
          stock_quantity: resource.stock_quantity,
          low_stock_threshold: resource.low_stock_threshold,
          unit: resource.stock_unit,
          suggested_quantity: Math.max(1, resource.low_stock_threshold - resource.stock_quantity),
          order_quantity: Math.max(1, resource.low_stock_threshold - resource.stock_quantity),
          selected: true,
          category: resource.category || undefined
        })),
        ...lowStockVariants.map(variant => ({
          id: variant.id,
          type: 'variant' as const,
          name: variant.resource_name,
          description: null,
          stock_quantity: variant.stock_quantity,
          low_stock_threshold: variant.low_stock_threshold,
          unit: variant.stock_unit,
          suggested_quantity: Math.max(1, variant.low_stock_threshold - variant.stock_quantity),
          order_quantity: Math.max(1, variant.low_stock_threshold - variant.stock_quantity),
          selected: true,
          subcategory: variant.subcategory || undefined
        }))
      ];

      setOrderItems(items);
    } catch (error) {
      console.error('Error loading low stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return orderItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subcategory?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || item.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [orderItems, searchTerm, filterType]);

  const selectedItems = filteredItems.filter(item => item.selected);
  const selectedCount = selectedItems.length;

  const handleSelectAll = () => {
    setOrderItems(prev => prev.map(item => ({ ...item, selected: true })));
  };

  const handleDeselectAll = () => {
    setOrderItems(prev => prev.map(item => ({ ...item, selected: false })));
  };

  const handleToggleItem = (id: string, type: string) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.id === id && item.type === type
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const handleQuantityChange = (id: string, type: string, quantity: number) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.id === id && item.type === type
          ? { ...item, order_quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const handleApplyMultiplier = () => {
    setOrderItems(prev =>
      prev.map(item => ({
        ...item,
        order_quantity: Math.max(1, Math.round(item.suggested_quantity * multiplier))
      }))
    );
  };

  const handleReset = () => {
    setOrderItems(prev =>
      prev.map(item => ({
        ...item,
        order_quantity: item.suggested_quantity,
        selected: true
      }))
    );
    localStorage.removeItem('purchase_order_draft');
  };

  const handleGeneratePDF = async () => {
    if (selectedCount === 0) {
      alert('Veuillez sélectionner au moins un élément pour générer le bon de commande.');
      return;
    }

    setGenerating(true);
    try {
      await generatePurchaseOrderPDF({
        items: selectedItems,
        laboratoryName: profile?.laboratory_name || 'Mon laboratoire',
        laboratoryAddress: profile?.laboratory_address || '',
        laboratoryPhone: profile?.laboratory_phone || '',
        laboratoryEmail: profile?.laboratory_email || '',
        laboratoryLogo: profile?.laboratory_logo_url || undefined
      });

      localStorage.removeItem('purchase_order_draft');
      alert('Bon de commande généré avec succès!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (selectedCount === 0) {
      alert('Veuillez sélectionner au moins un élément.');
      return;
    }

    const text = generateTextFormat(selectedItems);
    navigator.clipboard.writeText(text).then(
      () => alert('Bon de commande copié dans le presse-papiers!'),
      () => alert('Erreur lors de la copie dans le presse-papiers.')
    );
  };

  const generateTextFormat = (items: PurchaseOrderItem[]) => {
    const date = new Date().toLocaleDateString('fr-FR');
    let text = `BON DE COMMANDE - ${date}\n`;
    text += `${profile?.laboratory_name || 'Mon laboratoire'}\n\n`;

    const catalog = items.filter(i => i.type === 'catalog');
    const resourceItems = items.filter(i => i.type === 'resource');
    const variantItems = items.filter(i => i.type === 'variant');

    if (catalog.length > 0) {
      text += '=== ARTICLES CATALOGUE ===\n';
      catalog.forEach(item => {
        text += `- ${item.name}${item.category ? ` (${item.category})` : ''}\n`;
        text += `  Stock actuel: ${item.stock_quantity} ${item.unit} | Seuil: ${item.low_stock_threshold} ${item.unit}\n`;
        text += `  À commander: ${item.order_quantity} ${item.unit}\n\n`;
      });
    }

    if (resourceItems.length > 0) {
      text += '=== RESSOURCES ===\n';
      resourceItems.forEach(item => {
        text += `- ${item.name}${item.category ? ` (${item.category})` : ''}\n`;
        text += `  Stock actuel: ${item.stock_quantity} ${item.unit} | Seuil: ${item.low_stock_threshold} ${item.unit}\n`;
        text += `  À commander: ${item.order_quantity} ${item.unit}\n\n`;
      });
    }

    if (variantItems.length > 0) {
      text += '=== VARIANTES DE RESSOURCES ===\n';
      variantItems.forEach(item => {
        text += `- ${item.name}${item.subcategory ? ` - ${item.subcategory}` : ''}\n`;
        text += `  Stock actuel: ${item.stock_quantity} ${item.unit} | Seuil: ${item.low_stock_threshold} ${item.unit}\n`;
        text += `  À commander: ${item.order_quantity} ${item.unit}\n\n`;
      });
    }

    text += `\nTotal: ${selectedCount} éléments à commander\n`;
    return text;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'catalog': return 'Catalogue';
      case 'resource': return 'Ressource';
      case 'variant': return 'Variante';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'catalog': return Package;
      case 'resource': return Box;
      case 'variant': return Tag;
      default: return Package;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bon de commande</h1>
            <p className="text-slate-600">Gérez vos articles en stock faible</p>
          </div>
        </div>
      </div>

      {orderItems.length === 0 ? (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-sm border border-emerald-200 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Tous les stocks sont bons!</h3>
          <p className="text-slate-600">Aucun article ou ressource n'a atteint le seuil de stock faible.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="catalog">Articles catalogue</option>
                  <option value="resource">Ressources</option>
                  <option value="variant">Variantes</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-4 py-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Tout sélectionner
              </button>

              <button
                onClick={handleDeselectAll}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Tout désélectionner
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-slate-600">Multiplicateur:</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleApplyMultiplier}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  Appliquer
                </button>
              </div>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Réinitialiser
              </button>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  {selectedCount} élément{selectedCount !== 1 ? 's' : ''} sélectionné{selectedCount !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-slate-600">
                    {orderItems.length} élément{orderItems.length !== 1 ? 's' : ''} en alerte
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {filteredItems.map((item) => {
              const Icon = getTypeIcon(item.type);
              const isUrgent = item.stock_quantity === 0;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`bg-white rounded-xl shadow-sm border transition-all ${
                    isUrgent
                      ? 'border-red-300 bg-red-50'
                      : 'border-orange-200 bg-orange-50'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleToggleItem(item.id, item.type)}
                        className="mt-1 flex-shrink-0"
                      >
                        {item.selected ? (
                          <CheckSquare className="w-6 h-6 text-primary-600" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isUrgent ? 'bg-red-100' : 'bg-orange-100'
                            }`}>
                              <Icon className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-orange-600'}`} />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-slate-900">
                                {item.name}
                                {item.subcategory && <span className="text-slate-600"> - {item.subcategory}</span>}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                  isUrgent
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {getTypeLabel(item.type)}
                                </span>
                                {item.category && (
                                  <span className="text-xs text-slate-500">{item.category}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isUrgent && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-xs font-bold">URGENT</span>
                            </div>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-sm text-slate-600 mb-3">{item.description}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Stock actuel</p>
                            <p className={`text-lg font-bold ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                              {item.stock_quantity} {item.unit}
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Seuil d'alerte</p>
                            <p className="text-lg font-bold text-slate-900">
                              {item.low_stock_threshold} {item.unit}
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Quantité suggérée</p>
                            <p className="text-lg font-bold text-primary-600">
                              {item.suggested_quantity} {item.unit}
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <label className="text-xs text-slate-500 mb-1 block">À commander</label>
                            <input
                              type="number"
                              min="1"
                              value={item.order_quantity}
                              onChange={(e) => handleQuantityChange(item.id, item.type, parseInt(e.target.value) || 1)}
                              className="w-full text-lg font-bold text-slate-900 border-0 focus:ring-0 p-0"
                            />
                            <span className="text-xs text-slate-500">{item.unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sticky bottom-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm text-slate-600">
                  {selectedCount} élément{selectedCount !== 1 ? 's' : ''} sélectionné{selectedCount !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCopyToClipboard}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </button>

                <button
                  onClick={handleGeneratePDF}
                  disabled={selectedCount === 0 || generating}
                  className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Générer le PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

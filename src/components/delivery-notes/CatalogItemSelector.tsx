import { useEffect, useState } from 'react';
import { Plus, Package, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type CatalogItem = Database['public']['Tables']['catalog_items']['Row'];

interface CatalogItemSelectorProps {
  onSelect: (item: {
    catalog_item_id: string;
    description: string;
    unit: string;
    unit_price: number;
  }) => void;
}

export default function CatalogItemSelector({ onSelect }: CatalogItemSelectorProps) {
  const { user } = useAuth();
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    default_unit: 'unité',
    default_price: 0,
    category: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCatalogItems();
  }, [user]);

  const loadCatalogItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setCatalogItems(data || []);
    } catch (error) {
      console.error('Error loading catalog items:', error);
    }
  };

  const handleCreateItem = async () => {
    if (!user || !newItem.name || creating) return;

    setCreating(true);
    try {
      console.log('Creating catalog item:', newItem);

      const { data, error } = await supabase
        .from('catalog_items')
        .insert([{ ...newItem, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error from Supabase:', error);
        throw error;
      }

      console.log('Catalog item created:', data);

      setCatalogItems([...catalogItems, data]);
      onSelect({
        catalog_item_id: data.id,
        description: data.name,
        unit: data.default_unit,
        unit_price: parseFloat(data.default_price.toString()),
      });

      setShowNewItemForm(false);
      setNewItem({
        name: '',
        description: '',
        default_unit: 'unité',
        default_price: 0,
        category: '',
      });

      alert('Article créé avec succès !');
    } catch (error: any) {
      console.error('Error creating catalog item:', error);
      alert('Erreur lors de la création de l\'article: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setCreating(false);
    }
  };

  const handleSelectItem = (item: CatalogItem) => {
    onSelect({
      catalog_item_id: item.id,
      description: item.name,
      unit: item.default_unit,
      unit_price: parseFloat(item.default_price.toString()),
    });
    setSearchTerm('');
  };

  const filteredItems = catalogItems.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans le catalogue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>

        {searchTerm && filteredItems.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg bg-white">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectItem(item);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-slate-600 mt-0.5">{item.description}</div>
                    )}
                    {item.category && (
                      <div className="text-xs text-slate-500 mt-0.5">{item.category}</div>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-900 ml-3">
                    {item.default_price}€ / {item.default_unit}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {searchTerm && filteredItems.length === 0 && (
          <div className="px-3 py-2 text-sm text-slate-600 text-center border border-slate-300 rounded-lg bg-slate-50">
            Aucun article trouvé
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowNewItemForm(!showNewItemForm);
          }}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1.5"
          title="Nouvel article"
        >
          <Plus className="w-4 h-4" />
          <Package className="w-4 h-4" />
        </button>
      </div>

      {showNewItemForm && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-medium text-slate-900 mb-3 text-sm">Nouvel article</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nom de l'article *
              </label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Ex: Couronne céramique"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Détails supplémentaires"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Unité par défaut *
                </label>
                <input
                  type="text"
                  value={newItem.default_unit}
                  onChange={(e) => setNewItem({ ...newItem, default_unit: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ex: unité, ml, g"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Prix unitaire HT * (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.default_price}
                  onChange={(e) => setNewItem({ ...newItem, default_price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Catégorie
              </label>
              <input
                type="text"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Ex: Prothèses fixes, Prothèses amovibles"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowNewItemForm(false);
                }}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateItem();
                }}
                disabled={creating || !newItem.name}
                className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Création...' : 'Créer l\'article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

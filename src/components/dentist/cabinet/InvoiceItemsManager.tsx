import { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { InvoiceItem } from '../../../hooks/useInvoiceCalculations';

interface CatalogItem {
  id: string;
  name: string;
  ccam_code: string;
  price: number;
  cpam_reimbursement: number;
  category: string;
}

interface InvoiceItemsManagerProps {
  items: InvoiceItem[];
  onItemsChange: (items: InvoiceItem[]) => void;
  disabled?: boolean;
}

export default function InvoiceItemsManager({ items, onItemsChange, disabled = false }: InvoiceItemsManagerProps) {
  const { user } = useAuth();
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadCatalog();
  }, [user]);

  const loadCatalog = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dental_catalog_items')
        .select('id, name, ccam_code, price, cpam_reimbursement, category')
        .eq('dentist_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCatalogItems(data || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  };

  const filteredCatalog = catalogItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ccam_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItemFromCatalog = (catalogItem: CatalogItem) => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      catalog_item_id: catalogItem.id,
      description: catalogItem.name,
      ccam_code: catalogItem.ccam_code,
      tooth_number: '',
      quantity: 1,
      unit_price: catalogItem.price,
      cpam_reimbursement: catalogItem.cpam_reimbursement,
      total: catalogItem.price,
    };

    onItemsChange([...items, newItem]);
    setShowCatalog(false);
    setSearchTerm('');
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unit_price;
    }

    onItemsChange(updatedItems);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const addManualItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit_price: 0,
      cpam_reimbursement: 0,
      total: 0,
    };

    onItemsChange([...items, newItem]);
    setEditingIndex(items.length);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Actes facturés</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCatalog(!showCatalog)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Plus className="w-4 h-4" />
            Depuis catalogue
          </button>
          <button
            type="button"
            onClick={addManualItem}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Plus className="w-4 h-4" />
            Acte manuel
          </button>
        </div>
      </div>

      {showCatalog && (
        <div className="border border-green-200 rounded-lg p-4 bg-green-50">
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un acte..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredCatalog.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => addItemFromCatalog(item)}
                className="w-full text-left p-3 bg-white rounded-lg hover:bg-green-100 transition border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                      {item.ccam_code && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono">
                          {item.ccam_code}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{item.price.toFixed(2)}€</p>
                    <p className="text-xs text-green-600">CPAM: {item.cpam_reimbursement.toFixed(2)}€</p>
                  </div>
                </div>
              </button>
            ))}
            {filteredCatalog.length === 0 && (
              <p className="text-center text-slate-500 py-4">Aucun acte trouvé</p>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <p className="text-slate-500">Aucun acte ajouté</p>
          <p className="text-sm text-slate-400 mt-1">Cliquez sur les boutons ci-dessus pour ajouter des actes</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Acte</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Dent</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-600">Qté</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Prix U.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">CPAM U.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Total</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        autoFocus
                        disabled={disabled}
                      />
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.description}</p>
                        {item.ccam_code && (
                          <span className="text-xs text-slate-500 font-mono">{item.ccam_code}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={item.tooth_number || ''}
                      onChange={(e) => updateItem(index, 'tooth_number', e.target.value)}
                      placeholder="Ex: 16"
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm text-right"
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.cpam_reimbursement}
                      onChange={(e) => updateItem(index, 'cpam_reimbursement', Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm text-right"
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-semibold text-slate-900">{item.total.toFixed(2)}€</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={disabled}
                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

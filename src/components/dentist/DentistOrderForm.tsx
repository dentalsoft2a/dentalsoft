import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import DatePicker from '../common/DatePicker';

interface Laboratory {
  laboratory_id: string;
  laboratory_name: string;
  allow_orders: boolean;
  allow_quotes: boolean;
  portal_message: string | null;
}

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  unit_price: number;
  unit: string;
  category: string | null;
}

interface DentistOrderFormProps {
  laboratories: Laboratory[];
}

export default function DentistOrderForm({ laboratories }: DentistOrderFormProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedLab, setSelectedLab] = useState<string>('');
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    prescription_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [orderItems, setOrderItems] = useState<Array<{
    catalog_item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    unit: string;
    shade: string;
    tooth_number: string;
  }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useLockScroll(showModal);

  const availableLabs = laboratories.filter(lab => lab.allow_orders);

  useEffect(() => {
    if (selectedLab) {
      loadCatalog(selectedLab);
    }
  }, [selectedLab]);

  const loadCatalog = async (laboratoryId: string) => {
    setLoadingCatalog(true);
    try {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('user_id', laboratoryId)
        .eq('visible_to_dentists', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCatalogItems(data || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const addItemFromCatalog = (item: CatalogItem) => {
    setOrderItems([...orderItems, {
      catalog_item_id: item.id,
      description: item.description || item.name,
      quantity: 1,
      unit_price: item.unit_price,
      unit: item.unit,
      shade: '',
      tooth_number: ''
    }]);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLab || orderItems.length === 0) return;

    setSubmitting(true);
    try {
      // Find dentist ID linked to this account for the selected lab
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('id')
        .eq('user_id', selectedLab)
        .eq('linked_dentist_account_id', user.id)
        .single();

      if (dentistError || !dentistData) {
        throw new Error('Impossible de trouver votre compte dentiste pour ce laboratoire');
      }

      // Generate delivery number
      const year = new Date().getFullYear();
      const prefix = `BL-${year}-`;

      const { data: lastNote } = await supabase
        .from('delivery_notes')
        .select('delivery_number')
        .eq('user_id', selectedLab)
        .like('delivery_number', `${prefix}%`)
        .order('delivery_number', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastNote) {
        const lastNumber = lastNote.delivery_number.split('-').pop();
        nextNumber = parseInt(lastNumber || '0', 10) + 1;
      }

      const deliveryNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;

      // Create delivery note
      const { error: insertError } = await supabase
        .from('delivery_notes')
        .insert({
          user_id: selectedLab,
          dentist_id: dentistData.id,
          delivery_number: deliveryNumber,
          date: formData.delivery_date,
          prescription_date: formData.prescription_date,
          patient_name: formData.patient_name,
          items: orderItems as any,
          status: 'pending_approval',
          created_by_dentist: true,
          compliance_text: 'Je soussigné certifie que les prothèses dentaires ci-dessus ont été réalisées conformément aux normes en vigueur et aux spécifications du praticien.'
        });

      if (insertError) throw insertError;

      alert('Commande envoyée avec succès ! Le laboratoire va la valider.');
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error submitting order:', error);
      alert(error.message || 'Erreur lors de l\'envoi de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_name: '',
      prescription_date: new Date().toISOString().split('T')[0],
      delivery_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setOrderItems([]);
    setSelectedLab('');
  };

  if (availableLabs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg font-medium mb-2">
            Commandes directes non disponibles
          </p>
          <p className="text-slate-500 text-sm">
            Aucun de vos laboratoires n'a activé cette fonctionnalité
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Commander</h1>
        <p className="text-slate-600 mt-2">Passez une commande directement auprès de vos laboratoires</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 font-medium text-lg"
        >
          <Plus className="w-6 h-6" />
          Nouvelle Commande
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white p-6 border-b border-slate-200 z-10 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-slate-900">Nouvelle commande</h2>
              <p className="text-slate-600 text-sm mt-1">Sélectionnez votre laboratoire et ajoutez des articles</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Laboratory Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Laboratoire <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedLab}
                  onChange={(e) => {
                    setSelectedLab(e.target.value);
                    setOrderItems([]);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">Sélectionner un laboratoire</option>
                  {availableLabs.map((lab) => (
                    <option key={lab.laboratory_id} value={lab.laboratory_id}>
                      {lab.laboratory_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLab && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Patient <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.patient_name}
                        onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                        placeholder="Nom du patient"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <DatePicker
                      value={formData.prescription_date}
                      onChange={(value) => setFormData({ ...formData, prescription_date: value })}
                      label="Date de prescription"
                      required
                      color="primary"
                    />
                  </div>

                  <DatePicker
                    value={formData.delivery_date}
                    onChange={(value) => setFormData({ ...formData, delivery_date: value })}
                    label="Date de livraison souhaitée"
                    required
                    color="cyan"
                  />

                  {/* Catalog Items */}
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Articles disponibles</h3>
                    {loadingCatalog ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : catalogItems.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">
                        Aucun article disponible dans le catalogue
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {catalogItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => addItemFromCatalog(item)}
                            className="text-left p-3 border border-slate-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all"
                          >
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-sm text-slate-600">{item.description}</p>
                            <p className="text-sm text-primary-600 font-medium mt-1">
                              {item.unit_price.toFixed(2)} € / {item.unit}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  {orderItems.length > 0 && (
                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">
                        Articles commandés ({orderItems.length})
                      </h3>
                      <div className="space-y-4">
                        {orderItems.map((item, index) => (
                          <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                            <div className="flex items-start justify-between mb-3">
                              <p className="font-medium text-slate-900">{item.description}</p>
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs text-slate-600 mb-1">Quantité</label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-600 mb-1">Teinte</label>
                                <input
                                  type="text"
                                  value={item.shade}
                                  onChange={(e) => updateItem(index, 'shade', e.target.value)}
                                  placeholder="A2"
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-slate-600 mb-1">N° dent</label>
                                <input
                                  type="text"
                                  value={item.tooth_number}
                                  onChange={(e) => updateItem(index, 'tooth_number', e.target.value)}
                                  placeholder="16"
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || orderItems.length === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg rounded-lg hover:from-primary-700 hover:to-cyan-700 transition disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? 'Envoi...' : 'Envoyer la commande'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

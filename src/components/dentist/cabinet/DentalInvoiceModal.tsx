import { useState, useEffect } from 'react';
import { X, Save, FileText, User, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import InvoiceItemsManager from './InvoiceItemsManager';
import InvoiceSuppliesSelector, { InvoiceSupply } from './InvoiceSuppliesSelector';
import { useInvoiceCalculations, InvoiceItem } from '../../../hooks/useInvoiceCalculations';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  social_security_number: string;
  mutuelle_name: string;
}

interface DentalInvoiceModalProps {
  invoiceId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DentalInvoiceModal({ invoiceId, onClose, onSuccess }: DentalInvoiceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchPatient, setSearchPatient] = useState('');

  const [formData, setFormData] = useState({
    patient_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    mutuelle_part: 0,
    notes: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [supplies, setSupplies] = useState<InvoiceSupply[]>([]);

  const { totals, isValidInvoice } = useInvoiceCalculations(
    items,
    formData.mutuelle_part,
    0
  );

  useEffect(() => {
    loadPatients();
    if (invoiceId) {
      loadInvoice();
    }
  }, [user, invoiceId]);

  const loadPatients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dental_patients')
        .select('id, first_name, last_name, social_security_number, mutuelle_name')
        .eq('dentist_id', user.id)
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadInvoice = async () => {
    if (!invoiceId || !user) return;

    setLoading(true);
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('dental_invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('dentist_id', user.id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: invoiceItems, error: itemsError } = await supabase
        .from('dental_invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;

      const { data: invoiceSupplies, error: suppliesError } = await supabase
        .from('dental_invoice_supplies')
        .select(`
          *,
          resource:dental_resources(name, unit, stock_quantity)
        `)
        .eq('invoice_id', invoiceId);

      if (suppliesError) throw suppliesError;

      setFormData({
        patient_id: invoice.patient_id,
        invoice_date: invoice.invoice_date,
        mutuelle_part: invoice.mutuelle_part,
        notes: invoice.notes || '',
      });

      setItems(
        invoiceItems.map(item => ({
          id: item.id,
          catalog_item_id: item.catalog_item_id,
          description: item.description,
          ccam_code: item.ccam_code,
          tooth_number: item.tooth_number,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cpam_reimbursement: item.cpam_reimbursement,
          total: item.total,
        }))
      );

      if (invoiceSupplies) {
        setSupplies(
          invoiceSupplies.map((s: any) => ({
            id: s.id,
            resource_id: s.resource_id,
            resource_name: s.resource?.name || '',
            quantity: s.quantity,
            unit: s.resource?.unit || '',
            available_stock: s.resource?.stock_quantity || 0,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Erreur lors du chargement de la facture');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    const { count, error } = await supabase
      .from('dental_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('dentist_id', user.id)
      .gte('invoice_date', `${year}-01-01`)
      .lte('invoice_date', `${year}-12-31`);

    if (error) throw error;

    const sequence = String((count || 0) + 1).padStart(4, '0');
    return `${year}${month}-${sequence}`;
  };

  const checkStockAvailability = (): boolean => {
    return supplies.every(supply => supply.quantity <= supply.available_stock);
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'sent' = 'draft') => {
    e.preventDefault();

    if (!user) return;

    if (!formData.patient_id) {
      alert('Veuillez sélectionner un patient');
      return;
    }

    if (!isValidInvoice()) {
      alert('Veuillez ajouter au moins un acte');
      return;
    }

    if (status === 'sent' && !checkStockAvailability()) {
      const confirm = window.confirm(
        'Certaines fournitures ont un stock insuffisant. Voulez-vous continuer quand même ?'
      );
      if (!confirm) return;
    }

    setLoading(true);

    try {
      let invoiceNumber: string;

      if (invoiceId) {
        const { data: existingInvoice } = await supabase
          .from('dental_invoices')
          .select('invoice_number')
          .eq('id', invoiceId)
          .single();

        invoiceNumber = existingInvoice?.invoice_number || await generateInvoiceNumber();
      } else {
        invoiceNumber = await generateInvoiceNumber();
      }

      const invoiceData = {
        dentist_id: user.id,
        patient_id: formData.patient_id,
        invoice_number: invoiceNumber,
        invoice_date: formData.invoice_date,
        subtotal: totals.subtotal,
        tax_rate: totals.tax_rate,
        tax_amount: totals.tax_amount,
        total: totals.total,
        cpam_part: totals.cpam_part,
        mutuelle_part: totals.mutuelle_part,
        patient_part: totals.patient_part,
        paid_amount: 0,
        status,
        notes: formData.notes,
      };

      let finalInvoiceId = invoiceId;

      if (invoiceId) {
        const { error: updateError } = await supabase
          .from('dental_invoices')
          .update(invoiceData)
          .eq('id', invoiceId);

        if (updateError) throw updateError;

        await supabase.from('dental_invoice_items').delete().eq('invoice_id', invoiceId);
        await supabase.from('dental_invoice_supplies').delete().eq('invoice_id', invoiceId);
      } else {
        const { data: newInvoice, error: createError } = await supabase
          .from('dental_invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (createError) throw createError;
        finalInvoiceId = newInvoice.id;
      }

      const itemsData = items.map(item => ({
        invoice_id: finalInvoiceId,
        catalog_item_id: item.catalog_item_id,
        description: item.description,
        ccam_code: item.ccam_code,
        tooth_number: item.tooth_number,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cpam_reimbursement: item.cpam_reimbursement,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('dental_invoice_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      if (supplies.length > 0) {
        const suppliesData = supplies.map(supply => ({
          invoice_id: finalInvoiceId,
          resource_id: supply.resource_id,
          quantity: supply.quantity,
        }));

        const { error: suppliesError } = await supabase
          .from('dental_invoice_supplies')
          .insert(suppliesData);

        if (suppliesError) throw suppliesError;

        if (status === 'sent') {
          for (const supply of supplies) {
            const { data: resource } = await supabase
              .from('dental_resources')
              .select('stock_quantity')
              .eq('id', supply.resource_id)
              .single();

            if (resource) {
              const newStock = resource.stock_quantity - supply.quantity;

              await supabase
                .from('dental_resources')
                .update({ stock_quantity: Math.max(0, newStock) })
                .eq('id', supply.resource_id);

              await supabase
                .from('dental_stock_movements')
                .insert({
                  dentist_id: user.id,
                  resource_id: supply.resource_id,
                  movement_type: 'out',
                  quantity: supply.quantity,
                  notes: `Facture ${invoiceNumber}`,
                });
            }
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Erreur lors de l\'enregistrement de la facture');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.social_security_number?.includes(searchPatient)
  );

  const selectedPatient = patients.find(p => p.id === formData.patient_id);

  const hasInsufficientStock = supplies.some(s => s.quantity > s.available_stock);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {invoiceId ? 'Modifier la Facture' : 'Nouvelle Facture'}
              </h2>
              <p className="text-green-100 text-sm">
                {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Sélectionnez un patient'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'draft')} className="flex-1 overflow-y-auto">
          <div className="p-6">
          {loading && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-blue-900">Chargement...</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Patient *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchPatient}
                  onChange={(e) => setSearchPatient(e.target.value)}
                  placeholder="Rechercher un patient..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              {searchPatient && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  {filteredPatients.map(patient => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, patient_id: patient.id });
                        setSearchPatient('');
                      }}
                      className="w-full text-left p-3 hover:bg-green-50 transition border-b last:border-b-0"
                    >
                      <p className="font-medium text-slate-900">
                        {patient.first_name} {patient.last_name}
                      </p>
                      <div className="flex gap-3 text-xs text-slate-600 mt-1">
                        {patient.social_security_number && (
                          <span>Sécu: {patient.social_security_number}</span>
                        )}
                        {patient.mutuelle_name && (
                          <span>Mutuelle: {patient.mutuelle_name}</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredPatients.length === 0 && (
                    <p className="p-3 text-center text-slate-500 text-sm">Aucun patient trouvé</p>
                  )}
                </div>
              )}
              {selectedPatient && !searchPatient && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-medium text-green-900">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </p>
                  <div className="flex gap-3 text-xs text-green-700 mt-1">
                    {selectedPatient.social_security_number && (
                      <span>Sécu: {selectedPatient.social_security_number}</span>
                    )}
                    {selectedPatient.mutuelle_name && (
                      <span>Mutuelle: {selectedPatient.mutuelle_name}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date de facturation *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <InvoiceItemsManager
              items={items}
              onItemsChange={setItems}
              disabled={loading}
            />

            <InvoiceSuppliesSelector
              supplies={supplies}
              onSuppliesChange={setSupplies}
              disabled={loading}
            />

            <div className="border-t border-slate-200 pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Part Mutuelle (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.mutuelle_part}
                    onChange={(e) => setFormData({ ...formData, mutuelle_part: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Récapitulatif</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Sous-total</span>
                  <span className="font-medium">{totals.subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>TVA ({totals.tax_rate}%)</span>
                  <span className="font-medium">{totals.tax_amount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t">
                  <span>Total</span>
                  <span>{totals.total.toFixed(2)}€</span>
                </div>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-green-700">
                    <span>Part CPAM</span>
                    <span className="font-semibold">{totals.cpam_part.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span>Part Mutuelle</span>
                    <span className="font-semibold">{totals.mutuelle_part.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-orange-700 font-semibold">
                    <span>Reste à charge patient</span>
                    <span>{totals.patient_part.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>

            {hasInsufficientStock && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-900">Stock insuffisant</p>
                  <p className="text-sm text-orange-700">
                    Certaines fournitures dépassent le stock disponible. Elles seront ajustées lors de la validation.
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={loading || !isValidInvoice()}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Enregistrer brouillon
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'sent')}
            disabled={loading || !isValidInvoice()}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Valider et envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Receipt, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  patient_id: string;
  total: number;
  cpam_part: number;
  mutuelle_part: number;
  patient_part: number;
  patient?: {
    first_name: string;
    last_name: string;
  };
}

interface InvoiceItem {
  id: string;
  catalog_item_id: string | null;
  description: string;
  ccam_code: string | null;
  tooth_number: string | null;
  quantity: number;
  unit_price: number;
  cpam_reimbursement: number;
  total: number;
}

interface DentalCreditNoteModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DentalCreditNoteModal({ invoice, onClose, onSuccess }: DentalCreditNoteModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [creditType, setCreditType] = useState<'correction' | 'cancellation' | 'refund'>('correction');

  useEffect(() => {
    loadInvoiceItems();
  }, [invoice.id]);

  const loadInvoiceItems = async () => {
    try {
      const { data, error } = await supabase
        .from('dental_invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading invoice items:', error);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const calculateTotal = () => {
    return items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.size === 0) {
      alert('Veuillez sélectionner au moins un acte à corriger');
      return;
    }

    if (!reason.trim()) {
      alert('Veuillez indiquer le motif de l\'avoir');
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      // Préparer les items pour l'avoir
      const creditNoteItems = items
        .filter(item => selectedItems.has(item.id))
        .map(item => ({
          invoice_item_id: item.id,
          catalog_item_id: item.catalog_item_id,
          description: item.description,
          ccam_code: item.ccam_code,
          tooth_number: item.tooth_number,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cpam_reimbursement: item.cpam_reimbursement,
          total: item.total
        }));

      // Appeler la fonction de création d'avoir
      const { data, error } = await supabase.rpc('create_dental_credit_note', {
        p_dentist_id: user.id,
        p_invoice_id: invoice.id,
        p_reason: reason,
        p_credit_type: creditType,
        p_items: creditNoteItems
      });

      if (error) throw error;

      alert('Avoir créé avec succès !');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating credit note:', error);
      alert('Erreur lors de la création de l\'avoir');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = calculateTotal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Créer un avoir</h2>
              <p className="text-sm text-slate-600">Facture {invoice.invoice_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Informations facture */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Facture d'origine</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>N° {invoice.invoice_number}</p>
                    <p>Date: {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</p>
                    <p>Patient: {invoice.patient?.first_name} {invoice.patient?.last_name}</p>
                    <p>Montant: {invoice.total.toFixed(2)}€</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Type d'avoir */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type d'avoir *
              </label>
              <select
                value={creditType}
                onChange={(e) => setCreditType(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              >
                <option value="correction">Correction (erreur de facturation)</option>
                <option value="cancellation">Annulation (annulation d'acte)</option>
                <option value="refund">Remboursement (geste commercial)</option>
              </select>
            </div>

            {/* Motif */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Motif de l'avoir *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
                placeholder="Décrivez la raison de la création de cet avoir..."
                required
              />
            </div>

            {/* Sélection des actes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Actes à corriger *
              </label>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-600">
                    <div className="col-span-1"></div>
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2">Code CCAM</div>
                    <div className="col-span-1">Dent</div>
                    <div className="col-span-1">Qté</div>
                    <div className="col-span-1">Prix U.</div>
                    <div className="col-span-2">Total</div>
                  </div>
                </div>
                <div className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition ${
                        selectedItems.has(item.id) ? 'bg-red-50' : ''
                      }`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <div className="grid grid-cols-12 gap-2 items-center text-sm">
                        <div className="col-span-1">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                          />
                        </div>
                        <div className="col-span-4 text-slate-900">{item.description}</div>
                        <div className="col-span-2 text-slate-600">{item.ccam_code || '-'}</div>
                        <div className="col-span-1 text-slate-600">{item.tooth_number || '-'}</div>
                        <div className="col-span-1 text-slate-600">{item.quantity}</div>
                        <div className="col-span-1 text-slate-600">{item.unit_price.toFixed(2)}€</div>
                        <div className="col-span-2 font-semibold text-slate-900">{item.total.toFixed(2)}€</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {selectedItems.size} acte(s) sélectionné(s)
              </p>
            </div>

            {/* Total */}
            {selectedItems.size > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Montant de l'avoir</span>
                  <span className="text-2xl font-bold text-red-600">-{totalAmount.toFixed(2)}€</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Ce montant sera déduit de la facture {invoice.invoice_number}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || selectedItems.size === 0 || !reason.trim()}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer l\'avoir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

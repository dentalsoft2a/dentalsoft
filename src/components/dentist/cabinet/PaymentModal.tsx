import { useState } from 'react';
import { X, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface PaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  invoiceId,
  invoiceNumber,
  totalAmount,
  paidAmount,
  onClose,
  onSuccess
}: PaymentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const remainingAmount = totalAmount - paidAmount;

  const [formData, setFormData] = useState({
    amount: remainingAmount,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'card' as 'cash' | 'check' | 'card' | 'transfer' | 'cpam' | 'mutuelle',
    payment_source: 'patient' as 'patient' | 'cpam' | 'mutuelle',
    reference: '',
    notes: '',
  });

  const paymentMethods = [
    { value: 'cash', label: 'Espèces' },
    { value: 'check', label: 'Chèque' },
    { value: 'card', label: 'Carte bancaire' },
    { value: 'transfer', label: 'Virement' },
    { value: 'cpam', label: 'CPAM' },
    { value: 'mutuelle', label: 'Mutuelle' },
  ];

  const paymentSources = [
    { value: 'patient', label: 'Patient' },
    { value: 'cpam', label: 'CPAM' },
    { value: 'mutuelle', label: 'Mutuelle' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (formData.amount <= 0) {
      alert('Le montant doit être supérieur à 0');
      return;
    }

    if (formData.amount > remainingAmount) {
      const confirm = window.confirm(
        `Le montant saisi (${formData.amount.toFixed(2)}€) dépasse le reste à payer (${remainingAmount.toFixed(2)}€). Voulez-vous continuer ?`
      );
      if (!confirm) return;
    }

    setLoading(true);

    try {
      const { error: paymentError } = await supabase
        .from('dental_payments')
        .insert({
          dentist_id: user.id,
          invoice_id: invoiceId,
          payment_date: formData.payment_date,
          amount: formData.amount,
          payment_method: formData.payment_method,
          payment_source: formData.payment_source,
          reference: formData.reference,
          notes: formData.notes,
        });

      if (paymentError) throw paymentError;

      const newPaidAmount = paidAmount + formData.amount;
      let newStatus: string;

      if (newPaidAmount >= totalAmount) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'sent';
      }

      const { error: updateError } = await supabase
        .from('dental_invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Enregistrer un Paiement</h2>
              <p className="text-green-100 text-sm">Facture {invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total facture</p>
                <p className="text-lg font-bold text-slate-900">{totalAmount.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Déjà payé</p>
                <p className="text-lg font-bold text-green-600">{paidAmount.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Reste à payer</p>
                <p className="text-lg font-bold text-orange-600">{remainingAmount.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Montant du paiement (€) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, amount: remainingAmount })}
                className="mt-2 text-sm text-green-600 hover:text-green-700"
              >
                Remplir le montant restant ({remainingAmount.toFixed(2)}€)
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date du paiement *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source du paiement *
                </label>
                <select
                  value={formData.payment_source}
                  onChange={(e) => setFormData({
                    ...formData,
                    payment_source: e.target.value as 'patient' | 'cpam' | 'mutuelle'
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  {paymentSources.map(source => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Méthode de paiement *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({
                    ...formData,
                    payment_method: e.target.value as typeof formData.payment_method
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Référence
                <span className="text-slate-500 font-normal ml-2">
                  (N° chèque, transaction, etc.)
                </span>
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Ex: CHQ123456"
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
                placeholder="Notes optionnelles..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Enregistrer le paiement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

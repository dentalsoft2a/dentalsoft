import { useEffect, useState } from 'react';
import { FileQuestion, ThumbsUp, ThumbsDown, Edit, Euro, Calendar, FileText, Stethoscope, Palette } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface QuoteRequest {
  id: string;
  patient_name: string;
  work_description: string;
  tooth_numbers?: string;
  shade?: string;
  notes?: string;
  requested_delivery_date?: string;
  status: string;
  estimated_price?: number;
  created_at: string;
  dentist_accounts: {
    name: string;
    email: string;
  };
}

export default function QuoteRequestsPage() {
  const { user } = useAuth();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuote, setEditingQuote] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState('');

  useEffect(() => {
    loadQuoteRequests();
  }, [user]);

  const loadQuoteRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('*, dentist_accounts(name, email)')
        .eq('laboratory_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuoteRequests(data || []);
    } catch (error) {
      console.error('Error loading quote requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (quoteId: string, price: number) => {
    if (!price || price <= 0) {
      alert('Veuillez entrer un prix estimatif valide');
      return;
    }

    if (!confirm('Approuver cette demande de devis ?')) return;

    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({
          status: 'approved',
          estimated_price: price
        })
        .eq('id', quoteId);

      if (error) throw error;
      setEditingQuote(null);
      setEstimatedPrice('');
      loadQuoteRequests();
    } catch (error) {
      console.error('Error approving quote:', error);
      alert('Erreur lors de l\'approbation du devis');
    }
  };

  const handleReject = async (quoteId: string) => {
    const reason = prompt('Raison du refus (optionnel):');
    if (reason === null) return;

    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Non spécifié'
        })
        .eq('id', quoteId);

      if (error) throw error;
      loadQuoteRequests();
    } catch (error) {
      console.error('Error rejecting quote:', error);
      alert('Erreur lors du rejet du devis');
    }
  };

  const pendingQuotes = quoteRequests.filter(q => q.status === 'pending');
  const processedQuotes = quoteRequests.filter(q => q.status !== 'pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">En attente</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Approuvé</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">Rejeté</span>;
      case 'converted':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">Converti</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">
            Demandes de devis
          </h1>
          <p className="text-slate-600 mt-3 text-lg">Gérez les demandes de devis de vos dentistes</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Chargement...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingQuotes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                      <FileQuestion className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-amber-900">En attente de réponse</h2>
                      <p className="text-sm text-amber-700">{pendingQuotes.length} demande(s) à traiter</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {pendingQuotes.map((quote) => (
                    <div key={quote.id} className="border-2 border-amber-200 rounded-xl p-5 bg-gradient-to-br from-white to-amber-50/30">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg mb-1">
                            Patient: {quote.patient_name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            Demandé par: {quote.dentist_accounts.name} ({quote.dentist_accounts.email})
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(quote.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {getStatusBadge(quote.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-1">Description</p>
                              <p className="text-sm text-slate-900">{quote.work_description}</p>
                            </div>
                          </div>
                        </div>

                        {quote.tooth_numbers && (
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <div className="flex items-start gap-2">
                              <Stethoscope className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">Dents</p>
                                <p className="text-sm text-slate-900 font-medium">{quote.tooth_numbers}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {quote.shade && (
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <div className="flex items-start gap-2">
                              <Palette className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">Teinte</p>
                                <p className="text-sm text-slate-900 font-medium">{quote.shade}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {quote.requested_delivery_date && (
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">Date souhaitée</p>
                                <p className="text-sm text-slate-900">
                                  {new Date(quote.requested_delivery_date).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {quote.notes && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-4">
                          <p className="text-xs font-semibold text-slate-600 mb-1">Notes</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                        {editingQuote === quote.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Prix estimatif (€)
                              </label>
                              <input
                                type="number"
                                value={estimatedPrice}
                                onChange={(e) => setEstimatedPrice(e.target.value)}
                                placeholder="150.00"
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={() => handleApprove(quote.id, parseFloat(estimatedPrice))}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => {
                                setEditingQuote(null);
                                setEstimatedPrice('');
                              }}
                              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingQuote(quote.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                              <ThumbsUp className="w-4 h-4" />
                              Approuver avec prix
                            </button>
                            <button
                              onClick={() => handleReject(quote.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                              <ThumbsDown className="w-4 h-4" />
                              Rejeter
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {processedQuotes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-bold text-slate-900">Historique</h2>
                </div>
                <div className="p-6 space-y-3">
                  {processedQuotes.map((quote) => (
                    <div key={quote.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{quote.patient_name}</h3>
                            {getStatusBadge(quote.status)}
                          </div>
                          <p className="text-sm text-slate-600">{quote.work_description}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {quote.estimated_price && (
                          <div className="text-right">
                            <p className="text-xs text-slate-600">Prix estimé</p>
                            <p className="text-lg font-bold text-green-600">{quote.estimated_price.toFixed(2)} €</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingQuotes.length === 0 && processedQuotes.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 text-center">
                <FileQuestion className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Aucune demande de devis pour le moment</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

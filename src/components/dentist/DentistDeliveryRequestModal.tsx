import { useState, useEffect } from 'react';
import { X, Send, CheckCircle, ClipboardList, Calendar as CalendarIcon, FileQuestion, ShoppingCart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LaboratorySelector from './LaboratorySelector';

interface DentistDeliveryRequestModalProps {
  onClose: () => void;
  dentistId: string;
}

export default function DentistDeliveryRequestModal({ onClose, dentistId }: DentistDeliveryRequestModalProps) {
  const { user } = useAuth();
  const [selectedLab, setSelectedLab] = useState('');
  const [patientName, setPatientName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [toothNumbers, setToothNumbers] = useState('');
  const [shade, setShade] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labSettings, setLabSettings] = useState<any>(null);
  const [requestType, setRequestType] = useState<'order' | 'quote'>('order');

  useEffect(() => {
    if (selectedLab) {
      loadLabSettings();
    }
  }, [selectedLab]);

  const loadLabSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('allow_dentist_orders, allow_dentist_quote_requests')
        .eq('id', selectedLab)
        .maybeSingle();

      if (error) throw error;
      setLabSettings(data);

      // Set default request type based on lab settings
      if (data) {
        if (data.allow_dentist_orders && !data.allow_dentist_quote_requests) {
          setRequestType('order');
        } else if (!data.allow_dentist_orders && data.allow_dentist_quote_requests) {
          setRequestType('quote');
        }
      }
    } catch (error) {
      console.error('Error loading lab settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLab || !patientName || !workDescription) return;

    setLoading(true);
    setError(null);

    try {
      console.log('=== Debug: Checking dentist link ===');
      console.log('User ID (dentist account):', user.id);
      console.log('Selected Lab ID:', selectedLab);

      const { data: allDentists, error: allError } = await supabase
        .from('dentists')
        .select('*')
        .eq('user_id', selectedLab);

      console.log('All dentists for this lab:', allDentists);

      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('id, user_id, linked_dentist_account_id')
        .eq('user_id', selectedLab)
        .eq('linked_dentist_account_id', user.id)
        .maybeSingle();

      console.log('Dentist data found:', dentistData);
      console.log('Dentist error:', dentistError);

      if (dentistError) throw dentistError;

      if (!dentistData) {
        console.error('No matching dentist record found');
        setError('Vous n\'êtes pas autorisé à commander auprès de ce laboratoire. Veuillez contacter le laboratoire pour qu\'il vous ajoute à sa liste de dentistes.');
        setLoading(false);
        return;
      }

      // Check if request type is allowed
      if (requestType === 'order' && labSettings && !labSettings.allow_dentist_orders) {
        setError('Ce laboratoire n\'accepte pas les commandes directes pour le moment');
        setLoading(false);
        return;
      }

      if (requestType === 'quote' && labSettings && !labSettings.allow_dentist_quote_requests) {
        setError('Ce laboratoire n\'accepte pas les demandes de devis pour le moment');
        setLoading(false);
        return;
      }

      const { data: lastDeliveryNote, error: lastError } = await supabase
        .from('delivery_notes')
        .select('delivery_number')
        .eq('user_id', selectedLab)
        .order('delivery_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastDeliveryNote?.delivery_number) {
        const match = lastDeliveryNote.delivery_number.match(/DENT-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      // Handle quote request
      if (requestType === 'quote') {
        const { data: quoteRequest, error: insertError } = await supabase
          .from('quote_requests')
          .insert({
            laboratory_id: selectedLab,
            dentist_account_id: user.id,
            dentist_id: dentistData.id,
            patient_name: patientName,
            work_description: workDescription,
            tooth_numbers: toothNumbers || null,
            shade: shade || null,
            notes: notes || null,
            requested_delivery_date: requestedDeliveryDate || null,
            status: 'pending'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        if (!quoteRequest) {
          throw new Error('Failed to create quote request');
        }

        // Note: Notification removed - dentists don't need to notify themselves
        // The laboratory will see the new quote request in their interface

        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
        return;
      }

      // Handle direct order with retry logic for duplicate numbers
      let deliveryNumber = `DENT-${nextNumber.toString().padStart(6, '0')}`;
      let deliveryNote: any = null;
      let insertError: any = null;
      let retryCount = 0;
      const maxRetries = 5;

      // Try to insert with retry logic in case of duplicate
      while (retryCount < maxRetries && !deliveryNote) {
        const result = await supabase
          .rpc('insert_delivery_note_for_dentist', {
            p_user_id: selectedLab,
            p_dentist_id: dentistData.id,
            p_delivery_number: deliveryNumber,
            p_patient_name: patientName,
            p_date: requestedDeliveryDate || new Date().toISOString().split('T')[0],
            p_status: 'pending_approval',
            p_notes: notes || null,
            p_work_description: workDescription,
            p_tooth_numbers: toothNumbers || null,
            p_shade: shade || null
          });

        if (result.error) {
          insertError = result.error;
          // If duplicate key error, increment the number and retry
          if (result.error.code === '23505' && retryCount < maxRetries - 1) {
            nextNumber++;
            deliveryNumber = `DENT-${nextNumber.toString().padStart(6, '0')}`;
            retryCount++;
            console.log(`Duplicate detected, retrying with ${deliveryNumber} (attempt ${retryCount + 1}/${maxRetries})`);
          } else {
            break;
          }
        } else {
          deliveryNote = result.data;
          insertError = null;
          break;
        }
      }

      if (insertError) {
        console.error('Insert error after retries:', insertError);
        throw insertError;
      }

      if (!deliveryNote) {
        throw new Error('Failed to create delivery note after multiple attempts');
      }

      // Note: Notification removed - dentists don't need to notify themselves
      // The laboratory will see the new delivery request in their interface

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating delivery request:', error);
      setError(error.message || 'Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Nouvelle demande</h2>
              <p className="text-sm text-slate-600">Créer un bon de livraison</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {success ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Demande envoyée !</h3>
            <p className="text-slate-600">Le laboratoire a reçu votre demande et vous répondra prochainement</p>
          </div>
        ) : (
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {labSettings && selectedLab && (
              <>
                {!labSettings.allow_dentist_orders && !labSettings.allow_dentist_quote_requests && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      Ce laboratoire n'accepte aucune demande en ligne pour le moment. Veuillez les contacter directement.
                    </p>
                  </div>
                )}

                {(labSettings.allow_dentist_orders || labSettings.allow_dentist_quote_requests) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Type de demande *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {labSettings.allow_dentist_orders && (
                        <button
                          type="button"
                          onClick={() => setRequestType('order')}
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                            requestType === 'order'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            requestType === 'order' ? 'bg-blue-500' : 'bg-slate-200'
                          }`}>
                            <ShoppingCart className={`w-5 h-5 ${
                              requestType === 'order' ? 'text-white' : 'text-slate-600'
                            }`} />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-slate-900">Commande directe</div>
                            <div className="text-xs text-slate-600">Créer un bon de livraison</div>
                          </div>
                        </button>
                      )}

                      {labSettings.allow_dentist_quote_requests && (
                        <button
                          type="button"
                          onClick={() => setRequestType('quote')}
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                            requestType === 'quote'
                              ? 'border-cyan-500 bg-cyan-50 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            requestType === 'quote' ? 'bg-cyan-500' : 'bg-slate-200'
                          }`}>
                            <FileQuestion className={`w-5 h-5 ${
                              requestType === 'quote' ? 'text-white' : 'text-slate-600'
                            }`} />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-slate-900">Demande de devis</div>
                            <div className="text-xs text-slate-600">Obtenir un prix estimatif</div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {dentistId && (
                <LaboratorySelector
                  value={selectedLab}
                  onChange={setSelectedLab}
                  dentistId={dentistId}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom et prénom du patient *
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Jean Dupont"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description du travail *
                </label>
                <textarea
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  rows={3}
                  placeholder="Couronne céramo-métallique, bridge, inlay..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Numéros de dents
                  </label>
                  <input
                    type="text"
                    value={toothNumbers}
                    onChange={(e) => setToothNumbers(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="11, 12, 13"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Teinte
                  </label>
                  <input
                    type="text"
                    value={shade}
                    onChange={(e) => setShade(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="A2, B1..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date de livraison souhaitée
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={requestedDeliveryDate}
                    onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                    min={getTodayDate()}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  />
                  <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes additionnelles
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  rows={3}
                  placeholder="Informations complémentaires..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || (labSettings && !labSettings.allow_dentist_orders && !labSettings.allow_dentist_quote_requests)}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              >
                <Send className="w-5 h-5" />
                {loading ? 'Envoi en cours...' : requestType === 'quote' ? 'Envoyer la demande de devis' : 'Envoyer la demande'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

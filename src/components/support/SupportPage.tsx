import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

interface SupportMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);

      const subscription = supabase
        .channel(`ticket_${selectedTicket.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`
        }, () => {
          loadMessages(selectedTicket.id);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tickets:', error);
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const createTicket = async () => {
    if (!user || !newTicket.subject.trim() || !newTicket.message.trim()) return;

    setSending(true);

    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: newTicket.subject,
        priority: newTicket.priority,
        status: 'open'
      })
      .select()
      .single();

    if (ticketError) {
      alert('Erreur lors de la création: ' + ticketError.message);
      setSending(false);
      return;
    }

    const { error: messageError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketData.id,
        sender_id: user.id,
        message: newTicket.message,
        is_admin: false
      });

    if (messageError) {
      alert('Erreur lors de l\'envoi: ' + messageError.message);
    } else {
      setNewTicket({ subject: '', message: '', priority: 'medium' });
      setShowNewTicketForm(false);
      loadTickets();
    }

    setSending(false);
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || !selectedTicket) return;

    setSending(true);

    const { error } = await supabase.from('support_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      message: newMessage,
      is_admin: false
    });

    if (error) {
      alert('Erreur lors de l\'envoi: ' + error.message);
    } else {
      setNewMessage('');
      loadMessages(selectedTicket.id);
    }

    setSending(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-orange-100 text-orange-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'closed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Ouvert';
      case 'in_progress': return 'En cours';
      case 'closed': return 'Fermé';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return Clock;
      case 'in_progress': return MessageSquare;
      case 'closed': return CheckCircle;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Support</h1>
          <p className="text-slate-600">Contactez notre équipe pour toute question ou assistance</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 h-[600px]">
          <div className="md:col-span-1 bg-white rounded-xl shadow-lg border border-slate-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Mes tickets</h3>
              <button
                onClick={() => setShowNewTicketForm(true)}
                className="p-2 bg-gradient-to-r from-primary-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {tickets.map((ticket) => {
                const StatusIcon = getStatusIcon(ticket.status);
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`
                      w-full text-left p-4 rounded-lg border transition-all
                      ${selectedTicket?.id === ticket.id
                        ? 'bg-gradient-to-br from-primary-50 to-cyan-50 border-primary-500 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <StatusIcon className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{ticket.subject}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </button>
                );
              })}

              {tickets.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm">Aucun ticket de support</p>
                  <button
                    onClick={() => setShowNewTicketForm(true)}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-primary-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                  >
                    Créer un ticket
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col">
            {showNewTicketForm ? (
              <div className="flex-1 flex flex-col p-6">
                <h3 className="font-bold text-slate-900 mb-4">Nouveau ticket de support</h3>

                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sujet
                    </label>
                    <input
                      type="text"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      placeholder="Décrivez brièvement votre problème"
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Priorité
                    </label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    >
                      <option value="low">Basse</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Élevée</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={newTicket.message}
                      onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                      placeholder="Décrivez votre problème en détail..."
                      rows={8}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowNewTicketForm(false)}
                    className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createTicket}
                    disabled={sending || !newTicket.subject.trim() || !newTicket.message.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {sending ? 'Création...' : 'Créer le ticket'}
                  </button>
                </div>
              </div>
            ) : selectedTicket ? (
              <>
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-1">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusLabel(selectedTicket.status)}
                    </span>
                    <span className="text-xs text-slate-500">
                      Créé le {new Date(selectedTicket.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          msg.is_admin
                            ? 'bg-slate-100 text-slate-900'
                            : 'bg-gradient-to-br from-primary-500 to-cyan-500 text-white'
                        }`}
                      >
                        {msg.is_admin && (
                          <p className="text-xs font-medium text-primary-600 mb-2">Support DentalSoft</p>
                        )}
                        <p className="text-sm mb-2">{msg.message}</p>
                        <p className={`text-xs ${msg.is_admin ? 'text-slate-500' : 'text-white/80'}`}>
                          {new Date(msg.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 border-t border-slate-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Votre message..."
                        className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-primary-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                        {sending ? 'Envoi...' : 'Envoyer'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p>Sélectionnez un ticket pour voir la conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

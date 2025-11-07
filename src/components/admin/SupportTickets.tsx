import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  user_profiles: {
    email: string;
  };
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_profiles: {
    email: string;
  };
}

export function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    const { data: ticketsData, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tickets:', error);
      setLoading(false);
      return;
    }

    const ticketsWithProfiles = await Promise.all(
      (ticketsData || []).map(async (ticket) => {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', ticket.user_id)
          .single();

        return {
          ...ticket,
          user_profiles: { email: profile?.email || 'Unknown' }
        };
      })
    );

    setTickets(ticketsWithProfiles);
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const { data: messagesData, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const messagesWithProfiles = await Promise.all(
      (messagesData || []).map(async (message) => {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', message.sender_id)
          .maybeSingle();

        return {
          ...message,
          user_profiles: { email: profile?.email || 'Unknown' }
        };
      })
    );

    setMessages(messagesWithProfiles);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSending(true);

    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      setSending(false);
      return;
    }

    const { error } = await supabase.from('support_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: user.data.user.id,
      message: newMessage,
      is_admin: true
    });

    if (error) {
      alert('Erreur lors de l\'envoi: ' + error.message);
    } else {
      setNewMessage('');
      loadMessages(selectedTicket.id);

      await supabase.from('support_tickets').update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      }).eq('id', selectedTicket.id);

      loadTickets();
    }

    setSending(false);
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      alert('Erreur lors de la mise à jour: ' + error.message);
    } else {
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }

      await supabase.from('admin_audit_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'update_ticket_status',
        details: { ticket_id: ticketId, new_status: status }
      });

      await loadTickets();
    }
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'Élevée';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 h-[600px]">
      <div className="md:col-span-1 bg-slate-50 rounded-lg p-4 overflow-y-auto">
        <h3 className="font-bold text-slate-900 mb-4">Tickets de support</h3>
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className={`
                w-full text-left p-4 rounded-lg border transition-all
                ${selectedTicket?.id === ticket.id
                  ? 'bg-white border-primary-500 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{ticket.subject}</p>
                  <p className="text-xs text-slate-500 truncate">{ticket.user_profiles.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                  {getStatusLabel(ticket.status)}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                  {getPriorityLabel(ticket.priority)}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </button>
          ))}

          {tickets.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              Aucun ticket de support
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-2 bg-white rounded-lg border border-slate-200 flex flex-col">
        {selectedTicket ? (
          <>
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{selectedTicket.subject}</h3>
                  <p className="text-sm text-slate-600">{selectedTicket.user_profiles.email}</p>
                </div>
                <div className="flex gap-2">
                  {selectedTicket.status !== 'closed' && (
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                    >
                      Fermer
                    </button>
                  )}
                  {selectedTicket.status === 'closed' && (
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'open')}
                      className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      Réouvrir
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                  {getStatusLabel(selectedTicket.status)}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                  {getPriorityLabel(selectedTicket.priority)}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      msg.is_admin
                        ? 'bg-gradient-to-br from-primary-500 to-cyan-500 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="text-sm mb-2">{msg.message}</p>
                    <p className={`text-xs ${msg.is_admin ? 'text-white/80' : 'text-slate-500'}`}>
                      {new Date(msg.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Votre message..."
                  disabled={selectedTicket.status === 'closed'}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-slate-100"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim() || selectedTicket.status === 'closed'}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {sending ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
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
  );
}

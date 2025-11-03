import { useEffect, useState } from 'react';
import { MessageSquare, Plus, Search, ThumbsUp, Eye, CheckCircle, Pin, ArrowLeft, Trash2, Lock, Unlock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type HelpTopic = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  views_count: number;
  is_pinned: boolean;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    laboratory_name: string;
  };
  replies_count?: number;
  votes_count?: number;
  user_vote?: string | null;
};

type HelpReply = {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    laboratory_name: string;
  };
  votes_count?: number;
  user_vote?: string | null;
};

export default function HelpCenterPage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [replies, setReplies] = useState<HelpReply[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState('general');
  const [newReplyContent, setNewReplyContent] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    loadTopics();
    checkSuperAdmin();
  }, [user]);

  const checkSuperAdmin = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setIsSuperAdmin(data?.role === 'super_admin');
    } catch (error) {
      console.error('Error checking super admin:', error);
    }
  };

  const loadTopics = async () => {
    if (!user) return;

    try {
      const { data: topicsData, error: topicsError } = await supabase
        .from('help_topics')
        .select('*, profiles!help_topics_user_id_fkey(first_name, last_name, laboratory_name)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (topicsError) throw topicsError;

      const topicsWithCounts = await Promise.all(
        (topicsData || []).map(async (topic) => {
          const { count: repliesCount } = await supabase
            .from('help_replies')
            .select('id', { count: 'exact', head: true })
            .eq('topic_id', topic.id);

          const { data: votesData } = await supabase
            .from('help_votes')
            .select('vote_type')
            .eq('topic_id', topic.id);

          const votesCount = (votesData || []).reduce((acc, vote) => {
            return acc + (vote.vote_type === 'up' ? 1 : -1);
          }, 0);

          const { data: userVote } = await supabase
            .from('help_votes')
            .select('vote_type')
            .eq('topic_id', topic.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            ...topic,
            replies_count: repliesCount || 0,
            votes_count: votesCount,
            user_vote: userVote?.vote_type || null,
          };
        })
      );

      setTopics(topicsWithCounts);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (topicId: string) => {
    if (!user) return;

    try {
      const { data: repliesData, error } = await supabase
        .from('help_replies')
        .select('*, profiles!help_replies_user_id_fkey(first_name, last_name, laboratory_name)')
        .eq('topic_id', topicId)
        .order('is_solution', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const repliesWithVotes = await Promise.all(
        (repliesData || []).map(async (reply) => {
          const { data: votesData } = await supabase
            .from('help_votes')
            .select('vote_type')
            .eq('reply_id', reply.id);

          const votesCount = (votesData || []).reduce((acc, vote) => {
            return acc + (vote.vote_type === 'up' ? 1 : -1);
          }, 0);

          const { data: userVote } = await supabase
            .from('help_votes')
            .select('vote_type')
            .eq('reply_id', reply.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            ...reply,
            votes_count: votesCount,
            user_vote: userVote?.vote_type || null,
          };
        })
      );

      setReplies(repliesWithVotes);
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from('help_topics').insert({
        user_id: user.id,
        title: newTopicTitle,
        content: newTopicContent,
        category: newTopicCategory,
      });

      if (error) throw error;

      setNewTopicTitle('');
      setNewTopicContent('');
      setNewTopicCategory('general');
      setShowNewTopicModal(false);
      await loadTopics();
    } catch (error) {
      console.error('Error creating topic:', error);
      alert('Erreur lors de la création du sujet');
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTopic) return;

    try {
      const { error } = await supabase.from('help_replies').insert({
        topic_id: selectedTopic.id,
        user_id: user.id,
        content: newReplyContent,
      });

      if (error) throw error;

      setNewReplyContent('');
      await loadReplies(selectedTopic.id);
      await loadTopics();
    } catch (error) {
      console.error('Error creating reply:', error);
      alert('Erreur lors de la création de la réponse');
    }
  };

  const handleVote = async (targetId: string, targetType: 'topic' | 'reply', voteType: 'up' | 'down') => {
    if (!user) return;

    try {
      const table = 'help_votes';
      const column = targetType === 'topic' ? 'topic_id' : 'reply_id';

      const { data: existingVote } = await supabase
        .from(table)
        .select('id, vote_type')
        .eq(column, targetId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          await supabase.from(table).delete().eq('id', existingVote.id);
        } else {
          await supabase
            .from(table)
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
        }
      } else {
        await supabase.from(table).insert({
          user_id: user.id,
          [column]: targetId,
          vote_type: voteType,
        });
      }

      if (selectedTopic) {
        await loadReplies(selectedTopic.id);
      }
      await loadTopics();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleMarkAsSolution = async (replyId: string) => {
    if (!user || !selectedTopic) return;

    try {
      await supabase
        .from('help_replies')
        .update({ is_solution: false })
        .eq('topic_id', selectedTopic.id);

      await supabase
        .from('help_replies')
        .update({ is_solution: true })
        .eq('id', replyId);

      await supabase
        .from('help_topics')
        .update({ status: 'resolved' })
        .eq('id', selectedTopic.id);

      await loadReplies(selectedTopic.id);
      await loadTopics();
    } catch (error) {
      console.error('Error marking solution:', error);
    }
  };

  const handleViewTopic = async (topic: HelpTopic) => {
    setSelectedTopic(topic);
    await loadReplies(topic.id);

    await supabase
      .from('help_topics')
      .update({ views_count: topic.views_count + 1 })
      .eq('id', topic.id);
  };

  const handleTogglePin = async (topicId: string, currentPinned: boolean) => {
    if (!isSuperAdmin) return;

    try {
      await supabase
        .from('help_topics')
        .update({ is_pinned: !currentPinned })
        .eq('id', topicId);

      await loadTopics();
      if (selectedTopic?.id === topicId) {
        setSelectedTopic({ ...selectedTopic, is_pinned: !currentPinned });
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleChangeStatus = async (topicId: string, newStatus: string) => {
    if (!isSuperAdmin) return;

    try {
      await supabase
        .from('help_topics')
        .update({ status: newStatus })
        .eq('id', topicId);

      await loadTopics();
      if (selectedTopic?.id === topicId) {
        setSelectedTopic({ ...selectedTopic, status: newStatus });
      }
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce sujet ?')) return;

    try {
      await supabase
        .from('help_topics')
        .delete()
        .eq('id', topicId);

      await loadTopics();
      if (selectedTopic?.id === topicId) {
        setSelectedTopic(null);
        setReplies([]);
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réponse ?')) return;

    try {
      await supabase
        .from('help_replies')
        .delete()
        .eq('id', replyId);

      if (selectedTopic) {
        await loadReplies(selectedTopic.id);
        await loadTopics();
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch =
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || topic.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || topic.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-blue-50 text-blue-700 border border-blue-200',
      resolved: 'bg-green-50 text-green-700 border border-green-200',
      closed: 'bg-slate-50 text-slate-600 border border-slate-200',
    };
    const labels = {
      open: 'Ouvert',
      resolved: 'Résolu',
      closed: 'Fermé',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const styles = {
      general: 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/30',
      billing: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30',
      technical: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/30',
      feature: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30',
    };
    const labels = {
      general: 'Général',
      billing: 'Facturation',
      technical: 'Technique',
      feature: 'Fonctionnalité',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[category as keyof typeof styles]}`}>
        {labels[category as keyof typeof labels]}
      </span>
    );
  };

  const getCategoryColors = (category: string) => {
    const colors = {
      general: {
        gradient: 'from-slate-500 to-slate-600',
        light: 'from-slate-50 to-slate-100',
        border: 'border-slate-200',
        shadow: 'shadow-slate-500/10'
      },
      billing: {
        gradient: 'from-amber-500 to-orange-500',
        light: 'from-amber-50 to-orange-50',
        border: 'border-amber-200',
        shadow: 'shadow-amber-500/10'
      },
      technical: {
        gradient: 'from-blue-500 to-cyan-500',
        light: 'from-blue-50 to-cyan-50',
        border: 'border-blue-200',
        shadow: 'shadow-blue-500/10'
      },
      feature: {
        gradient: 'from-teal-500 to-emerald-500',
        light: 'from-teal-50 to-emerald-50',
        border: 'border-teal-200',
        shadow: 'shadow-teal-500/10'
      }
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  if (selectedTopic) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => {
              setSelectedTopic(null);
              setReplies([]);
            }}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Retour aux sujets</span>
          </button>
          <div className="bg-gradient-to-br from-primary-50 to-cyan-50 rounded-2xl p-8 border border-primary-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                {selectedTopic.is_pinned && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold border border-amber-200">
                    <Pin className="w-4 h-4" />
                    Épinglé
                  </div>
                )}
              </div>
              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePin(selectedTopic.id, selectedTopic.is_pinned)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white border border-amber-300 text-amber-700 rounded-lg transition-all duration-200 font-medium text-sm"
                  >
                    {selectedTopic.is_pinned ? <Unlock className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    {selectedTopic.is_pinned ? 'Désépingler' : 'Épingler'}
                  </button>
                  <select
                    value={selectedTopic.status}
                    onChange={(e) => handleChangeStatus(selectedTopic.id, e.target.value)}
                    className="px-3 py-1.5 bg-white/80 hover:bg-white border border-slate-300 rounded-lg font-medium text-sm transition-all"
                  >
                    <option value="open">Ouvert</option>
                    <option value="resolved">Résolu</option>
                    <option value="closed">Fermé</option>
                  </select>
                  <button
                    onClick={() => handleDeleteTopic(selectedTopic.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 rounded-lg transition-all duration-200 font-medium text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              )}
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">{selectedTopic.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {selectedTopic.profiles?.first_name?.charAt(0).toUpperCase()}{selectedTopic.profiles?.last_name?.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold">{selectedTopic.profiles?.first_name} {selectedTopic.profiles?.last_name}</span>
              </div>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{new Date(selectedTopic.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="text-slate-400">•</span>
              {getStatusBadge(selectedTopic.status)}
              {getCategoryBadge(selectedTopic.category)}
              <span className="flex items-center gap-1.5 text-slate-600 bg-white/60 px-3 py-1 rounded-full">
                <Eye className="w-4 h-4" />
                <span className="font-medium">{selectedTopic.views_count}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 hover:shadow-md transition-shadow">
          <div className="prose prose-slate max-w-none mb-6">
            <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap">{selectedTopic.content}</p>
          </div>
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleVote(selectedTopic.id, 'topic', 'up')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                selectedTopic.user_vote === 'up'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 scale-105'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{selectedTopic.votes_count || 0}</span>
            </button>
            <span className="text-sm text-slate-500">Utile</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-slate-900">
              {replies.length} {replies.length > 1 ? 'Réponses' : 'Réponse'}
            </h2>
          </div>
          {replies.map((reply) => (
            <div
              key={reply.id}
              className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 ${
                reply.is_solution ? 'border-green-300 ring-2 ring-green-100 bg-green-50/30' : 'border-slate-200'
              }`}
            >
              {reply.is_solution && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl font-semibold mb-4 shadow-lg shadow-green-500/20">
                  <CheckCircle className="w-5 h-5" />
                  Solution acceptée
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {reply.profiles?.first_name?.charAt(0).toUpperCase()}{reply.profiles?.last_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">{reply.profiles?.first_name} {reply.profiles?.last_name}</span>
                    <span className="text-slate-500 text-xs">{new Date(reply.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTopic.user_id === user?.id && !reply.is_solution && (
                    <button
                      onClick={() => handleMarkAsSolution(reply.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 border border-green-200 rounded-lg font-medium transition-all duration-200"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marquer comme solution
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleDeleteReply(reply.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg font-medium transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap mb-4 text-base">{reply.content}</p>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleVote(reply.id, 'reply', 'up')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    reply.user_vote === 'up'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-500/20'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{reply.votes_count || 0}</span>
                </button>
                <span className="text-xs text-slate-500">Utile</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            Ajouter une réponse
          </h3>
          <form onSubmit={handleCreateReply}>
            <textarea
              value={newReplyContent}
              onChange={(e) => setNewReplyContent(e.target.value)}
              placeholder="Partagez votre solution ou vos idées pour aider..."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none min-h-32 text-base transition-all"
              required
            />
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
              >
                Publier la réponse
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="bg-gradient-to-br from-primary-50 via-cyan-50 to-teal-50 rounded-2xl p-8 border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Centre d'aide</h1>
              <p className="text-slate-600 text-lg">Posez vos questions et aidez la communauté 👫</p>
            </div>
            <button
              onClick={() => setShowNewTopicModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-xl hover:scale-105 transition-all duration-200 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Nouveau sujet
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un sujet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white text-base transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium text-sm transition-all"
            >
              <option value="all">Toutes les catégories</option>
              <option value="general">Général</option>
              <option value="billing">Facturation</option>
              <option value="technical">Technique</option>
              <option value="feature">Fonctionnalité</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium text-sm transition-all"
            >
              <option value="all">Tous les statuts</option>
              <option value="open">Ouvert</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-slate-600 mt-4">Chargement...</p>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Aucun sujet trouvé</p>
            <p className="text-slate-500 text-sm mt-2">Soyez le premier à poser une question !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {filteredTopics.map((topic) => {
              const categoryColors = getCategoryColors(topic.category);
              return (
              <div
                key={topic.id}
                className={`bg-gradient-to-br ${categoryColors.light} border ${categoryColors.border} rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${categoryColors.shadow} hover:scale-[1.02] group relative`}
              >
                {isSuperAdmin && (
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(topic.id, topic.is_pinned);
                      }}
                      className="p-1.5 bg-white/90 hover:bg-white border border-amber-300 text-amber-700 rounded-lg transition-all duration-200 shadow-sm"
                    >
                      {topic.is_pinned ? <Unlock className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTopic(topic.id);
                      }}
                      className="p-1.5 bg-white/90 hover:bg-white border border-red-300 text-red-700 rounded-lg transition-all duration-200 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex flex-col h-full" onClick={() => handleViewTopic(topic)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(topic.category)}
                      {topic.is_pinned && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg text-xs font-semibold shadow-md">
                          <Pin className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    {getStatusBadge(topic.status)}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                    {topic.title}
                  </h3>

                  <p className="text-slate-700 text-sm mb-4 line-clamp-3 leading-relaxed flex-grow">{topic.content}</p>

                  <div className="space-y-3 pt-3 border-t border-slate-200/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 bg-gradient-to-br ${categoryColors.gradient} rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                          {topic.profiles?.first_name?.charAt(0).toUpperCase()}{topic.profiles?.last_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 text-sm block">
                            {topic.profiles?.first_name} {topic.profiles?.last_name}
                          </span>
                          <span className="text-slate-500 text-xs">{new Date(topic.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(topic.id, 'topic', 'up');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 font-semibold text-sm ${
                          topic.user_vote === 'up'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                            : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{topic.votes_count || 0}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-slate-700 bg-white/80 px-3 py-1.5 rounded-lg font-medium text-sm border border-slate-200">
                        <MessageSquare className="w-4 h-4" />
                        {topic.replies_count}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-700 bg-white/80 px-3 py-1.5 rounded-lg font-medium text-sm border border-slate-200">
                        <Eye className="w-4 h-4" />
                        {topic.views_count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {showNewTopicModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-cyan-50">
              <h2 className="text-3xl font-bold text-slate-900">Nouveau sujet</h2>
              <p className="text-slate-600 mt-2">Partagez votre question avec la communauté</p>
            </div>
            <form onSubmit={handleCreateTopic} className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Titre</label>
                  <input
                    type="text"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    placeholder="Résumez votre question en quelques mots..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-base transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Catégorie</label>
                  <select
                    value={newTopicCategory}
                    onChange={(e) => setNewTopicCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-base font-medium transition-all"
                  >
                    <option value="general">Général</option>
                    <option value="billing">Facturation</option>
                    <option value="technical">Technique</option>
                    <option value="feature">Fonctionnalité</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Description</label>
                  <textarea
                    value={newTopicContent}
                    onChange={(e) => setNewTopicContent(e.target.value)}
                    placeholder="Décrivez votre problème ou votre question en détail..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none min-h-48 text-base transition-all"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTopicModal(false);
                    setNewTopicTitle('');
                    setNewTopicContent('');
                    setNewTopicCategory('general');
                  }}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
                >
                  Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

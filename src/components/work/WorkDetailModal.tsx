import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X, Save, Check, Clock, User, Calendar, AlertTriangle,
  MessageSquare, Send, Trash2, CheckCircle, Circle, Play, Pause
} from 'lucide-react';
import DatePicker from '../common/DatePicker';
import CustomSelect from '../common/CustomSelect';

interface WorkStage {
  id: string;
  name: string;
  description: string;
  order_index: number;
  weight: number;
  color: string;
  is_active: boolean;
}

interface WorkDetailModalProps {
  noteId: string | null;
  workStages: WorkStage[];
  onClose: () => void;
  onSave: () => void;
}

interface StageProgress {
  stage_id: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string;
  time_spent_minutes: number;
}

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_profiles?: { email: string };
}

export default function WorkDetailModal({
  noteId,
  workStages,
  onClose,
  onSave
}: WorkDetailModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<any>(null);
  const [stageProgress, setStageProgress] = useState<Record<string, StageProgress>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [formData, setFormData] = useState({
    priority: 'normal',
    due_date: '',
    estimated_hours: '',
    is_blocked: false,
    blocked_reason: ''
  });

  useEffect(() => {
    if (noteId && noteId !== 'new') {
      loadNote();
      loadStageProgress();
      loadComments();
    } else {
      initializeStages();
    }
  }, [noteId]);

  const initializeStages = () => {
    const initialProgress: Record<string, StageProgress> = {};
    workStages.forEach(stage => {
      initialProgress[stage.id] = {
        stage_id: stage.id,
        is_completed: false,
        completed_at: null,
        completed_by: null,
        notes: '',
        time_spent_minutes: 0
      };
    });
    setStageProgress(initialProgress);
  };

  const loadNote = async () => {
    if (!noteId || noteId === 'new') return;

    try {
      const { data, error } = await supabase
        .from('delivery_notes')
        .select('*, dentists(name)')
        .eq('id', noteId)
        .single();

      if (error) throw error;

      setNote(data);
      setFormData({
        priority: data.priority || 'normal',
        due_date: data.due_date || '',
        estimated_hours: data.estimated_hours?.toString() || '',
        is_blocked: data.is_blocked || false,
        blocked_reason: data.blocked_reason || ''
      });
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };

  const loadStageProgress = async () => {
    if (!noteId || noteId === 'new') return;

    try {
      const { data, error } = await supabase
        .from('delivery_note_stages')
        .select('*')
        .eq('delivery_note_id', noteId);

      if (error) throw error;

      const progressMap: Record<string, StageProgress> = {};

      workStages.forEach(stage => {
        const existingProgress = data?.find(p => p.stage_id === stage.id);
        progressMap[stage.id] = existingProgress || {
          stage_id: stage.id,
          is_completed: false,
          completed_at: null,
          completed_by: null,
          notes: '',
          time_spent_minutes: 0
        };
      });

      setStageProgress(progressMap);
    } catch (error) {
      console.error('Error loading stage progress:', error);
    }
  };

  const loadComments = async () => {
    if (!noteId || noteId === 'new') return;

    try {
      const { data, error } = await supabase
        .from('work_comments')
        .select('*, user_profiles(email)')
        .eq('delivery_note_id', noteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !noteId || noteId === 'new') return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('delivery_notes')
        .update({
          priority: formData.priority,
          due_date: formData.due_date || null,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          is_blocked: formData.is_blocked,
          blocked_reason: formData.is_blocked ? formData.blocked_reason : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) throw error;

      for (const stage of workStages) {
        const progress = stageProgress[stage.id];
        if (!progress) continue;

        const { data: existing } = await supabase
          .from('delivery_note_stages')
          .select('id')
          .eq('delivery_note_id', noteId)
          .eq('stage_id', stage.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('delivery_note_stages')
            .update({
              is_completed: progress.is_completed,
              completed_at: progress.is_completed ? (progress.completed_at || new Date().toISOString()) : null,
              completed_by: progress.is_completed ? (progress.completed_by || user.id) : null,
              notes: progress.notes,
              time_spent_minutes: progress.time_spent_minutes,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else if (progress.is_completed || progress.notes || progress.time_spent_minutes > 0) {
          await supabase
            .from('delivery_note_stages')
            .insert({
              delivery_note_id: noteId,
              stage_id: stage.id,
              is_completed: progress.is_completed,
              completed_at: progress.is_completed ? new Date().toISOString() : null,
              completed_by: progress.is_completed ? user.id : null,
              notes: progress.notes,
              time_spent_minutes: progress.time_spent_minutes
            });
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const toggleStageCompletion = (stageId: string) => {
    setStageProgress(prev => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        is_completed: !prev[stageId]?.is_completed,
        completed_at: !prev[stageId]?.is_completed ? new Date().toISOString() : null,
        completed_by: !prev[stageId]?.is_completed ? user?.id || null : null
      }
    }));
  };

  const updateStageNotes = (stageId: string, notes: string) => {
    setStageProgress(prev => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        notes
      }
    }));
  };

  const updateStageTime = (stageId: string, minutes: number) => {
    setStageProgress(prev => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        time_spent_minutes: minutes
      }
    }));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !noteId || noteId === 'new') return;

    try {
      const { error } = await supabase
        .from('work_comments')
        .insert({
          delivery_note_id: noteId,
          user_id: user.id,
          comment: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Erreur lors de l\'ajout du commentaire');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;

    try {
      const { error } = await supabase
        .from('work_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const calculateProgress = () => {
    const totalWeight = workStages.reduce((sum, stage) => sum + stage.weight, 0);
    const completedWeight = workStages.reduce((sum, stage) => {
      return sum + (stageProgress[stage.id]?.is_completed ? stage.weight : 0);
    }, 0);
    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'from-green-500 to-emerald-500';
    if (percentage >= 40) return 'from-orange-500 to-amber-500';
    return 'from-red-500 to-rose-500';
  };

  const progress = calculateProgress();

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {note ? note.delivery_number : 'Nouveau travail'}
              </h2>
              {note && (
                <p className="text-slate-600 mt-1">
                  {note.dentists?.name} {note.patient_name && `• ${note.patient_name}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-slate-700">Progression globale</span>
              <span className="font-bold text-slate-900">{progress}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor(progress)} transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priorité</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <DatePicker
              value={formData.due_date}
              onChange={(value) => setFormData({ ...formData, due_date: value })}
              label="Date d'échéance"
              color="primary"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Heures estimées</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="Ex: 2.5"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-7">
              <input
                type="checkbox"
                id="is_blocked"
                checked={formData.is_blocked}
                onChange={(e) => setFormData({ ...formData, is_blocked: e.target.checked })}
                className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_blocked" className="text-sm font-medium text-slate-700 cursor-pointer">
                Travail bloqué
              </label>
            </div>

            {formData.is_blocked && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Raison du blocage</label>
                <textarea
                  value={formData.blocked_reason}
                  onChange={(e) => setFormData({ ...formData, blocked_reason: e.target.value })}
                  placeholder="Décrivez la raison du blocage..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-600" />
              Étapes de travail
            </h3>
            <div className="space-y-3">
              {workStages.map((stage, index) => (
                <div
                  key={stage.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    stageProgress[stage.id]?.is_completed
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleStageCompletion(stage.id)}
                      className="mt-1 flex-shrink-0"
                    >
                      {stageProgress[stage.id]?.is_completed ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-400 hover:text-primary-600 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <h4 className={`font-semibold ${
                          stageProgress[stage.id]?.is_completed ? 'text-green-900 line-through' : 'text-slate-900'
                        }`}>
                          {index + 1}. {stage.name}
                        </h4>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {stage.weight} pts
                        </span>
                      </div>
                      {stage.description && (
                        <p className="text-sm text-slate-600 mb-3">{stage.description}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                          <input
                            type="text"
                            value={stageProgress[stage.id]?.notes || ''}
                            onChange={(e) => updateStageNotes(stage.id, e.target.value)}
                            placeholder="Ajouter une note..."
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Temps passé (min)</label>
                          <input
                            type="number"
                            min="0"
                            value={stageProgress[stage.id]?.time_spent_minutes || 0}
                            onChange={(e) => updateStageTime(stage.id, parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {noteId && noteId !== 'new' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                Commentaires ({comments.length})
              </h3>
              <div className="space-y-3 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-slate-900 text-sm">
                            {comment.user_profiles?.email}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(comment.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-slate-700">{comment.comment}</p>
                      </div>
                      {comment.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-white transition-all font-semibold"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

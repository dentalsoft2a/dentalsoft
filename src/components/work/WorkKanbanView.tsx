import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Calendar, MessageSquare, AlertTriangle, Clock, Tag,
  ArrowUpCircle, ArrowDownCircle, MinusCircle
} from 'lucide-react';

interface DeliveryNote {
  id: string;
  delivery_number: string;
  date: string;
  patient_name: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  progress_percentage: number;
  due_date: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  current_stage_id: string | null;
  dentists?: { name: string };
  current_stage?: { name: string; color: string };
  assignments?: Array<{ employee: { full_name: string } }>;
  comments_count?: number;
}

interface WorkStage {
  id: string;
  name: string;
  description: string;
  order_index: number;
  weight: number;
  color: string;
  is_active: boolean;
}

interface WorkKanbanViewProps {
  deliveryNotes: DeliveryNote[];
  workStages: WorkStage[];
  onSelectNote: (id: string) => void;
  onRefresh: () => void;
}

export default function WorkKanbanView({
  deliveryNotes,
  workStages,
  onSelectNote,
  onRefresh
}: WorkKanbanViewProps) {
  const { user } = useAuth();
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const getNotesForStage = (stageId: string) => {
    return deliveryNotes.filter(note => note.current_stage_id === stageId);
  };

  const getNotesWithoutStage = () => {
    return deliveryNotes.filter(note => !note.current_stage_id);
  };

  const handleDragStart = (noteId: string) => {
    setDraggedNote(noteId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedNote || !user) return;

    try {
      const note = deliveryNotes.find(n => n.id === draggedNote);
      if (!note) return;

      const { data: existingStage } = await supabase
        .from('delivery_note_stages')
        .select('*')
        .eq('delivery_note_id', draggedNote)
        .eq('stage_id', targetStageId)
        .maybeSingle();

      if (existingStage) {
        const { error } = await supabase
          .from('delivery_note_stages')
          .update({
            is_completed: false,
            completed_at: null,
            completed_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStage.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_note_stages')
          .insert({
            delivery_note_id: draggedNote,
            stage_id: targetStageId,
            is_completed: false
          });

        if (error) throw error;
      }

      onRefresh();
    } catch (error) {
      console.error('Error moving note:', error);
      alert('Erreur lors du déplacement du travail');
    } finally {
      setDraggedNote(null);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'high':
        return <ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" />;
      case 'low':
        return <ArrowDownCircle className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <MinusCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'from-green-500 to-emerald-500';
    if (percentage >= 40) return 'from-orange-500 to-amber-500';
    return 'from-red-500 to-rose-500';
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const renderNoteCard = (note: DeliveryNote) => (
    <div
      key={note.id}
      draggable
      onDragStart={() => handleDragStart(note.id)}
      onClick={() => onSelectNote(note.id)}
      className={`bg-white border-2 rounded-lg p-3 mb-3 cursor-move hover:shadow-lg transition-all group ${
        draggedNote === note.id ? 'opacity-50 scale-95' : 'opacity-100'
      } ${
        note.is_blocked
          ? 'border-amber-300 bg-amber-50'
          : isOverdue(note.due_date) && note.status !== 'completed'
          ? 'border-red-300 bg-red-50'
          : 'border-slate-200 hover:border-primary-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-slate-900 text-sm group-hover:text-primary-600 transition-colors truncate">
          {note.delivery_number}
        </h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          {getPriorityIcon(note.priority)}
          {note.is_blocked && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          {isOverdue(note.due_date) && note.status !== 'completed' && (
            <Clock className="w-3.5 h-3.5 text-red-500" />
          )}
        </div>
      </div>

      <div className="space-y-2 text-xs text-slate-600">
        {note.dentists?.name && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{note.dentists.name}</span>
          </div>
        )}

        {note.patient_name && (
          <div className="flex items-center gap-1.5 truncate">
            <Tag className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{note.patient_name}</span>
          </div>
        )}

        {note.due_date && (
          <div className={`flex items-center gap-1.5 ${
            isOverdue(note.due_date) && note.status !== 'completed' ? 'text-red-600 font-medium' : ''
          }`}>
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{new Date(note.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>
        )}

        {note.comments_count > 0 && (
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{note.comments_count} commentaire{note.comments_count > 1 ? 's' : ''}</span>
          </div>
        )}

        {note.assignments && note.assignments.length > 0 && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{note.assignments[0].employee.full_name}</span>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Progression</span>
          <span className="text-slate-900 font-bold">{note.progress_percentage}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getProgressColor(note.progress_percentage)} transition-all duration-500`}
            style={{ width: `${note.progress_percentage}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex gap-4 min-w-full">
        <div className="w-80 flex-shrink-0">
          <div className="bg-slate-100 rounded-lg p-3 mb-3 border-2 border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                Non assigné
              </h3>
              <span className="text-sm font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                {getNotesWithoutStage().length}
              </span>
            </div>
          </div>
          <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
            {getNotesWithoutStage().map(renderNoteCard)}
            {getNotesWithoutStage().length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Aucun travail non assigné
              </div>
            )}
          </div>
        </div>

        {workStages.map((stage) => (
          <div
            key={stage.id}
            className="w-80 flex-shrink-0"
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div
              className={`rounded-lg p-3 mb-3 border-2 transition-all ${
                dragOverStage === stage.id
                  ? 'bg-primary-50 border-primary-400 shadow-lg scale-105'
                  : 'border-slate-200'
              }`}
              style={{ backgroundColor: dragOverStage === stage.id ? undefined : `${stage.color}20` }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  ></div>
                  {stage.name}
                </h3>
                <span className="text-sm font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full">
                  {getNotesForStage(stage.id).length}
                </span>
              </div>
              {stage.description && (
                <p className="text-xs text-slate-600 mt-1">{stage.description}</p>
              )}
            </div>
            <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {getNotesForStage(stage.id).map(renderNoteCard)}
              {getNotesForStage(stage.id).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                  Glissez un travail ici
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

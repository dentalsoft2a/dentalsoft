import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions';
import {
  User, Calendar, MessageSquare, AlertTriangle, Clock, Tag,
  ArrowUpCircle, ArrowDownCircle, MinusCircle, ChevronsRight, Package, CheckCircle, Lock, Eye
} from 'lucide-react';
import { DEFAULT_PRODUCTION_STAGES, calculateProgressFromStage, type StandardProductionStage } from '../../config/defaultProductionStages';

interface DeliveryNote {
  id: string;
  delivery_number: string;
  date: string;
  patient_name: string | null;
  items?: Array<{ description: string; quantity: number }>;
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

type WorkStage = StandardProductionStage;

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
  const employeePerms = useEmployeePermissions();
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  console.log('[WorkKanban] Employee permissions loaded:', {
    isEmployee: employeePerms.isEmployee,
    canEditAllStages: employeePerms.canEditAllStages,
    allowedStages: employeePerms.allowedStages,
    loading: employeePerms.loading
  });

  // CRITICAL: Wait for permissions to load before filtering
  // If loading or user is owner/not employee, show all stages
  const visibleStages = (!employeePerms.loading && employeePerms.isEmployee && !employeePerms.canEditAllStages)
    ? workStages.filter(stage => {
        const canAccess = employeePerms.canAccessStage(stage.id);
        console.log('[WorkKanban] Stage filter:', {
          stageName: stage.name,
          stageId: stage.id,
          canAccess,
          allowedStages: employeePerms.allowedStages,
          isEmployee: employeePerms.isEmployee,
          canEditAllStages: employeePerms.canEditAllStages
        });
        return canAccess;
      })
    : workStages;

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

    // Check if employee has permission to move to this stage
    if (employeePerms.isEmployee && !employeePerms.canEditStage(targetStageId)) {
      alert('Vous n\'avez pas la permission de déplacer ce travail vers cette étape.');
      return;
    }

    try {
      const note = deliveryNotes.find(n => n.id === draggedNote);
      if (!note) return;

      // Calculate progress based on the target stage position
      const progressPercentage = calculateProgressFromStage(targetStageId);

      // Simply update delivery note with new stage and calculated progress
      // No need to create stage records unless they have actual data
      await supabase
        .from('delivery_notes')
        .update({
          current_stage_id: targetStageId,
          progress_percentage: progressPercentage,
          status: progressPercentage === 100 ? 'completed' : 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', draggedNote);

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
        return <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <MinusCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'from-emerald-500 to-teal-500';
    if (percentage >= 40) return 'from-primary-500 to-cyan-500';
    return 'from-red-500 to-orange-500';
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const advanceToNextStage = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();

    if (!user) return;

    try {
      const note = deliveryNotes.find(n => n.id === noteId);
      if (!note) return;

      // Find current stage index
      const currentStageIndex = workStages.findIndex(s => s.id === note.current_stage_id);

      // If no current stage, move to first stage
      const nextStageIndex = currentStageIndex === -1 ? 0 : currentStageIndex + 1;

      // Check if there's a next stage
      if (nextStageIndex >= workStages.length) {
        alert('Déjà à la dernière étape!');
        return;
      }

      const nextStage = workStages[nextStageIndex];

      // Calculate progress based on the next stage position
      const progressPercentage = calculateProgressFromStage(nextStage.id);

      // Simply update delivery note with next stage and calculated progress
      // No need to create stage records unless they have actual data
      await supabase
        .from('delivery_notes')
        .update({
          current_stage_id: nextStage.id,
          progress_percentage: progressPercentage,
          status: progressPercentage === 100 ? 'completed' : 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      onRefresh();
    } catch (error) {
      console.error('Error advancing stage:', error);
      alert('Erreur lors du passage à l\'étape suivante');
    }
  };

  const canAdvanceStage = (note: DeliveryNote) => {
    const currentStageIndex = workStages.findIndex(s => s.id === note.current_stage_id);
    return currentStageIndex < workStages.length - 1 || currentStageIndex === -1;
  };

  const isReadyToDeliver = (note: DeliveryNote) => {
    if (!note.current_stage_id) return false;
    const currentStage = workStages.find(s => s.id === note.current_stage_id);
    return currentStage?.name.toLowerCase().includes('prêt à livrer') ||
           currentStage?.name.toLowerCase().includes('pret a livrer');
  };

  const markAsDelivered = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();

    if (!user) return;

    try {
      // Simply update delivery note to completed status with 100% progress
      // No need to create stage records
      await supabase
        .from('delivery_notes')
        .update({
          status: 'completed',
          progress_percentage: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      onRefresh();
    } catch (error) {
      console.error('Error marking as delivered:', error);
      alert('Erreur lors du marquage comme livré');
    }
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

        {note.items && note.items.length > 0 && (
          <div className="flex items-center gap-1.5 truncate">
            <Package className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {note.items[0].description}
              {note.items[0].quantity > 1 && ` (x${note.items[0].quantity})`}
              {note.items.length > 1 && ` +${note.items.length - 1}`}
            </span>
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

      <div className="mt-3 space-y-2">
        <div className="space-y-1">
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
        {isReadyToDeliver(note) ? (
          <button
            onClick={(e) => markAsDelivered(e, note.id)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-md hover:from-blue-700 hover:to-cyan-700 transition-all text-xs font-medium shadow-sm hover:shadow-md animate-pulse"
            title="Marquer comme livré"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Livrer
          </button>
        ) : canAdvanceStage(note) && (
          <button
            onClick={(e) => advanceToNextStage(e, note.id)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md hover:from-green-700 hover:to-emerald-700 transition-all text-xs font-medium shadow-sm hover:shadow-md"
            title="Passer à l'étape suivante"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
            Étape suivante
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full pb-4">
      {employeePerms.isEmployee && !employeePerms.canEditAllStages && visibleStages.length < workStages.length && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 mb-1">Vue limitée aux étapes autorisées</p>
            <p className="text-xs text-amber-700">
              Vous voyez {visibleStages.length} étape(s) sur {workStages.length} au total. Votre rôle limite l'accès à certaines étapes de production.
            </p>
          </div>
        </div>
      )}
      <div className="md:grid md:gap-3 lg:gap-4 space-y-4 md:space-y-0" style={{ gridTemplateColumns: visibleStages.length > 0 ? `repeat(${visibleStages.length + 1}, minmax(0, 1fr))` : '1fr' }}>
        <div className="min-w-0">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200/80 rounded-lg p-2.5 md:p-3 mb-2 md:mb-3 border border-slate-200/50 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-400 shadow-sm"></div>
                <span className="truncate">Non assigné</span>
              </h3>
              <span className="text-xs md:text-sm font-bold text-slate-700 bg-white/90 px-1.5 md:px-2 py-0.5 rounded-full flex-shrink-0 shadow-sm">
                {getNotesWithoutStage().length}
              </span>
            </div>
          </div>
          <div className="space-y-2 max-h-[400px] md:max-h-[calc(100vh-400px)] overflow-y-auto pr-1 md:pr-2">
            {getNotesWithoutStage().map(renderNoteCard)}
            {getNotesWithoutStage().length === 0 && (
              <div className="text-center py-6 md:py-8 text-slate-400 text-xs">
                Aucun travail non assigné
              </div>
            )}
          </div>
        </div>

        {visibleStages.map((stage) => (
          <div
            key={stage.id}
            className="min-w-0"
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div
              className={`rounded-lg p-2.5 md:p-3 mb-2 md:mb-3 border transition-all duration-200 ${
                dragOverStage === stage.id
                  ? 'bg-primary-50 border-primary-400 shadow-lg scale-105'
                  : 'border-slate-200/50 shadow-md hover:shadow-lg'
              }`}
              style={{
                background: dragOverStage === stage.id
                  ? undefined
                  : `linear-gradient(135deg, ${stage.color}15 0%, ${stage.color}25 100%)`
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm min-w-0">
                  <div
                    className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: stage.color }}
                  ></div>
                  <span className="truncate">{stage.name}</span>
                </h3>
                <span className="text-xs md:text-sm font-bold text-slate-700 bg-white/90 px-1.5 md:px-2 py-0.5 rounded-full flex-shrink-0 shadow-sm">
                  {getNotesForStage(stage.id).length}
                </span>
              </div>
              {stage.description && (
                <p className="text-xs text-slate-600 mt-1 truncate hidden md:block" title={stage.description}>{stage.description}</p>
              )}
            </div>
            <div className="space-y-2 max-h-[400px] md:max-h-[calc(100vh-400px)] overflow-y-auto pr-1 md:pr-2">
              {getNotesForStage(stage.id).map(renderNoteCard)}
              {getNotesForStage(stage.id).length === 0 && (
                <div className="text-center py-6 md:py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg">
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

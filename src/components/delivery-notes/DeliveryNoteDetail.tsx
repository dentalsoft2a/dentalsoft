import { useState } from 'react';
import { FileText, Stethoscope, Palette, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface DeliveryNoteDetailProps {
  note: {
    id: string;
    patient_name?: string;
    work_description?: string;
    tooth_numbers?: string;
    shade?: string;
    notes?: string;
    status?: string;
    created_by_dentist?: boolean;
  };
  compact?: boolean;
}

export default function DeliveryNoteDetail({ note, compact = false }: DeliveryNoteDetailProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (!note.created_by_dentist) {
    return null;
  }

  const hasStructuredData = note.work_description || note.tooth_numbers || note.shade;

  if (!hasStructuredData && !note.notes) {
    return null;
  }

  if (compact) {
    return (
      <div className="border-t border-slate-100 pt-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left p-2 hover:bg-slate-50 rounded transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-700">Informations de la demande</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {note.work_description && (
              <div className="bg-slate-50 rounded p-2">
                <p className="text-xs font-medium text-slate-600 mb-0.5">Description du travail</p>
                <p className="text-xs text-slate-900 line-clamp-2">{note.work_description}</p>
              </div>
            )}

            {note.tooth_numbers && (
              <div className="bg-slate-50 rounded p-2">
                <p className="text-xs font-medium text-slate-600 mb-0.5">Numéros de dents</p>
                <p className="text-xs text-slate-900 font-medium">{note.tooth_numbers}</p>
              </div>
            )}

            {note.shade && (
              <div className="bg-slate-50 rounded p-2">
                <p className="text-xs font-medium text-slate-600 mb-0.5">Teinte</p>
                <p className="text-xs text-slate-900 font-medium">{note.shade}</p>
              </div>
            )}

            {note.notes && (
              <div className="bg-slate-50 rounded p-2">
                <p className="text-xs font-medium text-slate-600 mb-0.5">Notes additionnelles</p>
                <p className="text-xs text-slate-700 line-clamp-3">{note.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      {note.status === 'pending_approval' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Demande en attente d'approbation</p>
            <p className="text-xs text-amber-700 mt-1">
              Cette demande a été créée par un dentiste et nécessite votre validation avant de commencer le travail.
            </p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h4 className="font-bold text-slate-900">Informations de la demande</h4>
        </div>

        {note.work_description && (
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-1">Description du travail</p>
                <p className="text-sm text-slate-900">{note.work_description}</p>
              </div>
            </div>
          </div>
        )}

        {note.tooth_numbers && (
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-start gap-2">
              <Stethoscope className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-1">Numéros de dents</p>
                <p className="text-sm text-slate-900 font-medium">{note.tooth_numbers}</p>
              </div>
            </div>
          </div>
        )}

        {note.shade && (
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-start gap-2">
              <Palette className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-1">Teinte</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-900 font-medium">{note.shade}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md font-mono">
                    {note.shade}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {note.notes && (
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-1">Notes additionnelles</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.notes}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

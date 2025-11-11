import { useState, useEffect } from 'react';
import { User, Save, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
}

interface TaskAssignmentPanelProps {
  deliveryNoteId: string;
  currentPriority?: string;
  currentEmployeeId?: string;
  onUpdate: () => void;
}

export default function TaskAssignmentPanel({
  deliveryNoteId,
  currentPriority,
  currentEmployeeId,
  onUpdate
}: TaskAssignmentPanelProps) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState(currentPriority || 'normal');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(currentEmployeeId || '');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    loadEmployees();
    loadDeliveryDetails();
  }, [deliveryNoteId]);

  const loadEmployees = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('laboratory_employees')
        .select('id, full_name, email, role_name')
        .eq('laboratory_profile_id', user.id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadDeliveryDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_notes')
        .select('estimated_completion_date, progress_percentage')
        .eq('id', deliveryNoteId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEstimatedCompletionDate(data.estimated_completion_date || '');
        setProgressPercentage(data.progress_percentage || 0);
      }
    } catch (error) {
      console.error('Error loading delivery details:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Mettre à jour la livraison
      const updateData: any = {
        priority,
        progress_percentage: progressPercentage
      };

      if (assignedEmployeeId) {
        updateData.assigned_employee_id = assignedEmployeeId;
      }

      if (estimatedCompletionDate) {
        updateData.estimated_completion_date = estimatedCompletionDate;
      }

      const { error: updateError } = await supabase
        .from('delivery_notes')
        .update(updateData)
        .eq('id', deliveryNoteId);

      if (updateError) throw updateError;

      // Si un employé est assigné, créer une affectation
      if (assignedEmployeeId && assignedEmployeeId !== currentEmployeeId) {
        const { error: assignError } = await supabase
          .from('task_assignments')
          .insert({
            delivery_note_id: deliveryNoteId,
            employee_id: assignedEmployeeId,
            assigned_by: user.id,
            status: 'assigned'
          });

        if (assignError) throw assignError;
      }

      alert('Affectation mise à jour avec succès!');
      onUpdate();
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Erreur lors de la mise à jour de l\'affectation');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'border-red-500 bg-red-50 text-red-700';
      case 'high':
        return 'border-orange-500 bg-orange-50 text-orange-700';
      case 'normal':
        return 'border-blue-500 bg-blue-50 text-blue-700';
      case 'low':
        return 'border-slate-400 bg-slate-50 text-slate-700';
      default:
        return 'border-slate-300 bg-slate-50 text-slate-700';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
        <User className="w-4 h-4" />
        Gestion de production
      </h3>

      <div className="space-y-4">
        {/* Priorité */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Priorité
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'urgent', label: 'Urgent', icon: '🔴' },
              { value: 'high', label: 'Élevé', icon: '🟠' },
              { value: 'normal', label: 'Normal', icon: '🔵' },
              { value: 'low', label: 'Faible', icon: '⚪' }
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 ${
                  priority === p.value
                    ? getPriorityColor(p.value)
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Employé assigné */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Employé assigné
          </label>
          <select
            value={assignedEmployeeId}
            onChange={(e) => setAssignedEmployeeId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="">Non assigné</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.role_name})
              </option>
            ))}
          </select>
        </div>

        {/* Date de fin estimée */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Date de fin estimée
          </label>
          <input
            type="date"
            value={estimatedCompletionDate}
            onChange={(e) => setEstimatedCompletionDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Progression */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Progression ({progressPercentage}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progressPercentage}
            onChange={(e) => setProgressPercentage(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Avertissement si urgence sans assignation */}
        {priority === 'urgent' && !assignedEmployeeId && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Cette tâche est marquée comme urgente mais n'a pas d'employé assigné
            </p>
          </div>
        )}

        {/* Bouton sauvegarder */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, X, Plus, UserCheck, Eye, Lock } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  role_name: string;
  email: string;
  is_active: boolean;
}

interface Assignment {
  id: string;
  employee_id: string;
  assigned_at: string;
  employee: Employee;
}

interface RolePermission {
  role_name: string;
  permissions: {
    work_management?: {
      allowed_stages: string[];
      can_edit_all_stages: boolean;
    };
  };
}

interface ProductionStage {
  id: string;
  name: string;
  color: string;
}

interface EmployeeAssignmentProps {
  deliveryNoteId: string;
  productionStages: ProductionStage[];
  onAssignmentChange?: () => void;
}

export default function EmployeeAssignment({
  deliveryNoteId,
  productionStages,
  onAssignmentChange
}: EmployeeAssignmentProps) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission>>({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [deliveryNoteId, user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [employeesRes, assignmentsRes, rolesRes] = await Promise.all([
        supabase
          .from('laboratory_employees')
          .select('*')
          .eq('laboratory_profile_id', user.id)
          .eq('is_active', true)
          .order('full_name'),
        supabase
          .from('work_assignments')
          .select(`
            *,
            laboratory_employees(id, full_name, role_name, email, is_active)
          `)
          .eq('delivery_note_id', deliveryNoteId),
        supabase
          .from('laboratory_role_permissions')
          .select('role_name, permissions')
          .eq('laboratory_profile_id', user.id)
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setEmployees(employeesRes.data || []);

      const formattedAssignments = (assignmentsRes.data || []).map((a: any) => ({
        id: a.id,
        employee_id: a.employee_id,
        assigned_at: a.assigned_at,
        employee: a.laboratory_employees
      }));
      setAssignments(formattedAssignments);

      const rolesMap: Record<string, RolePermission> = {};
      (rolesRes.data || []).forEach((role: any) => {
        rolesMap[role.role_name] = role;
      });
      setRolePermissions(rolesMap);
    } catch (error) {
      console.error('Error loading assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignEmployee = async () => {
    if (!selectedEmployeeId || !user) return;

    const alreadyAssigned = assignments.some(a => a.employee_id === selectedEmployeeId);
    if (alreadyAssigned) {
      alert('Cet employé est déjà affecté à ce bon de livraison');
      return;
    }

    try {
      const { error } = await supabase
        .from('work_assignments')
        .insert({
          delivery_note_id: deliveryNoteId,
          employee_id: selectedEmployeeId,
          assigned_by: user.id
        });

      if (error) throw error;

      setSelectedEmployeeId('');
      loadData();
      onAssignmentChange?.();
    } catch (error: any) {
      console.error('Error assigning employee:', error);
      alert('Erreur lors de l\'affectation: ' + error.message);
    }
  };

  const unassignEmployee = async (assignmentId: string) => {
    if (!confirm('Retirer cette affectation ?')) return;

    try {
      const { error } = await supabase
        .from('work_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      loadData();
      onAssignmentChange?.();
    } catch (error: any) {
      console.error('Error unassigning employee:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const getEmployeeAllowedStages = (roleName: string): ProductionStage[] => {
    const rolePerms = rolePermissions[roleName];
    if (!rolePerms) return [];

    const workManagement = rolePerms.permissions?.work_management;
    if (!workManagement) return [];

    if (workManagement.can_edit_all_stages) {
      return productionStages;
    }

    return productionStages.filter(stage =>
      workManagement.allowed_stages.includes(stage.id)
    );
  };

  const availableEmployees = employees.filter(
    emp => !assignments.some(a => a.employee_id === emp.id)
  );

  if (loading) {
    return <div className="text-sm text-slate-500">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900">Affectation des employés</h3>
      </div>

      {/* Assigned Employees List */}
      {assignments.length > 0 ? (
        <div className="space-y-2">
          {assignments.map((assignment) => {
            const allowedStages = getEmployeeAllowedStages(assignment.employee.role_name);
            const canEditAllStages = rolePermissions[assignment.employee.role_name]?.permissions?.work_management?.can_edit_all_stages ?? true;

            return (
              <div
                key={assignment.id}
                className="p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {assignment.employee.full_name}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 mb-2 truncate">{assignment.employee.email}</p>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {assignment.employee.role_name}
                      </span>
                    </div>

                    {/* Stage Access Info */}
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {canEditAllStages ? (
                          <Eye className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <p className="text-xs font-semibold text-slate-600">
                          {canEditAllStages ? 'Toutes les étapes' : `${allowedStages.length} étape(s) autorisée(s)`}
                        </p>
                      </div>
                      {!canEditAllStages && allowedStages.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {allowedStages.map(stage => (
                            <span
                              key={stage.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-white border border-slate-200"
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span className="text-slate-700">{stage.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {!canEditAllStages && allowedStages.length === 0 && (
                        <p className="text-xs text-red-600 italic">Aucune étape accessible</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => unassignEmployee(assignment.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                    title="Retirer l'affectation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Aucun employé affecté</p>
        </div>
      )}

      {/* Assign New Employee */}
      {availableEmployees.length > 0 && (
        <div className="pt-3 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-2">Affecter un employé:</p>
          <div className="flex gap-2">
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner un employé</option>
              {availableEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.role_name}
                </option>
              ))}
            </select>
            <button
              onClick={assignEmployee}
              disabled={!selectedEmployeeId}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Plus className="w-4 h-4" />
              Affecter
            </button>
          </div>
        </div>
      )}

      {availableEmployees.length === 0 && employees.length > 0 && (
        <p className="text-xs text-slate-500 italic text-center">
          Tous les employés sont déjà affectés
        </p>
      )}

      {employees.length === 0 && (
        <p className="text-xs text-amber-600 italic text-center">
          Aucun employé disponible. Créez des employés dans les paramètres.
        </p>
      )}
    </div>
  );
}

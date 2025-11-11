import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WorkManagementPermissions {
  view_all_works: boolean;
  view_assigned_only: boolean;
  allowed_stages: string[];
  can_edit_all_stages: boolean;
}

interface EmployeePermissions {
  isEmployee: boolean;
  isLaboratoryOwner: boolean;
  employeeId: string | null;
  laboratoryId: string | null;
  roleName: string | null;
  canViewAllWorks: boolean;
  canViewAssignedOnly: boolean;
  allowedStages: string[];
  allowedStageNames: string[]; // Stage names from default stages (e.g., 'reception', 'modelisation')
  canEditAllStages: boolean;
  loading: boolean;
  canAccessStage: (stageId: string) => boolean;
  canEditStage: (stageId: string) => boolean;
}

export function useEmployeePermissions(): EmployeePermissions {
  const { user, profile } = useAuth();
  const [permissions, setPermissions] = useState<EmployeePermissions>({
    isEmployee: false,
    isLaboratoryOwner: false,
    employeeId: null,
    laboratoryId: null,
    roleName: null,
    canViewAllWorks: false,
    canViewAssignedOnly: false,
    allowedStages: [],
    allowedStageNames: [],
    canEditAllStages: false,
    loading: true,
    canAccessStage: () => false,
    canEditStage: () => false,
  });

  useEffect(() => {
    if (!user) {
      setPermissions(prev => ({ ...prev, loading: false }));
      return;
    }

    loadEmployeePermissions();
  }, [user, profile]);

  const loadEmployeePermissions = async () => {
    try {
      // FIRST check if user is an employee (higher priority)
      const { data: employeeData, error: employeeError } = await supabase
        .from('laboratory_employees')
        .select('id, laboratory_profile_id, role_name, is_active')
        .eq('user_profile_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (employeeError) throw employeeError;

      // If user is an employee, load employee permissions
      if (employeeData) {
        // Continue with employee logic below
      } else if (profile?.id === user?.id) {
        // Only if NOT an employee, check if user is a laboratory owner
        setPermissions({
          isEmployee: false,
          isLaboratoryOwner: true,
          employeeId: null,
          laboratoryId: profile.id,
          roleName: null,
          canViewAllWorks: true,
          canViewAssignedOnly: false,
          allowedStages: [],
          allowedStageNames: [],
          canEditAllStages: true,
          loading: false,
          canAccessStage: () => true,
          canEditStage: () => true,
        });
        return;
      } else {
        // Not an employee and not a laboratory owner
        setPermissions(prev => ({ ...prev, loading: false }));
        return;
      }

      // If we reach here, user is an employee - continue with employee logic

      // Get role permissions
      const { data: roleData, error: roleError } = await supabase
        .from('laboratory_role_permissions')
        .select('permissions')
        .eq('laboratory_profile_id', employeeData.laboratory_profile_id)
        .eq('role_name', employeeData.role_name)
        .maybeSingle();

      if (roleError) throw roleError;

      const workManagement = (roleData?.permissions as any)?.work_management as WorkManagementPermissions | undefined;

      // allowed_stages from DB still contains stage IDs from production_stages
      // We keep them for backward compatibility but add allowedStageNames for the new system
      const allowedStages = workManagement?.allowed_stages || [];

      // For now, allowedStageNames will be the same as allowedStages
      // In the future, we can map stage IDs to stage names if needed
      const allowedStageNames = allowedStages;

      const canEditAllStages = workManagement?.can_edit_all_stages ?? true;

      const canAccessStage = (stageId: string): boolean => {
        if (canEditAllStages) return true;
        return allowedStageNames.includes(stageId);
      };

      const canEditStage = (stageId: string): boolean => {
        if (canEditAllStages) return true;
        return allowedStageNames.includes(stageId);
      };

      setPermissions({
        isEmployee: true,
        isLaboratoryOwner: false,
        employeeId: employeeData.id,
        laboratoryId: employeeData.laboratory_profile_id,
        roleName: employeeData.role_name,
        canViewAllWorks: workManagement?.view_all_works ?? false,
        canViewAssignedOnly: workManagement?.view_assigned_only ?? false,
        allowedStages,
        allowedStageNames,
        canEditAllStages,
        loading: false,
        canAccessStage,
        canEditStage,
      });
    } catch (error) {
      console.error('Error loading employee permissions:', error);
      setPermissions(prev => ({ ...prev, loading: false }));
    }
  };

  return permissions;
}

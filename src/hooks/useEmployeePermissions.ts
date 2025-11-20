import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_PRODUCTION_STAGES } from '../config/defaultProductionStages';

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

  const convertStageUUIDsToDefaultIds = async (
    laboratoryId: string,
    stageUUIDs: string[]
  ): Promise<string[]> => {
    try {
      // Get all production stages for this laboratory
      const { data: stages, error } = await supabase
        .from('production_stages')
        .select('id, name, order_index')
        .eq('user_id', laboratoryId)
        .order('order_index');

      if (error) throw error;

      // Create a mapping from UUID to default stage ID based on name
      const defaultIds: string[] = [];

      for (const uuid of stageUUIDs) {
        const stage = stages?.find(s => s.id === uuid);
        if (stage) {
          // Find matching default stage by name
          const defaultStage = DEFAULT_PRODUCTION_STAGES.find(
            ds => ds.name.toLowerCase() === stage.name.toLowerCase()
          );
          if (defaultStage) {
            defaultIds.push(defaultStage.id);
          }
        }
      }

      console.log('[useEmployeePermissions] Converted stage IDs:', {
        inputUUIDs: stageUUIDs,
        outputDefaultIds: defaultIds
      });

      return defaultIds;
    } catch (error) {
      console.error('Error converting stage UUIDs:', error);
      return [];
    }
  };

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

      // Convert UUID stage IDs to default stage IDs
      const allowedStageUUIDs = workManagement?.allowed_stages || [];
      const allowedStages = await convertStageUUIDsToDefaultIds(
        employeeData.laboratory_profile_id,
        allowedStageUUIDs
      );

      const canEditAllStages = workManagement?.can_edit_all_stages ?? true;

      const canAccessStage = (stageId: string): boolean => {
        if (canEditAllStages) return true;
        return allowedStages.includes(stageId);
      };

      const canEditStage = (stageId: string): boolean => {
        if (canEditAllStages) return true;
        return allowedStages.includes(stageId);
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

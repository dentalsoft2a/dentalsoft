import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RolePermission {
  role_name: string;
  menu_access: Record<string, boolean>;
  permissions: Record<string, any>;
}

interface EmployeeInfo {
  role_name: string;
  is_active: boolean;
  laboratory_profile_id: string;
}

export function usePermissions() {
  const { user, profile } = useAuth();
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [user, profile]);

  const loadPermissions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (profile?.laboratory_name) {
        setIsOwner(true);
        setLoading(false);
        return;
      }

      const { data: employee, error: employeeError } = await supabase
        .from('laboratory_employees')
        .select('role_name, is_active, laboratory_profile_id')
        .eq('user_profile_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (employeeError) throw employeeError;

      if (employee) {
        setEmployeeInfo(employee);

        const { data: role, error: roleError } = await supabase
          .from('laboratory_role_permissions')
          .select('role_name, menu_access, permissions')
          .eq('laboratory_profile_id', employee.laboratory_profile_id)
          .eq('role_name', employee.role_name)
          .maybeSingle();

        if (roleError) throw roleError;

        if (role) {
          setRolePermissions(role);
        }
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasMenuAccess = (menuKey: string): boolean => {
    if (isOwner) return true;

    if (!rolePermissions || !employeeInfo) return false;

    return rolePermissions.menu_access[menuKey] === true;
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (isOwner) return true;

    if (!rolePermissions || !employeeInfo) return false;

    const resourcePermissions = rolePermissions.permissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions[action] === true;
  };

  return {
    loading,
    isOwner,
    isEmployee: !!employeeInfo && !isOwner,
    employeeInfo,
    rolePermissions,
    hasMenuAccess,
    hasPermission
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RolePermission {
  role_name: string;
  menu_access: Record<string, boolean>;
  permissions: Record<string, any>;
}

export function usePermissions() {
  const { isEmployee, employeeInfo, profile } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<RolePermission | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = !!profile?.laboratory_name;

  useEffect(() => {
    loadPermissions();
  }, [employeeInfo, isEmployee]);

  const loadPermissions = async () => {
    if (!isEmployee || !employeeInfo) {
      setLoading(false);
      return;
    }

    try {
      console.log('Loading permissions for employee:', employeeInfo);
      const { data: role, error: roleError } = await supabase
        .from('laboratory_role_permissions')
        .select('role_name, menu_access, permissions')
        .eq('laboratory_profile_id', employeeInfo.laboratory_id)
        .eq('role_name', employeeInfo.role)
        .maybeSingle();

      if (roleError) {
        console.error('Error loading role permissions:', roleError);
        throw roleError;
      }

      console.log('Loaded role permissions:', role);

      if (role) {
        setRolePermissions(role);
      } else {
        console.warn('No role permissions found for role:', employeeInfo.role_name);
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

  const getFirstAllowedPage = (): string => {
    const pages = [
      'dashboard',
      'calendar',
      'proformas',
      'invoices',
      'delivery-notes',
      'photos',
      'dentists',
      'catalog',
      'resources',
      'help-center',
      'settings'
    ];

    for (const page of pages) {
      if (hasMenuAccess(page)) {
        return page;
      }
    }

    return 'settings';
  };

  return {
    loading,
    isOwner,
    isEmployee,
    employeeInfo,
    rolePermissions,
    hasMenuAccess,
    hasPermission,
    getFirstAllowedPage
  };
}

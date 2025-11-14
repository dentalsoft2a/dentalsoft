import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useExtensions } from './useExtensions';

const FREE_EMPLOYEE_LIMIT = 3;

export function useEmployeeQuota() {
  const { laboratoryId } = useAuth();
  const { hasFeatureAccess } = useExtensions();
  const [employeeCount, setEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (laboratoryId) {
      loadEmployeeCount();
    }
  }, [laboratoryId]);

  const loadEmployeeCount = async () => {
    if (!laboratoryId) return;

    try {
      setLoading(true);
      const { count, error } = await supabase
        .from('laboratory_employees')
        .select('*', { count: 'exact', head: true })
        .eq('laboratory_profile_id', laboratoryId)
        .eq('is_active', true);

      if (error) throw error;
      setEmployeeCount(count || 0);
    } catch (error) {
      console.error('Error loading employee count:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasExtensionAccess = hasFeatureAccess('employee_management');

  const canAddEmployee = (): boolean => {
    if (hasExtensionAccess) {
      return true;
    }
    return employeeCount < FREE_EMPLOYEE_LIMIT;
  };

  const getRemainingFreeSlots = (): number => {
    if (hasExtensionAccess) {
      return Infinity;
    }
    return Math.max(0, FREE_EMPLOYEE_LIMIT - employeeCount);
  };

  const isNearLimit = (): boolean => {
    if (hasExtensionAccess) return false;
    return employeeCount >= FREE_EMPLOYEE_LIMIT - 1;
  };

  const isAtLimit = (): boolean => {
    if (hasExtensionAccess) return false;
    return employeeCount >= FREE_EMPLOYEE_LIMIT;
  };

  return {
    employeeCount,
    loading,
    canAddEmployee,
    getRemainingFreeSlots,
    isNearLimit,
    isAtLimit,
    hasExtensionAccess,
    freeLimit: FREE_EMPLOYEE_LIMIT,
    reloadCount: loadEmployeeCount
  };
}

import type { StandardProductionStage } from '../config/defaultProductionStages';
import { logger } from './logger';

export interface EmployeePermissions {
  isEmployee: boolean;
  isLaboratoryOwner: boolean;
  employeeId: string | null;
  laboratoryId: string | null;
  roleName: string | null;
  canViewAllWorks: boolean;
  canViewAssignedOnly: boolean;
  allowedStages: string[];
  canEditAllStages: boolean;
  canAccessStage: (stageId: string) => boolean;
  canEditStage: (stageId: string) => boolean;
}

export interface DeliveryNote {
  id: string;
  delivery_number: string;
  current_stage_id: string | null;
  assignments?: Array<{ employee: { full_name: string } }>;
  [key: string]: any;
}

/**
 * Filter stages based on employee permissions
 * Returns all stages if user is not an employee or has full access
 * Otherwise returns only allowed stages (matched by ID)
 * Note: allowedStages are now normalized to text IDs (stage-*) in AuthContext
 */
export function filterStagesByPermissions(
  stages: StandardProductionStage[],
  permissions: EmployeePermissions
): StandardProductionStage[] {
  logger.debug('[PermissionsFilter] Filtering stages with:', {
    isEmployee: permissions.isEmployee,
    canEditAllStages: permissions.canEditAllStages,
    allowedStagesCount: permissions.allowedStages.length,
    allowedStages: permissions.allowedStages
  });

  // If not an employee or can edit all stages, return all stages
  if (!permissions.isEmployee || permissions.canEditAllStages) {
    logger.debug('[PermissionsFilter] Returning all stages (not employee or full access)');
    return stages;
  }

  // Filter by allowed stage IDs (now all normalized to text IDs)
  const filteredStages = stages.filter(stage => {
    const isAllowed = permissions.allowedStages.includes(stage.id);
    logger.debug('[PermissionsFilter] Stage:', stage.name, 'ID:', stage.id, 'Allowed:', isAllowed);
    return isAllowed;
  });

  logger.debug('[PermissionsFilter] Filtered stages:', filteredStages.map(s => s.name));
  return filteredStages;
}

/**
 * Filter delivery notes/works based on employee permissions
 * Filters by allowed stages and assigned works
 */
export function filterWorksByPermissions(
  works: DeliveryNote[],
  permissions: EmployeePermissions,
  showMyWorksOnly: boolean = false
): DeliveryNote[] {
  logger.debug('[PermissionsFilter] Filtering works with:', {
    isEmployee: permissions.isEmployee,
    canViewAllWorks: permissions.canViewAllWorks,
    canViewAssignedOnly: permissions.canViewAssignedOnly,
    canEditAllStages: permissions.canEditAllStages,
    allowedStagesCount: permissions.allowedStages.length,
    showMyWorksOnly,
    totalWorks: works.length
  });

  let filtered = [...works];

  // Filter by assigned works if employee and required
  if (permissions.isEmployee && (permissions.canViewAssignedOnly || showMyWorksOnly)) {
    filtered = filtered.filter(work => {
      const hasAssignments = work.assignments && work.assignments.length > 0;
      logger.debug('[PermissionsFilter] Work:', work.delivery_number, 'Has assignments:', hasAssignments);
      return hasAssignments;
    });
    logger.debug('[PermissionsFilter] After assignment filter:', filtered.length, 'works');
  }

  // Filter by allowed stages if employee and doesn't have full access
  if (permissions.isEmployee && !permissions.canEditAllStages && permissions.allowedStages.length > 0) {
    filtered = filtered.filter(work => {
      // If no stage assigned yet, show it
      if (!work.current_stage_id) {
        logger.debug('[PermissionsFilter] Work:', work.delivery_number, 'No stage assigned, including');
        return true;
      }

      // Check if stage is in allowed list
      const isAllowed = permissions.allowedStages.includes(work.current_stage_id);
      logger.debug('[PermissionsFilter] Work:', work.delivery_number, 'Stage:', work.current_stage_id, 'Allowed:', isAllowed);
      return isAllowed;
    });
    logger.debug('[PermissionsFilter] After stage filter:', filtered.length, 'works');
  }

  logger.debug('[PermissionsFilter] Final filtered works:', filtered.length, 'from', works.length);
  return filtered;
}

/**
 * Check if a user can access a specific stage
 */
export function canAccessStage(stageId: string, permissions: EmployeePermissions): boolean {
  if (!permissions.isEmployee || permissions.canEditAllStages) {
    return true;
  }
  return permissions.allowedStages.includes(stageId);
}

/**
 * Check if a user can edit a specific stage
 */
export function canEditStage(stageId: string, permissions: EmployeePermissions): boolean {
  if (!permissions.isEmployee || permissions.canEditAllStages) {
    return true;
  }
  return permissions.allowedStages.includes(stageId);
}

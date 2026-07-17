
'use client';
import type { UserProfile, UserRole } from '@/lib/types';
import { useSuperAdmin } from './useSuperAdmin';
import { useSystemConfig } from './useSystemConfig';
import { useMemo } from 'react';
import { useImpersonation } from '@/context/ImpersonationProvider';
import { getRoleFromPosition } from '@/lib/roles-and-departments';

export interface Permissions {
  canApproveHR: boolean;
  canApproveFinance: boolean;
  canApproveMD: boolean;
  canDisburse: boolean;
  canManageStaff: boolean;
  canManageCompany: boolean;
  canClockIn: boolean;
  canEditOwnProfile: boolean;
  canAccessRequisitions: boolean;
  canAccessChat: boolean;
  canAccessAllTasks: boolean;
  canAccessAllWorkbooks: boolean;
  canManageAnnouncements: boolean;
  canViewTeam: boolean;
  canManageAccounting: boolean;
  canAccessLibrary: boolean;
  canManageLibrary: boolean;
  canViewFiles: boolean;
  canViewAudit: boolean;
  canManageDisplays: boolean;
  canBypassGeofence: boolean;
  canCreateRequisition: boolean;
  canSendChatMessage: boolean;
  canAccessAttendance: boolean;
  canAccessLeave: boolean;
  canRequestLeave: boolean;
  canAccessTasks: boolean;
  canCreateTask: boolean;
  canAccessWorkbooks: boolean;
  canCreateWorkbook: boolean;
  canAccessDisplays: boolean;
  canAccessReports: boolean;
  canSubmitReport: boolean;
}

const rolePermissions: Record<UserRole, Partial<Permissions>> = {
  'STAFF': {
      canAccessLibrary: true,
      canViewFiles: true,
      canBypassGeofence: false,
  },
  'HR_MANAGER': {
    canApproveHR: true,
    canManageStaff: true,
    canManageAnnouncements: true,
    canAccessLibrary: true,
    canManageLibrary: true,
    canViewFiles: true,
    canViewAudit: true,
    canBypassGeofence: true,
  },
  'FINANCE_MANAGER': {
    canApproveFinance: true,
    canDisburse: true,
    canManageAccounting: true,
    canAccessLibrary: true,
    canViewFiles: true,
    canBypassGeofence: false,
  },
  'MANAGING_DIRECTOR': {
    canApproveMD: true,
    canManageStaff: true,
    canManageAnnouncements: true,
    canAccessLibrary: true,
    canManageLibrary: true,
    canViewFiles: true,
    canViewAudit: true,
    canManageDisplays: true,
    canBypassGeofence: true,
  },
  'ORG_ADMIN': {
    canApproveHR: true,
    canApproveFinance: true,
    canApproveMD: true,
    canDisburse: true,
    canManageStaff: true,
    canManageCompany: true,
    canManageAnnouncements: true,
    canManageAccounting: true,
    canAccessLibrary: true,
    canManageLibrary: true,
    canViewFiles: true,
    canViewAudit: true,
    canManageDisplays: true,
    canBypassGeofence: true,
  },
};

const defaultPermissions: Permissions = {
  canApproveHR: false,
  canApproveFinance: false,
  canApproveMD: false,
  canDisburse: false,
  canManageStaff: false,
  canManageCompany: false,
  canClockIn: true,
  canEditOwnProfile: true,
  canAccessRequisitions: false,
  canAccessChat: false,
  canAccessAllTasks: false,
  canAccessAllWorkbooks: false,
  canManageAnnouncements: false,
  canViewTeam: false,
  canManageAccounting: false,
  canAccessLibrary: false,
  canManageLibrary: false,
  canViewFiles: false,
  canViewAudit: false,
  canManageDisplays: false,
  canBypassGeofence: false,
  canCreateRequisition: false,
  canSendChatMessage: false,
  canAccessAttendance: false,
  canAccessLeave: false,
  canRequestLeave: false,
  canAccessTasks: false,
  canCreateTask: false,
  canAccessWorkbooks: false,
  canCreateWorkbook: false,
  canAccessDisplays: false,
  canAccessReports: false,
  canSubmitReport: false,
};

export function usePermissions(userProfile: UserProfile | null): Permissions {
  const { isSuperAdmin } = useSuperAdmin();
  const { config: systemConfig } = useSystemConfig(userProfile?.orgId);
  const { isImpersonating } = useImpersonation();

  const permissions = useMemo(() => {
    // 1. Super Admin absolute clearance (Master Key)
    if (isSuperAdmin && !isImpersonating) {
      return { 
          canApproveHR: true,
          canApproveFinance: true,
          canApproveMD: true,
          canDisburse: true,
          canManageStaff: true,
          canManageCompany: true,
          canClockIn: true,
          canEditOwnProfile: true,
          canAccessRequisitions: true,
          canAccessChat: true,
          canAccessAllTasks: true,
          canAccessAllWorkbooks: true,
          canManageAnnouncements: true,
          canViewTeam: true,
          canManageAccounting: true,
          canAccessLibrary: true,
          canManageLibrary: true,
          canViewFiles: true,
          canViewAudit: true,
          canManageDisplays: true,
          canBypassGeofence: true,
          canCreateRequisition: true,
          canSendChatMessage: true,
          canAccessAttendance: true,
          canAccessLeave: true,
          canRequestLeave: true,
          canAccessTasks: true,
          canCreateTask: true,
          canAccessWorkbooks: true,
          canCreateWorkbook: true,
          canAccessDisplays: true,
          canAccessReports: true,
          canSubmitReport: true,
      };
    }
    
    if (!userProfile) {
      return defaultPermissions;
    }
    
    // 2. Position-aware role resolution
    const derivedRole = getRoleFromPosition(userProfile.position);
    let effectiveRole: UserRole = userProfile.role;
    
    if (derivedRole === 'ORG_ADMIN' || derivedRole === 'MANAGING_DIRECTOR') {
        effectiveRole = derivedRole;
    }

    // Impersonation mode for testing restricted UI
    if (isSuperAdmin && isImpersonating) {
        effectiveRole = 'STAFF';
    }

    const rolePerms = rolePermissions[effectiveRole] || {};
    const customPerms = (isSuperAdmin && isImpersonating) ? {} : (userProfile.customPermissions || {});

    const perms: Permissions = {
        ...defaultPermissions,
        ...rolePerms,
    };

    // 3. Module level gating by SystemConfig
    const financeMode = systemConfig?.modules?.finance ?? (systemConfig?.finance_access === false ? 'hidden' : 'staff');
    const chatMode = systemConfig?.modules?.chat ?? (systemConfig?.chat_enabled === false ? 'hidden' : 'staff');
    const attendanceMode = systemConfig?.modules?.attendance ?? 'staff';
    const tasksMode = systemConfig?.modules?.tasks ?? 'staff';
    const workbooksMode = systemConfig?.modules?.workbooks ?? 'staff';
    const libraryMode = systemConfig?.modules?.library ?? 'staff';
    const leaveMode = systemConfig?.modules?.leave ?? 'staff';
    const displaysMode = systemConfig?.modules?.live_displays ?? 'staff';
    const reportsMode = systemConfig?.modules?.reports ?? 'staff';
    
    const isStaffUser = effectiveRole === 'STAFF';

    perms.canAccessRequisitions = financeMode !== 'hidden' || !isStaffUser;
    perms.canCreateRequisition = financeMode === 'staff' || !isStaffUser;

    perms.canAccessChat = chatMode !== 'hidden' || !isStaffUser;
    perms.canSendChatMessage = chatMode === 'staff' || !isStaffUser;

    perms.canAccessAttendance = attendanceMode !== 'hidden' || !isStaffUser;
    perms.canClockIn = attendanceMode === 'staff' || !isStaffUser;

    perms.canAccessTasks = tasksMode !== 'hidden' || !isStaffUser;
    perms.canCreateTask = tasksMode === 'staff' || !isStaffUser;

    perms.canAccessWorkbooks = workbooksMode !== 'hidden' || !isStaffUser;
    perms.canCreateWorkbook = workbooksMode === 'staff' || !isStaffUser;

    perms.canAccessLibrary = libraryMode !== 'hidden' || !isStaffUser;
    perms.canManageLibrary = (libraryMode === 'staff' || !isStaffUser) && (effectiveRole !== 'STAFF' || !!rolePerms.canManageLibrary || !!isSuperAdmin);

    perms.canAccessLeave = leaveMode !== 'hidden' || !isStaffUser;
    perms.canRequestLeave = leaveMode === 'staff' || !isStaffUser;

    perms.canAccessDisplays = displaysMode !== 'hidden' || !isStaffUser;
    perms.canManageDisplays = (displaysMode === 'staff' || !isStaffUser) && (effectiveRole !== 'STAFF' || !!rolePerms.canManageDisplays || !!isSuperAdmin);

    perms.canAccessReports = reportsMode !== 'hidden' || !isStaffUser;
    perms.canSubmitReport = reportsMode === 'staff' || !isStaffUser;

    // 4. Visibility logic
    perms.canAccessAllTasks = !!rolePerms.canManageStaff;
    perms.canAccessAllWorkbooks = !!rolePerms.canManageStaff;

    // 5. Apply user-specific custom overrides
    if (typeof customPerms.canAccessRequisitions === 'boolean') perms.canAccessRequisitions = customPerms.canAccessRequisitions;
    if (typeof customPerms.canAccessChat === 'boolean') perms.canAccessChat = customPerms.canAccessChat;
    if (typeof customPerms.canAccessAllTasks === 'boolean') perms.canAccessAllTasks = customPerms.canAccessAllTasks;
    if (typeof customPerms.canAccessAllWorkbooks === 'boolean') perms.canAccessAllWorkbooks = customPerms.canAccessAllWorkbooks;
    if (typeof customPerms.canManageAnnouncements === 'boolean') perms.canManageAnnouncements = customPerms.canManageAnnouncements;
    if (typeof customPerms.canManageLibrary === 'boolean') perms.canManageLibrary = customPerms.canManageLibrary;
    if (typeof customPerms.canViewAudit === 'boolean') perms.canViewAudit = customPerms.canViewAudit;
    if (typeof customPerms.canManageDisplays === 'boolean') perms.canManageDisplays = customPerms.canManageDisplays;
    if (typeof customPerms.canManageAccounting === 'boolean') perms.canManageAccounting = customPerms.canManageAccounting;
    if (typeof customPerms.canAccessLibrary === 'boolean') perms.canAccessLibrary = customPerms.canAccessLibrary;
    
    perms.canEditOwnProfile = effectiveRole !== 'STAFF' || (systemConfig?.allow_self_edit ?? true);
    perms.canViewTeam = perms.canManageStaff || (systemConfig?.admin_tools ?? false);

    return perms;
  }, [isSuperAdmin, userProfile, systemConfig, isImpersonating]);

  return permissions;
}

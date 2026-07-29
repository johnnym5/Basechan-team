
'use client';
import type { UserProfile, UserRole } from '@/lib/types';
import { useSuperAdmin } from './useSuperAdmin';
import { useSystemConfig } from './useSystemConfig';
import { useMemo } from 'react';
import { useImpersonation } from '@/context/ImpersonationProvider';
import { getRoleFromPosition } from '@/lib/roles-and-departments';
import { PERMISSIONS } from '@/lib/permissions-registry';

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

    // NEW: Dynamic Permission Resolution
    const resolved = userProfile.resolvedPermissions || [];
    const has = (p: string) => resolved.includes(p);

    const perms: Permissions = {
        ...defaultPermissions,
        ...rolePerms,
    };

    // --- REFACTORED GATING LOGIC (Hybrid Mode) ---

    const getModuleMode = (key: 'finance' | 'chat' | 'attendance' | 'tasks' | 'workbooks' | 'library' | 'leave' | 'live_displays' | 'reports', systemVal: string) => {
      const userOverride = customPerms?.modules?.[key];
      if (userOverride && userOverride !== 'default') {
        return userOverride;
      }
      return systemVal;
    };

    const financeMode = getModuleMode('finance', systemConfig?.modules?.finance ?? (systemConfig?.finance_access === false ? 'hidden' : 'staff'));
    const chatMode = getModuleMode('chat', systemConfig?.modules?.chat ?? (systemConfig?.chat_enabled === false ? 'hidden' : 'staff'));
    const attendanceMode = getModuleMode('attendance', systemConfig?.modules?.attendance ?? 'staff');
    const tasksMode = getModuleMode('tasks', systemConfig?.modules?.tasks ?? 'staff');
    const workbooksMode = getModuleMode('workbooks', systemConfig?.modules?.workbooks ?? 'staff');
    const libraryMode = getModuleMode('library', systemConfig?.modules?.library ?? 'staff');
    const leaveMode = getModuleMode('leave', systemConfig?.modules?.leave ?? 'staff');
    const displaysMode = getModuleMode('live_displays', systemConfig?.modules?.live_displays ?? 'staff');
    const reportsMode = getModuleMode('reports', systemConfig?.modules?.reports ?? 'staff');

    const isStaffUser = effectiveRole === 'STAFF';

    perms.canApproveHR = has(PERMISSIONS.ATTENDANCE_APPROVE_HR) || has(PERMISSIONS.REQUISITION_APPROVE_HR) || !!rolePerms.canApproveHR;
    perms.canApproveFinance = has(PERMISSIONS.REQUISITION_APPROVE_FINANCE) || !!rolePerms.canApproveFinance;
    perms.canApproveMD = has(PERMISSIONS.REQUISITION_APPROVE_MD) || !!rolePerms.canApproveMD;
    perms.canDisburse = has(PERMISSIONS.REQUISITION_DISBURSE) || !!rolePerms.canDisburse;

    perms.canManageStaff = has(PERMISSIONS.ADMIN_MANAGE_STAFF) || !!rolePerms.canManageStaff;
    perms.canManageCompany = has(PERMISSIONS.ADMIN_MANAGE_COMPANY) || !!rolePerms.canManageCompany;

    perms.canAccessRequisitions = has(PERMISSIONS.REQUISITION_CREATE) || financeMode !== 'hidden' || !isStaffUser;
    perms.canCreateRequisition = has(PERMISSIONS.REQUISITION_CREATE) || financeMode === 'staff' || !isStaffUser;

    perms.canAccessChat = has(PERMISSIONS.CHAT_ACCESS) || chatMode !== 'hidden' || !isStaffUser;
    perms.canSendChatMessage = has(PERMISSIONS.CHAT_SEND_MESSAGE) || chatMode === 'staff' || !isStaffUser;

    perms.canAccessAttendance = has(PERMISSIONS.ATTENDANCE_CLOCK_IN) || !!perms.canApproveHR || has(PERMISSIONS.ATTENDANCE_VIEW_TEAM);
    perms.canClockIn = has(PERMISSIONS.ATTENDANCE_CLOCK_IN);

    perms.canAccessTasks = has(PERMISSIONS.TASK_CREATE) || has(PERMISSIONS.TASK_ACCESS_ALL);
    perms.canCreateTask = has(PERMISSIONS.TASK_CREATE);
    perms.canAccessAllTasks = has(PERMISSIONS.TASK_ACCESS_ALL) || !!rolePerms.canManageStaff;

    perms.canAccessWorkbooks = has(PERMISSIONS.WORKBOOK_CREATE) || has(PERMISSIONS.WORKBOOK_ACCESS_ALL);
    perms.canCreateWorkbook = has(PERMISSIONS.WORKBOOK_CREATE);
    perms.canAccessAllWorkbooks = has(PERMISSIONS.WORKBOOK_ACCESS_ALL) || !!rolePerms.canManageStaff;

    perms.canAccessLibrary = has(PERMISSIONS.LIBRARY_ACCESS);
    perms.canManageLibrary = has(PERMISSIONS.LIBRARY_MANAGE);
    perms.canViewFiles = has(PERMISSIONS.LIBRARY_VIEW_FILES);

    perms.canViewAudit = has(PERMISSIONS.ADMIN_VIEW_AUDIT);
    perms.canManageDisplays = has(PERMISSIONS.ADMIN_MANAGE_DISPLAYS);
    perms.canBypassGeofence = has(PERMISSIONS.ATTENDANCE_BYPASS_GEOFENCE);

    perms.canAccessReports = has(PERMISSIONS.REPORT_ACCESS) || has(PERMISSIONS.FINANCE_VIEW_REPORTS);
    perms.canSubmitReport = has(PERMISSIONS.REPORT_SUBMIT);

    perms.canViewTeam = perms.canManageStaff || has(PERMISSIONS.ATTENDANCE_VIEW_TEAM);
    
    // Safety check for self-edit
    perms.canEditOwnProfile = has(PERMISSIONS.PROFILE_EDIT_OWN) || (systemConfig?.allow_self_edit ?? true);

    return perms;
  }, [isSuperAdmin, userProfile, systemConfig, isImpersonating]);

  return permissions;
}

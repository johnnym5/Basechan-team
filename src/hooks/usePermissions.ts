
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
    perms.canAccessRequisitions = (systemConfig?.finance_access ?? false) || (effectiveRole === 'ORG_ADMIN');
    perms.canAccessChat = (systemConfig?.chat_enabled ?? false) || (effectiveRole === 'ORG_ADMIN');

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

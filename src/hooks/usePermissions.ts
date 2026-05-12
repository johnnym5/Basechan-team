'use client';
import type { UserProfile, UserRole } from '@/lib/types';
import { useSuperAdmin } from './useSuperAdmin';
import { useSystemConfig } from './useSystemConfig';
import { useMemo } from 'react';
import { useImpersonation } from '@/context/ImpersonationProvider';

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
}

const rolePermissions: Record<UserRole, Partial<Permissions>> = {
  'STAFF': {
      canAccessLibrary: true,
      canViewFiles: true,
  },
  'HR_MANAGER': {
    canApproveHR: true,
    canManageStaff: true,
    canManageAnnouncements: true,
    canAccessLibrary: true,
    canManageLibrary: true,
    canViewFiles: true,
  },
  'FINANCE_MANAGER': {
    canApproveFinance: true,
    canDisburse: true,
    canManageAccounting: true,
    canAccessLibrary: true,
    canViewFiles: true,
  },
  'MANAGING_DIRECTOR': {
    canApproveMD: true,
    canManageStaff: true,
    canManageAnnouncements: true,
    canAccessLibrary: true,
    canManageLibrary: true,
    canViewFiles: true,
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
};

export function usePermissions(userProfile: UserProfile | null): Permissions {
  const { isSuperAdmin } = useSuperAdmin();
  const { config: systemConfig } = useSystemConfig(userProfile?.orgId);
  const { isImpersonating } = useImpersonation();

  const permissions = useMemo(() => {
    // If user is super admin AND not impersonating, they get all permissions.
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
      };
    }
    
    // For all other cases (normal users, or an impersonating super admin), calculate permissions dynamically.
    if (!userProfile) {
      return defaultPermissions;
    }
    
    const isSuperAdminImpersonating = isSuperAdmin && isImpersonating;

    // If super admin is impersonating, force their role to 'Staff'. Otherwise, use their actual role.
    const effectiveRole = isSuperAdminImpersonating
        ? 'STAFF'
        : userProfile.role;

    const rolePerms = rolePermissions[effectiveRole] || {};
    const customPerms = isSuperAdminImpersonating ? {} : (userProfile.customPermissions || {});

    const perms: Permissions = {
        ...defaultPermissions,
        ...rolePerms,
    };

    // 1. Base module access is gated by the org-wide SystemConfig
    perms.canAccessRequisitions = systemConfig?.finance_access ?? false;
    perms.canAccessChat = systemConfig?.chat_enabled ?? false;

    // 2. "View All" permissions are typically tied to management roles
    perms.canAccessAllTasks = !!rolePerms.canManageStaff;
    perms.canAccessAllWorkbooks = !!rolePerms.canManageStaff;

    // 3. Apply user-specific custom permissions as overrides (but not during impersonation)
    if (typeof customPerms.canAccessRequisitions === 'boolean') {
        perms.canAccessRequisitions = customPerms.canAccessRequisitions && (systemConfig?.finance_access ?? true);
    }
    if (typeof customPerms.canAccessChat === 'boolean') {
        perms.canAccessChat = customPerms.canAccessChat && (systemConfig?.chat_enabled ?? true);
    }
    if (typeof customPerms.canAccessAllTasks === 'boolean') {
        perms.canAccessAllTasks = customPerms.canAccessAllTasks;
    }
     if (typeof customPerms.canAccessAllWorkbooks === 'boolean') {
        perms.canAccessAllWorkbooks = customPerms.canAccessAllWorkbooks;
    }
    if (typeof customPerms.canManageAnnouncements === 'boolean') {
        perms.canManageAnnouncements = customPerms.canManageAnnouncements;
    }
    if (typeof customPerms.canManageLibrary === 'boolean') {
        perms.canManageLibrary = customPerms.canManageLibrary;
    }
    
    // 4. Special cases
    perms.canEditOwnProfile = effectiveRole !== 'STAFF' || (systemConfig?.allow_self_edit ?? true);
    perms.canViewTeam = perms.canManageStaff || (systemConfig?.admin_tools ?? false);

    return perms;
  }, [isSuperAdmin, userProfile, systemConfig, isImpersonating]);

  return permissions;
}

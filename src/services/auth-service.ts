'use client';

import {
  Firestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import type { UserProfile, AppRole } from '@/lib/types';
import { PERMISSIONS, DUTIES } from '@/lib/permissions-registry';
import { getRoleFromPosition } from '@/lib/roles-and-departments';

/**
 * AUTH SERVICE
 * Handles permission merging, role resolution, and caching on the user document.
 */
export const authService = {
  /**
   * Seeds the initial SYSTEM roles into Firestore.
   */
  async seedSystemRoles(db: Firestore) {
    const rolesRef = collection(db, 'roles');

    const systemRoles: Omit<AppRole, 'id'>[] = [
      {
        name: 'Staff Member',
        description: 'Standard access for regular employees.',
        orgId: 'SYSTEM',
        duties: ['STAFF_BASIC'],
        permissions: [...DUTIES.STAFF_BASIC],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'HR Manager',
        description: 'Personnel management and attendance oversight.',
        orgId: 'SYSTEM',
        duties: ['STAFF_BASIC', 'HR_OPERATIONS'],
        permissions: [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'Finance Manager',
        description: 'Control over disbursements, accounts, and financial reports.',
        orgId: 'SYSTEM',
        duties: ['STAFF_BASIC', 'FINANCE_CONTROL'],
        permissions: [...DUTIES.STAFF_BASIC, ...DUTIES.FINANCE_CONTROL],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'Managing Director',
        description: 'Full visibility and final approval authority.',
        orgId: 'SYSTEM',
        duties: ['STAFF_BASIC', 'HR_OPERATIONS', 'FINANCE_CONTROL', 'EXECUTIVE_OVERSIGHT'],
        permissions: [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS, ...DUTIES.FINANCE_CONTROL, ...DUTIES.EXECUTIVE_OVERSIGHT],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'Organization Admin',
        description: 'Absolute control over the tenant instance.',
        orgId: 'SYSTEM',
        duties: ['STAFF_BASIC', 'HR_OPERATIONS', 'FINANCE_CONTROL', 'EXECUTIVE_OVERSIGHT'],
        permissions: [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS, ...DUTIES.FINANCE_CONTROL, ...DUTIES.EXECUTIVE_OVERSIGHT],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    const batch = writeBatch(db);

    // Using hardcoded IDs for system roles to ensure stability
    const roleIds = ['role_staff', 'role_hr_manager', 'role_finance_manager', 'role_md', 'role_org_admin'];

    systemRoles.forEach((role, idx) => {
        const id = roleIds[idx];
        batch.set(doc(rolesRef, id), { ...role, id });
    });

    await batch.commit();
  },

  /**
   * Resolves multiple roles and ad-hoc permissions into a flat list.
   * Caches the result on the user's document.
   */
  async syncUserPermissions(db: Firestore, userId: string) {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return;

    const user = userSnap.data() as UserProfile;
    const roleIds = user.roleIds || [];

    // Add default role if none assigned (migration support)
    if (roleIds.length === 0) {
        // Map position to role first for more accurate resolution
        const positionRole = getRoleFromPosition(user.position);
        const legacyRole = positionRole || user.role;

        const legacyMapping: Record<string, string> = {
            'STAFF': 'role_staff',
            'HR_MANAGER': 'role_hr_manager',
            'FINANCE_MANAGER': 'role_finance_manager',
            'MANAGING_DIRECTOR': 'role_md',
            'ORG_ADMIN': 'role_org_admin'
        };
        roleIds.push(legacyMapping[legacyRole] || 'role_staff');
    }

    const permissionSet = new Set<string>();

    // 1. Fetch all assigned roles
    for (const roleId of roleIds) {
        const roleSnap = await getDoc(doc(db, 'roles', roleId));
        if (roleSnap.exists()) {
            const roleData = roleSnap.data() as AppRole;
            roleData.permissions.forEach(p => permissionSet.add(p));
        } else {
            // FALLBACK: Hardcoded permissions for system roles if not seeded
            if (roleId === 'role_staff') DUTIES.STAFF_BASIC.forEach(p => permissionSet.add(p));
            if (roleId === 'role_hr_manager') [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS].forEach(p => permissionSet.add(p));
            if (roleId === 'role_finance_manager') [...DUTIES.STAFF_BASIC, ...DUTIES.FINANCE_CONTROL].forEach(p => permissionSet.add(p));
            if (roleId === 'role_md' || roleId === 'role_org_admin') {
                [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS, ...DUTIES.FINANCE_CONTROL, ...DUTIES.EXECUTIVE_OVERSIGHT].forEach(p => permissionSet.add(p));
            }
        }
    }

    // 2. Add ad-hoc custom permissions from User document (Overrides)
    if (user.customPermissions) {
        // This is where we handle the boolean flags from the old system
        // and map them to the new string-based permissions
        if (user.customPermissions.canAccessAllTasks) permissionSet.add(PERMISSIONS.TASK_ACCESS_ALL);
        if (user.customPermissions.canAccessAllWorkbooks) permissionSet.add(PERMISSIONS.WORKBOOK_ACCESS_ALL);
        if (user.customPermissions.canManageAccounting) permissionSet.add(PERMISSIONS.FINANCE_MANAGE_ACCOUNTS);
        if (user.customPermissions.canViewAudit) permissionSet.add(PERMISSIONS.ADMIN_VIEW_AUDIT);
        if (user.role === 'HR_MANAGER' || user.role === 'ORG_ADMIN') permissionSet.add(PERMISSIONS.ADMIN_MANAGE_COMPANY);
    }

    const flatPermissions = Array.from(permissionSet);

    // 3. Update User document with cache
    await setDoc(doc(db, 'users', userId), {
        roleIds,
        resolvedPermissions: flatPermissions,
        updatedAt: serverTimestamp()
    }, { merge: true });

    return flatPermissions;
  },

  /**
   * Checks for Separation of Duties (SoD) conflicts in a list of permissions.
   * Returns a list of identified conflicts.
   */
  checkSoDConflicts(permissions: string[]) {
    const conflicts: { title: string; description: string; permissions: string[] }[] = [];

    // Conflict 1: Procurement Fraud (Create + Approve)
    const canCreate = permissions.includes(PERMISSIONS.REQUISITION_CREATE);
    const canApprove = permissions.includes(PERMISSIONS.REQUISITION_APPROVE_HR) ||
                       permissions.includes(PERMISSIONS.REQUISITION_APPROVE_FINANCE) ||
                       permissions.includes(PERMISSIONS.REQUISITION_APPROVE_MD);

    if (canCreate && canApprove) {
        conflicts.push({
            title: "Procurement Lifecycle Conflict",
            description: "A single unit cannot have the authority to both initiate and authorize financial requisitions.",
            permissions: [PERMISSIONS.REQUISITION_CREATE, "requisition:approve:*"]
        });
    }

    // Conflict 2: Disbursement Fraud (Approve + Disburse)
    const canDisburse = permissions.includes(PERMISSIONS.REQUISITION_DISBURSE);
    const canFinanceApprove = permissions.includes(PERMISSIONS.REQUISITION_APPROVE_FINANCE);

    if (canDisburse && canFinanceApprove) {
        conflicts.push({
            title: "Disbursement Control Conflict",
            description: "Finance units with disbursement authority should not be the sole approvers for the same transactions.",
            permissions: [PERMISSIONS.REQUISITION_APPROVE_FINANCE, PERMISSIONS.REQUISITION_DISBURSE]
        });
    }

    return conflicts;
  }
};

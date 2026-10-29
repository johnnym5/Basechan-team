'use client';

import { Auth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { Firestore, collection, doc, query, where, getDocs, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import type { UserProfile, AppRole } from '@/lib/types';
import { DUTIES, PERMISSIONS } from '@/lib/permissions-registry';
import { ORG_ID } from '@/lib/config';

/**
 * Maps legacy role string or position title to a system role ID.
 */
function getRoleFromPosition(position?: string): string | null {
  if (!position) return null;
  const p = position.toLowerCase();
  if (p.includes('managing director') || p.includes('md') || p.includes('ceo')) return 'MANAGING_DIRECTOR';
  if (p.includes('hr') || p.includes('human resource')) return 'HR_MANAGER';
  if (p.includes('finance') || p.includes('accountant')) return 'FINANCE_MANAGER';
  if (p.includes('admin') || p.includes('administrator')) return 'ORG_ADMIN';
  return null;
}

export const authService = {
  /**
   * Handles Google Sign-In with robust staff email matching, detail preservation, and auto-provisioning.
   */
  async signInWithGoogle(auth: Auth, db: Firestore) {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email) {
        await signOut(auth);
        throw new Error("Google account must have an email address.");
      }

      const authUid = user.uid;
      const userEmail = user.email.toLowerCase();

      // 1. Direct document lookup by Auth UID
      const directDocRef = doc(db, 'users', authUid);
      const directSnap = await getDoc(directDocRef);

      let userData: UserProfile;

      if (directSnap.exists()) {
        userData = { id: authUid, ...directSnap.data() } as UserProfile;
        await updateDoc(directDocRef, {
          status: 'ONLINE',
          lastSeen: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString()
        });
      } else {
        // 2. Case-insensitive email lookup across user documents
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        const matchedDoc = querySnapshot.docs.find(d => d.data().email?.toLowerCase() === userEmail);

        if (matchedDoc) {
          const oldData = matchedDoc.data() as UserProfile;
          userData = {
            ...oldData,
            id: authUid,
            email: userEmail,
            status: 'ONLINE',
            lastSeen: new Date().toISOString(),
            lastHeartbeat: new Date().toISOString()
          };

          await setDoc(doc(db, 'users', authUid), userData, { merge: true });
        } else {
          // 3. Auto-provision staff profile if brand new Google account
          userData = {
            id: authUid,
            orgId: ORG_ID,
            email: userEmail,
            fullName: user.displayName || userEmail.split('@')[0],
            role: userEmail.includes('jegbase') ? 'SUPERADMIN' : 'STAFF',
            position: userEmail.includes('jegbase') ? 'Super Administrator' : 'Staff Member',
            departmentName: 'General Operations',
            joinedDate: new Date().toISOString(),
            status: 'ONLINE',
            lastSeen: new Date().toISOString(),
            lastHeartbeat: new Date().toISOString()
          } as UserProfile;

          await setDoc(doc(db, 'users', authUid), userData, { merge: true });
        }
      }

      // Sync permissions
      await authService.syncUserPermissions(db, authUid);

      return { user, profile: userData };
    } catch (error: any) {
      console.error("[AUTH] Google Sign-In error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error("Domain unauthorized. Please add 'basechan-team.web.app' to Authorized Domains in Firebase Auth Console.");
      }
      throw new Error(error.message || "Could not authenticate with Google.");
    }
  },

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
        description: 'Accounting, ledgers, and financial approvals.',
        orgId: 'SYSTEM',
        duties: ['STAFF_BASIC', 'FINANCE_CONTROL'],
        permissions: [...DUTIES.STAFF_BASIC, ...DUTIES.FINANCE_CONTROL],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'Managing Director',
        description: 'Executive oversight and high-level approvals.',
        orgId: 'SYSTEM',
        duties: ['STAFF_BASIC', 'HR_OPERATIONS', 'FINANCE_CONTROL', 'EXECUTIVE_OVERSIGHT'],
        permissions: [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS, ...DUTIES.FINANCE_CONTROL, ...DUTIES.EXECUTIVE_OVERSIGHT],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'Organization Admin',
        description: 'Full administrative control over company settings and staff.',
        orgId: 'SYSTEM',
        duties: ['STAFF_BASIC', 'HR_OPERATIONS', 'FINANCE_CONTROL', 'EXECUTIVE_OVERSIGHT'],
        permissions: [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS, ...DUTIES.FINANCE_CONTROL, ...DUTIES.EXECUTIVE_OVERSIGHT],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    for (const role of systemRoles) {
      const q = query(rolesRef, where('name', '==', role.name), where('isSystem', '==', true));
      const snap = await getDocs(q);
      if (snap.empty) {
        await setDoc(doc(rolesRef), role);
      }
    }
  },

  /**
   * Resolves effective permissions for a user based on assigned roleIds.
   * Caches the result on the user's document.
   */
  async syncUserPermissions(db: Firestore, userId: string) {
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (!userSnap.exists()) return [];

      const user = userSnap.data() as UserProfile;
      const roleIds = user.roleIds || [];

      if (roleIds.length === 0) {
          const positionRole = getRoleFromPosition(user.position);
          const legacyRole = positionRole || user.role;

          const legacyMapping: Record<string, string> = {
              'STAFF': 'role_staff',
              'HR_MANAGER': 'role_hr_manager',
              'FINANCE_MANAGER': 'role_finance_manager',
              'MANAGING_DIRECTOR': 'role_md',
              'ORG_ADMIN': 'role_org_admin',
              'SUPERADMIN': 'role_superadmin'
          };
          roleIds.push(legacyMapping[legacyRole] || 'role_staff');
      }

      const permissionSet = new Set<string>();

      for (const roleId of roleIds) {
          const roleSnap = await getDoc(doc(db, 'roles', roleId));
          if (roleSnap.exists()) {
              const roleData = roleSnap.data() as AppRole;
              roleData.permissions.forEach((p: string) => permissionSet.add(p));
          } else {
              if (roleId === 'role_staff') DUTIES.STAFF_BASIC.forEach((p: string) => permissionSet.add(p));
              if (roleId === 'role_hr_manager') [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS].forEach((p: string) => permissionSet.add(p));
              if (roleId === 'role_finance_manager') [...DUTIES.STAFF_BASIC, ...DUTIES.FINANCE_CONTROL].forEach((p: string) => permissionSet.add(p));
              if (roleId === 'role_md' || roleId === 'role_org_admin' || roleId === 'role_superadmin' || user.role === 'SUPERADMIN') {
                  [...DUTIES.STAFF_BASIC, ...DUTIES.HR_OPERATIONS, ...DUTIES.FINANCE_CONTROL, ...DUTIES.EXECUTIVE_OVERSIGHT].forEach((p: string) => permissionSet.add(p));
              }
          }
      }

      if (user.customPermissions) {
          if (user.customPermissions.canAccessAllTasks) permissionSet.add(PERMISSIONS.TASK_ACCESS_ALL);
          if (user.customPermissions.canAccessAllWorkbooks) permissionSet.add(PERMISSIONS.WORKBOOK_ACCESS_ALL);
          if (user.customPermissions.canManageAccounting) permissionSet.add(PERMISSIONS.FINANCE_MANAGE_ACCOUNTS);
          if (user.customPermissions.canViewAudit) permissionSet.add(PERMISSIONS.ADMIN_VIEW_AUDIT);
          if (user.role === 'HR_MANAGER' || user.role === 'ORG_ADMIN' || user.role === 'SUPERADMIN') permissionSet.add(PERMISSIONS.ADMIN_MANAGE_COMPANY);
      }

      const flatPermissions = Array.from(permissionSet);

      await setDoc(doc(db, 'users', userId), {
          roleIds,
          resolvedPermissions: flatPermissions,
          updatedAt: new Date().toISOString()
      }, { merge: true });

      return flatPermissions;
    } catch (e) {
      console.warn("[AUTH] Error syncing permissions:", e);
      return [];
    }
  },

  checkSoDConflicts(permissions: string[]) {
    const conflicts: { title: string; description: string; permissions: string[] }[] = [];

    const canCreate = permissions.includes(PERMISSIONS.REQUISITION_CREATE);
    const canApprove = permissions.includes(PERMISSIONS.REQUISITION_APPROVE_FINANCE) || permissions.includes(PERMISSIONS.REQUISITION_APPROVE_MD);
    if (canCreate && canApprove) {
        conflicts.push({
            title: 'Procurement SoD Conflict',
            description: 'User has permissions to both CREATE and APPROVE financial requisitions.',
            permissions: [PERMISSIONS.REQUISITION_CREATE, PERMISSIONS.REQUISITION_APPROVE_FINANCE]
        });
    }

    const canAuthorizePayment = permissions.includes(PERMISSIONS.REQUISITION_DISBURSE);
    if (canCreate && canAuthorizePayment) {
        conflicts.push({
            title: 'Financial Disbursement Conflict',
            description: 'User can both CREATE requisitions and AUTHORIZE direct disbursements.',
            permissions: [PERMISSIONS.REQUISITION_CREATE, PERMISSIONS.REQUISITION_DISBURSE]
        });
    }

    return conflicts;
  }
};

'use client';

import { Firestore, doc, updateDoc, increment } from 'firebase/firestore';
import type { UserProfile, LeaveType } from '@/lib/types';
import { auditService } from './audit-service';

/**
 * Service to manage leave entitlements and balance adjustments.
 */
export const leaveService = {
  /**
   * Adjusts the leave balance for a specific user.
   */
  async adjustLeaveBalance(
    db: Firestore,
    adminUser: UserProfile,
    targetUserId: string,
    leaveType: 'ANNUAL' | 'SICK',
    adjustment: number,
    reason: string
  ) {
    const userRef = doc(db, 'users', targetUserId);

    await updateDoc(userRef, {
      [`leaveEntitlements.${leaveType}`]: increment(adjustment)
    });

    await auditService.logAction(
      db,
      adminUser,
      'LEAVE_BALANCE_ADJUST',
      `Adjusted ${leaveType} leave balance for user ${targetUserId} by ${adjustment} days. Reason: ${reason}`,
      { id: targetUserId, type: 'LEAVE_ENTITLEMENT' }
    );
  }
};

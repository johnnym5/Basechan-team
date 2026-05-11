
'use client';

import { Firestore, collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import type { UserProfile, AuditLog } from '@/lib/types';

/**
 * Service to capture and persist high-priority organizational events.
 */
export const auditService = {
    /**
     * Logs a system-wide action to the audit ledger.
     */
    async logAction(
        db: Firestore, 
        user: UserProfile, 
        action: string, 
        details: string, 
        resource?: { id: string; type: string }
    ) {
        const auditRef = collection(db, 'audit_logs');
        const log: Omit<AuditLog, 'id'> = {
            orgId: user.orgId,
            userId: user.id,
            userName: user.fullName,
            action: action.toUpperCase(),
            details,
            resourceId: resource?.id,
            resourceType: resource?.type,
            timestamp: new Date().toISOString(),
        };

        return await addDocumentNonBlocking(auditRef, log);
    }
};

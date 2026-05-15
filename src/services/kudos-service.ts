
'use client';

import { Firestore, collection, query, where, getDocs, orderBy, limit, doc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Kudos, BadgeType, Notification } from '@/lib/types';
import { startOfWeek, endOfWeek } from 'date-fns';
import { auditService } from './audit-service';

/**
 * Service to handle the Peer Kudos gamification logic.
 */
export const kudosService = {
    /**
     * Awards a badge to a colleague, enforcing a "one per week" policy.
     */
    async awardBadge(db: Firestore, fromUser: UserProfile, toUserId: string, toUserName: string, badgeType: BadgeType, message: string) {
        if (fromUser.id === toUserId) throw new Error("Self-recognition is restricted to automated telemetry.");

        const now = new Date();
        const weekStart = startOfWeek(now).toISOString();
        const weekEnd = endOfWeek(now).toISOString();

        // 1. Enforce weekly quota check
        const kudosRef = collection(db, 'kudos');
        const q = query(
            kudosRef,
            where('fromUserId', '==', fromUser.id),
            where('timestamp', '>=', weekStart),
            where('timestamp', '<=', weekEnd),
            limit(1)
        );

        const snap = await getDocs(q);
        if (!snap.empty) {
            throw new Error("Weekly recognition quota reached. You can award your next badge next week.");
        }

        // 2. Create Kudos Record
        const newKudos: Omit<Kudos, 'id'> = {
            orgId: fromUser.orgId,
            fromUserId: fromUser.id,
            fromUserName: fromUser.fullName,
            toUserId: toUserId,
            badgeType,
            message,
            timestamp: now.toISOString(),
        };

        const docRef = await addDocumentNonBlocking(kudosRef, newKudos);

        // 3. Notify Recipient
        if (docRef) {
            const notification: Omit<Notification, 'id'> = {
                orgId: fromUser.orgId,
                userId: toUserId,
                title: 'New Identity Badge Earned!',
                description: `${fromUser.fullName} recognized you as a "${badgeType.replace('_', ' ')}".`,
                href: '/?panel=reports&tab=performance',
                isRead: false,
                createdAt: now.toISOString(),
            };
            addDocumentNonBlocking(collection(db, 'notifications'), notification);
            
            auditService.logAction(db, fromUser, 'KUDOS_AWARD', `Awarded ${badgeType} badge to ${toUserName}`, { id: docRef.id, type: 'KUDOS' });
        }

        return docRef;
    }
};

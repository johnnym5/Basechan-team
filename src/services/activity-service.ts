
'use client';

import { Firestore, doc, increment, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import type { UserProfile } from '@/lib/types';

/**
 * Service to manage personnel contribution telemetry and heatmap data.
 */
export const activityService = {
    /**
     * Atomically increments contribution points for a user on a specific date.
     */
    async logActivity(db: Firestore, user: UserProfile, points: number = 1) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const docId = `${user.id}_${today}`;
        const activityRef = doc(db, 'activity_points', docId);

        // setDoc with merge handles existence check and increment atomically
        return setDoc(activityRef, {
            orgId: user.orgId,
            userId: user.id,
            date: today,
            points: increment(points)
        }, { merge: true });
    }
};

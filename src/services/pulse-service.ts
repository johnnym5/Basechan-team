
'use client';

import { Firestore, collection, query, where, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import type { UserProfile, PulseCheck, PulseMood, Notification } from '@/lib/types';
import { format } from 'date-fns';
import { auditService } from './activity-service';

export const pulseService = {
    /**
     * Record daily pulse and check for burnout patterns.
     */
    async logPulse(db: Firestore, user: UserProfile, mood: PulseMood) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const now = new Date().toISOString();

        const pulse: Omit<PulseCheck, 'id'> = {
            orgId: user.orgId,
            userId: user.id,
            userName: user.fullName,
            date: today,
            mood,
            timestamp: now,
        };

        const docRef = await addDocumentNonBlocking(collection(db, 'pulse_checks'), pulse);

        // 1. Burnout Detection Logic: Check last 3 entries
        if (mood === 'OVERWHELMED') {
            const historyQuery = query(
                collection(db, 'pulse_checks'),
                where('userId', '==', user.id),
                orderBy('date', 'desc'),
                limit(3)
            );
            
            const snap = await getDocs(historyQuery);
            const history = snap.docs.map(d => d.data() as PulseCheck);
            
            const consecutiveOverwhelmed = history.filter(p => p.mood === 'OVERWHELMED').length;

            if (consecutiveOverwhelmed >= 3) {
                // 2. Trigger HR Intervention Alert
                const hrQuery = query(
                    collection(db, 'users'),
                    where('orgId', '==', user.orgId),
                    where('role', 'in', ['HR_MANAGER', 'ORG_ADMIN'])
                );
                const hrSnap = await getDocs(hrQuery);

                hrSnap.forEach(hrDoc => {
                    const notification: Omit<Notification, 'id'> = {
                        orgId: user.orgId,
                        userId: hrDoc.id,
                        title: '🔴 Critical Burnout Alert',
                        description: `Personnel ${user.fullName} has reported being "Overwhelmed" for 3 consecutive cycles. Intervention recommended.`,
                        href: '/?panel=reports&tab=team-health',
                        isRead: false,
                        createdAt: now,
                    };
                    addDocumentNonBlocking(collection(db, 'notifications'), notification);
                });
            }
        }

        return docRef;
    }
};

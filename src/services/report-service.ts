'use client';

import { Firestore, collection, query, where, getDocs } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Attendance, Task, DailyReport, Chat } from '@/lib/types';
import { format, startOfDay } from 'date-fns';
import { sanitizeInput } from '@/lib/utils';

/**
 * Service to generate structured organizational telemetry reports.
 */
export const reportService = {
    /**
     * Aggregates telemetry from various modules to generate an automated end-of-day summary.
     */
    async generateAutomatedEODReport(db: Firestore, user: UserProfile, attendance: Attendance) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const dayStart = startOfDay(new Date()).toISOString();

        // 1. Fetch Completed Tasks today
        const tasksQuery = query(
            collection(db, 'tasks'),
            where('assignedTo', '==', user.id),
            where('status', '==', 'ARCHIVED'),
            where('createdAt', '>=', dayStart)
        );
        const tasksSnap = await getDocs(tasksQuery);
        const completedTasks = tasksSnap.docs.map(d => ({
            taskId: d.id,
            title: (d.data() as Task).title
        }));

        // 2. Fetch Chat interactions today
        const chatsQuery = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.id),
            where('updatedAt', '>=', dayStart)
        );
        const chatsSnap = await getDocs(chatsQuery);
        const interactedParties = new Set<string>();
        chatsSnap.forEach(doc => {
            const data = doc.data() as Chat;
            Object.values(data.participantProfiles).forEach(p => {
                if (p.fullName !== user.fullName) interactedParties.add(p.fullName);
            });
        });

        // 3. Calculate Durations
        const clockIn = new Date(attendance.clockIn);
        const clockOut = new Date();
        const totalDurationSeconds = Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000);
        const activeHours = (totalDurationSeconds / 3600).toFixed(2);
        const idleHours = ((attendance.idleTime || 0) / 3600).toFixed(2);

        // 4. Construct Content
        const summary = `
[SYSTEM GENERATED EOD REPORT]
-----------------------------------
SHIFT TELEMETRY:
- Total Time on System: ${activeHours} hours
- Inactive (Idle) Time: ${idleHours} hours
- Operational Readiness: ${attendance.location}

MISSION LOG:
- Tasks Finalized: ${completedTasks.length}
${completedTasks.map(t => `  • ${t.title}`).join('\n')}

COMMUNICATIONS:
- Active Channels/Contacts: ${interactedParties.size}
- Units Contacted: ${Array.from(interactedParties).join(', ') || 'None'}
        `.trim();

        const reportData: Omit<DailyReport, 'id'> = {
            orgId: user.orgId,
            userId: user.id,
            userName: user.fullName,
            reportDate: today,
            content: sanitizeInput(summary),
            completedTasks: completedTasks,
            createdAt: new Date().toISOString(),
        };

        return await addDocumentNonBlocking(collection(db, 'daily_reports'), reportData);
    }
};

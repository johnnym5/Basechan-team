'use client';

import { Firestore, collection, query, where, getDocs, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Attendance, Task, DailyReport, Chat } from '@/lib/types';
import { format, startOfDay, differenceInSeconds } from 'date-fns';
import { sanitizeInput } from '@/lib/utils';
import { activityService } from './activity-service';

/**
 * Service to aggregate organizational data and generate automated reports.
 */
export const reportService = {
    /**
     * Captures system state to generate an automated end-of-day summary.
     * Uses deterministic IDs to ensure one report per user per day.
     */
    async generateAutomatedEODReport(db: Firestore, user: UserProfile, attendance: Attendance) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const id = `${user.id}_${today}`;
        const dayStart = startOfDay(new Date()).toISOString();

        // 1. AGGREGATE COMPLETED TASKS
        const tasksQuery = query(
            collection(db, 'tasks'),
            where('assignedTo', '==', user.id),
            where('status', '==', 'ARCHIVED')
        );
        const tasksSnap = await getDocs(tasksQuery);
        
        // Filter for tasks completed today by checking the activity log timestamps
        const completedToday = tasksSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Task))
            .filter(t => t.activity.some(a => a.toStatus === 'ARCHIVED' && a.timestamp >= dayStart));

        // 2. AGGREGATE COLLABORATION PARTNERS
        const chatsQuery = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.id)
        );
        const chatsSnap = await getDocs(chatsQuery);
        const partners = new Set<string>();
        
        // Check which chats had activity today
        chatsSnap.forEach(doc => {
            const chat = doc.data() as Chat;
            if (chat.updatedAt >= dayStart) {
                Object.values(chat.participantProfiles).forEach(p => {
                    if (p.fullName !== user.fullName) partners.add(p.fullName);
                });
            }
        });

        // 3. CALCULATE DURATIONS
        const clockInTime = new Date(attendance.clockIn);
        const clockOutTime = new Date();
        const totalDurationHrs = (differenceInSeconds(clockOutTime, clockInTime) / 3600).toFixed(2);
        const idleHrs = ((attendance.idleTime || 0) / 3600).toFixed(2);

        // 4. CONSTRUCT SUMMARY
        const summary = `
[SYSTEM GENERATED END-OF-DAY REPORT]
-----------------------------------
SHIFT METRICS:
- Total Time: ${totalDurationHrs} hours
- Inactive Time: ${idleHrs} hours
- Location: ${attendance.location}

TASK SUMMARY:
- Tasks Completed: ${completedToday.length}
${completedToday.map(t => `  • ${t.title} (${t.serialNo})`).join('\n') || '  • No tasks completed today.'}

COLLABORATION:
- Team Members Contacted: ${partners.size}
- Contacts: ${Array.from(partners).join(', ') || 'None'}
        `.trim();

        const reportData: Omit<DailyReport, 'id'> = {
            orgId: user.orgId,
            userId: user.id,
            userName: user.fullName,
            reportDate: today,
            content: sanitizeInput(summary),
            completedTasks: completedToday.map(t => ({ taskId: t.id, title: t.title })),
            createdAt: new Date().toISOString(),
        };

        // Award Activity Points: +10 for automated report submission
        await activityService.logActivity(db, user, 10);

        // Use setDoc to ensure report is unique per day and gets updated if multiple clock-outs occur
        return await setDoc(doc(db, 'daily_reports', id), reportData, { merge: true });
    }
};
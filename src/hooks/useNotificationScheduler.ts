
'use client';

import { useEffect, useRef, useState } from 'react';
import type { SystemConfig, Attendance, UserProfile } from '@/lib/types';
import { format, parse, isAfter, isBefore, addMinutes, differenceInMinutes } from 'date-fns';

/**
 * Hook to manage deterministic background reminders and escalations.
 */
export function useNotificationScheduler(
    user: UserProfile | null,
    systemConfig: SystemConfig | null,
    attendance: Attendance | null
) {
    const lastNotifiedRef = useRef<Record<string, string>>({});
    const [escalationStep, setEscalationLevel] = useState(0);

    useEffect(() => {
        if (!user || !systemConfig || typeof window === 'undefined') return;

        const interval = setInterval(() => {
            const now = new Date();
            const timeStr = format(now, 'HH:mm');
            const today = format(now, 'yyyy-MM-dd');

            // 1. Check Shift Start (8:50 AM for 9:00 AM shift)
            if (systemConfig.work_hours?.start && !attendance) {
                const startTime = parse(systemConfig.work_hours.start, 'HH:mm', now);
                const notificationLeadTime = addMinutes(startTime, -10);
                
                if (isAfter(now, notificationLeadTime) && isBefore(now, startTime)) {
                    triggerReminder(
                        'Shift Impending',
                        `Good morning ${user.fullName.split(' ')[0]}, it's almost time to deploy. Ready to start your shift?`,
                        'shift-start',
                        [{ action: 'login', title: 'Start Shift' }]
                    );
                }
            }

            // 2. Check Shift End & Sign-out Escalation
            if (systemConfig.work_hours?.end && attendance && !attendance.clockOut) {
                const endTime = parse(systemConfig.work_hours.end, 'HH:mm', now);
                
                if (isAfter(now, endTime)) {
                    const minutesOver = differenceInMinutes(now, endTime);
                    
                    // Escalation thresholds: immediate, +10, +15, +17...
                    const thresholds = [0, 10, 15, 17, 19];
                    const currentThreshold = thresholds[escalationStep] || 20;

                    if (minutesOver >= currentThreshold) {
                        triggerReminder(
                            'End of Day Clearance',
                            `Operational hours have concluded. Please submit your daily report and sign out to preserve telemetry integrity.`,
                            `shift-end-${escalationStep}`,
                            [{ action: 'login', title: 'Sign Out Now' }]
                        );
                        setEscalationLevel(prev => Math.min(prev + 1, thresholds.length - 1));
                    }
                }
            }
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [user, systemConfig, attendance, escalationStep]);

    const triggerReminder = async (title: string, body: string, id: string, actions: any[] = []) => {
        if (!('serviceWorker' in navigator)) return;
        
        const key = `${id}-${format(new Date(), 'yyyy-MM-dd')}`;
        if (lastNotifiedRef.current[key]) return;

        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: id,
            actions,
            requireInteraction: true
        });

        lastNotifiedRef.current[key] = new Date().toISOString();
    };
}

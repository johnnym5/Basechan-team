'use client';

import { useEffect, useRef, useState } from 'react';
import type { SystemConfig, Attendance, UserProfile } from '@/lib/types';
import { format, parse, isAfter, isBefore, addMinutes, differenceInMinutes } from 'date-fns';

/**
 * Hook to manage deterministic shift reminders and escalating sign-out alerts.
 */
export function useShiftReminders(
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

            // 1. MORNING REMINDER (10 mins before start)
            if (systemConfig.work_hours?.start && !attendance) {
                const startTime = parse(systemConfig.work_hours.start, 'HH:mm', now);
                const reminderTime = addMinutes(startTime, -10);
                
                if (isAfter(now, reminderTime) && isBefore(now, startTime)) {
                    triggerNotification(
                        'Shift Impending',
                        `Good morning ${user.fullName.split(' ')[0]}, shift starts in 10 minutes. Ready to clock in?`,
                        'morning-reminder',
                        [{ action: 'clock-in', title: 'Clock In' }]
                    );
                }
            }

            // 2. ESCALATING SIGN-OUT REMINDERS
            if (systemConfig.work_hours?.end && attendance && !attendance.clockOut) {
                const endTime = parse(systemConfig.work_hours.end, 'HH:mm', now);
                
                if (isAfter(now, endTime)) {
                    const minutesPast = differenceInMinutes(now, endTime);
                    
                    // Escalation Steps: 0m, 10m, 15m, 17m
                    const thresholds = [0, 10, 15, 17];
                    const targetThreshold = thresholds[escalationStep] || 20;

                    if (minutesPast >= targetThreshold) {
                        const urgency = escalationStep >= 2 ? 'CRITICAL' : 'Standard';
                        triggerNotification(
                            `[${urgency}] Sign-Out Required`,
                            `Shift concluded at ${systemConfig.work_hours.end}. Submit your report and sign out now.`,
                            `signout-escalation-${escalationStep}`,
                            [{ action: 'sign-out', title: 'Sign Out' }]
                        );
                        setEscalationLevel(prev => Math.min(prev + 1, thresholds.length - 1));
                    }
                }
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [user, systemConfig, attendance, escalationStep]);

    const triggerNotification = async (title: string, body: string, tag: string, actions: any[] = []) => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return;
        
        // Ensure permission is granted before execution
        if (Notification.permission !== 'granted') return;

        const key = `${tag}-${format(new Date(), 'yyyy-MM-dd')}`;
        if (lastNotifiedRef.current[key]) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                tag,
                actions,
                requireInteraction: true,
                vibrate: [200, 100, 200],
                badge: '/favicon.ico'
            });

            lastNotifiedRef.current[key] = new Date().toISOString();
        } catch (e) {
            console.warn("Shift reminder failed:", e);
        }
    };
}

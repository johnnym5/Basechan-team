'use client';

import { useEffect, useRef, useState } from 'react';
import type { SystemConfig, Attendance, UserProfile } from '@/lib/types';
import { format, parse, isAfter, isBefore, addMinutes, differenceInMinutes } from 'date-fns';
import { getDistanceInMeters } from '@/lib/utils';

/**
 * Hook to manage deterministic background reminders and proactive geofencing.
 * This runs in the layout and uses the Service Worker to trigger local OS notifications.
 */
export function useNotificationScheduler(
    user: UserProfile | null,
    systemConfig: SystemConfig | null,
    attendance: Attendance | null
) {
    const lastNotifiedRef = useRef<Record<string, string>>({});
    const [escalationStep, setEscalationLevel] = useState(0);
    const watchIdRef = useRef<number | null>(null);
    const wasInGeofenceRef = useRef<boolean | null>(null);

    useEffect(() => {
        if (!user || !systemConfig || typeof window === 'undefined') return;

        // --- 1. TIME-BASED REMINDERS ---
        const interval = setInterval(() => {
            const now = new Date();

            // Check Shift Start (10 mins to shift)
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

            // Check Shift End & Sign-out Escalation
            if (systemConfig.work_hours?.end && attendance && !attendance.clockOut) {
                const endTime = parse(systemConfig.work_hours.end, 'HH:mm', now);
                
                if (isAfter(now, endTime)) {
                    const minutesOver = differenceInMinutes(now, endTime);
                    const thresholds = [0, 10, 15, 17, 19];
                    const currentThreshold = thresholds[escalationStep] || 20;

                    if (minutesOver >= currentThreshold) {
                        triggerReminder(
                            'End of Day Clearance',
                            `Operational hours have concluded. Please submit your daily report and sign out.`,
                            `shift-end-${escalationStep}`,
                            [{ action: 'login', title: 'Sign Out Now' }]
                        );
                        setEscalationLevel(prev => Math.min(prev + 1, thresholds.length - 1));
                    }
                }
            }
        }, 30000);

        // --- 2. PROACTIVE GEOFENCING ---
        if (systemConfig.office_coordinates && 'geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
                const distance = getDistanceInMeters(
                    pos.coords.latitude, 
                    pos.coords.longitude, 
                    systemConfig.office_coordinates!.lat, 
                    systemConfig.office_coordinates!.lng
                );

                const isInGeofence = distance <= 200;

                // Arrival Trigger
                if (isInGeofence && wasInGeofenceRef.current === false && !attendance) {
                    triggerReminder(
                        'Arrival Detected',
                        `You've arrived at the node. Clock in for your shift?`,
                        'geofence-arrival',
                        [{ action: 'login', title: 'Clock In' }]
                    );
                }

                // Departure Trigger
                if (!isInGeofence && wasInGeofenceRef.current === true && attendance && !attendance.clockOut) {
                    triggerReminder(
                        'Departure Alert',
                        `You have left the geofence but are still clocked in. Clock out now?`,
                        'geofence-departure',
                        [{ action: 'login', title: 'Sign Out' }]
                    );
                }

                wasInGeofenceRef.current = isInGeofence;
            }, (err) => console.warn("Geofence tracking paused:", err.message), {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 60000
            });
        }

        return () => {
            clearInterval(interval);
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [user, systemConfig, attendance, escalationStep]);

    const triggerReminder = async (title: string, body: string, id: string, actions: any[] = []) => {
        if (!('serviceWorker' in navigator)) return;
        
        const key = `${id}-${format(new Date(), 'yyyy-MM-dd')}`;
        if (lastNotifiedRef.current[key]) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification(title, {
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: id,
                actions,
                requireInteraction: true,
                vibrate: [200, 100, 200]
            });

            lastNotifiedRef.current[key] = new Date().toISOString();
        } catch (e) {
            console.warn("Notification failed to trigger:", e);
        }
    };
}

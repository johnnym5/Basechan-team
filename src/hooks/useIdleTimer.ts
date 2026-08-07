'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import type { Attendance } from '@/lib/types';

const IDLE_THRESHOLD = 180000; // 3 minutes
const THROTTLE_DELAY = 1000;   // Throttle activity events to 1 second
const CHECK_INTERVAL = 5000;   // Check idle status every 5 seconds

/**
 * Monitors user activity and records idle time to the active attendance record.
 * Uses Page Visibility API and throttled event listeners for accuracy.
 */
export function useIdleTimer(attendanceRecord: Attendance | null) {
    const firestore = useFirestore();
    const [isIdle, setIsIdle] = useState(false);
    const lastActivityTime = useRef(Date.now());
    const idleStartTime = useRef<number | null>(null);
    const lastThrottleTime = useRef(0);

    useEffect(() => {
        if (!attendanceRecord || !attendanceRecord.id || attendanceRecord.clockOut || attendanceRecord.onBreak || !firestore) {
            return;
        }

        const syncIdleTime = (startTime: number, endTime: number) => {
            const idleDurationSeconds = Math.floor((endTime - startTime) / 1000);
            if (idleDurationSeconds > 0) {
                const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);
                updateDocumentNonBlocking(attendanceRef, {
                    idleTime: increment(idleDurationSeconds)
                });
            }
        };

        const handleActivity = () => {
            const now = Date.now();
            
            // Throttle activity updates to save cycles
            if (now - lastThrottleTime.current < THROTTLE_DELAY) return;
            lastThrottleTime.current = now;

            if (isIdle && idleStartTime.current) {
                syncIdleTime(idleStartTime.current, now);
                setIsIdle(false);
                idleStartTime.current = null;
            }

            lastActivityTime.current = now;
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Immediate idle when tab is hidden
                if (!isIdle) {
                    setIsIdle(true);
                    idleStartTime.current = Date.now();
                }
            } else {
                // Return from hidden
                handleActivity();
            }
        };

        // Standard interaction events
        const activityEvents = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
        activityEvents.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const checkIdle = () => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityTime.current;

            if (!isIdle && timeSinceLastActivity >= IDLE_THRESHOLD) {
                setIsIdle(true);
                idleStartTime.current = now;
            }
        };

        const idleCheckInterval = setInterval(checkIdle, CHECK_INTERVAL);

        return () => {
            activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(idleCheckInterval);

            // Cleanup: if user closes tab while idle, we can't easily sync here
            // but the current logic handles return accurately.
        };
    }, [attendanceRecord, isIdle, firestore]);

    return { isIdle };
}

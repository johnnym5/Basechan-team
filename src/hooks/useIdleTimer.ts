'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import type { Attendance } from '@/lib/types';

const IDLE_THRESHOLD = 300000; // 5 minutes in milliseconds
const SYNC_INTERVAL = 60000; // Sync accumulated idle time every 1 minute if applicable

/**
 * Monitors user activity and records idle time to the active attendance record.
 */
export function useIdleTimer(attendanceRecord: Attendance | null) {
    const firestore = useFirestore();
    const [isIdle, setIsIdle] = useState(false);
    const idleTimeAccumulator = useRef(0);
    const lastActivityTime = useRef(Date.now());
    const idleStartTime = useRef<number | null>(null);

    useEffect(() => {
        if (!attendanceRecord || !attendanceRecord.id || attendanceRecord.clockOut || attendanceRecord.onBreak || !firestore) {
            return;
        }

        const handleActivity = () => {
            const now = Date.now();
            
            if (isIdle && idleStartTime.current) {
                // User returned from idle. Calculate the duration.
                const idleDurationSeconds = Math.floor((now - idleStartTime.current) / 1000);
                if (idleDurationSeconds > 0) {
                    // Sync to Firestore
                    const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);
                    updateDocumentNonBlocking(attendanceRef, {
                        idleTime: increment(idleDurationSeconds)
                    });
                }
                setIsIdle(false);
                idleStartTime.current = null;
            }

            lastActivityTime.current = now;
        };

        const checkIdle = () => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityTime.current;

            if (!isIdle && timeSinceLastActivity >= IDLE_THRESHOLD) {
                setIsIdle(true);
                idleStartTime.current = now;
            }
        };

        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
        activityEvents.forEach(event => window.addEventListener(event, handleActivity));

        const idleCheckInterval = setInterval(checkIdle, 10000); // Check every 10 seconds

        return () => {
            activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
            clearInterval(idleCheckInterval);
        };
    }, [attendanceRecord, isIdle, firestore]);

    return { isIdle };
}

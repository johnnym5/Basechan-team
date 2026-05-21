
'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import type { Attendance } from '@/lib/types';

const IDLE_THRESHOLD = 30000; // 30 seconds as requested
const CHECK_INTERVAL = 5000;  // Check every 5 seconds

/**
 * Monitors user activity and records idle time to the active attendance record.
 * Integrates System-Level Idle Detection where supported.
 */
export function useIdleTimer(attendanceRecord: Attendance | null) {
    const firestore = useFirestore();
    const [isIdle, setIsIdle] = useState(false);
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

        // --- System-Level Idle Detection ---
        let controller: AbortController | null = null;
        
        const initSystemIdleDetection = async () => {
            if ('IdleDetector' in window) {
                try {
                    // We assume permission was requested in layout or profile
                    if ((Notification as any).permission === 'granted') {
                        controller = new AbortController();
                        const idleDetector = new (window as any).IdleDetector();
                        
                        idleDetector.addEventListener('change', () => {
                            const { userState, screenState } = idleDetector;
                            if (userState === 'idle' || screenState === 'locked') {
                                if (!isIdle) {
                                    setIsIdle(true);
                                    idleStartTime.current = Date.now();
                                }
                            } else {
                                handleActivity();
                            }
                        });

                        await idleDetector.start({
                            threshold: 60000, // System-level minimum is usually 60s
                            signal: controller.signal,
                        });
                    }
                } catch (e) {}
            }
        };

        initSystemIdleDetection();

        // --- App-Level Immediate Detection ---
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        activityEvents.forEach(event => window.addEventListener(event, handleActivity));

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
            clearInterval(idleCheckInterval);
            if (controller) controller.abort();
        };
    }, [attendanceRecord, isIdle, firestore]);

    return { isIdle };
}

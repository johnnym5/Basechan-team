'use client';

import { useEffect, useRef } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import type { Attendance } from '@/lib/types';

const NOTIFY_THRESHOLD = 15 * 60; // 15 minutes in seconds
const AUTO_LOG_THRESHOLD = 20 * 60; // 20 minutes in seconds (15m + 5m)

/**
 * Robust Idle Tracker using Web Workers and Page Visibility API.
 * Bypasses browser background throttling to ensure accurate idle tracking even when tab is frozen.
 */
export function useRobustIdleTracker(attendanceRecord: Attendance | null) {
    const firestore = useFirestore();
    const workerRef = useRef<Worker | null>(null);
    const hasNotifiedRef = useRef(false);
    const hasAutoLoggedRef = useRef(false);
    const lastHiddenAt = useRef<number | null>(null);

    useEffect(() => {
        // 1. Request notification permission on mount
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }, []);

    useEffect(() => {
        if (!attendanceRecord?.id || attendanceRecord.clockOut || !firestore) {
            return;
        }

        // 2. Initialize Web Worker to bypass main thread throttling
        try {
            workerRef.current = new Worker('/worker/idleTimer.js');
        } catch (e) {
            console.error("[Robust Idle Tracker] Worker initialization failed:", e);
            return;
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Log exactly when the user left the app
                lastHiddenAt.current = Date.now();
                console.log(`[Robust Idle Tracker] Tab hidden at: ${new Date(lastHiddenAt.current).toLocaleTimeString()}`);

                // Start worker timer
                workerRef.current?.postMessage({ command: 'START' });
            } else {
                const returnTime = Date.now();
                if (lastHiddenAt.current) {
                    const secondsHidden = Math.floor((returnTime - lastHiddenAt.current) / 1000);
                    console.log(`[Robust Idle Tracker] Tab visible. Total hidden duration: ${secondsHidden}s`);
                }

                // Stop worker and reset local tracking flags for the next background cycle
                workerRef.current?.postMessage({ command: 'STOP' });
                hasNotifiedRef.current = false;
                hasAutoLoggedRef.current = false;
                lastHiddenAt.current = null;
            }
        };

        workerRef.current.onmessage = (e) => {
            // Only process if the page is currently hidden (to respect background tracking only)
            if (e.data.type === 'TICK' && document.visibilityState === 'hidden') {
                const elapsedSeconds = e.data.elapsed;

                // 3. The Ping Logic: 15 minutes
                if (elapsedSeconds >= NOTIFY_THRESHOLD && !hasNotifiedRef.current) {
                    if (Notification.permission === 'granted') {
                        new Notification("System Standby", {
                            body: "Your session is idle. Please click here to verify active duty.",
                            requireInteraction: true,
                            tag: 'idle-alert'
                        });
                    }
                    hasNotifiedRef.current = true;
                }

                // 4. Auto-Status Update: 20 minutes total (15m + 5m post-ping)
                if (elapsedSeconds >= AUTO_LOG_THRESHOLD && !hasAutoLoggedRef.current) {
                    const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);

                    updateDocumentNonBlocking(attendanceRef, {
                        idleTime: increment(elapsedSeconds)
                    });

                    hasAutoLoggedRef.current = true;
                    console.warn(`[Robust Idle Tracker] Session ${attendanceRecord.id} auto-logged ${elapsedSeconds}s inactive time.`);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial check if mounted while hidden
        if (document.visibilityState === 'hidden') {
            lastHiddenAt.current = Date.now();
            workerRef.current.postMessage({ command: 'START' });
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            workerRef.current?.terminate();
        };
    }, [attendanceRecord?.id, attendanceRecord?.clockOut, firestore]);

    return {
        hasNotified: hasNotifiedRef.current,
        hasAutoLogged: hasAutoLoggedRef.current
    };
}

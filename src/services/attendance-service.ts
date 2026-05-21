'use client';

import { Firestore, collection, doc, query, where, limit, getDocs, increment, arrayUnion, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Attendance, AttendanceLocation } from '@/lib/types';
import { differenceInSeconds } from 'date-fns';
import { reportService } from './report-service';
import { uiEmitter } from '@/lib/ui-emitter';

/**
 * Service to manage personnel shift lifecycle and automated reporting triggers.
 * Ensures one attendance record per user per day via deterministic IDs.
 */
export const attendanceService = {
  /**
   * Initiates a new work session.
   * If a record for today already exists (re-clocking), it resumes the existing session.
   */
  async clockIn(db: Firestore, user: UserProfile, location: AttendanceLocation, today: string) {
    const id = `${user.id}_${today}`;
    const docRef = doc(db, 'attendance', id);
    const snap = await getDoc(docRef);
    const now = new Date();
    const nowIso = now.toISOString();

    if (snap.exists()) {
        const data = snap.data() as Attendance;
        if (data.clockOut) {
            // Re-clocking logic: Treat the time between last out and now as a break
            const lastOut = new Date(data.clockOut);
            const gapSeconds = differenceInSeconds(now, lastOut);
            
            await updateDoc(docRef, {
                clockOut: null, // Clear sign-out status
                onBreak: false,
                breaks: arrayUnion({ start: data.clockOut, end: nowIso }),
                totalBreak: increment(gapSeconds),
                location, // Update to current deployment location
                status: 'APPROVED' // Maintain approval status
            });
            
            // Update user status
            const userRef = doc(db, 'users', user.id);
            updateDocumentNonBlocking(userRef, { status: 'ONLINE', lastSeen: nowIso });
            
            return docRef;
        }
        return docRef; // Already active in current shift
    }

    // First clock-in for the day: Initialize record
    const newRecord: Omit<Attendance, 'id'> = {
      userId: user.id,
      userName: user.fullName,
      orgId: user.orgId,
      date: today,
      clockIn: nowIso,
      status: 'PENDING',
      location,
      remarks: [],
      idleTime: 0,
      totalBreak: 0,
      onBreak: false,
      breaks: [],
    };
    
    await setDoc(docRef, newRecord);
    
    // Update user status
    const userRef = doc(db, 'users', user.id);
    updateDocumentNonBlocking(userRef, { status: 'ONLINE', lastSeen: nowIso });
    
    return docRef;
  },

  /**
   * Toggles shift suspension (Breaks).
   */
  async toggleBreak(db: Firestore, record: Attendance) {
    const now = new Date().toISOString();
    const attendanceRef = doc(db, 'attendance', record.id);

    if (!record.onBreak) {
      updateDocumentNonBlocking(attendanceRef, {
        onBreak: true,
        breaks: arrayUnion({ start: now })
      });
    } else {
      const lastBreak = record.breaks?.[record.breaks.length - 1];
      if (lastBreak) {
        const breakSeconds = differenceInSeconds(new Date(now), new Date(lastBreak.start));
        const updatedBreaks = [...(record.breaks || [])];
        updatedBreaks[updatedBreaks.length - 1].end = now;

        updateDocumentNonBlocking(attendanceRef, {
          onBreak: false,
          breaks: updatedBreaks,
          totalBreak: increment(breakSeconds)
        });
      }
    }
  },

  /**
   * Terminates the work session and triggers automated EOD reporting.
   */
  async clockOut(db: Firestore, user: UserProfile, record: Attendance) {
    const now = new Date();
    const attendanceRef = doc(db, 'attendance', record.id);
    const userRef = doc(db, 'users', user.id);

    // 1. Finalize attendance data
    const finalUpdate: any = {
      clockOut: now.toISOString(),
      status: 'APPROVED',
      onBreak: false,
    };

    // Handle active break closure on signout
    if (record.onBreak && record.breaks?.length) {
        const lastBreak = record.breaks[record.breaks.length - 1];
        if (!lastBreak.end) {
            const breakSeconds = differenceInSeconds(now, new Date(lastBreak.start));
            const updatedBreaks = [...record.breaks];
            updatedBreaks[updatedBreaks.length - 1].end = now.toISOString();
            finalUpdate.breaks = updatedBreaks;
            finalUpdate.totalBreak = increment(breakSeconds);
        }
    }

    // 2. AUTOMATED EOD REPORTING
    try {
        await reportService.generateAutomatedEODReport(db, user, { ...record, ...finalUpdate });
    } catch (e) {
        console.error("Automated EOD Report failure:", e);
    }

    // 3. Persist termination
    updateDocumentNonBlocking(attendanceRef, finalUpdate);
    updateDocumentNonBlocking(userRef, { status: 'OFFLINE', lastSeen: now.toISOString() });
    
    // 4. Trigger Pulse Check Survey
    uiEmitter.emit('open-pulse-check' as any);
  }
};

'use client';

import { Firestore, collection, doc, query, where, limit, getDocs, increment, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Attendance, AttendanceLocation } from '@/lib/types';
import { differenceInSeconds } from 'date-fns';
import { reportService } from './report-service';
import { uiEmitter } from '@/lib/ui-emitter';

/**
 * Service to manage personnel shift lifecycle and automated reporting triggers.
 */
export const attendanceService = {
  /**
   * Initiates a new work session.
   */
  async clockIn(db: Firestore, user: UserProfile, location: AttendanceLocation, today: string) {
    const newRecord: Omit<Attendance, 'id'> = {
      userId: user.id,
      userName: user.fullName,
      orgId: user.orgId,
      date: today,
      clockIn: new Date().toISOString(),
      status: 'PENDING',
      location,
      remarks: [],
      idleTime: 0,
      totalBreak: 0,
      onBreak: false,
      breaks: [],
    };
    const docRef = await addDocumentNonBlocking(collection(db, 'attendance'), newRecord);
    
    // Update user status
    const userRef = doc(db, 'users', user.id);
    updateDocumentNonBlocking(userRef, { status: 'ONLINE', lastSeen: newRecord.clockIn });
    
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

    // 2. AUTOMATED EOD REPORTING (Epic 4)
    // We trigger this before the final write to capture the latest telemetry
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

'use client';

import { Firestore, collection, doc, query, where, limit, getDocs, increment, arrayUnion, getDoc, setDoc, updateDoc, orderBy } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Attendance, AttendanceLocation } from '@/lib/types';
import { differenceInSeconds } from 'date-fns';
import { reportService } from './report-service';
import { uiEmitter } from '@/lib/ui-emitter';

/**
 * Service to manage personnel shift lifecycle and automated reporting triggers.
 * Ensures one attendance record per user per day via deterministic IDs and proactive scans.
 */
export const attendanceService = {
  /**
   * Initiates a new work session.
   * Performs a deep scan to prevent duplicate records for the same operational cycle.
   */
  async clockIn(db: Firestore, user: UserProfile, location: AttendanceLocation, today: string) {
    if (!user?.id) throw new Error("Personnel identity verification failed. Command aborted.");

    const deterministicId = `${user.id}_${today}`;
    const docRef = doc(db, 'attendance', deterministicId);
    
    // 1. PROACTIVE DUPLICATE SCAN
    // Check if ANY record exists for this user today, not just the deterministic one.
    const q = query(
        collection(db, 'attendance'),
        where('userId', '==', user.id),
        where('date', '==', today),
        orderBy('clockIn', 'desc'),
        limit(1)
    );
    
    const snap = await getDocs(q);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const data = existingDoc.data() as Attendance;
        const activeRef = doc(db, 'attendance', existingDoc.id);

        if (data.clockOut) {
            // RESUME SESSION: Treat the gap as a break segment
            const lastOut = new Date(data.clockOut);
            const gapSeconds = Math.max(0, differenceInSeconds(now, lastOut));
            
            await updateDoc(activeRef, {
                clockOut: null,
                onBreak: false,
                breaks: arrayUnion({ start: data.clockOut, end: nowIso }),
                totalBreak: increment(gapSeconds),
                location,
                status: 'APPROVED'
            });
            
            const userRef = doc(db, 'users', user.id);
            updateDocumentNonBlocking(userRef, { status: 'ONLINE', lastSeen: nowIso });
            return activeRef;
        }
        
        // ALREADY ACTIVE: Just return the existing reference
        return activeRef;
    }

    // 2. NEW SESSION INITIALIZATION
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

    const finalUpdate: any = {
      clockOut: now.toISOString(),
      status: 'APPROVED',
      onBreak: false,
    };

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

    try {
        await reportService.generateAutomatedEODReport(db, user, { ...record, ...finalUpdate });
    } catch (e) {
        console.error("Automated EOD Report failure:", e);
    }

    updateDocumentNonBlocking(attendanceRef, finalUpdate);
    updateDocumentNonBlocking(userRef, { status: 'OFFLINE', lastSeen: now.toISOString() });
    
    uiEmitter.emit('open-pulse-check' as any);
  }
};

'use client';

import { Firestore, collection, doc, query, where, limit, getDocs, increment, arrayUnion, getDoc, setDoc, updateDoc, orderBy } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Attendance, AttendanceLocation, SystemConfig, AttendanceRemark } from '@/lib/types';
import { differenceInSeconds, parse, isAfter, isBefore } from 'date-fns';
import { reportService } from './report-service';
import { uiEmitter } from '@/lib/ui-emitter';
import { auditService } from './audit-service';

/**
 * Service to manage personnel shift lifecycle and automated reporting triggers.
 * Ensures one attendance record per user per day via deterministic IDs and proactive scans.
 */
export const attendanceService = {
  /**
   * Initiates a new work session.
   * Performs a deep scan to prevent duplicate records for the same operational cycle.
   */
  async clockIn(db: Firestore, user: UserProfile, location: AttendanceLocation, today: string, systemConfig: SystemConfig | null) {
    if (!user?.id) throw new Error("Personnel identity verification failed. Command aborted.");

    const deterministicId = `${user.id}_${today}`;
    const docRef = doc(db, 'attendance', deterministicId);
    
    // 1. PROACTIVE DUPLICATE SCAN
    const q = query(
        collection(db, 'attendance'),
        where('orgId', '==', user.orgId),
        where('userId', '==', user.id),
        where('date', '==', today)
    );
    
    const snap = await getDocs(q);
    const now = new Date();
    const nowIso = now.toISOString();

    // Calculate Late Remark
    const remarks: AttendanceRemark[] = [];
    if (systemConfig?.work_hours?.start) {
        const startTime = parse(systemConfig.work_hours.start, 'HH:mm', now);
        if (isAfter(now, startTime)) {
            remarks.push('LATE');
        }
    }

    if (!snap.empty) {
        const sortedDocs = snap.docs.sort((a, b) => {
             const tA = new Date(a.data().clockIn || 0).getTime();
             const tB = new Date(b.data().clockIn || 0).getTime();
             return tB - tA;
        });
        const existingDoc = sortedDocs[0];
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
        
        return activeRef;
    }

    // 2. NEW SESSION INITIALIZATION
    const newRecord: Omit<Attendance, 'id'> = {
      userId: user.id,
      userName: user.fullName,
      orgId: user.orgId,
      date: today,
      clockIn: nowIso,
      clockOut: undefined,
      status: 'PENDING',
      location,
      remarks,
      idleTime: 0,
      totalBreak: 0,
      onBreak: false,
      breaks: [],
    };
    
    await setDoc(docRef, newRecord);
    
    const userRef = doc(db, 'users', user.id);
    // User is awaiting admin verification, do not set to ONLINE yet
    updateDocumentNonBlocking(userRef, { status: 'PENDING', lastSeen: nowIso });
    
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
  async clockOut(db: Firestore, user: UserProfile, record: Attendance, systemConfig: SystemConfig | null) {
    const now = new Date();
    const attendanceRef = doc(db, 'attendance', record.id);
    const userRef = doc(db, 'users', user.id);

    const remarks = [...(record.remarks || [])];
    
    // Analytics: Early Departure (UNDERTIME)
    if (systemConfig?.work_hours?.end) {
        const endTime = parse(systemConfig.work_hours.end, 'HH:mm', now);
        if (isBefore(now, endTime)) {
            remarks.push('UNDERTIME');
        }
    }

    // Analytics: Work Volume (OVERTIME)
    const clockInTime = new Date(record.clockIn);
    const totalDurationSec = differenceInSeconds(now, clockInTime);
    if (totalDurationSec > 32400) { // More than 9 hours total (8h work + 1h break approx)
        remarks.push('OVERTIME');
    }

    const finalUpdate: any = {
      clockOut: now.toISOString(),
      status: 'APPROVED',
      onBreak: false,
      remarks: Array.from(new Set(remarks)),
      duration: totalDurationSec - (record.totalBreak || 0) - (record.idleTime || 0)
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
  },

  /**
   * Forces an active work session to end.
   */
  async forceClockOut(db: Firestore, recordId: string, adminUser: UserProfile) {
    const recordRef = doc(db, 'attendance', recordId);
    const recordSnap = await getDoc(recordRef);
    if (!recordSnap.exists()) throw new Error("Record not found");
    const record = recordSnap.data() as Attendance;
    const now = new Date();
    const nowIso = now.toISOString();

    const clockInTime = new Date(record.clockIn);
    const totalDurationSec = differenceInSeconds(now, clockInTime);
    let duration = Math.max(0, totalDurationSec - (record.totalBreak || 0) - (record.idleTime || 0));

    const remarks = Array.from(new Set([...(record.remarks || []), 'FORCED_CLOCKOUT_BY_ADMIN' as AttendanceRemark]));
    const finalUpdate: any = {
      clockOut: nowIso,
      status: 'APPROVED',
      onBreak: false,
      remarks,
      duration
    };

    if (record.onBreak && record.breaks?.length) {
      const lastBreak = record.breaks[record.breaks.length - 1];
      if (!lastBreak.end) {
        const breakSeconds = differenceInSeconds(now, new Date(lastBreak.start));
        const updatedBreaks = [...record.breaks];
        updatedBreaks[updatedBreaks.length - 1].end = nowIso;
        finalUpdate.breaks = updatedBreaks;
        finalUpdate.totalBreak = increment(breakSeconds);
        finalUpdate.duration = Math.max(0, duration - breakSeconds);
      }
    }

    try {
      await reportService.generateAutomatedEODReport(db, { id: record.userId, fullName: record.userName, orgId: record.orgId } as any, { ...record, ...finalUpdate });
    } catch (e) {
      console.error("Automated EOD Report failure during force clockout:", e);
    }

    await updateDoc(recordRef, finalUpdate);
    
    const userRef = doc(db, 'users', record.userId);
    await updateDoc(userRef, { status: 'OFFLINE', lastSeen: nowIso });

    await auditService.logAction(
      db,
      adminUser,
      'ATTENDANCE_FORCE_CLOCKOUT',
      `Forced clock out for ${record.userName} (Record ID: ${recordId})`,
      { id: recordId, type: 'ATTENDANCE' }
    );
  },

  /**
   * System-wide cron task to sweep and auto-close all open shifts.
   */
  async autoClockOutSystem(db: Firestore) {
    const q = query(
      collection(db, 'attendance'),
      where('clockOut', '==', null)
    );
    const snap = await getDocs(q);
    const now = new Date();

    for (const docSnap of snap.docs) {
      const record = docSnap.data() as Attendance;
      const recordRef = doc(db, 'attendance', docSnap.id);

      const clockInDate = new Date(record.clockIn);
      let clockOutDate = new Date(clockInDate);
      clockOutDate.setHours(17, 0, 0, 0);

      // If clock-in happened after 17:00, use current time
      if (clockOutDate <= clockInDate) {
        clockOutDate = now;
      }

      const clockOutIso = clockOutDate.toISOString();
      const totalDurationSec = differenceInSeconds(clockOutDate, clockInDate);
      let duration = Math.max(0, totalDurationSec - (record.totalBreak || 0) - (record.idleTime || 0));

      const remarks = Array.from(new Set([...(record.remarks || []), 'AUTO_CLOCKED_OUT' as AttendanceRemark]));
      const finalUpdate: any = {
        clockOut: clockOutIso,
        status: 'APPROVED',
        onBreak: false,
        remarks,
        duration
      };

      if (record.onBreak && record.breaks?.length) {
        const lastBreak = record.breaks[record.breaks.length - 1];
        if (!lastBreak.end) {
          const breakSeconds = differenceInSeconds(clockOutDate, new Date(lastBreak.start));
          const updatedBreaks = [...record.breaks];
          updatedBreaks[updatedBreaks.length - 1].end = clockOutIso;
          finalUpdate.breaks = updatedBreaks;
          finalUpdate.totalBreak = increment(breakSeconds);
          finalUpdate.duration = Math.max(0, duration - breakSeconds);
        }
      }

      try {
        await reportService.generateAutomatedEODReport(db, { id: record.userId, fullName: record.userName, orgId: record.orgId } as any, { ...record, ...finalUpdate });
      } catch (e) {
        console.error("Automated EOD Report failure during auto clockout:", e);
      }

      await updateDoc(recordRef, finalUpdate);

      const userRef = doc(db, 'users', record.userId);
      await updateDoc(userRef, { status: 'OFFLINE', lastSeen: clockOutIso });
    }
  }
};

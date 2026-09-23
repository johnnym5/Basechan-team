'use client';

import { Firestore, collection, doc, query, where, getDocs, increment, arrayUnion, getDoc, updateDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking, initializeFirebase } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { UserProfile, Attendance, AttendanceLocation, SystemConfig, AttendanceRemark } from '@/lib/types';
import { differenceInSeconds, parse, isBefore } from 'date-fns';
import { reportService } from './report-service';
import { uiEmitter } from '@/lib/ui-emitter';
import { auditService } from './audit-service';

/**
 * Service to manage personnel shift lifecycle and automated reporting triggers.
 * Server-Authoritative geofencing & shift validation via Cloud Functions.
 */
export const attendanceService = {
  /**
   * Initiates a new work session via Server-Authoritative Geofence & Attendance Cloud Function.
   */
  async clockIn(
    db: Firestore,
    user: UserProfile,
    location: AttendanceLocation,
    today: string,
    systemConfig: SystemConfig | null,
    lateReason?: string,
    locationData?: { lat: number | null, lng: number | null },
    branchName?: string | null
  ) {
    if (!user?.id) throw new Error("Personnel identity verification failed. Command aborted.");

    const { functions } = initializeFirebase();
    const fnInstance = functions || getFunctions();
    const clockInFn = httpsCallable(fnInstance, 'clockInSession');

    const response = await clockInFn({
      lat: locationData?.lat ?? null,
      lng: locationData?.lng ?? null,
      today,
      lateReason: lateReason || null,
      branchName: branchName || null,
    });

    const data = response.data as any;
    const recordId = data?.recordId || `${user.id}_${today}`;
    return doc(db, 'attendance', recordId);
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
   * Terminates the work session via Server-Authoritative Cloud Function.
   */
  async clockOut(
    db: Firestore,
    user: UserProfile,
    record: Attendance,
    systemConfig: SystemConfig | null,
    debriefData?: { manualReport: string; attachedTaskId?: string }
  ) {
    const { functions } = initializeFirebase();
    const fnInstance = functions || getFunctions();
    const clockOutFn = httpsCallable(fnInstance, 'clockOutSession');

    await clockOutFn({
      recordId: record.id,
      debriefReport: debriefData?.manualReport || null,
      attachedTaskId: debriefData?.attachedTaskId || null,
    });

    uiEmitter.emit('open-pulse-check' as any);
  },

  /**
   * Forces an active work session to end (Admin tool).
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
  },

  /**
   * Verifies a pending attendance punch (Approve/Reject).
   */
  async verifyPunch(db: Firestore, recordId: string, status: 'APPROVED' | 'REJECTED', adminUser: UserProfile) {
    const recordRef = doc(db, 'attendance', recordId);
    const recordSnap = await getDoc(recordRef);
    if (!recordSnap.exists()) throw new Error("Record not found");
    const record = recordSnap.data() as Attendance;

    await updateDoc(recordRef, { status });

    const userRef = doc(db, 'users', record.userId);
    if (status === 'APPROVED') {
      if (!record.clockOut) {
        await updateDoc(userRef, { status: 'ONLINE' });
      }
    } else {
      await updateDoc(userRef, { status: 'OFFLINE' });
    }

    await auditService.logAction(
      db,
      adminUser,
      'ATTENDANCE_VERIFY',
      `Verified punch for ${record.userName} as ${status} (Record ID: ${recordId})`,
      { id: recordId, type: 'ATTENDANCE' }
    );
  }
};

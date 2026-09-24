'use client';

import { Firestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking, initializeFirebase } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { UserProfile, Attendance, AttendanceLocation, SystemConfig, AttendanceRemark } from '@/lib/types';
import { differenceInSeconds } from 'date-fns';
import { uiEmitter } from '@/lib/ui-emitter';

/**
 * Server-Authoritative Attendance Service
 * Handles shift clock-in, clock-out, and break management via Cloud Functions.
 */
export const attendanceService = {
  /**
   * Initiates a new work session via Server-Authoritative Geofence Cloud Function.
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

    try {
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
    } catch (err: any) {
      console.error('[ATTENDANCE] Clock-in failed:', err);
      throw new Error(err.message || 'Unable to clock in. Please check your network connection or contact support.');
    }
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
        breaks: [{ start: now }]
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
    try {
      const { functions } = initializeFirebase();
      const fnInstance = functions || getFunctions();
      const clockOutFn = httpsCallable(fnInstance, 'clockOutSession');

      await clockOutFn({
        recordId: record.id,
        debriefReport: debriefData?.manualReport || null,
        attachedTaskId: debriefData?.attachedTaskId || null,
      });

      uiEmitter.emit('open-pulse-check' as any);
    } catch (err: any) {
      console.error('[ATTENDANCE] Clock-out failed:', err);
      throw new Error(err.message || 'Unable to clock out. Please check your network connection or contact support.');
    }
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
        const updatedBreaks = [...record.breaks];
        updatedBreaks[updatedBreaks.length - 1].end = nowIso;
        finalUpdate.breaks = updatedBreaks;
      }
    }

    await updateDoc(recordRef, finalUpdate);

    const userRef = doc(db, 'users', record.userId);
    await updateDoc(userRef, { status: 'OFFLINE', lastSeen: nowIso });
  },

  /**
   * Verifies/approves or rejects a pending attendance punch (Admin tool).
   */
  async verifyPunch(db: Firestore, recordId: string, status: 'APPROVED' | 'REJECTED', adminUser: UserProfile) {
    const recordRef = doc(db, 'attendance', recordId);
    await updateDoc(recordRef, {
      status,
      approvedBy: adminUser.id,
      updatedAt: new Date().toISOString()
    });
  }
};

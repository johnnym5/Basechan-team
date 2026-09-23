'use client';

import { Firestore, collection, doc, query, where, getDocs, increment, arrayUnion, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking, initializeFirebase } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { UserProfile, Attendance, AttendanceLocation, SystemConfig, AttendanceRemark } from '@/lib/types';
import { differenceInSeconds, format } from 'date-fns';
import { uiEmitter } from '@/lib/ui-emitter';

/**
 * Service to manage personnel shift lifecycle and automated reporting triggers.
 * Dual-Mode: Server-Authoritative Cloud Functions with Resilient Client-SDK Fallback.
 */
export const attendanceService = {
  /**
   * Initiates a new work session via Server-Authoritative Geofence & Attendance Cloud Function or Fallback.
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

    const nowIso = new Date().toISOString();
    const deterministicId = `${user.id}_${today}`;

    // 1. Try Server-Authoritative Callable Cloud Function
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
      const recordId = data?.recordId || deterministicId;
      return doc(db, 'attendance', recordId);
    } catch (e: any) {
      console.warn("[ATTENDANCE] Cloud Function clockInSession failed or unreachable. Executing fallback direct SDK write:", e?.message);
    }

    // 2. Resilient Client Fallback: Direct Firestore Write
    const attRef = doc(db, 'attendance', deterministicId);
    await setDoc(attRef, {
      id: deterministicId,
      userId: user.id,
      userName: user.fullName || "Staff Member",
      orgId: user.orgId || "basechan-international",
      date: today,
      clockIn: nowIso,
      clockOut: null,
      status: 'APPROVED',
      location: location || 'OFFICE',
      remarks: lateReason ? ['LATE_REASON_PROVIDED'] : [],
      idleTime: 0,
      totalBreak: 0,
      onBreak: false,
      breaks: [],
      lateReason: lateReason || null,
      branchName: branchName || null,
      createdAt: nowIso
    }, { merge: true });

    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      status: 'ONLINE',
      lastSeen: nowIso
    });

    return attRef;
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
   * Terminates the work session via Server-Authoritative Cloud Function or Resilient Client Fallback.
   */
  async clockOut(
    db: Firestore,
    user: UserProfile,
    record: Attendance,
    systemConfig: SystemConfig | null,
    debriefData?: { manualReport: string; attachedTaskId?: string }
  ) {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Try Server-Authoritative Callable Cloud Function first
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
      return;
    } catch (e: any) {
      console.warn("[ATTENDANCE] Cloud Function clockOutSession failed or unreachable. Executing fallback direct SDK write:", e?.message);
    }

    // 2. Resilient Client Fallback: Execute direct Firestore updates
    const clockInTime = new Date(record.clockIn);
    const totalDurationSec = Math.max(0, Math.floor((now.getTime() - clockInTime.getTime()) / 1000));
    const duration = Math.max(0, totalDurationSec - (record.totalBreak || 0) - (record.idleTime || 0));

    // A. Update Attendance Document
    const attendanceRef = doc(db, 'attendance', record.id);
    await updateDoc(attendanceRef, {
      clockOut: nowIso,
      status: 'APPROVED',
      onBreak: false,
      duration,
      eodReport: debriefData?.manualReport || null,
      linkedTaskIds: debriefData?.attachedTaskId ? [debriefData.attachedTaskId] : [],
      updatedAt: nowIso
    });

    // B. Update User Profile Status
    if (user?.id) {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        status: 'OFFLINE',
        lastSeen: nowIso
      });
    }

    // C. Save Daily Report Document if Debrief Provided
    if (debriefData?.manualReport) {
      const reportDate = record.date || format(now, 'yyyy-MM-dd');
      const reportId = `${user.id}_${reportDate}`;
      const reportRef = doc(db, 'daily_reports', reportId);
      await setDoc(reportRef, {
        id: reportId,
        orgId: user.orgId || "basechan-international",
        userId: user.id,
        userName: user.fullName,
        reportDate,
        accomplishments: debriefData.manualReport,
        attachedTaskId: debriefData.attachedTaskId || null,
        createdAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });
    }

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

'use client';

import { Firestore, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import type { UserProfile, Attendance, AttendanceLocation, SystemConfig, AttendanceRemark } from '@/lib/types';
import { differenceInSeconds, format } from 'date-fns';
import { validateGeofence } from '@/lib/geofence';
import { uiEmitter } from '@/lib/ui-emitter';

/**
 * Pure Client-Side Attendance Service (Zero Cloud Functions)
 * Executes shift clock-in, clock-out, break toggles, and debrief submissions directly via Firebase Web SDK.
 */
export const attendanceService = {
  /**
   * Initiates a new work session directly in Firestore.
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

    const now = new Date();
    const nowIso = now.toISOString();
    const deterministicId = `${user.id}_${today}`;

    let isWithinGeofence = false;
    let distanceMeters = 0;
    let nearestBranchName: string | null = branchName || null;

    if (locationData?.lat != null && locationData?.lng != null) {
      const branches = systemConfig?.branches || [];
      const geofenceRes = validateGeofence(locationData.lat, locationData.lng, branches);
      isWithinGeofence = geofenceRes.isWithinRange;
      distanceMeters = Math.round(geofenceRes.distance);
      nearestBranchName = geofenceRes.nearestBranch || branchName || null;
    }

    const isExempt = ['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(user.role) || (user as any).canBypassGeofence === true;
    const status = isWithinGeofence || isExempt ? 'APPROVED' : 'PENDING';
    const remarks: AttendanceRemark[] = [];

    if (!isWithinGeofence && !isExempt) {
      remarks.push('GEOFENCE_BYPASS_ATTEMPT' as AttendanceRemark);
    }
    if (lateReason) {
      remarks.push('LATE' as AttendanceRemark);
    }

    const attRef = doc(db, 'attendance', deterministicId);
    await setDoc(attRef, {
      id: deterministicId,
      userId: user.id,
      userName: user.fullName || "Staff Member",
      orgId: user.orgId || "basechan-international",
      date: today,
      clockIn: nowIso,
      clockOut: null,
      status,
      location: location || (isWithinGeofence ? 'OFFICE' : 'REMOTE'),
      remarks,
      idleTime: 0,
      totalBreak: 0,
      onBreak: false,
      breaks: [],
      lateReason: lateReason || null,
      branchName: nearestBranchName,
      branchLocation: nearestBranchName,
      clockInLocation: locationData?.lat != null && locationData?.lng != null ? { lat: locationData.lat, lng: locationData.lng } : null,
      serverCalculatedDistanceMeters: distanceMeters,
      createdAt: nowIso,
      updatedAt: nowIso
    }, { merge: true });

    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      status: status === 'APPROVED' ? 'ONLINE' : 'PENDING',
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
      await updateDoc(attendanceRef, {
        onBreak: true,
        breaks: [...(record.breaks || []), { start: now }]
      });
    } else {
      const lastBreak = record.breaks?.[record.breaks.length - 1];
      if (lastBreak) {
        const breakSeconds = differenceInSeconds(new Date(now), new Date(lastBreak.start));
        const updatedBreaks = [...(record.breaks || [])];
        updatedBreaks[updatedBreaks.length - 1].end = now;

        await updateDoc(attendanceRef, {
          onBreak: false,
          breaks: updatedBreaks,
          totalBreak: (record.totalBreak || 0) + breakSeconds
        });
      }
    }
  },

  /**
   * Terminates the work session directly in Firestore.
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

    const clockInTime = new Date(record.clockIn);
    const totalDurationSec = Math.max(0, Math.floor((now.getTime() - clockInTime.getTime()) / 1000));
    const duration = Math.max(0, totalDurationSec - (record.totalBreak || 0) - (record.idleTime || 0));

    // A. Update Attendance Document directly
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

    // B. Update User Profile Status directly
    if (user?.id) {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        status: 'OFFLINE',
        lastSeen: nowIso
      });
    }

    // C. Create Daily Report Document directly if debrief provided
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

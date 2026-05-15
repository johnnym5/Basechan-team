
'use client';

import { Firestore, collection, doc, query, where, limit, getDocs, increment, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Attendance, AttendanceLocation, SystemConfig } from '@/lib/types';
import { differenceInSeconds } from 'date-fns';
import { auditService } from './audit-service';
import { reportService } from './report-service';

export const attendanceService = {
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
    if (docRef) {
        auditService.logAction(db, user, 'ATTENDANCE_CLOCK_IN', `Started shift from ${location}`, { id: docRef.id, type: 'ATTENDANCE' });
    }
    return docRef;
  },

  async toggleBreak(db: Firestore, record: Attendance) {
    const now = new Date().toISOString();
    const attendanceRef = doc(db, 'attendance', record.id);

    if (!record.onBreak) {
      // Start Break
      updateDocumentNonBlocking(attendanceRef, {
        onBreak: true,
        breaks: arrayUnion({ start: now })
      });
    } else {
      // End Break
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

  async clockOut(db: Firestore, user: UserProfile, record: Attendance) {
    const now = new Date();
    const attendanceRef = doc(db, 'attendance', record.id);
    const userRef = doc(db, 'users', user.id);

    const updateData: any = {
      clockOut: now.toISOString(),
      status: 'APPROVED',
      onBreak: false,
    };

    // If clocking out while on break, close the last break segment
    if (record.onBreak && record.breaks?.length) {
        const lastBreak = record.breaks[record.breaks.length - 1];
        if (!lastBreak.end) {
            const breakSeconds = differenceInSeconds(now, new Date(lastBreak.start));
            const updatedBreaks = [...record.breaks];
            updatedBreaks[updatedBreaks.length - 1].end = now.toISOString();
            updateData.breaks = updatedBreaks;
            updateData.totalBreak = increment(breakSeconds);
        }
    }

    // EPIC 4: Trigger Automated EOD Report before wiping status
    try {
        await reportService.generateAutomatedEODReport(db, user, { ...record, ...updateData });
    } catch (e) {
        console.error("EOD Report generation failed:", e);
    }

    updateDocumentNonBlocking(attendanceRef, updateData);
    updateDocumentNonBlocking(userRef, { status: 'OFFLINE', lastSeen: now.toISOString() });
    
    auditService.logAction(db, user, 'ATTENDANCE_CLOCK_OUT', `Ended shift session. Automated EOD report submitted.`, { id: record.id, type: 'ATTENDANCE' });
  }
};

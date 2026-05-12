'use client';

import { Firestore, collection, doc, query, where, limit, getDocs, increment, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { UserProfile, Attendance, AttendanceLocation, SystemConfig } from '@/lib/types';
import { differenceInSeconds } from 'date-fns';

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
    return await addDocumentNonBlocking(collection(db, 'attendance'), newRecord);
  },

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

  async clockOut(db: Firestore, user: UserProfile, record: Attendance) {
    const now = new Date();
    const attendanceRef = doc(db, 'attendance', record.id);
    const userRef = doc(db, 'users', user.id);

    const updateData: any = {
      clockOut: now.toISOString(),
      status: 'APPROVED',
    };

    updateDocumentNonBlocking(attendanceRef, updateData);
    updateDocumentNonBlocking(userRef, { status: 'OFFLINE', lastSeen: now.toISOString() });
  }
};

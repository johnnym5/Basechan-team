'use client';

import { useMemo } from 'react';
import type { UserProfile, Attendance, DailyReport, Nomination, Task, LeaveRequest } from '@/lib/types';

/**
 * Ghost Protocol: Cascading Data Scrub Hook.
 * Ensures that any user marked as 'DISABLED', 'TERMINATED', or 'isArchived: true'
 * is completely hidden along with all their historical operational telemetry.
 */
export function useScrubbedData({
  staffList = [],
  attendanceLogs = [],
  reportsData = [],
  nominations = [],
  tasks = [],
  leaveRequests = []
}: {
  staffList?: UserProfile[];
  attendanceLogs?: Attendance[];
  reportsData?: DailyReport[];
  nominations?: Nomination[];
  tasks?: Task[];
  leaveRequests?: LeaveRequest[];
}) {
  return useMemo(() => {
    // 1. Define the Active Roster whitelist
    // We exclude DISABLED, TERMINATED, and explicit archived flags
    const activeStaff = staffList.filter(user =>
        user.status !== 'DISABLED' &&
        user.status !== 'TERMINATED' &&
        !(user as any).isArchived
    );

    const activeStaffIds = new Set(activeStaff.map(user => user.id));

    // 2. Cascade the scrub across all data streams
    // If a record belongs to an ID not in the active whitelist, it is purged from the result
    return {
      activeStaff,
      activeAttendance: attendanceLogs.filter(log => activeStaffIds.has(log.userId)),
      activeReports: reportsData.filter(report => activeStaffIds.has(report.userId)),
      activeNominations: nominations.filter(nom =>
        activeStaffIds.has(nom.nomineeId) && activeStaffIds.has(nom.nominatorId)
      ),
      activeTasks: tasks.filter(task =>
        activeStaffIds.has(task.assignedTo) || activeStaffIds.has(task.createdBy)
      ),
      activeLeaveRequests: leaveRequests.filter(req => activeStaffIds.has(req.userId))
    };
  }, [staffList, attendanceLogs, reportsData, nominations, tasks, leaveRequests]);
}

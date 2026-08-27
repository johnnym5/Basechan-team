import { isWeekend, isWithinInterval, isSameDay, parseISO, startOfDay, format } from 'date-fns';
import type { Attendance, LeaveRequest, OperationalStatus } from './types';
import { isHoliday } from './holidays';

/**
 * Context-Aware Status Engine
 * Calculates the operational status for a specific unit on a specific date.
 */
export function calculateDailyStatus(
  targetDate: Date,
  userLogs: Attendance[],
  userApprovedLeaves: LeaveRequest[],
): OperationalStatus {
  const normalizedTarget = startOfDay(targetDate);
  const today = startOfDay(new Date());
  const dateStr = format(normalizedTarget, 'yyyy-MM-dd');

  // 1. Check for actual Clock-In Log
  const existingLog = userLogs.find(log => log.date === dateStr);
  if (existingLog && existingLog.status === 'APPROVED') {
    return existingLog.remarks?.includes('LATE') ? 'LATE' : 'ON_TIME';
  }

  // 2. Check if it's a Weekend
  if (isWeekend(normalizedTarget)) {
    return 'WEEKEND';
  }

  // 3. Check if it's a Global Holiday
  if (isHoliday(normalizedTarget)) {
    return 'HOLIDAY';
  }

  // 4. Check if User is on Approved Leave
  const isOnLeave = userApprovedLeaves.some(leave => {
    if (leave.status !== 'APPROVED') return false;
    try {
        const start = startOfDay(parseISO(leave.startDate));
        const end = startOfDay(parseISO(leave.endDate));
        return normalizedTarget >= start && normalizedTarget <= end;
    } catch (e) {
        return false;
    }
  });

  if (isOnLeave) {
    return 'ON_LEAVE';
  }

  // 5. If it's a past workday with no log, holiday, or leave -> ABSENT
  if (normalizedTarget < today) {
    return 'ABSENT';
  }

  return 'PENDING';
}

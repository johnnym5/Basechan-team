import type { UserProfile, Attendance, DailyReport, Task, LeaveRequest } from '@/lib/types';
import type { PublicHoliday } from '@/lib/holidays';

export interface DayInspectionData {
  dateStr: string;
  holiday?: PublicHoliday;
  shiftLogs: Attendance[];
  dailyReports: DailyReport[];
  tasksDone: Task[];
  approvedLeaves: LeaveRequest[];
}

export type CalendarViewMode = 'MONTH' | 'WEEK' | 'DAY';

export interface CalendarStatusCell {
  dateStr: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  holiday?: PublicHoliday;
  shiftLog?: Attendance;
  approvedLeave?: LeaveRequest;
  statusType: 'HOLIDAY' | 'ON_TIME' | 'LATE' | 'REMOTE' | 'MISSED' | 'LEAVE' | 'CLEAR';
}

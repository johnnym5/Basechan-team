import { useMemo } from 'react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns'

export type RecapMode = 'WEEKLY' | 'MONTHLY'

export function useRecapSummary(
  userId: string,
  mode: RecapMode,
  targetDate: Date,
  attendanceLogs: any[],
  tasks: any[],
  reports: any[],
  leaveRequests: any[]
) {
  return useMemo(() => {
    // 1. Determine Date Boundaries based on mode
    const dateInterval = mode === 'WEEKLY'
      ? { start: startOfWeek(targetDate, { weekStartsOn: 1 }), end: endOfWeek(targetDate, { weekStartsOn: 1 }) }
      : { start: startOfMonth(targetDate), end: endOfMonth(targetDate) }

    const isDateInInterval = (dateStr: string) => {
      try {
        const date = parseISO(dateStr)
        return isWithinInterval(date, dateInterval)
      } catch {
        return false
      }
    }

    // 2. Filter Attendance Logs
    const periodLogs = attendanceLogs.filter(log => log.userId === userId && isDateInInterval(log.date))

    // In this system:
    // status APPROVED/PENDING
    // remarks can contain LATE, UNDERTIME, etc.
    const daysPresent = periodLogs.filter(l => l.clockIn).length
    const lateCount = periodLogs.filter(l => l.remarks?.includes('LATE')).length
    const absentCount = periodLogs.filter(l => (l as any).status === 'ABSENT').length

    // 3. Average Clock-In / Clock-Out
    const calcAvgTime = (key: 'clockIn' | 'clockOut') => {
      const validTimes = periodLogs
        .map(l => l[key])
        .filter(Boolean)
        .map(isoStr => {
          const date = parseISO(isoStr!)
          return date.getHours() * 60 + date.getMinutes()
        })

      if (!validTimes.length) return "N/A"
      const avgMins = Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
      const hrs = Math.floor(avgMins / 60)
      const mins = avgMins % 60
      const date = new Date()
      date.setHours(hrs)
      date.setMinutes(mins)
      return format(date, 'hh:mm a')
    }

    // 4. Completed Tasks
    // Using status ARCHIVED as the "Completed" status
    const completedTasksCount = tasks.filter(t =>
      t.assignedTo === userId && t.status === 'ARCHIVED' && t.createdAt && isDateInInterval(t.createdAt)
    ).length

    // 5. Leave Summary
    const periodLeaves = leaveRequests.filter(l =>
      l.userId === userId && l.status === 'APPROVED' && (isDateInInterval(l.startDate) || isDateInInterval(l.endDate))
    )
    const leaveDaysCount = periodLeaves.reduce((acc, curr) => acc + (curr.totalDays || 1), 0)

    // 6. EOD Reports List
    // We combine reports from the separate collection and embedded attendance reports
    const embeddedReports = periodLogs
      .filter(l => !!l.eodReport)
      .map(l => ({
          id: l.id,
          date: l.date,
          content: l.eodReport,
          workload: l.remarks?.join(', ')
      }));

    const collectionReports = reports
      .filter(r => r.userId === userId && isDateInInterval(r.reportDate || r.date))
      .map(r => ({
          id: r.id,
          date: r.reportDate || r.date,
          content: r.content || r.accomplishments,
          workload: r.pulse || ''
      }));

    // Simple deduplication by date if needed, or just combine
    const combinedReports = [...collectionReports, ...embeddedReports]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      dateInterval,
      daysPresent,
      lateCount,
      absentCount,
      avgClockIn: calcAvgTime('clockIn'),
      avgClockOut: calcAvgTime('clockOut'),
      completedTasksCount,
      leaveSummary: leaveDaysCount === 0 ? "No leave taken during this period" : `${leaveDaysCount} day(s) approved leave`,
      reports: combinedReports
    }
  }, [userId, mode, targetDate, attendanceLogs, tasks, reports, leaveRequests])
}

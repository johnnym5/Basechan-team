import {
    format,
    isToday,
    isYesterday,
    isSameMonth,
    isSameWeek,
    parseISO,
    startOfToday,
    subDays,
    eachDayOfInterval,
    isWeekend,
    getDay,
    differenceInDays,
    isAfter,
    startOfWeek,
    endOfWeek
} from "date-fns";
import type { UserProfile, Attendance, Task, LeaveRequest, DailyReport, PulseCheck } from "./types";

export type InsightType = 'POSITIVE' | 'WARNING' | 'CRITICAL' | 'NEUTRAL';

export interface Insight {
    id: string;
    type: InsightType;
    message: string;
    targetUserIds?: string[];
    category: 'PERSONAL' | 'TEAM';
}

/**
 * Tactical Insight Engine
 * Generates natural language intelligence from raw operational telemetry.
 */
export class InsightEngine {

    /**
     * Generates insights for a specific staff member (Individual Deep-Dive)
     */
    static generatePersonalInsights(
        targetUser: UserProfile,
        logs: Attendance[],
        tasks: Task[],
        leaves: LeaveRequest[],
        pulses: PulseCheck[]
    ): Insight[] {
        const insights: Insight[] = [];
        const now = new Date();

        const myLogs = logs.filter(l => l.userId === targetUser.id).sort((a, b) => b.date.localeCompare(a.date));
        const myTasks = tasks.filter(t => t.assignedTo === targetUser.id);
        const myLeaves = leaves.filter(l => l.userId === targetUser.id);
        const myPulses = pulses.filter(p => p.userId === targetUser.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // 1. Arrival Punctuality & Absences
        const weekLogs = myLogs.filter(l => isSameWeek(parseISO(l.date), now, { weekStartsOn: 1 }));
        const monthLogs = myLogs.filter(l => isSameMonth(parseISO(l.date), now));

        const latesThisWeek = weekLogs.filter(l => l.remarks?.includes('LATE')).length;
        if (latesThisWeek > 0) {
            insights.push({
                id: `late_week_${targetUser.id}`,
                type: latesThisWeek >= 3 ? 'CRITICAL' : 'WARNING',
                message: `${targetUser.fullName} has been late ${latesThisWeek} time${latesThisWeek > 1 ? 's' : '' } this week.`,
                category: 'PERSONAL'
            });
        }

        const yesterday = subDays(now, 1);
        if (!isWeekend(yesterday)) {
            const yesterdayLog = myLogs.find(l => l.date === format(yesterday, 'yyyy-MM-dd'));
            if (!yesterdayLog) {
                insights.push({
                    id: `absent_yesterday_${targetUser.id}`,
                    type: 'WARNING',
                    message: `Was absent yesterday (${format(yesterday, 'MMM dd')}).`,
                    category: 'PERSONAL'
                });
            }
        }

        const absencesThisMonth = 22 - monthLogs.length;
        if (absencesThisMonth > 2) {
            insights.push({
                id: `absent_month_${targetUser.id}`,
                type: 'WARNING',
                message: `Has been absent ${absencesThisMonth} times this month.`,
                category: 'PERSONAL'
            });
        }

        if (weekLogs.length >= 4 && latesThisWeek === 0) {
            insights.push({
                id: `perfect_week_${targetUser.id}`,
                type: 'POSITIVE',
                message: `Operational Excellence: Has not missed work all week.`,
                category: 'PERSONAL'
            });
        }

        // 2. Pattern Recognition: Day-of-week lateness
        const lates = myLogs.filter(l => l.remarks?.includes('LATE'));
        const dayCounts: Record<number, number> = {};
        lates.forEach(l => {
            const day = getDay(parseISO(l.date));
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        const patterns = Object.entries(dayCounts).filter(([_, count]) => count >= 3);
        patterns.forEach(([day, count]) => {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = dayNames[Number(day)];
            insights.push({
                id: `pattern_late_${day}_${targetUser.id}`,
                type: 'WARNING',
                message: `Pattern detected: Frequently arrives late on ${dayName}s.`,
                category: 'PERSONAL'
            });
        });

        // 3. Workload & Streaks (Using PulseCheck data)
        let heavyStreak = 0;
        for (const p of myPulses) {
            if (p.mood === 'HEAVY' || p.mood === 'OVERWHELMED') heavyStreak++;
            else break;
        }
        if (heavyStreak >= 3) {
            insights.push({
                id: `heavy_streak_${targetUser.id}`,
                type: 'CRITICAL',
                message: `Burnout Alert: Has reported heavy workload ${heavyStreak} days in a row.`,
                category: 'PERSONAL'
            });
        }

        let onTimeStreak = 0;
        for (const log of myLogs) {
            if (log.clockIn && !log.remarks?.includes('LATE')) onTimeStreak++;
            else break;
        }
        if (onTimeStreak >= 5) {
            insights.push({
                id: `ontime_streak_${targetUser.id}`,
                type: 'POSITIVE',
                message: `Consistency High: On an active ${onTimeStreak}-day on-time streak.`,
                category: 'PERSONAL'
            });
        }

        // 4. Pending Actions
        const pendingTasks = myTasks.filter(t => t.status === 'AWAITING_REVIEW').length;
        if (pendingTasks > 0) {
            insights.push({
                id: `pending_tasks_${targetUser.id}`,
                type: 'NEUTRAL',
                message: `Has ${pendingTasks} pending task${pendingTasks > 1 ? 's' : ''} awaiting review.`,
                category: 'PERSONAL'
            });
        }

        const pendingLeave = myLeaves.find(l => l.status === 'PENDING');
        if (pendingLeave) {
            insights.push({
                id: `pending_leave_${targetUser.id}`,
                type: 'WARNING',
                message: `Requested a ${pendingLeave.totalDays}-day leave and is awaiting approval.`,
                category: 'PERSONAL'
            });
        }

        return insights;
    }

    /**
     * Generates insights for the entire Organization (Team Dashboard)
     */
    static generateTeamInsights(
        staff: UserProfile[],
        logs: Attendance[],
        tasks: Task[],
        leaves: LeaveRequest[],
        pulses: PulseCheck[]
    ): Insight[] {
        const insights: Insight[] = [];
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        const todaysLogs = logs.filter(l => l.date === todayStr);
        const expectedStaff = staff.filter(s => !['SUPERADMIN', 'ORG_ADMIN'].includes(s.role));
        const todaysPulses = pulses.filter(p => p.date === todayStr);

        // 1. Daily Performance
        const onTimeToday = todaysLogs.filter(l => l.clockIn && !l.remarks?.includes('LATE')).length;
        if (onTimeToday > 0) {
            insights.push({
                id: 'team_early_today',
                type: 'POSITIVE',
                message: `${onTimeToday} staff members arrived early or on-time today.`,
                category: 'TEAM'
            });
        }

        const lateToday = todaysLogs.filter(l => l.remarks?.includes('LATE')).length;
        if (lateToday > 0) {
            insights.push({
                id: 'team_late_today',
                type: 'WARNING',
                message: `${lateToday} staff member(s) arrived late today.`,
                category: 'TEAM'
            });
        } else if (todaysLogs.length > 0) {
            insights.push({
                id: 'team_no_late_today',
                type: 'POSITIVE',
                message: `Perfect Start: No staff members came late today.`,
                category: 'TEAM'
            });
        }

        // 2. Aggregate Workload
        const heavyCount = todaysPulses.filter(p => p.mood === 'HEAVY' || p.mood === 'OVERWHELMED').length;
        if (heavyCount >= 3) {
            insights.push({
                id: 'team_workload_rise',
                type: 'CRITICAL',
                message: `Rise in stress: ${heavyCount} staff members reported heavy workloads today.`,
                category: 'TEAM'
            });
        }

        const smoothCount = todaysPulses.filter(p => p.mood === 'SMOOTH').length;
        if (smoothCount > 0) {
            insights.push({
                id: 'team_smooth_today',
                type: 'POSITIVE',
                message: `${smoothCount} staff members are reporting a smooth operational flow.`,
                category: 'TEAM'
            });
        }

        // 3. Administrative Gaps
        const totalPendingTasks = tasks.filter(t => t.status === 'AWAITING_REVIEW').length;
        if (totalPendingTasks > 0) {
            insights.push({
                id: 'team_pending_reviews',
                type: 'NEUTRAL',
                message: `${totalPendingTasks} total tasks across the team are awaiting administrative review.`,
                category: 'TEAM'
            });
        }

        const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
        if (pendingLeaves > 0) {
            insights.push({
                id: 'team_pending_leaves',
                type: 'WARNING',
                message: `You have ${pendingLeaves} pending leave request(s) requiring authorization.`,
                category: 'TEAM'
            });
        }

        // 4. Repeated Issues (Pattern recognition at team level)
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weeklyLogs = logs.filter(l => isAfter(parseISO(l.date), weekStart));
        const chronicLates = expectedStaff.filter(s => {
            const sLogs = weeklyLogs.filter(l => l.userId === s.id && l.remarks?.includes('LATE'));
            return sLogs.length >= 3;
        });

        if (chronicLates.length > 0) {
            insights.push({
                id: 'team_chronic_lates',
                type: 'CRITICAL',
                message: `Pattern Alert: ${chronicLates.length} personnel have been repeatedly late this week.`,
                category: 'TEAM'
            });
        }

        return insights;
    }
}

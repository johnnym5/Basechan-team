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
    endOfWeek,
    startOfMonth,
    endOfMonth
} from "date-fns";
import type { UserProfile, Attendance, Task, LeaveRequest, DailyReport, PulseCheck, Nomination } from "./types";
import { calculateDailyStatus } from "./attendance-utils";
import { isHoliday } from "./holidays";

export type InsightType = 'POSITIVE' | 'WARNING' | 'CRITICAL' | 'NEUTRAL';

export interface Insight {
    id: string;
    type: InsightType;
    message: string;
    targetUserIds?: string[];
    category: 'PERSONAL' | 'TEAM';
    metadata?: {
        dates?: string[];
        type?: 'ABSENCE' | 'LATENESS' | 'PULSE' | 'TASK';
    };
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
        pulses: PulseCheck[],
        nominations: Nomination[]
    ): Insight[] {
        const insights: Insight[] = [];
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const yesterdayDate = subDays(now, 1);
        const yesterdayStr = format(yesterdayDate, 'yyyy-MM-dd');

        const myLogs = logs.filter(l => l.userId === targetUser.id).sort((a, b) => b.date.localeCompare(a.date));
        const myTasks = tasks.filter(t => t.assignedTo === targetUser.id);
        const myLeaves = leaves.filter(l => l.userId === targetUser.id);
        const myPulses = pulses.filter(p => p.userId === targetUser.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const myNominations = nominations.filter(n => n.nomineeId === targetUser.id && n.status === 'APPROVED');

        const weekLogs = myLogs.filter(l => isSameWeek(parseISO(l.date), now, { weekStartsOn: 1 }));
        const monthLogs = myLogs.filter(l => isSameMonth(parseISO(l.date), now));

        // 1. Punctuality & Absences
        const lateLogsThisWeek = weekLogs.filter(l => l.remarks?.includes('LATE')).sort((a, b) => a.date.localeCompare(b.date));
        const latesThisWeek = lateLogsThisWeek.length;

        // --- STREAK DETECTION (Lates) ---
        // Sort all my logs to check for streaks across time
        const sortedLogs = [...myLogs].sort((a, b) => a.date.localeCompare(b.date));

        // Only report current week streaks or significant recent streaks
        let currentWeekConsecutive = 0;
        for (let i = sortedLogs.length - 1; i >= 0; i--) {
            if (isSameWeek(parseISO(sortedLogs[i].date), now, { weekStartsOn: 1 })) {
                if (sortedLogs[i].remarks?.includes('LATE')) {
                    currentWeekConsecutive++;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        if (currentWeekConsecutive >= 5) {
            insights.push({
                id: `streak_late_critical_${targetUser.id}`,
                type: 'CRITICAL',
                message: `New pattern recognized: This staff has been coming late consistently this week.`,
                category: 'PERSONAL'
            });
        } else if (currentWeekConsecutive >= 2) {
            insights.push({
                id: `streak_late_warning_${targetUser.id}`,
                type: 'WARNING',
                message: `Behavioral Pattern: Has arrived late ${currentWeekConsecutive} days in a row.`,
                category: 'PERSONAL'
            });
        } else if (latesThisWeek > 0) {
            insights.push({
                id: `late_week_${targetUser.id}`,
                type: latesThisWeek >= 3 ? 'CRITICAL' : 'WARNING',
                message: `${targetUser.fullName} has been late ${latesThisWeek} time${latesThisWeek > 1 ? 's' : '' } this week.`,
                category: 'PERSONAL',
                metadata: {
                    dates: lateLogsThisWeek.map(l => l.date),
                    type: 'LATENESS'
                }
            });
        }

        const yesterdayLog = myLogs.find(l => l.date === yesterdayStr);
        const yesterdayStatus = calculateDailyStatus(yesterdayDate, myLogs, myLeaves);

        if (yesterdayStatus === 'ABSENT') {
             insights.push({
                id: `absent_yesterday_${targetUser.id}`,
                type: 'WARNING',
                message: `Was absent yesterday (${format(yesterdayDate, 'MMM dd')}).`,
                category: 'PERSONAL',
                metadata: {
                    dates: [yesterdayStr],
                    type: 'ABSENCE'
                }
            });
        } else if (yesterdayStatus === 'LATE') {
             insights.push({
                id: `late_yesterday_${targetUser.id}`,
                type: 'WARNING',
                message: `Was late yesterday (${format(yesterdayDate, 'MMM dd')}).`,
                category: 'PERSONAL',
                metadata: {
                    dates: [yesterdayStr],
                    type: 'LATENESS'
                }
            });
        } else if (yesterdayStatus === 'ON_LEAVE') {
            insights.push({
                id: `on_leave_yesterday_${targetUser.id}`,
                type: 'NEUTRAL',
                message: `Was on approved leave yesterday.`,
                category: 'PERSONAL'
            });
        }

        const todayLog = myLogs.find(l => l.date === todayStr);
        if (todayLog?.remarks?.includes('LATE')) {
             insights.push({
                id: `late_today_${targetUser.id}`,
                type: 'CRITICAL',
                message: `Is late today.`,
                category: 'PERSONAL',
                metadata: {
                    dates: [todayStr],
                    type: 'LATENESS'
                }
            });
        }

        // --- DYNAMIC ABSENCE CALCULATION (Context-Aware) ---
        const monthStart = startOfMonth(now);
        const monthEnd = isAfter(endOfMonth(now), now) ? now : endOfMonth(now);

        const daysThisMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const absenceDatesThisMonth = daysThisMonth
            .filter(d => calculateDailyStatus(d, myLogs, myLeaves) === 'ABSENT')
            .map(d => format(d, 'yyyy-MM-dd'));

        const absencesThisMonth = absenceDatesThisMonth.length;
        if (absencesThisMonth > 0) {
            insights.push({
                id: `absent_month_${targetUser.id}`,
                type: absencesThisMonth > 3 ? 'CRITICAL' : 'WARNING',
                message: `Has been absent ${absencesThisMonth} time${absencesThisMonth > 1 ? 's' : ''} this month.`,
                category: 'PERSONAL',
                metadata: {
                    dates: absenceDatesThisMonth,
                    type: 'ABSENCE'
                }
            });
        }

        if (weekLogs.length >= 4 && latesThisWeek === 0) {
            insights.push({
                id: `perfect_week_${targetUser.id}`,
                type: 'POSITIVE',
                message: `Operational Excellence: Has not missed work all week.`,
                category: 'PERSONAL'
            });
        } else if (!isWeekend(now) && !isHoliday(now)) {
            const weekStart = startOfWeek(now, { weekStartsOn: 1 });
            const daysIntoWeek = eachDayOfInterval({ start: weekStart, end: now });

            const absenceDatesThisWeek = daysIntoWeek
                .filter(d => calculateDailyStatus(d, myLogs, myLeaves) === 'ABSENT')
                .map(d => format(d, 'yyyy-MM-dd'));

            if (absenceDatesThisWeek.length > 0) {
                insights.push({
                    id: `absent_week_${targetUser.id}`,
                    type: 'WARNING',
                    message: `Has been absent ${absenceDatesThisWeek.length} time${absenceDatesThisWeek.length > 1 ? 's' : ''} this week.`,
                    category: 'PERSONAL',
                    metadata: {
                        dates: absenceDatesThisWeek,
                        type: 'ABSENCE'
                    }
                });
            }
        }

        // 2. Pattern Recognition
        const dayCounts: Record<number, number> = {};
        myLogs.filter(l => l.remarks?.includes('LATE')).forEach(l => {
            const day = getDay(parseISO(l.date));
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        Object.entries(dayCounts).forEach(([day, count]) => {
            if (count >= 3) {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                insights.push({
                    id: `pattern_late_${day}_${targetUser.id}`,
                    type: 'WARNING',
                    message: `Behavioral Pattern: Frequently arrives late on ${dayNames[Number(day)]}s.`,
                    category: 'PERSONAL'
                });
            }
        });

        // 3. Workload & Mood
        const heavyDaysThisMonth = myPulses.filter(p => isSameMonth(parseISO(p.timestamp), now) && (p.mood === 'HEAVY' || p.mood === 'OVERWHELMED')).length;
        if (heavyDaysThisMonth > 0) {
            insights.push({
                id: `heavy_month_${targetUser.id}`,
                type: 'WARNING',
                message: `Has reported heavy workload ${heavyDaysThisMonth} day${heavyDaysThisMonth > 1 ? 's' : ''} this month.`,
                category: 'PERSONAL'
            });
        }

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

        const isSmoothWeek = weekLogs.length >= 3 && weekLogs.every(l => !l.remarks?.includes('LATE')) && myPulses.filter(p => isSameWeek(parseISO(p.timestamp), now)).every(p => p.mood === 'SMOOTH');
        if (isSmoothWeek) {
            insights.push({
                id: `smooth_week_${targetUser.id}`,
                type: 'POSITIVE',
                message: `Unit is having a smooth week.`,
                category: 'PERSONAL'
            });
        }

        // 4. Streaks
        let onTimeStreak = 0;
        for (const log of myLogs) {
            if (log.clockIn && !log.remarks?.includes('LATE')) onTimeStreak++;
            else break;
        }
        if (onTimeStreak >= 3) {
            insights.push({
                id: `ontime_streak_${targetUser.id}`,
                type: 'POSITIVE',
                message: `High Consistency: On an active ${onTimeStreak}-day on-time streak.`,
                category: 'PERSONAL'
            });
        }

        // 5. Pending Actions
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

        // 6. Recognition & Accolades
        const weekNominations = myNominations.filter(n => isSameWeek(parseISO(n.timestamp), now, { weekStartsOn: 1 }));
        const monthNominations = myNominations.filter(n => isSameMonth(parseISO(n.timestamp), now));

        if (weekNominations.length > 0) {
            const topCategory = weekNominations.reduce((acc, n) => {
                acc[n.categoryTitle] = (acc[n.categoryTitle] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            const bestCat = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0];

            insights.push({
                id: `recognition_week_${targetUser.id}`,
                type: 'POSITIVE',
                message: `Excellence Recognized: Earned ${weekNominations.length} star${weekNominations.length > 1 ? 's' : ''} this week, primarily for "${bestCat[0]}".`,
                category: 'PERSONAL'
            });
        }

        if (monthNominations.length >= 3) {
            insights.push({
                id: `recognition_month_${targetUser.id}`,
                type: 'POSITIVE',
                message: `High Impact: Has secured ${monthNominations.length} total stars this month from peer units.`,
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
        pulses: PulseCheck[],
        nominations: Nomination[]
    ): Insight[] {
        const insights: Insight[] = [];
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        const todaysLogs = logs.filter(l => l.date === todayStr);
        const expectedStaff = staff.filter(s => s.role !== 'SUPERADMIN');
        const todaysPulses = pulses.filter(p => p.date === todayStr);

        // 1. Daily Team Posture
        const earlyToday = todaysLogs.filter(l => l.clockIn && !l.remarks?.includes('LATE')).length;
        if (earlyToday > 0) {
            insights.push({
                id: 'team_early_today',
                type: 'POSITIVE',
                message: `${earlyToday} staff members came early today.`,
                category: 'TEAM'
            });
        }

        const lateToday = todaysLogs.filter(l => l.remarks?.includes('LATE')).length;
        if (lateToday > 0) {
            insights.push({
                id: 'team_late_today',
                type: 'WARNING',
                message: `${lateToday} staff member(s) came late today.`,
                category: 'TEAM'
            });
        } else if (todaysLogs.length > 0) {
            insights.push({
                id: 'team_no_late_today',
                type: 'POSITIVE',
                message: `Tactical Excellence: No staff members came late today.`,
                category: 'TEAM'
            });
        }

        // 2. Team Workload
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
                message: `${smoothCount} staff members are having smooth workloads.`,
                category: 'TEAM'
            });
        }

        // 3. Operational Bottlenecks
        const reviewStaffCount = new Set(tasks.filter(t => t.status === 'AWAITING_REVIEW').map(t => t.assignedTo)).size;
        if (reviewStaffCount > 0) {
            insights.push({
                id: 'team_pending_reviews',
                type: 'NEUTRAL',
                message: `${reviewStaffCount} staff members have tasks awaiting administrative review.`,
                category: 'TEAM'
            });
        }

        const adminPendingLeaves = leaves.filter(l => l.status === 'PENDING');
        if (adminPendingLeaves.length > 0) {
            const earliestLeave = adminPendingLeaves.sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
            insights.push({
                id: 'team_pending_leaves',
                type: 'WARNING',
                message: `You have a pending leave request from ${format(parseISO(earliestLeave.startDate), 'dd MMM')}.`,
                category: 'TEAM'
            });
        }

        // 4. Repeated Friction Patterns
        const weeklyLogs = logs.filter(l => isSameWeek(parseISO(l.date), now, { weekStartsOn: 1 }));
        const chronicLates = expectedStaff.filter(s => {
            const sLogs = weeklyLogs.filter(l => l.userId === s.id && l.remarks?.includes('LATE'));
            return sLogs.length >= 3;
        });

        if (chronicLates.length > 0) {
            insights.push({
                id: 'team_chronic_lates',
                type: 'CRITICAL',
                message: `Pattern Alert: ${chronicLates.length} personnel have been coming late repeatedly this week.`,
                category: 'TEAM'
            });
        }

        // 5. Global Capacity
        const activeTasks = tasks.filter(t => t.status === 'ACTIVE' || t.status === 'QUEUED');
        const avgTaskLoad = expectedStaff.length > 0 ? (activeTasks.length / expectedStaff.length).toFixed(1) : '0';
        insights.push({
            id: 'team_capacity',
            type: 'NEUTRAL',
            message: `Operational Capacity: Average team workload is ${avgTaskLoad} missions per unit.`,
            category: 'TEAM'
        });

        // 6. Cultural Momentum
        const weekNominations = nominations.filter(n => isSameWeek(parseISO(n.timestamp), now, { weekStartsOn: 1 })).length;
        if (weekNominations > 5) {
            insights.push({
                id: 'team_culture_high',
                type: 'POSITIVE',
                message: `Strong Cultural Momentum: ${weekNominations} peer accolades recorded this week.`,
                category: 'TEAM'
            });
        }

        return insights;
    }
}

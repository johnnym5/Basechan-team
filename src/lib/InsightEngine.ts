import type { Attendance, DailyReport, Task, LeaveRequest, PulseCheck, UserProfile, Nomination, Kudos } from "@/lib/types";
import type {
  InsightEngineResult,
  OperationalMomentum,
  AbsenceTriage,
  FatigueVector,
  SanitizedMemo,
  ActionableDirective,
  ApprovedRestItem,
  PendingValidationItem,
  BehavioralPattern,
} from "@/types/insights";
import { differenceInMinutes, parseISO, isWithinInterval, startOfDay, subDays, format } from "date-fns";

export interface Insight {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'CRITICAL' | 'WARNING' | 'POSITIVE' | 'INFO';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'ATTENDANCE' | 'PERFORMANCE' | 'BURNOUT' | 'INTEGRITY' | 'TEAM';
  timestamp: string;
  targetUserId?: string;
  actionText?: string;
  actionType?: string;
}

/**
 * UT Basechan Pure Deterministic Insight Engine v2.0
 * High-performance, zero-LLM, multi-signal correlation engine.
 * Human-First Enterprise Copy (Zero Academic Jargon).
 */
export class InsightEngine {

  /**
   * Evaluates a complete multi-signal intelligence summary for a user.
   */
  public static evaluate(params: {
    userProfile: UserProfile;
    attendance: Attendance[];
    tasks: Task[];
    reports: DailyReport[];
    leaveRequests: LeaveRequest[];
    pulses: PulseCheck[];
    kudos?: Kudos[];
  }): InsightEngineResult {
    const { userProfile, attendance, tasks, reports, leaveRequests, pulses, kudos = [] } = params;

    const userAtt = attendance.filter(a => a.userId === userProfile.id);
    const userTasks = tasks.filter(t => t.assignedTo === userProfile.id);
    const userReports = reports.filter(r => r.userId === userProfile.id);
    const userLeaves = leaveRequests.filter(l => l.userId === userProfile.id);
    const userPulses = pulses.filter(p => p.userId === userProfile.id);

    const absenceTriage = this.triageAbsences(userAtt, userLeaves);
    const momentum = this.calculateOMI(userAtt, userTasks, userReports, absenceTriage);
    const slopeResult = this.calculatePunctualitySlope(userAtt);
    const fatigue = this.detectFatigue(userAtt, userTasks, userReports, userPulses);

    const latestReport = userReports.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
    const rawMemo = latestReport?.accomplishments || "";
    const sanitizedMemo = this.extractMemoTelemetry(rawMemo);

    const totalOperations = this.computeUnifiedOperations(userTasks, userReports, userAtt);
    const directives = this.generateDirectives(userTasks, userAtt, userReports, absenceTriage, fatigue);

    const behavioralPatterns = this.evaluateBehavioralPatterns({
      userProfile,
      attendance: userAtt,
      tasks: userTasks,
      reports: userReports,
      leaveRequests: userLeaves,
      pulses: userPulses,
      kudos,
    });

    return {
      momentum,
      punctualitySlope: slopeResult.slope,
      punctualityStatus: slopeResult.status,
      absenceTriage,
      fatigue,
      sanitizedMemo,
      directives,
      behavioralPatterns,
      totalOperations,
    };
  }

  /**
   * Helper for personal tactical insights & dynamic behavioral patterns
   */
  public static generatePersonalInsights(
    userProfile: UserProfile,
    attendance: Attendance[],
    tasks: Task[],
    leaveRequests: LeaveRequest[],
    pulses: PulseCheck[],
    nominations?: Nomination[],
    reports?: DailyReport[]
  ): Insight[] {
    const result = this.evaluate({
      userProfile,
      attendance,
      tasks,
      reports: reports || [],
      leaveRequests,
      pulses,
    });

    const insights: Insight[] = [];

    // 1. Directives (Actionable cards e.g. overdue tasks, EOD report if in 16:30+ window)
    result.directives.forEach((d, idx) => {
      const insightType: 'CRITICAL' | 'WARNING' | 'POSITIVE' | 'INFO' =
        d.severity === 'CRITICAL' ? 'CRITICAL' : d.severity === 'WARNING' ? 'WARNING' : 'INFO';

      insights.push({
        id: d.id || `dir-${idx}`,
        title: d.title,
        description: d.description,
        message: d.description,
        type: insightType,
        severity: d.severity,
        category: 'PERFORMANCE',
        timestamp: new Date().toISOString(),
        targetUserId: userProfile.id,
        actionText: d.actionText,
        actionType: d.actionType,
      });
    });

    // 2. Dynamic Behavioral Patterns
    result.behavioralPatterns.forEach((pattern, idx) => {
      const patternType: 'CRITICAL' | 'WARNING' | 'POSITIVE' | 'INFO' =
        pattern.classification === 'CRITICAL' ? 'CRITICAL' :
        pattern.classification === 'WARNING' ? 'WARNING' :
        pattern.classification === 'POSITIVE' ? 'POSITIVE' : 'INFO';

      insights.push({
        id: pattern.id || `bp-${idx}`,
        title: pattern.title,
        description: pattern.insightRendered,
        message: `${pattern.title}: ${pattern.insightRendered}`,
        type: patternType,
        severity: pattern.classification === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        category: 'PERFORMANCE',
        timestamp: new Date().toISOString(),
        targetUserId: userProfile.id,
        actionText: 'View Details',
        actionType: 'ROUTE',
      });
    });

    return insights;
  }

  /**
   * Helper for team insights
   */
  public static generateTeamInsights(
    staffList: UserProfile[],
    attendance: Attendance[],
    tasks: Task[],
    leaveRequests: LeaveRequest[],
    pulses: PulseCheck[],
    nominations?: Nomination[],
    reports?: DailyReport[]
  ): Insight[] {
    const insights: Insight[] = [];

    staffList.forEach((staff) => {
      const personal = this.generatePersonalInsights(staff, attendance, tasks, leaveRequests, pulses, nominations, reports);
      insights.push(...personal);
    });

    return insights;
  }

  /**
   * Evaluates the 16 Core Behavioral Heuristics (BP-01 to BP-16)
   * Plain English Enterprise Copy (Zero Academic Jargon).
   */
  public static evaluateBehavioralPatterns(params: {
    userProfile: UserProfile;
    attendance: Attendance[];
    tasks: Task[];
    reports: DailyReport[];
    leaveRequests: LeaveRequest[];
    pulses: PulseCheck[];
    kudos?: Kudos[];
  }): BehavioralPattern[] {
    const { attendance, tasks, reports, leaveRequests, pulses, kudos = [], userProfile } = params;
    const detectedPatterns: BehavioralPattern[] = [];

    const validShifts = attendance.filter(a => a.clockIn);

    // --- CATEGORY A: ARRIVAL CADENCE & PUNCTUALITY DYNAMICS ---

    // BP-01: Arrives Early
    const earlyShifts = validShifts.filter(s => {
      const c = new Date(s.clockIn);
      const e = new Date(s.clockIn);
      e.setHours(9, 15, 0, 0);
      return differenceInMinutes(e, c) >= 15;
    });
    if (earlyShifts.length >= 4) {
      const avgEarlyMins = Math.round(
        earlyShifts.reduce((acc, s) => {
          const c = new Date(s.clockIn);
          const e = new Date(s.clockIn);
          e.setHours(9, 15, 0, 0);
          return acc + differenceInMinutes(e, c);
        }, 0) / earlyShifts.length
      );
      detectedPatterns.push({
        id: 'BP-01',
        code: 'BP-01',
        title: 'Arrives Early',
        classification: 'POSITIVE',
        metric: `Avg ~${avgEarlyMins}m early`,
        insightRendered: `Consistently clocks in ~${avgEarlyMins} mins before shift start.`,
        category: 'ARRIVAL',
        priorityTier: 2,
      });
    }

    // BP-02: Right on Time
    const fringeShifts = validShifts.filter(s => {
      const c = new Date(s.clockIn);
      const e = new Date(s.clockIn);
      e.setHours(9, 15, 0, 0);
      const diffMins = Math.abs(differenceInMinutes(c, e));
      return diffMins <= 3;
    });
    if (fringeShifts.length >= 4 && earlyShifts.length < 4) {
      detectedPatterns.push({
        id: 'BP-02',
        code: 'BP-02',
        title: 'Right on Time',
        classification: 'NEUTRAL',
        metric: 'On-time arrival',
        insightRendered: 'Always clocks in right before the shift starts without being late.',
        category: 'ARRIVAL',
        priorityTier: 2,
      });
    }

    // BP-03: Irregular Clock-In Time
    if (validShifts.length >= 4) {
      const yValues = validShifts.map(s => {
        const c = new Date(s.clockIn);
        const e = new Date(s.clockIn);
        e.setHours(9, 15, 0, 0);
        return Math.max(0, differenceInMinutes(c, e));
      });
      const mean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
      const variance = yValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (yValues.length - 1);
      const stdDev = Math.round(Math.sqrt(variance));

      if (stdDev > 35) {
        detectedPatterns.push({
          id: 'BP-03',
          code: 'BP-03',
          title: 'Irregular Clock-In Time',
          classification: 'WARNING',
          metric: 'High arrival variance',
          insightRendered: 'Arrival times swing by more than an hour from day to day.',
          category: 'ARRIVAL',
          priorityTier: 1,
        });
      }
    }

    // BP-04: Monday / Post-Leave Lateness
    const dayOneShifts = validShifts.filter(s => new Date(s.clockIn).getDay() === 1);
    const otherShifts = validShifts.filter(s => new Date(s.clockIn).getDay() !== 1);

    if (dayOneShifts.length >= 2 && otherShifts.length >= 3) {
      const dayOneLateAvg = dayOneShifts.reduce((acc, s) => {
        const c = new Date(s.clockIn), e = new Date(s.clockIn);
        e.setHours(9, 15, 0, 0);
        return acc + Math.max(0, differenceInMinutes(c, e));
      }, 0) / dayOneShifts.length;

      const otherLateAvg = otherShifts.reduce((acc, s) => {
        const c = new Date(s.clockIn), e = new Date(s.clockIn);
        e.setHours(9, 15, 0, 0);
        return acc + Math.max(0, differenceInMinutes(c, e));
      }, 0) / otherShifts.length;

      if (dayOneLateAvg >= 2.5 * Math.max(1, otherLateAvg) && dayOneLateAvg > 10) {
        detectedPatterns.push({
          id: 'BP-04',
          code: 'BP-04',
          title: 'Monday / Post-Leave Lateness',
          classification: 'WARNING',
          metric: 'Post-rest day delay',
          insightRendered: 'Most late arrivals happen on the first day back from a weekend or time off.',
          category: 'ARRIVAL',
          priorityTier: 1,
        });
      }
    }

    // --- CATEGORY B: SHIFT DURATION & BREAKS ---

    // BP-05: Overwork Warning
    const longShifts = validShifts.filter(s => ((s.duration || 0) / 3600) >= 9.5);
    if (longShifts.length >= 4) {
      detectedPatterns.push({
        id: 'BP-05',
        code: 'BP-05',
        title: 'Overwork Warning',
        classification: 'CRITICAL',
        metric: `${longShifts.length} long shifts`,
        insightRendered: `Worked over 10 hours for ${longShifts.length} days in a row. Risk of burnout.`,
        category: 'DURATION',
        priorityTier: 1,
      });
    }

    // BP-06: Left Early
    const earlyOutShifts = validShifts.filter(s => {
      if (!s.clockOut) return false;
      const cOut = new Date(s.clockOut);
      const shiftEnd = new Date(s.clockOut);
      shiftEnd.setHours(17, 0, 0, 0);
      return differenceInMinutes(shiftEnd, cOut) > 15;
    });

    if (earlyOutShifts.length >= 2) {
      detectedPatterns.push({
        id: 'BP-06',
        code: 'BP-06',
        title: 'Left Early',
        classification: 'WARNING',
        metric: `${earlyOutShifts.length} early departures`,
        insightRendered: `Left before shift end ${earlyOutShifts.length} times without an approved leave request.`,
        category: 'DURATION',
        priorityTier: 1,
      });
    }

    // BP-07: Long Inactive Period
    const highIdleShifts = validShifts.filter(s => (s.idleTime || 0) > 7200); // > 120 mins
    if (highIdleShifts.length >= 2) {
      detectedPatterns.push({
        id: 'BP-07',
        code: 'BP-07',
        title: 'Long Inactive Period',
        classification: 'WARNING',
        metric: 'Inactive > 2h',
        insightRendered: 'No device or work activity detected for over 2 hours during the shift.',
        category: 'DURATION',
        priorityTier: 1,
      });
    }

    // BP-08: Working Off-Hours
    let offHoursMutations = 0;
    for (const report of reports) {
      if (report.createdAt) {
        const date = new Date(report.createdAt);
        const day = date.getDay();
        const hour = date.getHours();
        if (day === 0 || day === 6 || hour >= 22 || hour < 6) {
          offHoursMutations++;
        }
      }
    }
    if (offHoursMutations >= 3) {
      detectedPatterns.push({
        id: 'BP-08',
        code: 'BP-08',
        title: 'Working Off-Hours',
        classification: 'NEUTRAL',
        metric: 'Off-hours activity',
        insightRendered: 'Logged work outside normal hours (late at night or on weekends).',
        category: 'DURATION',
        priorityTier: 3,
      });
    }

    // --- CATEGORY C: DAILY REPORTING & UPDATES ---

    // BP-09: Daily Report On Time
    if (validShifts.length >= 3 && reports.length >= validShifts.length) {
      const instantReports = reports.filter(r => {
        const matchingShift = validShifts.find(s => s.date === r.reportDate && s.clockOut);
        if (!matchingShift || !matchingShift.clockOut) return false;
        const diff = Math.abs(differenceInMinutes(new Date(r.createdAt), new Date(matchingShift.clockOut)));
        return diff <= 15;
      });

      if (instantReports.length === validShifts.length) {
        detectedPatterns.push({
          id: 'BP-09',
          code: 'BP-09',
          title: 'Daily Report On Time',
          classification: 'POSITIVE',
          metric: 'On-time closeout',
          insightRendered: 'Always submits daily report right at clock-out.',
          category: 'REPORTING',
          priorityTier: 2,
        });
      }
    }

    // BP-10: Delayed Daily Reports
    const nextDayReports = reports.filter(r => {
      if (!r.createdAt || !r.reportDate) return false;
      const createdDateStr = format(new Date(r.createdAt), 'yyyy-MM-dd');
      return createdDateStr > r.reportDate;
    });

    if (nextDayReports.length >= 2) {
      detectedPatterns.push({
        id: 'BP-10',
        code: 'BP-10',
        title: 'Delayed Daily Reports',
        classification: 'WARNING',
        metric: 'Next-morning debriefs',
        insightRendered: 'Daily reports are usually submitted the next morning instead of at shift end.',
        category: 'REPORTING',
        priorityTier: 1,
      });
    }

    // BP-11: Brief Daily Report
    const lowFidelityReports = reports.filter(r => {
      const wordCount = (r.accomplishments || "").trim().split(/\s+/).length;
      return wordCount < 8 && wordCount > 0;
    });

    if (lowFidelityReports.length >= 2) {
      detectedPatterns.push({
        id: 'BP-11',
        code: 'BP-11',
        title: 'Brief Daily Report',
        classification: 'WARNING',
        metric: 'Short report text',
        insightRendered: 'Daily reports are very short (under 8 words). Needs more detail on completed work.',
        category: 'REPORTING',
        priorityTier: 1,
      });
    }

    // --- CATEGORY D: TASKS & DEADLINES ---

    // BP-12: Steady Daily Progress
    const completedTasks = tasks.filter(t => t.status === 'ARCHIVED');
    if (completedTasks.length >= 5 && validShifts.length >= 5) {
      detectedPatterns.push({
        id: 'BP-12',
        code: 'BP-12',
        title: 'Steady Daily Progress',
        classification: 'POSITIVE',
        metric: 'Daily task completions',
        insightRendered: 'Completed at least 1 task every day for the last 5 shifts.',
        category: 'VELOCITY',
        priorityTier: 2,
      });
    }

    // BP-13: Stuck Task
    const blockedTasks = tasks.filter(t => {
      if (t.status === 'ARCHIVED') return false;
      const updated = new Date(t.createdAt);
      const hoursIdle = differenceInMinutes(new Date(), updated) / 60;
      return hoursIdle >= 72 && t.priority === 'LEVEL_1';
    });

    if (blockedTasks.length > 0) {
      detectedPatterns.push({
        id: 'BP-13',
        code: 'BP-13',
        title: 'Stuck Task',
        classification: 'CRITICAL',
        metric: 'Task stalled > 3 days',
        insightRendered: `Task "${blockedTasks[0].title}" has not moved or been updated in over 3 days.`,
        category: 'VELOCITY',
        priorityTier: 1,
      });
    }

    // BP-14: Last-Minute Rush
    const compressedTasks = tasks.filter(t => {
      if (!t.dueDate || !t.createdAt) return false;
      const due = new Date(t.dueDate);
      const updated = new Date(t.createdAt);
      const hoursBefore = differenceInMinutes(due, updated) / 60;
      return hoursBefore >= 0 && hoursBefore <= 4;
    });

    if (compressedTasks.length >= 2) {
      detectedPatterns.push({
        id: 'BP-14',
        code: 'BP-14',
        title: 'Last-Minute Rush',
        classification: 'NEUTRAL',
        metric: 'Late task burst',
        insightRendered: 'Most task work happens in the final few hours before the deadline.',
        category: 'VELOCITY',
        priorityTier: 3,
      });
    }

    // --- CATEGORY E: TEAMWORK & COMMUNICATION ---

    // BP-15: Great Team Player
    const kudosGiven = kudos.filter(k => k.fromUserId === userProfile.id).length;
    const kudosReceived = kudos.filter(k => k.toUserId === userProfile.id).length;

    if (kudosGiven >= 2 && kudosReceived >= 1) {
      detectedPatterns.push({
        id: 'BP-15',
        code: 'BP-15',
        title: 'Great Team Player',
        classification: 'POSITIVE',
        metric: 'High team recognition',
        insightRendered: 'Regularly gives and receives peer recognition and shoutouts.',
        category: 'SYNCHRONICITY',
        priorityTier: 2,
      });
    }

    // BP-16: Solo Worker
    if (kudosGiven === 0 && kudosReceived === 0 && validShifts.length >= 5) {
      detectedPatterns.push({
        id: 'BP-16',
        code: 'BP-16',
        title: 'Solo Worker',
        classification: 'NEUTRAL',
        metric: 'Independent focus',
        insightRendered: 'Works mainly on individual tasks with little team chat or peer interaction.',
        category: 'SYNCHRONICITY',
        priorityTier: 3,
      });
    }

    // --- DYNAMIC FALLBACK LADDER ---
    let selectedPatterns = detectedPatterns.sort((a, b) => a.priorityTier - b.priorityTier);

    if (selectedPatterns.length < 3) {
      const onTimeRatio = validShifts.length > 0
        ? Math.round((validShifts.filter(s => !s.remarks?.includes('LATE')).length / validShifts.length) * 100)
        : 100;

      if (!selectedPatterns.some(p => p.id === 'BP-FALLBACK-CADENCE')) {
        selectedPatterns.push({
          id: 'BP-FALLBACK-CADENCE',
          code: 'BP-CADENCE',
          title: 'Steady Attendance',
          classification: 'POSITIVE',
          metric: `${onTimeRatio}% on-time`,
          insightRendered: `Arrives on time ${onTimeRatio}% of shifts with steady work progress.`,
          category: 'ARRIVAL',
          priorityTier: 3,
        });
      }

      if (selectedPatterns.length < 3) {
        selectedPatterns.push({
          id: 'BP-FALLBACK-TELEMETRY',
          code: 'BP-TELEMETRY',
          title: 'Verified Location',
          classification: 'POSITIVE',
          metric: 'Location verified',
          insightRendered: 'Check-in locations match office location guidelines.',
          category: 'DURATION',
          priorityTier: 3,
        });
      }

      if (selectedPatterns.length < 3) {
        selectedPatterns.push({
          id: 'BP-FALLBACK-HYGIENE',
          code: 'BP-HYGIENE',
          title: 'Regular Reporting',
          classification: 'POSITIVE',
          metric: 'Daily updates filed',
          insightRendered: 'Files daily work notes consistently at shift end.',
          category: 'REPORTING',
          priorityTier: 3,
        });
      }
    }

    return selectedPatterns.slice(0, 5);
  }

  /**
   * Calculates Operational Momentum Index (OMI) / Performance Score
   */
  private static calculateOMI(
    attendance: Attendance[],
    tasks: Task[],
    reports: DailyReport[],
    absenceTriage: AbsenceTriage
  ): OperationalMomentum {
    const assignedCount = tasks.length;
    const completedCount = tasks.filter(t => t.status === 'ARCHIVED').length;
    const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'ARCHIVED').length;

    let baseSv = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 75;
    const taskVelocityScore = Math.max(0, Math.round(baseSv - (15 * overdueCount)));

    const validShifts = attendance.filter(a => a.clockIn);
    let lateSum = 0;
    for (const shift of validShifts) {
      if (shift.clockIn) {
        const clockInDate = new Date(shift.clockIn);
        const expected = new Date(shift.clockIn);
        expected.setHours(9, 15, 0, 0);
        const lateMins = Math.max(0, differenceInMinutes(clockInDate, expected));
        lateSum += Math.min(1, lateMins / 60);
      }
    }
    const punctualityScore = validShifts.length > 0
      ? Math.max(0, Math.round(100 * (1 - (lateSum / validShifts.length))))
      : 85;

    const workedDays = validShifts.length;
    const debriefsCount = reports.length;
    const verifiedGeofenceCount = validShifts.filter(a => a.location === 'OFFICE' || a.clockInLocation).length;

    const debriefRatio = workedDays > 0 ? Math.min(1, debriefsCount / workedDays) : 1;
    const geofenceRatio = workedDays > 0 ? Math.min(1, verifiedGeofenceCount / workedDays) : 1;
    const reliabilityScore = Math.round(100 * (0.6 * debriefRatio + 0.4 * geofenceRatio));

    let consecutiveOnTimeDays = 0;
    const sortedAtt = [...validShifts].sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
    for (const shift of sortedAtt) {
      if (!shift.remarks?.includes('LATE')) {
        consecutiveOnTimeDays++;
      } else {
        break;
      }
    }
    const streakScore = Math.min(100, Math.round(20 * Math.log(1 + consecutiveOnTimeDays)));

    const hasUnexcused = absenceTriage.unexcused.length > 0 ? 1 : 0;
    const hasActiveBlocker = tasks.some(t => t.priority === 'LEVEL_1' && t.status !== 'ARCHIVED') ? 1 : 0;
    const hasStaleOverdue = overdueCount > 0 ? 1 : 0;

    const frictionPenalty = (20 * hasUnexcused) + (10 * hasActiveBlocker) + (5 * hasStaleOverdue);

    const weightedSum = (0.35 * taskVelocityScore) + (0.25 * punctualityScore) + (0.20 * reliabilityScore) + (0.20 * streakScore);
    const omi = Math.max(0, Math.min(100, Math.round(weightedSum - frictionPenalty)));

    let trend: 'UPWARD' | 'STABLE' | 'DOWNWARD' = 'STABLE';
    if (omi >= 80) trend = 'UPWARD';
    else if (omi < 60) trend = 'DOWNWARD';

    return {
      omi,
      taskVelocityScore,
      punctualityScore,
      reliabilityScore,
      streakScore,
      frictionPenalty,
      trend,
    };
  }

  /**
   * Punctuality Drift Velocity
   */
  private static calculatePunctualitySlope(attendance: Attendance[]): { slope: number; status: 'DEGRADING' | 'CONSOLIDATING' | 'STABLE' } {
    const validShifts = attendance
      .filter(a => a.clockIn)
      .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
      .slice(-10);

    if (validShifts.length < 3) {
      return { slope: 0, status: 'STABLE' };
    }

    const n = validShifts.length;
    const xValues = validShifts.map((_, i) => i + 1);
    const yValues = validShifts.map(s => {
      const c = new Date(s.clockIn);
      const e = new Date(s.clockIn);
      e.setHours(9, 15, 0, 0);
      return Math.max(0, differenceInMinutes(c, e));
    });

    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }

    const slope = denominator !== 0 ? Math.round((numerator / denominator) * 10) / 10 : 0;

    let status: 'DEGRADING' | 'CONSOLIDATING' | 'STABLE' = 'STABLE';
    if (slope > 1.5) status = 'DEGRADING';
    else if (slope < -1.0) status = 'CONSOLIDATING';

    return { slope, status };
  }

  /**
   * Differentiated Absence Triage
   */
  private static triageAbsences(attendance: Attendance[], leaveRequests: LeaveRequest[]): AbsenceTriage {
    const approvedRest: ApprovedRestItem[] = [];
    const pendingValidation: PendingValidationItem[] = [];
    const unexcused: string[] = [];

    const today = startOfDay(new Date());
    const clockedDates = new Set(attendance.map(a => a.date));

    for (let i = 1; i <= 14; i++) {
      const checkDate = subDays(today, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayOfWeek = checkDate.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      if (!clockedDates.has(dateStr)) {
        const approvedLeave = leaveRequests.find(l =>
          l.status === 'APPROVED' &&
          isWithinInterval(checkDate, { start: parseISO(l.startDate), end: parseISO(l.endDate) })
        );

        if (approvedLeave) {
          approvedRest.push({ date: dateStr, type: approvedLeave.leaveType || 'Approved Time Off' });
          continue;
        }

        const pendingLeave = leaveRequests.find(l =>
          l.status === 'PENDING' &&
          isWithinInterval(checkDate, { start: parseISO(l.startDate), end: parseISO(l.endDate) })
        );

        if (pendingLeave) {
          pendingValidation.push({ date: dateStr, leaveId: pendingLeave.id, type: pendingLeave.leaveType || 'Leave Request' });
          continue;
        }

        unexcused.push(dateStr);
      }
    }

    return { approvedRest, pendingValidation, unexcused };
  }

  /**
   * Fatigue & Overwork Risk Detection
   */
  private static detectFatigue(
    attendance: Attendance[],
    tasks: Task[],
    reports: DailyReport[],
    pulses: PulseCheck[]
  ): FatigueVector {
    const recentShifts = attendance.filter(a => a.duration).slice(-5);
    const totalHours = recentShifts.reduce((acc, s) => acc + ((s.duration || 0) / 3600), 0);
    const avgDailyHours = recentShifts.length > 0 ? Math.round((totalHours / recentShifts.length) * 10) / 10 : 0;

    let lateNightSubmissionsCount = 0;
    for (const report of reports.slice(-5)) {
      if (report.createdAt) {
        const hour = new Date(report.createdAt).getHours();
        if (hour >= 21 || hour < 5) lateNightSubmissionsCount++;
      }
    }

    let sentimentDelta = 0;
    const sortedPulses = [...pulses].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    if (sortedPulses.length >= 2) {
      const moodVal = (m?: string) => m === 'SMOOTH' ? 5 : m === 'NEUTRAL' ? 3 : 1;
      sentimentDelta = moodVal(sortedPulses[1]?.mood) - moodVal(sortedPulses[0]?.mood);
    }

    const isStrainDetected = avgDailyHours >= 9.5 || lateNightSubmissionsCount >= 2 || sentimentDelta >= 2;

    let message = "Normal workload. Hours and schedule are within standard limits.";
    if (isStrainDetected) {
      message = `Overwork Warning: Worked ${avgDailyHours}h/day average with ${lateNightSubmissionsCount} late-night submissions. Risk of burnout.`;
    }

    return {
      isStrainDetected,
      avgDailyHours,
      lateNightSubmissionsCount,
      sentimentDelta,
      message,
      ctaText: isStrainDetected ? "Request Time Off" : undefined,
      ctaAction: isStrainDetected ? "open-leave-dialog" : undefined,
    };
  }

  /**
   * EOD Daily Work Note Sanitization
   */
  private static extractMemoTelemetry(rawText: string): SanitizedMemo {
    if (!rawText || rawText.trim().length === 0) {
      return {
        rawText: "",
        sanitizedText: "No daily work note submitted for this shift.",
        tags: [],
        issueKeys: [],
        quality: "POOR",
        warningMessage: "Missing completed work details. Write your daily report.",
      };
    }

    const cleanText = rawText.trim().replace(/^["']|["']$/g, '');
    const wordCount = cleanText.split(/\s+/).length;

    let quality: 'GOOD' | 'FAIR' | 'POOR' = 'GOOD';
    let warningMessage: string | undefined = undefined;

    if (cleanText.length < 25 || wordCount <= 3) {
      quality = 'POOR';
      warningMessage = 'Very short note. Please add more details on completed work.';
    } else if (cleanText.length < 50) {
      quality = 'FAIR';
      warningMessage = 'Short summary. Consider adding completed task details.';
    }

    const moduleKeywords = [
      'staff-app', 'accounting', 'webrtc', 'procurement',
      'chat', 'attendance', 'leave', 'reports', 'tasks', 'auth'
    ];
    const tags: string[] = [];

    const lower = cleanText.toLowerCase();
    for (const kw of moduleKeywords) {
      if (lower.includes(kw) || lower.includes(kw.replace('-', ' '))) {
        tags.push(`#${kw}`);
      }
    }

    const issueKeyRegex = /(?:[A-Z]{2,10}-\d+|REQ-\d+|PO-\d+)/gi;
    const issueKeys = Array.from(new Set(cleanText.match(issueKeyRegex) || [])).map(k => k.toUpperCase());

    return {
      rawText,
      sanitizedText: cleanText,
      tags: tags.length > 0 ? tags : ['#general-work'],
      issueKeys,
      quality,
      warningMessage,
    };
  }

  /**
   * Unified Operations Index Calculation
   */
  private static computeUnifiedOperations(tasks: Task[], reports: DailyReport[], attendance: Attendance[]): number {
    const completedTasks = tasks.filter(t => t.status === 'ARCHIVED').length;
    const submittedReports = reports.length;
    const completedShifts = attendance.filter(a => a.clockOut).length;

    return completedTasks + submittedReports + completedShifts;
  }

  /**
   * Generates Actionable Resolution Directives with Plain English CTAs
   */
  private static generateDirectives(
    tasks: Task[],
    attendance: Attendance[],
    reports: DailyReport[],
    absenceTriage: AbsenceTriage,
    fatigue: FatigueVector
  ): ActionableDirective[] {
    const directives: ActionableDirective[] = [];

    // 1. Overdue Task Directive
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'ARCHIVED');
    if (overdueTasks.length > 0) {
      directives.push({
        id: 'dir-overdue-task',
        title: `${overdueTasks.length} Overdue Task(s)`,
        description: `Task "${overdueTasks[0].title}" is past its deadline. Please review or update.`,
        severity: 'CRITICAL',
        actionText: 'Review Task',
        actionType: 'open-tasks-dialog',
        payload: { taskId: overdueTasks[0].id },
      });
    }

    // 2. Daily Report Directive: ONLY display from 16:30 (4:30 PM) onwards if shift is active & report not yet filed
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isEodWindow = currentHour > 16 || (currentHour === 16 && currentMinute >= 30);

    const hasTodayClockIn = attendance.some(a => a.date === todayStr);
    const hasTodayReport = reports.some(r => r.reportDate === todayStr);

    if (isEodWindow && hasTodayClockIn && !hasTodayReport) {
      directives.push({
        id: 'dir-missing-debrief',
        title: 'Daily Report Due',
        description: 'Shift conclusion window open (4:30 PM+). Write your daily report to log accomplishments.',
        severity: 'WARNING',
        actionText: 'Write Daily Report',
        actionType: 'open-debrief-modal',
      });
    }

    // 3. Pending Leave Validation Directive
    if (absenceTriage.pendingValidation.length > 0) {
      directives.push({
        id: 'dir-pending-leave',
        title: `${absenceTriage.pendingValidation.length} Pending Leave Request(s)`,
        description: 'Leave request is awaiting HR approval.',
        severity: 'INFO',
        actionText: 'Review Status',
        actionType: 'open-leave-dialog',
      });
    }

    // 4. Fatigue Strain Directive
    if (fatigue.isStrainDetected) {
      directives.push({
        id: 'dir-fatigue-strain',
        title: 'Overwork Warning',
        description: fatigue.message,
        severity: 'WARNING',
        actionText: 'Request Time Off',
        actionType: 'open-leave-dialog',
      });
    }

    return directives;
  }
}

import type { Attendance, DailyReport, Task, LeaveRequest, PulseCheck, UserProfile, Nomination } from "@/lib/types";
import type {
  InsightEngineResult,
  OperationalMomentum,
  AbsenceTriage,
  FatigueVector,
  SanitizedMemo,
  ActionableDirective,
  ApprovedRestItem,
  PendingValidationItem,
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
 * UT Basechan Pure Deterministic Insight Engine
 * High-performance, zero-LLM, multi-signal correlation engine.
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
  }): InsightEngineResult {
    const { userProfile, attendance, tasks, reports, leaveRequests, pulses } = params;

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

    return {
      momentum,
      punctualitySlope: slopeResult.slope,
      punctualityStatus: slopeResult.status,
      absenceTriage,
      fatigue,
      sanitizedMemo,
      directives,
      totalOperations,
    };
  }

  /**
   * Backward-compatible helper for personal tactical insights
   */
  public static generatePersonalInsights(
    userProfile: UserProfile,
    attendance: Attendance[],
    tasks: Task[],
    leaveRequests: LeaveRequest[],
    pulses: PulseCheck[],
    nominations?: Nomination[]
  ): Insight[] {
    const result = this.evaluate({
      userProfile,
      attendance,
      tasks,
      reports: [],
      leaveRequests,
      pulses,
    });

    const insights: Insight[] = [];

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

    return insights;
  }

  /**
   * Backward-compatible helper for team insights
   */
  public static generateTeamInsights(
    staffList: UserProfile[],
    attendance: Attendance[],
    tasks: Task[],
    leaveRequests: LeaveRequest[],
    pulses: PulseCheck[],
    nominations?: Nomination[]
  ): Insight[] {
    const insights: Insight[] = [];

    staffList.forEach((staff) => {
      const personal = this.generatePersonalInsights(staff, attendance, tasks, leaveRequests, pulses, nominations);
      insights.push(...personal);
    });

    return insights;
  }

  /**
   * Calculates Operational Momentum Index (OMI)
   * Formula: OMI = max(0, min(100, 0.35*Sv + 0.25*Sp + 0.20*Sr + 0.20*Sc - Pf))
   */
  private static calculateOMI(
    attendance: Attendance[],
    tasks: Task[],
    reports: DailyReport[],
    absenceTriage: AbsenceTriage
  ): OperationalMomentum {
    // 1. Task Velocity Score (Sv)
    const assignedCount = tasks.length;
    const completedCount = tasks.filter(t => t.status === 'ARCHIVED').length;
    const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'ARCHIVED').length;

    let baseSv = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 75;
    const taskVelocityScore = Math.max(0, Math.round(baseSv - (15 * overdueCount)));

    // 2. Punctuality & Shift Integrity Score (Sp)
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

    // 3. Debrief & Telemetry Reliability Score (Sr)
    const workedDays = validShifts.length;
    const debriefsCount = reports.length;
    const verifiedGeofenceCount = validShifts.filter(a => a.location === 'OFFICE' || a.clockInLocation).length;

    const debriefRatio = workedDays > 0 ? Math.min(1, debriefsCount / workedDays) : 1;
    const geofenceRatio = workedDays > 0 ? Math.min(1, verifiedGeofenceCount / workedDays) : 1;
    const reliabilityScore = Math.round(100 * (0.6 * debriefRatio + 0.4 * geofenceRatio));

    // 4. Consistency Streak Factor (Sc)
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

    // 5. Friction Penalty (Pf)
    const hasUnexcused = absenceTriage.unexcused.length > 0 ? 1 : 0;
    const hasActiveBlocker = tasks.some(t => t.priority === 'LEVEL_1' && t.status !== 'ARCHIVED') ? 1 : 0;
    const hasStaleOverdue = overdueCount > 0 ? 1 : 0;

    const frictionPenalty = (20 * hasUnexcused) + (10 * hasActiveBlocker) + (5 * hasStaleOverdue);

    // Composite OMI Calculation
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
   * Punctuality Drift Velocity (beta slope over last 10 shifts)
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
   * Cross-references non-clocked dates against Leave Requests to eliminate false penalization.
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
          approvedRest.push({ date: dateStr, type: approvedLeave.leaveType || 'Approved Rest' });
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
   * Fatigue & Burnout Risk Detection
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

    let message = "Capacity balanced. Operational load is within sustainable limits.";
    if (isStrainDetected) {
      message = `Sustained overload: Clocked ${avgDailyHours}h/day average with ${lateNightSubmissionsCount} late-night submissions. High fatigue probability.`;
    }

    return {
      isStrainDetected,
      avgDailyHours,
      lateNightSubmissionsCount,
      sentimentDelta,
      message,
      ctaText: isStrainDetected ? "Request Off-Peak Rest" : undefined,
      ctaAction: isStrainDetected ? "open-leave-dialog" : undefined,
    };
  }

  /**
   * EOD Memo Sanitization & Lexical Density Analysis
   */
  private static extractMemoTelemetry(rawText: string): SanitizedMemo {
    if (!rawText || rawText.trim().length === 0) {
      return {
        rawText: "",
        sanitizedText: "No daily operational memo submitted for this cycle.",
        tags: [],
        issueKeys: [],
        quality: "POOR",
        warningMessage: "Missing quantifiable metrics. Add EOD deliverables.",
      };
    }

    const cleanText = rawText.trim().replace(/^["']|["']$/g, '');
    const wordCount = cleanText.split(/\s+/).length;

    let quality: 'GOOD' | 'FAIR' | 'POOR' = 'GOOD';
    let warningMessage: string | undefined = undefined;

    if (cleanText.length < 25 || wordCount <= 3) {
      quality = 'POOR';
      warningMessage = 'Low lexical density. Specify deliverables completed.';
    } else if (cleanText.length < 50) {
      quality = 'FAIR';
      warningMessage = 'Summary brief. Consider adding task IDs or metrics.';
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
      tags: tags.length > 0 ? tags : ['#general-operations'],
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
   * Generates Actionable Resolution Directives with CTAs
   */
  private static generateDirectives(
    tasks: Task[],
    attendance: Attendance[],
    reports: DailyReport[],
    absenceTriage: AbsenceTriage,
    fatigue: FatigueVector
  ): ActionableDirective[] {
    const directives: ActionableDirective[] = [];

    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'ARCHIVED');
    if (overdueTasks.length > 0) {
      directives.push({
        id: 'dir-overdue-task',
        title: `${overdueTasks.length} Task(s) Overdue`,
        description: `Task "${overdueTasks[0].title}" has exceeded its deadline. Unblock or update status.`,
        severity: 'CRITICAL',
        actionText: 'Resolve Tasks',
        actionType: 'open-tasks-dialog',
        payload: { taskId: overdueTasks[0].id },
      });
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasTodayClockIn = attendance.some(a => a.date === todayStr);
    const hasTodayReport = reports.some(r => r.reportDate === todayStr);

    if (hasTodayClockIn && !hasTodayReport) {
      directives.push({
        id: 'dir-missing-debrief',
        title: 'EOD Operational Report Due',
        description: 'Your shift is active. Submit daily debrief to log metrics and update OMI score.',
        severity: 'WARNING',
        actionText: 'Draft Debrief',
        actionType: 'open-debrief-modal',
      });
    }

    if (absenceTriage.pendingValidation.length > 0) {
      directives.push({
        id: 'dir-pending-leave',
        title: `${absenceTriage.pendingValidation.length} Pending Leave Request(s)`,
        description: 'Unresolved approval latency detected. HR verification required.',
        severity: 'INFO',
        actionText: 'View Leave Status',
        actionType: 'open-leave-dialog',
      });
    }

    if (fatigue.isStrainDetected) {
      directives.push({
        id: 'dir-fatigue-strain',
        title: 'High Fatigue Probability',
        description: fatigue.message,
        severity: 'WARNING',
        actionText: 'Request Off-Peak Rest',
        actionType: 'open-leave-dialog',
      });
    }

    return directives;
  }
}

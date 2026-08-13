"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase"
import { doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  UserX,
  Zap,
  Activity,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Trophy,
  RefreshCw,
  Sparkles,
  Heart,
  Hourglass,
  Calendar,
  Repeat,
  ShieldQuestion,
  Gift,
  FileText,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile, Attendance, Task, LeaveRequest, Nomination } from "@/lib/types"
import {
    isToday,
    isWithinInterval,
    subDays,
    startOfDay,
    endOfDay,
    parseISO,
    isWeekend,
    eachDayOfInterval,
    isAfter,
    startOfToday,
    differenceInDays,
    differenceInHours,
    format,
    getDay,
    isYesterday,
    isThisWeek,
    addDays,
    differenceInYears,
    startOfWeek,
    endOfWeek
} from "date-fns"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/usePermissions"

interface IntelligentSummaryCenterProps {
  staffList: UserProfile[];
  attendanceLogs: Attendance[];
  tasks: Task[];
  leaveRequests: LeaveRequest[];
  nominations?: Nomination[];
  isAdminOverride?: boolean;
}

export function IntelligentSummaryCenter({
  staffList = [],
  attendanceLogs = [],
  tasks = [],
  leaveRequests = [],
  nominations = [],
  isAdminOverride
}: IntelligentSummaryCenterProps) {
  const router = useRouter()
  const { user: authUser } = useUser()
  const firestore = useFirestore()

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser])
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef)
  const permissions = usePermissions(userProfile || null)

  const isAdmin = isAdminOverride ?? (permissions.canManageStaff || permissions.canManageCompany)

  const [timeframe, setTimeframe] = useState<"TODAY" | "WEEK" | "MONTH">("WEEK")
  const [selectedStaffId, setSelectedStaffId] = useState("ALL")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([])

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [modalData, setModalData] = useState<any>(null)

  // --- ENGINE: Tactical Insight Generation (30 RULES) ---
  const allInsights = useMemo(() => {
    const generated: any[] = []
    if (!userProfile) return generated

    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd')

    // Period calculation
    const lookbackDays = timeframe === 'MONTH' ? 30 : timeframe === 'WEEK' ? 7 : 1
    const interval = { start: startOfDay(subDays(now, lookbackDays - 1)), end: endOfDay(now) }

    // Helper: Is staffPOOL authorized for weekend work?
    const isAuthorizedWeekend = (userId: string) => false

    // --- 1. PERSONAL (STAFF) MICRO ENGINE (Rules 1-10) ---
    const myLogs = attendanceLogs.filter(log => log.userId === userProfile.id)
    const myTasks = tasks.filter(t => t.assignedTo === userProfile.id)
    const myLeaves = leaveRequests.filter(req => req.userId === userProfile.id)
    const myReceivedNominations = nominations.filter(n => n.nomineeId === userProfile.id)
    const mySentNominations = nominations.filter(n => n.nominatorId === userProfile.id)
    const personalPeriodLogs = myLogs.filter(l => isWithinInterval(parseISO(l.date + 'T00:00:00'), interval))

    // 1. Time Analytics
    const totalHrs = personalPeriodLogs.reduce((acc, l) => acc + ((l.duration || 0) / 3600), 0)
    const earliest = personalPeriodLogs.map(l => l.clockIn ? format(new Date(l.clockIn), 'HH:mm') : '00:00').sort()[0]
    generated.push({
      id: "staff_time", type: "info", severity: "STANDARD", icon: Clock, title: "Personal Analytics",
      text: personalPeriodLogs.length > 0
        ? `You've logged ${totalHrs.toFixed(1)} hours this cycle. Earliest arrival: ${earliest}.`
        : "Operational node cold. No hours detected in current temporal window.",
      actionLabel: "Full Ledger", actionType: "ROUTE", actionTarget: "/staff/attendance"
    })

    // 2. Perfect Cadence (Streak)
    const sortedLogs = [...myLogs].sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    for (const log of sortedLogs) {
      if (log.status === 'APPROVED' && !log.remarks?.includes('LATE')) streak++
      else break
    }
    generated.push({
      id: "staff_streak", type: streak >= 3 ? "success" : "info", severity: "STANDARD", icon: Sparkles, title: "Perfect Cadence",
      text: streak >= 3
        ? `Tactical Excellence: Perfect on-time streak of ${streak} days confirmed.`
        : `Personal streak currently at ${streak} days. Node optimization in progress.`,
      actionLabel: "View Trophy", actionType: "ROUTE", actionTarget: "/staff/reports"
    })

    // 3. Overtime Tracker (CRITICAL)
    const otShifts = personalPeriodLogs.filter(l => (l.duration || 0) > 30600).length // > 8.5h
    generated.push({
        id: "staff_ot", type: otShifts > 0 ? "warning" : "success", severity: otShifts > 3 ? "CRITICAL" : "STANDARD", icon: Zap, title: "Overtime Tracker",
        text: otShifts > 0
            ? `High Intensity Node: ${otShifts} tactical overtime sessions detected this cycle.`
            : "Nominal Intensity: No excessive node utilization detected.",
        actionLabel: "Check Stats", actionType: "ROUTE", actionTarget: "/staff/attendance"
    })

    // 4. Arrival Friction
    const recentLates = personalPeriodLogs.filter(l => l.remarks?.includes('LATE')).length
    generated.push({
      id: "staff_late_trend", type: recentLates >= 2 ? "warning" : "success", severity: "STANDARD", icon: Clock, title: "Arrival Friction",
      text: recentLates >= 2
        ? `Node Warning: Arrival latency detected ${recentLates} times. Calibration required.`
        : "Node Synced: Zero arrival friction events in recent cycles.",
      actionLabel: "Sync Logs", actionType: "ROUTE", actionTarget: "/staff/attendance"
    })

    // 5. Node Capacity
    const activePersonalTasks = myTasks.filter(t => t.status === 'ACTIVE' || t.status === 'QUEUED')
    generated.push({
      id: "staff_idle", type: activePersonalTasks.length === 0 ? "action" : "info", severity: "STANDARD", icon: UserX, title: "Node Capacity",
      text: activePersonalTasks.length === 0
        ? "Capacity Idle: Node has zero active mission assignments. Re-sync required."
        : `Node Saturated: ${activePersonalTasks.length} missions in active deployment.`,
      actionLabel: "Mission Hub", actionType: "ROUTE", actionTarget: "/tasks"
    })

    // 6. Task Stagnation
    const stagnant = activePersonalTasks.find(t => {
        const lastActivity = t.activity && t.activity.length > 0
            ? new Date(t.activity[t.activity.length - 1].timestamp)
            : new Date(t.createdAt)
        return (now.getTime() - lastActivity.getTime()) > 172800000 // 48h
    })
    generated.push({
        id: "staff_stagnant", type: stagnant ? "warning" : "success", severity: "STANDARD", icon: Hourglass, title: "Node Velocity",
        text: stagnant
            ? `High Friction: '${stagnant.title}' has stalled for > 48h. Clear blockers?`
            : "Optimal Flow: No stagnant personal workflows detected.",
        actionLabel: "Sync Status", actionType: "ROUTE", actionTarget: "/tasks"
    })

    // 7. New Deployment
    const newPersonalTasks = myTasks.filter(t => t.status === 'QUEUED' && (now.getTime() - new Date(t.createdAt).getTime()) < 86400000)
    generated.push({
        id: "staff_new_task", type: newPersonalTasks.length > 0 ? "success" : "info", severity: "STANDARD", icon: Activity, title: "Tactical Deployment",
        text: newPersonalTasks.length > 0
            ? `Node Alert: ${newPersonalTasks.length} fresh mission assignments initialized.`
            : "No new mission assignments detected in recent cycle.",
        actionLabel: "Start Work", actionType: "ROUTE", actionTarget: "/tasks"
    })

    // 8. Node Telemetry sync (CRITICAL check)
    const yesterdayLog = myLogs.find(l => l.date === yesterdayStr)
    const ghostSync = yesterdayLog && !yesterdayLog.clockOut
    generated.push({
      id: "staff_ghost_personal", type: ghostSync ? "warning" : "success", severity: ghostSync ? "CRITICAL" : "STANDARD", icon: AlertTriangle, title: "Telemetry Sync",
      text: ghostSync
        ? "Telemetry Mismatch: Failed to finalize clock-out for previous cycle."
        : "Node Integrity Verified: Telemetry synced perfectly with the grid.",
      actionLabel: "Resolve Sync", actionType: "ROUTE", actionTarget: "/staff/attendance"
    })

    // 9. Leave Station
    const upcomingLeave = myLeaves.find(req => req.status === 'APPROVED' && isWithinInterval(parseISO(req.startDate), { start: now, end: addDays(now, 7) }))
    generated.push({
        id: "staff_upcoming_leave", type: "info", severity: "STANDARD", icon: Calendar, title: "Leave Station",
        text: upcomingLeave
            ? `Authorized Absence: Node sign-off starts on ${format(parseISO(upcomingLeave.startDate), 'MMM dd')}.`
            : "No authorized node absences detected in next 7-day window.",
        actionLabel: "Plan Leave", actionType: "ROUTE", actionTarget: "/staff/leave"
    })

    // 10. Intel Reporting
    const yesterdayWorkDay = !isWeekend(subDays(now, 1))
    const missingEOD = yesterdayWorkDay && yesterdayLog && !yesterdayLog.eodReport
    generated.push({
        id: "staff_missing_eod", type: missingEOD ? "warning" : "success", severity: "STANDARD", icon: FileText, title: "Node Intel",
        text: missingEOD
            ? "Intelligence Gap: Previous Daily Intelligence Report missing from archive."
            : "Node Integrity: All tactical reports submitted for recent active cycles.",
        actionLabel: "Submit Intel", actionType: "ROUTE", actionTarget: "/staff/reports"
    })

    // --- 2. ADMINISTRATIVE (FLEET) MACRO ENGINE (20 Admin Rules) ---
    if (isAdmin) {
      const todaysLogs = attendanceLogs.filter(l => l.date === todayStr)
      const expectedStaff = staffList.filter(s => !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role))
      const activeStaffPool = selectedStaffId === "ALL" ? expectedStaff : expectedStaff.filter(s => s.id === selectedStaffId)
      const activeStaffIds = activeStaffPool.map(s => s.id)

      // 11. Live Overwatch (Always)
      const lateToday = todaysLogs.filter(l => l.remarks?.includes('LATE') && activeStaffIds.includes(l.userId))
      generated.push({
          id: "admin_late_today", type: lateToday.length > 0 ? "warning" : "success", severity: "STANDARD", icon: Clock, title: "Fleet Overwatch",
          text: lateToday.length > 0
            ? `${lateToday.length} unit(s) arrived with arrival latency today.`
            : "Full Fleet Synced: Zero arrival friction detected across active nodes.",
          actionLabel: "View Roster", actionType: "ROUTE", actionTarget: "/staff/attendance"
      })

      // 12. Missing Personnel (CRITICAL)
      const missingToday = activeStaffPool.filter(s => !todaysLogs.some(l => l.userId === s.id))
      if (missingToday.length > 0 && !isWeekend(now)) {
        generated.push({
          id: "admin_missing", type: "action", severity: "CRITICAL", icon: UserX, title: "Fleet AWOL",
          text: `Critical Gap: ${missingToday.length} nodes failed to initialize today's telemetry.`,
          actionLabel: "Audit Fleet", actionType: "ROUTE", actionTarget: "/staff/attendance"
        })
      }

      // 13. Ghost Shifts (CRITICAL)
      const ghosts = attendanceLogs.filter(l => l.date === yesterdayStr && !l.clockOut && activeStaffIds.includes(l.userId))
      if (ghosts.length > 0) {
        generated.push({
          id: "admin_ghosts", type: "warning", severity: "CRITICAL", icon: AlertTriangle, title: "Node Ghosting",
          text: `Protocol Violation: ${ghosts.length} nodes failed clock-out yesterday.`,
          actionLabel: "Fix Telemetry", actionType: "MODAL", actionTarget: "VERIFY_SHIFT"
        })
      }

      // 14. Review Bottleneck (Always)
      const pendingCount = tasks.filter(t => t.status === 'AWAITING_REVIEW' && activeStaffIds.includes(t.assignedTo)).length
      generated.push({
        id: "admin_reviews", type: pendingCount > 0 ? "action" : "success", severity: "STANDARD", icon: Activity, title: "Fleet Triage",
        text: pendingCount > 0
            ? `Mission Stalled: ${pendingCount} deployments awaiting administrative review.`
            : "Tactical Flow Optimal: Authorization queue clear.",
        actionLabel: "Clear Path", actionType: "ROUTE", actionTarget: "/tasks"
      })

      // 15. Idle Nodes (Always)
      const idleNodes = activeStaffPool.filter(s => !tasks.some(t => t.assignedTo === s.id && t.status !== 'ARCHIVED'))
      generated.push({
          id: "admin_idle", type: idleNodes.length > 0 ? "action" : "success", severity: "STANDARD", icon: UserX, title: "Fleet Capacity",
          text: idleNodes.length > 0
            ? `Unutilized Nodes: ${idleNodes.length} staff currently have zero active missions.`
            : "Fleet Utilization Optimal: Zero unassigned units detected.",
          actionLabel: "Deploy Work", actionType: "ROUTE", actionTarget: "/tasks"
      })

      // 16. Chronic Absenteeism (Always)
      const monthStart = startOfToday()
      monthStart.setDate(1)
      const chronicAbsent = activeStaffPool.map(s => {
          const logs = attendanceLogs.filter(l => l.userId === s.id && isAfter(parseISO(l.date + 'T00:00:00'), monthStart))
          return { id: s.id, name: s.fullName, count: 22 - logs.length }
      }).sort((a, b) => b.count - a.count)[0]
      generated.push({
        id: "admin_chronic_absent", type: (chronicAbsent && chronicAbsent.count > 5) ? "warning" : "info", severity: "STANDARD", icon: ShieldAlert, title: "Fleet Integrity",
        text: (chronicAbsent && chronicAbsent.count > 5)
            ? `Chronic Gap: ${chronicAbsent.name} missed ${chronicAbsent.count} sessions this month.`
            : "Fleet Resilience High: No chronic absenteeism patterns detected.",
        actionLabel: "Audit History", actionType: "ROUTE", actionTarget: "/reports"
      })

      // 17. Velocity Leader (Always)
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const topVelocity = activeStaffPool.map(s => ({
          name: s.fullName,
          count: tasks.filter(t => t.assignedTo === s.id && t.status === 'ARCHIVED' && isAfter(parseISO(t.createdAt), weekStart)).length
      })).sort((a, b) => b.count - a.count)[0]
      generated.push({
        id: "admin_velocity_top", type: (topVelocity && topVelocity.count > 3) ? "success" : "info", severity: "STANDARD", icon: Zap, title: "Velocity Leader",
        text: (topVelocity && topVelocity.count > 3)
            ? `Tactical Lead: ${topVelocity.name} finalized ${topVelocity.count} missions this week.`
            : "Operational Velocity Stable: Fleet performance at nominal levels.",
        actionLabel: "Send Medals", actionType: "MODAL", actionTarget: "SEND_KUDOS"
      })

      // 18. Leave Depletion (Always)
      const depletedLeave = activeStaffPool.find(s => (s.leaveEntitlements?.ANNUAL || 21) <= 2)
      generated.push({
          id: "admin_leave_low", type: depletedLeave ? "info" : "success", severity: "STANDARD", icon: Calendar, title: "Fleet Reserves",
          text: depletedLeave
            ? `Balance Alert: ${depletedLeave.fullName} has critical leave reserves (< 2 days).`
            : "Personnel Reserves Stable: Fleet leave balances within authorized thresholds.",
          actionLabel: "Review Ledger", actionType: "ROUTE", actionTarget: "/reports"
      })

      // 19. Task Revision Loop (Always)
      const revisionLoop = tasks.find(t => t.status === 'ACTIVE' && (t.activity?.filter(a => a.toStatus === 'AWAITING_REVIEW').length || 0) > 1)
      generated.push({
          id: "admin_rev_loop", type: revisionLoop ? "warning" : "success", severity: "STANDARD", icon: Repeat, title: "Mission Logic",
          text: revisionLoop
            ? `Node Friction: Mission '${revisionLoop.title}' stuck in revision loop.`
            : "Workflow Cohesion: No mission logic fragmentation detected.",
          actionLabel: "Audit Flow", actionType: "ROUTE", actionTarget: "/tasks"
      })

      // 20. Mass Leave Warning (Always)
      const massLeaveDate = leaveRequests.filter(req => req.status === 'APPROVED' && isAfter(parseISO(req.startDate), now)).map(r => r.startDate)
      const dateCounts = massLeaveDate.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {} as Record<string, number>)
      const peakDate = Object.entries(dateCounts).find(([_, count]) => count > (expectedStaff.length * 0.15))
      generated.push({
          id: "admin_mass_leave", type: peakDate ? "warning" : "success", severity: "STANDARD", icon: AlertTriangle, title: "Strategic Gaps",
          text: peakDate
            ? `Capacity Alert: Over 15% of fleet absent on ${format(parseISO(peakDate[0]), 'MMM dd')}.`
            : "Operational Continuity: No overlapping fleet-wide leaves detected.",
          actionLabel: "View Matrix", actionType: "ROUTE", actionTarget: "/staff/attendance"
      })

      // 21. Shift Truncation (Always)
      const truncationNodes = activeStaffPool.filter(s => {
          const logs = attendanceLogs.filter(l => l.userId === s.id && l.remarks?.includes('UNDERTIME'))
          return logs.length >= 3
      })
      generated.push({
          id: "admin_trunc_crit", type: truncationNodes.length > 0 ? "warning" : "success", severity: truncationNodes.length > 0 ? "CRITICAL" : "STANDARD", icon: Clock, title: "Duty Cycle",
          text: truncationNodes.length > 0
            ? `Telemetry Friction: ${truncationNodes.length} nodes exhibiting repeated early out.`
            : "Standard Duty Cycles: Node persistence within established protocols.",
          actionLabel: "Audit Nodes", actionType: "ROUTE", actionTarget: "/staff/attendance"
      })

      // 22. Recognition Drought (Always)
      const sortedNominations = [...nominations].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      const lastKudoDays = sortedNominations[0] ? differenceInDays(now, new Date(sortedNominations[0].timestamp)) : 99
      generated.push({
        id: "admin_culture", type: lastKudoDays > 14 ? "info" : "success", severity: "STANDARD", icon: Heart, title: "Cultural Pulse",
        text: lastKudoDays > 14
            ? `Morale Alert: Recognition drought detected (${lastKudoDays} days since last Kudos).`
            : `Culture High: Fleet node recognized ${lastKudoDays} days ago.`,
        actionLabel: "Boost Morale", actionType: "ROUTE", actionTarget: "/reports"
      })

      // 23. Unauthorized Telemetry (Always)
      const weekendGhost = attendanceLogs.find(l => {
          const day = getDay(parseISO(l.date))
          return (day === 0 || day === 6) && !isAuthorizedWeekend(l.userId)
      })
      generated.push({
          id: "admin_weekend", type: weekendGhost ? "warning" : "success", severity: "STANDARD", icon: ShieldQuestion, title: "Grid Integrity",
          text: weekendGhost
            ? `Unauthorized Telemetry: Node activity detected during unauthorized cycle (Weekend).`
            : "Grid Integrity: Zero unauthorized telemetry events detected on idle cycles.",
          actionLabel: "Audit Security", actionType: "ROUTE", actionTarget: "/reports"
      })

      // 24. Task Overload (Always)
      const overloaded = activeStaffPool.find(s => tasks.filter(t => t.assignedTo === s.id && t.status !== 'ARCHIVED').length > 10)
      generated.push({
          id: "admin_overload", type: overloaded ? "warning" : "success", severity: "STANDARD", icon: ShieldAlert, title: "Node Loading",
          text: overloaded
            ? `Node Critical: ${overloaded.fullName} overloaded with > 10 missions.`
            : "Load Balancing Optimal: All nodes operating within healthy mission density.",
          actionLabel: "Balance Load", actionType: "ROUTE", actionTarget: "/tasks"
      })

      // 25. Authorization Flow (Always)
      const staleLeave = leaveRequests.find(req => req.status === 'PENDING' && differenceInHours(now, new Date(req.createdAt)) > 48)
      generated.push({
          id: "admin_leave_stale", type: staleLeave ? "action" : "success", severity: "STANDARD", icon: Hourglass, title: "Command Hub",
          text: staleLeave
            ? "Command Friction: Authorized absence requests pending for > 48 hours."
            : "Command Response Optimal: Authorization queue clear of stale entries.",
          actionLabel: "Clear Queue", actionType: "ROUTE", actionTarget: "/staff/leave"
      })

      // 26. Operational Elite (Always)
      const topStreakNode = expectedStaff.map(s => {
          const sLogs = [...attendanceLogs.filter(l => l.userId === s.id)].sort((a, b) => b.date.localeCompare(a.date))
          let sCount = 0
          for (const l of sLogs) { if (l.status === 'APPROVED' && !l.remarks?.includes('LATE')) sCount++; else break; }
          return { name: s.fullName, sCount }
      }).sort((a, b) => b.sCount - a.sCount)[0]
      generated.push({
        id: "admin_elite", type: "success", severity: "STANDARD", icon: Trophy, title: "Fleet Elite",
        text: topStreakNode
            ? `Top Unit: ${topStreakNode.name} maintains a perfect ${topStreakNode.sCount}-day arrival streak.`
            : "Fleet Readiness: Analyzing nodal punctuality cadences.",
        actionLabel: "Review Leads", actionType: "MODAL", actionTarget: "SEND_KUDOS"
      })

      // 27. Duty Reporting (Always)
      const lateEOD = attendanceLogs.find(l => l.eodReport && l.clockOut && new Date(l.clockOut).getHours() >= 23)
      generated.push({
          id: "admin_late_eod", type: lateEOD ? "info" : "success", severity: "STANDARD", icon: Clock, title: "Reporting Sync",
          text: lateEOD
            ? "Intelligence Latency: Detected report submissions past node midnight."
            : "Reporting Integrity: All tactical data submitted within duty parameters.",
          actionLabel: "View Ledger", actionType: "ROUTE", actionTarget: "/reports"
      })

      // 28. Burnout Watch (Always)
      const burnoutRisk = expectedStaff.find(s => {
          const logs = attendanceLogs.filter(l => l.userId === s.id && isAfter(parseISO(l.date + 'T00:00:00'), subDays(now, 21)))
          const hours = logs.reduce((acc, l) => acc + ((l.duration || 0) / 3600), 0)
          return hours > 135
      })
      generated.push({
          id: "admin_burnout_risk", type: burnoutRisk ? "warning" : "success", severity: "STANDARD", icon: Heart, title: "Health Metrics",
          text: burnoutRisk
            ? `Burnout Risk: High intensity node utilization detected for ${burnoutRisk.fullName}.`
            : "Fleet Health: Unit utilization within healthy operational limits.",
          actionLabel: "Check Pulse", actionType: "ROUTE", actionTarget: "/reports"
      })

      // 29. Global Velocity (Always)
      const globalStagnant = tasks.find(t =>
          t.status === 'ACTIVE' &&
          activeStaffIds.includes(t.assignedTo) &&
          t.activity?.length > 0 &&
          (now.getTime() - new Date(t.activity[t.activity.length-1].timestamp).getTime()) > 259200000
      )
      generated.push({
          id: "admin_stagnant_fleet", type: globalStagnant ? "warning" : "success", severity: "STANDARD", icon: Hourglass, title: "Global Velocity",
          text: globalStagnant
            ? `Mission Friction: Global stagnant missions detected (> 72h).`
            : "Operational Velocity High: Fleet missions moving through path optimally.",
          actionLabel: "Sync Fleet", actionType: "ROUTE", actionTarget: "/tasks"
      })

      // 30. Service Landmarks (Always)
      const anniversaryNode = expectedStaff.find(s => {
          if (!s.joinedDate) return false
          const join = parseISO(s.joinedDate)
          return isThisWeek(join) && differenceInYears(now, join) >= 1
      })
      generated.push({
          id: "admin_anniversary", type: anniversaryNode ? "success" : "info", severity: "STANDARD", icon: Gift, title: "Service Cycle",
          text: anniversaryNode
            ? `Node Milestone: Celebrating node integrity anniversary for ${anniversaryNode.fullName}.`
            : "Service Reliability: No node anniversaries in current temporal window.",
          actionLabel: "Commemorate", actionType: "MODAL", actionTarget: "MESSAGE_STAFF"
      })
    }

    // Fallback
    if (generated.length === 0) {
      generated.push({
        id: "empty", type: "success", severity: "STANDARD", icon: CheckCircle, title: "Status Nominal",
        text: "Operations are running at 100% readiness. No anomalies detected.",
        actionLabel: "Dashboard", actionType: "ROUTE", actionTarget: "/"
      })
    }

    return generated
  }, [attendanceLogs, tasks, staffList, timeframe, isAdmin, userProfile, nominations, selectedStaffId])

  const criticalAlerts = useMemo(() => allInsights.filter(i => i.severity === 'CRITICAL' && !dismissedInsights.includes(i.id)), [allInsights, dismissedInsights])
  const standardBriefings = useMemo(() => allInsights.filter(i => i.severity !== 'CRITICAL' && !dismissedInsights.includes(i.id)), [allInsights, dismissedInsights])

  // --- ROTATION LOGIC ---
  const handleNext = useCallback(() => {
    if (standardBriefings.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % standardBriefings.length);
    setIsPaused(true);
  }, [standardBriefings.length]);

  const handlePrev = useCallback(() => {
    if (standardBriefings.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + standardBriefings.length) % standardBriefings.length);
    setIsPaused(true);
  }, [standardBriefings.length]);

  useEffect(() => {
    if (isPaused || standardBriefings.length <= 1) return;
    const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % standardBriefings.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, standardBriefings.length]);

  useEffect(() => {
    if (currentIndex >= standardBriefings.length) setCurrentIndex(0)
  }, [standardBriefings.length, currentIndex])

  const handleInsightAction = (insight: any) => {
    if (insight.actionType === 'ROUTE') {
      router.push(insight.actionTarget)
    } else if (insight.actionType === 'MODAL') {
      setModalData(insight)
      setActiveModal(insight.actionTarget)
    }
  }

  const activeInsight = standardBriefings[currentIndex]
  const Icon = activeInsight?.icon || CheckCircle

  return (
    <div className="w-full flex flex-col h-full gap-4 md:gap-6 overflow-x-hidden">

      {/* 1. CRITICAL ALERT OVERWATCH (Only renders if crisis detected) */}
      {criticalAlerts.length > 0 && (
        <div className="flex flex-col gap-3 w-full animate-in slide-in-from-top-4 duration-700">
          {criticalAlerts.map(alert => (
            <div
              key={alert.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 shadow-2xl backdrop-blur-xl animate-pulse gap-4"
            >
              <div className="flex items-center gap-4 md:gap-5">
                <div className="p-2.5 md:p-3 bg-rose-500 rounded-xl md:rounded-2xl text-white shrink-0 shadow-lg shadow-rose-500/40">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-0.5">Critical Overwatch</h4>
                  <p className="text-xs md:text-sm font-black tracking-tight text-white leading-tight break-words">{alert.text}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDismissedInsights(prev => [...prev, alert.id])}
                    className="h-8 md:h-9 px-3 md:px-4 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg md:rounded-xl"
                  >
                    Acknowledge
                  </Button>
                  <Button
                    onClick={() => handleInsightAction(alert)}
                    className="h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-black uppercase text-[8px] md:text-[9px] tracking-widest shadow-xl shadow-rose-500/30 flex items-center gap-2 group"
                  >
                    {alert.actionLabel} <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. TACTICAL BRIEFING ROTATOR */}
      <Card
        onClick={() => router.push(isAdmin ? '/reports?tab=team-reports' : '/reports?tab=intelligent-brief')}
        className="bg-card border-border shadow-2xl rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col h-full transition-all duration-500 cursor-pointer hover:border-primary/30 group/card"
      >
        <CardHeader className="border-b border-border/50 pb-3 md:pb-4 flex flex-row justify-between items-center bg-secondary/10 shrink-0 px-4 md:px-8">
            <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-primary/10 group-hover/card:scale-110 transition-transform">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-amber-500 animate-pulse" />
                </div>
                <div>
                    <CardTitle className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-primary">
                        {isAdmin ? "Team Insight" : "Personal Insight"}
                    </CardTitle>
                    <CardDescription className="text-[7px] md:text-[8px] font-bold uppercase opacity-40">AI-Driven Node Analysis</CardDescription>
                </div>
            </div>

            <div className="flex gap-3 md:gap-4 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-end hidden xs:flex">
                <span className="text-[9px] md:text-[10px] font-black text-primary font-mono leading-none">
                    {currentIndex + 1} / {standardBriefings.length}
                </span>
                <span className="text-[6px] md:text-[7px] font-bold uppercase opacity-40 tracking-widest mt-1">Queue</span>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrev}
                    className="h-7 w-7 md:h-8 md:w-8 rounded-lg md:rounded-xl hover:bg-secondary text-muted-foreground transition-all active:scale-95 border border-white/5"
                    title="Previous Node"
                >
                    <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="h-7 w-7 md:h-8 md:w-8 rounded-lg md:rounded-xl hover:bg-secondary text-muted-foreground transition-all active:scale-95 border border-white/5"
                    title="Next Node"
                >
                    <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
            </div>
            </div>
        </CardHeader>

        <CardContent
            className="p-6 md:p-10 flex-1 flex flex-col justify-center relative group/content"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {activeInsight && (
            <div key={activeInsight.id} className="w-full flex flex-col gap-6 md:gap-8 animate-in slide-in-from-right-8 fade-in duration-700">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8 text-center md:text-left">
                    <div className={cn(
                        "shrink-0 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] bg-opacity-10 shadow-2xl transition-all duration-500 group-hover/content:scale-110 group-hover/content:rotate-3",
                        activeInsight.type === 'warning' ? 'text-amber-500 bg-amber-500 shadow-amber-500/10' :
                        activeInsight.type === 'success' ? 'text-emerald-500 bg-emerald-500 shadow-emerald-500/10' :
                        activeInsight.type === 'action' ? 'text-rose-500 bg-rose-500 shadow-rose-500/10' :
                        activeInsight.type === 'info' ? 'text-blue-500 bg-blue-500 shadow-blue-500/10' :
                        'text-primary bg-primary shadow-primary/10'
                    )}>
                        <Icon className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    <div className="space-y-2 md:space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 md:gap-3 justify-center md:justify-start">
                            <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 truncate">
                            {activeInsight.title}
                            </h4>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent hidden md:block" />
                        </div>
                        <p className="text-xl md:text-2xl font-black font-headline tracking-tighter text-foreground leading-[1.1] md:max-w-xl break-words">
                        {activeInsight.text}
                        </p>
                    </div>
                </div>

                {activeInsight.actionType !== 'NONE' && (
                <div className="flex justify-center md:justify-end md:pr-4">
                    <Button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleInsightAction(activeInsight); }}
                    className="h-10 md:h-12 px-6 md:px-8 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 md:gap-3 group/btn"
                    >
                    {activeInsight.actionLabel}
                    <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                </div>
                )}
            </div>
            )}

            {/* Progress Bar for Auto-Cycle */}
            {!isPaused && standardBriefings.length > 1 && (
                <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress duration-[5000ms] ease-linear" />
                </div>
            )}
        </CardContent>
      </Card>

      {/* QUICK ACTION MODAL RENDERING ENGINE */}
      {activeModal && (
        <Dialog open={!!activeModal} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
          <DialogContent className="w-[95vw] max-w-[500px] apple-glass-darker border-none rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-3xl overflow-hidden">
            <DialogHeader className="mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4 mb-2">
                    <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-primary/10 text-primary shrink-0">
                        {activeModal === 'MESSAGE_STAFF' ? <MessageSquare className="w-5 h-5 md:w-6 md:h-6" /> :
                         activeModal === 'VERIFY_SHIFT' ? <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" /> : <Zap className="w-5 h-5 md:w-6 md:h-6" />}
                    </div>
                    <div className="min-w-0">
                        <DialogTitle className="text-xl md:text-2xl font-black font-headline tracking-tighter uppercase truncate">
                            {activeModal === 'MESSAGE_STAFF' ? "Triage Comms" :
                             activeModal === 'VERIFY_SHIFT' ? "Operational Audit" : "Intelligence Action"}
                        </DialogTitle>
                        <DialogDescription className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 truncate">System Override Node</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            {activeModal === 'MESSAGE_STAFF' && (
              <div className="space-y-4 md:space-y-6">
                <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Intelligence</p>
                    <p className="text-xs md:text-sm font-medium leading-relaxed italic opacity-80 break-words">"{modalData?.text}"</p>
                </div>
                <div className="h-32 md:h-40 border-2 border-dashed border-white/10 rounded-xl md:rounded-2xl flex items-center justify-center">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 px-6 text-center">Messaging Form Interface</p>
                </div>
                <Button className="w-full h-10 md:h-12 rounded-lg md:rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-[9px] md:text-[10px]" onClick={() => setActiveModal(null)}>Initialize Comms</Button>
              </div>
            )}

            {activeModal === 'VERIFY_SHIFT' && (
              <div className="space-y-4 md:space-y-6">
                <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-rose-500/5 border border-rose-500/10">
                    <p className="text-[10px] font-black text-rose-500 uppercase mb-2">Anomaly Detected</p>
                    <p className="text-xs md:text-sm font-medium leading-relaxed opacity-80 break-words">Manual verification required for session dwell time with zero activity.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <Button variant="outline" className="h-12 md:h-14 rounded-lg md:rounded-xl border-white/10 hover:bg-emerald-500/10 hover:text-emerald-500 font-black uppercase text-[8px] md:text-[10px] tracking-widest" onClick={() => setActiveModal(null)}>Valid</Button>
                    <Button variant="outline" className="h-12 md:h-14 rounded-lg md:rounded-xl border-white/10 hover:bg-rose-500/10 hover:text-rose-500 font-black uppercase text-[8px] md:text-[10px] tracking-widest" onClick={() => setActiveModal(null)}>Flag</Button>
                </div>
              </div>
            )}

            {activeModal === 'SEND_KUDOS' && (
              <div className="space-y-4 md:space-y-6 text-center">
                <div className="p-4 md:p-6 rounded-full bg-amber-500/10 w-fit mx-auto">
                    <Trophy className="w-10 h-10 md:w-12 md:h-12 text-amber-500 animate-bounce" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-base md:text-lg font-black uppercase tracking-tight truncate">Recognize Performance</h4>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1 break-words">Acknowledge exceptional velocity or streak.</p>
                </div>
                <Button className="w-full h-10 md:h-12 rounded-lg md:rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px]" onClick={() => setActiveModal(null)}>Dispatch Recognition</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

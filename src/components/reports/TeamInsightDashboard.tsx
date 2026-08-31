"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IntelligentSummaryCenter } from "./IntelligentSummaryCenter"
import type { UserProfile, Attendance, Task, LeaveRequest, Nomination, PulseCheck } from "@/lib/types"
import {
    isWithinInterval,
    parseISO,
    format,
    eachDayOfInterval,
    startOfDay,
    endOfDay,
    subDays,
    isWeekend,
    startOfToday,
    isAfter,
    startOfMonth,
    endOfMonth,
    addDays,
    differenceInDays,
    startOfWeek,
    endOfWeek
} from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert,
  Activity,
  Zap,
  ListTodo,
  TrendingUp,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  HeartPulse,
  Eye,
  MoreVertical,
  ChevronRight
} from "lucide-react"
import { useRouter } from "next/navigation"
import { DateScopePicker, type ViewScope } from "../shared/DateScopePicker"
import { StaffGroupMultiSelect } from "../shared/StaffGroupMultiSelect"
import { TrendInsightCard } from "./TrendInsightCard"
import { StaffActionMenu } from "../shared/StaffActionMenu"

interface TeamInsightDashboardProps {
    staffList: UserProfile[];
    attendanceLogs: Attendance[];
    tasks: Task[];
    leaveRequests: LeaveRequest[];
    nominations: Nomination[];
    pulseFeed: PulseCheck[];
    onExport: () => void;
}

export function TeamInsightDashboard({
    staffList = [],
    attendanceLogs = [],
    tasks = [],
    leaveRequests = [],
    nominations = [],
    pulseFeed = [],
    onExport
}: TeamInsightDashboardProps) {
  const router = useRouter()
  const [activeDate, setActiveDate] = useState<Date>(new Date())
  const [activeScope, setActiveScope] = useState<ViewScope>('WEEK')

  // Compatible state for children
  const timeFilter = useMemo(() => ({
    mode: activeScope as any,
    referenceDate: activeDate,
  }), [activeDate, activeScope])

  const expectedStaff = useMemo(() =>
    staffList.filter(s => !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role)),
  [staffList])

  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  // Auto-initialize with all staff on first data load
  useEffect(() => {
    if (expectedStaff.length > 0 && !initialized) {
      setSelectedStaffIds(expectedStaff.map(s => s.id))
      setInitialized(true)
    }
  }, [expectedStaff, initialized])

  // --- DATA ENGINE ---

  const filterInterval = useMemo(() => {
    let startDate: Date
    let endDate: Date

    if (timeFilter.mode === 'MONTH') {
      startDate = startOfMonth(timeFilter.referenceDate)
      endDate = endOfMonth(timeFilter.referenceDate)
    } else if (timeFilter.mode === 'WEEK') {
      startDate = startOfWeek(timeFilter.referenceDate, { weekStartsOn: 1 })
      endDate = endOfWeek(timeFilter.referenceDate, { weekStartsOn: 1 })
    } else {
      startDate = startOfDay(timeFilter.referenceDate)
      endDate = endOfDay(timeFilter.referenceDate)
    }

    return { start: startOfDay(startDate), end: endOfDay(endDate) }
  }, [timeFilter])

  const filteredStaff = useMemo(() => {
    return expectedStaff.filter(s => selectedStaffIds.includes(s.id))
  }, [expectedStaff, selectedStaffIds])

  const analytics = useMemo(() => {
    const periodPulses = pulseFeed.filter(p => isWithinInterval(parseISO(p.timestamp), filterInterval))
    const periodLogs = attendanceLogs.filter(l => isWithinInterval(parseISO(l.clockIn), filterInterval))

    const activeStaffIds = new Set(filteredStaff.map(s => s.id))

    const staffStats = filteredStaff.map(staff => {
      const userPulses = periodPulses.filter(p => p.userId === staff.id)
      const overwhelmedCount = userPulses.filter(p => p.mood === 'OVERWHELMED' || p.mood === 'HEAVY').length
      const smoothCount = userPulses.filter(p => p.mood === 'SMOOTH').length

      return {
        id: staff.id,
        name: staff.fullName,
        overwhelmedCount,
        smoothCount,
        totalPulses: userPulses.length,
        isThriving: smoothCount > 0 && overwhelmedCount === 0
      }
    })

    // Trend Metrics
    const onTimeRate = periodLogs.length > 0
        ? Math.round((periodLogs.filter(l => !l.remarks?.includes('LATE')).length / periodLogs.length) * 100)
        : 0

    const pendingTasks = tasks.filter(t => t.status === 'AWAITING_REVIEW' && activeStaffIds.has(t.assignedTo)).length
    const totalNominations = nominations.filter(n => isWithinInterval(parseISO(n.timestamp), filterInterval)).length

    return {
      overwhelmed: staffStats.filter(s => s.overwhelmedCount >= 2).sort((a, b) => b.overwhelmedCount - a.overwhelmedCount),
      thriving: staffStats.filter(s => s.isThriving).sort((a, b) => b.smoothCount - a.smoothCount),
      recentEODs: periodLogs.filter(l => l.eodReport && activeStaffIds.has(l.userId)).sort((a, b) => b.clockIn.localeCompare(a.clockIn)).slice(0, 10),
      metrics: {
          onTimeRate,
          pendingTasks,
          totalNominations,
          activePersonnel: periodLogs.filter(l => !l.clockOut).length
      }
    }
  }, [pulseFeed, attendanceLogs, filteredStaff, timeFilter, filterInterval, selectedStaffIds, tasks, nominations])

  const staffRankings = useMemo(() => {
    return filteredStaff.map(staff => {
        const tasksDone = tasks.filter(t => t.assignedTo === staff.id && t.status === 'ARCHIVED' && isWithinInterval(parseISO(t.createdAt), filterInterval)).length
        const kudos = nominations.filter(n => n.nomineeId === staff.id && isWithinInterval(parseISO(n.timestamp), filterInterval)).length

        const att = attendanceLogs.filter(l =>
          l.userId === staff.id &&
          isWithinInterval(parseISO(l.date + 'T00:00:00'), filterInterval)
        )

        const onTime = att.filter(l => l.status === 'APPROVED' && !l.remarks?.includes('LATE')).length
        const efficiency = att.length > 0 ? Math.round((onTime / att.length) * 100) : 0

        // Weighted scoring for ranking
        const totalScore = (tasksDone * 50) + (kudos * 25) + (efficiency * 2)

        return {
          id: staff.id,
          name: staff.fullName,
          tasksDone,
          efficiency,
          kudos,
          totalScore,
          status: staff.status,
          isArchived: staff.isArchived,
          currentLog: att.length > 0 ? att[0] : null
        }
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5)
  }, [filteredStaff, tasks, nominations, attendanceLogs, filterInterval])

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-12">

      {/* ROW 1: CONTROLS & EXPORT */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-card/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert className="w-32 h-32 text-primary" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white font-headline">Team Insight</h2>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 ml-5">Operational Overwatch & Health Radar</p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary ml-1 opacity-50 text-right mr-2">Personnel Filter</span>
              <StaffGroupMultiSelect
                staffList={expectedStaff}
                selectedIds={selectedStaffIds}
                onChange={setSelectedStaffIds}
              />
          </div>

          <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary ml-1 opacity-50 text-right mr-2">Timeframe Control</span>
              <DateScopePicker
                activeDate={activeDate}
                activeScope={activeScope}
                onDateChange={setActiveDate}
                onScopeChange={setActiveScope}
                loggedDates={attendanceLogs.map(l => l.date)}
              />
          </div>

          <Button
            variant="outline"
            onClick={onExport}
            className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest border-primary/20 hover:bg-primary/10 hover:border-primary transition-all self-end"
          >
            <Download className="w-4 h-4 mr-2 text-primary" /> Export
          </Button>
        </div>
      </div>

      {/* ROW 2: CRITICAL ALERTS & TREND METRICS */}
      <div className="w-full">
        <IntelligentSummaryCenter
                staffList={filteredStaff}
                attendanceLogs={attendanceLogs}
                tasks={tasks}
                leaveRequests={leaveRequests}
                nominations={nominations}
                timeFilter={timeFilter}
                variant="compact"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendInsightCard
          title="On-Time Arrival"
          metric={`${analytics.metrics.onTimeRate}%`}
          type="percentage"
          description={analytics.metrics.onTimeRate > 85 ? "Optimal arrival consistency" : "Punctuality requires attention"}
          status={analytics.metrics.onTimeRate > 85 ? 'success' : 'warning'}
        />
        <TrendInsightCard
          title="Active Personnel"
          metric={analytics.metrics.activePersonnel.toString()}
          description="Total units currently on duty"
          status="info"
        />
        <TrendInsightCard
          title="Action Items"
          metric={analytics.metrics.pendingTasks.toString()}
          description="Tasks awaiting review"
          status={analytics.metrics.pendingTasks > 5 ? 'danger' : 'info'}
        />
        <TrendInsightCard
          title="Recognition Pulse"
          metric={analytics.metrics.totalNominations.toString()}
          description="Total awards in current cycle"
          status="success"
        />
      </div>

      {/* ROW 3: ORGANIZATIONAL HEALTH (Burnout vs Thriving) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-rose-500/20 bg-rose-500/5 shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b border-rose-500/10 pb-4 shrink-0 px-8 pt-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4"/> High Workload Alerts
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {analytics.overwhelmed.length === 0 ? (
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 text-center py-8 italic">No staff reporting high workload in this period.</p>
                    ) : (
                        <div className="space-y-3">
                            {analytics.overwhelmed.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                    <span className="font-black text-xs uppercase text-white">{s.name}</span>
                                    <Badge variant="outline" className="bg-rose-500 text-white border-none text-[8px] font-black">{s.overwhelmedCount} FLAGS</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b border-emerald-500/10 pb-4 shrink-0 px-8 pt-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4"/> Top Performers
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {analytics.thriving.length === 0 ? (
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 text-center py-8 italic">No consistency data recorded.</p>
                    ) : (
                        <div className="space-y-3">
                            {analytics.thriving.slice(0, 5).map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="font-black text-xs uppercase text-white">{s.name}</span>
                                    <Badge variant="outline" className="bg-emerald-500 text-white border-none text-[8px] font-black">STABLE</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
      </div>

      {/* ROW 4: TACTICAL FEED & ACTION HUB */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* Live Activity Feed (Span 8) */}
        <Card className="xl:col-span-8 apple-glass border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col h-[600px]">
            <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-white/5 px-8 pt-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary"/> Activity Feed (Recent EODs)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analytics.recentEODs.map(log => {
                        const pulse = pulseFeed.find(p => p.userId === log.userId && p.date === log.date)
                        return (
                            <div key={log.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-3 group hover:border-primary/30 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-black text-white uppercase tracking-tight">{log.userName}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase">{format(parseISO(log.clockIn), 'MMM dd, HH:mm')}</p>
                                    </div>
                                    {pulse && (
                                        <Badge className={cn(
                                            "text-[7px] font-black px-2 py-0.5 border-none",
                                            pulse.mood === 'SMOOTH' ? "bg-emerald-500" :
                                            pulse.mood === 'HEAVY' ? "bg-amber-500" : "bg-rose-500"
                                        )}>
                                            {pulse.mood}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-muted-foreground leading-relaxed italic line-clamp-4 group-hover:line-clamp-none transition-all">
                                    "{log.eodReport}"
                                </p>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>

        {/* Action Hub / Leaderboard (Span 4) */}
        <Card className="xl:col-span-4 apple-glass border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col h-[600px]">
            <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-white/5 px-8 pt-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4"/> Performance Leaders
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] flex-1 bg-black/5">
                <div className="divide-y divide-white/5">
                    {staffRankings.map((staff, idx) => (
                        <div key={staff.id} className="p-4 hover:bg-white/5 transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <span className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shadow-inner shrink-0",
                                    idx === 0 ? "bg-amber-500 text-black" : "bg-secondary/50 text-muted-foreground"
                                )}>
                                    {idx + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-white uppercase truncate">{staff.name}</p>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">Score: {staff.totalScore}</p>
                                </div>
                            </div>
                            <StaffActionMenu
                                staff={{ id: staff.id, name: staff.name, status: staff.status, isArchived: staff.isArchived }}
                                currentLog={staff.currentLog}
                            />
                        </div>
                    ))}
                </div>
                <div className="p-6 mt-auto">
                    <Button variant="ghost" onClick={() => router.push('/reports?tab=recognition')} className="w-full rounded-xl h-12 border border-dashed border-white/10 hover:border-primary/50 text-[10px] font-black uppercase tracking-widest gap-2">
                        Full Performance Audit <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>

    </div>
  )
}

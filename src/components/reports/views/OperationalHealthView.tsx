"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, FileText, TrendingUp, Activity, Zap } from "lucide-react"
import type { UserProfile, Attendance, Task, LeaveRequest, PulseCheck } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, isAfter } from "date-fns"
import { IntelligentSummaryCenter } from "../IntelligentSummaryCenter"
import { TrendInsightCard } from "../TrendInsightCard"
import { StaffActionMenu } from "@/components/shared/StaffActionMenu"
import { type TimeFilterState } from "@/components/shared/AdvancedTimeFilter"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface OperationalHealthViewProps {
    timeFilter: TimeFilterState;
    staffList: UserProfile[];
    attendanceLogs: Attendance[];
    tasks: Task[];
    leaveRequests: LeaveRequest[];
    pulseFeed: PulseCheck[];
    selectedStaffIds: string[];
}

export function OperationalHealthView({
    timeFilter,
    staffList,
    attendanceLogs,
    tasks,
    leaveRequests,
    pulseFeed,
    selectedStaffIds
}: OperationalHealthViewProps) {

  const filterInterval = useMemo(() => {
    let startDate: Date
    let endDate: Date

    if (timeFilter.mode === 'MONTH') {
      startDate = startOfMonth(timeFilter.referenceDate)
      endDate = endOfMonth(timeFilter.referenceDate)
    } else if (timeFilter.mode === 'WEEK') {
      const monthStart = startOfMonth(timeFilter.referenceDate)
      startDate = addDays(monthStart, (timeFilter.weekIndex! - 1) * 7)
      endDate = endOfDay(addDays(startDate, 6))
      if (isAfter(endDate, endOfMonth(timeFilter.referenceDate))) {
        endDate = endOfMonth(timeFilter.referenceDate)
      }
    } else {
      startDate = startOfDay(timeFilter.referenceDate)
      endDate = endOfDay(timeFilter.referenceDate)
    }

    return { start: startOfDay(startDate), end: endOfDay(endDate) }
  }, [timeFilter])

  const analytics = useMemo(() => {
    const periodPulses = pulseFeed.filter(p => isWithinInterval(parseISO(p.timestamp), filterInterval))
    const periodLogs = attendanceLogs.filter(l => isWithinInterval(parseISO(l.clockIn), filterInterval))

    const activeStaffIds = new Set(selectedStaffIds)
    const filteredStaff = staffList.filter(s => activeStaffIds.has(s.id))

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

    const onTimeRate = periodLogs.length > 0
        ? Math.round((periodLogs.filter(l => !l.remarks?.includes('LATE')).length / periodLogs.length) * 100)
        : 0

    const pendingTasks = tasks.filter(t => t.status === 'AWAITING_REVIEW' && activeStaffIds.has(t.assignedTo)).length

    return {
      overwhelmed: staffStats.filter(s => s.overwhelmedCount >= 2).sort((a, b) => b.overwhelmedCount - a.overwhelmedCount),
      thriving: staffStats.filter(s => s.isThriving).sort((a, b) => b.smoothCount - a.smoothCount),
      recentEODs: periodLogs.filter(l => l.eodReport && activeStaffIds.has(l.userId)).sort((a, b) => b.clockIn.localeCompare(a.clockIn)).slice(0, 10),
      metrics: {
          onTimeRate,
          pendingTasks,
          activePersonnel: periodLogs.filter(l => !l.clockOut).length
      }
    }
  }, [pulseFeed, attendanceLogs, staffList, filterInterval, selectedStaffIds, tasks])

  const staffRankings = useMemo(() => {
    return staffList
      .filter(s => selectedStaffIds.includes(s.id))
      .map(staff => {
        const tasksDone = tasks.filter(t => t.assignedTo === staff.id && t.status === 'ARCHIVED' && isWithinInterval(parseISO(t.createdAt), filterInterval)).length

        const att = attendanceLogs.filter(l =>
          l.userId === staff.id &&
          isWithinInterval(parseISO(l.date + 'T00:00:00'), filterInterval)
        )

        const onTime = att.filter(l => l.status === 'APPROVED' && !l.remarks?.includes('LATE')).length
        const efficiency = att.length > 0 ? Math.round((onTime / att.length) * 100) : 0

        const totalScore = (tasksDone * 50) + (efficiency * 2)

        return {
          id: staff.id,
          name: staff.fullName,
          tasksDone,
          efficiency,
          totalScore,
          status: staff.status,
          isArchived: staff.isArchived,
          currentLog: att.length > 0 ? att[0] : null
        }
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5)
  }, [staffList, selectedStaffIds, tasks, attendanceLogs, filterInterval])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Accordion type="multiple" className="space-y-6">

        {/* SECTION 1: TACTICAL INTELLIGENCE HUB */}
        <AccordionItem value="tactical-intel" className="border-none">
          <Card className="apple-glass-darker border-primary/20 shadow-xl rounded-[2.5rem] overflow-hidden">
            <AccordionTrigger className="hover:no-underline px-8 py-6 group bg-primary/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest text-primary">Tactical Intelligence Radar (Deep-Dive)</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">Behavioral patterns, individual SITREPs, and real-time personnel insights</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-0 border-t border-white/5 bg-black/10">
                <IntelligentSummaryCenter
                    staffList={staffList}
                    attendanceLogs={attendanceLogs}
                    tasks={tasks}
                    leaveRequests={leaveRequests}
                    pulseFeed={pulseFeed}
                    timeFilter={timeFilter}
                />
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* SECTION 2: OPERATIONAL TRENDS */}
        <AccordionItem value="trends" className="border-none">
          <Card className="apple-glass-darker border-white/5 shadow-xl rounded-[2.5rem] overflow-hidden">
            <AccordionTrigger className="hover:no-underline px-8 py-6 group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl text-white group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest text-white">Operational Performance Trends</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">Aggregate punctuality, attendance, and mission throughput</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-8 border-t border-white/5 bg-black/10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <TrendInsightCard
                        title="On-Time Arrival"
                        metric={`${analytics.metrics.onTimeRate}%`}
                        description={analytics.metrics.onTimeRate > 85 ? "Optimal arrival consistency" : "Punctuality requires attention"}
                        status={analytics.metrics.onTimeRate > 85 ? 'success' : 'warning'}
                        sparklineData={[{value: 80}, {value: 85}, {value: analytics.metrics.onTimeRate}]}
                    />
                    <TrendInsightCard
                        title="Active Personnel"
                        metric={analytics.metrics.activePersonnel.toString()}
                        description="Total units currently on duty"
                        status="info"
                        sparklineData={[{value: 5}, {value: 8}, {value: analytics.metrics.activePersonnel}]}
                    />
                    <TrendInsightCard
                        title="Action Items"
                        metric={analytics.metrics.pendingTasks.toString()}
                        description="Tasks awaiting review"
                        status={analytics.metrics.pendingTasks > 5 ? 'danger' : 'info'}
                        sparklineData={[{value: 2}, {value: 4}, {value: analytics.metrics.pendingTasks}]}
                    />
                </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* SECTION 3: HEALTH & STRESS RADAR */}
        <AccordionItem value="health-radar" className="border-none">
          <Card className="apple-glass-darker border-white/5 shadow-xl rounded-[2.5rem] overflow-hidden">
            <AccordionTrigger className="hover:no-underline px-8 py-6 group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest text-rose-500">Personnel Health Radar</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">Burnout detection and organizational resilience tracking</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-8 border-t border-white/5 bg-black/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-card/40 border-rose-500/20 bg-rose-500/5 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="border-b border-rose-500/10 pb-4 shrink-0 px-8 pt-6">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4"/> Burnout Watchlist
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {analytics.overwhelmed.length === 0 ? (
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 text-center py-8 italic">No staff reporting high stress in this period.</p>
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

                    <Card className="bg-card/40 border-emerald-500/20 bg-emerald-500/5 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="border-b border-emerald-500/10 pb-4 shrink-0 px-8 pt-6">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4"/> Thriving Roster
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
            </AccordionContent>
          </Card>
        </AccordionItem>

      </Accordion>
    </div>
  )
}

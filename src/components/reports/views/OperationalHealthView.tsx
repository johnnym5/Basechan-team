"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, FileText, TrendingUp, Activity, Zap, Clock, UserCheck, ShieldAlert, ArrowRight, Check, X, ClipboardList, LogIn } from "lucide-react"
import type { UserProfile, Attendance, Task, LeaveRequest, PulseCheck } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, isAfter } from "date-fns"
import { IntelligentSummaryCenter } from "../IntelligentSummaryCenter"
import { TrendInsightCard } from "../TrendInsightCard"
import { StaffActionMenu } from "@/components/shared/StaffActionMenu"
import { type TimeFilterState } from "@/components/shared/AdvancedTimeFilter"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"

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
  const router = useRouter()
  const [activeMetric, setActiveMetric] = useState<'ON_TIME' | 'ACTIVE' | 'ACTION' | null>(null)

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

    const onTimeLogs = periodLogs.filter(l => !l.remarks?.includes('LATE'))
    const lateLogs = periodLogs.filter(l => l.remarks?.includes('LATE'))

    const onTimeRate = periodLogs.length > 0
        ? Math.round((onTimeLogs.length / periodLogs.length) * 100)
        : 0

    const pendingTasksList = tasks.filter(t => t.status === 'AWAITING_REVIEW' && activeStaffIds.has(t.assignedTo))
    const pendingLeaveList = leaveRequests.filter(l => l.status === 'PENDING' && activeStaffIds.has(l.userId))
    const activePersonnelList = periodLogs.filter(l => !l.clockOut)

    return {
      overwhelmed: staffStats.filter(s => s.overwhelmedCount >= 2).sort((a, b) => b.overwhelmedCount - a.overwhelmedCount),
      thriving: staffStats.filter(s => s.isThriving).sort((a, b) => b.smoothCount - a.smoothCount),
      recentEODs: periodLogs.filter(l => l.eodReport && activeStaffIds.has(l.userId)).sort((a, b) => b.clockIn.localeCompare(a.clockIn)).slice(0, 10),
      metrics: {
          onTimeRate,
          onTimeLogs,
          lateLogs,
          pendingTasksList,
          pendingLeaveList,
          activePersonnelList,
          totalPending: pendingTasksList.length + pendingLeaveList.length
      }
    }
  }, [pulseFeed, attendanceLogs, staffList, filterInterval, selectedStaffIds, tasks, leaveRequests])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Accordion type="multiple" className="space-y-6" defaultValue={["trends"]}>

        {/* SECTION 1: ACTIVITY HUB */}
        <AccordionItem value="tactical-intel" className="border-none">
          <Card className="apple-glass-darker border-primary/20 shadow-xl rounded-[2.5rem] overflow-hidden">
            <AccordionTrigger className="hover:no-underline px-8 py-6 group bg-primary/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest text-primary">Activity Radar (Deep-Dive)</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">Behavioral patterns, individual reports, and real-time personnel insights</span>
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
                        type="percentage"
                        description={analytics.metrics.onTimeRate > 85 ? "Optimal arrival consistency" : "Punctuality requires attention"}
                        status={analytics.metrics.onTimeRate > 85 ? 'success' : 'warning'}
                        onClick={() => setActiveMetric('ON_TIME')}
                    />
                    <TrendInsightCard
                        title="Active Personnel"
                        metric={analytics.metrics.activePersonnelList.length.toString()}
                        description="Total units currently on duty"
                        status="info"
                        onClick={() => setActiveMetric('ACTIVE')}
                    />
                    <TrendInsightCard
                        title="Action Items"
                        metric={analytics.metrics.totalPending.toString()}
                        description="Tasks & Leaves awaiting review"
                        status={analytics.metrics.totalPending > 5 ? 'danger' : 'info'}
                        onClick={() => setActiveMetric('ACTION')}
                    />
                </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* SECTION 3: HEALTH & STRESS OVERVIEW */}
        <AccordionItem value="health-radar" className="border-none">
          <Card className="apple-glass-darker border-white/5 shadow-xl rounded-[2.5rem] overflow-hidden">
            <AccordionTrigger className="hover:no-underline px-8 py-6 group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest text-rose-500">Personnel Health Overview</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">High workload detection and organizational resilience tracking</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-8 border-t border-white/5 bg-black/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-card/40 border-rose-500/20 bg-rose-500/5 shadow-xl rounded-[2rem] overflow-hidden">
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

                    <Card className="bg-card/40 border-emerald-500/20 bg-emerald-500/5 shadow-xl rounded-[2rem] overflow-hidden">
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
            </AccordionContent>
          </Card>
        </AccordionItem>

      </Accordion>

      {/* KPI DRILL-DOWN MODAL */}
      <Dialog open={activeMetric !== null} onOpenChange={(open) => !open && setActiveMetric(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] apple-glass-darker border border-white/10 p-0 overflow-hidden shadow-3xl flex flex-col">
          <div className="flex-1 flex flex-col min-h-0">
            <DialogHeader className="p-8 border-b border-white/5 bg-white/5 shrink-0">
                <div className="flex items-center gap-4 text-left">
                    <div className={cn(
                        "p-3 rounded-2xl shadow-inner border transition-all",
                        activeMetric === 'ON_TIME' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                        activeMetric === 'ACTIVE' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    )}>
                        {activeMetric === 'ON_TIME' ? <Clock className="w-6 h-6" /> :
                         activeMetric === 'ACTIVE' ? <UserCheck className="w-6 h-6" /> :
                         <ShieldAlert className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col items-start">
                        <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white leading-none mb-1">
                            {activeMetric === 'ON_TIME' ? "Punctuality Audit" :
                             activeMetric === 'ACTIVE' ? "Active Roster" : "Pending Actions"}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            Real-time operational drill-down for {format(timeFilter.referenceDate, 'MMMM yyyy')}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="space-y-6">
                  {activeMetric === 'ACTIVE' && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-4">
                        <LogIn className="w-3.5 h-3.5" /> Units Currently Signed In
                      </h4>
                      {analytics.metrics.activePersonnelList.length === 0 ? (
                        <p className="text-xs italic text-muted-foreground text-center py-10 opacity-30">No active units detected at this node.</p>
                      ) : (
                        analytics.metrics.activePersonnelList.map(log => (
                          <div key={log.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-4 text-left">
                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-black text-xs text-white">
                                    {log.userName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">{log.userName}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 flex items-center gap-1 text-left">
                                        <Clock className="w-2.5 h-2.5" /> {format(parseISO(log.clockIn), 'hh:mm aa')}
                                    </p>
                                </div>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] font-black uppercase">LIVE</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeMetric === 'ON_TIME' && (
                    <div className="space-y-8">
                      {/* LATE LOGS FIRST */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-3.5 h-3.5" /> Late Arrival Logs
                        </h4>
                        {analytics.metrics.lateLogs.length === 0 ? (
                            <p className="text-xs italic text-muted-foreground text-center py-4 opacity-30">No lateness recorded in this cycle.</p>
                        ) : (
                            analytics.metrics.lateLogs.map(log => (
                                <div key={log.id} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-left">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tight">{log.userName}</p>
                                            <p className="text-[9px] font-bold text-rose-400 uppercase opacity-60">{format(parseISO(log.clockIn), 'MMM dd, HH:mm')}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="border-rose-500/30 text-rose-500 text-[8px] font-black">LATE</Badge>
                                </div>
                            ))
                        )}
                      </div>

                      {/* ON TIME LOGS */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2 mb-4">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Punctual Attendance
                        </h4>
                        {analytics.metrics.onTimeLogs.length === 0 ? (
                            <p className="text-xs italic text-muted-foreground text-center py-4 opacity-30">No punctual arrivals recorded.</p>
                        ) : (
                            analytics.metrics.onTimeLogs.slice(0, 10).map(log => (
                                <div key={log.id} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between opacity-60">
                                    <div className="flex items-center gap-4 text-left">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tight">{log.userName}</p>
                                            <p className="text-[9px] font-bold text-emerald-400 uppercase opacity-60">{format(parseISO(log.clockIn), 'MMM dd, HH:mm')}</p>
                                        </div>
                                    </div>
                                    <Check className="w-4 h-4 text-emerald-500" />
                                </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeMetric === 'ACTION' && (
                    <div className="space-y-8">
                        {/* PENDING TASKS */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-4">
                                <ClipboardList className="w-3.5 h-3.5" /> Tasks Awaiting Review
                            </h4>
                            {analytics.metrics.pendingTasksList.length === 0 ? (
                                <p className="text-xs italic text-muted-foreground text-center py-4 opacity-30">No tasks pending review.</p>
                            ) : (
                                analytics.metrics.pendingTasksList.map(task => (
                                    <div key={task.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                                        <div className="flex justify-between items-start text-left">
                                            <p className="text-xs font-black text-white uppercase leading-tight">{task.title}</p>
                                            <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black uppercase shrink-0">PENDING</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Assigned: {task.assignedToName}</p>
                                            <Button size="sm" className="h-7 px-3 text-[8px] font-black uppercase tracking-widest rounded-lg" onClick={() => router.push(`/tasks?id=${task.id}`)}>Review</Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* PENDING LEAVES */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 flex items-center gap-2 mb-4">
                                <Activity className="w-3.5 h-3.5" /> Leave Requests
                            </h4>
                            {analytics.metrics.pendingLeaveList.length === 0 ? (
                                <p className="text-xs italic text-muted-foreground text-center py-4 opacity-30">No leave requests pending.</p>
                            ) : (
                                analytics.metrics.pendingLeaveList.map(leave => (
                                    <div key={leave.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                        <div className="text-left">
                                            <p className="text-sm font-black text-white uppercase tracking-tight">{leave.userName}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">{leave.leaveType} • {leave.totalDays} Days</p>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-primary hover:bg-primary/10" onClick={() => router.push('/staff/leave')}>
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                  )}
                </div>
            </div>

            <DialogFooter className="p-8 bg-white/5 border-t border-white/5 shrink-0">
                <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl border-white/10 font-black uppercase text-[10px] tracking-widest hover:bg-white/5"
                    onClick={() => setActiveMetric(null)}
                >
                    Close Intelligence Drill-Down
                </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

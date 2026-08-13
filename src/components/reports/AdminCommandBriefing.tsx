"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { IntelligentSummaryCenter } from "./IntelligentSummaryCenter"
import type { UserProfile, Attendance, Task, LeaveRequest, Nomination } from "@/lib/types"
import {
    startOfWeek,
    endOfWeek,
    isWithinInterval,
    parseISO,
    format,
    eachDayOfInterval,
    startOfDay,
    endOfDay,
    subDays,
    isWeekend,
    isToday,
    startOfToday,
    isAfter
} from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  UserX,
  LineChart as ChartIcon,
  Zap,
  CheckCircle2,
  Calendar,
  Activity,
  ShieldAlert
} from "lucide-react"
import { useRouter } from "next/navigation"

interface AdminCommandBriefingProps {
    staffList: UserProfile[];
    attendanceLogs: Attendance[];
    tasks: Task[];
    leaveRequests: LeaveRequest[];
    nominations?: Nomination[];
}

export function AdminCommandBriefing({
    staffList = [],
    attendanceLogs = [],
    tasks = [],
    leaveRequests = [],
    nominations = []
}: AdminCommandBriefingProps) {
  const router = useRouter()
  const [timeframe, setTimeframe] = useState("WEEK")
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  // --- DATA ENGINE (REAL DATA ONLY) ---

  // 1. Filter Staff by Role/Department
  const activeStaff = useMemo(() => {
    if (roleFilter === "ALL") return staffList.filter(s => !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role));
    return staffList.filter(staff =>
        staff.role === roleFilter ||
        staff.departmentName === roleFilter ||
        staff.position === roleFilter
    );
  }, [staffList, roleFilter])

  const activeStaffIds = useMemo(() => activeStaff.map(s => s.id), [activeStaff])

  // 2. The Triage Queue (Critical Action Items)
  const triageQueue = useMemo(() => {
    const pendingLeaves = leaveRequests
      .filter(req => req.status === 'PENDING' && activeStaffIds.includes(req.userId))
      .map(req => ({
          id: req.id,
          type: 'LEAVE',
          title: `Leave: ${req.userName}`,
          date: req.createdAt,
          badgeClass: "bg-amber-500/20 text-amber-500 border-amber-500/30"
      }))

    const pendingTasks = tasks
      .filter(t => t.status === 'AWAITING_REVIEW' && activeStaffIds.includes(t.assignedTo))
      .map(t => ({
          id: t.id,
          type: 'TASK',
          title: `Review: ${t.title}`,
          date: t.createdAt,
          badgeClass: "bg-primary/20 text-primary border-primary/30"
      }))

    return [...pendingLeaves, ...pendingTasks].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [leaveRequests, tasks, activeStaffIds])

  // 3. System Velocity (Task Completion over time)
  const velocityData = useMemo(() => {
    const now = new Date()
    const lookback = timeframe === 'MONTH' ? 30 : 7
    const interval = eachDayOfInterval({
        start: subDays(now, lookback - 1),
        end: now
    })

    return interval.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const completedCount = tasks.filter(t =>
        t.status === 'ARCHIVED' &&
        activeStaffIds.includes(t.assignedTo) &&
        t.createdAt?.startsWith(dateStr)
      ).length

      return {
        name: format(day, timeframe === 'MONTH' ? 'dd' : 'EEE'),
        completed: completedCount,
        fullDate: dateStr
      }
    })
  }, [tasks, activeStaffIds, timeframe])

  // 4. Compliance & Friction Radar
  const frictionRadar = useMemo(() => {
    const today = startOfToday()
    const lookback = timeframe === 'MONTH' ? 30 : timeframe === 'WEEK' ? 7 : 1
    const intervalDays = eachDayOfInterval({
        start: subDays(today, lookback - 1),
        end: today
    })

    return activeStaff.map(staff => {
      const staffLogs = attendanceLogs.filter(log =>
        log.userId === staff.id &&
        isWithinInterval(parseISO(log.date + 'T00:00:00'), {
            start: startOfDay(subDays(today, lookback - 1)),
            end: endOfDay(today)
        })
      )

      const lateCount = staffLogs.filter(l => l.remarks?.includes('LATE')).length

      // Absence logic: Weekdays in interval with no logs
      const absentCount = intervalDays.filter(day => {
          if (isWeekend(day) || isAfter(day, today)) return false
          const dateStr = format(day, 'yyyy-MM-dd')
          return !staffLogs.some(l => l.date === dateStr)
      }).length

      const pendingTasks = tasks.filter(t =>
        t.assignedTo === staff.id &&
        t.status === 'AWAITING_REVIEW'
      ).length

      const frictionScore = lateCount + (absentCount * 2) + pendingTasks;

      return {
          id: staff.id,
          name: staff.fullName,
          lateCount,
          absentCount,
          pendingTasks,
          frictionScore
      }
    }).sort((a, b) => b.frictionScore - a.frictionScore)
  }, [activeStaff, attendanceLogs, tasks, timeframe])


  // --- UI RENDER ---
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-700 pb-12">

      {/* 1. STRATEGIC OVERWATCH HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert className="w-32 h-32 text-primary" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-white font-headline">Command Briefing</h2>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 ml-5"> Fleet Tactical Intelligence & Operational Triage</p>
        </div>

        <div className="flex gap-3 relative z-10">
          <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary ml-1 opacity-50 text-right mr-2">Operational Node</span>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px] h-12 rounded-2xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-all shadow-inner">
                    <SelectValue placeholder="Full Fleet" />
                </SelectTrigger>
                <SelectContent className="apple-glass-darker border-none">
                  <SelectItem value="ALL" className="text-[10px] font-bold uppercase p-3">Full Fleet</SelectItem>
                  <SelectItem value="STAFF" className="text-[10px] font-bold uppercase p-3">Personnel</SelectItem>
                  <SelectItem value="HR_MANAGER" className="text-[10px] font-bold uppercase p-3">HR Command</SelectItem>
                  <SelectItem value="FINANCE_MANAGER" className="text-[10px] font-bold uppercase p-3">Finance Ops</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary ml-1 opacity-50 text-right mr-2">Temporal Window</span>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-[140px] h-12 rounded-2xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-all shadow-inner">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="apple-glass-darker border-none">
                  <SelectItem value="TODAY" className="text-[10px] font-bold uppercase p-3">Today</SelectItem>
                  <SelectItem value="WEEK" className="text-[10px] font-bold uppercase p-3">This Week</SelectItem>
                  <SelectItem value="MONTH" className="text-[10px] font-bold uppercase p-3">This Month</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </div>
      </div>

      {/* 2. INTELLIGENCE & TRIAGE BENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* Intelligence Rotator (Span 8) - Centerpiece */}
        <div className="lg:col-span-8 h-full">
           <IntelligentSummaryCenter
                staffList={activeStaff}
                attendanceLogs={attendanceLogs}
                tasks={tasks}
                leaveRequests={leaveRequests}
                nominations={nominations}
           />
        </div>

        {/* Triage Queue (Span 4) */}
        <Card className="lg:col-span-4 apple-glass border-none shadow-2xl flex flex-col h-[350px] overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4 bg-orange-500/5 shrink-0 px-8 pt-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Triage Queue</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2 bg-black/10">
            {triageQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                  <CheckCircle className="w-10 h-10 mb-3" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-center">Operational Queue Clear</p>
              </div>
            ) : (
              triageQueue.map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => router.push(item.type === 'LEAVE' ? '/staff/leave' : '/tasks')}
                  className="p-3 rounded-xl border border-white/5 flex justify-between items-center bg-card/40 hover:bg-white/5 hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Badge variant="outline" className={cn("text-[7px] font-black uppercase px-1.5 py-0.5 border-none rounded-md shrink-0", item.badgeClass)}>
                      {item.type}
                    </Badge>
                    <span className="font-bold text-[11px] uppercase tracking-tight text-white group-hover:text-primary transition-colors truncate">{item.title}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. MIDDLE ROW: Velocity & Friction */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* System Velocity (Span 7) */}
        <Card className="lg:col-span-7 apple-glass border-none shadow-2xl overflow-hidden h-[450px] flex flex-col">
          <CardHeader className="border-b border-white/5 pb-4 bg-white/5 px-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fleet Velocity (Missions Finalized)</CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                    dataKey="name"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    fontWeight={900}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    fontWeight={900}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderRadius: '1rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        fontSize: '9px'
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--primary))"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Friction Radar Table (Span 5) */}
        <Card className="lg:col-span-5 apple-glass border-none shadow-2xl flex flex-col h-[450px] overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4 bg-rose-500/5 shrink-0 px-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Operational Friction Radar</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/20 text-[10px] font-black uppercase text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="px-6 py-4">Personnel</th>
                  <th className="px-6 py-4 text-center">Friction Events</th>
                  <th className="px-6 py-4 text-right">Integrity Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {frictionRadar.slice(0, 10).map(staff => (
                  <tr
                    key={staff.id}
                    onClick={() => router.push(`/staff/attendance?userId=${staff.id}`)}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-black text-xs uppercase text-white group-hover:text-primary transition-colors">{staff.name}</span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                {staff.lateCount} Lates | {staff.absentCount} Absences
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                          "font-black font-mono text-base",
                          staff.frictionScore > 5 ? 'text-rose-500' : staff.frictionScore > 2 ? 'text-orange-500' : 'text-muted-foreground opacity-40'
                      )}>
                        {staff.frictionScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                          "text-[10px] font-black uppercase px-2 py-1 rounded-lg border",
                          staff.frictionScore === 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          staff.frictionScore < 4 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                        {staff.frictionScore === 0 ? 'Optimal' : staff.frictionScore < 4 ? 'Stable' : 'Flagged'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

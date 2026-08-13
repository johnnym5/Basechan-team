"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { IntelligentSummaryCenter } from "./IntelligentSummaryCenter"
import { PerformanceScoreManager } from "./PerformanceScoreManager"
import type { UserProfile, Attendance, Task, LeaveRequest, Nomination } from "@/lib/types"
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
    isAfter
} from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ChevronRight,
  ShieldAlert,
  CheckCircle,
  Activity
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

  // --- DATA ENGINE ---

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

  // 2. Action Items (Critical)
  const actionItems = useMemo(() => {
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
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [leaveRequests, tasks, activeStaffIds])

  // 3. Performance Flags
  const performanceFlagsData = useMemo(() => {
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

      const absentCount = intervalDays.filter(day => {
          if (isWeekend(day) || isAfter(day, today)) return false
          const dateStr = format(day, 'yyyy-MM-dd')
          return !staffLogs.some(l => l.date === dateStr)
      }).length

      const pendingTasks = tasks.filter(t =>
        t.assignedTo === staff.id &&
        t.status === 'AWAITING_REVIEW'
      ).length

      const issueScore = lateCount + (absentCount * 2) + pendingTasks;

      return {
          id: staff.id,
          name: staff.fullName,
          lateCount,
          absentCount,
          pendingTasks,
          issueScore
      }
    }).sort((a, b) => b.issueScore - a.issueScore)
  }, [activeStaff, attendanceLogs, tasks, timeframe])


  // --- UI RENDER ---
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-700 pb-12">

      {/* 1. TEAM OVERVIEW HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert className="w-32 h-32 text-primary" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-white font-headline">Team Dashboard</h2>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 ml-5">Team Performance Analytics & Operational Insights</p>
        </div>

        <div className="flex gap-3 relative z-10">
          <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary ml-1 opacity-50 text-right mr-2">Department</span>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px] h-12 rounded-2xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-all shadow-inner">
                    <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="apple-glass-darker border-none">
                  <SelectItem value="ALL" className="text-[10px] font-bold uppercase p-3">All Staff</SelectItem>
                  <SelectItem value="STAFF" className="text-[10px] font-bold uppercase p-3">Operations</SelectItem>
                  <SelectItem value="HR_MANAGER" className="text-[10px] font-bold uppercase p-3">HR Team</SelectItem>
                  <SelectItem value="FINANCE_MANAGER" className="text-[10px] font-bold uppercase p-3">Finance Team</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary ml-1 opacity-50 text-right mr-2">Timeframe</span>
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

      {/* 2. ANALYTICS & ACTION BENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* Analytics Rotator (Span 8) - Centerpiece */}
        <div className="lg:col-span-8 h-full">
           <IntelligentSummaryCenter
                staffList={activeStaff}
                attendanceLogs={attendanceLogs}
                tasks={tasks}
                leaveRequests={leaveRequests}
                nominations={nominations}
           />
        </div>

        {/* Action Items (Span 4) */}
        <Card className="lg:col-span-4 apple-glass border-none shadow-2xl flex flex-col h-[350px] overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4 bg-orange-500/5 shrink-0 px-8 pt-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Action Items</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2 bg-black/10">
            {actionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                  <CheckCircle className="w-10 h-10 mb-3" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-center">No Pending Actions</p>
              </div>
            ) : (
              actionItems.map(item => (
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

      {/* 3. MIDDLE ROW: Performance Scoring & Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Performance Score Manager (Span 7) */}
        <div className="lg:col-span-7 h-[450px]">
          <PerformanceScoreManager staffList={activeStaff} isAdmin={true} />
        </div>

        {/* Performance Flags Radar (Span 5) */}
        <Card className="lg:col-span-5 apple-glass border-none shadow-2xl flex flex-col h-[450px] overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4 bg-rose-500/5 shrink-0 px-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Performance Flags Radar</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/20 text-[10px] font-black uppercase text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="px-6 py-4">Team Member</th>
                  <th className="px-6 py-4 text-center">Issues</th>
                  <th className="px-6 py-4 text-right">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {performanceFlagsData.slice(0, 10).map(staff => (
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
                          staff.issueScore > 5 ? 'text-rose-500' : staff.issueScore > 2 ? 'text-orange-500' : 'text-muted-foreground opacity-40'
                      )}>
                        {staff.issueScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                          "text-[10px] font-black uppercase px-2 py-1 rounded-lg border",
                          staff.issueScore === 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          staff.issueScore < 4 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                        {staff.issueScore === 0 ? 'Excellent' : staff.issueScore < 4 ? 'Stable' : 'Flagged'}
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

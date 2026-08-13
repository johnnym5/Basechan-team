"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts"
import { IntelligentSummaryCenter } from "./IntelligentSummaryCenter"
import type { UserProfile, Attendance, Task, LeaveRequest, Nomination } from "@/lib/types"
import { startOfWeek, endOfWeek, format, eachDayOfInterval, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { TrendingUp, Info, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface MyBriefingDashboardProps {
    userProfile: UserProfile;
    attendanceLogs: Attendance[];
    tasks: Task[];
    leaveRequests: LeaveRequest[];
    staffList: UserProfile[];
    nominations?: Nomination[];
}

export function MyBriefingDashboard({
    userProfile,
    attendanceLogs = [],
    tasks = [],
    leaveRequests = [],
    staffList = [],
    nominations = []
}: MyBriefingDashboardProps) {
  const router = useRouter()

  // --- DATA ENGINE (REAL DATA ONLY) ---

  // 1. Hours & Chart Data (Derived from raw attendanceLogs)
  const weeklyHoursData = useMemo(() => {
    const now = new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const end = endOfWeek(now, { weekStartsOn: 1 })
    const daysInterval = eachDayOfInterval({ start, end }).slice(0, 5) // Mon-Fri

    return daysInterval.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const logsForDay = attendanceLogs.filter(log =>
        log.userId === userProfile.id &&
        log.date === dateStr
      )
      // Sum duration and convert to hours
      const totalSeconds = logsForDay.reduce((sum, log) => sum + (log.duration || 0), 0)
      const totalHours = Number((totalSeconds / 3600).toFixed(1))

      return {
        name: format(day, 'EEE'),
        hours: totalHours,
        fullDate: dateStr
      }
    })
  }, [attendanceLogs, userProfile.id])

  // 2. Overtime/Deficit Calculation
  const totalWeeklyHours = useMemo(() => weeklyHoursData.reduce((sum, day) => sum + day.hours, 0), [weeklyHoursData])
  const targetHours = 40; // 5 days * 8 hours
  const hoursVariance = totalWeeklyHours - targetHours;

  // 3. Task Velocity (Derived from raw tasks)
  const taskStats = useMemo(() => {
    const myTasks = tasks.filter(t => t.assignedTo === userProfile.id)
    const completed = myTasks.filter(t => t.status === 'ARCHIVED').length
    const total = myTasks.length || 1 // prevent div by 0
    return {
      completed,
      total: myTasks.length,
      velocity: Math.round((completed / total) * 100),
      actionQueue: myTasks.filter(t =>
        t.status !== 'ARCHIVED' && (t.priority === 'LEVEL_3' || t.status === 'AWAITING_REVIEW')
      )
    }
  }, [tasks, userProfile.id])

  // 4. Leave Balance (Derived from raw leaveRequests)
  const leaveStats = useMemo(() => {
    const myLeaves = leaveRequests.filter(req => req.userId === userProfile.id && req.status === 'APPROVED')
    const usedDays = myLeaves.reduce((sum, req) => sum + (req.totalDays || 0), 0)
    const totalAllowance = userProfile.leaveEntitlements?.ANNUAL || 21
    return {
        used: usedDays,
        remaining: totalAllowance - usedDays,
        percentage: totalAllowance > 0 ? (usedDays / totalAllowance) * 100 : 0
    }
  }, [leaveRequests, userProfile])


  // --- UI RENDER (Slim-Card Layout) ---
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-700">

      {/* TOP ROW: Live Insight Rotator (Full width) */}
      <div className="w-full">
        <IntelligentSummaryCenter
            staffList={staffList}
            attendanceLogs={attendanceLogs}
            tasks={tasks}
            leaveRequests={leaveRequests}
            nominations={nominations}
        />
      </div>

      {/* MIDDLE ROW: Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Weekly Burn-down Chart (Span 2/3) */}
        <Card
          onClick={() => router.push('/staff/attendance')}
          className="lg:col-span-2 bg-card border-border shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-primary/10"
        >
          <CardHeader className="border-b border-border/50 pb-4 bg-secondary/10 shrink-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Weekly Hours</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyHoursData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}
                />
                <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="3 3" />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Velocity & Variance (Span 1/3) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="bg-card border-border shadow-sm rounded-2xl p-6 relative overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Task Velocity</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-black text-primary">{taskStats.velocity}%</span>
              <span className="text-sm text-muted-foreground mb-1">{taskStats.completed} / {taskStats.total} Done</span>
            </div>
            <Progress value={taskStats.velocity} className="h-2 mt-4" />
          </Card>

          <Card className={cn(
              "border shadow-sm rounded-2xl p-6 transition-colors",
              hoursVariance < 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'
          )}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Time Variance</h3>
            <p className={cn(
                "text-2xl font-bold font-mono",
                hoursVariance < 0 ? 'text-red-500' : 'text-green-500'
            )}>
              {hoursVariance > 0 ? '+' : ''}{hoursVariance.toFixed(1)} hrs
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium opacity-60">
              {hoursVariance < 0 ? 'You are currently under your target hours.' : 'You are tracking overtime this week.'}
            </p>
          </Card>
        </div>
      </div>

      {/* BOTTOM ROW: Action & Status (1/2 each) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Action Queue */}
        <Card
          onClick={() => router.push('/tasks')}
          className="bg-card border-border shadow-sm rounded-2xl flex flex-col h-[300px] overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-primary/10"
        >
          <CardHeader className="border-b border-border/50 pb-4 bg-secondary/10 shrink-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-orange-500">Action Required</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
            {taskStats.actionQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                  <CheckCircle2 className="w-12 h-12 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No critical bottlenecks.</p>
              </div>
            ) : (
              taskStats.actionQueue.map(task => (
                <div key={task.id} className="p-3 border border-border rounded-xl flex justify-between items-start bg-background hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Due: {task.dueDate ? format(parseISO(task.dueDate), 'MMM dd') : 'No Deadline'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {task.status === 'AWAITING_REVIEW' && <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-bold">REVISION</Badge>}
                    {task.priority === 'LEVEL_3' && <Badge className="bg-orange-500 text-white border-none text-[8px] font-bold">HIGH</Badge>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Leave Allocation */}
        <Card
          onClick={() => router.push('/staff/leave')}
          className="bg-card border-border shadow-sm rounded-2xl p-6 h-[300px] flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-all hover:shadow-primary/10"
        >
           <div>
               <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Leave Allocation</h3>
               <div className="flex justify-between text-sm mb-2 font-medium">
                 <span>{leaveStats.used} Days Used</span>
                 <span className="text-primary">{leaveStats.remaining} Days Left</span>
               </div>
               <Progress value={leaveStats.percentage} className="h-3" />
           </div>

           <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mt-4">
             <div className="flex items-center gap-2 mb-2 text-primary">
                 <Info className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Operational Policy</span>
             </div>
             <p className="text-xs text-muted-foreground leading-relaxed italic">
               Ensure you submit leave requests at least 7 days in advance. Late requests may impact mission continuity.
             </p>
           </div>
        </Card>

      </div>
    </div>
  )
}

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
import { TrendingUp, Info, CheckCircle2, Zap, Clock, ListTodo, Calendar, ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { InsightEngine } from "@/lib/InsightEngine"

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

  // 2. Pace Tracker Calculation
  const totalWeeklyHours = useMemo(() => weeklyHoursData.reduce((sum, day) => sum + day.hours, 0), [weeklyHoursData])
  const targetHours = 40;

  const paceStats = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 (Sun) to 6 (Sat)
    // Map to Mon-Fri (1-5). Sat(6) and Sun(0) handled as 0 remaining.
    const remainingDays = dayOfWeek >= 1 && dayOfWeek <= 5 ? (5 - dayOfWeek + 1) : 0
    const needed = Math.max(0, targetHours - totalWeeklyHours)
    const pace = remainingDays > 0 ? (needed / remainingDays).toFixed(1) : "0.0"

    return {
      pace,
      remainingDays,
      needed: needed.toFixed(1)
    }
  }, [totalWeeklyHours])

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

  // 5. Personal Tactical Insights (NEW)
  const tacticalInsights = useMemo(() => {
    return InsightEngine.generatePersonalInsights(
        userProfile,
        attendanceLogs,
        tasks,
        leaveRequests,
        [],
        nominations
    );
  }, [userProfile, attendanceLogs, tasks, leaveRequests, nominations]);


  // --- UI RENDER (Slim-Card Layout) ---
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-700">

      <Accordion type="multiple" className="space-y-6">

        {/* SECTION 1: PERSONAL INSIGHTS */}
        <AccordionItem value="personal-insights" className="border-none">
          <Card className="apple-glass-darker border-white/5 shadow-xl rounded-[2.5rem] overflow-hidden">
            <AccordionTrigger className="hover:no-underline px-8 py-6 group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest">Personal Intelligence Brief</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">Real-time performance analytics and trend monitoring</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-0 border-t border-white/5 bg-black/10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                    <div className="lg:col-span-7">
                        <IntelligentSummaryCenter
                            staffList={staffList}
                            attendanceLogs={attendanceLogs}
                            tasks={tasks}
                            leaveRequests={leaveRequests}
                            nominations={nominations}
                        />
                    </div>
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 flex items-center">
                            <Zap className="w-3.5 h-3.5 mr-2" /> Behavioral Patterns
                        </h4>
                        <div className="space-y-2">
                            {tacticalInsights.length > 0 ? tacticalInsights.map((insight) => (
                                <div key={insight.id} className={cn(
                                    "flex items-start gap-3 p-4 rounded-2xl border transition-all text-xs font-bold leading-relaxed",
                                    insight.type === 'CRITICAL' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                    insight.type === 'WARNING' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                    insight.type === 'POSITIVE' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                    "bg-white/5 border-white/10 text-slate-300"
                                )}>
                                    {insight.type === 'POSITIVE' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> :
                                     insight.type === 'CRITICAL' ? <ShieldAlert className="w-4 h-4 mt-0.5" /> : <Info className="w-4 h-4 mt-0.5" />}
                                    <span>{insight.message}</span>
                                </div>
                            )) : (
                                <div className="py-10 text-center border border-dashed border-white/5 rounded-3xl opacity-20">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Steady Posture: No anomalies detected.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* SECTION 2: WORKLOAD & PACE */}
        <AccordionItem value="workload-pace" className="border-none">
          <Card className="apple-glass-darker border-white/5 shadow-xl rounded-[2.5rem] overflow-hidden">
            <AccordionTrigger className="hover:no-underline px-8 py-6 group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest">Operational Capacity & Pace</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">Weekly burn-down, task velocity and effort tracking</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-8 border-t border-white/5 bg-black/10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Weekly Burn-down Chart */}
                    <Card
                        onClick={() => router.push('/staff/attendance')}
                        className="lg:col-span-2 bg-card/40 border-white/5 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all group"
                    >
                        <CardHeader className="border-b border-white/5 pb-4 bg-secondary/10 shrink-0 flex flex-row justify-between items-center px-6">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Weekly Hours</CardTitle>
                            <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">Full Ledger ↗</span>
                        </CardHeader>
                        <CardContent className="p-6 h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyHoursData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                                <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                                <ReferenceLine y={8} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <Card onClick={() => router.push('/tasks')} className="bg-card/40 border-white/5 shadow-sm rounded-2xl p-6 relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Velocity</h3>
                                <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">View Tasks ↗</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-4xl font-black text-primary">{taskStats.velocity}%</span>
                                <span className="text-sm text-muted-foreground mb-1">{taskStats.completed} / {taskStats.total} Done</span>
                            </div>
                            <Progress value={taskStats.velocity} className="h-2 mt-4" />
                        </Card>

                        <Card className="bg-primary/5 border-primary/20 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Pace Tracker</h3>
                            <p className="text-2xl font-bold font-mono text-primary tracking-tighter">Target: {paceStats.pace} hrs/day</p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium opacity-60 leading-relaxed">
                                Average daily effort required to hit your weekly 40-hour goal. {paceStats.remainingDays} days remaining.
                            </p>
                        </Card>
                    </div>
                </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* SECTION 3: ACTIONS & LEAVE */}
        <AccordionItem value="actions-leave" className="border-none">
          <Card className="apple-glass-darker border-white/5 shadow-xl rounded-[2.5rem] overflow-hidden">
            <AccordionTrigger className="hover:no-underline px-8 py-6 group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform">
                        <ListTodo className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest text-orange-500">Action Queue & Benefits</span>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">Pending tasks and leave allocation balance</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-8 border-t border-white/5 bg-black/10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <Card className="bg-card/40 border-white/5 shadow-sm rounded-2xl flex flex-col h-[300px] overflow-hidden">
                        <CardHeader className="border-b border-white/5 pb-4 bg-orange-500/5 shrink-0">
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
                                <div key={task.id} onClick={() => router.push('/tasks?id=' + task.id)} className="p-3 border border-white/5 rounded-xl flex justify-between items-start bg-card/40 hover:bg-white/5 transition-all cursor-pointer group/task">
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm text-white group-hover/task:text-primary transition-colors">{task.title}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Due: {task.dueDate ? format(parseISO(task.dueDate), 'MMM dd') : 'No Deadline'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {task.status === 'AWAITING_REVIEW' && <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-black">REVISION</Badge>}
                                        {task.priority === 'LEVEL_3' && <Badge className="bg-rose-500 text-white border-none text-[8px] font-black">CRITICAL</Badge>}
                                    </div>
                                </div>
                            ))
                            )}
                        </CardContent>
                    </Card>

                    <Card onClick={() => router.push('/leave')} className="bg-card/40 border-white/5 shadow-sm rounded-2xl p-6 h-[300px] flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-all group">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leave Allocation</h3>
                                <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">Request Leave ↗</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2 font-medium">
                                <span className="text-white font-bold">{leaveStats.used} Days Used</span>
                                <span className="text-primary font-bold">{leaveStats.remaining} Days Left</span>
                            </div>
                            <Progress value={leaveStats.percentage} className="h-3 bg-white/5" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-3">Authorized Cycle Valid through Dec 31, {new Date().getFullYear()}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mt-4">
                            <div className="flex items-center gap-2 mb-2 text-primary">
                                <Info className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Policy Override</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">Ensure you submit leave requests at least 7 days in advance. Late requests may impact mission continuity.</p>
                        </div>
                    </Card>
                </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

      </Accordion>
    </div>
  )
}

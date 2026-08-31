"use client"
import React, { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserProfile, Attendance, Task } from "@/lib/types"
import { Clock, AlertCircle, TrendingUp, ArrowRight, Activity, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { type ViewScope } from "@/components/shared/DateScopePicker"
import { parseISO, startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay, addDays } from "date-fns"

interface StrategicTrendsViewProps {
  staffList: UserProfile[];
  attendanceLogs: Attendance[];
  tasks: Task[];
  timeFilter?: { mode: ViewScope, referenceDate: Date };
}

export function StrategicTrendsView({ staffList, attendanceLogs, tasks, timeFilter }: StrategicTrendsViewProps) {
  const router = useRouter()
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

  // 1. STRICT DATE FILTERING based on the calendar state
  const timeFilteredLogs = useMemo(() => {
    if (!timeFilter) return attendanceLogs

    let start: Date
    let end: Date

    if (timeFilter.mode === 'DAY') {
        start = startOfDay(timeFilter.referenceDate)
        end = endOfDay(timeFilter.referenceDate)
    } else if (timeFilter.mode === 'WEEK') {
        start = startOfWeek(timeFilter.referenceDate, { weekStartsOn: 1 })
        end = endOfWeek(timeFilter.referenceDate, { weekStartsOn: 1 })
    } else {
        start = startOfMonth(timeFilter.referenceDate)
        end = endOfMonth(timeFilter.referenceDate)
    }

    const interval = { start, end }

    return attendanceLogs.filter(log => {
      const logDate = parseISO(log.date)
      return isWithinInterval(logDate, interval)
    })
  }, [attendanceLogs, timeFilter])

  // 2. TREND DATA AGGREGATION (Daily timeline)
  const trendData = useMemo(() => {
    if (!timeFilter) return []

    let days: Date[]
    if (timeFilter.mode === 'DAY') {
        days = [timeFilter.referenceDate]
    } else if (timeFilter.mode === 'WEEK') {
        const weekStart = startOfWeek(timeFilter.referenceDate, { weekStartsOn: 1 })
        days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
    } else {
        days = eachDayOfInterval({
            start: startOfMonth(timeFilter.referenceDate),
            end: endOfMonth(timeFilter.referenceDate)
        })
    }

    return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayLogs = timeFilteredLogs.filter(l => l.date === dateStr)

        return {
            day: format(day, 'EEE dd'),
            fullDate: dateStr,
            onTime: dayLogs.filter(l => l.status === 'APPROVED' && !l.remarks?.includes('LATE')).length,
            late: dayLogs.filter(l => l.remarks?.includes('LATE')).length,
            absent: 0
        }
    })
  }, [timeFilteredLogs, timeFilter])

  // 3. PERSONNEL DISTRIBUTION ENGINE
  const teamData = useMemo(() => {
    return staffList.map(staff => {
      const userLogs = timeFilteredLogs.filter(log => log.userId === staff.id)
      const onTime = userLogs.filter(l => l.status === 'APPROVED' && !l.remarks?.includes('LATE')).length
      const late = userLogs.filter(l => l.remarks?.includes('LATE')).length

      const tasksDone = tasks.filter(t => t.assignedTo === staff.id && t.status === 'ARCHIVED').length

      return {
        id: staff.id,
        name: staff.fullName,
        onTime,
        late,
        absent: 0,
        tasksDone,
        total: userLogs.length
      }
    }).sort((a, b) => b.total - a.total)
  }, [staffList, timeFilteredLogs, tasks])

  const selectedStaffData = useMemo(() => {
    return teamData.find(s => s.id === selectedStaffId)
  }, [teamData, selectedStaffId])

  const COLORS = {
    onTime: '#10b981', // emerald-500
    late: '#f59e0b',   // amber-500
    absent: '#ef4444', // red-500
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* 1. ACTUAL STRATEGIC TREND CHART */}
      <Card className="apple-glass border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-white/5 pb-4">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <Activity className="w-4 h-4" /> Operational Punctuality Trend (Over Time)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 p-6">
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                        <defs>
                            <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="day"
                            tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 'bold'}}
                            stroke="rgba(255,255,255,0.1)"
                        />
                        <YAxis
                            tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)'}}
                            stroke="rgba(255,255,255,0.1)"
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: 'rgba(13, 13, 13, 0.95)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 'bold'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="onTime"
                            name="On Time"
                            stroke="#10b981"
                            fill="url(#colorOnTime)"
                            strokeWidth={3}
                            isAnimationActive={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="late"
                            name="Late/Absent"
                            stroke="#ef4444"
                            fill="url(#colorLate)"
                            strokeWidth={3}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      {/* 2. INDIVIDUAL VOLUME MATRIX (Stacked Bar) */}
      <Card className="apple-glass border-white/5 shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-white/5 pb-4">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Individual Volume Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="h-[450px] w-full cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={teamData}
                margin={{ top: 20, right: 30, left: 40, bottom: 100 }}
                onClick={(data) => {
                  if (data && data.activePayload) {
                    setSelectedStaffId(data.activePayload[0].payload.id)
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                    dataKey="name"
                    tick={{fontSize: 9, fill: 'rgba(255,255,255,0.5)', fontWeight: 'bold'}}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    stroke="rgba(255,255,255,0.1)"
                />
                <YAxis
                    tick={{fontSize: 10, fill: 'rgba(255,255,255,0.5)'}}
                    stroke="rgba(255,255,255,0.1)"
                />
                <RechartsTooltip
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{
                        backgroundColor: 'rgba(13, 13, 13, 0.9)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                    }}
                />

                <Bar dataKey="onTime" name="On Time" stackId="a" fill={COLORS.onTime} radius={[0, 0, 4, 4]} isAnimationActive={false} />
                <Bar dataKey="late" name="Late" stackId="a" fill={COLORS.late} isAnimationActive={false} />
                <Bar dataKey="absent" name="Absent" stackId="a" fill={COLORS.absent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">On Time</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"/> <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Late Arrival</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"/> <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Absent</span></div>
          </div>
        </CardContent>
      </Card>

      {/* INDIVIDUAL DEEP DIVE DRILL-DOWN (SIDE SHEET) */}
      <Sheet open={!!selectedStaffId} onOpenChange={(isOpen) => !isOpen && setSelectedStaffId(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] apple-glass-darker border-l border-white/5 p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-8 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shadow-inner border border-primary/20">
                        {selectedStaffData?.name.charAt(0)}
                    </div>
                    <div className="flex flex-col items-start">
                        <SheetTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white leading-none mb-1">
                            {selectedStaffData?.name}
                        </SheetTitle>
                        <SheetDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                            Personnel Matrix Deep-Dive
                        </SheetDescription>
                    </div>
                </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {selectedStaffData && (
                    <div className="flex flex-col gap-10">

                        {/* THE PIE CHART */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 border-b border-white/5 pb-2">
                                <Clock className="w-3.5 h-3.5" /> Punctuality Breakdown
                            </h4>
                            <div className="h-[280px] w-full flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/5 p-6 shadow-inner">
                                <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                    data={[
                                        { name: 'On Time', value: selectedStaffData.onTime, color: COLORS.onTime },
                                        { name: 'Late', value: selectedStaffData.late, color: COLORS.late },
                                        { name: 'Absent', value: selectedStaffData.absent, color: COLORS.absent },
                                    ].filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="transparent"
                                    >
                                    {
                                        [{ name: 'On Time', value: selectedStaffData.onTime, color: COLORS.onTime },
                                        { name: 'Late', value: selectedStaffData.late, color: COLORS.late },
                                        { name: 'Absent', value: selectedStaffData.absent, color: COLORS.absent }].filter(d => d.value > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))
                                    }
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(0,0,0,0.8)',
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            fontSize: '10px',
                                            fontWeight: 'bold'
                                        }}
                                    />
                                </PieChart>
                                </ResponsiveContainer>

                                <div className="flex flex-wrap justify-center gap-4 text-[9px] uppercase font-black tracking-widest mt-4">
                                    <span className="flex items-center gap-1.5 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500"/> {selectedStaffData.onTime} On Time</span>
                                    <span className="flex items-center gap-1.5 text-amber-500"><div className="w-2 h-2 rounded-full bg-amber-500"/> {selectedStaffData.late} Late</span>
                                    <span className="flex items-center gap-1.5 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500"/> {selectedStaffData.absent} Absent</span>
                                </div>
                            </div>
                        </div>

                        {/* PRODUCTIVITY METRICS */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 border-b border-white/5 pb-2">
                                <TrendingUp className="w-3.5 h-3.5" /> Mission Velocity
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col gap-1">
                                    <span className="text-3xl font-black text-white">{selectedStaffData.tasksDone}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Missions Completed</span>
                                </div>
                                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1">
                                    <span className="text-3xl font-black text-white">{Math.round((selectedStaffData.onTime / (selectedStaffData.total || 1)) * 100)}%</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Reliability Index</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-secondary/20 border border-white/5 space-y-3 shadow-inner">
                            <h5 className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" /> Operational Intelligence
                            </h5>
                            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic opacity-80">
                                This personnel has maintained a {(selectedStaffData.onTime / (selectedStaffData.total || 1) * 100) > 80 ? "high-fidelity" : "variable"} attendance posture.
                                Task throughput is currently at {selectedStaffData.tasksDone} units for this operational cycle.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 bg-white/5 border-t border-white/5 mt-auto">
                <Button
                    className="w-full h-12 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                    onClick={() => router.push(`/staff/profile?id=${selectedStaffId}`)}
                >
                    Detailed 360 Dossier <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}

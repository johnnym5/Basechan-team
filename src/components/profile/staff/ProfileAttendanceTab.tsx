"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle, CheckCircle2, FileText, Activity, Timer, CalendarDays, ArrowRight } from "lucide-react"
import { format, isSameDay, parseISO, startOfWeek, endOfWeek, subDays, isWithinInterval, startOfDay, endOfDay, isWeekend } from "date-fns"
import type { Attendance, DailyReport } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ProfileAttendanceTabProps {
  staffId: string;
  attendanceLogs: Attendance[];
  reportsData: DailyReport[];
}

export function ProfileAttendanceTab({ staffId, attendanceLogs = [], reportsData = [] }: ProfileAttendanceTabProps) {
  const [timeFilter, setTimeFilter] = useState<"WEEK" | "MONTH">("MONTH")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // --- DATA ENGINE: Calculate Filtered Stats ---
  const stats = useMemo(() => {
    const now = new Date()
    let startDate: Date;

    if (timeFilter === 'WEEK') {
      startDate = startOfWeek(now, { weekStartsOn: 1 })
    } else {
      // MONTH
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const interval = { start: startOfDay(startDate), end: endOfDay(now) }

    const filteredLogs = attendanceLogs.filter(log => {
        const logDate = parseISO(log.date + 'T00:00:00')
        return isWithinInterval(logDate, interval) && !isWeekend(logDate)
    })

    if (filteredLogs.length === 0) {
      return {
        avgClockIn: "--:--",
        avgClockInStatus: "neutral",
        avgTotalTime: "0.0h",
        avgTotalTimeStatus: "neutral",
        earliestClockIn: "--:--",
        avgClockOut: "--:--",
        timesLate: 0,
        daysMissed: 0
      }
    }

    // Calculations
    let totalClockInSeconds = 0
    let totalDurationSeconds = 0
    let totalClockOutSeconds = 0
    let earliestSecs = 24 * 3600
    let timesLate = 0

    filteredLogs.forEach(log => {
      const clockInDate = new Date(log.clockIn)
      const ciSecs = clockInDate.getHours() * 3600 + clockInDate.getMinutes() * 60 + clockInDate.getSeconds()
      totalClockInSeconds += ciSecs
      if (ciSecs < earliestSecs) earliestSecs = ciSecs

      if (log.clockOut) {
          const clockOutDate = new Date(log.clockOut)
          totalClockOutSeconds += clockOutDate.getHours() * 3600 + clockOutDate.getMinutes() * 60 + clockOutDate.getSeconds()
      }

      totalDurationSeconds += (log.duration || 0)
      if (log.remarks?.includes('LATE')) timesLate++
    })

    const avgCiSecs = totalClockInSeconds / filteredLogs.length
    const avgClockIn = format(new Date().setHours(0, 0, avgCiSecs), 'hh:mm a')
    const avgClockInStatus = avgCiSecs <= (9 * 3600) ? 'success' : 'danger' // 09:00 threshold

    const avgDurationHrs = (totalDurationSeconds / 3600) / filteredLogs.length
    const avgTotalTime = `${avgDurationHrs.toFixed(1)}h`
    const avgTotalTimeStatus = avgDurationHrs >= 8 ? 'success' : 'warning'

    const earliestClockIn = format(new Date().setHours(0, 0, earliestSecs), 'hh:mm a')

    const avgCoSecs = totalClockOutSeconds / filteredLogs.filter(l => l.clockOut).length || 0
    const avgClockOut = avgCoSecs > 0 ? format(new Date().setHours(0, 0, avgCoSecs), 'hh:mm a') : '--:--'

    // Mock days missed for now - ideally compare against expected schedule
    const daysMissed = 0

    return {
      avgClockIn,
      avgClockInStatus,
      avgTotalTime,
      avgTotalTimeStatus,
      earliestClockIn,
      avgClockOut,
      timesLate,
      daysMissed
    }
  }, [attendanceLogs, timeFilter])

  // --- GET DAILY REPORT FOR SELECTED DATE ---
  const dailyData = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const log = attendanceLogs.find(l => l.date === dateStr)
    const report = reportsData.find(r => r.reportDate === dateStr)

    return { log, report }
  }, [selectedDate, attendanceLogs, reportsData])

  return (
    <div className="space-y-6 animate-in fade-in">

      {/* FILTER & TOP STATS ROW */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-60">Performance Metrics</h3>
          <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
            <SelectTrigger className="w-[180px] bg-background border-border rounded-xl font-black uppercase text-[10px] tracking-widest">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent className="apple-glass-darker border-none">
              <SelectItem value="WEEK" className="font-bold text-xs uppercase p-3">This Week</SelectItem>
              <SelectItem value="MONTH" className="font-bold text-xs uppercase p-3">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Avg Clock-In" value={stats.avgClockIn} status={stats.avgClockInStatus as any} />
          <StatCard title="Avg Total Time" value={stats.avgTotalTime} status={stats.avgTotalTimeStatus as any} />
          <StatCard title="Earliest Arrival" value={stats.earliestClockIn} status="success" />
          <StatCard title="Avg Clock-Out" value={stats.avgClockOut} status="neutral" />
          <StatCard title="Times Late" value={stats.timesLate.toString()} status={stats.timesLate > 0 ? 'danger' : 'success'} />
          <StatCard title="Days Missed" value={stats.daysMissed.toString()} status={stats.daysMissed > 0 ? 'danger' : 'success'} />
        </div>
      </div>

      {/* CALENDAR & DAILY SUMMARY SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Calendar (Span 4) */}
        <Card className="lg:col-span-4 apple-glass rounded-[2rem] border-border/50 bg-card/40 overflow-hidden">
           <CardContent className="p-4 flex justify-center">
             <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full"
              />
           </CardContent>
        </Card>

        {/* Right: Daily Summary & Report (Span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <h3 className="text-sm font-black uppercase tracking-tighter text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {selectedDate ? format(selectedDate, 'EEEE, MMMM dd, yyyy') : 'Select a date'}
          </h3>

          {!dailyData?.log ? (
            <div className="p-16 border border-dashed border-border rounded-[2.5rem] bg-secondary/20 text-center text-muted-foreground flex flex-col items-center opacity-40">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-black uppercase text-xs tracking-widest">No attendance records identified</p>
            </div>
          ) : (
            <Accordion type="single" collapsible defaultValue="daily-summary" className="w-full space-y-4">
              <AccordionItem value="daily-summary" className="border border-border/50 bg-card/40 rounded-[2rem] px-6 overflow-hidden shadow-sm">
                <AccordionTrigger className="hover:no-underline py-6 group">
                  <div className="flex items-center gap-4 w-full">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform"><Activity className="w-5 h-5" /></div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-black uppercase tracking-widest">Daily Operational Summary</span>
                      <span className="text-[10px] font-bold text-muted-foreground opacity-60">
                        {dailyData.log.clockIn ? format(new Date(dailyData.log.clockIn), 'HH:mm') : '--:--'} - {dailyData.log.clockOut ? format(new Date(dailyData.log.clockOut), 'HH:mm') : 'ACTIVE'}
                      </span>
                    </div>
                    {dailyData.log.status && (
                        <Badge variant="outline" className="ml-auto border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest mr-4">
                            {dailyData.log.status}
                        </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8 pt-2 space-y-8 border-t border-border/50 mt-2">

                  {/* Timestamps */}
                  <div className="grid grid-cols-3 gap-6 p-6 bg-secondary/30 rounded-3xl border border-white/5 shadow-inner">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground opacity-40">Clock In</p>
                      <p className="font-mono font-black text-lg text-emerald-500">{dailyData.log.clockIn ? format(new Date(dailyData.log.clockIn), 'hh:mm a') : '--:--'}</p>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground opacity-40">Clock Out</p>
                      <p className="font-mono font-black text-lg text-rose-500">{dailyData.log.clockOut ? format(new Date(dailyData.log.clockOut), 'hh:mm a') : '--:--'}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground opacity-40">Inactive Time</p>
                      <p className="font-mono font-black text-lg text-amber-500">{(dailyData.log.idleTime ? dailyData.log.idleTime / 3600 : 0).toFixed(1)}h</p>
                    </div>
                  </div>

                  {/* Embedded Daily Report */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2 px-1">
                      <FileText className="w-4 h-4 text-primary" /> End of Day report justifiction
                    </h4>
                    {dailyData.report ? (
                      <div className="space-y-4">
                         <div className="p-6 bg-background/60 border border-border/50 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-sm italic">
                            {dailyData.report.content || dailyData.report.accomplishments}
                         </div>

                         {(dailyData.report.blockers || dailyData.report.nextFocus) && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {dailyData.report.blockers && (
                                    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                                        <p className="text-[8px] font-black uppercase text-rose-500 tracking-widest mb-2">Operational Blockers</p>
                                        <p className="text-xs font-medium text-foreground/80">{dailyData.report.blockers}</p>
                                    </div>
                                )}
                                {dailyData.report.nextFocus && (
                                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                                        <p className="text-[8px] font-black uppercase text-primary tracking-widest mb-2">Next Cycle Focus</p>
                                        <p className="text-xs font-medium text-foreground/80">{dailyData.report.nextFocus}</p>
                                    </div>
                                )}
                             </div>
                         )}
                      </div>
                    ) : (
                      <div className="p-8 bg-background/20 border border-dashed border-border rounded-3xl text-xs font-bold text-muted-foreground italic text-center opacity-40">
                        No official Daily Report found for this operational cycle.
                      </div>
                    )}
                  </div>

                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper Sub-component for Stats
function StatCard({ title, value, status }: { title: string, value: string, status: 'success' | 'danger' | 'warning' | 'neutral' }) {
  const colors = {
    success: "text-emerald-500",
    danger: "text-rose-500",
    warning: "text-amber-500",
    neutral: "text-foreground"
  }

  return (
    <Card className="apple-glass-darker border-border/50 shadow-sm p-5 flex flex-col justify-center items-start bg-card/40 m3-interactive">
      <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground opacity-50 mb-2">{title}</p>
      <p className={cn("text-xl font-black font-headline tracking-tighter", colors[status])}>{value}</p>
    </Card>
  )
}

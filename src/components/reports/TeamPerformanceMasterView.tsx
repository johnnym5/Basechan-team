"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Trophy, HeartPulse, Award, Users, TrendingUp, Zap, ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, CheckCircle2, FileText } from "lucide-react"
import type { UserProfile, Attendance, Task, Nomination, PulseCheck } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, parseISO, startOfDay, endOfDay, subDays, isWithinInterval } from "date-fns"
import { Button } from "@/components/ui/button"
import { StaffActionMenu } from "@/components/shared/StaffActionMenu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"

interface TeamPerformanceMasterViewProps {
    staffList: UserProfile[];
    attendanceLogs: Attendance[];
    tasks: Task[];
    nominations: Nomination[];
    pulseFeed: PulseCheck[];
}

export function TeamPerformanceMasterView({
    staffList = [],
    attendanceLogs = [],
    tasks = [],
    nominations = [],
    pulseFeed = []
}: TeamPerformanceMasterViewProps) {
  const [timeFilter, setTimeFilter] = useState<"WEEK" | "MONTH">("WEEK")
  const [selectedStaffId, setSelectedStaffId] = useState("ALL")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // --- DATA ENGINE ---
  const lookbackDays = timeFilter === 'MONTH' ? 30 : 7
  const now = new Date()
  const filterInterval = { start: startOfDay(subDays(now, lookbackDays)), end: endOfDay(now) }

  const analytics = useMemo(() => {
    const periodPulses = pulseFeed.filter(p => isWithinInterval(parseISO(p.timestamp), filterInterval))
    const periodLogs = attendanceLogs.filter(l => isWithinInterval(parseISO(l.clockIn), filterInterval))

    const staffStats = staffList.map(staff => {
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

    return {
      overwhelmed: staffStats.filter(s => s.overwhelmedCount >= 2).sort((a, b) => b.overwhelmedCount - a.overwhelmedCount),
      thriving: staffStats.filter(s => s.isThriving).sort((a, b) => b.smoothCount - a.smoothCount),
      recentEODs: periodLogs.filter(l => l.eodReport).sort((a, b) => b.clockIn.localeCompare(a.clockIn)).slice(0, 10)
    }
  }, [pulseFeed, attendanceLogs, staffList, timeFilter])

  const selectedStaffLogs = useMemo(() => {
    if (selectedStaffId === 'ALL') return []
    return attendanceLogs.filter(l => l.userId === selectedStaffId)
  }, [attendanceLogs, selectedStaffId])

  const selectedDayData = useMemo(() => {
    if (!selectedDate || selectedStaffId === 'ALL') return null
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const log = selectedStaffLogs.find(l => l.date === dateStr)
    const pulse = pulseFeed.find(p => p.userId === selectedStaffId && p.date === dateStr)
    return { log, pulse }
  }, [selectedDate, selectedStaffLogs, pulseFeed, selectedStaffId])

  // Custom modifiers for calendar
  const modifiers = useMemo(() => {
    const overwhelmed: Date[] = []
    const heavy: Date[] = []
    const smooth: Date[] = []

    selectedStaffLogs.forEach(log => {
      const pulse = pulseFeed.find(p => p.userId === selectedStaffId && p.date === log.date)
      const date = parseISO(log.date)
      if (pulse?.mood === 'OVERWHELMED') overwhelmed.push(date)
      else if (pulse?.mood === 'HEAVY') heavy.push(date)
      else if (pulse?.mood === 'SMOOTH') smooth.push(date)
    })

    return { overwhelmed, heavy, smooth }
  }, [selectedStaffLogs, pulseFeed, selectedStaffId])

  const modifierStyles = {
    overwhelmed: { color: 'white', backgroundColor: '#ef4444' },
    heavy: { color: 'white', backgroundColor: '#f97316' },
    smooth: { color: 'white', backgroundColor: '#10b981' }
  }

  const staffRankings = useMemo(() => {
    return staffList
      .filter(s => !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role))
      .map(staff => {
        const tasksDone = tasks.filter(t => t.assignedTo === staff.id && t.status === 'ARCHIVED').length
        const kudos = nominations.filter(n => n.nomineeId === staff.id).length
        const att = attendanceLogs.filter(l => l.userId === staff.id)

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
  }, [staffList, tasks, nominations, attendanceLogs])

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-700 overflow-x-hidden">

      {/* 1. GLOBAL CONTROLS & PULSE HUB */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-center bg-card/40 backdrop-blur-xl p-4 md:p-6 rounded-[1.5rem] border border-white/5 shadow-2xl gap-4">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white font-headline flex items-center gap-3">
                <HeartPulse className="w-5 h-5 text-rose-500 animate-pulse" />
                Organizational Health
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
                    <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="apple-glass-darker border-none">
                        <SelectItem value="WEEK" className="text-[10px] font-bold uppercase p-3">This Week</SelectItem>
                        <SelectItem value="MONTH" className="text-[10px] font-bold uppercase p-3">This Month</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest">
                        <SelectValue placeholder="Company Overview" />
                    </SelectTrigger>
                    <SelectContent className="apple-glass-darker border-none">
                        <SelectItem value="ALL" className="text-[10px] font-bold uppercase p-3">Company Overview</SelectItem>
                        {staffList.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase p-3">{s.fullName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {selectedStaffId === "ALL" ? (
            <div className="space-y-6">
                {/* Pulse Extremes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-rose-500/20 bg-rose-500/5 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="border-b border-rose-500/10 pb-4 shrink-0 px-8 pt-6">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4"/> Burnout Watchlist
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {analytics.overwhelmed.length === 0 ? (
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 text-center py-8 italic">No staff reporting high stress this {timeFilter.toLowerCase()}.</p>
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

                {/* Live EOD Feed */}
                <Card className="apple-glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-white/5 px-8 pt-6">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary"/> Tactical Intelligence Feed (Recent EODs)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
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
                                        <p className="text-xs font-medium text-muted-foreground leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
                                            "{log.eodReport}"
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                <Card className="lg:col-span-4 apple-glass border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col items-center p-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Pulse Calendar</h3>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        modifiers={modifiers}
                        modifiersStyles={modifierStyles}
                        className="rounded-2xl border border-white/5 bg-background shadow-xl scale-95"
                    />
                    <div className="flex gap-4 mt-6 justify-center w-full">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[7px] font-black uppercase opacity-60">Smooth</span></div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-[7px] font-black uppercase opacity-60">Heavy</span></div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[7px] font-black uppercase opacity-60">Overwhelmed</span></div>
                    </div>
                </Card>

                <Card className="lg:col-span-8 apple-glass border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-white/5 p-8 bg-white/5">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase">
                                    Deep Dive: {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'No Selection'}
                                </CardTitle>
                                <CardDescription className="text-[9px] font-black uppercase tracking-widest opacity-60">Personnel Performance & Emotional Telemetry</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 flex-1 flex flex-col justify-center">
                        {!selectedDayData?.log && !selectedDayData?.pulse ? (
                            <div className="flex flex-col items-center justify-center opacity-20 py-20">
                                <Activity className="w-12 h-12 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No Intelligence Logs for this day</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-primary tracking-widest">Shift Pulse</p>
                                        <Badge className={cn(
                                            "text-lg font-black font-headline px-4 py-1 border-none",
                                            selectedDayData.pulse?.mood === 'SMOOTH' ? "bg-emerald-500" :
                                            selectedDayData.pulse?.mood === 'HEAVY' ? "bg-amber-500" : "bg-rose-500"
                                        )}>
                                            {selectedDayData.pulse?.mood || 'NOT LOGGED'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-primary tracking-widest">Total Duty Time</p>
                                        <p className="text-3xl font-black font-headline tracking-tighter">
                                            {selectedDayData.log?.duration ? (selectedDayData.log.duration / 3600).toFixed(2) : '0.00'} <span className="text-xs opacity-30">HRS</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Personnel Memo
                                    </p>
                                    <div className="p-6 rounded-2xl bg-black/30 border border-white/5 min-h-[150px]">
                                        <p className="text-sm font-medium leading-relaxed italic opacity-90">
                                            {selectedDayData.log?.eodReport ? `"${selectedDayData.log.eodReport}"` : "No EOD Report was submitted for this operational cycle."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}
      </div>

      {/* 2. MAIN BENTO GRID (LEADERBOARD) */}

      {/* 2. MAIN BENTO GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: THE LEADERBOARD (Span 7) */}
        <Card className="xl:col-span-7 apple-glass border-none shadow-2xl flex flex-col h-auto md:h-[700px] min-h-[400px] overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4 md:pb-6 shrink-0 bg-white/5 px-4 md:px-6">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-lg md:text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2">
                        <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Performance Leaderboard
                    </CardTitle>
                    <CardDescription className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60">Composite ranking: Tasks, Punctuality & Feedback</CardDescription>
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[8px] font-black tracking-widest">LIVE DATA</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 overflow-x-auto w-full">
            <table className="w-full text-sm text-left border-collapse min-w-[600px]">
              <thead className="bg-secondary/20 text-[10px] font-black uppercase text-muted-foreground sticky top-0 backdrop-blur-md z-20">
                <tr>
                  <th className="px-6 py-4">Team Member</th>
                  <th className="px-6 py-4 text-center">Efficiency</th>
                  <th className="px-6 py-4 text-center">Awards</th>
                  <th className="px-6 py-4 text-right">Performance</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staffRankings.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="py-20 text-center opacity-30 italic text-sm font-bold uppercase tracking-widest">Awaiting performance data...</td>
                    </tr>
                ) : staffRankings.map((staff, idx) => (
                  <tr key={staff.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-5 flex items-center gap-4 min-w-[200px]">
                      <span className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-inner shrink-0",
                          idx === 0 ? "bg-amber-500 text-black scale-110" :
                          idx === 1 ? "bg-slate-400 text-black" :
                          idx === 2 ? "bg-orange-600 text-black" :
                          "bg-secondary/50 text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-black text-sm uppercase tracking-tight text-white truncate">{staff.name}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">{staff.tasksDone} Tasks Completed</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                            <span className="font-black font-mono text-emerald-400">{staff.efficiency}%</span>
                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${staff.efficiency}%` }} />
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[9px] px-3">{staff.kudos} AWARDS</Badge>
                    </td>
                    <td className="px-6 py-5 text-right">
                        <span className="font-black font-headline text-2xl text-white group-hover:scale-110 transition-transform inline-block">{staff.totalScore}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                        <StaffActionMenu
                            staff={{ id: staff.id, name: staff.name, status: staff.status, isArchived: staff.isArchived }}
                            currentLog={staff.currentLog}
                        />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: RECOGNITION (Span 5) */}
        <div className="xl:col-span-5 flex flex-col gap-6 h-auto xl:h-[700px]">

          {/* RECOGNITION HUB */}
          <Card className="apple-glass border-none shadow-2xl flex flex-col flex-1 overflow-hidden min-h-[300px]">
            <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-white/5 px-4 md:px-6 pt-5">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                <Award className="w-4 h-4" /> Staff Recognition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-black/10">
               {nominations.length === 0 ? (
                   <div className="py-12 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest">No active awards.</div>
               ) : nominations.map(award => (
                 <div key={award.id} className="p-3 md:p-4 rounded-2xl border border-white/5 bg-card/40 hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{award.categoryTitle}</p>
                        <span className="text-[8px] font-bold text-muted-foreground/40 uppercase shrink-0">{format(new Date(award.timestamp), 'MMM dd')}</span>
                    </div>
                   <p className="text-xs font-bold leading-relaxed text-white break-words">"{award.reason}"</p>
                   <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                        <Users className="w-3 h-3 text-muted-foreground opacity-40 shrink-0" />
                        <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground truncate">
                            To: <span className="text-white">{award.nomineeName}</span>
                            <span className="mx-2 opacity-20">|</span>
                            From: <span className="text-white/60">{award.nominatorName}</span>
                        </p>
                   </div>
                 </div>
               ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}

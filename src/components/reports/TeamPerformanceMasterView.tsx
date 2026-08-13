"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Trophy, HeartPulse, Award, Users, TrendingUp, Zap, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import type { UserProfile, Attendance, Task, Nomination, PulseCheck } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"

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

  const [pulseDateIndex, setPulseDateIndex] = useState(0)

  // --- DATA ENGINE (REAL DATA DERIVATIONS) ---

  const groupedPulses = useMemo(() => {
    const groups: Record<string, PulseCheck[]> = {}
    pulseFeed.forEach(pulse => {
        if (!groups[pulse.date]) groups[pulse.date] = []
        groups[pulse.date].push(pulse)
    })
    // Sort dates descending
    return Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map(date => ({ date, pulses: groups[date] }))
  }, [pulseFeed])

  const currentPulseDay = groupedPulses[pulseDateIndex]

  const moodStats = useMemo(() => {
    const highRisk = pulseFeed.filter(p => p.mood === 'OVERWHELMED' || p.mood === 'HEAVY').length
    const optimal = pulseFeed.filter(p => p.mood === 'SMOOTH').length
    return { highRisk, optimal }
  }, [pulseFeed])

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
          totalScore
        }
      })
      .sort((a, b) => b.totalScore - a.totalScore)
  }, [staffList, tasks, nominations, attendanceLogs])

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full animate-in fade-in zoom-in-95 duration-700 overflow-x-hidden">

      {/* 1. TOP KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
         <Card className="apple-glass border-none shadow-xl p-4 md:p-6 flex items-center justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-45 transition-transform">
                <Zap className="w-12 h-12 md:w-16 md:h-16 text-emerald-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Optimal Flow</h3>
              <p className="text-2xl md:text-3xl font-black font-headline text-emerald-500">{moodStats.optimal}</p>
            </div>
            <Activity className="w-8 h-8 md:w-10 md:h-10 text-emerald-500/20 relative z-10" />
         </Card>

         <Card className="apple-glass border-none shadow-xl p-4 md:p-6 flex items-center justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-45 transition-transform">
                <HeartPulse className="w-12 h-12 md:w-16 md:h-16 text-orange-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Risk Threshold</h3>
              <p className="text-2xl md:text-3xl font-black font-headline text-orange-500">{moodStats.highRisk}</p>
            </div>
            <HeartPulse className="w-8 h-8 md:w-10 md:h-10 text-orange-500/20 relative z-10" />
         </Card>

         <Card className="apple-glass border-none shadow-xl p-4 md:p-6 flex items-center justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-45 transition-transform">
                <Award className="w-12 h-12 md:w-16 md:h-16 text-primary" />
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Recognition</h3>
              <p className="text-2xl md:text-3xl font-black font-headline text-primary">{nominations.length}</p>
            </div>
            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-primary/20 relative z-10" />
         </Card>
      </div>

      {/* 2. MAIN BENTO GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: THE LEADERBOARD (Span 7) */}
        <Card className="xl:col-span-7 apple-glass border-none shadow-2xl flex flex-col h-auto md:h-[700px] min-h-[400px] overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4 md:pb-6 shrink-0 bg-white/5 px-4 md:px-6">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-lg md:text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2">
                        <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Force Leaderboard
                    </CardTitle>
                    <CardDescription className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60">Composite ranking: Tasks, Punctuality & Peer Feedback</CardDescription>
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[8px] font-black tracking-widest">LIVE DATA</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 overflow-x-auto w-full">
            <table className="w-full text-sm text-left border-collapse min-w-[600px]">
              <thead className="bg-secondary/20 text-[10px] font-black uppercase text-muted-foreground sticky top-0 backdrop-blur-md z-20">
                <tr>
                  <th className="px-6 py-4">Node & Operator</th>
                  <th className="px-6 py-4 text-center">Efficiency</th>
                  <th className="px-6 py-4 text-center">Kudos</th>
                  <th className="px-6 py-4 text-right">Integrity Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staffRankings.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="py-20 text-center opacity-30 italic text-sm font-bold uppercase tracking-widest">Awaiting tactical data...</td>
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
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">{staff.tasksDone} Missions Finalized</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: HEALTH & RECOGNITION (Span 5) */}
        <div className="xl:col-span-5 flex flex-col gap-6 h-auto xl:h-[700px]">

          {/* TOP RIGHT: TEAM HEALTH */}
          <Card className="apple-glass border-none shadow-2xl flex flex-col flex-1 overflow-hidden min-h-[300px]">
            <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-white/5 px-4 md:px-6 pt-5">
              <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-orange-500" /> Organizational Pulse
                  </CardTitle>

                  {groupedPulses.length > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md hover:bg-white/10"
                            disabled={pulseDateIndex >= groupedPulses.length - 1}
                            onClick={() => setPulseDateIndex(prev => prev + 1)}
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <div className="flex flex-col items-center min-w-[70px]">
                            <span className="text-[8px] font-black uppercase opacity-40">Tactical Day</span>
                            <span className="text-[10px] font-black uppercase tracking-tight text-white">
                                {currentPulseDay ? format(parseISO(currentPulseDay.date), 'MMM dd') : '---'}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md hover:bg-white/10"
                            disabled={pulseDateIndex <= 0}
                            onClick={() => setPulseDateIndex(prev => prev - 1)}
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                  )}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
               <div className="divide-y divide-white/5">
                 {!currentPulseDay ? (
                    <div className="py-12 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest">No pulse data logged.</div>
                 ) : currentPulseDay.pulses.map(pulse => (
                   <div key={pulse.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-all group">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-black text-[10px] shadow-inner shrink-0">
                            {pulse.userName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black text-white uppercase tracking-tight truncate">{pulse.userName}</p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest truncate">{format(new Date(pulse.timestamp), 'MMM dd, HH:mm')}</p>
                        </div>
                     </div>
                     <Badge
                        variant="outline"
                        className={cn(
                            "text-[8px] font-black tracking-widest uppercase py-1 px-3 shrink-0",
                            pulse.mood === 'SMOOTH' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                            pulse.mood === 'HEAVY' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                            "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        )}
                    >
                       {pulse.mood}
                     </Badge>
                   </div>
                 ))}
               </div>
            </CardContent>
          </Card>

          {/* BOTTOM RIGHT: RECOGNITION */}
          <Card className="apple-glass border-none shadow-2xl flex flex-col flex-1 overflow-hidden min-h-[300px]">
            <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-white/5 px-4 md:px-6 pt-5">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                <Award className="w-4 h-4" /> Personnel Recognition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-black/10">
               {nominations.length === 0 ? (
                   <div className="py-12 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest">No active recognitions.</div>
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
                            Target: <span className="text-white">{award.nomineeName}</span>
                            <span className="mx-2 opacity-20">|</span>
                            Source: <span className="text-white/60">{award.nominatorName}</span>
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

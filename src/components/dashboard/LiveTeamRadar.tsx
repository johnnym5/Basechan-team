"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Clock, AlertTriangle, UserMinus, UserCheck, ArrowRight } from "lucide-react"
import type { UserProfile, Attendance } from "@/lib/types"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface LiveTeamRadarProps {
  staffList: UserProfile[];
  attendanceLogs: Attendance[];
}

const getLastWorkingDay = (currentDate: Date) => {
  const d = new Date(currentDate)
  do {
    d.setDate(d.getDate() - 1)
  } while (d.getDay() === 0 || d.getDay() === 6)
  return d
}

export function LiveTeamRadar({ staffList = [], attendanceLogs = [] }: LiveTeamRadarProps) {
  const router = useRouter()

  const teamStatus = useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const lastWorkingDay = getLastWorkingDay(now)
    const lastWorkingDayStr = format(lastWorkingDay, 'yyyy-MM-dd')
    const lastWorkingDayLabel = format(lastWorkingDay, 'EEEE')

    const todaysLogs = attendanceLogs.filter(l => l.date === today)
    const lastWorkingDayLogs = attendanceLogs.filter(l => l.date === lastWorkingDayStr)

    return {
      lastWorkingDayLabel,
      clockedIn: todaysLogs.filter(l => l.clockIn && !l.clockOut).map(l => ({
          ...l,
          staff: staffList.find(s => s.id === l.userId)
      })),
      late: todaysLogs.filter(l => l.remarks?.includes('LATE')).map(l => ({
          ...l,
          staff: staffList.find(s => s.id === l.userId)
      })),
      pending: staffList.filter(s =>
          !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role) &&
          !todaysLogs.some(l => l.userId === s.id)
      ),
      absentLastWorkingDay: staffList.filter(s =>
          !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role) &&
          !lastWorkingDayLogs.some(l => l.userId === s.id)
      )
    }
  }, [staffList, attendanceLogs])

  return (
    <Card className="apple-glass border-none shadow-2xl flex flex-col h-full max-h-[350px] overflow-hidden group/radar">
      <CardHeader
        className="border-b border-white/5 pb-4 bg-white/5 shrink-0 px-6 pt-5 flex flex-row justify-between items-center cursor-pointer hover:bg-white/10 transition-all group/header"
        onClick={() => router.push('/staff/attendance?filter=ALL')}
      >
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover/header:bg-primary/20 transition-colors">
                <Activity className="w-4 h-4" />
            </div>
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover/header:text-foreground transition-colors">
                Live Team Tracker
            </CardTitle>
        </div>
        <div className="flex items-center gap-3">
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/header:opacity-100 group-hover/header:translate-x-1 transition-all" />
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
        <div className="flex flex-col">

          {/* CATEGORY: ON DUTY */}
          {teamStatus.clockedIn.length > 0 && (
            <div className="mb-0">
              <div
                className="sticky top-0 bg-emerald-500/10 backdrop-blur-md px-5 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500 border-y border-white/5 z-10 flex items-center justify-between cursor-pointer hover:bg-emerald-500/20 transition-all group/sub"
                onClick={() => router.push('/staff/attendance?filter=ACTIVE')}
              >
                <span className="flex items-center gap-2">
                    <UserCheck className="w-3 h-3" /> On Duty ({teamStatus.clockedIn.length})
                </span>
                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
              </div>
              <div className="divide-y divide-white/5">
                {teamStatus.clockedIn.map(log => (
                    <div key={log.id} className="px-6 py-3.5 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="font-bold text-white uppercase tracking-tight">{log.staff?.fullName || log.userName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground opacity-60">{log.clockIn ? format(new Date(log.clockIn), 'HH:mm') : '--:--'}</span>
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: LATE */}
          {teamStatus.late.length > 0 && (
            <div className="mb-0">
              <div
                className="sticky top-0 bg-amber-500/10 backdrop-blur-md px-5 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-amber-500 border-y border-white/5 z-10 flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all group/sub"
                onClick={() => router.push('/staff/attendance?filter=LATE')}
              >
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Late Arrivals ({teamStatus.late.length})
                </div>
                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
              </div>
              <div className="divide-y divide-white/5">
                {teamStatus.late.map(log => (
                    <div key={`late-${log.id}`} className="px-6 py-3.5 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="font-bold text-white uppercase tracking-tight">{log.staff?.fullName || log.userName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-500/80">{log.clockIn ? format(new Date(log.clockIn), 'HH:mm') : '--:--'}</span>
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: NOT CHECKED IN */}
          {teamStatus.pending.length > 0 && (
            <div className="mb-0">
              <div
                className="sticky top-0 bg-white/5 backdrop-blur-md px-5 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground border-y border-white/5 z-10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all group/sub"
                onClick={() => router.push('/staff/attendance?filter=PENDING')}
              >
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> Not Checked In ({teamStatus.pending.length})
                </div>
                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
              </div>
              <div className="divide-y divide-white/5 opacity-60">
                {teamStatus.pending.map(staff => (
                    <div key={`pending-${staff.id}`} className="px-6 py-3.5 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group">
                        <span className="font-bold text-muted-foreground uppercase tracking-tight">{staff.fullName}</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: ABSENT */}
          {teamStatus.absentLastWorkingDay.length > 0 && (
            <div className="mb-0">
              <div
                className="sticky top-0 bg-rose-500/10 backdrop-blur-md px-5 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-rose-500 border-y border-white/5 z-10 flex items-center justify-between cursor-pointer hover:bg-rose-500/20 transition-all group/sub"
                onClick={() => router.push('/staff/attendance?filter=ABSENT')}
              >
                <div className="flex items-center gap-2">
                    <UserMinus className="w-3 h-3" /> Absent {teamStatus.lastWorkingDayLabel} ({teamStatus.absentLastWorkingDay.length})
                </div>
                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
              </div>
              <div className="divide-y divide-white/5">
                {teamStatus.absentLastWorkingDay.map(staff => (
                    <div key={`awol-${staff.id}`} className="px-6 py-3.5 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group">
                        <span className="font-bold text-rose-500/80 uppercase tracking-tight">{staff.fullName}</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  )
}

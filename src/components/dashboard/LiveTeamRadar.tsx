"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Clock, AlertTriangle, User, Palmtree, Calendar as LucideCalendar } from "lucide-react"
import type { UserProfile, Attendance, LeaveRequest, PulseCheck, Nomination } from "@/lib/types"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { calculateDailyStatus } from "@/lib/attendance-utils"
import { InsightCalendarModal } from "../reports/recognition/InsightCalendarModal"

interface LiveTeamRadarProps {
  staffList: UserProfile[];
  attendanceLogs: Attendance[];
  leaveRequests: LeaveRequest[];
  pulseFeed?: PulseCheck[];
  nominations?: Nomination[];
  className?: string;
}

export function LiveTeamRadar({
    staffList = [],
    attendanceLogs = [],
    leaveRequests = [],
    pulseFeed = [],
    nominations = [],
    className
}: LiveTeamRadarProps) {
  const [selectedStaff, setSelectedStaff] = useState<UserProfile | null>(null)

  const teamStatus = useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')

    const todaysLogs = attendanceLogs.filter(l => l.date === today)

    const clockedIn = todaysLogs.filter(l => l.clockIn && !l.clockOut).map(l => ({
        ...l,
        staff: staffList.find(s => s.id === l.userId)
    }))

    const late = todaysLogs.filter(l => l.remarks?.includes('LATE')).map(l => ({
        ...l,
        staff: staffList.find(s => s.id === l.userId)
    }))

    const notCheckedIn = staffList.filter(s =>
        !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role) &&
        !todaysLogs.some(l => l.userId === s.id)
    ).map(s => {
        const staffLeaves = leaveRequests.filter(l => l.userId === s.id);
        const status = calculateDailyStatus(now, [], staffLeaves);
        return { ...s, dailyStatus: status };
    }).filter(s => s.dailyStatus === 'PENDING' || s.dailyStatus === 'ABSENT');

    return {
      clockedIn,
      late,
      notCheckedIn,
    }
  }, [staffList, attendanceLogs, leaveRequests])

  return (
    <>
    <Card className={cn("bg-[#1e293b] border-none shadow-2xl flex flex-col h-full max-h-[500px] overflow-hidden rounded-[2rem]", className)}>
      <CardHeader
        className="border-b border-white/5 pb-4 bg-white/5 shrink-0 px-6 pt-5 flex flex-row justify-between items-center"
      >
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Activity className="w-4 h-4" />
            </div>
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                Live Team Tracker
            </CardTitle>
        </div>
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
        <div className="flex flex-col">

          {/* CATEGORY: ON DUTY */}
          <div className="mb-0">
            <div
              className="sticky top-0 bg-[#14532d]/40 backdrop-blur-md px-5 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#4ade80] border-y border-white/5 z-10 flex items-center gap-2"
            >
                <User className="w-3.5 h-3.5" /> On Duty ({teamStatus.clockedIn.length})
            </div>
            <div className="divide-y divide-white/5">
              {teamStatus.clockedIn.length === 0 ? (
                  <div className="px-6 py-4 text-[10px] text-muted-foreground/30 uppercase font-black italic">No personnel currently on duty</div>
              ) : teamStatus.clockedIn.map(log => (
                  <div
                    key={log.id}
                    className="px-6 py-3 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => log.staff && setSelectedStaff(log.staff)}
                  >
                      <div className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="font-black text-white uppercase tracking-wider">{log.staff?.fullName || log.userName}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">{log.clockIn ? format(new Date(log.clockIn), 'HH:mm') : '--:--'}</span>
                  </div>
              ))}
            </div>
          </div>

          {/* CATEGORY: LATE ARRIVALS */}
          <div className="mb-0">
            <div
              className="sticky top-0 bg-[#78350f]/40 backdrop-blur-md px-5 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#fbbf24] border-y border-white/5 z-10 flex items-center gap-2"
            >
                <Clock className="w-3.5 h-3.5" /> Late Arrivals ({teamStatus.late.length})
            </div>
            <div className="divide-y divide-white/5">
              {teamStatus.late.length === 0 ? (
                  <div className="px-6 py-4 text-[10px] text-muted-foreground/30 uppercase font-black italic text-center">Clear punctuality for this cycle</div>
              ) : teamStatus.late.map(log => (
                  <div
                    key={`late-${log.id}`}
                    className="px-6 py-3 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => log.staff && setSelectedStaff(log.staff)}
                  >
                      <div className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className="font-black text-white uppercase tracking-wider">{log.staff?.fullName || log.userName}</span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-500/80">{log.clockIn ? format(new Date(log.clockIn), 'HH:mm') : '--:--'}</span>
                  </div>
              ))}
            </div>
          </div>

          {/* CATEGORY: NOT CHECKED IN */}
          <div className="mb-0">
            <div
              className="sticky top-0 bg-slate-800/80 backdrop-blur-md px-5 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 border-y border-white/5 z-10 flex items-center gap-2"
            >
                <AlertTriangle className="w-3.5 h-3.5" /> Not Checked In ({teamStatus.notCheckedIn.length})
            </div>
            <div className="divide-y divide-white/5">
              {teamStatus.notCheckedIn.map(staff => (
                  <div
                    key={`pending-${staff.id}`}
                    className="px-6 py-3 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => setSelectedStaff(staff)}
                  >
                      <span className="font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-300 transition-colors">{staff.fullName}</span>
                  </div>
              ))}
            </div>
          </div>

        </div>
      </CardContent>
    </Card>

    {selectedStaff && (
        <InsightCalendarModal
            isOpen={!!selectedStaff}
            onClose={() => setSelectedStaff(null)}
            staff={selectedStaff}
            attendanceLogs={attendanceLogs}
            pulseFeed={pulseFeed}
            nominations={nominations}
        />
    )}
    </>
  )
}

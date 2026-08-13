"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Clock, AlertTriangle, UserMinus, UserCheck, MessageSquare } from "lucide-react"
import type { UserProfile, Attendance } from "@/lib/types"
import { format, subDays, startOfToday } from "date-fns"
import { cn } from "@/lib/utils"
import { uiEmitter } from "@/lib/ui-emitter"

interface LiveFleetRadarProps {
  staffList: UserProfile[];
  attendanceLogs: Attendance[];
}

export function LiveFleetRadar({ staffList = [], attendanceLogs = [] }: LiveFleetRadarProps) {

  // Real data categorization
  const fleetStatus = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

    const todaysLogs = attendanceLogs.filter(l => l.date === today)
    const yesterdaysLogs = attendanceLogs.filter(l => l.date === yesterday)

    return {
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
      absentYesterday: staffList.filter(s =>
          !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role) &&
          !yesterdaysLogs.some(l => l.userId === s.id)
      )
    }
  }, [staffList, attendanceLogs])

  return (
    <Card className="apple-glass border-none shadow-2xl flex flex-col h-full max-h-[350px] overflow-hidden">
      <CardHeader className="border-b border-white/5 pb-4 bg-white/5 shrink-0 px-6 pt-5 flex flex-row justify-between items-center">
        <div>
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Live Fleet Radar
            </CardTitle>
        </div>
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
        <div className="flex flex-col">

          {/* CATEGORY: CLOCKED IN */}
          {fleetStatus.clockedIn.length > 0 && (
            <div className="mb-0">
              <div className="sticky top-0 bg-emerald-500/10 backdrop-blur-md px-5 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500 border-y border-white/5 z-10 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <UserCheck className="w-3 h-3" /> Active Duty ({fleetStatus.clockedIn.length})
                </span>
              </div>
              <div className="divide-y divide-white/5">
                {fleetStatus.clockedIn.map(log => (
                    <div key={log.id} className="px-6 py-3.5 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="font-bold text-white uppercase tracking-tight">{log.staff?.fullName || log.userName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground opacity-60">{log.clockIn ? format(new Date(log.clockIn), 'HH:mm') : '--:--'}</span>
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: LATE TODAY */}
          {fleetStatus.late.length > 0 && (
            <div className="mb-0">
              <div className="sticky top-0 bg-amber-500/10 backdrop-blur-md px-5 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-amber-500 border-y border-white/5 z-10 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Late Arrivals ({fleetStatus.late.length})
              </div>
              <div className="divide-y divide-white/5">
                {fleetStatus.late.map(log => (
                    <div key={`late-${log.id}`} className="px-6 py-3.5 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="font-bold text-white uppercase tracking-tight">{log.staff?.fullName || log.userName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-500/80">{log.clockIn ? format(new Date(log.clockIn), 'HH:mm') : '--:--'}</span>
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: PENDING */}
          {fleetStatus.pending.length > 0 && (
            <div className="mb-0">
              <div className="sticky top-0 bg-white/5 backdrop-blur-md px-5 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground border-y border-white/5 z-10 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> Pending Nodes ({fleetStatus.pending.length})
              </div>
              <div className="divide-y divide-white/5 opacity-60">
                {fleetStatus.pending.map(staff => (
                    <div key={`pending-${staff.id}`} className="px-6 py-3.5 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group">
                        <span className="font-bold text-muted-foreground uppercase tracking-tight">{staff.fullName}</span>
                        <button
                            onClick={() => uiEmitter.emit('open-chat-dialog' as any, { userId: staff.id })}
                            className="text-[8px] font-black uppercase text-primary hover:text-white px-2 py-1 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary transition-all"
                        >
                            Ping
                        </button>
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY: ABSENT YESTERDAY */}
          {fleetStatus.absentYesterday.length > 0 && (
            <div className="mb-0">
              <div className="sticky top-0 bg-rose-500/10 backdrop-blur-md px-5 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-rose-500 border-y border-white/5 z-10 flex items-center gap-2">
                <UserMinus className="w-3 h-3" /> AWOL Yesterday ({fleetStatus.absentYesterday.length})
              </div>
              <div className="divide-y divide-white/5">
                {fleetStatus.absentYesterday.map(staff => (
                    <div key={`awol-${staff.id}`} className="px-6 py-3.5 text-xs flex justify-between items-center hover:bg-white/5 transition-colors group">
                        <span className="font-bold text-rose-500/80 uppercase tracking-tight">{staff.fullName}</span>
                        <button
                             onClick={() => uiEmitter.emit('open-staff-profile-dialog' as any, { userId: staff.id })}
                             className="text-[8px] font-black uppercase text-rose-500 hover:text-white px-2 py-1 rounded-md border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500 transition-all"
                        >
                            Review
                        </button>
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

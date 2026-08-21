"use client"

import React, { useState, useMemo } from "react"
import { format, isSameDay, parseISO } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Clock, Briefcase, Info, Trophy, Calendar as CalendarIcon } from "lucide-react"
import type { UserProfile, Attendance, PulseCheck, Nomination } from "@/lib/types"
import { cn } from "@/lib/utils"

interface InsightCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    staff: UserProfile | null;
    attendanceLogs: Attendance[];
    pulseFeed: PulseCheck[];
    nominations: Nomination[];
}

export function InsightCalendarModal({
    isOpen,
    onClose,
    staff,
    attendanceLogs,
    pulseFeed,
    nominations
}: InsightCalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // 1. Extract dates for the Calendar Modifiers
  const { lateDates, onTimeDates, heavyDates, nominationDates } = useMemo(() => {
    if (!staff) return { lateDates: [], onTimeDates: [], heavyDates: [], nominationDates: [] }

    const userLogs = attendanceLogs.filter(l => l.userId === staff.id)
    const userPulses = pulseFeed.filter(p => p.userId === staff.id)
    const userNominations = nominations.filter(n => n.nomineeId === staff.id && n.status === 'APPROVED')

    const late = userLogs.filter(l => l.remarks?.includes('LATE')).map(l => parseISO(l.date + 'T00:00:00'))
    const onTime = userLogs.filter(l => !l.remarks?.includes('LATE')).map(l => parseISO(l.date + 'T00:00:00'))
    const heavy = userPulses.filter(p => p.mood === 'HEAVY' || p.mood === 'OVERWHELMED').map(p => parseISO(p.date + 'T00:00:00'))
    const noms = userNominations.map(n => parseISO(n.timestamp.split('T')[0] + 'T00:00:00'))

    return { lateDates: late, onTimeDates: onTime, heavyDates: heavy, nominationDates: noms }
  }, [staff, attendanceLogs, pulseFeed, nominations])

  // 2. Get details for the specifically clicked day
  const selectedDayDetails = useMemo(() => {
    if (!selectedDate || !staff) return null
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const dayLog = attendanceLogs.find(l => l.userId === staff.id && l.date === dateStr)
    const dayPulse = pulseFeed.find(p => p.userId === staff.id && p.date === dateStr)
    const dayNoms = nominations.filter(n => n.nomineeId === staff.id && n.status === 'APPROVED' && n.timestamp.startsWith(dateStr))
    return { dayLog, dayPulse, dayNoms }
  }, [selectedDate, staff, attendanceLogs, pulseFeed, nominations])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] apple-glass-darker border-white/10 rounded-[2.5rem] p-8 shadow-3xl overflow-hidden">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <CalendarIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                  <DialogTitle className="text-xl font-black font-headline tracking-tighter uppercase truncate text-white">
                      Personnel History: {staff?.fullName}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60 truncate">
                      Behavioral Heatmap & Operational Logs
                  </DialogDescription>
              </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-2">
          {/* THE COLOR-CODED CALENDAR */}
          <div className="p-4 rounded-3xl bg-black/20 border border-white/5 shadow-inner">
            <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                    late: lateDates,
                    onTime: onTimeDates,
                    heavy: heavyDates,
                    nomination: nominationDates
                }}
                modifiersClassNames={{
                    late: "bg-rose-500/20 text-rose-500 font-bold hover:bg-rose-500/30 rounded-lg",
                    onTime: "bg-emerald-500/20 text-emerald-500 font-bold hover:bg-emerald-500/30 rounded-lg",
                    heavy: "border-2 border-amber-500 text-amber-500 rounded-lg",
                    nomination: "after:content-['★'] after:absolute after:-top-1 after:-right-1 after:text-[8px] after:text-yellow-500"
                }}
                className="rounded-md"
            />
          </div>

          {/* DAY DETAILS PANEL */}
          <div className="w-full min-h-[120px] p-6 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-xl overflow-y-auto max-h-[250px] custom-scrollbar">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 border-b border-white/5 pb-2">
              {selectedDate ? format(selectedDate, 'EEEE, MMM do, yyyy') : 'Select a date'}
            </h4>

            {!selectedDayDetails ? (
              <div className="flex flex-col items-center justify-center py-4 opacity-20">
                  <Info className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic">No operational data logged.</p>
              </div>
            ) : !selectedDayDetails.dayLog && !selectedDayDetails.dayPulse && selectedDayDetails.dayNoms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 opacity-20">
                    <Info className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">No operational data logged.</p>
                </div>
            ) : (
              <div className="flex flex-col gap-4">
                {selectedDayDetails.dayLog && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                    <Clock className="w-4 h-4 text-primary" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">
                            Clocked in at <span className="text-white">{format(parseISO(selectedDayDetails.dayLog.clockIn), 'hh:mm aa')}</span>
                        </span>
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest",
                            selectedDayDetails.dayLog.remarks?.includes('LATE') ? "text-rose-500" : "text-emerald-500"
                        )}>
                            Status: {selectedDayDetails.dayLog.remarks?.includes('LATE') ? 'LATE ARRIVAL' : 'ON TIME'}
                        </span>
                    </div>
                  </div>
                )}
                {selectedDayDetails.dayPulse && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                    <Briefcase className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">
                          Workload Mood: <span className="text-amber-500">{selectedDayDetails.dayPulse.mood}</span>
                      </span>
                      {selectedDayDetails.dayLog?.eodReport && (
                          <p className="text-[10px] font-medium text-muted-foreground mt-1 leading-relaxed italic">
                              "{selectedDayDetails.dayLog.eodReport}"
                          </p>
                      )}
                    </div>
                  </div>
                )}
                {selectedDayDetails.dayNoms.map(nom => (
                    <div key={nom.id} className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                        <Trophy className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-yellow-500 uppercase tracking-tight">Awarded: {nom.categoryTitle}</span>
                            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 leading-relaxed italic">"{nom.reason}"</p>
                        </div>
                    </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4 text-[8px] font-black uppercase tracking-[0.2em] opacity-40">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500/50" /> On Time</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500/50" /> Late</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded border border-amber-500" /> Heavy</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 text-yellow-500">★</div> Star Earned</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

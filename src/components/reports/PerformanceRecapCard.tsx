"use client"
import React, { useState } from "react"
import { subWeeks, addWeeks, subMonths, addMonths, format } from "date-fns"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, Eye, Award } from "lucide-react"
import { PerformanceRecapModal } from "./PerformanceRecapModal"
import { useRecapSummary, RecapMode } from "@/hooks/useRecapSummary"
import type { UserProfile, Attendance, Task, LeaveRequest } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PerformanceRecapCardProps {
    currentUser: UserProfile;
    attendanceLogs: Attendance[];
    tasks: Task[];
    reports: any[];
    leaveRequests: LeaveRequest[];
}

export function PerformanceRecapCard({
    currentUser,
    attendanceLogs,
    tasks,
    reports,
    leaveRequests
}: PerformanceRecapCardProps) {
  const [mode, setMode] = useState<RecapMode>('WEEKLY')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Navigate Periods
  const handlePrev = () => {
    setSelectedDate(prev => mode === 'WEEKLY' ? subWeeks(prev, 1) : subMonths(prev, 1))
  }
  const handleNext = () => {
    setSelectedDate(prev => mode === 'WEEKLY' ? addWeeks(prev, 1) : addMonths(prev, 1))
  }

  const summary = useRecapSummary(
    currentUser?.id,
    mode,
    selectedDate,
    attendanceLogs,
    tasks,
    reports,
    leaveRequests
  )

  const periodLabel = mode === 'WEEKLY'
    ? `Week of ${format(summary.dateInterval.start, 'MMM dd, yyyy')}`
    : format(selectedDate, 'MMMM yyyy')

  return (
    <div className="flex flex-col gap-4">
      <div className="p-6 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-white/5 shadow-2xl flex flex-col gap-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Award className="w-24 h-24 text-primary" />
        </div>

        {/* MODE TOGGLE AND PREV/NEXT CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4 relative z-10">
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
            <Button
              size="sm"
              variant={mode === 'WEEKLY' ? 'default' : 'ghost'}
              onClick={() => setMode('WEEKLY')}
              className={cn(
                  "text-[9px] font-black uppercase tracking-widest h-8 px-4 rounded-lg transition-all",
                  mode === 'WEEKLY' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
              )}
            >
              Weekly
            </Button>
            <Button
              size="sm"
              variant={mode === 'MONTHLY' ? 'default' : 'ghost'}
              onClick={() => setMode('MONTHLY')}
              className={cn(
                  "text-[9px] font-black uppercase tracking-widest h-8 px-4 rounded-lg transition-all",
                  mode === 'MONTHLY' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
              )}
            >
              Monthly
            </Button>
          </div>

          {/* PERIOD NAVIGATOR */}
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-xl border border-white/10 shadow-inner">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/5 text-primary transition-all active:scale-90" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-[10px] font-black uppercase tracking-widest text-white min-w-[150px] text-center flex items-center justify-center gap-2">
              <Calendar className="w-3 h-3 text-primary/60" /> {periodLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/5 text-primary transition-all active:scale-90" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* BANNER & LAUNCH TRIGGER */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2 relative z-10">
          <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  {mode} PERFORMANCE RECAP
                </h3>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider opacity-60 leading-relaxed max-w-md">
                  Audit your accomplishments, clocking trends, and submitted situation reports for this terminal window.
                </p>
              </div>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
            <Eye className="w-4 h-4" /> View {mode.toLowerCase()} Summary
          </Button>
        </div>
      </div>

      {/* POPUP MODAL */}
      <PerformanceRecapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffName={currentUser?.fullName}
        summaryData={summary}
        mode={mode}
        periodLabel={periodLabel}
      />
    </div>
  )
}

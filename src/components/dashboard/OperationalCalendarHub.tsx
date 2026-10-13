"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Palmtree,
  Users,
  Building,
  Check,
  X,
  ExternalLink,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile, Attendance, DailyReport, Task, LeaveRequest, PulseCheck } from "@/lib/types";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isWithinInterval,
  differenceInMinutes,
  addDays,
  startOfDay,
} from "date-fns";
import { NIGERIAN_PUBLIC_HOLIDAYS, getNigerianHoliday, type PublicHoliday } from "@/lib/holidays";
import type { CalendarViewMode, CalendarStatusCell } from "@/types/calendar";
import { useRouter } from "next/navigation";

interface OperationalCalendarHubProps {
  userProfile: UserProfile;
  staffList?: UserProfile[];
  attendanceLogs?: Attendance[];
  reportsData?: DailyReport[];
  tasks?: Task[];
  leaveRequests?: LeaveRequest[];
  pulseFeed?: PulseCheck[];
  isAdmin?: boolean;
}

export function OperationalCalendarHub({
  userProfile,
  staffList = [],
  attendanceLogs = [],
  reportsData = [],
  tasks = [],
  leaveRequests = [],
  pulseFeed = [],
  isAdmin = false,
}: OperationalCalendarHubProps) {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("MONTH");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInspectionStaff, setSelectedInspectionStaff] = useState<UserProfile | null>(null);

  // Next Upcoming Nigerian Public Holiday calculation
  const upcomingHoliday = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const sorted = [...NIGERIAN_PUBLIC_HOLIDAYS].sort((a, b) => a.date.localeCompare(b.date));
    const next = sorted.find(h => h.date >= todayStr);
    if (next) {
      const daysDiff = differenceInMinutes(parseISO(next.date), startOfDay(new Date())) / (60 * 24);
      return { ...next, daysAway: Math.max(0, Math.round(daysDiff)) };
    }
    return null;
  }, []);

  // Calendar Grid Days Generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Mon
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Date Navigation
  const handlePrev = () => {
    if (viewMode === 'MONTH') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -7));
  };

  const handleNext = () => {
    if (viewMode === 'MONTH') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Status Cell Calculator for Staff Mode
  const getCellStatus = (date: Date): CalendarStatusCell => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = getNigerianHoliday(dateStr);

    const userLog = attendanceLogs.find(a => a.userId === userProfile.id && a.date === dateStr);
    const approvedLeave = leaveRequests.find(l =>
      l.userId === userProfile.id &&
      l.status === 'APPROVED' &&
      isWithinInterval(date, { start: parseISO(l.startDate), end: parseISO(l.endDate) })
    );

    let statusType: CalendarStatusCell['statusType'] = 'CLEAR';

    if (holiday) statusType = 'HOLIDAY';
    else if (approvedLeave) statusType = 'LEAVE';
    else if (userLog?.clockIn) {
      if (userLog.remarks?.includes('LATE' as any)) statusType = 'LATE';
      else if (userLog.location === 'REMOTE') statusType = 'REMOTE';
      else statusType = 'ON_TIME';
    } else if (date < startOfDay(new Date()) && date.getDay() !== 0 && date.getDay() !== 6) {
      statusType = 'MISSED';
    }

    return {
      dateStr,
      isToday: isToday(date),
      isCurrentMonth: isSameMonth(date, currentDate),
      holiday,
      shiftLog: userLog,
      approvedLeave,
      statusType,
    };
  };

  // Selected Day Audit Data for Modal/Drawer
  const selectedDayAuditData = useMemo(() => {
    if (!selectedDate) return null;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const holiday = getNigerianHoliday(dateStr);

    // Shift logs for selected date
    const dayAttendance = attendanceLogs.filter(a => a.date === dateStr);
    const dayReports = reportsData.filter(r => r.reportDate === dateStr || (r.createdAt && format(parseISO(r.createdAt), 'yyyy-MM-dd') === dateStr));
    const dayTasksDone = tasks.filter(t => t.status === 'ARCHIVED' && t.createdAt && format(parseISO(t.createdAt), 'yyyy-MM-dd') === dateStr);

    const dayLeaves = leaveRequests.filter(l =>
      l.status === 'APPROVED' &&
      isWithinInterval(selectedDate, { start: parseISO(l.startDate), end: parseISO(l.endDate) })
    );

    // Admin Team Categorization
    const clockedInStaff = dayAttendance.filter(a => a.clockIn).map(a => ({
      ...a,
      staff: staffList.find(s => s.id === a.userId),
    }));

    const lateStaff = dayAttendance.filter(a => a.remarks?.includes('LATE' as any)).map(a => ({
      ...a,
      staff: staffList.find(s => s.id === a.userId),
    }));

    const leaveStaff = dayLeaves.map(l => ({
      ...l,
      staff: staffList.find(s => s.id === l.userId),
    }));

    const activeStaffIds = new Set(dayAttendance.map(a => a.userId).concat(dayLeaves.map(l => l.userId)));
    const missedStaff = staffList.filter(s =>
      s.status !== 'DISABLED' &&
      s.status !== 'TERMINATED' &&
      !activeStaffIds.has(s.id) &&
      selectedDate < startOfDay(new Date()) &&
      selectedDate.getDay() !== 0 &&
      selectedDate.getDay() !== 6
    );

    return {
      dateStr,
      formattedDate: format(selectedDate, 'EEEE, MMMM dd, yyyy'),
      holiday,
      dayAttendance,
      dayReports,
      dayTasksDone,
      dayLeaves,
      clockedInStaff,
      lateStaff,
      leaveStaff,
      missedStaff,
    };
  }, [selectedDate, attendanceLogs, reportsData, tasks, leaveRequests, staffList]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">

      {/* HEADER CONTROLS & HOLIDAY BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-foreground font-headline">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
                {isAdmin ? "Admin Team Audit Mode" : "Personal Shift Ledger"}
              </Badge>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-0.5">
              Interactive shift history, time-off status, and official Nigerian public holidays
            </p>
          </div>
        </div>

        {/* View Switcher & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
            {(['MONTH', 'WEEK'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === mode ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-lg text-slate-300 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-lg text-slate-300 hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* UPCOMING HOLIDAY ALERT BANNER */}
      {upcomingHoliday && (
        <div className="p-4 px-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase text-purple-200 tracking-wider">
                Upcoming Public Holiday: {upcomingHoliday.name}
              </p>
              <p className="text-[10px] text-purple-300/80 font-bold uppercase tracking-widest">
                {format(parseISO(upcomingHoliday.date), 'EEEE, MMMM dd, yyyy')} ({upcomingHoliday.daysAway} day{upcomingHoliday.daysAway !== 1 ? 's' : ''} away)
              </p>
            </div>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-none text-[9px] font-black uppercase tracking-widest px-3 py-1">
            Official Nigerian Holiday
          </Badge>
        </div>
      )}

      {/* COLOR-CODED LEGEND STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-black/20 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-300">
        <span className="text-muted-foreground opacity-60">Status Legend:</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-400" /><span>Nigerian Holiday</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /><span>On-Time Shift</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span>Late Arrival</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-cyan-400" /><span>Remote Shift</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><span>Approved Leave</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400" /><span>Missed / Absent</span></div>
        </div>
      </div>

      {/* MAIN CALENDAR GRID */}
      <Card className="border-border/50 shadow-2xl bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-4 md:p-6">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-2 mb-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="py-2 bg-black/20 rounded-xl border border-white/5">{day}</div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const cell = getCellStatus(day);
              const dayNumber = format(day, 'd');

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "min-h-[90px] md:min-h-[110px] p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group hover:scale-[1.02] active:scale-[0.98]",
                    !cell.isCurrentMonth && "opacity-30 bg-black/10 border-white/5",
                    cell.isCurrentMonth && "bg-black/30 border-white/5 hover:border-primary/40 hover:bg-white/5",
                    cell.isToday && "ring-2 ring-primary border-primary/50 bg-primary/10 shadow-lg shadow-primary/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-black font-mono px-2 py-0.5 rounded-lg",
                      cell.isToday ? "bg-primary text-white" : "text-slate-300"
                    )}>
                      {dayNumber}
                    </span>

                    {cell.holiday && (
                      <span className="text-[10px]" title={cell.holiday.name}>🎉</span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="space-y-1">
                    {cell.statusType === 'HOLIDAY' && (
                      <div className="p-1 px-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[8px] font-black uppercase tracking-tight truncate">
                        {cell.holiday?.name}
                      </div>
                    )}

                    {cell.statusType === 'ON_TIME' && (
                      <div className="p-1 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-black uppercase tracking-tight flex items-center justify-between">
                        <span>On-Time</span>
                        <span className="font-mono">{cell.shiftLog?.clockIn ? format(parseISO(cell.shiftLog.clockIn), 'HH:mm') : ''}</span>
                      </div>
                    )}

                    {cell.statusType === 'LATE' && (
                      <div className="p-1 px-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-tight flex items-center justify-between">
                        <span>Late</span>
                        <span className="font-mono">{cell.shiftLog?.clockIn ? format(parseISO(cell.shiftLog.clockIn), 'HH:mm') : ''}</span>
                      </div>
                    )}

                    {cell.statusType === 'REMOTE' && (
                      <div className="p-1 px-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[8px] font-black uppercase tracking-tight flex items-center justify-between">
                        <span>Remote</span>
                      </div>
                    )}

                    {cell.statusType === 'LEAVE' && (
                      <div className="p-1 px-2 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[8px] font-black uppercase tracking-tight truncate">
                        {cell.approvedLeave?.leaveType || 'Leave'}
                      </div>
                    )}

                    {cell.statusType === 'MISSED' && (
                      <div className="p-1 px-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[8px] font-black uppercase tracking-tight">
                        Absence
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* INTERACTIVE DAY INSPECTION MODAL / DRAWER */}
      {selectedDate && selectedDayAuditData && (
        <Dialog open={!!selectedDate} onOpenChange={() => { setSelectedDate(null); setSelectedInspectionStaff(null); }}>
          <DialogContent className="max-w-2xl bg-[#0f172a] border border-white/10 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-2xl">
            <DialogHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-wider text-white font-headline">
                    {selectedDayAuditData.formattedDate}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 mt-1">
                    {isAdmin ? "Team Daily Audit & Attendance Inspection" : "Personal Shift Breakdown & Activity Notes"}
                  </DialogDescription>
                </div>
                {selectedDayAuditData.holiday && (
                  <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase px-3 py-1">
                    🎉 {selectedDayAuditData.holiday.name}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-2 space-y-6">

              {/* ADMIN MODE VIEW */}
              {isAdmin ? (
                <div className="space-y-6 pt-4">

                  {/* On Duty Staff */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> On Duty / Clocked In ({selectedDayAuditData.clockedInStaff.length})
                    </h4>
                    {selectedDayAuditData.clockedInStaff.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedDayAuditData.clockedInStaff.map(item => (
                          <div
                            key={item.id}
                            onClick={() => item.staff && setSelectedInspectionStaff(item.staff)}
                            className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all group"
                          >
                            <div>
                              <p className="text-xs font-black uppercase text-white group-hover:text-primary transition-colors">
                                {item.userName || item.staff?.fullName}
                              </p>
                              <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                                IN: {item.clockIn ? format(parseISO(item.clockIn), 'p') : '--'} | OUT: {item.clockOut ? format(parseISO(item.clockOut), 'p') : 'ACTIVE'}
                              </p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 text-primary transition-opacity" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] italic text-muted-foreground/40 font-black uppercase py-2">No shift clock-ins recorded for this date.</p>
                    )}
                  </div>

                  {/* Late Arrivals */}
                  {selectedDayAuditData.lateStaff.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Late Arrivals ({selectedDayAuditData.lateStaff.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedDayAuditData.lateStaff.map(item => (
                          <div key={item.id} className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black uppercase text-amber-200">{item.userName || item.staff?.fullName}</p>
                              <p className="text-[9px] font-mono text-amber-300/80 mt-0.5">
                                Late Arrival: {item.clockIn ? format(parseISO(item.clockIn), 'p') : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approved Leave Staff */}
                  {selectedDayAuditData.leaveStaff.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 flex items-center gap-2">
                        <Palmtree className="w-3.5 h-3.5" /> On Approved Leave ({selectedDayAuditData.leaveStaff.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedDayAuditData.leaveStaff.map(item => (
                          <div key={item.id} className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black uppercase text-orange-200">{item.userName || item.staff?.fullName}</p>
                              <p className="text-[9px] font-mono text-orange-300/80 mt-0.5">{item.leaveType || 'Approved Rest'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* STAFF MODE PERSONAL VIEW */
                <div className="space-y-6 pt-4">

                  {/* Shift Summary */}
                  {selectedDayAuditData.dayAttendance.length > 0 ? (
                    selectedDayAuditData.dayAttendance.map(log => (
                      <div key={log.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black uppercase text-primary">Shift Session Details</p>
                          <Badge variant="outline" className="text-[8px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            {log.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <span className="text-[9px] uppercase text-muted-foreground">Clock In:</span>
                            <p className="font-bold text-white">{log.clockIn ? format(parseISO(log.clockIn), 'p') : '--'}</p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase text-muted-foreground">Clock Out:</span>
                            <p className="font-bold text-white">{log.clockOut ? format(parseISO(log.clockOut), 'p') : 'ACTIVE'}</p>
                          </div>
                        </div>

                        {log.eodReport && (
                          <div className="space-y-1 pt-2 border-t border-white/5">
                            <span className="text-[9px] font-black uppercase text-muted-foreground">Daily Work Note:</span>
                            <p className="text-xs italic text-slate-300 font-medium">"{log.eodReport}"</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl opacity-40">
                      <p className="text-xs font-black uppercase tracking-widest">No shift logged for this date.</p>
                    </div>
                  )}

                </div>
              )}

            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* INDIVIDUAL STAFF 360 INSPECTION MODAL */}
      {selectedInspectionStaff && (
        <Dialog open={!!selectedInspectionStaff} onOpenChange={() => setSelectedInspectionStaff(null)}>
          <DialogContent className="max-w-md bg-[#0f172a] border border-white/10 text-white p-6 rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-base font-black uppercase text-white font-headline">
                {selectedInspectionStaff.fullName}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground">
                {selectedInspectionStaff.position || selectedInspectionStaff.role} • {selectedInspectionStaff.departmentName || 'Operations'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <Button
                onClick={() => router.push(`/staff/profile?id=${selectedInspectionStaff.id}`)}
                className="w-full h-11 rounded-xl bg-primary text-white font-black uppercase text-xs tracking-widest"
              >
                View Full Personnel Profile <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

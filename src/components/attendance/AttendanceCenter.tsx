"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Users,
  Activity,
  UserX,
  ShieldAlert,
  Clock,
  CalendarDays,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Timer,
  ChevronRight,
  ArrowRight,
  Loader2,
  Calendar as LucideCalendar,
  Palmtree,
  User,
  LayoutGrid,
  LogIn
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, addDays, startOfMonth, endOfMonth, parseISO } from "date-fns"
import type { UserProfile, Attendance, LeaveRequest, OperationalStatus, PulseCheck, Nomination } from "@/lib/types"
import { formatDuration } from "@/lib/formatters"
import { ScrollArea } from "@/components/ui/scroll-area"
import { attendanceService } from "@/services/attendance-service"
import { useFirestore, useUser } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { StaffActionMenu } from "@/components/shared/StaffActionMenu"
import { calculateDailyStatus } from "@/lib/attendance-utils"
import { InsightCalendarModal } from "../reports/recognition/InsightCalendarModal"

interface AttendanceCenterProps {
  staffList: UserProfile[];
  attendanceLogs: Attendance[];
  leaveRequests: LeaveRequest[];
  pulseFeed?: PulseCheck[];
  nominations?: Nomination[];
  currentUserProfile: UserProfile;
}

export function AttendanceCenter({ staffList, attendanceLogs, leaveRequests, pulseFeed = [], nominations = [], currentUserProfile }: AttendanceCenterProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // States
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'ABSENT' | 'PENDING'>('ALL')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isRosterOpen, setIsRosterOpen] = useState(false)
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState<UserProfile | null>(null)

  const [historyTimeframe, setHistoryTimeframe] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'>('WEEKLY')
  const [historyStaffId, setHistoryStaffId] = useState<string>('ALL')

  // Core Data Derivation (Ghost Protocol Enforced)
  const nonAdminStaff = useMemo(() =>
    staffList.filter(u =>
        !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(u.role) &&
        u.status !== 'DISABLED' &&
        u.status !== 'TERMINATED' &&
        u.isArchived !== true
    ), [staffList]);

  const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayLogs = useMemo(() => attendanceLogs.filter(log => log.date === targetDateStr), [attendanceLogs, targetDateStr]);

  const stats = useMemo(() => {
    const total = nonAdminStaff.length;
    const active = dayLogs.filter(l => !l.clockOut && l.status === 'APPROVED').length;
    const pending = dayLogs.filter(l => l.status === 'PENDING').length;

    let presentCount = 0;
    let absentCount = 0;
    let holidayCount = 0;
    let onLeaveCount = 0;

    nonAdminStaff.forEach(staff => {
        const staffLogs = attendanceLogs.filter(l => l.userId === staff.id);
        const staffLeaves = leaveRequests.filter(l => l.userId === staff.id);
        const status = calculateDailyStatus(selectedDate, staffLogs, staffLeaves);

        if (status === 'ON_TIME' || status === 'LATE') presentCount++;
        else if (status === 'ABSENT') absentCount++;
        else if (status === 'HOLIDAY') holidayCount++;
        else if (status === 'ON_LEAVE') onLeaveCount++;
    });

    return { total, active, absent: absentCount, pending, holiday: holidayCount, onLeave: onLeaveCount };
  }, [nonAdminStaff, dayLogs, attendanceLogs, leaveRequests, selectedDate]);

  const filteredRoster = useMemo(() => {
    return nonAdminStaff.map(staff => {
        const log = dayLogs.find(l => l.userId === staff.id);
        const staffLogs = attendanceLogs.filter(l => l.userId === staff.id);
        const staffLeaves = leaveRequests.filter(l => l.userId === staff.id);
        const status = calculateDailyStatus(selectedDate, staffLogs, staffLeaves);
        return { staff, log, status };
    }).filter(item => {
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'ACTIVE') return item.status === 'ON_TIME' || item.status === 'LATE' && item.log && !item.log.clockOut;
        if (activeFilter === 'PENDING') return item.log && item.log.status === 'PENDING';
        if (activeFilter === 'ABSENT') return item.status === 'ABSENT';
        return true;
    });
  }, [nonAdminStaff, dayLogs, attendanceLogs, leaveRequests, selectedDate, activeFilter]);

  // Historical Deep Dive Data
  const historicalDisplayData = useMemo(() => {
    if (historyStaffId === 'ALL') return null;
    const staffLogs = attendanceLogs.filter(l => l.userId === historyStaffId);

    if (historyTimeframe === 'WEEKLY') {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday
        const days = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d));

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const log = staffLogs.find(l => l.date === dateStr);
            return { day, log };
        });
    }

    if (historyTimeframe === 'MONTHLY') {
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        const days = eachDayOfInterval({ start, end });

        const weeks: { label: string, days: any[] }[] = [];
        let currentWeek: any[] = [];
        let weekCounter = 1;

        days.forEach((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const log = staffLogs.find(l => l.date === dateStr);
            currentWeek.push({ day, log });

            if (day.getDay() === 0 || idx === days.length - 1) { // Sunday or end of month
                weeks.push({ label: `Week ${weekCounter}`, days: currentWeek });
                currentWeek = [];
                weekCounter++;
            }
        });
        return weeks;
    }

    return null;
  }, [attendanceLogs, historyStaffId, historyTimeframe]);

  const handleVerifyPunch = async (recordId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!firestore || !currentUserProfile) return;
    setVerifyingId(recordId);
    try {
        await attendanceService.verifyPunch(firestore, recordId, status, currentUserProfile);
        toast({ title: `Punch ${status === 'APPROVED' ? 'Authorized' : 'Rejected'}`, description: `The attendance record has been synchronized.` });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Verification Failed", description: e.message });
    } finally {
        setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700 overflow-x-hidden">

      {/* 1. INTERACTIVE KPI FILTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Card
          onClick={() => { setActiveFilter('ALL'); setIsRosterOpen(true); }}
          className={cn(
            "cursor-pointer transition-all border-white/5 bg-secondary/5 hover:bg-secondary/10",
            activeFilter === 'ALL' && "ring-2 ring-primary border-primary bg-primary/5"
          )}
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
                <Users className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary opacity-60" />
                <span className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Staff</span>
            </div>
            <p className="text-xl md:text-2xl font-black font-headline tracking-tighter">{stats.total}</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => { setActiveFilter('ACTIVE'); setIsRosterOpen(true); }}
          className={cn(
            "cursor-pointer transition-all border-white/5 bg-secondary/5 hover:bg-emerald-500/5",
            activeFilter === 'ACTIVE' && "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5"
          )}
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3 md:w-3.5 h-3 md:h-3.5 text-emerald-500 opacity-60" />
                <span className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active</span>
            </div>
            <p className="text-xl md:text-2xl font-black font-headline tracking-tighter text-emerald-500">{stats.active}</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => { setActiveFilter('ABSENT'); setIsRosterOpen(true); }}
          className={cn(
            "cursor-pointer transition-all border-white/5 bg-secondary/5 hover:bg-rose-500/5",
            activeFilter === 'ABSENT' && "ring-2 ring-rose-500 border-rose-500 bg-rose-500/5"
          )}
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
                <UserX className="w-3 md:w-3.5 h-3 md:h-3.5 text-rose-500 opacity-60" />
                <span className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground tracking-widest">Absent</span>
            </div>
            <p className="text-xl md:text-2xl font-black font-headline tracking-tighter text-rose-500">{stats.absent}</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => { setActiveFilter('PENDING'); setIsRosterOpen(true); }}
          className={cn(
            "cursor-pointer transition-all border-white/5 bg-secondary/5 hover:bg-amber-500/5",
            activeFilter === 'PENDING' && "ring-2 ring-amber-500 border-amber-500 bg-amber-500/5"
          )}
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-3 md:w-3.5 h-3 md:h-3.5 text-amber-500 opacity-60" />
                <span className="text-[8px] md:text-[9px] font-black uppercase text-amber-500 tracking-widest">Pending</span>
            </div>
            <p className="text-xl md:text-2xl font-black font-headline tracking-tighter text-amber-500">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-secondary/5">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-500 opacity-60" />
                <span className="text-[8px] md:text-[9px] font-black uppercase text-blue-500 tracking-widest">On Leave</span>
            </div>
            <p className="text-xl md:text-2xl font-black font-headline tracking-tighter text-blue-500">{stats.onLeave}</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-secondary/5">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-3 md:w-3.5 h-3 md:h-3.5 text-slate-400 opacity-60" />
                <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest">Holidays</span>
            </div>
            <p className="text-xl md:text-2xl font-black font-headline tracking-tighter text-slate-400">{stats.holiday}</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. ROSTER & CALENDAR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Filtered Roster */}
        <Card className="lg:col-span-2 bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="font-black uppercase tracking-widest text-xs text-primary flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Personnel Telemetry ({activeFilter})
                </h2>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-1 opacity-60">Real-time Attendance Stream</p>
            </div>
            <Badge variant="outline" className="h-7 px-3 rounded-full border-white/10 text-[9px] font-black uppercase tracking-widest bg-background/50">
                {format(selectedDate, 'MMM dd, yyyy')}
            </Badge>
          </div>
          <div className="p-0 overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse min-w-[600px]">
              <thead className="bg-secondary/50 text-[9px] font-black uppercase tracking-widest sticky top-0 backdrop-blur-md z-10 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4 text-center">Clock In</th>
                  <th className="px-6 py-4 text-center">Clock Out</th>
                  <th className="px-6 py-4 text-center">Total Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRoster.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground uppercase font-black text-[10px] tracking-widest opacity-20">
                            No employees detected
                        </td>
                    </tr>
                ) : (
                    filteredRoster.map(({ staff, log, status }) => (
                        <tr key={staff.id} className="hover:bg-white/5 transition-all group cursor-pointer">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4 min-w-[180px]">
                                    <Avatar className="h-9 w-9 md:h-10 md:w-10 rounded-2xl border border-white/10 shadow-lg">
                                        <AvatarFallback className="bg-secondary font-black text-[10px] md:text-xs">{staff.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-black text-sm text-white truncate leading-none">{staff.fullName}</p>
                                        <div className="flex items-center gap-2 mt-1 min-w-0">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate shrink-0">{staff.jobTitle || 'Unit Staff'}</p>
                                            {log?.branchName && (
                                                <Badge variant="outline" className="h-4 px-1.5 rounded-md border-primary/20 text-primary text-[7px] font-black uppercase truncate">
                                                    {log.branchName}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                    {status === 'ON_TIME' && <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] font-black uppercase">On Time</Badge>}
                                    {status === 'LATE' && <Badge className="bg-amber-500/20 text-amber-500 border-none text-[8px] font-black uppercase">Late</Badge>}
                                    {status === 'ABSENT' && <Badge className="bg-rose-500/20 text-rose-500 border-none text-[8px] font-black uppercase">Absent</Badge>}
                                    {status === 'HOLIDAY' && <Badge className="bg-slate-500/20 text-slate-400 border-none text-[8px] font-black uppercase">Holiday</Badge>}
                                    {status === 'ON_LEAVE' && <Badge className="bg-blue-500/20 text-blue-500 border-none text-[8px] font-black uppercase">On Leave</Badge>}
                                    {status === 'WEEKEND' && <Badge className="bg-slate-500/10 text-slate-500 border-none text-[8px] font-black uppercase">Weekend</Badge>}

                                    {log && <span className="font-mono text-[10px] font-bold text-white">{format(new Date(log.clockIn), 'HH:mm')}</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-xs">
                                {log?.clockOut ? (
                                    <span className="text-white font-bold">{format(new Date(log.clockOut), 'HH:mm')}</span>
                                ) : log ? (
                                    <Badge variant="outline" className="h-5 px-2 rounded-lg text-[7px] font-black uppercase bg-emerald-500/10 text-emerald-500 border-none animate-pulse">ACTIVE</Badge>
                                ) : '--:--'}
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-black text-xs text-primary">
                                {log?.duration ? formatDuration(log.duration) : '00:00:00'}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                                    {log?.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={verifyingId === log.id}
                                                className="h-8 rounded-xl bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-black uppercase hover:bg-amber-500 hover:text-white transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVerifyPunch(log.id, 'APPROVED');
                                                }}
                                            >
                                                {verifyingId === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify Punch"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={verifyingId === log.id}
                                                className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVerifyPunch(log.id, 'REJECTED');
                                                }}
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <StaffActionMenu
                                            staff={{ id: staff.id, name: staff.fullName, status: staff.status, isArchived: staff.isArchived }}
                                            currentLog={log}
                                        />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right: Side Monitors */}
        <div className="space-y-6">
            <Card className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-4 md:p-6 pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary opacity-70">Operational Calendar</CardTitle>
                </CardHeader>
                <div className="flex justify-center p-2">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        className="rounded-2xl border border-white/5 bg-background shadow-xl w-full"
                    />
                </div>
            </Card>

            <div className="p-4 md:p-5 rounded-2xl md:rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 flex gap-4 text-amber-600">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 shrink-0" />
                <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Security Advisory</p>
                    <p className="text-[8px] md:text-[9px] font-bold leading-relaxed uppercase tracking-tighter opacity-80">
                        Attendance logs for archived dates are read-only. Manual adjustments require Super Admin authorization tokens.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* 3. HISTORICAL ANALYSIS MODULE */}
      <Card className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div>
            <h2 className="font-black uppercase tracking-[0.2em] text-sm text-primary flex items-center gap-2">
                <History className="w-5 h-5" />
                Historical Analysis Deep Dive
            </h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Advanced Performance Telemetry Archeology</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select value={historyStaffId} onValueChange={setHistoryStaffId}>
              <SelectTrigger className="w-full md:w-[220px] h-10 md:h-11 rounded-xl bg-background/50 border-white/10 text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="Select Staff" />
              </SelectTrigger>
              <SelectContent className="apple-glass-darker border-none">
                <SelectItem value="ALL" className="text-[10px] font-bold uppercase p-3">All Personnel</SelectItem>
                {nonAdminStaff.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-[10px] font-bold uppercase p-3">{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={historyTimeframe} onValueChange={(v: any) => setHistoryTimeframe(v)}>
              <SelectTrigger className="w-full md:w-[160px] h-10 md:h-11 rounded-xl bg-background/50 border-white/10 text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent className="apple-glass-darker border-none">
                <SelectItem value="DAILY" className="text-[10px] font-bold uppercase p-3">Daily</SelectItem>
                <SelectItem value="WEEKLY" className="text-[10px] font-bold uppercase p-3">Weekly</SelectItem>
                <SelectItem value="MONTHLY" className="text-[10px] font-bold uppercase p-3">Monthly</SelectItem>
                <SelectItem value="QUARTERLY" className="text-[10px] font-bold uppercase p-3">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 md:p-8 bg-transparent min-h-[300px]">
          {historyStaffId === 'ALL' ? (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl md:rounded-[2.5rem] bg-secondary/5 opacity-30 text-center">
                  <Timer className="h-12 w-12 md:h-16 md:w-16 mb-4 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] px-6">Select individual personnel to initialize deep-dive analysis</p>
              </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-x-auto w-full">
                {historyTimeframe === 'WEEKLY' && historicalDisplayData && (
                    <div className="space-y-6 min-w-[500px]">
                        <div className="flex items-center gap-3 px-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">Work-Week Execution Record</h3>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="overflow-hidden border border-white/5 rounded-2xl bg-white/[0.02]">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-white/5 text-[9px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Operational Day</th>
                                        <th className="px-6 py-4">Shift Timeline</th>
                                        <th className="px-6 py-4 text-right">Activity Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(historicalDisplayData as any[]).filter(d => !isWeekend(d.day)).map(({ day, log }, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">{format(day, 'EEEE, MMM dd')}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-mono text-xs">
                                                    <span className="text-emerald-400">{log ? format(new Date(log.clockIn), 'HH:mm') : '--:--'}</span>
                                                    <span className="opacity-20">→</span>
                                                    <span className="text-rose-400">{log?.clockOut ? format(new Date(log.clockOut), 'HH:mm') : log ? 'ACTIVE' : '--:--'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {log?.eodReport || log?.lateReason ? (
                                                    <div className="flex flex-col items-end gap-1">
                                                        {log.lateReason && <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-none text-[7px] font-black uppercase">Lateness Reported</Badge>}
                                                        {log.eodReport && <Badge variant="outline" className="bg-primary/10 text-primary border-none text-[7px] font-black uppercase">EOD Filed</Badge>}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase opacity-10 tracking-widest">No Intelligence</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {historyTimeframe === 'MONTHLY' && historicalDisplayData && (
                    <div className="space-y-12">
                        {(historicalDisplayData as any[]).map((week, wIdx) => (
                            <div key={wIdx} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-[10px] font-black text-primary bg-primary/10 px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">{week.label}</h3>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                                    {week.days.map((item: any, dIdx: number) => (
                                        <div key={dIdx} className={cn(
                                            "p-4 rounded-2xl border transition-all flex flex-col justify-between h-32",
                                            isWeekend(item.day) ? "hidden" : "bg-white/5 border-white/5 hover:border-primary/30"
                                        )}>
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{format(item.day, 'EEE dd')}</p>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black font-mono tracking-tighter text-white">
                                                    {item.log ? `${format(new Date(item.log.clockIn), 'HH:mm')} - ${item.log.clockOut ? format(new Date(item.log.clockOut), 'HH:mm') : '...'}` : '--:--'}
                                                </p>
                                                {item.log && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {item.log.lateReason && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Lateness Reported" />}
                                                        {item.log.eodReport && <div className="h-1.5 w-1.5 rounded-full bg-primary" title="EOD Filed" />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}
        </div>
      </Card>

      {/* ACTIVE ROSTER SHEET */}
      <Sheet open={isRosterOpen} onOpenChange={setIsRosterOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] bg-[#0f172a] border-l border-white/5 p-0 flex flex-col overflow-hidden shadow-3xl">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-8 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 shadow-inner border border-blue-500/20">
                        <User className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-start">
                        <SheetTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white leading-none mb-1">
                            Active Roster
                        </SheetTitle>
                        <SheetDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            Real-time operational drill-down for {format(new Date(), 'MMMM yyyy')}
                        </SheetDescription>
                    </div>
                </div>
            </SheetHeader>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-8 py-6">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-2 mb-6">
                      <ArrowRight className="w-4 h-4 text-amber-500" /> Units Currently Signed In
                    </h4>

                    <div className="space-y-3">
                      {filteredRoster.filter(item => item.status === 'ON_TIME' || item.status === 'LATE').length === 0 ? (
                        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl opacity-20 italic text-xs uppercase tracking-widest">
                            No units identified in this sector.
                        </div>
                      ) : (
                        filteredRoster.filter(item => item.status === 'ON_TIME' || item.status === 'LATE').map(({ staff, log }) => (
                          <div
                            key={staff.id}
                            onClick={() => setSelectedStaffForHistory(staff)}
                            className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 rounded-full bg-[#334155] border border-white/10 flex items-center justify-center font-black text-xs text-white shadow-inner">
                                    <AvatarFallback className="bg-transparent">{staff.fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-wider">{staff.fullName}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 flex items-center gap-1.5 mt-0.5">
                                        <LogIn className="w-3 h-3" /> {log ? format(new Date(log.clockIn), 'hh:mm aa') : '--:--'}
                                    </p>
                                </div>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md">LIVE</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            <div className="p-8 border-t border-white/5 mt-auto">
                <Button
                    variant="ghost"
                    className="w-full h-14 rounded-2xl bg-transparent border-none text-white font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-between px-6 hover:bg-white/5 transition-all group"
                    onClick={() => setIsRosterOpen(false)}
                >
                    <span>Close Intelligence Drill-Down</span>
                    <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-black group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* HISTORY MODAL PORTAL */}
      {selectedStaffForHistory && (
          <InsightCalendarModal
              isOpen={!!selectedStaffForHistory}
              onClose={() => setSelectedStaffForHistory(null)}
              staff={selectedStaffForHistory}
              attendanceLogs={attendanceLogs}
              pulseFeed={pulseFeed}
              nominations={nominations}
              leaveRequests={leaveRequests}
          />
      )}
    </div>
  )
}

'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useEmployee360 } from '@/hooks/useEmployee360';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, DailyReport, Task, Attendance, PulseCheck } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/formatters';
import {
  User,
  Timer,
  ListTodo,
  FileText,
  ExternalLink,
  Activity,
  CheckCircle2,
  Clock,
  Circle,
  Eye,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { formatDistanceToNow, format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval, isSameDay, parseISO, isWeekend } from 'date-fns';
import { useSuperAdminMode } from '@/context/SuperAdminModeProvider';
import { useImpersonation } from '@/context/ImpersonationProvider';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface StaffQuickViewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  orgId: string;
  onViewFullProfile: (userId: string) => void;
}

export function WeeklyAttendanceLedger({
    attendanceLogs = [],
    reportsData = [],
    pulseChecks = [],
    staffId
}: {
    attendanceLogs: Attendance[],
    reportsData: DailyReport[],
    pulseChecks: PulseCheck[],
    staffId: string
}) {
  const [referenceDate, setReferenceDate] = useState(() => {
    const today = new Date()
    return today.getDay() === 1 ? subWeeks(today, 1) : today
  })

  const handlePrevWeek = () => setReferenceDate(prev => subWeeks(prev, 1))
  const handleNextWeek = () => setReferenceDate(prev => addWeeks(prev, 1))

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })
  const isCurrentWeek = startOfWeek(referenceDate, { weekStartsOn: 1 }).getTime() >= startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()

  const weeklyData = useMemo(() => {
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(d => !isWeekend(d))

    return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const log = attendanceLogs.find(l => l.date === dateStr)
        const report = reportsData.find(r => r.reportDate === dateStr)
        const pulse = pulseChecks.find(p => p.date === dateStr)

        let status = "ABSENT"
        let timeRange = "--"
        if (log) {
            status = log.status === 'APPROVED' ? (log.remarks?.includes('LATE') ? 'LATE' : 'PRESENT') : log.status
            const inTime = format(new Date(log.clockIn), 'HH:mm')
            const outTime = log.clockOut ? format(new Date(log.clockOut), 'HH:mm') : '...'
            timeRange = `${inTime} - ${outTime}`
        }

        return {
            id: dateStr,
            date: format(day, 'MMM dd'),
            fullDate: format(day, 'EEEE, MMM dd'),
            status,
            timeRange,
            pulse: pulse?.mood || (report?.pulse === 'STRUGGLING' ? 'OVERWHELMED' : 'SMOOTH'),
            lateReason: log?.lateReason || null,
            reportText: report?.content || report?.accomplishments || null
        }
    }).reverse()
  }, [weekStart, weekEnd, attendanceLogs, reportsData, pulseChecks])

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
           <CalendarClock className="h-3 w-3" />
           Weekly Ledger
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-white/5" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-white/5" onClick={handleNextWeek} disabled={isCurrentWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-2">
        {weeklyData.map((day) => (
          <AccordionItem key={day.id} value={day.id} className="border border-white/5 bg-white/[0.02] rounded-2xl px-4 overflow-hidden shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4 group">
              <div className="flex items-center justify-between w-full pr-4">
                <span className="text-xs font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">{day.date}</span>
                <div className="flex items-center gap-4">
                  <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border-none",
                      day.status === 'PRESENT' ? "bg-emerald-500/10 text-emerald-500" :
                      day.status === 'LATE' ? "bg-amber-500/10 text-amber-500" :
                      "bg-rose-500/10 text-rose-500"
                  )}>
                    {day.status}
                  </span>
                  <span className="text-[10px] font-black font-mono text-muted-foreground opacity-60 min-w-[80px] text-right">{day.timeRange}</span>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="pb-6 pt-1 space-y-4">
              <div className="flex items-center gap-3 px-1">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground opacity-40">Daily Pulse</span>
                <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full",
                    day.pulse === 'OVERWHELMED' || day.pulse === 'HEAVY' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'
                )}>
                  {day.pulse}
                </span>
              </div>

              {day.lateReason && (
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl space-y-1 shadow-inner">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        <span className="text-[8px] uppercase font-black tracking-widest text-amber-500">Lateness Justification</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed font-medium italic">
                        "{day.lateReason}"
                    </p>
                </div>
              )}

              <div className="bg-black/20 border border-white/5 p-4 rounded-xl space-y-2 shadow-inner">
                <div className="flex items-center gap-2 mb-1">
                   <FileText className="w-3 h-3 text-primary" />
                   <span className="text-[8px] uppercase font-black tracking-widest text-primary">Daily Report</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed italic font-medium">
                  {day.reportText ? `"${day.reportText}"` : "No report data filed for this cycle."}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

export function StaffQuickViewSheet({ isOpen, onClose, userId, orgId, onViewFullProfile }: StaffQuickViewSheetProps) {
  const { data, isLoading } = useEmployee360(userId || undefined, orgId);
  const firestore = useFirestore();
  const { isSuperAdminModeActive } = useSuperAdminMode();
  const { setImpersonatedUserId, setIsImpersonating } = useImpersonation();
  const { toast } = useToast();

  const profile = data?.profile;
  const attendance = data?.attendance;
  const tasks = data?.tasks;
  const reportsData = data?.reports;
  const pulseChecks = data?.pulseChecks;

  const activeTasks = useMemo(() => {
    return tasks?.filter(t => t.status !== 'ARCHIVED') || [];
  }, [tasks]);

  const latestAttendance = attendance?.[0];
  const isOnline = profile?.status === 'ONLINE' || profile?.status === 'ACTIVE';

  if (!userId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md apple-glass-darker border-l border-white/10 p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-8 pb-4 shrink-0">
          <SheetTitle className="sr-only">Staff Quick View</SheetTitle>
          <SheetDescription className="sr-only">Rapid overview of personnel metrics and active tasks.</SheetDescription>

          <div className="flex flex-col gap-4">
            {isLoading ? (
                <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
                </div>
            ) : profile ? (
                <div className="flex items-center gap-5">
                <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-white/10 rounded-2xl shadow-2xl">
                    <AvatarImage src={profile.avatarUrl || ''} />
                    <AvatarFallback className="bg-secondary text-white font-black text-lg">{profile.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isOnline && <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />}
                </div>
                <div className="min-w-0">
                    <h2 className="text-xl font-black font-headline tracking-tighter uppercase truncate">{profile.fullName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{profile.jobTitle || 'Unit Staff'}</p>
                    <Circle className="h-1 w-1 fill-white/20 text-white/20" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{profile.departmentName || 'Operations'}</p>
                    </div>
                </div>
                </div>
            ) : null}

            {isSuperAdminModeActive && profile && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl h-10 font-black uppercase text-[9px] tracking-widest transition-all group"
                    onClick={() => {
                        setImpersonatedUserId(profile.id);
                        setIsImpersonating(true);
                        toast({ title: "Identity Assumed", description: `You are now operating as ${profile.fullName}.` });
                        onClose();
                    }}
                >
                    <Eye className="mr-2 h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                    Impersonate User
                </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 space-y-8 pb-32">
          {/* Live Metrics Grid */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                <Activity className="h-3 w-3" />
                Activity Status
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                   <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40 tracking-widest">Shift Progress</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {latestAttendance ? formatDuration(latestAttendance.duration) : '00:00:00'}
                      </span>
                   </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                   <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40 tracking-widest">Last Sync</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-white uppercase tracking-tight">
                        {profile?.lastHeartbeat ? formatDistanceToNow(new Date(profile.lastHeartbeat), { addSuffix: true }) : 'N/A'}
                      </span>
                   </div>
                </div>
             </div>
          </section>

          {/* Active Tasks */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                    <ListTodo className="h-3 w-3" />
                    Active Tasks
                </div>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-black bg-primary/10 border-primary/20 text-primary uppercase">
                    {activeTasks.length} In Progress
                </span>
             </div>
             <div className="space-y-2">
                {isLoading ? (
                    <Skeleton className="h-20 w-full rounded-xl" />
                ) : activeTasks.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-white/5 rounded-2xl opacity-20">
                        <p className="text-[10px] font-black uppercase tracking-widest">Zero Active Tasks</p>
                    </div>
                ) : (
                    activeTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between group">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold text-white truncate leading-none">{task.title}</p>
                                <p className="text-[8px] font-black uppercase text-muted-foreground mt-1 tracking-tighter opacity-50">{task.priority} PRIORITY</p>
                            </div>
                            <Clock className="h-3 w-3 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))
                )}
             </div>
          </section>

          {/* WEEKLY LEDGER (Merged Attendance & Reports) */}
          <WeeklyAttendanceLedger
            staffId={userId}
            attendanceLogs={attendance || []}
            reportsData={reportsData || []}
            pulseChecks={pulseChecks || []}
          />
        </div>

        <SheetFooter className="p-8 border-t border-white/5 bg-black/20 shrink-0">
          <Button
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 m3-interactive"
            onClick={() => {
                onClose();
                onViewFullProfile(userId);
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Full Profile 360
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

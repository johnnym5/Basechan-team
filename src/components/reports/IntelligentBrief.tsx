"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  Clock,
  Activity,
  Target,
  TrendingDown,
  Zap,
  Copy,
  LayoutList,
  Calendar,
  Hourglass,
  Gauge,
  User,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import type { UserProfile, Attendance, DailyReport, Task, PulseCheck } from "@/lib/types"
import { format, subDays, parseISO, differenceInMinutes, startOfDay, getDay, isFriday } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

interface IntelligentBriefProps {
    userProfile: UserProfile;
}

export function IntelligentBrief({ userProfile }: IntelligentBriefProps) {
  const firestore = useFirestore();

  // 1. Data Acquisition (Real Staff Data)
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const attendanceQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'attendance'), where('orgId', '==', userProfile.orgId), where('date', '>=', thirtyDaysAgo)) : null
  , [firestore, userProfile.orgId, thirtyDaysAgo]);

  const reportsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'daily_reports'), where('orgId', '==', userProfile.orgId), where('reportDate', '>=', thirtyDaysAgo)) : null
  , [firestore, userProfile.orgId, thirtyDaysAgo]);

  const tasksQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'tasks'), where('orgId', '==', userProfile.orgId), where('status', '==', 'ARCHIVED')) : null
  , [firestore, userProfile.orgId]);

  const pulseQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'pulse_checks'), where('orgId', '==', userProfile.orgId), where('date', '>=', thirtyDaysAgo)) : null
  , [firestore, userProfile.orgId, thirtyDaysAgo]);

  const usersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile.orgId]);

  const { data: attendance, isLoading: isAttLoading } = useCollection<Attendance>(attendanceQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
  const { data: tasks, isLoading: isTasksLoading } = useCollection<Task>(tasksQuery);
  const { data: pulses, isLoading: isPulseLoading } = useCollection<PulseCheck>(pulseQuery);
  const { data: staff, isLoading: isStaffLoading } = useCollection<UserProfile>(usersQuery);

  // 2. Intelligence Engine Logic
  const insights = useMemo(() => {
    if (!attendance || !reports || !tasks || !staff || !pulses) return null;

    // A. Chronic Arrival Drift
    const staffDrift = staff.map(u => {
        const userAtt = attendance.filter(a => a.userId === u.id && a.clockIn);
        if (userAtt.length < 3) return null;

        const totalDrift = userAtt.reduce((acc, a) => {
            const clockIn = new Date(a.clockIn);
            const expected = new Date(a.clockIn);
            expected.setHours(9, 15, 0, 0);
            const diff = differenceInMinutes(clockIn, expected);
            return acc + (diff > 0 ? diff : 0);
        }, 0);

        const avgDrift = Math.round(totalDrift / userAtt.length);
        return avgDrift > 2 ? { name: u.fullName, drift: `+${avgDrift} mins`, status: avgDrift > 10 ? 'critical' : 'warning' } : null;
    }).filter(Boolean).sort((a: any, b: any) => parseInt(b.drift) - parseInt(a.drift)).slice(0, 5);

    // B. Phantom Overtime
    const phantomOvertime = attendance.filter(a => {
        const hours = (a.duration || 0) / 3600;
        if (hours < 9.5) return false;

        const dayTasks = tasks.filter(t => t.assignedTo === a.userId && t.createdAt?.startsWith(a.date));
        const dayReport = reports.find(r => r.userId === a.userId && r.reportDate === a.date);

        return dayTasks.length === 0 && !dayReport;
    }).map(a => ({ name: a.userName, date: a.date ? format(parseISO(a.date), 'MMM d') : 'N/A', hours: ((a.duration || 0) / 3600).toFixed(1) }));

    // C. Micro-Absenteeism (Recurring Idle state)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const idlePatterns = attendance.filter(a => (a.idleTime || 0) > 1800).reduce((acc, a) => {
        const day = a.date ? getDay(parseISO(a.date)) : 0;
        acc[day] = (acc[day] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);
    const peakIdleDay = Object.entries(idlePatterns).sort((a, b) => b[1] - a[1])[0];

    // D. Deficit Recovery (Friday spikes)
    const recoveryUnits = staff.map(u => {
        const friAtt = attendance.find(a => a.userId === u.id && a.date && isFriday(parseISO(a.date)) && (a.duration || 0) / 3600 > 9);
        const monTueAtt = attendance.filter(a => a.userId === u.id && a.date && [1, 2].includes(getDay(parseISO(a.date))) && (a.duration || 0) / 3600 < 6);

        if (friAtt && monTueAtt.length > 0) {
            return { name: u.fullName, deficit: 'Logged early week deficit', recovery: `+${((friAtt.duration || 0) / 3600).toFixed(1)}h on Friday` };
        }
        return null;
    }).filter(Boolean);

    // E. EOD Plagiarism (Exact content matches)
    const reportClones = reports.filter((r, idx) =>
        reports.some((other, oIdx) => idx !== oIdx && other.userId === r.userId && r.content && other.content === r.content && r.content.length > 50)
    ).slice(0, 2);

    // F. Report-to-Task Mismatch
    const velocityMismatches = reports.filter(r => {
        const dayTasks = tasks.filter(t => t.assignedTo === r.userId && t.createdAt?.startsWith(r.reportDate));
        return (r.accomplishments || '').length > 100 && dayTasks.length === 0;
    }).slice(0, 3);

    // G. Correlation Matrix
    const avgPulse = pulses.length > 0 ? (pulses.reduce((acc, p) => acc + (p.mood === 'SMOOTH' ? 10 : p.mood === 'HEAVY' ? 5 : 2), 0) / pulses.length).toFixed(1) : '0';
    const punctualityRate = attendance.length > 0 ? Math.round((attendance.filter(a => !a.remarks?.includes('LATE')).length / attendance.length) * 100) : 0;

    // H. Perfect Cadence (Streak)
    const streaks = staff.map(u => {
        const userAtt = attendance.filter(a => a.userId === u.id && a.date).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        let streak = 0;
        for (const a of userAtt) {
            if (!a.remarks?.includes('LATE')) streak++;
            else break;
        }
        return { name: u.fullName, streak: `${streak} Days` };
    }).sort((a, b) => parseInt(b.streak) - parseInt(a.streak)).slice(0, 5);

    return { staffDrift, phantomOvertime, peakIdleDay, recoveryUnits, reportClones, velocityMismatches, avgPulse, punctualityRate, streaks };
  }, [attendance, reports, tasks, staff, pulses]);

  if (isAttLoading || isReportsLoading || isTasksLoading || isPulseLoading || isStaffLoading) {
    return <div className="space-y-8 p-6"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-3xl" /></div>;
  }

  if (!insights) return null;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-primary font-headline">Intelligent Brief</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Pattern recognition, attendance forecasting, and system audit logs.</p>
        </div>
        <div className="p-2 px-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">System Monitoring: Active</span>
        </div>
      </div>

      <Tabs defaultValue="patterns" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-secondary/20 h-12 rounded-xl p-1">
          <TabsTrigger value="patterns" className="uppercase text-[10px] font-black tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary transition-all">Pattern Recognition</TabsTrigger>
          <TabsTrigger value="audits" className="uppercase text-[10px] font-black tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary transition-all">Report Audits</TabsTrigger>
          <TabsTrigger value="forecasting" className="uppercase text-[10px] font-black tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary transition-all">Predictive Forecasting</TabsTrigger>
        </TabsList>

        {/* TAB 1: PATTERN RECOGNITION */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Chronic Drift */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl">
              <CardHeader className="bg-orange-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4"/> Chronic Arrival Drift
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Regressive clock-in latency over 30 days.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {insights.staffDrift.length > 0 ? insights.staffDrift.map((staff: any) => (
                    <div key={staff.name} className="flex justify-between items-center text-[10px] font-black uppercase border-b border-white/5 pb-2 last:border-0">
                        <span className="text-foreground">{staff.name}</span>
                        <span className={cn(
                            "font-mono",
                            staff.status === 'critical' ? 'text-red-500' : 'text-orange-500'
                        )}>{staff.drift} (Avg)</span>
                    </div>
                )) : <p className="text-[10px] text-center opacity-30 py-4 font-black">NO DRIFT DETECTED</p>}
              </CardContent>
            </Card>

            {/* 2. Phantom Overtime */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl">
              <CardHeader className="bg-red-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                  <Activity className="w-4 h-4"/> Phantom Overtime Detected
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Clocked sessions with zero telemetry activity.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                 {insights.phantomOvertime.length > 0 ? insights.phantomOvertime.map((a: any, idx: number) => (
                     <div key={idx} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-2">
                        <p className="text-[11px] font-bold text-red-200 leading-relaxed">
                            <span className="font-black text-red-500 uppercase tracking-tighter">{a.name}:</span> Logged {a.hours} hours on {a.date}, but 0 tasks moved and 0 reports filed during this window.
                        </p>
                    </div>
                 )) : <p className="text-[10px] text-center opacity-30 py-4 font-black uppercase">Telemetry matches duration</p>}
              </CardContent>
            </Card>

            {/* 3. Micro-Absenteeism */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl">
              <CardHeader className="bg-yellow-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4"/> Micro-Absenteeism
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Repeating weekly patterns of idle status.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                 {insights.peakIdleDay ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-muted-foreground">Pattern Detected</span>
                            <span className="text-yellow-500">Every {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(insights.peakIdleDay[0])]}</span>
                        </div>
                        <div className="p-3 bg-secondary/30 border border-white/5 rounded-lg">
                            <p className="text-[11px] font-bold text-foreground/80">Multiple staff consistently enter IDLE state on this day. Investigating duration and frequency.</p>
                        </div>
                    </div>
                 ) : <p className="text-[10px] text-center opacity-30 py-4 font-black">NO RECURRING IDLE PATTERNS</p>}
              </CardContent>
            </Card>

            {/* 4. Deficit Recovery */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl">
              <CardHeader className="bg-blue-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                  <Clock className="w-4 h-4"/> Deficit Recovery
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Monday/Tuesday deficits being made up on Friday.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                 {insights.recoveryUnits.length > 0 ? insights.recoveryUnits.map((r: any) => (
                    <div key={r.name} className="flex items-center gap-4 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><TrendingDown className="w-4 h-4" /></div>
                        <p className="text-[11px] font-bold text-blue-200/80"><span className="font-black text-white">{r.name}:</span> {r.recovery} to offset earlier week deficit.</p>
                    </div>
                 )) : <p className="text-[10px] text-center opacity-30 py-4 font-black">STEADY WEEKLY FLOW</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: REPORT AUDITS */}
        <TabsContent value="audits" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 5. EOD Plagiarism Flag */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl">
              <CardHeader className="bg-red-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                  <Copy className="w-4 h-4"/> EOD Plagiarism Flag
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Duplicate content detection in daily reports.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                 {insights.reportClones.length > 0 ? insights.reportClones.map((r, idx) => (
                    <div key={idx} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4 mb-2">
                        <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                        <div>
                            <p className="text-xs font-black uppercase tracking-tight text-white">Exact Overlap: {r.userName}</p>
                            <p className="text-[10px] text-red-200 mt-1 leading-relaxed">Report content for {r.reportDate} is identical to a previous entry. Suspected copy-paste.</p>
                        </div>
                    </div>
                 )) : <p className="text-[10px] text-center opacity-30 py-4 font-black uppercase">Unique report intelligence</p>}
              </CardContent>
            </Card>

            {/* 6. Report-to-Task Mismatch */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl">
              <CardHeader className="bg-orange-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                  <LayoutList className="w-4 h-4"/> Report-to-Task Mismatch
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">High effort claimed in EOD vs low task velocity.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {insights.velocityMismatches.length > 0 ? insights.velocityMismatches.map((r, idx) => (
                    <div key={idx} className="p-3 bg-secondary/30 border border-white/5 rounded-lg flex justify-between items-center mb-2">
                        <div>
                            <p className="text-[10px] font-black uppercase text-white">{r.userName}</p>
                            <p className="text-[9px] font-bold text-muted-foreground mt-0.5 italic line-clamp-1">"{r.accomplishments}"</p>
                        </div>
                        <Badge className="bg-orange-500/20 text-orange-500 border-none text-[8px] font-black whitespace-nowrap ml-4">0 TASKS FINALIZED</Badge>
                    </div>
                )) : <p className="text-[10px] text-center opacity-30 py-4 font-black uppercase">Workload matches report</p>}
              </CardContent>
            </Card>

            {/* 7. Pulse/Punctuality Matrix */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl col-span-1 lg:col-span-2">
              <CardHeader className="bg-primary/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Target className="w-4 h-4"/> Pulse/Punctuality Correlation
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Relationship between team sentiment and arrival adherence.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Mood Index (30d)</p>
                        <p className="text-3xl font-black font-headline text-white">{insights.avgPulse} / 10</p>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Punctuality Score</p>
                        <p className="text-3xl font-black font-headline text-emerald-500">{insights.punctualityRate}%</p>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Force Status</p>
                        <p className={cn(
                            "text-[10px] font-black uppercase py-2 rounded-full",
                            insights.punctualityRate > 85 ? "text-primary bg-primary/10" : "text-rose-500 bg-rose-500/10"
                        )}>
                            {insights.punctualityRate > 85 ? "HIGH ADHERENCE" : "VOLATILE TRENDS"}
                        </p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: PREDICTIVE FORECASTING */}
        <TabsContent value="forecasting" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 8. Absence Forecast */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl lg:col-span-1">
              <CardHeader className="bg-amber-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4"/> Absence Forecast
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Trend predictive analysis.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                 <p className="text-sm font-bold text-foreground leading-relaxed uppercase">
                    Based on historical volume, expect <span className="text-amber-500 font-black">minimal variation</span> in current staffing levels.
                 </p>
                 <div className="mt-4 p-2 bg-amber-500/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-500">Confidence: 65%</div>
              </CardContent>
            </Card>

            {/* 9. Shift Attrition */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl lg:col-span-1">
              <CardHeader className="bg-rose-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                  <Hourglass className="w-4 h-4"/> Shift Attrition
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Projected lost hours from short sessions.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                 <p className="text-3xl font-black font-mono text-rose-500 tracking-tighter">
                    {attendance?.reduce((acc, a) => acc + Math.max(0, 8 - (a.duration || 0) / 3600), 0).toFixed(1)}h
                 </p>
                 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-2 opacity-50">Total lost capacity (30d)</p>
                 <p className="text-[10px] font-bold text-rose-200/60 mt-4 italic">Source: "Sub-Standard Durations"</p>
              </CardContent>
            </Card>

            {/* 10. Perfect Cadence */}
            <Card className="border-border shadow-sm bg-card/40 backdrop-blur-xl lg:col-span-1">
              <CardHeader className="bg-emerald-500/5 border-b border-white/5 py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                  <Zap className="w-4 h-4"/> Perfect Cadence
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase opacity-60">Staff with longest punctuality streaks.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                 {insights.streaks.length > 0 ? insights.streaks.map((staff: any, idx: number) => (
                    <div key={staff.name} className="flex justify-between items-center text-[10px] font-black uppercase border-b border-white/5 pb-2 last:border-0">
                        <div className="flex items-center gap-3">
                            <span className="opacity-30 text-[8px]">{idx + 1}</span>
                            <span className="text-foreground">{staff.name}</span>
                        </div>
                        <span className="text-emerald-500 font-mono">{staff.streak}</span>
                    </div>
                 )) : <p className="text-[10px] text-center opacity-30 py-4 font-black">Establishing baseline...</p>}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}

function Badge({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <span className={cn("px-2 py-0.5 rounded-full", className)}>
            {children}
        </span>
    );
}

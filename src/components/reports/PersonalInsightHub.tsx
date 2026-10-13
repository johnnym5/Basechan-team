"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  Clock,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
  Trophy,
  Check,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import type { UserProfile, Attendance, DailyReport, Task, LeaveRequest, PulseCheck, Kudos } from "@/lib/types";
import { InsightEngine } from "@/lib/InsightEngine";
import { uiEmitter } from "@/lib/ui-emitter";
import { subDays, format } from "date-fns";

interface PersonalInsightHubProps {
  userProfile: UserProfile;
}

export function PersonalInsightHub({ userProfile }: PersonalInsightHubProps) {
  const firestore = useFirestore();

  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const attendanceQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId),
      where('date', '>=', thirtyDaysAgo),
      limit(100)
    ) : null
  , [firestore, userProfile.orgId, thirtyDaysAgo]);

  const reportsQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'daily_reports'),
      where('orgId', '==', userProfile.orgId),
      where('reportDate', '>=', thirtyDaysAgo),
      limit(100)
    ) : null
  , [firestore, userProfile.orgId, thirtyDaysAgo]);

  const tasksQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'tasks'),
      where('orgId', '==', userProfile.orgId),
      limit(100)
    ) : null
  , [firestore, userProfile.orgId]);

  const leaveQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'leave_requests'),
      where('orgId', '==', userProfile.orgId),
      limit(100)
    ) : null
  , [firestore, userProfile.orgId]);

  const pulseQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'pulse_checks'),
      where('orgId', '==', userProfile.orgId),
      limit(100)
    ) : null
  , [firestore, userProfile.orgId]);

  const kudosQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'kudos'),
      where('orgId', '==', userProfile.orgId),
      limit(100)
    ) : null
  , [firestore, userProfile.orgId]);

  const { data: attendance, isLoading: isAttLoading } = useCollection<Attendance>(attendanceQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
  const { data: tasks, isLoading: isTasksLoading } = useCollection<Task>(tasksQuery);
  const { data: leaveRequests, isLoading: isLeaveLoading } = useCollection<LeaveRequest>(leaveQuery);
  const { data: pulses, isLoading: isPulseLoading } = useCollection<PulseCheck>(pulseQuery);
  const { data: kudos, isLoading: isKudosLoading } = useCollection<Kudos>(kudosQuery);

  const isLoading = isAttLoading || isReportsLoading || isTasksLoading || isLeaveLoading || isPulseLoading || isKudosLoading;

  const summary = useMemo(() => {
    if (!userProfile || !attendance || !tasks || !reports || !leaveRequests || !pulses) return null;

    return InsightEngine.evaluatePersonalSummary({
      userProfile,
      attendance,
      tasks,
      reports,
      leaveRequests,
      pulses,
      kudos: kudos || [],
    });
  }, [userProfile, attendance, tasks, reports, leaveRequests, pulses, kudos]);

  const handleDirectiveClick = (directive: any) => {
    if (directive.actionType) {
      uiEmitter.emit(directive.actionType as any, directive.payload);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-96 rounded-3xl" />
          <Skeleton className="lg:col-span-5 h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const {
    score,
    trend,
    reportStreakDays,
    punctualityStreakDays,
    totalOperationsThisWeek,
    weeklyWins,
    dailyWorkNote,
    needsAttentionQueue,
    attendanceAudit,
    healthMetrics,
  } = summary;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">

      {/* 1. HERO PERFORMANCE BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 bg-card/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-foreground font-headline">
              Personal Intelligence Companion
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">
              Active Duty Profile
            </Badge>
          </div>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">
            Real-time performance metrics, streak achievements, and action queue
          </p>

          {/* Active Streaks Bar */}
          <div className="flex flex-wrap gap-2 pt-2">
            {reportStreakDays > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-3 py-1 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {reportStreakDays}-Day Report Streak
              </Badge>
            )}
            {punctualityStreakDays > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider px-3 py-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                {punctualityStreakDays}-Shift On-Time Streak
              </Badge>
            )}
          </div>
        </div>

        {/* Hero Indicators */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="p-4 px-6 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-4">
            <Gauge className="w-6 h-6 text-primary shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Performance Score</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={cn(
                  "text-2xl font-black font-mono leading-none",
                  score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400"
                )}>
                  {score} / 100
                </p>
                {trend === 'UPWARD' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                {trend === 'DOWNWARD' && <TrendingDown className="w-4 h-4 text-rose-400" />}
              </div>
            </div>
          </div>

          <div className="p-4 px-6 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-4">
            <Zap className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Operations Logged</p>
              <p className="text-2xl font-black font-mono text-emerald-400 leading-none mt-0.5">
                {totalOperationsThisWeek}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ASYMMETRIC DUAL-PANEL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT PANEL (60% ACHIEVEMENTS & WORK NOTE) */}
        <div className="lg:col-span-7 space-y-6">

          {/* A. WEEKLY WINS & HIGHLIGHTS */}
          <Card className="border-border/50 shadow-xl bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-primary/5 border-b border-white/5 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Weekly Achievements & Highlights
                </CardTitle>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                  {weeklyWins.length} Highlights
                </Badge>
              </div>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                Real-time weekly accomplishments computed from your activity logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {weeklyWins.map(win => (
                <div
                  key={win.id}
                  className="p-4 rounded-2xl bg-secondary/20 border border-white/5 flex items-start gap-4 transition-all hover:bg-secondary/30"
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                    {win.iconType === 'trophy' && <Trophy className="w-4 h-4 text-amber-400" />}
                    {win.iconType === 'check' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {win.iconType === 'clock' && <Clock className="w-4 h-4 text-blue-400" />}
                    {win.iconType === 'zap' && <Zap className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight text-foreground">{win.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium mt-1">
                      {win.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* B. DAILY WORK NOTE */}
          <Card className="border-border/50 shadow-xl bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-secondary/10 border-b border-white/5 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Daily Work Note
                </CardTitle>
                <Badge
                  variant={dailyWorkNote.quality === 'GOOD' ? 'default' : 'secondary'}
                  className="text-[9px] font-black uppercase tracking-widest"
                >
                  Quality: {dailyWorkNote.quality}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 italic text-xs leading-relaxed text-foreground/90 font-medium">
                "{dailyWorkNote.text}"
              </div>

              {dailyWorkNote.warningMessage && (
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  {dailyWorkNote.warningMessage}
                </p>
              )}
            </CardContent>
          </Card>

          {/* C. ATTENDANCE & SCHEDULED REST AUDIT */}
          <Card className="border-border/50 shadow-xl bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-emerald-500/5 border-b border-white/5 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Attendance & Time-Off Audit
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                Cross-references shift clock-ins with approved leave requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {attendanceAudit.approvedRest.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
                    <span>Approved Time Off ({item.date})</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px]">{item.type}</Badge>
                </div>
              ))}

              {attendanceAudit.pendingValidation.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2 text-amber-300">
                    <CalendarClock className="w-4 h-4 text-amber-400" />
                    <span>Pending Leave Approval ({item.date})</span>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-none text-[8px]">{item.type}</Badge>
                </div>
              ))}

              {attendanceAudit.unexcused.map((dateStr, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2 text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Unexcused Shift Absence ({dateStr})</span>
                  </div>
                  <Badge className="bg-rose-500/20 text-rose-400 border-none text-[8px]">Unapproved</Badge>
                </div>
              ))}

              {attendanceAudit.approvedRest.length === 0 && attendanceAudit.pendingValidation.length === 0 && attendanceAudit.unexcused.length === 0 && (
                <p className="text-[10px] text-center opacity-40 py-4 font-black uppercase tracking-wider">
                  100% Shift Adherence — Zero Unexcused Absences
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL (40% NEEDS ATTENTION & HEALTH MATRIX) */}
        <div className="lg:col-span-5 space-y-6">

          {/* A. NEEDS ATTENTION / ACTION QUEUE */}
          <Card className="border-border/50 shadow-xl bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-amber-500/5 border-b border-white/5 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Needs Attention Queue
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                Action items requiring your direct resolution.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {needsAttentionQueue.length > 0 ? (
                needsAttentionQueue.map(directive => (
                  <div key={directive.id} className="p-4 rounded-2xl bg-secondary/30 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-tight text-foreground">{directive.title}</p>
                      <Badge
                        variant={directive.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                        className="text-[8px] font-black uppercase"
                      >
                        {directive.severity}
                      </Badge>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                      {directive.description}
                    </p>

                    <Button
                      size="sm"
                      onClick={() => handleDirectiveClick(directive)}
                      className="w-full h-9 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-all group"
                    >
                      {directive.actionText}
                      <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">All Systems Nominal</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                    Zero friction items pending resolution. Excellent operational posture.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* B. HEALTH MATRIX */}
          <Card className="border-border/50 shadow-xl bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-primary/5 border-b border-white/5 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Activity className="w-4 h-4" /> Operational Health Matrix
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                Normalized performance metrics for active duty cycle.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Punctuality Score</span>
                  <span className="text-primary font-mono">{healthMetrics.punctualityScore}%</span>
                </div>
                <Progress value={healthMetrics.punctualityScore} className="h-2 bg-secondary/50" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Task Turnaround Index</span>
                  <span className="text-emerald-400 font-mono">{healthMetrics.taskVelocityScore}%</span>
                </div>
                <Progress value={healthMetrics.taskVelocityScore} className="h-2 bg-secondary/50" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Reporting Cadence</span>
                  <span className="text-blue-400 font-mono">{healthMetrics.debriefCadenceScore}%</span>
                </div>
                <Progress value={healthMetrics.debriefCadenceScore} className="h-2 bg-secondary/50" />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

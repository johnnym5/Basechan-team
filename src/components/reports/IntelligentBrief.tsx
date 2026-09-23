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
  FileCheck2,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import type { UserProfile, Attendance, DailyReport, Task, LeaveRequest, PulseCheck, Kudos } from "@/lib/types";
import { InsightEngine } from "@/lib/InsightEngine";
import { uiEmitter } from "@/lib/ui-emitter";
import { subDays, format } from "date-fns";

interface IntelligentBriefProps {
  userProfile: UserProfile;
}

export function IntelligentBrief({ userProfile }: IntelligentBriefProps) {
  const firestore = useFirestore();

  // 30-day window data queries
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

  // Pure Deterministic Insight Engine Evaluation v2.0
  const engineResult = useMemo(() => {
    if (!userProfile || !attendance || !tasks || !reports || !leaveRequests || !pulses) return null;

    return InsightEngine.evaluate({
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
        <Skeleton className="h-12 w-1/3 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-96 rounded-3xl" />
          <Skeleton className="lg:col-span-5 h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!engineResult) return null;

  const { momentum, punctualitySlope, punctualityStatus, absenceTriage, fatigue, sanitizedMemo, directives, behavioralPatterns, totalOperations } = engineResult;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card/40 border border-border/50 rounded-[2.5rem] backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black uppercase tracking-wider text-foreground font-headline">Personal Intelligence Brief</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">
              Deterministic Math Engine v2.0
            </Badge>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">
            Real-time algorithmic performance telemetry & trajectory modeling (Zero Token Cost)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 px-5 rounded-2xl bg-secondary/30 border border-white/5 flex items-center gap-3">
            <Gauge className="w-5 h-5 text-primary" />
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Momentum Index</p>
              <p className="text-xl font-black font-mono text-primary leading-none">{momentum.omi} / 100</p>
            </div>
          </div>

          <div className="p-3 px-5 rounded-2xl bg-secondary/30 border border-white/5 flex items-center gap-3">
            <Zap className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Total Operations</p>
              <p className="text-xl font-black font-mono text-emerald-500 leading-none">{totalOperations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ASYMMETRIC DUAL-PANEL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT PANEL (60% OPERATIONAL CONSOLE) */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. OPERATIONAL TRAJECTORY */}
          <Card className="border-border/50 shadow-lg bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-primary/5 border-b border-white/5 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Operational Trajectory & Cadence
                </CardTitle>
                <Badge variant={punctualityStatus === 'DEGRADING' ? 'destructive' : 'default'} className="text-[9px] font-black uppercase tracking-widest">
                  {punctualityStatus}
                </Badge>
              </div>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">10-shift arrival regression slope ($\beta$ drift velocity).</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-secondary/20 border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Drift Slope ($\beta$)</p>
                  <p className={cn(
                    "text-2xl font-black font-mono mt-1",
                    punctualitySlope > 1.5 ? "text-rose-500" : punctualitySlope < -1.0 ? "text-emerald-500" : "text-primary"
                  )}>
                    {punctualitySlope > 0 ? `+${punctualitySlope}` : punctualitySlope} m/d
                  </p>
                  <p className="text-[8px] font-bold text-muted-foreground mt-1">
                    {punctualitySlope > 1.5 ? "Arrival time drifting later" : punctualitySlope < -1.0 ? "Punctuality consolidating" : "Cadence locked & steady"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/20 border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Streak Factor</p>
                  <p className="text-2xl font-black font-mono text-emerald-500 mt-1">{momentum.streakScore}%</p>
                  <p className="text-[8px] font-bold text-muted-foreground mt-1">Consistency momentum rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. BEHAVIORAL TELEMETRY & PATTERN CATALOG (16-HEURISTIC ENGINE) */}
          <Card className="border-border/50 shadow-lg bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-primary/5 border-b border-white/5 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Behavioral Telemetry & Pattern Catalog
                </CardTitle>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                  {behavioralPatterns.length} Patterns Validated
                </Badge>
              </div>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">
                16-heuristic deterministic discrete pattern classification.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {behavioralPatterns.map(pattern => (
                <div
                  key={pattern.id}
                  className="p-4 rounded-2xl bg-secondary/20 border border-white/5 space-y-2 transition-all hover:bg-secondary/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          pattern.classification === 'CRITICAL' ? 'destructive' :
                          pattern.classification === 'WARNING' ? 'secondary' :
                          pattern.classification === 'POSITIVE' ? 'default' : 'outline'
                        }
                        className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          pattern.classification === 'POSITIVE' && "bg-emerald-500/20 text-emerald-400 border-none",
                          pattern.classification === 'WARNING' && "bg-amber-500/20 text-amber-400 border-none"
                        )}
                      >
                        {pattern.code}
                      </Badge>
                      <p className="text-xs font-black uppercase tracking-tight text-foreground">{pattern.title}</p>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-muted-foreground">{pattern.metric}</span>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    {pattern.insightRendered}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3. SANITIZED OPERATIONAL MEMO */}
          <Card className="border-border/50 shadow-lg bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-secondary/10 border-b border-white/5 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Daily Operational Memo (Sanitized)
                </CardTitle>
                <Badge variant={sanitizedMemo.quality === 'GOOD' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase tracking-widest">
                  Quality: {sanitizedMemo.quality}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-white/5 italic text-xs leading-relaxed text-foreground/90 font-medium">
                "{sanitizedMemo.sanitizedText}"
              </div>

              {sanitizedMemo.warningMessage && (
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {sanitizedMemo.warningMessage}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {sanitizedMemo.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-mono font-bold">
                    {tag}
                  </Badge>
                ))}
                {sanitizedMemo.issueKeys.map((key, idx) => (
                  <Badge key={idx} variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-mono font-bold">
                    #{key}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. ATTENDANCE & LEAVE AUDIT */}
          <Card className="border-border/50 shadow-lg bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-emerald-500/5 border-b border-white/5 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Attendance & Leave Cross-Reference Audit
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">Differentiates approved rest from unexcused infractions.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {absenceTriage.approvedRest.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CalendarCheck2 className="w-4 h-4 text-emerald-500" />
                    <span>Approved Scheduled Rest ({item.date})</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px]">{item.type}</Badge>
                </div>
              ))}

              {absenceTriage.pendingValidation.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2 text-amber-300">
                    <CalendarClock className="w-4 h-4 text-amber-500" />
                    <span>Pending HR Validation ({item.date})</span>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-none text-[8px]">{item.type}</Badge>
                </div>
              ))}

              {absenceTriage.unexcused.map((dateStr, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2 text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Unexcused Shift Infraction ({dateStr})</span>
                  </div>
                  <Badge className="bg-rose-500/20 text-rose-400 border-none text-[8px]">Unapproved</Badge>
                </div>
              ))}

              {absenceTriage.approvedRest.length === 0 && absenceTriage.pendingValidation.length === 0 && absenceTriage.unexcused.length === 0 && (
                <p className="text-[10px] text-center opacity-40 py-4 font-black uppercase">100% Shift Integrity — Zero Unexcused Absences</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL (40% BEHAVIORAL TELEMETRY & DIRECTIVES) */}
        <div className="lg:col-span-5 space-y-6">

          {/* 5. MOMENTUM & HEALTH MATRIX */}
          <Card className="border-border/50 shadow-lg bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-primary/5 border-b border-white/5 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Momentum & Health Matrix
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">Normalized discrete mathematical telemetry.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Punctuality Score</span>
                  <span className="text-primary font-mono">{momentum.punctualityScore}%</span>
                </div>
                <Progress value={momentum.punctualityScore} className="h-2 bg-secondary/50" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Task Velocity Index</span>
                  <span className="text-emerald-500 font-mono">{momentum.taskVelocityScore}%</span>
                </div>
                <Progress value={momentum.taskVelocityScore} className="h-2 bg-secondary/50" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Debrief Cadence</span>
                  <span className="text-blue-500 font-mono">{momentum.reliabilityScore}%</span>
                </div>
                <Progress value={momentum.reliabilityScore} className="h-2 bg-secondary/50" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Capacity Strain</span>
                  <span className={cn("font-mono", fatigue.isStrainDetected ? "text-rose-500" : "text-emerald-500")}>
                    {fatigue.isStrainDetected ? "HIGH" : "BALANCED"}
                  </span>
                </div>
                <Progress value={fatigue.isStrainDetected ? 85 : 25} className="h-2 bg-secondary/50" />
              </div>
            </CardContent>
          </Card>

          {/* 6. ACTIONABLE RESOLUTION DIRECTIVES */}
          <Card className="border-border/50 shadow-lg bg-card/40 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="bg-amber-500/5 border-b border-white/5 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Actionable Directives
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase opacity-60">Clickable resolution cards for operational friction.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {directives.length > 0 ? (
                directives.map(directive => (
                  <div key={directive.id} className="p-4 rounded-2xl bg-secondary/30 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-tight text-foreground">{directive.title}</p>
                      <Badge variant={directive.severity === 'CRITICAL' ? 'destructive' : 'secondary'} className="text-[8px] font-black uppercase">
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
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto opacity-80 mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">All Systems Nominal</p>
                  <p className="text-[9px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Zero operational directives pending resolution.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

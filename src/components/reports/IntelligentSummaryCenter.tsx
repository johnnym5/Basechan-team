"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase"
import { doc, addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  UserX,
  Users,
  Zap,
  Activity,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Trophy,
  RefreshCw,
  Sparkles,
  Heart,
  Hourglass,
  Calendar,
  Repeat,
  ShieldQuestion,
  Gift,
  FileText,
  AlertCircle,
  Loader2,
  Radar
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile, Attendance, Task, LeaveRequest, Nomination, PulseCheck } from "@/lib/types"
import {
    isToday,
    isWithinInterval,
    subDays,
    startOfDay,
    endOfDay,
    parseISO,
    isWeekend,
    eachDayOfInterval,
    isAfter,
    startOfToday,
    differenceInDays,
    differenceInHours,
    format,
    getDay,
    isYesterday,
    isThisWeek,
    addDays,
    differenceInYears,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth
} from "date-fns"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/usePermissions"
import { type TimeFilterState } from "../shared/AdvancedTimeFilter"
import { TrendInsightCard } from "../dashboard/TrendInsightCard"
import { InsightEngine, type Insight } from "@/lib/InsightEngine"

interface IntelligentSummaryCenterProps {
  staffList: UserProfile[];
  attendanceLogs: Attendance[];
  tasks: Task[];
  leaveRequests: LeaveRequest[];
  pulseFeed?: PulseCheck[];
  nominations?: Nomination[];
  isAdminOverride?: boolean;
  timeFilter?: TimeFilterState;
  variant?: 'default' | 'compact';
}

export function CriticalAlertRotator({
  alerts = [],
  userProfile,
  onAcknowledge
}: {
  alerts: any[],
  userProfile: UserProfile | null,
  onAcknowledge: (alert: any) => void
}) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)

  // Local optimistic state for INSTANT hiding
  const [optimisticallyHidden, setOptimisticallyHidden] = useState<string[]>([])

  // Filter against BOTH DB (passed from parent) and Local Optimistic state
  const visibleAlerts = useMemo(() =>
    alerts.filter(alert => !optimisticallyHidden.includes(alert.id)),
  [alerts, optimisticallyHidden])

  useEffect(() => {
    if (currentIndex >= visibleAlerts.length && visibleAlerts.length > 0) {
      setCurrentIndex(0)
    }
  }, [visibleAlerts.length, currentIndex])

  useEffect(() => {
    if (visibleAlerts.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleAlerts.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [visibleAlerts.length])

  if (visibleAlerts.length === 0) return null

  const currentAlert = visibleAlerts[currentIndex] || visibleAlerts[0]
  if (!currentAlert) return null

  const handleAcknowledgeInternal = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOptimisticallyHidden(prev => [...prev, currentAlert.id])
    onAcknowledge(currentAlert)
  }

  return (
    <div className="flex flex-col gap-3 w-full animate-in slide-in-from-top-4 duration-700">
        <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 shadow-2xl backdrop-blur-xl relative overflow-hidden group gap-4 transition-all"
        >
            {/* Progress bar indicator for rotation */}
            {visibleAlerts.length > 1 && (
                <div key={`${currentIndex}-${visibleAlerts.length}`} className="absolute bottom-0 left-0 h-1 bg-rose-500/50 animate-progress w-full" style={{ animationDuration: '5000ms' }} />
            )}

            <div className="flex items-center gap-4 md:gap-5 z-10">
                <div className="p-2.5 md:p-3 bg-rose-500 rounded-xl md:rounded-2xl text-white shrink-0 shadow-lg shadow-rose-500/40 animate-pulse">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-0.5">
                        Critical Alerts {visibleAlerts.length > 1 && `(${currentIndex + 1}/${visibleAlerts.length})`}
                    </h4>
                    <p className="text-xs md:text-sm font-black tracking-tight text-white leading-tight break-words">{currentAlert.text}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-end z-10">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAcknowledgeInternal}
                    className="h-8 md:h-9 px-3 md:px-4 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg md:rounded-xl"
                >
                    Acknowledge
                </Button>
                <Button
                    onClick={() => {
                        if (currentAlert.actionType === 'ROUTE') router.push(currentAlert.actionTarget)
                    }}
                    className="h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-black uppercase text-[8px] md:text-[9px] tracking-widest shadow-xl shadow-rose-500/30 flex items-center gap-2 group"
                >
                    {currentAlert.actionLabel} <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
            </div>
        </div>
    </div>
  )
}

export function IntelligentSummaryCenter({
  staffList = [],
  attendanceLogs = [],
  tasks = [],
  leaveRequests = [],
  pulseFeed = [],
  nominations = [],
  isAdminOverride,
  timeFilter,
  variant = 'default'
}: IntelligentSummaryCenterProps) {
  const router = useRouter()
  const { user: authUser } = useUser()
  const firestore = useFirestore()
  const queryClient = useQueryClient()

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser])
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef)
  const permissions = usePermissions(userProfile || null)

  const isAdmin = isAdminOverride ?? (permissions.canManageStaff || permissions.canManageCompany)

  // 1. Fetch persistent acknowledgments (CENTRALIZED)
  const { data: acknowledgedAlertIds = [] } = useQuery({
    queryKey: ['acknowledgedAlerts', userProfile?.orgId],
    queryFn: async () => {
      if (!firestore || !userProfile?.orgId) return []
      try {
        const q = query(
          collection(firestore, 'acknowledged_alerts'),
          where('orgId', '==', userProfile.orgId)
        )
        const snap = await getDocs(q)
        return snap.docs.map(doc => doc.data().alertId)
      } catch (e) {
        console.error("Critical Alert suppression query failed:", e)
        return []
      }
    },
    enabled: !!firestore && !!userProfile?.orgId
  })

  // 2. Persistent Acknowledge Mutation
  const { mutate: acknowledgeAlert } = useMutation({
    mutationFn: async (alert: any) => {
      if (!firestore || !userProfile) return
      await addDoc(collection(firestore, 'acknowledged_alerts'), {
        alertId: alert.id,
        title: alert.title,
        text: alert.text,
        orgId: userProfile.orgId,
        acknowledgedBy: userProfile.id,
        acknowledgedByName: userProfile.fullName,
        acknowledgedAt: serverTimestamp()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgedAlerts'] })
      queryClient.invalidateQueries({ queryKey: ['acknowledgedAlertsHistory'] })
    }
  })

  const [internalTimeframe, setInternalTimeframe] = useState<"TODAY" | "WEEK" | "MONTH">("WEEK")
  const timeframe = timeFilter?.mode || internalTimeframe

  const [viewMode, setViewMode] = useState<'RADAR' | 'TRENDS'>('RADAR')
  const [selectedStaffId, setSelectedStaffId] = useState("ALL")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [modalData, setModalData] = useState<any>(null)

  // --- ENGINE: Strategic Trends ---
  const trends = useMemo(() => {
    const today = startOfToday()
    const currentPeriod = { start: startOfDay(subDays(today, 6)), end: endOfDay(today) }
    const lastPeriod = { start: startOfDay(subDays(today, 13)), end: startOfDay(subDays(today, 7)) }

    // Trend 1: Attendance
    const curAtt = attendanceLogs.filter(l => isWithinInterval(parseISO(l.date + 'T00:00:00'), currentPeriod)).length
    const lastAtt = attendanceLogs.filter(l => isWithinInterval(parseISO(l.date + 'T00:00:00'), lastPeriod)).length
    const attTrend = lastAtt > 0 ? Math.round(((curAtt - lastAtt) / lastAtt) * 100) : 0

    // Trend 2: Missions
    const curTasks = tasks.filter(t => t.status === 'ARCHIVED' && isWithinInterval(parseISO(t.createdAt), currentPeriod)).length
    const lastTasks = tasks.filter(t => t.status === 'ARCHIVED' && isWithinInterval(parseISO(t.createdAt), lastPeriod)).length
    const taskTrend = lastTasks > 0 ? Math.round(((curTasks - lastTasks) / lastTasks) * 100) : 0

    return {
        attendance: {
            metric: `${curAtt} Logs`,
            trend: attTrend,
            data: eachDayOfInterval(currentPeriod).map(day => ({
                value: attendanceLogs.filter(l => l.date === format(day, 'yyyy-MM-dd')).length
            }))
        },
        missions: {
            metric: `${curTasks} Done`,
            trend: taskTrend,
            data: eachDayOfInterval(currentPeriod).map(day => ({
                value: tasks.filter(t => t.status === 'ARCHIVED' && format(parseISO(t.createdAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length
            }))
        }
    }
  }, [attendanceLogs, tasks])

  // --- ENGINE: Strategic Insight Generation (30 RULES) ---
  const allInsights = useMemo(() => {
    if (!userProfile) return []

    // Use the New Tactical Engine
    const teamInsights = InsightEngine.generateTeamInsights(
        staffList,
        attendanceLogs,
        tasks,
        leaveRequests,
        pulseFeed
    );

    // Map Engine output to the UI format expected by the Rotator
    return teamInsights.map(insight => ({
        id: insight.id,
        type: insight.type === 'CRITICAL' ? 'action' :
              insight.type === 'WARNING' ? 'warning' :
              insight.type === 'POSITIVE' ? 'success' : 'info',
        severity: insight.type === 'CRITICAL' ? 'CRITICAL' : 'STANDARD',
        icon: insight.type === 'POSITIVE' ? CheckCircle :
              insight.type === 'CRITICAL' ? AlertTriangle : Activity,
        title: insight.category === 'TEAM' ? "Organization Pulse" : "Personnel Alert",
        text: insight.message,
        actionLabel: "Investigate",
        actionType: "ROUTE",
        actionTarget: "/staff/attendance"
    }));
  }, [attendanceLogs, tasks, staffList, leaveRequests, userProfile])

  const criticalAlerts = useMemo(() =>
    allInsights.filter(i =>
      i.severity === 'CRITICAL' &&
      !acknowledgedAlertIds.includes(i.id)
    ),
  [allInsights, acknowledgedAlertIds])

  const standardBriefings = useMemo(() =>
    allInsights.filter(i =>
      i.severity !== 'CRITICAL' &&
      !acknowledgedAlertIds.includes(i.id)
    ),
  [allInsights, acknowledgedAlertIds])

  // --- ROTATION LOGIC ---
  const handleNext = useCallback(() => {
    if (standardBriefings.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % standardBriefings.length);
    setIsPaused(true);
  }, [standardBriefings.length]);

  const handlePrev = useCallback(() => {
    if (standardBriefings.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + standardBriefings.length) % standardBriefings.length);
    setIsPaused(true);
  }, [standardBriefings.length]);

  useEffect(() => {
    if (isPaused || standardBriefings.length <= 1) return;
    const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % standardBriefings.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, standardBriefings.length]);

  useEffect(() => {
    if (currentIndex >= standardBriefings.length) setCurrentIndex(0)
  }, [standardBriefings.length, currentIndex])

  const handleInsightAction = (insight: any) => {
    if (insight.actionType === 'ROUTE') {
      router.push(insight.actionTarget)
    } else if (insight.actionType === 'MODAL') {
      setModalData(insight)
      setActiveModal(insight.actionTarget)
    }
  };

  const handleAcknowledge = async (alert: any) => {
    if (!firestore || !userProfile) return;

    const newDismissed = Array.from(new Set([...(userProfile.dismissedAlertIds || []), alert.id]));

    // 1. Update User Document (Optimistic UI handled by Firestore hooks usually, but we can local-set if needed)
    try {
        const { updateDocumentNonBlocking } = await import('@/firebase');
        const userRef = doc(firestore, 'users', userProfile.id);
        updateDocumentNonBlocking(userRef, { dismissedAlertIds: newDismissed });

        // 2. Log to Audit Ledger
        const { auditService } = await import('@/services/audit-service');
        await auditService.logAction(
            firestore,
            userProfile,
            'ALERT_ACKNOWLEDGED',
            `Acknowledged insight [${alert.title}]: ${alert.text}`,
            { id: alert.id, type: 'INTELLIGENT_INSIGHT' }
        );
    } catch (e) {
        console.error("Acknowledgment synchronization failed:", e);
    }
  };

  const activeInsight = standardBriefings[currentIndex]
  const Icon = activeInsight?.icon || CheckCircle

  if (variant === 'compact') {
      return (
        <div className="w-full">
            <CriticalAlertRotator
                alerts={criticalAlerts}
                userProfile={userProfile || null}
                onAcknowledge={acknowledgeAlert}
            />
        </div>
      );
  }

  return (
    <div className="w-full flex flex-col h-full gap-4 md:gap-6 overflow-hidden">

      {/* 1. CRITICAL ALERT SECTION */}
      <CriticalAlertRotator
        alerts={criticalAlerts}
        userProfile={userProfile || null}
        onAcknowledge={acknowledgeAlert}
      />

      {/* 2. MODE SWITCHER */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Intelligence Console</h3>
        <div className="flex bg-black/20 border border-white/5 p-1 rounded-xl">
            <button
                onClick={() => setViewMode('RADAR')}
                className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'RADAR' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                )}
            >
                Personnel Radar
            </button>
            <button
                onClick={() => setViewMode('TRENDS')}
                className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'TRENDS' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                )}
            >
                Strategic Trends
            </button>
        </div>
      </div>

      {/* 3. DYNAMIC CONTENT AREA */}
      {viewMode === 'RADAR' ? (
        <PersonnelIntelligenceHub
            staffList={staffList}
            attendanceLogs={attendanceLogs}
            tasks={tasks}
            leaveRequests={leaveRequests}
            pulseFeed={pulseFeed}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <TrendInsightCard
                title="Operational Stability"
                metric={trends.attendance.metric}
                description="Cumulative unit check-ins across the organizational matrix."
                trendPercentage={trends.attendance.trend}
                sparklineData={trends.attendance.data}
            />
            <TrendInsightCard
                title="Mission Velocity"
                metric={trends.missions.metric}
                description="Throughput of archived operational tasks this cycle."
                trendPercentage={trends.missions.trend}
                sparklineData={trends.missions.data}
            />
        </div>
      )}

      {/* QUICK ACTION MODAL RENDERING ENGINE */}
      {activeModal && (
        <Dialog open={!!activeModal} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
          <DialogContent className="w-[95vw] max-w-[500px] apple-glass-darker border-none rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-3xl overflow-hidden">
            <DialogHeader className="mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4 mb-2">
                    <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-primary/10 text-primary shrink-0">
                        {activeModal === 'MESSAGE_STAFF' ? <MessageSquare className="w-5 h-5 md:w-6 md:h-6" /> :
                         activeModal === 'VERIFY_SHIFT' ? <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" /> : <Zap className="w-5 h-5 md:w-6 md:h-6" />}
                    </div>
                    <div className="min-w-0">
                        <DialogTitle className="text-xl md:text-2xl font-black font-headline tracking-tighter uppercase truncate">
                            {activeModal === 'MESSAGE_STAFF' ? "Staff Communication" :
                             activeModal === 'VERIFY_SHIFT' ? "Attendance Audit" : "Intelligence Action"}
                        </DialogTitle>
                        <DialogDescription className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 truncate">System Administration</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            {activeModal === 'MESSAGE_STAFF' && (
              <div className="space-y-4 md:space-y-6">
                <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Intelligence</p>
                    <p className="text-xs md:text-sm font-medium leading-relaxed italic opacity-80 break-words">"{modalData?.text}"</p>
                </div>
                <div className="h-32 md:h-40 border-2 border-dashed border-white/10 rounded-xl md:rounded-2xl flex items-center justify-center">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 px-6 text-center">Messaging Interface</p>
                </div>
                <Button className="w-full h-10 md:h-12 rounded-lg md:rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-[9px] md:text-[10px]" onClick={() => setActiveModal(null)}>Send Message</Button>
              </div>
            )}

            {activeModal === 'VERIFY_SHIFT' && (
              <div className="space-y-4 md:space-y-6">
                <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-rose-500/5 border border-rose-500/10">
                    <p className="text-[10px] font-black text-rose-500 uppercase mb-2">Attendance Gap</p>
                    <p className="text-xs md:text-sm font-medium leading-relaxed opacity-80 break-words">Manual verification required for session with missing records.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <Button variant="outline" className="h-12 md:h-14 rounded-lg md:rounded-xl border-white/10 hover:bg-emerald-500/10 hover:text-emerald-500 font-black uppercase text-[8px] md:text-[10px] tracking-widest" onClick={() => setActiveModal(null)}>Mark Valid</Button>
                    <Button variant="outline" className="h-12 md:h-14 rounded-lg md:rounded-xl border-white/10 hover:bg-rose-500/10 hover:text-rose-500 font-black uppercase text-[8px] md:text-[10px] tracking-widest" onClick={() => setActiveModal(null)}>Flag Issue</Button>
                </div>
              </div>
            )}

            {activeModal === 'SEND_KUDOS' && (
              <div className="space-y-4 md:space-y-6 text-center">
                <div className="p-4 md:p-6 rounded-full bg-amber-500/10 w-fit mx-auto">
                    <Trophy className="w-10 h-10 md:w-12 md:h-12 text-amber-500 animate-bounce" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-base md:text-lg font-black uppercase tracking-tight truncate">Staff Recognition</h4>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1 break-words">Acknowledge exceptional performance or streak.</p>
                </div>
                <Button className="w-full h-10 md:h-12 rounded-lg md:rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px]" onClick={() => setActiveModal(null)}>Issue Award</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function PersonnelIntelligenceHub({
    staffList,
    attendanceLogs,
    tasks,
    leaveRequests,
    pulseFeed
}: {
    staffList: UserProfile[],
    attendanceLogs: Attendance[],
    tasks: Task[],
    leaveRequests: LeaveRequest[],
    pulseFeed: PulseCheck[]
}) {
    const router = useRouter();
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

    // Filter out admins for the hub roster
    const displayStaff = useMemo(() => {
        return staffList.filter(s => !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR'].includes(s.role));
    }, [staffList]);

    // Initialize with first staff member if none selected
    useEffect(() => {
        if (!selectedStaffId && displayStaff.length > 0) {
            setSelectedStaffId(displayStaff[0].id);
        }
    }, [displayStaff, selectedStaffId]);

    const intel = useMemo(() => {
        if (!selectedStaffId) return null;
        const staff = staffList.find(s => s.id === selectedStaffId);
        if (!staff) return null;

        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });

        const staffLogs = attendanceLogs.filter(l => l.userId === staff.id);
        const staffTasks = tasks.filter(t => t.assignedTo === staff.id);

        const todayLog = staffLogs.find(l => l.date === today);
        const weeklyLogs = staffLogs.filter(l => isAfter(parseISO(l.date), weekStart));

        // 1. Determine Pulse status
        let pulse: 'OPTIMAL' | 'FATIGUE_RISK' | 'DISENGAGED' = 'OPTIMAL';
        const recentLates = weeklyLogs.filter(l => l.remarks?.includes('LATE')).length;

        // Calculate expected working days so far this week
        const expectedDays = eachDayOfInterval({ start: weekStart, end: now }).filter(d => !isWeekend(d)).length;
        const recentAbsences = Math.max(0, expectedDays - weeklyLogs.length);

        if (recentLates >= 2 || recentAbsences >= 1) pulse = 'FATIGUE_RISK';
        if (recentAbsences >= 2 || staff.status === 'OFFLINE') pulse = 'DISENGAGED';

        // 2. Derive Actions (Bottlenecks & Criticals)
        const actionItems = staffTasks
            .filter(t => t.status === 'AWAITING_REVIEW' || t.priority === 'LEVEL_3')
            .map(t => t.title);

        // 3. Situational Summaries
        const dailySummary = todayLog?.eodReport
            ? todayLog.eodReport
            : "Personnel has not yet filed a Situation Report for the current cycle.";

        const tasksDone = staffTasks.filter(t => t.status === 'ARCHIVED' && isAfter(parseISO(t.createdAt), weekStart)).length;
        const weeklySummary = `Personnel has successfully executed ${tasksDone} operations this week. Overall attendance posture is ${pulse === 'OPTIMAL' ? 'nominal' : 'exhibiting friction'}.`;

        // 4. Tactical Insights from Engine
        const tacticalInsights = InsightEngine.generatePersonalInsights(
            staff,
            attendanceLogs,
            tasks,
            leaveRequests,
            [] // reports placeholder
        );

        return {
            staff,
            pulse,
            dailySummary,
            weeklySummary,
            actionItems,
            tacticalInsights
        };
    }, [selectedStaffId, staffList, attendanceLogs, tasks, leaveRequests]);

    const getPulseStyles = (pulse: string) => {
        switch(pulse) {
          case 'OPTIMAL': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          case 'FATIGUE_RISK': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          case 'DISENGAGED': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
          default: return 'text-slate-400 bg-white/5 border-white/10';
        }
    };

    return (
        <div className="bg-black/20 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col md:flex-row min-h-[500px] shadow-2xl">

          {/* LEFT PANE: Personnel Roster */}
          <div className="w-full md:w-1/3 border-r border-white/5 bg-black/20 overflow-y-auto max-h-[500px] custom-scrollbar">
            <div className="p-6 border-b border-white/5 sticky top-0 bg-secondary/90 backdrop-blur-md z-10">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Personnel Radar
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {displayStaff.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => setSelectedStaffId(staff.id)}
                  className={cn(
                    "w-full text-left p-5 flex items-center justify-between transition-all group",
                    selectedStaffId === staff.id ? 'bg-primary/10' : 'hover:bg-white/5'
                  )}
                >
                  <div className="min-w-0">
                    <div className={cn("font-black text-xs uppercase tracking-tight truncate transition-colors", selectedStaffId === staff.id ? 'text-primary' : 'text-slate-200')}>
                        {staff.fullName}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-60 truncate">
                        {staff.jobTitle || 'Unit Personnel'}
                    </div>
                  </div>
                  <div className={cn(
                    "p-2 rounded-xl border transition-all shrink-0",
                    staff.status === 'ONLINE' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-slate-500 border-white/5 bg-white/5'
                  )}>
                    <Activity className={cn("w-3.5 h-3.5", staff.status === 'ONLINE' && "animate-pulse")} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANE: Intel Dossier */}
          <div className="w-full md:w-2/3 p-8 bg-black/10">
            {intel ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col">
                <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-2xl font-black font-headline tracking-tighter uppercase text-white">{intel.staff.fullName}</h2>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        getPulseStyles(intel.pulse)
                      )}>
                        PULSE: {intel.pulse.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Tactical Dossier</span>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>

                <div className="space-y-8 flex-grow">
                  {/* Daily SitRep */}
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-2" /> 24-Hour SitRep
                    </h4>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed bg-black/40 p-5 rounded-2xl border border-white/5 italic">
                      "{intel.dailySummary}"
                    </p>
                  </div>

                  {/* Weekly Aggregate */}
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3 flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-2" /> Weekly Aggregate
                    </h4>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed bg-black/40 p-5 rounded-2xl border border-white/5">
                      {intel.weeklySummary}
                    </p>
                  </div>

                  {/* Pending Actions */}
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-2" /> Required Actions
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {intel.actionItems.length > 0 ? intel.actionItems.map((action, idx) => (
                        <div key={idx} className="flex items-center gap-4 text-[11px] font-bold text-slate-200 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 hover:border-amber-500/30 transition-all">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="truncate">{action}</span>
                        </div>
                      )) : (
                        <div className="flex items-center gap-4 text-[11px] font-bold text-emerald-400 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 italic">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>No operational bottlenecks identified.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tactical Insights (NEW) */}
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500 border-t border-white/5 pt-8">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                      <Zap className="w-3.5 h-3.5 mr-2" /> Pattern Recognition & Intelligence
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                        {intel.tacticalInsights.length > 0 ? intel.tacticalInsights.map((insight) => (
                            <div key={insight.id} className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-[11px] font-bold",
                                insight.type === 'CRITICAL' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                insight.type === 'WARNING' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                insight.type === 'POSITIVE' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                "bg-white/5 border-white/10 text-slate-300"
                            )}>
                                {insight.type === 'POSITIVE' ? <CheckCircle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                                <span>{insight.message}</span>
                            </div>
                        )) : (
                            <p className="text-[10px] font-bold text-muted-foreground opacity-30 italic px-1">Insufficient data for behavioral pattern recognition.</p>
                        )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 gap-2"
                        onClick={() => router.push(`/staff?userId=${intel.staff.id}`)}
                    >
                        Detailed 360 Insight <ChevronRight className="w-3 h-3" />
                    </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20">
                <Users className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center max-w-[200px]">Select unit personnel to initialize intelligence dossier</p>
              </div>
            )}
          </div>

        </div>
    );
}

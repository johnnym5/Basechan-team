"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase"
import { doc, addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  Users,
  Zap,
  Activity,
  ShieldAlert,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Trophy,
  Radar,
  Calendar as CalendarIcon,
  Check,
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile, Attendance, Task, LeaveRequest, Nomination, PulseCheck } from "@/lib/types"
import {
    isWithinInterval,
    subDays,
    startOfDay,
    endOfDay,
    parseISO,
    isWeekend,
    eachDayOfInterval,
    isAfter,
    startOfToday,
    format,
    startOfWeek,
    isSameWeek
} from "date-fns"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/usePermissions"
import { type TimeFilterState } from "../shared/AdvancedTimeFilter"
import { InsightEngine, type Insight } from "@/lib/InsightEngine"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { InsightCalendarModal } from "./recognition/InsightCalendarModal"

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
  const [optimisticallyHidden, setOptimisticallyHidden] = useState<string[]>([])

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
  const handleAcknowledgeInternal = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOptimisticallyHidden(prev => [...prev, currentAlert.id])
    onAcknowledge(currentAlert)
  }

  return (
    <div className="flex flex-col gap-3 w-full animate-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 shadow-2xl backdrop-blur-xl relative overflow-hidden group gap-4 transition-all">
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
                <Button variant="ghost" size="sm" onClick={handleAcknowledgeInternal} className="h-8 md:h-9 px-3 md:px-4 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg md:rounded-xl">Acknowledge</Button>
                <Button onClick={() => { if (currentAlert.actionType === 'ROUTE') router.push(currentAlert.actionTarget) }} className="h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-black uppercase text-[8px] md:text-[9px] tracking-widest shadow-xl shadow-rose-500/30 flex items-center gap-2 group">
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

  const { data: acknowledgedAlertIds = [] } = useQuery({
    queryKey: ['acknowledgedAlerts', userProfile?.orgId],
    queryFn: async () => {
      if (!firestore || !userProfile?.orgId) return []
      const q = query(collection(firestore, 'acknowledged_alerts'), where('orgId', '==', userProfile.orgId))
      const snap = await getDocs(q)
      return snap.docs.map(doc => doc.data().alertId)
    },
    enabled: !!firestore && !!userProfile?.orgId
  })

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['acknowledgedAlerts'] }) }
  })


  const trends = useMemo(() => {
    const today = startOfToday()
    const currentPeriod = { start: startOfDay(subDays(today, 6)), end: endOfDay(today) }
    const lastPeriod = { start: startOfDay(subDays(today, 13)), end: startOfDay(subDays(today, 7)) }

    const curAtt = attendanceLogs.filter(l => isWithinInterval(parseISO(l.date + 'T00:00:00'), currentPeriod)).length
    const lastAtt = attendanceLogs.filter(l => isWithinInterval(parseISO(l.date + 'T00:00:00'), lastPeriod)).length
    const attTrend = lastAtt > 0 ? Math.round(((curAtt - lastAtt) / lastAtt) * 100) : 0

    const curTasks = tasks.filter(t => t.status === 'ARCHIVED' && isWithinInterval(parseISO(t.createdAt), currentPeriod)).length
    const lastTasks = tasks.filter(t => t.status === 'ARCHIVED' && isWithinInterval(parseISO(t.createdAt), lastPeriod)).length
    const taskTrend = lastTasks > 0 ? Math.round(((curTasks - lastTasks) / lastTasks) * 100) : 0

    return {
        attendance: { metric: `${curAtt} Logs`, trend: attTrend, data: eachDayOfInterval(currentPeriod).map(day => ({ value: attendanceLogs.filter(l => l.date === format(day, 'yyyy-MM-dd')).length })) },
        missions: { metric: `${curTasks} Done`, trend: taskTrend, data: eachDayOfInterval(currentPeriod).map(day => ({ value: tasks.filter(t => t.status === 'ARCHIVED' && format(parseISO(t.createdAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length })) }
    }
  }, [attendanceLogs, tasks])

  const allInsights = useMemo(() => {
    if (!userProfile) return []
    const teamInsights = InsightEngine.generateTeamInsights(staffList, attendanceLogs, tasks, leaveRequests, pulseFeed, nominations || [])
    return teamInsights.map(insight => ({
        id: insight.id,
        type: insight.type === 'CRITICAL' ? 'action' : insight.type === 'WARNING' ? 'warning' : insight.type === 'POSITIVE' ? 'success' : 'info',
        severity: insight.type === 'CRITICAL' ? 'CRITICAL' : 'STANDARD',
        icon: insight.type === 'POSITIVE' ? CheckCircle : insight.type === 'CRITICAL' ? AlertTriangle : Activity,
        title: insight.category === 'TEAM' ? "Organization Pulse" : "Personnel Alert",
        text: insight.message,
        actionLabel: "Investigate",
        actionType: "ROUTE",
        actionTarget: "/staff/attendance",
        category: insight.category
    }))
  }, [attendanceLogs, tasks, staffList, leaveRequests, userProfile, pulseFeed, nominations])

  const criticalAlerts = useMemo(() => allInsights.filter(i => i.severity === 'CRITICAL' && !acknowledgedAlertIds.includes(i.id)), [allInsights, acknowledgedAlertIds])

  if (variant === 'compact') {
      return <div className="w-full"><CriticalAlertRotator alerts={criticalAlerts} userProfile={userProfile || null} onAcknowledge={acknowledgeAlert} /></div>;
  }

  return (
    <div className="w-full flex flex-col h-full gap-4 md:gap-6 overflow-hidden">
      <CriticalAlertRotator alerts={criticalAlerts} userProfile={userProfile || null} onAcknowledge={acknowledgeAlert} />
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Analytics Console</h3>
      </div>
      <PersonnelIntelligenceHub staffList={staffList} attendanceLogs={attendanceLogs} tasks={tasks} leaveRequests={leaveRequests} pulseFeed={pulseFeed} isAdmin={isAdmin} currentUser={userProfile || undefined} nominations={nominations} allInsights={allInsights} />
    </div>
  )
}

interface PersonnelIntel {
    isTeam: boolean;
    fullName: string;
    insights: any[];
    staff: UserProfile | null;
    pulse: string;
    dailySummary: string;
    lastReportDate?: string;
    weeklySummary: string;
    actionItems: string[];
    tacticalInsights: Insight[];
}

function PersonnelIntelligenceHub({
    staffList = [],
    attendanceLogs = [],
    tasks = [],
    leaveRequests = [],
    pulseFeed = [],
    isAdmin,
    currentUser,
    nominations = [],
    allInsights = []
}: {
    staffList?: UserProfile[],
    attendanceLogs?: Attendance[],
    tasks?: Task[],
    leaveRequests?: LeaveRequest[],
    pulseFeed?: PulseCheck[],
    isAdmin: boolean,
    currentUser?: UserProfile,
    nominations?: Nomination[],
    allInsights?: any[]
}) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isTeamMode, setIsTeamMode] = useState(false);
    const [activeCalendarStaff, setActiveCalendarStaff] = useState<UserProfile | null>(null);
    const [activeDrillDown, setActiveDrillDown] = useState<any | null>(null);

    const drillDownData = useMemo(() => {
        if (!activeDrillDown) return null;
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const weeklyLogs = attendanceLogs.filter(l => isSameWeek(parseISO(l.date), now, { weekStartsOn: 1 }));

        switch(activeDrillDown.id) {
            case 'team_early_today':
                return attendanceLogs
                    .filter(l => l.date === todayStr && l.clockIn && !l.remarks?.includes('LATE'))
                    .map(l => ({ name: l.userName, value: l.clockIn ? format(new Date(l.clockIn), 'HH:mm') : '--:--' }));
            case 'team_late_today':
                return attendanceLogs
                    .filter(l => l.date === todayStr && l.remarks?.includes('LATE'))
                    .map(l => ({ name: l.userName, value: l.clockIn ? format(new Date(l.clockIn), 'HH:mm') : '--:--' }));
            case 'team_chronic_lates':
                return staffList.filter(s => s.role !== 'SUPERADMIN').map(s => {
                    const sLogs = weeklyLogs.filter(l => l.userId === s.id && l.remarks?.includes('LATE'));
                    if (sLogs.length < 3) return null;
                    return { name: s.fullName, days: sLogs.map(l => format(parseISO(l.date), 'EEEE')) };
                }).filter(Boolean);
            case 'team_pending_reviews':
                const awaiting = tasks.filter(t => t.status === 'AWAITING_REVIEW');
                const staffWithTasks = Array.from(new Set(awaiting.map(t => t.assignedTo)));
                return staffWithTasks.map(id => {
                    const s = staffList.find(st => st.id === id);
                    const count = awaiting.filter(t => t.assignedTo === id).length;
                    return { id, name: s?.fullName || 'Unknown', value: `${count} task(s)` };
                });
            default: return null;
        }
    }, [activeDrillDown, attendanceLogs, staffList, tasks]);

    // Ensure staff list is available for filtering
    const displayStaff = useMemo(() => {
        const list = staffList || [];
        // If not Admin, they only see themselves
        if (!isAdmin && currentUser) return [currentUser];
        // For management oversight, show ALL users in the organization
        return list;
    }, [staffList, isAdmin, currentUser]);

    useEffect(() => {
        if (!isAdmin && currentUser) {
            setSelectedIds([currentUser.id]);
            setIsTeamMode(false);
        } else if (isAdmin && selectedIds.length === 0 && !isTeamMode) {
            setIsTeamMode(true);
        }
    }, [isAdmin, currentUser, selectedIds.length, isTeamMode]);

    const toggleStaffSelection = (id: string) => {
        if (id === "TEAM") {
            setIsTeamMode(true);
            setSelectedIds([]);
            return;
        }
        setIsTeamMode(false);
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(i => i !== id);
            if (prev.length >= 5) return prev;
            return [...prev, id];
        });
    };

    const intelItems = useMemo((): PersonnelIntel[] => {
        if (isTeamMode) {
            return [{ isTeam: true, fullName: "Team Overview", insights: allInsights.filter(i => i.category === 'TEAM'), staff: null, pulse: 'NEUTRAL', dailySummary: "", weeklySummary: "", actionItems: [], tacticalInsights: [] }];
        }
        return selectedIds.map(id => {
            const staff = staffList.find(s => s.id === id);
            if (!staff) return null;
            const now = new Date(), weekStart = startOfWeek(now, { weekStartsOn: 1 });
            const staffLogs = attendanceLogs.filter(l => l.userId === staff.id), staffTasks = tasks.filter(t => t.assignedTo === staff.id);
            const weeklyLogs = staffLogs.filter(l => isAfter(parseISO(l.date), weekStart));
            let pulse: 'OPTIMAL' | 'FATIGUE_RISK' | 'DISENGAGED' = 'OPTIMAL';
            const recentLates = weeklyLogs.filter(l => l.remarks?.includes('LATE')).length;
            const expectedDays = eachDayOfInterval({ start: weekStart, end: now }).filter(d => !isWeekend(d)).length;
            const recentAbsences = Math.max(0, expectedDays - weeklyLogs.length);
            if (recentLates >= 2 || recentAbsences >= 1) pulse = 'FATIGUE_RISK';
            if (recentAbsences >= 2 || staff.status === 'OFFLINE') pulse = 'DISENGAGED';
            const lastReportLog = [...staffLogs].sort((a, b) => b.date.localeCompare(a.date)).find(l => !!l.eodReport);
            const tacticalInsights = InsightEngine.generatePersonalInsights(staff, attendanceLogs, tasks, leaveRequests, pulseFeed, nominations);
            return { isTeam: false, staff, fullName: staff.fullName, pulse, dailySummary: lastReportLog?.eodReport || "No Situation Report filed.", lastReportDate: lastReportLog?.date, weeklySummary: `Personnel has executed ${staffTasks.filter(t => t.status === 'ARCHIVED' && isAfter(parseISO(t.createdAt), weekStart)).length} operations this week.`, actionItems: staffTasks.filter(t => t.status === 'AWAITING_REVIEW' || t.priority === 'LEVEL_3').map(t => t.title), tacticalInsights, insights: [] };
        }).filter(Boolean) as PersonnelIntel[];
    }, [selectedIds, isTeamMode, staffList, attendanceLogs, tasks, leaveRequests, pulseFeed, nominations, allInsights]);

    const getPulseStyles = (pulse: string) => {
        switch(pulse) {
          case 'OPTIMAL': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          case 'FATIGUE_RISK': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          case 'DISENGAGED': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
          default: return 'text-slate-400 bg-white/5 border-white/10';
        }
    };

    return (
        <div className="bg-black/20 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col h-[320px] shadow-2xl">
          {isAdmin && (
            <div className="w-full border-b border-white/5 bg-secondary/90 backdrop-blur-md z-10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-primary/10 text-primary"><Radar className="w-5 h-5" /></div><div><h3 className="text-sm font-black text-white uppercase tracking-widest">Team Overview</h3><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">{isTeamMode ? 'Organizational Health Mode' : `${selectedIds.length} Personnel Selected`}</p></div></div>
                <div className="flex items-center gap-3 w-full sm:w-[320px]">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full h-12 rounded-xl bg-black/40 border-white/10 text-xs font-bold uppercase tracking-tight text-white justify-between px-4">
                                <span>{isTeamMode ? "Organizational Summary" : `Selected: ${selectedIds.length} Personnel`}</span>
                                <ChevronDown className="w-4 h-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 apple-glass-darker border-white/10 p-2 rounded-2xl" align="end">
                            <div className="space-y-1">
                                <button onClick={() => toggleStaffSelection("TEAM")} className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-all", isTeamMode ? "bg-primary text-white" : "hover:bg-white/5 text-slate-300")}>
                                    <span className="text-xs font-black uppercase">Organizational Summary</span>
                                    {isTeamMode && <Check className="w-4 h-4" />}
                                </button>
                                <div className="h-px bg-white/5 my-2" />
                                <ScrollArea className="h-64">
                                    {displayStaff.length === 0 ? (
                                        <div className="py-10 text-center opacity-20 text-[10px] font-black uppercase">No personnel detected in roster.</div>
                                    ) : displayStaff.map(staff => (
                                        <button key={staff.id} onClick={() => toggleStaffSelection(staff.id)} className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-all group mb-1", selectedIds.includes(staff.id) ? "bg-white/10 text-primary" : "hover:bg-white/5 text-slate-400")}>
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="text-xs font-bold uppercase tracking-tight truncate w-full">{staff.fullName}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">{staff.role}</span>
                                                    <span className="text-[8px] font-black uppercase opacity-40 truncate">{staff.departmentName}</span>
                                                </div>
                                            </div>
                                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0", selectedIds.includes(staff.id) ? "bg-primary border-primary" : "border-white/20 group-hover:border-white/40")}>{selectedIds.includes(staff.id) && <Check className="w-3 h-3 text-white" />}</div>
                                        </button>
                                    ))}
                                </ScrollArea>
                                <div className="pt-2 border-t border-white/5 mt-2"><p className="text-[8px] font-black uppercase tracking-widest text-center opacity-30">Max Comparison: 5 Personnel</p></div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
          )}
          <div className="w-full p-4 bg-black/10 flex-1 overflow-x-auto custom-scrollbar">
            <div className={cn("h-full flex gap-8", intelItems.length > 1 ? "min-w-max items-start" : "flex-col")}>
                {intelItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-20"><Users className="w-12 h-12 mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.3em] text-center max-w-[200px]">Select units to initialize comparison</p></div>
                ) : intelItems.map((intel, idx) => (
                    <div key={idx} className={cn(
                        "animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full overflow-y-auto custom-scrollbar",
                        intelItems.length > 1 ? "w-[400px] bg-black/20 p-4 rounded-3xl border border-white/5 shadow-inner" : "w-full"
                    )}>
                        <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                            <div><h2 className={cn("font-black font-headline tracking-tighter uppercase text-white", intelItems.length > 1 ? "text-xl" : "text-2xl")}>{intel.fullName}</h2><div className="flex items-center gap-3 mt-3">{intel.isTeam ? (<Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest px-3 py-1">Mode: All Units</Badge>) : (<span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", getPulseStyles(intel.pulse))}>PULSE: {intel.pulse.replace('_', ' ')}</span>)}</div></div>
                            {intelItems.length === 1 && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                        </div>
                        <div className="space-y-4 flex-grow">
                            {intel.isTeam ? (
                                <div className="grid grid-cols-1 gap-2 h-full overflow-y-auto custom-scrollbar pr-1">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 flex items-center sticky top-0 bg-secondary/80 backdrop-blur-md py-2 z-10"><Zap className="w-3.5 h-3.5 mr-2" /> Global Organizational Insights</h4>
                                    {intel.insights.length > 0 ? intel.insights.map((insight: any) => (
                                        <div
                                            key={insight.id}
                                            onClick={() => setActiveDrillDown(insight)}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-[11px] font-bold cursor-pointer hover:brightness-110 active:scale-[0.99]",
                                                insight.type === 'action' ? "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20" :
                                                insight.type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20" :
                                                insight.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20" :
                                                "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                                            )}
                                        >
                                            <insight.icon className="w-4 h-4 shrink-0" /><span>{insight.text}</span>
                                        </div>
                                    )) : <div className="py-10 text-center opacity-20"><Info className="h-10 w-10 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Awaiting organizational telemetry...</p></div>}
                                </div>
                            ) : (
                                <div className="space-y-4 h-full flex flex-col">
                                    <div className="space-y-2 shrink-0"><h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 flex items-center justify-between"><div><Clock className="w-3.5 h-3.5 mr-2" /> Operational Memo</div>{intel.lastReportDate && (<span className="text-[8px] font-bold text-muted-foreground opacity-40">Filed: {format(parseISO(intel.lastReportDate), 'MMM dd')}</span>)}</h4><p className="text-sm font-medium text-slate-300 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5 italic">"{intel.dailySummary}"</p></div>
                                    <div className="space-y-2 shrink-0"><h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1 flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-2" /> Weekly Aggregate</h4><p className="text-sm font-medium text-slate-300 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">{intel.weeklySummary}</p></div>
                                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 flex items-center sticky top-0 bg-secondary/80 backdrop-blur-md py-1 z-10"><Zap className="w-3.5 h-3.5 mr-2" /> Tactical Insights</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {intel.tacticalInsights.length > 0 ? intel.tacticalInsights.map((insight: any) => (
                                                <div key={insight.id} onClick={() => setActiveCalendarStaff(intel.staff)} className={cn("flex items-center gap-2 p-2 rounded-xl border transition-all text-[11px] font-bold cursor-pointer hover:scale-[1.02] active:scale-[0.98]", insight.type === 'CRITICAL' ? "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20" : insight.type === 'WARNING' ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20" : insight.type === 'POSITIVE' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10")}>
                                                    {insight.type === 'POSITIVE' ? <CheckCircle className="w-3 h-3" /> : <Info className="w-3 h-3" />}<span className="line-clamp-2">{insight.message}</span><ChevronRight className="w-3 h-3 ml-auto opacity-30" />
                                                </div>
                                            )) : <p className="text-[10px] font-bold text-muted-foreground opacity-30 italic px-1">No behavioral patterns flagged.</p>}
                                        </div>
                                    </div>
                                    {!intel.isTeam && intelItems.length === 1 && (
                                        <div className="mt-auto pt-6 border-t border-white/5 flex justify-end">
                                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 gap-2" onClick={() => router.push(`/staff/profile?id=${(intel.staff as any).id}`)}>Detailed 360 Insight <ChevronRight className="w-3 h-3" /></Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {activeCalendarStaff && (
                <InsightCalendarModal
                    isOpen={!!activeCalendarStaff}
                    onClose={() => setActiveCalendarStaff(null)}
                    staff={activeCalendarStaff}
                    attendanceLogs={attendanceLogs}
                    pulseFeed={pulseFeed}
                    nominations={nominations}
                />
            )}

            {activeDrillDown && (
                <Dialog open={!!activeDrillDown} onOpenChange={(open) => !open && setActiveDrillDown(null)}>
                    <DialogContent className="sm:max-w-[450px] apple-glass-darker border-none rounded-[2rem] p-8 shadow-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black font-headline tracking-tighter uppercase text-white flex items-center gap-3">
                                {activeDrillDown.id === 'team_early_today' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                {activeDrillDown.id === 'team_late_today' && <Clock className="w-5 h-5 text-amber-500" />}
                                {activeDrillDown.id === 'team_chronic_lates' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
                                {activeDrillDown.id === 'team_pending_reviews' && <Zap className="w-5 h-5 text-primary" />}

                                {activeDrillDown.id === 'team_early_today' && "Early Arrivals Today"}
                                {activeDrillDown.id === 'team_late_today' && "Late Arrivals Today"}
                                {activeDrillDown.id === 'team_chronic_lates' && "Behavioral Pattern Details"}
                                {activeDrillDown.id === 'team_pending_reviews' && "Review Bottlenecks"}
                                {activeDrillDown.id !== 'team_early_today' && activeDrillDown.id !== 'team_late_today' && activeDrillDown.id !== 'team_chronic_lates' && activeDrillDown.id !== 'team_pending_reviews' && "Intelligence Drill-Down"}
                            </DialogTitle>
                            <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                Actionable breakdown of the selected operational insight.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-3 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {!drillDownData || (Array.isArray(drillDownData) && drillDownData.length === 0) ? (
                                <div className="py-12 text-center flex flex-col items-center gap-4 opacity-30">
                                    <Info className="h-12 w-12" />
                                    <p className="font-black uppercase text-[10px] tracking-widest">No specific data points detected</p>
                                </div>
                            ) : (
                                drillDownData.map((item: any, i: number) => (
                                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-3 transition-all hover:bg-white/10 group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-black text-[10px] uppercase shadow-inner">
                                                    {item.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-sm text-white uppercase tracking-tight">{item.name}</span>
                                            </div>
                                            {item.value && (
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border",
                                                    activeDrillDown.id === 'team_late_today' ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : "text-primary border-primary/30 bg-primary/10"
                                                )}>
                                                    {item.value}
                                                </Badge>
                                            )}
                                        </div>
                                        {item.days && (
                                            <div className="flex flex-wrap gap-1 pl-11">
                                                {item.days.map((day: string) => (
                                                    <span key={day} className="text-[9px] uppercase font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                                                        {day}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {activeDrillDown.id === 'team_pending_reviews' && (
                                            <div className="flex justify-end mt-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 gap-2 px-3 rounded-xl"
                                                    onClick={() => {
                                                        setActiveDrillDown(null);
                                                        router.push('/tasks');
                                                    }}
                                                >
                                                    Triage Node <ChevronRight className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <DialogFooter className="mt-4 pt-4 border-t border-white/5">
                            <Button variant="ghost" onClick={() => setActiveDrillDown(null)} className="rounded-xl font-black uppercase text-[10px] tracking-widest opacity-40 w-full h-12">
                                Close Intelligence
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
          </div>
        </div>
    );
}

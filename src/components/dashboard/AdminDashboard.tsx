"use client"

import React, { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Plus,
    FileText,
    Calendar,
    Award,
    MonitorCheck,
    Receipt,
    MessageSquare,
    BookOpen,
    TrendingUp,
    Clock,
    CheckCircle2,
    Sparkles,
    ChevronRight,
    Megaphone,
    Shield,
    Users,
    Activity,
    MonitorDot,
    Zap,
    ShieldAlert,
    UserX,
    Filter,
    BarChart3,
    Building,
    HelpCircle,
    CreditCard,
    Stethoscope
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore"
import type { UserProfile, Task, Attendance, LeaveRequest, Nomination, SystemConfig, Permissions } from "@/lib/types"
import { ClockControl } from "@/components/attendance/ClockControl"
import { IntelligentSummaryCenter } from "@/components/reports/IntelligentSummaryCenter"
import { DashboardTaskList } from "./DashboardTaskList"
import { DashboardRecentReports } from "./DashboardRecentReports"
import { DashboardRecentChats } from "./DashboardRecentChats"
import { Announcements } from "./Announcements"
import { LiveFleetRadar } from "./LiveFleetRadar"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    BarChart,
    Bar,
    ReferenceLine
} from "recharts"
import {
    startOfWeek,
    endOfWeek,
    format,
    eachDayOfInterval,
    parseISO,
    subDays,
    startOfDay,
    endOfDay,
    isWithinInterval
} from "date-fns"
import { uiEmitter } from "@/lib/ui-emitter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface AdminDashboardProps {
    userProfile: UserProfile;
    permissions: Permissions;
    systemConfig: SystemConfig | null;
}

export function AdminDashboard({ userProfile, permissions, systemConfig }: AdminDashboardProps) {
  const router = useRouter()
  const firestore = useFirestore()

  // 1. DATA ORCHESTRATION (REAL-TIME DATA STREAMS)
  const attQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'attendance'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile.orgId]);
  const { data: attendanceLogs } = useCollection<Attendance>(attQuery);

  const tasksQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'tasks'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile.orgId]);
  const { data: allTasks } = useCollection<Task>(tasksQuery);

  const leaveQuery = useMemoFirebase(() =>
    query(collection(firestore!, 'leave_requests'), where('orgId', '==', userProfile.orgId))
  , [firestore, userProfile.orgId]);
  const { data: leaveRequests } = useCollection<LeaveRequest>(leaveQuery);

  const usersQuery = useMemoFirebase(() =>
    query(collection(firestore!, 'users'), where('orgId', '==', userProfile.orgId))
  , [firestore, userProfile.orgId]);
  const { data: allStaff } = useCollection<UserProfile>(usersQuery);

  const nominationsQuery = useMemoFirebase(() =>
    query(collection(firestore!, 'nominations'), where('orgId', '==', userProfile.orgId), where('status', '==', 'APPROVED'))
  , [firestore, userProfile.orgId]);
  const { data: allNominations } = useCollection<Nomination>(nominationsQuery);

  const quickActions = [
    { label: "Assign Task", icon: Plus, action: () => uiEmitter.emit('open-assign-task-dialog') },
    { label: "Broadcast", icon: Megaphone, action: () => uiEmitter.emit('open-new-announcement-dialog') },
    { label: "Staff Directory", icon: Users, route: "/staff" },
    { label: "Leave Management", icon: Calendar, route: "/staff/leave" },
    { label: "Financial Hub", icon: Receipt, route: "/finance" },
    { label: "Analytics Logs", icon: FileText, route: "/reports" },
    { label: "Message", icon: MessageSquare, route: "/chat" },
    { label: "Knowledge Base", icon: BookOpen, route: "/library" },
    { label: "Timesheet", icon: Clock, route: "/staff/attendance" },
    { label: "Team Roster", icon: Users, route: "/staff" },
    { label: "Book Workspace", icon: Building, route: "/livedisplay" },
    { label: "Policies", icon: Shield, route: "/library" },
    { label: "HR Helpdesk", icon: HelpCircle, action: () => uiEmitter.emit('open-it-support-dialog') },
    { label: "Payroll", icon: CreditCard, route: "/finance" },
    { label: "Health & Benefits", icon: Stethoscope, route: "/staff/profile" }
  ]

  const activeStaffIds = useMemo(() => allStaff?.map(s => s.id) || [], [allStaff])

  const triageQueue = useMemo(() => {
    const pendingLeaves = leaveRequests
      ?.filter(req => req.status === 'PENDING' && activeStaffIds.includes(req.userId))
      .map(req => ({
          id: req.id,
          type: 'LEAVE',
          title: `Leave: ${req.userName}`,
          date: req.createdAt,
          badgeClass: "bg-amber-500/20 text-amber-500 border-amber-500/30"
      })) || []

    const pendingTasks = allTasks
      ?.filter(t => t.status === 'AWAITING_REVIEW' && activeStaffIds.includes(t.assignedTo))
      .map(t => ({
          id: t.id,
          type: 'TASK',
          title: `Review: ${t.title}`,
          date: t.createdAt,
          badgeClass: "bg-primary/20 text-primary border-primary/30"
      })) || []

    return [...pendingLeaves, ...pendingTasks].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [leaveRequests, allTasks, activeStaffIds])

  const handleAction = (item: any) => {
    if (item.route) router.push(item.route)
    else if (item.action) item.action()
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto justify-start animate-in fade-in zoom-in-95 duration-700 pb-12 overflow-x-hidden">

        {/* 1. STRATEGIC QUICK ACTIONS */}
        <div className="w-full relative px-1">
            <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 pt-1 custom-scrollbar no-scrollbar">
                {quickActions.map((action, idx) => {
                    const Icon = action.icon
                    return (
                    <button
                        key={idx}
                        onClick={() => handleAction(action)}
                        className="shrink-0 flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full bg-card border border-border shadow-sm hover:border-primary/50 hover:bg-primary/5 text-[10px] md:text-xs font-black uppercase tracking-[0.1em] text-muted-foreground hover:text-primary transition-all active:scale-95"
                    >
                        <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" /> {action.label}
                    </button>
                    )
                })}
            </div>
        </div>

        {/* 2. THE COMMAND STRIP (Top Row) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">

            {/* System Clock & Readiness (Span 3) */}
            <div className="lg:col-span-3 h-full">
                <ClockControl
                    userProfile={userProfile}
                    permissions={permissions}
                    systemConfig={systemConfig}
                    className="bg-card border-border shadow-sm rounded-2xl h-full p-4 md:p-6"
                />
            </div>

            {/* Strategic Intelligence Rotator (Span 5) */}
            <div className="lg:col-span-5 h-full">
                <IntelligentSummaryCenter
                    staffList={allStaff || []}
                    attendanceLogs={attendanceLogs || []}
                    tasks={allTasks || []}
                    leaveRequests={leaveRequests || []}
                    nominations={allNominations || []}
                />
            </div>

            {/* Live Fleet Radar (Span 4) */}
            <div className="lg:col-span-4 h-full">
                <LiveFleetRadar
                    staffList={allStaff || []}
                    attendanceLogs={attendanceLogs || []}
                />
            </div>
        </div>
      {/* 3. THE TRIAGE & EXECUTION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">

            {/* Triage Queue (Span 4) */}
            <Card className="lg:col-span-4 apple-glass border-none shadow-2xl flex flex-col h-fit max-h-[600px] overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-3 md:pb-4 bg-orange-500/5 shrink-0 px-4 md:px-8 pt-5 md:pt-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Triage Queue</CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4 overflow-y-auto custom-scrollbar space-y-3 bg-black/10">
                    {triageQueue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20 h-full">
                            <Shield className="w-10 h-10 md:w-12 md:h-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center px-4 md:px-6 leading-relaxed">No pending requests awaiting administrative authorization.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {triageQueue.map(item => (
                                <div
                                    key={`${item.type}-${item.id}`}
                                    onClick={() => router.push(item.type === 'LEAVE' ? '/staff/leave' : '/tasks')}
                                    className="p-3 md:p-4 rounded-2xl border border-white/5 flex justify-between items-center bg-card/40 hover:bg-white/5 hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
                                >
                                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                        <Badge variant="outline" className={cn("text-[7px] md:text-[8px] font-black uppercase px-2 py-0.5 border-none rounded-lg", item.badgeClass)}>
                                            {item.type}
                                        </Badge>
                                        <span className="font-black text-[10px] md:text-xs uppercase tracking-tight text-white group-hover:text-primary transition-colors truncate">{item.title}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Active Tasks Hub (Span 8) */}
            <Card className="lg:col-span-8 apple-glass border-none shadow-2xl overflow-hidden h-fit max-h-[600px] flex flex-col">
                <CardHeader className="border-b border-white/5 pb-3 md:pb-4 px-4 md:px-8 pt-5 md:pt-6 bg-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Active Tasks Hub</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase opacity-40 mt-1">Personnel task deployment & status monitoring</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 md:h-9 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white text-[8px] md:text-[9px] font-black uppercase tracking-widest gap-2 w-fit"
                            onClick={() => router.push('/tasks')}
                        >
                            Task Center <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </CardHeader>
                <div className="p-3 md:p-6 overflow-y-auto custom-scrollbar flex-1 overflow-x-auto w-full">
                    <DashboardTaskList userProfile={userProfile} permissions={permissions} />
                </div>
            </Card>
        </div>

        {/* 4. BROADCAST & COMMS STACK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
            <Card className="apple-glass border-none shadow-xl overflow-hidden">
                <CardHeader className="border-b border-white/5 px-4 md:px-8 pt-5 md:pt-6 pb-3 md:pb-4 bg-white/5">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Broadcast Message</CardTitle>
                        <Button variant="ghost" className="h-8 text-[9px] font-black text-primary hover:underline uppercase" onClick={() => uiEmitter.emit('open-new-announcement-dialog')}>Create New</Button>
                    </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <Announcements />
                </CardContent>
            </Card>

            <Card className="apple-glass border-none shadow-xl overflow-hidden">
                <CardHeader className="border-b border-white/5 px-4 md:px-8 pt-5 md:pt-6 pb-3 md:pb-4 bg-white/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Personnel Communications</CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-[250px] overflow-y-auto custom-scrollbar">
                    <DashboardRecentChats />
                </CardContent>
            </Card>
        </div>

    </div>
  )
}

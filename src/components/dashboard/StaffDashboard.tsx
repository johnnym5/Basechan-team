"use client"

import React, { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { LiveFleetRadar } from "./LiveFleetRadar"
import { Announcements } from "./Announcements"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { startOfWeek, endOfWeek, format, eachDayOfInterval, parseISO } from "date-fns"
import { uiEmitter } from "@/lib/ui-emitter"

import { useDeviceTrust } from "@/hooks/useDeviceTrust"

interface StaffDashboardProps {
    userProfile: UserProfile;
    permissions: Permissions;
    systemConfig: SystemConfig | null;
}

export function StaffDashboard({ userProfile, permissions, systemConfig }: StaffDashboardProps) {
  const router = useRouter()
  const firestore = useFirestore()
  const { isMobile } = useDeviceTrust()

  const quickActions = [
    { label: "Add Task", icon: Plus, action: () => uiEmitter.emit('open-assign-task-dialog') },
    { label: "Submit EOD", icon: FileText, route: "/staff/reports" },
    { label: "Request Leave", icon: Calendar, action: () => uiEmitter.emit('open-request-leave-dialog') },
    { label: "Nominate Peer", icon: Award, action: () => uiEmitter.emit('open-recognition-dialog' as any) },
    { label: "IT Support", icon: MonitorCheck, action: () => uiEmitter.emit('open-it-support-dialog') },
    { label: "Log Expense", icon: Receipt, action: () => uiEmitter.emit('open-new-requisition-dialog') },
    { label: "Message", icon: MessageSquare, route: "/chat" },
    { label: "Workbooks", icon: BookOpen, route: "/library" },
    { label: "Timesheet", icon: Clock, route: "/staff/attendance" },
    { label: "Staff Directory", icon: Users, route: "/staff" },
    { label: "Book Workspace", icon: Building, route: "/livedisplay" },
    { label: "Policies", icon: Shield, route: "/library" },
    { label: "HR Helpdesk", icon: HelpCircle, action: () => uiEmitter.emit('open-it-support-dialog') },
    { label: "Payroll", icon: CreditCard, route: "/finance" },
    { label: "Health & Benefits", icon: Stethoscope, route: "/staff/profile" }
  ]

  // Broadcast access for all nodes
  quickActions.push({
      label: "Broadcast",
      icon: Megaphone,
      action: () => uiEmitter.emit('open-new-announcement-dialog')
  });

  // DATA FETCHING
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

  // Weekly Hours Calculation
  const weeklyHoursData = useMemo(() => {
    const now = new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 })
    const end = endOfWeek(now, { weekStartsOn: 1 })
    const daysInterval = eachDayOfInterval({ start, end }).slice(0, 5)

    return daysInterval.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const logsForDay = attendanceLogs?.filter(log => log.userId === userProfile.id && log.date === dateStr) || []
      const totalSeconds = logsForDay.reduce((sum, log) => sum + (log.duration || 0), 0)
      return {
        name: format(day, 'EEE'),
        hours: Number((totalSeconds / 3600).toFixed(1))
      }
    })
  }, [attendanceLogs, userProfile.id])

  const archivedTasksCount = useMemo(() =>
    allTasks?.filter(t => t.assignedTo === userProfile.id && t.status === 'ARCHIVED').length || 0
  , [allTasks, userProfile.id]);

  const handleAction = (item: any) => {
    if (item.route) router.push(item.route)
    else if (item.action) item.action()
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 max-w-[1600px] mx-auto pb-10 overflow-x-hidden">

      {/* 1. THE PILL CAROUSEL (Scrollable Quick Actions) */}
      <div className="w-full relative px-1">
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 pt-1 custom-scrollbar snap-x no-scrollbar md:no-scrollbar">
          {quickActions.map((action, idx) => {
            const Icon = action.icon
            return (
              <button
                key={idx}
                onClick={() => handleAction(action)}
                className="shrink-0 snap-start flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-card border border-border shadow-sm hover:border-primary/50 hover:bg-primary/5 text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all active:scale-95"
              >
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" /> {action.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. THE COMMAND STRIP (Top Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">

        {/* Active Duty Timer (Span 3) */}
        <div className="lg:col-span-3 h-full">
            <ClockControl
                userProfile={userProfile}
                permissions={permissions}
                systemConfig={systemConfig}
                className="bg-card border-border shadow-sm rounded-2xl h-full p-4 md:p-6"
            />
        </div>

        {/* The Intelligent Briefing Rotator (Span 5) */}
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

      {/* 3. THE EXECUTION STRIP (Bottom Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">

        {/* Active Tasks (Span 8) */}
        <Card className="lg:col-span-8 bg-card border-border shadow-sm rounded-2xl overflow-hidden min-h-[300px] md:min-h-[400px]">
           <CardHeader className="border-b border-border/50 pb-3 md:pb-4 px-4 md:px-5 pt-4 md:pt-5 bg-secondary/5">
             <CardTitle className="text-xs font-black uppercase tracking-wider">Active Tasks Hub</CardTitle>
           </CardHeader>
           <div className="p-3 md:p-5 flex flex-col h-full overflow-x-auto w-full custom-scrollbar">
             <DashboardTaskList userProfile={userProfile} permissions={permissions} />
           </div>
        </Card>

        {/* Broadcast Message & Comms Stack (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6 w-full">
          <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-3 px-4 md:px-5 pt-4 md:pt-5 flex flex-row justify-between items-center bg-secondary/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest">Broadcast Message</CardTitle>
              <button
                onClick={() => uiEmitter.emit('open-new-announcement-dialog')}
                className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter"
              >
                Create New
              </button>
            </CardHeader>
            <CardContent className="p-3 md:p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                <Announcements />
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-3 px-4 md:px-5 pt-4 md:pt-5 bg-secondary/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest">Personnel Comms</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[250px] overflow-y-auto custom-scrollbar">
                <DashboardRecentChats />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}

"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    Plus,
    FileText,
    Calendar,
    Award,
    MonitorCheck,
    Receipt,
    MessageSquare,
    BookOpen,
    Clock,
    Megaphone,
    Shield,
    Users,
    Building,
    HelpCircle,
    CreditCard,
    Stethoscope
} from "lucide-react"
import { useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import type { UserProfile, Task, Attendance, LeaveRequest, Nomination, SystemConfig, Permissions, DailyReport } from "@/lib/types"
import { ClockControl } from "@/components/attendance/ClockControl"
import { IntelligentSummaryCenter } from "@/components/reports/IntelligentSummaryCenter"
import { HeroKpiStrip } from "./HeroKpiStrip"
import { DashboardTaskList } from "./DashboardTaskList"
import { DashboardRecentChats } from "./DashboardRecentChats"
import { StaffPerformanceScore } from "./StaffPerformanceScore"
import { Announcements } from "./Announcements"
import { OperationalCalendarHub } from "./OperationalCalendarHub"
import { useScrubbedData } from "@/hooks/useScrubbedData"
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from "date-fns"
import { uiEmitter } from "@/lib/ui-emitter"

interface StaffDashboardProps {
    userProfile: UserProfile;
    permissions: Permissions;
    systemConfig: SystemConfig | null;
}

export function StaffDashboard({ userProfile, permissions, systemConfig }: StaffDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const firestore = useFirestore()

  const [activeTab, setActiveTab] = useState<'overview' | 'calendar'>('overview')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'calendar') {
      setActiveTab('calendar')
    }
  }, [searchParams])

  const quickActions = [
    { label: "New Task", icon: Plus, action: () => uiEmitter.emit('open-assign-task-dialog') },
    { label: "Submit EOD", icon: FileText, route: "/staff/reports" },
    { label: "Request Leave", icon: Calendar, action: () => uiEmitter.emit('open-request-leave-dialog') },
    { label: "Give Award", icon: Award, action: () => uiEmitter.emit('open-recognition-dialog' as any) },
    { label: "IT Support", icon: MonitorCheck, action: () => uiEmitter.emit('open-it-support-dialog') },
    { label: "Log Expense", icon: Receipt, action: () => uiEmitter.emit('open-new-requisition-dialog') },
    { label: "Messages", icon: MessageSquare, route: "/chat" },
    { label: "Workbooks", icon: BookOpen, route: "/library" },
    { label: "Timesheet", icon: Clock, route: "/staff/attendance" },
    ...(permissions.canViewTeam ? [{ label: "Staff Directory", icon: Users, route: "/staff" }] : []),
    { label: "Book Workspace", icon: Building, route: "/livedisplay" },
    { label: "Policies", icon: Shield, route: "/library" },
    { label: "HR Helpdesk", icon: HelpCircle, action: () => uiEmitter.emit('open-it-support-dialog') },
    { label: "Payroll", icon: CreditCard, route: "/finance" },
    { label: "Benefits", icon: Stethoscope, route: "/staff/profile" }
  ]

  quickActions.push({
      label: "Broadcast",
      icon: Megaphone,
      action: () => uiEmitter.emit('open-new-announcement-dialog')
  });

  // DATA FETCHING
  const attQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId),
      where('userId', '==', userProfile.id),
    ) : null
  , [firestore, userProfile.orgId, userProfile.id]);
  const { data: attendanceLogs } = useCollection<Attendance>(attQuery);

  const orgAttendanceQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'attendance'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile.orgId]);
  const { data: allOrgAttendance } = useCollection<Attendance>(orgAttendanceQuery);

  const tasksQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'tasks'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile.orgId]);
  const { data: allTasks } = useCollection<Task>(tasksQuery);

  const leaveQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'leave_requests'),
      where('orgId', '==', userProfile.orgId),
      where('userId', '==', userProfile.id),
    ) : null
  , [firestore, userProfile.orgId, userProfile.id]);
  const { data: leaveRequests } = useCollection<LeaveRequest>(leaveQuery);

  const usersQuery = useMemoFirebase(() =>
    query(collection(firestore!, 'users'), where('orgId', '==', userProfile.orgId))
  , [firestore, userProfile.orgId]);
  const { data: allStaffRaw } = useCollection<UserProfile>(usersQuery);
  const { activeStaff: allStaff, activeAttendance: activeOrgAttendance } = useScrubbedData({
    staffList: allStaffRaw || [],
    attendanceLogs: allOrgAttendance || []
  });

  const reportsQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'daily_reports'),
      where('orgId', '==', userProfile.orgId),
      where('userId', '==', userProfile.id),
    ) : null
  , [firestore, userProfile.orgId, userProfile.id]);
  const { data: allReports } = useCollection<DailyReport>(reportsQuery);

  const nominationsQuery = useMemoFirebase(() =>
    query(collection(firestore!, 'nominations'), where('orgId', '==', userProfile.orgId), where('status', '==', 'APPROVED'))
  , [firestore, userProfile.orgId]);
  const { data: allNominations } = useCollection<Nomination>(nominationsQuery);

  const handleAction = (item: any) => {
    if (item.route) router.push(item.route)
    else if (item.action) item.action()
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 max-w-[1600px] mx-auto pb-10 overflow-x-hidden">

      {/* DASHBOARD TAB SWITCHER */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <TabsList className="bg-black/40 border border-white/10 p-1.5 rounded-2xl">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl text-xs font-black uppercase tracking-wider px-6 py-2.5 transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl text-xs font-black uppercase tracking-wider px-6 py-2.5 transition-all"
            >
              Operational Calendar & Attendance
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {/* HERO KPI STRIP */}
          <HeroKpiStrip
            staffList={allStaff || []}
            attendanceLogs={activeOrgAttendance}
            tasks={allTasks || []}
            leaveRequests={leaveRequests || []}
          />

          {/* 1. THE PILL CAROUSEL */}
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

          {/* 2. OPERATIONAL SUMMARY (Top Row) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">

            {/* Active Session Timer (Span 3) */}
            <div className="lg:col-span-3 h-full">
                <ClockControl
                    userProfile={userProfile}
                    permissions={permissions}
                    systemConfig={systemConfig}
                    className="bg-card border-border shadow-sm rounded-2xl h-full p-4 md:p-6"
                />
            </div>

            {/* The Personal Insights Rotator (Span 5) */}
            <div className="lg:col-span-5 h-full">
                <IntelligentSummaryCenter
                    staffList={allStaff || []}
                    attendanceLogs={attendanceLogs || []}
                    tasks={allTasks || []}
                    leaveRequests={leaveRequests || []}
                    nominations={allNominations || []}
                    reports={allReports || []}
                />
            </div>

            {/* Staff Performance Standing (Span 4) */}
            <div className="lg:col-span-4 h-full">
                <StaffPerformanceScore userProfile={userProfile} isAdmin={permissions.canManageStaff || permissions.canManageCompany} />
            </div>
          </div>

          {/* 3. TASK HUB (Bottom Row) */}
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
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => uiEmitter.emit('open-broadcast-system')}>Broadcast Message</CardTitle>
                  <button
                    onClick={() => uiEmitter.emit('open-broadcast-system')}
                    className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter"
                  >
                    New Post
                  </button>
                </CardHeader>
                <CardContent className="p-3 md:p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <Announcements />
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/50 pb-3 px-4 md:px-5 pt-4 md:pt-5 bg-secondary/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest">Staff Communications</CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-[250px] overflow-y-auto custom-scrollbar">
                    <DashboardRecentChats />
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* TAB 2: OPERATIONAL CALENDAR & ATTENDANCE */}
        <TabsContent value="calendar" className="mt-0">
          <OperationalCalendarHub
            userProfile={userProfile}
            staffList={allStaff || []}
            attendanceLogs={attendanceLogs || []}
            reportsData={allReports || []}
            tasks={allTasks || []}
            leaveRequests={leaveRequests || []}
            isAdmin={false}
          />
        </TabsContent>
      </Tabs>

    </div>
  )
}

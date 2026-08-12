'use client';

import React, { useState, useMemo } from "react";
import { ClockControl } from "@/components/attendance/ClockControl";
import { AttendanceHistory } from "@/components/attendance/AttendanceHistory";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Attendance } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingApprovals } from "@/components/attendance/PendingApprovals";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { LiveStaffMonitor } from "@/components/attendance/LiveStaffMonitor";
import { StaffAttendanceAnalytics } from "@/components/attendance/StaffAttendanceAnalytics";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, CheckCircle2, ShieldAlert, CalendarDays, Timer } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";
import { cn } from "@/lib/utils";

/**
 * ADMIN / HR ATTENDANCE DASHBOARD
 * Bento Box Architecture
 */
function AdminAttendanceDashboard({
    userProfile,
    permissions,
    systemConfig
}: {
    userProfile: UserProfile,
    permissions: any,
    systemConfig: any
}) {
    const firestore = useFirestore();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    // KPI Queries
    const targetDateStr = useMemo(() => format(selectedDate || new Date(), 'yyyy-MM-dd'), [selectedDate]);

    const attendanceQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'attendance'), where('orgId', '==', userProfile.orgId), where('date', '==', targetDateStr)) : null
    , [firestore, userProfile.orgId, targetDateStr]);
    const { data: selectedDayAttendance } = useCollection<Attendance>(attendanceQuery);

    const usersQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
    , [firestore, userProfile.orgId]);
    const { data: allUsers } = useCollection<UserProfile>(usersQuery);

    const pendingQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'attendance'), where('orgId', '==', userProfile.orgId), where('status', '==', 'PENDING')) : null
    , [firestore, userProfile.orgId]);
    const { data: pendingRecords } = useCollection<Attendance>(pendingQuery);

    const stats = useMemo(() => {
        const total = allUsers?.length || 0;
        const active = selectedDayAttendance?.filter(r => !r.clockOut).length || 0;
        const pending = pendingRecords?.length || 0;
        return { total, active, pending };
    }, [allUsers, selectedDayAttendance, pendingRecords]);

    return (
        <div className="flex flex-col space-y-6 w-full animate-in fade-in zoom-in-95 duration-500">
            {/* 1. KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 border-white/5 bg-secondary/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-3.5 h-3.5 text-primary opacity-60" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Staff</span>
                    </div>
                    <span className="text-2xl font-black font-headline tracking-tighter">{stats.total}</span>
                </Card>
                <Card className="p-4 border-white/5 bg-secondary/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-500 opacity-60" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Currently Active</span>
                    </div>
                    <span className="text-2xl font-black font-headline tracking-tighter text-emerald-500">{stats.active}</span>
                </Card>
                <Card className="p-4 border-white/5 bg-secondary/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 opacity-60" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Reports Filed</span>
                    </div>
                    <span className="text-2xl font-black font-headline tracking-tighter text-blue-500">{selectedDayAttendance?.length || 0}</span>
                </Card>
                <Card className={cn(
                    "p-4 border-amber-500/20 bg-amber-500/5 shadow-sm transition-all",
                    stats.pending > 0 && "ring-1 ring-amber-500/30 animate-pulse"
                )}>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 opacity-60" />
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Pending Verification</span>
                    </div>
                    <span className="text-2xl font-black font-headline tracking-tighter text-amber-500">{stats.pending}</span>
                </Card>
            </div>

            {/* 2. MAIN BENTO GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* LEFT SIDE: LIVE ROSTER (Span 2) */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border-white/5 bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-6 border-b border-white/5 bg-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black font-headline tracking-tighter uppercase flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Personnel Telemetry
                                    </CardTitle>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Real-time Node Status Monitor</p>
                                </div>
                                <Timer className="w-5 h-5 text-primary opacity-20" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <LiveStaffMonitor userProfile={userProfile} variant="table" selectedDate={selectedDate} />
                        </CardContent>
                    </Card>

                    {/* Historical Analytics Table Placeholder / Integration */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Historical Performance Archive</h3>
                        </div>
                        <StaffAttendanceAnalytics staffId={userProfile.id} />
                    </div>
                </div>

                {/* RIGHT SIDE: CALENDAR & ACTION QUEUE */}
                <div className="space-y-6">
                    {/* Unified Single Calendar */}
                    <Card className="border-white/5 bg-secondary/5 rounded-[2rem] p-4 shadow-inner">
                        <CardHeader className="pb-4 px-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60">Operational Calendar</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="w-full scale-100"
                            />
                        </CardContent>
                    </Card>

                    {/* Actionable Pending Queue */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Awaiting Verification</h3>
                        </div>
                        <PendingApprovals userProfile={userProfile} variant="compact" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * STAFF PERSONAL ATTENDANCE DASHBOARD
 */
function StaffAttendanceDashboard({
    userProfile,
    permissions,
    systemConfig
}: {
    userProfile: UserProfile,
    permissions: any,
    systemConfig: any
}) {
    return (
        <div className="flex flex-col space-y-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* 1. CLOCK CONTROL */}
                <div className="lg:col-span-4 h-full">
                    <ClockControl
                        userProfile={userProfile}
                        permissions={permissions}
                        systemConfig={systemConfig}
                        className="bg-card/40 border-white/5 rounded-[2.5rem] shadow-2xl backdrop-blur-xl"
                    />
                </div>

                {/* 2. PERSONAL HISTORY */}
                <div className="lg:col-span-8 h-full min-h-[400px]">
                    <AttendanceHistory
                        userProfile={userProfile}
                    />
                </div>
            </div>

            {/* Weekly Summary Row / Analytics for Staff */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Personnel Performance Summary</h3>
                </div>
                <StaffAttendanceAnalytics staffId={userProfile.id} />
            </section>
        </div>
    );
}

export function AttendancePageContent({ noWrapper = false }: { noWrapper?: boolean }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null
    , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  const permissions = usePermissions(userProfile);

  const isLoading = isProfileLoading || isConfigLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 p-10">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (!userProfile) return null;

  const isAdmin = permissions.canApproveHR || permissions.canManageStaff;

  const content = isAdmin ? (
      <AdminAttendanceDashboard
        userProfile={userProfile}
        permissions={permissions}
        systemConfig={systemConfig}
      />
  ) : (
      <StaffAttendanceDashboard
        userProfile={userProfile}
        permissions={permissions}
        systemConfig={systemConfig}
      />
  );

  if (noWrapper) return content;

  return (
    <ModuleContainer
        title="Attendance Center"
        subtitle={isAdmin ? "Strategic Personnel Oversight" : "Active Service Monitoring"}
        noScroll={true}
    >
      <div className="h-full overflow-y-auto custom-scrollbar pr-1">
        {content}
      </div>
    </ModuleContainer>
  );
}

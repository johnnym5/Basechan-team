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
import { ScrollArea } from "@/components/ui/scroll-area";

import { AttendanceCenter } from "@/components/attendance/AttendanceCenter";

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

    const attendanceQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'attendance'), where('orgId', '==', userProfile.orgId)) : null
    , [firestore, userProfile.orgId]);
    const { data: allAttendance } = useCollection<Attendance>(attendanceQuery);

    const usersQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
    , [firestore, userProfile.orgId]);
    const { data: allUsers } = useCollection<UserProfile>(usersQuery);

    if (!allUsers || !allAttendance) {
        return <Skeleton className="h-[600px] w-full rounded-[2.5rem]" />;
    }

    return (
        <AttendanceCenter
            staffList={allUsers}
            attendanceLogs={allAttendance}
            currentUserProfile={userProfile}
        />
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

  const isAdmin = permissions.canManageStaff;

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

  if (noWrapper) {
      return (
          <ScrollArea className="h-full w-full pr-2">
              <div className="p-6 lg:p-8">
                {content}
              </div>
          </ScrollArea>
      );
  }

  return (
    <ModuleContainer
        title="Attendance Center"
        subtitle={isAdmin ? "Strategic Personnel Oversight" : "Active Service Monitoring"}
        noScroll={false}
    >
      {content}
    </ModuleContainer>
  );
}

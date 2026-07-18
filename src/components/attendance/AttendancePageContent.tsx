'use client';
import { ClockControl } from "@/components/attendance/ClockControl";
import { StatusFeed } from "@/components/attendance/StatusFeed";
import { AttendanceHistory } from "@/components/attendance/AttendanceHistory";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Attendance } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingApprovals } from "@/components/attendance/PendingApprovals";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamAttendanceHistory } from "@/components/attendance/TeamAttendanceHistory";
import { WorkforceRoster } from "@/components/attendance/WorkforceRoster";
import { LiveStaffMonitor } from "@/components/attendance/LiveStaffMonitor";
import { useState, useEffect } from "react";

export function AttendancePageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null
    , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  const permissions = usePermissions(userProfile);

  const pendingQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !permissions.canApproveHR) return null;
    return query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId),
      where('status', '==', 'PENDING')
    );
  }, [firestore, userProfile?.orgId, permissions.canApproveHR]);
  const { data: pendingRecords } = useCollection<Attendance>(pendingQuery);
  const pendingCount = pendingRecords?.length || 0;

  const isLoading = isProfileLoading || isConfigLoading;

  const storageKey = 'attendance-view-tab';
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem(storageKey);
      if (savedTab === 'history') return 'clock';
      if (savedTab === 'team-history') return 'live-view';
      if (savedTab) return savedTab;
    }
    return 'clock';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="pr-16 md:pr-32">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Attendance Center</h1>
        <p className="text-muted-foreground">Manage your work hours and see who's currently online.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-8 mb-6 overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="clock" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm font-semibold uppercase tracking-wider">Time Clock</TabsTrigger>

          {permissions.canApproveHR && (
            <TabsTrigger value="approvals" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm font-semibold uppercase tracking-wider">
              Approvals
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-4 h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-black shadow-lg shadow-destructive/50 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}

          <TabsTrigger value="roster" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm font-semibold uppercase tracking-wider">Workforce Roster</TabsTrigger>
          <TabsTrigger value="live-view" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm font-semibold uppercase tracking-wider">Live View</TabsTrigger>
        </TabsList>

        <TabsContent value="clock" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-6">
            <div className="lg:col-span-5 xl:col-span-4">
              <ClockControl userProfile={userProfile || null} permissions={permissions} systemConfig={systemConfig || null} />
            </div>
            <div className="lg:col-span-7 xl:col-span-8">
              <AttendanceHistory userProfile={userProfile || null} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roster" className="mt-0">
          {userProfile && <WorkforceRoster userProfile={userProfile} permissions={permissions} />}
        </TabsContent>

        <TabsContent value="live-view" className="mt-0">
          <div className="space-y-8 py-6">
            {permissions.canManageStaff && userProfile && (
              <LiveStaffMonitor userProfile={userProfile} />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                {permissions.canManageStaff && userProfile && (
                  <TeamAttendanceHistory userProfile={userProfile} />
                )}
              </div>
              <div className="lg:col-span-4">
                <StatusFeed userProfile={userProfile || null} permissions={permissions} />
              </div>
            </div>
          </div>
        </TabsContent>

        {permissions.canApproveHR && userProfile && (
          <TabsContent value="approvals" className="mt-0">
            <PendingApprovals userProfile={userProfile} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

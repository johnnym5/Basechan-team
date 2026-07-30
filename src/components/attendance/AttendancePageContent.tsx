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

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export function AttendancePageContent({ noWrapper = false }: { noWrapper?: boolean }) {
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
      <div className="space-y-8 p-10">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  const content = (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 h-full">
        <TabsList className="w-full justify-start border-b border-white/5 rounded-none h-auto p-0 bg-transparent gap-8 mb-8 overflow-x-auto overflow-y-hidden shrink-0 pb-0">
          <TabsTrigger value="clock" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 data-[state=active]:opacity-100 transition-all">Time Clock</TabsTrigger>

          {permissions.canApproveHR && (
            <TabsTrigger value="approvals" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 data-[state=active]:opacity-100 transition-all">
              Approvals
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-3 h-4 w-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center font-black shadow-lg shadow-destructive/50 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}

          <TabsTrigger value="roster" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 data-[state=active]:opacity-100 transition-all">Workforce Roster</TabsTrigger>
          <TabsTrigger value="live-view" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 data-[state=active]:opacity-100 transition-all">Live View</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <TabsContent value="clock" className="mt-0 focus-visible:outline-none h-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-full">
              <div className="lg:col-span-5 xl:col-span-4 h-full">
                <ClockControl userProfile={userProfile || null} permissions={permissions} systemConfig={systemConfig || null} />
              </div>
              <div className="lg:col-span-7 xl:col-span-8 h-full">
                <AttendanceHistory userProfile={userProfile || null} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roster" className="mt-0 focus-visible:outline-none h-full">
            {userProfile && <WorkforceRoster userProfile={userProfile} permissions={permissions} />}
          </TabsContent>

          <TabsContent value="live-view" className="mt-0 focus-visible:outline-none h-full flex flex-col">
            <div className="flex flex-col gap-6 h-full">
              <div className="shrink-0">
                {permissions.canManageStaff && userProfile && (
                  <LiveStaffMonitor userProfile={userProfile} />
                )}
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-8 h-full">
                  {permissions.canManageStaff && userProfile && (
                    <TeamAttendanceHistory userProfile={userProfile} />
                  )}
                </div>
                <div className="lg:col-span-4 h-full">
                  <StatusFeed userProfile={userProfile || null} permissions={permissions} />
                </div>
              </div>
            </div>
          </TabsContent>

          {permissions.canApproveHR && userProfile && (
            <TabsContent value="approvals" className="mt-0 focus-visible:outline-none h-full">
              <PendingApprovals userProfile={userProfile} />
            </TabsContent>
          )}
        </div>
      </Tabs>
  );

  if (noWrapper) return content;

  return (
    <ModuleContainer
        title="Attendance Center"
        subtitle="Operations & Personnel Oversight"
        noScroll={true}
    >
      {content}
    </ModuleContainer>
  );
}

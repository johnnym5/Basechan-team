'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { AttendanceReport } from "@/components/reports/AttendanceReport";
import { KPIAnalytics } from "@/components/reports/KPIAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitDailyReport } from "@/components/reports/SubmitDailyReport";
import { MyDailyReports } from "@/components/reports/MyDailyReports";
import { TeamDailyReports } from "@/components/reports/TeamDailyReports";
import { useState, useEffect } from "react";

export function ReportsPageContent({ initialPayload }: { initialPayload?: { tab?: string } }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  const storageKey = 'reports-view-tab';
  const [activeTab, setActiveTab] = useState('analytics');

  useEffect(() => {
    if (initialPayload?.tab) {
        setActiveTab(initialPayload.tab);
    } else {
        const savedTab = localStorage.getItem(storageKey);
        if (savedTab) setActiveTab(savedTab);
    }
  }, [initialPayload]);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab]);

  if (isProfileLoading) {
    return <Skeleton className="h-screen w-full" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
            {permissions.canManageStaff ? "Analyze performance, punctuality, and team productivity." : "Submit your daily report and view your history."}
        </p>
      </div>

      {permissions.canManageStaff ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="team-reports">Team Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {userProfile && <AttendanceReport userProfile={userProfile} />}
                {userProfile && <KPIAnalytics userProfile={userProfile} />}
            </div>
            {userProfile && <FinancialReport userProfile={userProfile} />}
          </TabsContent>
          <TabsContent value="team-reports" className="mt-4">
            {userProfile && <TeamDailyReports userProfile={userProfile} />}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
            {userProfile && <SubmitDailyReport userProfile={userProfile} />}
            {userProfile && <MyDailyReports userProfile={userProfile} />}
        </div>
      )}
    </div>
  );
}

'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { LeaveBalanceCard } from "@/components/leave/LeaveBalanceCard";
import { MyLeaveHistory } from "@/components/leave/MyLeaveHistory";
import { PendingLeaveApprovals } from "@/components/leave/PendingLeaveApprovals";
import { TeamLeaveCalendar } from "@/components/leave/TeamLeaveCalendar";
import { Button } from "@/components/ui/button";
import { PlusCircle, ShieldAlert } from "lucide-react";
import { RequestLeaveDialog } from "@/components/leave/RequestLeaveDialog";

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export function LeavePageContent({ noWrapper = false }: { noWrapper?: boolean }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    authUser && firestore ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  const isLoading = isProfileLoading;

  const storageKey = 'leave-view-tab';
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
        const savedTab = localStorage.getItem(storageKey);
        if (savedTab) return savedTab;
    }
    return 'my-leave';
  });

  useEffect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, activeTab);
      }
  }, [activeTab]);


  if (isLoading) {
    return (
      <div className="space-y-8 p-10">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!isLoading && !permissions.canAccessLeave) {
    return (
         <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
            <p className="text-muted-foreground mt-2">The leave management module is currently disabled for your account or organization.</p>
          </div>
    );
  }

  const content = (
      <div className="flex flex-col h-full gap-6">
        <div className="flex items-center justify-between shrink-0">
            <div>
                <h2 className="text-lg font-black font-headline tracking-tighter uppercase">Operations Leave Protocol</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Status, Balances & Team Coordination</p>
            </div>
            {permissions.canRequestLeave && (
                <Button onClick={() => setIsRequestLeaveOpen(true)} className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive">
                    <PlusCircle className="mr-2 h-4 w-4 text-primary"/>
                    Request Leave
                </Button>
            )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {permissions.canManageStaff && userProfile ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0">
                <TabsList className="bg-secondary/20 rounded-2xl p-1 w-fit border border-white/5 mb-8">
                    <TabsTrigger value="my-leave" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">My Leave</TabsTrigger>
                    {permissions.canApproveHR && <TabsTrigger value="approvals" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">Team Requests</TabsTrigger>}
                    <TabsTrigger value="calendar" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">Team Calendar</TabsTrigger>
                </TabsList>
                <TabsContent value="my-leave" className="mt-0 space-y-8 animate-in fade-in duration-500">
                    {userProfile && <LeaveBalanceCard userProfile={userProfile} />}
                    {userProfile && <MyLeaveHistory userProfile={userProfile} />}
                </TabsContent>
                {permissions.canApproveHR && (
                    <TabsContent value="approvals" className="mt-0 animate-in fade-in duration-500">
                        {userProfile && <PendingLeaveApprovals userProfile={userProfile} />}
                    </TabsContent>
                )}
                <TabsContent value="calendar" className="mt-0 animate-in fade-in duration-500">
                    {userProfile && <TeamLeaveCalendar userProfile={userProfile} />}
                </TabsContent>
                </Tabs>
            ) : (
                <div className="space-y-8">
                    {userProfile && <LeaveBalanceCard userProfile={userProfile} />}
                    {userProfile && <MyLeaveHistory userProfile={userProfile} />}
                </div>
            )}
        </div>

        {userProfile && (
            <RequestLeaveDialog
                open={isRequestLeaveOpen}
                onOpenChange={setIsRequestLeaveOpen}
                userProfile={userProfile}
            />
        )}
      </div>
  );

  if (noWrapper) return content;

  return (
    <ModuleContainer
        title="Leave Management"
        subtitle="Request time off and manage your leave balance."
        noScroll={true}
    >
      {content}
    </ModuleContainer>
  );
}

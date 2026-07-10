<<<<<<< HEAD
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
import { PlusCircle } from "lucide-react";
import { RequestLeaveDialog } from "@/components/leave/RequestLeaveDialog";

export function LeavePageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
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
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            Request time off and manage your leave balance.
          </p>
         </div>
         <Button onClick={() => setIsRequestLeaveOpen(true)}>
            <PlusCircle className="mr-2"/>
            Request Leave
         </Button>
       </div>
      
      {permissions.canManageStaff && userProfile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-leave">My Leave</TabsTrigger>
            {permissions.canApproveHR && <TabsTrigger value="approvals">Team Requests</TabsTrigger>}
            <TabsTrigger value="calendar">Team Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="my-leave" className="mt-4 space-y-6">
              {userProfile && <LeaveBalanceCard userProfile={userProfile} />}
              {userProfile && <MyLeaveHistory userProfile={userProfile} />}
          </TabsContent>
          {permissions.canApproveHR && (
            <TabsContent value="approvals" className="mt-4">
                {userProfile && <PendingLeaveApprovals userProfile={userProfile} />}
            </TabsContent>
          )}
           <TabsContent value="calendar" className="mt-4">
              {userProfile && <TeamLeaveCalendar userProfile={userProfile} />}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
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
    </>
  );
}
=======
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
import { PlusCircle } from "lucide-react";
import { RequestLeaveDialog } from "@/components/leave/RequestLeaveDialog";

export function LeavePageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
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
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            Request time off and manage your leave balance.
          </p>
         </div>
         <Button onClick={() => setIsRequestLeaveOpen(true)}>
            <PlusCircle className="mr-2"/>
            Request Leave
         </Button>
       </div>
      
      {permissions.canManageStaff && userProfile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-leave">My Leave</TabsTrigger>
            {permissions.canApproveHR && <TabsTrigger value="approvals">Team Requests</TabsTrigger>}
            <TabsTrigger value="calendar">Team Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="my-leave" className="mt-4 space-y-6">
              {userProfile && <LeaveBalanceCard userProfile={userProfile} />}
              {userProfile && <MyLeaveHistory userProfile={userProfile} />}
          </TabsContent>
          {permissions.canApproveHR && (
            <TabsContent value="approvals" className="mt-4">
                {userProfile && <PendingLeaveApprovals userProfile={userProfile} />}
            </TabsContent>
          )}
           <TabsContent value="calendar" className="mt-4">
              {userProfile && <TeamLeaveCalendar userProfile={userProfile} />}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
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
    </>
  );
}
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a

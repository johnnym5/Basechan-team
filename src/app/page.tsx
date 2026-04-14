'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BookCopy, Shield, Users, ListTodo } from 'lucide-react';
import AppLayout from './(app)/layout';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { DashboardTaskList } from "@/components/dashboard/DashboardTaskList";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Requisition, Task } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Announcements } from "@/components/dashboard/Announcements";
import { usePermissions } from "@/hooks/usePermissions";
import { ClockControl } from "@/components/attendance/ClockControl";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { PerformanceCard } from '@/components/dashboard/PerformanceCard';
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { CheckCircle } from "lucide-react";
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { DashboardRecentReports } from '@/components/dashboard/DashboardRecentReports';
import { DashboardRecentChats } from '@/components/dashboard/DashboardRecentChats';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { uiEmitter } from '@/lib/ui-emitter';
import { useImpersonation } from '@/context/ImpersonationProvider';


function DashboardGrid() {
    const { user: authUser, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();
    const { isImpersonating } = useImpersonation();

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, 
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);
    const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);

    const reqsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const inboxStatuses: string[] = [];
        if (permissions.canApproveHR) inboxStatuses.push('PENDING_HR');
        if (permissions.canApproveFinance) inboxStatuses.push('PENDING_FINANCE');
        if (permissions.canApproveMD) inboxStatuses.push('PENDING_MD');
        if (permissions.canDisburse) inboxStatuses.push('APPROVED');
        
        if (inboxStatuses.length === 0) return null;
        
        return query(
            collection(firestore, 'requisitions'),
            where('orgId', '==', userProfile.orgId),
            where('status', 'in', [...new Set(inboxStatuses)])
        );
    }, [firestore, userProfile, permissions]);
    const { data: pendingReqs, isLoading: reqsLoading } = useCollection<Requisition>(reqsQuery);
    
    const onlineUsersQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'users'),
            where('orgId', '==', userProfile.orgId),
            where('status', '==', 'ONLINE')
        );
    }, [firestore, userProfile]);
    const { data: onlineUsers, isLoading: onlineUsersLoading } = useCollection<UserProfile>(onlineUsersQuery);

    const activeTasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'tasks'),
            where('orgId', '==', userProfile.orgId),
            where('status', 'in', ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW'])
        );
    }, [firestore, userProfile]);
    const { data: activeTasks, isLoading: activeTasksLoading } = useCollection<Task>(activeTasksQuery);

    // Show welcome message if not logged in
    if (!authUser && !isAuthLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <BookCopy className="h-16 w-16 text-primary" />
            <h1 className="mt-4 text-3xl font-bold font-headline">Welcome to Basechan Staff</h1>
            <p className="mt-2 text-lg text-muted-foreground">The all-in-one internal management tool.</p>
        </div>
      );
    }
    
    const isLoading = isProfileLoading || isAuthLoading || reqsLoading || isConfigLoading || onlineUsersLoading || activeTasksLoading;

    if (isLoading) {
        return (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
             {isSuperAdmin && !isImpersonating && (
                <Card className="bg-primary/10 border-primary/20">
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>Super Admin Console</CardTitle>
                            <CardDescription>You have administrative privileges.</CardDescription>
                        </div>
                        <Button onClick={() => uiEmitter.emit('open-superadmin-dialog')}>
                            <Shield className="mr-2" /> Open Console
                        </Button>
                    </CardHeader>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardStatCard 
                    title="Pending Approvals" 
                    value={pendingReqs?.length || 0} 
                    icon={CheckCircle}
                    onClick={() => uiEmitter.emit('open-requisitions-dialog')}
                    color="bg-emerald-500/20 text-emerald-400"
                />
                <DashboardStatCard 
                    title="Staff Online" 
                    value={onlineUsers?.length || 0} 
                    icon={Users}
                    onClick={() => uiEmitter.emit('open-attendance-dialog')}
                    color="bg-sky-500/20 text-sky-400"
                />
                <DashboardStatCard 
                    title="Active Tasks" 
                    value={activeTasks?.length || 0} 
                    icon={ListTodo}
                    onClick={() => uiEmitter.emit('open-tasks-dialog')}
                    color="bg-amber-500/20 text-amber-400"
                />
                 {userProfile && <PerformanceCard userProfile={userProfile} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    <DashboardTaskList />
                    <Announcements />
                </div>

                {/* Side Column */}
                <div className="lg:col-span-1 space-y-6">
                    <ClockControl userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} />
                    <DashboardQuickActions />
                    <DashboardRecentReports />
                    <DashboardRecentChats />
                </div>
            </div>
        </div>
    );
}

export default function RootPage() {
  const { isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  // The main layout contains the logic for auth popups.
  // This page just renders the content inside.
  return (
    <AppLayout>
      <DashboardGrid />
    </AppLayout>
  );
}

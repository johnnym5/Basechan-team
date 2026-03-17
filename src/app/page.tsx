'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BookCopy, Shield } from 'lucide-react';
import AppLayout from './(app)/layout';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { ActiveTasks } from "@/components/dashboard/ActiveTasks";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Requisition } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Announcements } from "@/components/dashboard/Announcements";
import { usePermissions } from "@/hooks/usePermissions";
import { ClockControl } from "@/components/attendance/ClockControl";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { PerformanceCard } from '@/components/dashboard/PerformanceCard';
import { StatCard } from "@/components/dashboard/StatCard";
import { CheckCircle } from "lucide-react";
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentReports } from '@/components/dashboard/RecentReports';
import { RecentConversations } from '@/components/dashboard/RecentConversations';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { uiEmitter } from '@/lib/ui-emitter';


function DashboardGrid() {
    const { user: authUser, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

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
    
    // Show welcome message if not logged in
    if (!authUser && !isAuthLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <BookCopy className="h-16 w-16 text-primary" />
            <h1 className="mt-4 text-3xl font-bold font-headline">Welcome to Palilious</h1>
            <p className="mt-2 text-lg text-muted-foreground">The all-in-one internal management tool.</p>
        </div>
      );
    }
    
    const isLoading = isProfileLoading || isAuthLoading || reqsLoading || isConfigLoading;

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {isSuperAdmin && (
                <Card className="lg:col-span-3 bg-primary/10 border-primary/20">
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

            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ClockControl userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} />
                    {userProfile && <PerformanceCard userProfile={userProfile} />}
                </div>
                <ActiveTasks />
                <Announcements />
            </div>

            {/* Side Column */}
            <div className="lg:col-span-1 space-y-6">
                <StatCard 
                    title="Pending Approvals" 
                    value={pendingReqs?.length || 0} 
                    icon={CheckCircle}
                    href="/requisitions"
                    color="bg-emerald-500/20 text-emerald-400"
                />
                <QuickActions />
                <RecentReports />
                <RecentConversations />
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

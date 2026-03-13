'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { AuthDialog } from '@/components/auth/AuthDialog';
import AppLayout from './(app)/layout';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { ActiveTasks } from "@/components/dashboard/ActiveTasks";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import type { UserProfile, Requisition, Announcement, SystemConfig } from "@/lib/types";
import type { User } from 'firebase/auth';
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


function DashboardGrid() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

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
    
    const isLoading = isProfileLoading || reqsLoading || isConfigLoading;

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


// --- End of Dashboard Content ---

function PublicLandingPage({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="space-y-8 max-w-2xl">
            <Logo />
            <h1 className="text-4xl md:text-6xl font-bold font-headline">
                Streamline Your Internal Operations.
            </h1>
            <p className="text-lg text-muted-foreground">
                Palilious is the all-in-one platform for staff management, financial requisitions, task automation, and more. 
                Everything your organization needs, in one place.
            </p>
            <Button size="lg" onClick={onLoginClick}>
                Get Started
            </Button>
        </div>
    </div>
  );
}


export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const { isSuperAdmin } = useSuperAdmin();
  const router = useRouter();
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => 
      firestore && user ? doc(firestore, 'users', user.uid) : null, 
  [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (user && isAuthDialogOpen) {
      setIsAuthDialogOpen(false);
    }
  }, [user, isAuthDialogOpen]);
  
  useEffect(() => {
      if (!isUserLoading && user && isSuperAdmin) {
          router.replace('/superadmin');
      }
  }, [user, isUserLoading, isSuperAdmin, router]);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  if (user && !isSuperAdmin && userProfile) {
    return (
      <AppLayout>
        <DashboardGrid />
      </AppLayout>
    );
  }
  
  return (
    <>
        <PublicLandingPage onLoginClick={() => setIsAuthDialogOpen(true)} />
        <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
            {/* The trigger is part of PublicLandingPage, so this is just for the content */}
        </AuthDialog>
    </>
  );
}

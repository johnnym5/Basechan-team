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
import { usePermissions, type Permissions } from "@/hooks/usePermissions";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { ClockControl } from "@/components/attendance/ClockControl";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { uiEmitter } from '@/lib/ui-emitter';
import { PerformanceCard } from '@/components/dashboard/PerformanceCard';
import { StatCard } from "@/components/dashboard/StatCard";
import { CheckCircle, Megaphone, BookOpenCheck, FilePlus2, ListTodo, UserPlus } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';


function MobileDashboard({ userProfile, authUser }: { userProfile: UserProfile | null, authUser: User | null }) {
    const { config: systemConfig } = useSystemConfig(userProfile?.orgId);
    const permissions = usePermissions(userProfile);
    const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);

    const firestore = useFirestore();
    const attendanceQuery = useMemoFirebase(() => {
        if (!userProfile) return null;
        const today = new Date();
        const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return query(
          collection(firestore, 'attendance'),
          where('userId', '==', userProfile.id),
          where('date', '==', todayDateString),
          limit(1)
        );
      }, [firestore, userProfile]);

    const { data: attendanceData } = useCollection(attendanceQuery);

    useEffect(() => {
        if (attendanceData && attendanceData.length > 0) {
            setShiftStartTime(new Date(attendanceData[0].clockIn));
        }
    }, [attendanceData]);

    return (
        <main className="max-w-md mx-auto px-6 pt-8 space-y-8">
            <section className="space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
                {shiftStartTime && <p className="text-slate-500 dark:text-slate-400">Shift started {formatDistanceToNow(shiftStartTime, { addSuffix: true })}</p>}
            </section>
            
            <ClockControl userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} />
            <ActiveTasks />
            <Announcements />
        </main>
    )
}

function DesktopDashboard() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const [api, setApi] = useState<CarouselApi>()

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
    
     useEffect(() => {
        if (!api) { return }
        const interval = setInterval(() => {
            if (api.canScrollNext()) {
                api.scrollNext()
            } else {
                api.scrollTo(0)
            }
        }, 30000);
        return () => clearInterval(interval);
      }, [api]);

    const isLoading = isProfileLoading || reqsLoading || isConfigLoading;

    return (
        <div className="flex flex-col gap-8">
             {isLoading ? (
                <Skeleton className="h-[220px] w-full" />
             ) : (
                <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
                    <CarouselContent className="-ml-4">
                        <CarouselItem className="pl-4 basis-1/3">
                           <div className="h-full">
                                <ClockControl userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} className="h-full" />
                           </div>
                        </CarouselItem>
                         {userProfile && (
                          <CarouselItem className="pl-4 basis-1/3">
                            <div className="h-full">
                                <PerformanceCard userProfile={userProfile} />
                            </div>
                          </CarouselItem>
                        )}
                        <CarouselItem className="pl-4 basis-1/3">
                            <StatCard 
                                title="Pending Approvals" 
                                value={pendingReqs?.length || 0} 
                                icon={CheckCircle}
                                href="/requisitions"
                                color="bg-emerald-500/20 text-emerald-400"
                            />
                        </CarouselItem>
                    </CarouselContent>
                </Carousel>
             )}

            <ActiveTasks />
            <Announcements />
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
        <div className="md:hidden">
            <MobileDashboard userProfile={userProfile} authUser={user} />
        </div>
        <div className="hidden md:block">
            <DesktopDashboard />
        </div>
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

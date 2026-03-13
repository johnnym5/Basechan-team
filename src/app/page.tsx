'use client';

import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { AuthDialog } from '@/components/auth/AuthDialog';
import AppLayout from './(app)/layout';

// --- Start of Dashboard Content ---
import { StatCard } from "@/components/dashboard/StatCard";
import { CheckCircle, Megaphone, BookOpenCheck, FilePlus2, ListTodo, UserPlus } from "lucide-react";
import { ActiveTasks } from "@/components/dashboard/ActiveTasks";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import type { User } from 'firebase/auth';
import type { UserProfile, Requisition, Announcement, SystemConfig } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Announcements } from "@/components/dashboard/Announcements";
import { usePermissions, type Permissions } from "@/hooks/usePermissions";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { ClockControl } from "@/components/attendance/ClockControl";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { uiEmitter } from '@/lib/ui-emitter';
import { PerformanceCard } from '@/components/dashboard/PerformanceCard';

const ClockInCard = ({ userProfile, permissions, systemConfig }: { userProfile: UserProfile | null; permissions: Permissions; systemConfig: SystemConfig | null }) => {
  return (
    <div className="h-[220px]">
       <ClockControl 
        userProfile={userProfile} 
        permissions={permissions} 
        systemConfig={systemConfig}
        className="bg-primary/90 text-primary-foreground h-full"
      />
    </div>
  );
};

const LatestAnnouncementCard = ({ userProfile, authUser }: { userProfile: UserProfile | null, authUser: User | null }) => {
  const firestore = useFirestore();
  const announcementQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !authUser) return null;
    return query(
      collection(firestore, 'announcements'),
      where('orgId', '==', userProfile.orgId),
      where('visibleTo', 'array-contains-any', ['ALL', authUser.uid]),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore, userProfile, authUser]);

  const { data: announcements, isLoading } = useCollection<Announcement>(announcementQuery);
  const latestAnnouncement = announcements?.[0];

  return (
    <Card className="h-[220px] flex flex-col bg-primary/90 text-primary-foreground">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase">Latest Announcement</CardTitle>
            <Megaphone className="h-5 w-5 text-primary-foreground/70" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center text-center p-4 pt-0">
        {isLoading ? <Skeleton className="w-full h-24 bg-white/20" /> : latestAnnouncement ? (
          <div>
            <h3 className="text-2xl font-bold font-headline">{latestAnnouncement.title}</h3>
            <p className="text-primary-foreground/80 line-clamp-2 mt-1">{latestAnnouncement.content}</p>
          </div>
        ) : (
          <p className="text-primary-foreground/80">No announcements right now.</p>
        )}
      </CardContent>
    </Card>
  );
};

const QuickActionsCard = ({ permissions }: { permissions: Permissions }) => {
  return (
    <Card className="bg-primary/90 text-primary-foreground h-[220px] flex flex-col">
      <CardHeader className="p-4">
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription className="text-primary-foreground/80 line-clamp-1">Your most common tasks.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow grid grid-cols-2 gap-2 items-center p-4 pt-0">
        {permissions.canManageStaff && (
             <Button variant="secondary" className="flex-col h-full py-2 w-full bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 text-xs" onClick={() => uiEmitter.emit('open-invite-user-dialog')}>
                <UserPlus className="h-5 w-5 mb-1" />
                <span className="font-semibold">Add Member</span>
            </Button>
        )}
        <Button variant="secondary" className="flex-col h-full py-2 w-full bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 text-xs" onClick={() => uiEmitter.emit('open-assign-task-dialog')}>
          <ListTodo className="h-5 w-5 mb-1" />
          <span className="font-semibold">Add Task</span>
        </Button>
        <Button variant="secondary" className="flex-col h-full py-2 w-full bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 text-xs" onClick={() => uiEmitter.emit('open-new-workbook-dialog')}>
          <BookOpenCheck className="h-5 w-5 mb-1" />
          <span className="font-semibold">New Workbook</span>
        </Button>
        {permissions.canAccessRequisitions && (
          <Button variant="secondary" className="flex-col h-full py-2 w-full bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 text-xs" onClick={() => uiEmitter.emit('open-new-requisition-dialog')}>
            <FilePlus2 className="h-5 w-5 mb-1" />
            <span className="font-semibold">New Requisition</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

function DashboardContent() {
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
                        <CarouselItem className="pl-4">
                            <ClockInCard userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} />
                        </CarouselItem>
                         {userProfile && (
                          <CarouselItem className="pl-4">
                            <PerformanceCard userProfile={userProfile} />
                          </CarouselItem>
                        )}
                         <CarouselItem className="pl-4">
                            <LatestAnnouncementCard userProfile={userProfile} authUser={authUser} />
                        </CarouselItem>
                        <CarouselItem className="pl-4">
                            <QuickActionsCard permissions={permissions} />
                        </CarouselItem>
                    </CarouselContent>
                </Carousel>
             )}

            <ActiveTasks />

            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold font-headline">Recent Updates</h2>
                    {userProfile && permissions.canManageAnnouncements && (
                        <Button variant="outline" size="sm" onClick={() => uiEmitter.emit('open-new-announcement-dialog')}>
                            <Megaphone className="mr-2 h-4 w-4"/>
                            New Announcement
                        </Button>
                    )}
                 </div>
                <div className="grid grid-cols-1 gap-4">
                     {isLoading ? (
                        <><Skeleton className="h-24" /></>
                    ) : (
                        <>
                            <StatCard 
                                title="Pending Approvals" 
                                value={pendingReqs?.length || 0} 
                                icon={CheckCircle}
                                href="/requisitions"
                                color="bg-emerald-500/20 text-emerald-400"
                            />
                        </>
                    )}
                </div>
            </div>
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

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  if (user && !isSuperAdmin) {
    return (
      <AppLayout>
        <DashboardContent />
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

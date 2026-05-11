
'use client';

import { BookCopy, Shield } from 'lucide-react';
import AppLayout from './(app)/layout';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { DashboardTaskList } from "@/components/dashboard/DashboardTaskList";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Announcements } from "@/components/dashboard/Announcements";
import { usePermissions } from "@/hooks/usePermissions";
import { ClockControl } from "@/components/attendance/ClockControl";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { PerformanceCard } from '@/components/dashboard/PerformanceCard';
import { DashboardRecentChats } from '@/components/dashboard/DashboardRecentChats';
import { MaintenanceCard } from '@/components/dashboard/MaintenanceCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { uiEmitter } from '@/lib/ui-emitter';
import { useImpersonation } from '@/context/ImpersonationProvider';
import { LoginForm } from '@/components/auth/LoginForm';

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

    if (!authUser && !isAuthLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="mb-8">
                <BookCopy className="h-16 w-16 text-primary mx-auto" />
                <h1 className="mt-4 text-3xl font-bold font-headline">Welcome to StaffPortal</h1>
                <p className="mt-2 text-lg text-muted-foreground">Internal management redefined.</p>
            </div>
            <Card className="w-full max-w-md card-bg border-gray-800 shadow-2xl">
                <CardHeader>
                    <CardTitle>LOGIN</CardTitle>
                    <CardDescription>Enter your credentials to access the system.</CardDescription>
                </CardHeader>
                <CardContent className="text-left">
                    <LoginForm />
                </CardContent>
            </Card>
        </div>
      );
    }
    
    if (isProfileLoading || isAuthLoading || isConfigLoading) {
        return (
             <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-5 h-64"><Skeleton className="h-full w-full rounded-2xl" /></div>
                <div className="col-span-12 lg:col-span-7 h-64"><Skeleton className="h-full w-full rounded-2xl" /></div>
                <div className="col-span-12 lg:col-span-9 h-96"><Skeleton className="h-full w-full rounded-2xl" /></div>
                <div className="col-span-12 lg:col-span-3 space-y-6"><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-2xl" /></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
             {isSuperAdmin && !isImpersonating && (
                <Card className="card-bg border-primary/20 mb-6">
                    <CardHeader className="flex-row items-center justify-between py-4">
                        <div>
                            <CardTitle className="text-lg">Super Admin Console</CardTitle>
                        </div>
                        <Button size="sm" onClick={() => uiEmitter.emit('open-superadmin-dialog')}>
                            <Shield className="mr-2 h-4 w-4" /> Open Console
                        </Button>
                    </CardHeader>
                </Card>
            )}

            <div className="grid grid-cols-12 gap-6">
                <section className="col-span-12 lg:col-span-5">
                    <ClockControl userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} />
                </section>

                <section className="col-span-12 lg:col-span-7">
                    {userProfile && <PerformanceCard userProfile={userProfile} />}
                </section>

                <section className="col-span-12 lg:col-span-9">
                    {userProfile && <DashboardTaskList userProfile={userProfile} permissions={permissions} />}
                </section>

                <div className="col-span-12 lg:col-span-3 space-y-6">
                    {userProfile && <MaintenanceCard userProfile={userProfile} />}
                    <DashboardRecentChats />
                    <Announcements />
                </div>
            </div>
        </div>
    );
}

export default function RootPage() {
  return (
    <AppLayout>
      <DashboardGrid />
    </AppLayout>
  );
}

'use client';

import { Shield, Zap, Sparkles, Skull, RefreshCcw, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { DashboardTaskList } from "@/components/dashboard/DashboardTaskList";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Announcements } from "@/components/dashboard/Announcements";
import { usePermissions } from "@/hooks/usePermissions";
import { ClockControl } from "@/components/attendance/ClockControl";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { DashboardRecentChats } from '@/components/dashboard/DashboardRecentChats';
import { DashboardLiveDisplays } from '@/components/dashboard/DashboardLiveDisplays';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { uiEmitter } from '@/lib/ui-emitter';
import { cn } from '@/lib/utils';
import { LoginForm } from '@/components/auth/LoginForm';
import { StaffDashboard } from '@/components/dashboard/StaffDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { useEffect, useState } from 'react';

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export default function DashboardPage() {
    const { user: authUser, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();
    const [greeting, setGreeting] = useState('');

    const userProfileRef = useMemoFirebase(() =>
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null,
        [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile || null);
    const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Morning');
        else if (hour < 17) setGreeting('Afternoon');
        else setGreeting('Evening');
    }, []);

    if (!authUser && !isAuthLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in fade-in duration-700">
                <div className="mb-12">
                    <div className="relative inline-flex items-center justify-center">
                        <Image
                            src="/logo.png"
                            alt="Basechan International"
                            width={280}
                            height={80}
                            className="w-64 sm:w-72 h-auto object-contain drop-shadow-lg"
                            priority
                        />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground uppercase tracking-widest font-bold">Staff Portal</p>
                </div>
                <Card className="w-full max-w-md apple-glass-darker border-none shadow-3xl overflow-hidden rounded-[2.5rem]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest opacity-50">Please Login</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left">
                        <LoginForm />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isAuthLoading || isProfileLoading || isConfigLoading) {
        return (
            <div className="grid grid-cols-12 gap-4 md:gap-6 p-6">
                <div className="col-span-12 lg:col-span-5 h-64"><Skeleton className="h-full w-full rounded-[2rem]" /></div>
                <div className="col-span-12 lg:col-span-7 h-64"><Skeleton className="h-full w-full rounded-[2rem]" /></div>
                <div className="col-span-12 h-96"><Skeleton className="h-full w-full rounded-[2rem]" /></div>
            </div>
        )
    }

    const isAdmin = permissions.canManageStaff || permissions.canManageCompany;

    if (isAdmin) {
        return <AdminDashboard userProfile={userProfile!} permissions={permissions} systemConfig={systemConfig || null} />;
    }

    return <StaffDashboard userProfile={userProfile!} permissions={permissions} systemConfig={systemConfig || null} />;
}

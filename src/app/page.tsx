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
import { PerformanceCard } from '@/components/dashboard/PerformanceCard';
import { DashboardRecentChats } from '@/components/dashboard/DashboardRecentChats';
import { DashboardLiveDisplays } from '@/components/dashboard/DashboardLiveDisplays';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { uiEmitter } from '@/lib/ui-emitter';
import { cn } from '@/lib/utils';
import { LoginForm } from '@/components/auth/LoginForm';
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { DashboardRecentReports } from '@/components/dashboard/DashboardRecentReports';
import { useEffect, useState } from 'react';

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

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <div className="md:hidden space-y-1 px-1">
                 <h1 className="text-4xl font-black font-headline tracking-tighter">Good {greeting},</h1>
                 <p className="text-lg font-bold text-muted-foreground">{userProfile?.fullName.split(' ')[0]}</p>
             </div>

            {isSuperAdmin && (
                <div className="grid grid-cols-1 gap-4">
                    <Card className="apple-glass border-primary/20 bg-primary/5 rounded-[1.5rem] overflow-hidden">
                        <CardHeader className="flex-row items-center justify-between py-2 px-6">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Shield className="h-3 w-3 text-primary" /> Admin Panel
                            </CardTitle>
                            <Button size="sm" onClick={() => uiEmitter.emit('open-superadmin-dialog')} className="rounded-full h-6 px-3 text-[8px] font-black uppercase">Launch</Button>
                        </CardHeader>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-12 gap-4 md:gap-6">
                <section className="col-span-12 lg:col-span-5 xl:col-span-4 interactive-element h-fit">
                    <ClockControl userProfile={userProfile || null} permissions={permissions} systemConfig={systemConfig} />
                </section>

                <section className="col-span-12 lg:col-span-7 xl:col-span-8 h-full">
                    <PerformanceCard userProfile={userProfile || null} />
                </section>

                <section className="col-span-12 lg:col-span-8 xl:col-span-9 h-full">
                    <DashboardTaskList userProfile={userProfile || null} permissions={permissions} />
                </section>

                <div className="col-span-12 lg:col-span-4 xl:col-span-3">
                    <div className="flex flex-col gap-4 md:gap-6">
                        <DashboardQuickActions />
                        <DashboardLiveDisplays userProfile={userProfile || null} />
                        <DashboardRecentReports />
                        <DashboardRecentChats />
                        <Announcements />
                    </div>
                </div>
            </div>
        </div>
    );
}
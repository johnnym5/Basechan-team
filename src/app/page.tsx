'use client';

import { BookCopy, Shield, Zap, Sparkles, Skull, RefreshCcw, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { demoDataService } from '@/services/demo-data';
import { cn } from '@/lib/utils';
import { LoginForm } from '@/components/auth/LoginForm';
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { DashboardRecentReports } from '@/components/dashboard/DashboardRecentReports';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DashboardPage() {
    const { user: authUser, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isSuperAdmin } = useSuperAdmin();
    const [greeting, setGreeting] = useState('');
    const [isResetting, setIsResetting] = useState(false);

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

    const handleEmergencyReset = async () => {
        if (!firestore) return;
        setIsResetting(true);
        
        try {
            // 1. Terminate all UI listeners
            uiEmitter.emit('close-all-dialogs');
            
            // 2. Perform DB Purge (Identity-Safe)
            await demoDataService.purgeAllData(firestore);
            
            // 3. Purge Local Storage State & Cache
            if (typeof window !== 'undefined') {
                localStorage.clear();
                sessionStorage.clear();
                
                // Programmatic attempt to clear IndexedDB (Firestore cache)
                try {
                    if (window.indexedDB && window.indexedDB.databases) {
                        const databases = await window.indexedDB.databases();
                        databases.forEach(db => {
                            if (db.name) window.indexedDB.deleteDatabase(db.name);
                        });
                    }
                } catch (e) {
                    console.warn("Manual IndexedDB purge restricted by browser security.");
                }
            }
            
            toast({ title: "Infrastructure Resetting", description: "Wiping memory cache and re-initializing workstation..." });
            
            // 4. HARD RELOAD - Force browser to drop all JS targets and re-init SDK
            setTimeout(() => {
                window.location.href = window.location.origin;
            }, 1000);

        } catch (e: any) {
            console.error("[CRITICAL] Reset Sequence Interrupted:", e);
            window.location.reload();
        }
    };

    if (!authUser && !isAuthLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in fade-in duration-700">
            <div className="mb-12">
                <div className="relative inline-block">
                    <BookCopy className="h-20 w-20 text-primary mx-auto" />
                    <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-amber-500 animate-pulse" />
                </div>
                <h1 className="mt-6 text-4xl font-black font-headline tracking-tighter">Basechan Staff</h1>
                <p className="mt-2 text-lg text-muted-foreground uppercase tracking-widest font-bold">Staff Portal</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isSuperAdmin && (
                    <Card className="apple-glass border-primary/20 bg-primary/5 rounded-[1.5rem] overflow-hidden">
                        <CardHeader className="flex-row items-center justify-between py-2 px-6">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Shield className="h-3 w-3 text-primary" /> Admin Panel
                            </CardTitle>
                            <Button size="sm" onClick={() => uiEmitter.emit('open-superadmin-dialog')} className="rounded-full h-6 px-3 text-[8px] font-black uppercase">Launch</Button>
                        </CardHeader>
                    </Card>
                )}

                <Card className={cn(
                    "apple-glass border-rose-500/20 bg-rose-500/5 rounded-[1.5rem] overflow-hidden",
                    !isSuperAdmin && "sm:col-span-2"
                )}>
                    <CardHeader className="flex-row items-center justify-between py-2 px-6">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-rose-500">
                            <Skull className="h-3 w-3 text-rose-500" /> Infrastructure Reset
                        </CardTitle>
                        
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="rounded-full h-6 px-3 text-[8px] font-black uppercase bg-rose-600 hover:bg-rose-700">
                                    {isResetting ? <Loader2 className="h-2 w-2 animate-spin" /> : "Nuke"}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="apple-glass-darker border-none rounded-[2rem] p-8">
                                <AlertDialogHeader className="space-y-4">
                                    <div className="mx-auto p-4 rounded-full bg-rose-500/10 w-fit">
                                        <Skull className="h-10 w-10 text-rose-500" />
                                    </div>
                                    <div className="text-center">
                                        <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-rose-500">Absolute Reset</AlertDialogTitle>
                                        <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed">
                                            This protocol will purge workstation telemetry and kill all active data streams. 
                                            <br /><br />
                                            <span className="text-emerald-500 font-black">✔ Staff accounts are preserved.</span>
                                            <br />
                                            <span className="text-rose-500">✘ All tasks, chats, and records are deleted.</span>
                                            <br /><br />
                                            <span className="text-primary italic">Note: Browser Cache and IndexedDB will be cleared.</span>
                                        </AlertDialogDescription>
                                    </div>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-6">
                                    <AlertDialogAction onClick={handleEmergencyReset} className="w-full h-14 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all active:scale-95">
                                        Execute Nuke Protocol
                                    </AlertDialogAction>
                                    <AlertDialogCancel className="w-full h-10 border-none text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-transparent transition-all">Cancel</AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardHeader>
                </Card>
            </div>

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
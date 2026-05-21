'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { UserProfile, Attendance } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import AppHeader from '@/components/layout/AppHeader';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useSyncDialogsWithUrl } from '@/hooks/useSyncDialogsWithUrl';
import { hexToHslString, cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { BottomNavBar } from './BottomNavBar';
import { useShiftReminders } from '@/hooks/useShiftReminders';
import { DebriefModal } from '@/components/dashboard/DebriefModal';
import { PulseCheckDialog } from '@/components/shared/PulseCheckDialog';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const GlobalDialogs = dynamic(() => import('@/components/layout/GlobalDialogs').then(m => m.GlobalDialogs), { 
  ssr: false,
  loading: () => null
});

export function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [today, setToday] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isAnyDialogOpen, setIsAnyDialogOpen] = useState(false);

  useSyncDialogsWithUrl();

  useEffect(() => {
    setToday(format(new Date(), 'yyyy-MM-dd'));
    setMounted(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  
  const stableProfile = useMemo(() => {
    if (!user) return null;
    return {
        id: user.uid,
        orgId: userProfile?.orgId || 'basechan-international',
        email: user.email || '',
        fullName: userProfile?.fullName || user.displayName || 'Personnel',
        role: userProfile?.role || 'STAFF',
        position: userProfile?.position || 'Staff',
        joinedDate: userProfile?.joinedDate || new Date().toISOString(),
        ...userProfile
    } as UserProfile;
  }, [user, userProfile]);

  // AUTOMATIC PERMISSION BOOTSTRAP
  useEffect(() => {
    if (user && !isUserLoading && mounted) {
      const bootstrapPermissions = async () => {
        // Only run once per session to avoid spamming
        const hasBootstrapped = sessionStorage.getItem('basechan-permissions-bootstrapped');
        if (hasBootstrapped === 'true') return;

        console.log("[SYSTEM] Initiating Automated Authorization Sequence...");
        
        // 1. Notifications
        if ('Notification' in window && Notification.permission === 'default') {
          try { await Notification.requestPermission(); } catch (e) {}
        }

        // 2. Geolocation
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 2000 });
        }

        // 3. Idle Detection
        if ('IdleDetector' in window) {
           try { 
             // Note: IdleDetector usually requires a persistent user gesture, but we attempt it here.
             await (window as any).IdleDetector.requestPermission(); 
           } catch (e) {}
        }

        sessionStorage.setItem('basechan-permissions-bootstrapped', 'true');
      };

      // Slight delay to allow the UI to settle
      const timer = setTimeout(bootstrapPermissions, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, isUserLoading, mounted]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!user || !firestore || !today) return null;
    return query(collection(firestore, 'attendance'), where('userId', '==', user.uid), where('date', '==', today), limit(1));
  }, [user, firestore, today]);
  const { data: attendanceData } = useCollection<Attendance>(attendanceQuery);
  const attendanceRecord = attendanceData?.[0] || null;

  const { isIdle } = useIdleTimer(attendanceRecord);
  const permissions = usePermissions(stableProfile);
  const { config } = useSystemConfig(stableProfile?.orgId);

  useShiftReminders(stableProfile, config || null, attendanceRecord);

  useEffect(() => {
    if (!mounted || !config) return;
    const root = document.documentElement;
    if (config.branding_color) {
      const hsl = hexToHslString(config.branding_color);
      if (hsl) root.style.setProperty('--primary', hsl);
    }
  }, [config, mounted]);

  const handleLogout = async () => {
    if (auth) {
        try {
            await signOut(auth);
            window.location.href = '/';
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }
  };

  if (!mounted) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse w-12 h-12 rounded-full bg-primary/20" /></div>;

  return (
    <div className="h-[100dvh] w-full bg-muted/30 flex justify-center p-0 transition-all duration-500 overflow-hidden">
      <div className="flex w-full bg-background overflow-hidden relative h-full flex-row">
        
        <div className="sticky left-0 h-full z-[1000] hidden md:flex flex-col shrink-0 apple-glass-darker w-[5.5rem] lg:w-[7.5rem] group hover:w-64 transition-all duration-500 ease-apple-ease pointer-events-auto border-r border-white/5">
          <AppHeader
              userProfile={stableProfile}
              onMenuClick={() => {}}
              isLoggedIn={!!user}
              attendanceRecord={attendanceRecord}
              systemConfig={config || null}
              isVertical
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
              <PanelSwitcher isVertical />
          </div>

          {user && (
              <div className="p-4 border-t border-white/5 mt-auto opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-destructive hover:bg-destructive/10 h-10 rounded-xl px-4"
                    onClick={handleLogout}
                  >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span className="font-bold text-[10px] uppercase tracking-widest">Sign Out</span>
                  </Button>
              </div>
          )}
        </div>
        
        <main className="flex-1 overflow-y-scroll scroll-smooth [scrollbar-gutter:stable] custom-scrollbar bg-background/20 relative">
            <div className="w-full mx-auto max-w-[1600px] min-h-full border-x border-white/5 bg-background/30 p-4 md:p-6 animate-in fade-in duration-700">
                {children}
            </div>
        </main>
      </div>

      {user && stableProfile && (
        <>
            <BottomNavBar />
            <DebriefModal userProfile={stableProfile} />
            <PulseCheckDialog userProfile={stableProfile} />
            <Suspense fallback={null}>
                <GlobalDialogs 
                    userProfile={stableProfile} 
                    permissions={permissions} 
                    onAnyDialogOpenChange={setIsAnyDialogOpen}
                />
            </Suspense>
        </>
      )}
    </div>
  );
}

'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { UserProfile, Attendance } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import AppHeader from '@/components/layout/AppHeader';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useSyncDialogsWithUrl } from '@/hooks/useSyncDialogsWithUrl';
import { hexToHslString } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { BottomNavBar } from './BottomNavBar';
import { useShiftReminders } from '@/hooks/useShiftReminders';
import { DebriefModal } from '@/components/dashboard/DebriefModal';
import { PulseCheckDialog } from '@/components/shared/PulseCheckDialog';

const GlobalDialogs = dynamic(() => import('@/components/layout/GlobalDialogs').then(m => m.GlobalDialogs), { 
  ssr: false,
  loading: () => null
});

export function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isAnyDialogOpen, setIsAnyDialogOpen] = useState(false);
  const [today, setToday] = useState('');
  const [mounted, setMounted] = useState(false);

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

  if (!mounted) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse w-12 h-12 rounded-full bg-primary/20" /></div>;

  return (
    <div className="h-[100dvh] w-full bg-muted/30 flex justify-center p-0 transition-all duration-500 overflow-hidden">
      <div className="flex w-full bg-background overflow-hidden relative h-full flex-row">
        
        {/* 
            VERTICAL CONTROL PILLAR: LOCKED ON LEFT
            Locked at z-[1000] to ensure it remains interactive above workstation drop-downs.
        */}
        <div className="sticky left-0 h-full z-[1000] flex flex-col shrink-0 apple-glass-darker w-[5.5rem] lg:w-[7.5rem] group hover:w-64 transition-all duration-500 ease-apple-ease pointer-events-auto border-r border-white/5">
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
        </div>
        
        {/* MISSION WORKSPACE: SCROLLS BEHIND CONTROL CENTER */}
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
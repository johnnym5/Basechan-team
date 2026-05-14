'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { UserProfile, Attendance } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useSyncDialogsWithUrl } from '@/hooks/useSyncDialogsWithUrl';
import { hexToHslString } from '@/lib/utils';
import { ORG_ID } from '@/lib/config';
import dynamic from 'next/dynamic';

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

  const isLoggedIn = !!user;

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
        orgId: userProfile?.orgId || ORG_ID,
        email: user.email || '',
        fullName: userProfile?.fullName || user.displayName || user.email?.split('@')[0] || 'Personnel',
        username: userProfile?.username || user.email?.split('@')[0] || 'anonymous',
        role: userProfile?.role || 'STAFF',
        position: userProfile?.position || 'Staff',
        joinedDate: userProfile?.joinedDate || new Date().toISOString(),
        ...userProfile
    } as UserProfile;
  }, [user, userProfile]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!user || !firestore || !today) return null;
    return query(
      collection(firestore, 'attendance'),
      where('userId', '==', user.uid),
      where('date', '==', today),
      limit(1)
    );
  }, [user, firestore, today]);
  const { data: attendanceData } = useCollection<Attendance>(attendanceQuery);
  const attendanceRecord = attendanceData?.[0] || null;

  const { isIdle } = useIdleTimer(attendanceRecord);

  const permissions = usePermissions(stableProfile);
  const { config } = useSystemConfig(stableProfile?.orgId);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (config?.branding_color) {
      const hsl = hexToHslString(config.branding_color);
      if (hsl) root.style.setProperty('--primary', hsl);
    }
    if (config?.accent_color) {
      const hsl = hexToHslString(config.accent_color);
      if (hsl) root.style.setProperty('--accent', hsl);
    }
  }, [config, mounted]);

  if (!mounted) {
      return <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Initializing Secure Terminal</p>
          </div>
      </div>;
  }

  return (
    <div className="min-h-screen-safe w-full bg-muted/30 flex justify-center p-0 md:p-3 lg:p-4 xl:p-6 transition-all duration-500">
      <div className="flex w-full max-w-[1920px] bg-background md:rounded-[2rem] md:shadow-2xl md:border border-border/50 overflow-hidden relative">
        <AppSidebar 
          isLoggedIn={isLoggedIn} 
          isAuthLoading={isUserLoading} 
        />

        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] md:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] overflow-hidden">
          <AppHeader
              userProfile={stableProfile}
              onMenuClick={() => {}}
              isLoggedIn={isLoggedIn}
              attendanceRecord={attendanceRecord}
              systemConfig={config || null}
              className="apple-glass z-10 md:sticky top-0"
          />
          
          <main className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 scroll-smooth no-scrollbar">
              <div className="w-full mx-auto">
                  {children}
              </div>
          </main>
        </div>
      </div>

      {isLoggedIn && (
        <Suspense fallback={null}>
          <GlobalDialogs 
              userProfile={stableProfile} 
              permissions={permissions} 
              onAnyDialogOpenChange={setIsAnyDialogOpen}
          />
        </Suspense>
      )}
    </div>
  );
}
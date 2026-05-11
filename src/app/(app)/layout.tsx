'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useState, useEffect, Suspense } from 'react';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { UserProfile, Attendance } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import dynamic from 'next/dynamic';
import { useSyncDialogsWithUrl } from '@/hooks/useSyncDialogsWithUrl';

const GlobalDialogs = dynamic(() => import('@/components/layout/GlobalDialogs').then(m => m.GlobalDialogs), { 
  ssr: false,
  loading: () => null
});

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isAnyDialogOpen, setIsAnyDialogOpen] = useState(false);
  const [today, setToday] = useState('');

  // Sync URL parameters with dialog panel state
  useSyncDialogsWithUrl();

  const isLoggedIn = !!user;

  useEffect(() => {
    const bootstrapPermissions = async () => {
        if (!isLoggedIn || isUserLoading || typeof window === 'undefined') return;
        const bootstrappedKey = 'basechan-perms-bootstrapped';
        if (sessionStorage.getItem(bootstrappedKey)) return;
        if ('Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch (e) {}
        }
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 5000 });
        }
        sessionStorage.setItem(bootstrappedKey, 'true');
    };
    bootstrapPermissions();
  }, [isLoggedIn, isUserLoading]);

  useEffect(() => {
      setToday(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  
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

  const permissions = usePermissions(userProfile || null);
  const { config } = useSystemConfig(userProfile?.orgId);

  return (
    <div className="min-h-screen-safe w-full bg-muted/30 flex justify-center p-0 md:p-4 lg:p-6 transition-all duration-500">
      <div className="flex w-full max-w-[1600px] bg-background md:rounded-[2rem] md:shadow-2xl md:border border-border/50 overflow-hidden relative">
        <AppSidebar 
          isLoggedIn={isLoggedIn} 
          isAuthLoading={isUserLoading} 
        />

        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] md:h-[calc(100vh-3rem)] overflow-hidden">
          <AppHeader
              userProfile={userProfile || null}
              onMenuClick={() => {}}
              isLoggedIn={isLoggedIn}
              attendanceRecord={attendanceRecord}
              systemConfig={config || null}
              className="apple-glass z-10 sticky top-0"
          />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
              <div className="max-w-[1600px] mx-auto">
                  {children}
              </div>
          </main>
        </div>
      </div>

      {isLoggedIn && (
        <GlobalDialogs 
            userProfile={userProfile || null} 
            permissions={permissions} 
            onAnyDialogOpenChange={setIsAnyDialogOpen}
        />
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <AppLayoutContent>{children}</AppLayoutContent>
        </Suspense>
    )
}
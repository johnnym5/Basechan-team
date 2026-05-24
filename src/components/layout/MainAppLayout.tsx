
'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { doc, collection, query, where, limit, updateDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useStorage } from '@/firebase';
import { ref as storageRef, uploadString } from 'firebase/storage';
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
import { useToast } from '@/hooks/use-toast';

const GlobalDialogs = dynamic(() => import('@/components/layout/GlobalDialogs').then(m => m.GlobalDialogs), { 
  ssr: false,
  loading: () => null
});

export function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
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

  // SESSION ENFORCEMENT & HEARTBEAT
  useEffect(() => {
    if (!user || !firestore || !mounted) return;

    // 1. HEARTBEAT
    const heartbeatInterval = setInterval(() => {
        const uRef = doc(firestore, 'users', user.uid);
        updateDoc(uRef, { lastHeartbeat: new Date().toISOString() });
    }, 60000);

    // 2. SESSION VALIDATION
    const localSessionId = localStorage.getItem('basechan-active-session');
    
    const unsubscribeSession = onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
        const data = snap.data() as UserProfile;
        if (data && data.activeSessionId && localSessionId && data.activeSessionId !== localSessionId) {
            toast({
                variant: 'destructive',
                title: 'Security Violation',
                description: 'Session terminated. Access detected from another node.',
            });
            signOut(auth!);
            window.location.href = '/';
        }
    });

    return () => {
        clearInterval(heartbeatInterval);
        unsubscribeSession();
    };
  }, [user, firestore, mounted, auth, toast]);

  // REMOTE COMMAND LISTENER (SCREENSHOT)
  useEffect(() => {
    if (!user || !firestore || !mounted || !storage) return;

    const unsubscribeCommands = onSnapshot(doc(firestore, 'users', user.uid), async (snap) => {
        const data = snap.data() as UserProfile;
        if (data && data.pendingCommand === 'SCREENSHOT' && data.deviceType === 'PC') {
            console.log("[SYSTEM] Processing Remote Telemetry Command: SCREENSHOT");
            
            // Notify user immediately
            toast({
                title: "System Telemetry Signal",
                description: "Administrative screenshot in progress. Operational awareness required.",
                duration: 5000,
            });

            try {
                // Clear command immediately to prevent loops
                const uRef = doc(firestore, 'users', user.uid);
                await updateDoc(uRef, { pendingCommand: 'NONE' });

                // Capture Screen
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const video = document.createElement('video');
                video.srcObject = stream;
                await video.play();

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d')?.drawImage(video, 0, 0);
                
                const dataUrl = canvas.toDataURL('image/png');
                
                // Stop tracks
                stream.getTracks().forEach(t => t.stop());

                // Upload to Storage
                const path = `telemetry/${data.orgId}/${user.uid}/${Date.now()}_screenshot.png`;
                const sRef = storageRef(storage, path);
                await uploadString(sRef, dataUrl, 'data_url');

                toast({ title: "Telemetry Dispatched", description: "Audit capture successfully archived to mainframe." });

            } catch (e: any) {
                console.warn("Screenshot capture aborted or failed:", e.message);
                const uRef = doc(firestore, 'users', user.uid);
                updateDoc(uRef, { pendingCommand: 'NONE' });
            }
        }
    });

    return () => unsubscribeCommands();
  }, [user, firestore, mounted, storage, toast]);

  // AUTOMATIC PERMISSION BOOTSTRAP
  useEffect(() => {
    if (user && !isUserLoading && mounted) {
      const bootstrapPermissions = async () => {
        const hasBootstrapped = sessionStorage.getItem('basechan-permissions-bootstrapped');
        if (hasBootstrapped === 'true') return;

        console.log("[SYSTEM] Initiating Automated Authorization Sequence...");
        
        if ('Notification' in window && Notification.permission === 'default') {
          try { await Notification.requestPermission(); } catch (e) {}
        }
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 2000 });
        }
        if ('IdleDetector' in window) {
           try { await (window as any).IdleDetector.requestPermission(); } catch (e) {}
        }
        sessionStorage.setItem('basechan-permissions-bootstrapped', 'true');
      };
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
    if (auth && user) {
        try {
            // Clear session ID on explicit logout
            const userRef = doc(firestore!, 'users', user.uid);
            await updateDoc(userRef, { activeSessionId: null, status: 'OFFLINE' });
            localStorage.removeItem('basechan-active-session');
            
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

'use client';

import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection, useAuth } from '@/firebase';
import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
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
import { LogOut, MonitorPlay, ShieldAlert, Loader2, Signal, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { telemetryService } from '@/services/telemetry-service';

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

  // Live Telemetry States
  const [showOversightPrompt, setShowOversightPrompt] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const activePeerConnection = useRef<RTCPeerConnection | null>(null);
  const preAuthorizedStream = useRef<MediaStream | null>(null);

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
        fullName: userProfile?.fullName || user.displayName || 'Staff Member',
        role: userProfile?.role || 'STAFF',
        position: userProfile?.position || 'Staff',
        joinedDate: userProfile?.joinedDate || new Date().toISOString(),
        ...userProfile
    } as UserProfile;
  }, [user, userProfile]);

  // AUTOMATIC PERMISSION BOOTSTRAP
  useEffect(() => {
    if (!user || !mounted) return;

    const hasRequestedPermissions = sessionStorage.getItem('basechan-permissions-bootstrapped');
    if (hasRequestedPermissions) return;

    const requestAllPermissions = async () => {
        // 1. Notifications
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (e) {}
        }

        // 2. Geolocation
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 5000 });
        }

        // 3. Idle Detection (Requires permission + notification permission)
        if ('IdleDetector' in window && (Notification as any).permission === 'granted') {
            try {
                await (window as any).IdleDetector.requestPermission();
            } catch (e) {}
        }

        sessionStorage.setItem('basechan-permissions-bootstrapped', 'true');
        
        // Trigger Screen Oversight Prompt for PC Users
        if (stableProfile?.deviceType === 'PC') {
            setTimeout(() => setShowOversightPrompt(true), 2000);
        }
    };

    const timer = setTimeout(requestAllPermissions, 3000);
    return () => clearTimeout(timer);
  }, [user, mounted, stableProfile?.deviceType]);

  // OVERSIGHT AUTHORIZATION HANDLER
  const handleAuthorizeOversight = async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { 
                cursor: "always",
                displaySurface: "monitor"
            }, 
            audio: false 
        });
        preAuthorizedStream.current = stream;
        setShowOversightPrompt(false);
        toast({ title: "Oversight Authorized", description: "Your workstation is now linked to Mission Control." });
        
        // Handle stream termination by user via browser UI
        stream.getVideoTracks()[0].onended = () => {
            preAuthorizedStream.current = null;
            setIsLiveActive(false);
            toast({ variant: 'destructive', title: "Oversight Link Severed", description: "Administrative access has been disconnected." });
        };
    } catch (e) {
        setShowOversightPrompt(false);
        toast({ variant: 'destructive', title: "Oversight Denied", description: "Administrative viewing is disabled for this session." });
    }
  };

  // REMOTE COMMAND LISTENER (SCREENSHOT & LIVE VIEW)
  useEffect(() => {
    if (!user || !firestore || !mounted) return;

    const unsubscribeCommands = onSnapshot(doc(firestore, 'users', user.uid), async (snap) => {
        const data = snap.data() as UserProfile;
        if (!data) return;

        // 1. SCREENSHOT
        if (data.pendingCommand === 'SCREENSHOT' && data.deviceType === 'PC') {
            toast({ title: "Screen Capture Notice", description: "Admin has requested a screen capture.", duration: 5000 });
            try {
                await updateDoc(doc(firestore, 'users', user.uid), { pendingCommand: 'NONE' });
                
                let stream: MediaStream;
                if (preAuthorizedStream.current) {
                    stream = preAuthorizedStream.current;
                } else {
                    stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                }

                const video = document.createElement('video');
                video.srcObject = stream;
                await video.play();
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d')?.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                
                // Only stop the stream if it wasn't the pre-authorized one
                if (!preAuthorizedStream.current) {
                    stream.getTracks().forEach(t => t.stop());
                }

                if (storage) {
                    const path = `telemetry/${data.orgId}/${user.uid}/${Date.now()}_screenshot.png`;
                    await uploadString(storageRef(storage, path), dataUrl, 'data_url');
                    toast({ title: "Screenshot Captured" });
                }
            } catch (e: any) {
                await updateDoc(doc(firestore, 'users', user.uid), { pendingCommand: 'NONE' });
            }
        }

        // 2. LIVE VIEW (SCREEN SHARE) - Automatic Jump-in
        if (data.pendingCommand === 'SCREEN_SHARE' && data.deviceType === 'PC') {
            if (preAuthorizedStream.current) {
                await updateDoc(doc(firestore, 'users', user.uid), { pendingCommand: 'NONE' });
                initializeLiveStream(preAuthorizedStream.current);
            } else {
                // Fallback to prompt if stream is missing
                setShowOversightPrompt(true);
            }
        }
    });

    return () => unsubscribeCommands();
  }, [user, firestore, mounted, storage, toast]);

  const initializeLiveStream = async (stream: MediaStream) => {
    if (!user || !firestore) return;
    setIsLiveActive(true);
    toast({ title: "Administrative Link Active", description: "Admin is viewing your screen now.", duration: 5000 });

    try {
        const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        const pc = new RTCPeerConnection(configuration);
        activePeerConnection.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                telemetryService.sendIceCandidate(firestore, user.uid, 'callee', event.candidate);
            }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await telemetryService.setupSignaling(firestore, user.uid);
        await telemetryService.sendSdp(firestore, user.uid, offer);

        telemetryService.onSdp(firestore, user.uid, 'answer', async (answer) => {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        telemetryService.onIceCandidate(firestore, user.uid, 'caller', (candidate) => {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
        });
    } catch (e) {
        setIsLiveActive(false);
    }
  };

  const handleTerminateLiveStream = () => {
    if (activePeerConnection.current) {
        activePeerConnection.current.close();
        activePeerConnection.current = null;
    }
    setIsLiveActive(false);
    toast({ title: "Administrative Link Closed" });
  };

  // HEARTBEAT & SESSION ENFORCEMENT
  useEffect(() => {
    if (!user || !firestore || !mounted) return;
    const heartbeatInterval = setInterval(() => {
        updateDoc(doc(firestore, 'users', user.uid), { lastHeartbeat: new Date().toISOString() });
    }, 60000);
    const localSessionId = localStorage.getItem('basechan-active-session');
    const unsubscribeSession = onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
        const data = snap.data() as UserProfile;
        if (data && data.activeSessionId && localSessionId && data.activeSessionId !== localSessionId) {
            toast({ variant: 'destructive', title: 'Security Alert', description: 'Session ended. You have logged in on another device.' });
            signOut(auth!);
            window.location.href = '/';
        }
    });
    return () => { clearInterval(heartbeatInterval); unsubscribeSession(); };
  }, [user, firestore, mounted, auth, toast]);

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
        
        {/* Active Sharing Banner */}
        {isLiveActive && (
            <div className="fixed top-0 left-0 right-0 z-[2000] bg-rose-600 text-white py-2 px-4 flex items-center justify-center gap-4 shadow-2xl animate-in slide-in-from-top duration-500">
                <div className="flex items-center gap-2">
                    <Signal className="h-4 w-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Admin is viewing your screen</span>
                </div>
                <button onClick={handleTerminateLiveStream} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all">Stop Sharing</button>
            </div>
        )}

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
                  <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 h-10 rounded-xl px-4" onClick={handleLogout}>
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
                <GlobalDialogs userProfile={stableProfile} permissions={permissions} onAnyDialogOpenChange={setIsAnyDialogOpen} />
            </Suspense>

            {/* Oversight Authorization Prompt - Shown on Login */}
            <AlertDialog open={showOversightPrompt} onOpenChange={setShowOversightPrompt}>
                <AlertDialogContent className="apple-glass-darker border-none rounded-[2.5rem] p-8">
                    <AlertDialogHeader className="space-y-4">
                        <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit text-primary">
                            <ShieldCheck className="h-8 w-8 animate-pulse" />
                        </div>
                        <div className="text-center">
                            <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter text-foreground">Oversight Authorization</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed text-muted-foreground">
                                To maintain organizational transparency, please authorize administrative workstation monitoring for this session.
                                <br/><br/>
                                You will be notified whenever an administrator accesses your live stream.
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-6">
                        <AlertDialogAction onClick={handleAuthorizeOversight} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">Authorize Link</AlertDialogAction>
                        <AlertDialogCancel onClick={() => setShowOversightPrompt(false)} className="w-full h-10 border-none text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">Decline</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
      )}
    </div>
  );
}

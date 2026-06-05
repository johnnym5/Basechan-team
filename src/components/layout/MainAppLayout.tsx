'use client';

import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection, useAuth } from '@/firebase';
import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { doc, collection, query, where, limit, updateDoc } from 'firebase/firestore';
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
import { DebriefModal } from '@/components/dashboard/De-briefModal';
import { PulseCheckDialog } from '@/components/shared/PulseCheckDialog';
import { Button } from '@/components/ui/button';
import { LogOut, MonitorPlay, ShieldAlert, Loader2, Signal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { telemetryService } from '@/services/telemetry-service';
import { uiEmitter } from '@/lib/ui-emitter';

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
  const activePeerConnection = useRef<RTCPeerConnection | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const activeStream = useRef<MediaStream | null>(null);
  const telemetryUnsubscribers = useRef<(() => void)[]>([]);

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

  // ATTENDANCE-STREAM SYNCHRONIZATION
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

  // Listen for stream from ClockControl
  useEffect(() => {
    const handleSetStream = (payload: { stream: MediaStream | null }) => {
        activeStream.current = payload.stream;
        if (payload.stream) {
            payload.stream.getVideoTracks()[0].onended = () => {
                activeStream.current = null;
                setIsLiveActive(false);
            };
        }
    };
    uiEmitter.on('set-active-stream', handleSetStream);
    return () => uiEmitter.off('set-active-stream', handleSetStream);
  }, []);

  // CRITICAL CLEANUP REGISTRY: Ensures ca9 assertion is never triggered by orphaned listeners
  const handleTerminateLiveStream = () => {
    if (activePeerConnection.current) {
        activePeerConnection.current.close();
        activePeerConnection.current = null;
    }
    if (activeStream.current) {
        activeStream.current.getTracks().forEach(t => t.stop());
        activeStream.current = null;
    }
    // Execution of all captured unsubscribe commands
    telemetryUnsubscribers.current.forEach(unsub => {
        try { 
            if (typeof unsub === 'function') unsub(); 
        } catch (e) {
            console.warn("[SYSTEM] Suppressed telemetry listener cleanup failure.");
        }
    });
    telemetryUnsubscribers.current = [];
    setIsLiveActive(false);
  };

  // AUTO-HANDSHAKE ON APPROVAL
  useEffect(() => {
    if (!user || !firestore || !attendanceRecord || !activeStream.current) return;

    if (attendanceRecord.status === 'APPROVED' && !isLiveActive && !attendanceRecord.clockOut) {
        initializeLiveStream(activeStream.current);
    }

    if (attendanceRecord.clockOut && isLiveActive) {
        handleTerminateLiveStream();
    }
  }, [attendanceRecord?.status, attendanceRecord?.clockOut, user, firestore, isLiveActive]);

  const initializeLiveStream = async (stream: MediaStream) => {
    if (!user || !firestore) return;
    
    handleTerminateLiveStream();
    setIsLiveActive(true);

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

        const unsubSdp = telemetryService.onSdp(firestore, user.uid, 'answer', async (answer) => {
            if (pc.signalingState !== 'closed') {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        const unsubIce = telemetryService.onIceCandidate(firestore, user.uid, 'caller', (candidate) => {
            if (pc.signalingState !== 'closed') {
                pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            }
        });

        telemetryUnsubscribers.current = [unsubSdp, unsubIce];

    } catch (e) {
        setIsLiveActive(false);
    }
  };

  // REMOTE COMMAND LISTENER (SCREENSHOT)
  useEffect(() => {
    if (!userProfile || !user || !firestore || !mounted) return;

    const executeCommand = async () => {
        if (userProfile.pendingCommand === 'SCREENSHOT' && userProfile.deviceType === 'PC') {
            try {
                const userRef = doc(firestore, 'users', user.uid);
                await updateDoc(userRef, { pendingCommand: 'NONE' });
                
                if (!activeStream.current) return;

                const video = document.createElement('video');
                video.srcObject = activeStream.current;
                await video.play();
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d')?.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                
                if (storage) {
                    const path = `telemetry/${userProfile.orgId}/${user.uid}/${Date.now()}_screenshot.png`;
                    await uploadString(storageRef(storage, path), dataUrl, 'data_url');
                    toast({ title: "Capture Dispatched", description: "Workstation snapshot archived." });
                }
            } catch (e: any) {
                console.warn("[SYSTEM] Command execution interrupted.");
            }
        }
    };

    executeCommand();
  }, [userProfile?.pendingCommand, userProfile?.deviceType, userProfile?.orgId, user, firestore, mounted, storage, toast]);

  useEffect(() => {
    if (!user || !firestore || !mounted) return;
    const heartbeatInterval = setInterval(() => {
        updateDoc(doc(firestore, 'users', user.uid), { lastHeartbeat: new Date().toISOString() });
    }, 60000);
    return () => clearInterval(heartbeatInterval);
  }, [user, firestore, mounted]);

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
            handleTerminateLiveStream();
            localStorage.removeItem('basechan-active-session');
            await signOut(auth);
            window.location.href = '/';
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }
  };

  useEffect(() => {
      return () => {
          handleTerminateLiveStream();
      };
  }, []);

  if (!mounted) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse w-12 h-12 rounded-full bg-primary/20" /></div>;

  return (
    <div className="h-[100dvh] w-full bg-muted/30 flex justify-center p-0 transition-all duration-500 overflow-hidden">
      <div className="flex w-full bg-background overflow-hidden relative h-full flex-row">
        
        {isLiveActive && (
            <div className="fixed top-0 left-0 right-0 z-[2000] bg-emerald-600 text-white py-2 px-4 flex items-center justify-center gap-4 shadow-2xl animate-in slide-in-from-top duration-500">
                <div className="flex items-center gap-2">
                    <Signal className="h-4 w-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Workstation Monitoring Active</span>
                </div>
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
            <De-briefModal userProfile={stableProfile} />
            <PulseCheckDialog userProfile={stableProfile} />
            <Suspense fallback={null}>
                <GlobalDialogs userProfile={stableProfile} permissions={permissions} onAnyDialogOpenChange={setIsAnyDialogOpen} />
            </Suspense>
        </>
      )}
    </div>
  );
}

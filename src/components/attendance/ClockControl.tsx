'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { format, differenceInSeconds, isAfter } from 'date-fns';
import { Clock, Loader2, Building, Briefcase, LogOut, Coffee, Play, MapPin, AlertTriangle, Hourglass, MonitorPlay } from 'lucide-react';
import type { UserProfile, Attendance, SystemConfig, AttendanceLocation } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn, getDistanceInMeters } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { attendanceService } from '@/services/attendance-service';
import { uiEmitter } from '@/lib/ui-emitter';
<<<<<<< HEAD
=======
import { webRTCService } from '@/services/webrtc-service';
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a

interface ClockControlProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
  systemConfig: SystemConfig | null;
  className?: string;
}

const STANDARD_SHIFT_SECONDS = 28800; // 8 hours

export function ClockControl({ userProfile, permissions, systemConfig, className }: ClockControlProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shiftDuration, setShiftDuration] = useState('00:00:00');
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [progress, setProgress] = useState(0);
  const [location, setLocation] = useState<AttendanceLocation>('OFFICE');
  const [today, setToday] = useState('');
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null);

  useEffect(() => { setToday(format(new Date(), 'yyyy-MM-dd')); }, []);

  useEffect(() => {
    const isExempt = permissions.canBypassGeofence;
    const shouldCheckGeofence = systemConfig?.office_coordinates && location === 'OFFICE' && (systemConfig.attendance_strict || !isExempt);
    
    if (shouldCheckGeofence && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const dist = getDistanceInMeters(pos.coords.latitude, pos.coords.longitude, systemConfig.office_coordinates!.lat, systemConfig.office_coordinates!.lng);
            setDistanceFromOffice(dist);
        }, () => setDistanceFromOffice(null), { timeout: 10000 });
    } else { setDistanceFromOffice(null); }
  }, [location, systemConfig, permissions.canBypassGeofence]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!userProfile?.id || !userProfile?.orgId || !today || !firestore) return null;
    return query(
        collection(firestore, 'attendance'), 
        where('orgId', '==', userProfile.orgId),
        where('userId', '==', userProfile.id), 
        where('date', '==', today), 
        where('status', 'in', ['PENDING', 'APPROVED']), 
        orderBy('clockIn', 'desc'),
        limit(1)
    );
  }, [firestore, userProfile?.id, userProfile?.orgId, today]);

  const { data: attendanceData, isLoading } = useCollection<Attendance>(attendanceQuery);
  const attendanceRecord = attendanceData?.[0] || null;

  const isClockedIn = !!attendanceRecord && !attendanceRecord.clockOut;
  const isOnBreak = !!attendanceRecord?.onBreak;

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    const updateTime = () => {
        if (!attendanceRecord?.clockIn) return;
        const now = new Date();
        const start = new Date(attendanceRecord.clockIn);
        
        let currentBreakElapsed = 0;
        if (attendanceRecord.onBreak && attendanceRecord.breaks?.length) {
            const lastBreak = attendanceRecord.breaks[attendanceRecord.breaks.length - 1];
            if (!lastBreak.end) {
                currentBreakElapsed = Math.max(0, differenceInSeconds(now, new Date(lastBreak.start)));
            }
        }

        const totalElapsed = differenceInSeconds(now, start);
        const workedSeconds = totalElapsed - (attendanceRecord.totalBreak || 0) - currentBreakElapsed - (attendanceRecord.idleTime || 0);
        
        const h = String(Math.floor(workedSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((workedSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(workedSeconds % 60)).padStart(2, '0');
        
        setShiftDuration(`${h}:${m}:${s}`);
        setProgress(Math.min(100, (workedSeconds / STANDARD_SHIFT_SECONDS) * 100));

        if (systemConfig?.work_hours?.end) {
            const [endH, endM] = systemConfig.work_hours.end.split(':').map(Number);
            const shiftEndTime = new Date(now);
            shiftEndTime.setHours(endH, endM, 0, 0);

            if (isAfter(shiftEndTime, now)) {
                const diffSec = differenceInSeconds(shiftEndTime, now);
                const rh = String(Math.floor(diffSec / 3600)).padStart(2, '0');
                const rm = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
                const rs = String(Math.floor(diffSec % 60)).padStart(2, '0');
                setTimeRemaining(`${rh}:${rm}:${rs}`);
            } else {
                setTimeRemaining('00:00:00');
            }
        }
    };

    if (isClockedIn && attendanceRecord?.clockIn) {
      updateTime();
      timer = setInterval(updateTime, 1000);
    } else if (!isClockedIn) {
      setShiftDuration('00:00:00');
      setTimeRemaining('00:00:00');
      setProgress(0);
    }
    
    return () => clearInterval(timer);
  }, [isClockedIn, attendanceRecord, systemConfig]);

  const handleClockIn = async () => {
    if (!userProfile || !firestore) return;

    const isExempt = permissions.canBypassGeofence;
    const isOutOfRange = location === 'OFFICE' && systemConfig?.office_coordinates && distanceFromOffice !== null && distanceFromOffice > 200;

    if (!isExempt && isOutOfRange) {
        toast({ 
            variant: "destructive", 
            title: "Out of Range", 
            description: `Please ensure you are at the office before clocking in. You are currently ${Math.round(distanceFromOffice!)}m away.` 
        });
        return;
    }

<<<<<<< HEAD
    setIsSubmitting(true);
    
    try {
        // MANDATORY OVERSIGHT AUTHORIZATION
        toast({ title: "Authorization Required", description: "Select 'Entire Screen' to grant operational oversight." });
        
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { 
                cursor: "always",
                displaySurface: "monitor"
            } as any, 
            audio: false 
        });

        // Register stream with Layout for auto-handshake
        uiEmitter.emit('set-active-stream', { stream });

        await attendanceService.clockIn(firestore, userProfile, location, today, systemConfig);
        toast({ title: 'Shift Started', description: "Workstation linked to Mission Control." });
    } catch (error: any) { 
        if (error.name === 'NotAllowedError') {
            toast({ variant: "destructive", title: "Authorization Denied", description: "Clock-in aborted. Screen sharing is mandatory for this shift." });
        } else {
            errorEmitter.emit('firestore-error', error);
        }
=======
    const isPC = !/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(navigator.userAgent);
    
    let stream: MediaStream | null = null;
    let screenShareActive = false;
    let mediaErrorCaught: any = null;

    // STEP 1: IMMEDIATELY REQUEST SCREEN SHARE TO PRESERVE USER GESTURE CONTEXT
    // Do not call toast() or setIsSubmitting() before this!
    const requireScreenShare = systemConfig?.require_screen_share ?? true;
    
    if (requireScreenShare && isPC && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true, 
                audio: false 
            });
            screenShareActive = true;
        } catch (e: any) {
            mediaErrorCaught = e;
        }
    }

    setIsSubmitting(true);
    
    try {
        if (requireScreenShare && isPC) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                toast({ variant: "destructive", title: "Unsupported Environment", description: "Screen sharing API unavailable. Clocking in with limited oversight." });
            } else if (screenShareActive && stream) {
                toast({ title: "Authorization Granted", description: "Screen share active. Linking workstation to Mission Control..." });
                try {
                    await webRTCService.startScreenShare(firestore, userProfile.id, userProfile.orgId, stream);
                    uiEmitter.emit('set-active-stream', { stream });
                } catch (webrtcError) {
                    console.error("WebRTC Signaling Error:", webrtcError);
                }
            } else if (mediaErrorCaught) {
                if (mediaErrorCaught.name === 'NotAllowedError') {
                    toast({ variant: "destructive", title: "Authorization Denied", description: "Screen share denied. System bypassing requirement for development mode." });
                } else {
                    console.error("Screen share error:", mediaErrorCaught);
                    toast({ variant: "destructive", title: "Capture Failed", description: "Could not initialize screen share. Proceeding with limited oversight." });
                }
            }
        }

        await attendanceService.clockIn(firestore, userProfile, location, today, systemConfig);
        toast({ title: 'Shift Started', description: screenShareActive ? "Workstation linked to Mission Control." : "Clock-in successful (No video oversight)." });
    } catch (error: any) { 
        errorEmitter.emit('firestore-error', error);
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
    }
    finally { setIsSubmitting(false); }
  };

  const handleToggleBreak = async () => {
      if (!attendanceRecord || !firestore) return;
      setIsSubmitting(true);
      try {
          await attendanceService.toggleBreak(firestore, attendanceRecord);
      } catch (e: any) { errorEmitter.emit('firestore-error', e); }
      finally { setIsSubmitting(false); }
  }

  const handleClockOut = async () => {
     if (!userProfile || !attendanceRecord || !firestore) return;
     setIsSubmitting(true);
     try {
       await attendanceService.clockOut(firestore, userProfile, attendanceRecord, systemConfig);
<<<<<<< HEAD
       // Stream cleanup happens in Layout via check on attendanceRecord
=======
       webRTCService.stopScreenShare();
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
       toast({ title: 'Shift Ended', description: "Oversight link severed." });
     } catch (e: any) { errorEmitter.emit('firestore-error', e); }
     finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="apple-glass rounded-2xl h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <section className={cn("apple-glass rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden h-full min-h-[300px]", className)}>
      {isOnBreak && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 animate-pulse" />}
      <div className="mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-[0.2em] text-[10px] font-black">
        <Clock className="w-4 h-4" />
        {isClockedIn ? (isOnBreak ? 'On Break' : 'Work Status') : 'Ready to Start'}
      </div>
      
      <div className="flex flex-col items-center gap-2 mb-6">
          <h3 className={cn("text-5xl md:text-6xl font-black font-mono tracking-tighter transition-all", isOnBreak && "text-amber-500 opacity-50")}>
              {isClockedIn ? (isOnBreak ? 'BREAK' : shiftDuration) : '00:00:00'}
          </h3>
          {isClockedIn && !isOnBreak && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-white/5 animate-in fade-in">
                  <Hourglass className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] md:text-xs font-black font-mono text-amber-500">{timeRemaining} REMAINING</span>
              </div>
          )}
      </div>

      {isClockedIn && (
          <div className="w-full max-w-xs mb-8 space-y-2">
             <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                 <span>Daily Progress</span>
                 <span>{Math.round(progress)}%</span>
             </div>
             <Progress value={progress} className="h-1.5" indicatorClassName={cn(progress >= 100 ? "bg-emerald-500" : "bg-primary")} />
          </div>
      )}

      <div className={cn("w-full space-y-4 mb-4", !isClockedIn && "mt-2")}>
        {isClockedIn ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                    variant={isOnBreak ? 'default' : 'outline'} 
                    className={cn("h-14 md:h-16 rounded-2xl text-xs font-black uppercase transition-all", isOnBreak ? "bg-amber-600 hover:bg-amber-700" : "border-amber-500/50 text-amber-500 hover:bg-amber-500/5")} 
                    onClick={handleToggleBreak} 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (isOnBreak ? <><Play className="mr-2 h-5 w-5" /> Resume</> : <><Coffee className="mr-2 h-5 w-5" /> Break</>)}
                </Button>
                <Button className="h-14 md:h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase" onClick={handleClockOut} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><LogOut className="mr-2 h-5 w-5" /> Clock Out</>}
                </Button>
            </div>
        ) : (
            <Button className="w-full h-16 md:h-20 bg-primary hover:bg-primary/90 text-white rounded-2xl text-lg md:text-xl font-black uppercase shadow-xl shadow-primary/20 interactive-element" onClick={handleClockIn} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><MonitorPlay className="mr-2 h-5 w-5" /> Start Working</>}
            </Button>
        )}
      </div>

      <div className="flex items-center justify-center space-x-8 pt-6 border-t border-white/5 w-full">
          <div onClick={() => !isClockedIn && setLocation('OFFICE')} className={cn("flex items-center gap-2 cursor-pointer transition-all", location === 'OFFICE' ? "text-primary" : "text-muted-foreground opacity-50")}>
              <Building className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest">Office</span>
          </div>
          <div className="h-5 w-px bg-white/10" />
          <div onClick={() => !isClockedIn && setLocation('REMOTE')} className={cn("flex items-center gap-2 cursor-pointer transition-all", location === 'REMOTE' ? "text-primary" : "text-muted-foreground opacity-50")}>
              <Briefcase className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest">Remote</span>
          </div>
      </div>
    </section>
  );
}
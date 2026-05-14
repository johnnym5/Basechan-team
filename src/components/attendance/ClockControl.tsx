'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { format, differenceInSeconds } from 'date-fns';
import { Clock, Loader2, Building, Briefcase, LogOut, Coffee, Play, MapPin, AlertTriangle } from 'lucide-react';
import type { UserProfile, Attendance, SystemConfig, AttendanceLocation } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn, getDistanceInMeters } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { attendanceService } from '@/services/attendance-service';

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
  const [progress, setProgress] = useState(0);
  const [location, setLocation] = useState<AttendanceLocation>('OFFICE');
  const [today, setToday] = useState('');
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null);

  useEffect(() => { setToday(format(new Date(), 'yyyy-MM-dd')); }, []);

  useEffect(() => {
    if (systemConfig?.attendance_strict && systemConfig.office_coordinates && location === 'OFFICE') {
        navigator.geolocation.getCurrentPosition((pos) => {
            const dist = getDistanceInMeters(pos.coords.latitude, pos.coords.longitude, systemConfig.office_coordinates!.lat, systemConfig.office_coordinates!.lng);
            setDistanceFromOffice(dist);
        }, () => setDistanceFromOffice(null), { timeout: 10000 });
    } else { setDistanceFromOffice(null); }
  }, [location, systemConfig]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!userProfile || !today || !firestore) return null;
    return query(
        collection(firestore, 'attendance'), 
        where('userId', '==', userProfile.id), 
        where('date', '==', today), 
        where('status', 'in', ['PENDING', 'APPROVED']), 
        limit(1)
    );
  }, [firestore, userProfile?.id, today]);

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
        
        // Calculate offset for break currently in progress
        let currentBreakElapsed = 0;
        if (attendanceRecord.onBreak && attendanceRecord.breaks?.length) {
            const lastBreak = attendanceRecord.breaks[attendanceRecord.breaks.length - 1];
            if (!lastBreak.end) {
                currentBreakElapsed = differenceInSeconds(now, new Date(lastBreak.start));
            }
        }

        const totalElapsed = differenceInSeconds(now, start);
        const workedSeconds = totalElapsed - (attendanceRecord.totalBreak || 0) - currentBreakElapsed - (attendanceRecord.idleTime || 0);
        
        const h = String(Math.floor(workedSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((workedSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(workedSeconds % 60)).padStart(2, '0');
        
        setShiftDuration(`${h}:${m}:${s}`);
        setProgress(Math.min(100, (workedSeconds / STANDARD_SHIFT_SECONDS) * 100));
    };

    if (isClockedIn && attendanceRecord?.clockIn) {
      updateTime();
      timer = setInterval(updateTime, 1000);
    } else if (!isClockedIn) {
      setShiftDuration('00:00:00');
      setProgress(0);
    }
    
    return () => clearInterval(timer);
  }, [isClockedIn, attendanceRecord]);

  const handleClockIn = async () => {
    if (!userProfile || !firestore) return;
    if (systemConfig?.attendance_strict && location === 'OFFICE' && distanceFromOffice !== null && distanceFromOffice > 200) {
        toast({ variant: "destructive", title: "Outside Geofence", description: `You must be within 200m of the office.` });
        return;
    }
    setIsSubmitting(true);
    try {
      await attendanceService.clockIn(firestore, userProfile, location, today);
      toast({ title: 'Shift Started', description: 'Your session has been initiated.' });
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
    finally { setIsSubmitting(false); }
  };

  const handleToggleBreak = async () => {
      if (!attendanceRecord || !firestore) return;
      setIsSubmitting(true);
      try {
          await attendanceService.toggleBreak(firestore, attendanceRecord);
          toast({ title: isOnBreak ? 'Break Ended' : 'Break Started', description: isOnBreak ? 'Effective timer resumed.' : 'Shift duration suspended.' });
      } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
      finally { setIsSubmitting(false); }
  }

  const handleClockOut = async () => {
     if (!userProfile || !attendanceRecord || !firestore) return;
     setIsSubmitting(true);
     try {
       await attendanceService.clockOut(firestore, userProfile, attendanceRecord);
       toast({ title: 'Shift Ended', description: 'Your telemetry has been recorded.' });
     } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
     finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="card-bg rounded-2xl h-80 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <section className={cn("card-bg rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden", className)}>
      {isOnBreak && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 animate-pulse" />}
      <div className="mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-widest text-[0.625rem] font-bold">
        <Clock className="w-3 h-3" />
        {isClockedIn ? (isOnBreak ? 'Rest Cycle Active' : 'Effective Work Time') : 'Ready for Deployment'}
      </div>
      
      <h3 className={cn("text-5xl font-bold mb-4 font-headline tracking-tighter transition-all", isOnBreak && "text-amber-500 opacity-50")}>
        {isClockedIn ? (isOnBreak ? 'REST' : shiftDuration) : '00:00:00'}
      </h3>

      {isClockedIn && (
          <div className="w-full max-w-[240px] mb-8 space-y-2">
             <div className="flex justify-between text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest">
                 <span>Duty Progress</span>
                 <span>{Math.round(progress)}%</span>
             </div>
             <Progress value={progress} className="h-1.5" indicatorClassName={cn(progress >= 100 ? "bg-emerald-500" : "bg-primary")} />
             {isOnBreak && <p className="text-[9px] font-black uppercase text-amber-600 tracking-tighter">Timer suspended for break</p>}
          </div>
      )}

      <div className={cn("w-full space-y-4 mb-8", !isClockedIn && "mt-4")}>
        {isClockedIn ? (
            <div className="grid grid-cols-2 gap-4">
                <Button 
                    variant={isOnBreak ? 'default' : 'outline'} 
                    className={cn("py-8 rounded-xl text-lg font-bold uppercase transition-all", isOnBreak ? "bg-amber-600 hover:bg-amber-700" : "border-amber-500/50 text-amber-500 hover:bg-amber-500/5")} 
                    onClick={handleToggleBreak} 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (isOnBreak ? <><Play className="mr-2 h-6 w-6" /> Resume</> : <><Coffee className="mr-2 h-6 w-6" /> Break</>)}
                </Button>
                <Button className="py-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-lg font-bold uppercase shadow-lg shadow-rose-900/20" onClick={handleClockOut} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogOut className="mr-2 h-6 w-6" /> End</>}
                </Button>
            </div>
        ) : (
            <Button className="w-full py-8 bg-primary hover:bg-primary/90 text-white rounded-xl text-2xl font-bold uppercase shadow-xl shadow-primary/20 interactive-element" onClick={handleClockIn} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start Shift'}
            </Button>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 w-full pt-4 border-t border-white/5">
        <div className="flex items-center justify-center space-x-8">
            <div onClick={() => !isClockedIn && setLocation('OFFICE')} className={cn("flex flex-col items-center gap-2 cursor-pointer transition-all", location === 'OFFICE' ? "text-primary scale-110" : "text-gray-500 opacity-50 hover:opacity-100")}>
                <Building className="w-6 h-6" /><span className="text-[0.625rem] font-bold uppercase tracking-widest">Office</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div onClick={() => !isClockedIn && setLocation('REMOTE')} className={cn("flex flex-col items-center gap-2 cursor-pointer transition-all", location === 'REMOTE' ? "text-primary scale-110" : "text-gray-500 opacity-50 hover:opacity-100")}>
                <Briefcase className="w-6 h-6" /><span className="text-[0.625rem] font-bold uppercase tracking-widest">Remote</span>
            </div>
        </div>
        
        {systemConfig?.attendance_strict && location === 'OFFICE' && (
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-[0.625rem] font-bold uppercase tracking-tighter", distanceFromOffice === null ? "bg-secondary" : distanceFromOffice <= 200 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                {distanceFromOffice === null ? <Loader2 className="w-3 h-3 animate-spin" /> : distanceFromOffice <= 200 ? <MapPin className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {distanceFromOffice === null ? 'Locating Node...' : distanceFromOffice <= 200 ? 'Within Range' : 'Outside Geofence'}
            </div>
        )}
      </div>
    </section>
  );
}

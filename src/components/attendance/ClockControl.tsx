'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { format, differenceInSeconds, isAfter } from 'date-fns';
import { Clock, Loader2, Building, Briefcase, LogOut, Coffee, Play, MapPin, AlertTriangle, Hourglass } from 'lucide-react';
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
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [progress, setProgress] = useState(0);
  const [location, setLocation] = useState<AttendanceLocation>('OFFICE');
  const [today, setToday] = useState('');
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null);

  useEffect(() => { setToday(format(new Date(), 'yyyy-MM-dd')); }, []);

  useEffect(() => {
    // Role-based geofence logic
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

    // Role-based geofence check
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

    setIsSubmitting(true);
    try {
      await attendanceService.clockIn(firestore, userProfile, location, today);
      toast({ title: 'Shift Started' });
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
    finally { setIsSubmitting(false); }
  };

  const handleToggleBreak = async () => {
      if (!attendanceRecord || !firestore) return;
      setIsSubmitting(true);
      try {
          await attendanceService.toggleBreak(firestore, attendanceRecord);
      } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
      finally { setIsSubmitting(false); }
  }

  const handleClockOut = async () => {
     if (!userProfile || !attendanceRecord || !firestore) return;
     setIsSubmitting(true);
     try {
       await attendanceService.clockOut(firestore, userProfile, attendanceRecord);
       toast({ title: 'Shift Ended' });
     } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
     finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="card-bg rounded-2xl h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <section className={cn("apple-glass rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden h-full", className)}>
      {isOnBreak && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 animate-pulse" />}
      <div className="mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-[0.2em] text-[8px] font-black">
        <Clock className="w-2.5 h-2.5" />
        {isClockedIn ? (isOnBreak ? 'On Break' : 'Work Status') : 'Ready to Clock In'}
      </div>
      
      <div className="flex flex-col items-center gap-2 mb-6">
          <h3 className={cn("text-4xl font-black font-mono tracking-tighter transition-all", isOnBreak && "text-amber-500 opacity-50")}>
              {isClockedIn ? (isOnBreak ? 'BREAK' : shiftDuration) : '00:00:00'}
          </h3>
          {isClockedIn && !isOnBreak && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-white/5 animate-in fade-in">
                  <Hourglass className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-[9px] font-black font-mono text-amber-500">{timeRemaining} REMAINING</span>
              </div>
          )}
      </div>

      {isClockedIn && (
          <div className="w-full max-w-[200px] mb-6 space-y-1.5">
             <div className="flex justify-between text-[7px] font-black text-muted-foreground uppercase tracking-widest">
                 <span>Daily Progress</span>
                 <span>{Math.round(progress)}%</span>
             </div>
             <Progress value={progress} className="h-1" indicatorClassName={cn(progress >= 100 ? "bg-emerald-500" : "bg-primary")} />
          </div>
      )}

      <div className={cn("w-full space-y-3 mb-4", !isClockedIn && "mt-2")}>
        {isClockedIn ? (
            <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant={isOnBreak ? 'default' : 'outline'} 
                    className={cn("h-14 rounded-xl text-xs font-black uppercase transition-all", isOnBreak ? "bg-amber-600 hover:bg-amber-700" : "border-amber-500/50 text-amber-500 hover:bg-amber-500/5")} 
                    onClick={handleToggleBreak} 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (isOnBreak ? <><Play className="mr-2 h-4 w-4" /> Resume</> : <><Coffee className="mr-2 h-4 w-4" /> Break</>)}
                </Button>
                <Button className="h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase" onClick={handleClockOut} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogOut className="mr-2 h-4 w-4" /> Clock Out</>}
                </Button>
            </div>
        ) : (
            <Button className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-xl text-lg font-black uppercase shadow-xl shadow-primary/20 interactive-element" onClick={handleClockIn} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start Shift'}
            </Button>
        )}
      </div>

      <div className="flex items-center justify-center space-x-6 pt-4 border-t border-white/5 w-full">
          <div onClick={() => !isClockedIn && setLocation('OFFICE')} className={cn("flex items-center gap-1.5 cursor-pointer transition-all", location === 'OFFICE' ? "text-primary" : "text-muted-foreground opacity-50")}>
              <Building className="w-3.5 h-3.5" /><span className="text-[8px] font-black uppercase tracking-widest">Office</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div onClick={() => !isClockedIn && setLocation('REMOTE')} className={cn("flex items-center gap-1.5 cursor-pointer transition-all", location === 'REMOTE' ? "text-primary" : "text-muted-foreground opacity-50")}>
              <Briefcase className="w-3.5 h-3.5" /><span className="text-[8px] font-black uppercase tracking-widest">Remote</span>
          </div>
      </div>
    </section>
  );
}

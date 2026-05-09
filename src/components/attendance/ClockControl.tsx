'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { format, differenceInSeconds } from 'date-fns';
import {
  Clock,
  Loader2,
  Building,
  Briefcase,
  LogOut,
  Coffee,
  Play,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import type {
  UserProfile,
  Attendance,
  SystemConfig,
  AttendanceLocation,
} from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import {
  useFirestore,
  useCollection,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, limit, doc, increment, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn, getDistanceInMeters } from '@/lib/utils';
import { Progress } from '../ui/progress';

interface ClockControlProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
  systemConfig: SystemConfig | null;
  className?: string;
}

const STANDARD_SHIFT_SECONDS = 28800; // 8 hours

export function ClockControl({
  userProfile,
  permissions,
  systemConfig,
  className,
}: ClockControlProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shiftDuration, setShiftDuration] = useState('00:00:00');
  const [progress, setProgress] = useState(0);
  const [location, setLocation] = useState<AttendanceLocation>('OFFICE');
  const [today, setToday] = useState('');
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null);

  useEffect(() => {
    setToday(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  // Proximity Check for Geofencing
  useEffect(() => {
    if (systemConfig?.attendance_strict && systemConfig.office_coordinates && location === 'OFFICE') {
        navigator.geolocation.getCurrentPosition((pos) => {
            const dist = getDistanceInMeters(
                pos.coords.latitude, 
                pos.coords.longitude, 
                systemConfig.office_coordinates!.lat, 
                systemConfig.office_coordinates!.lng
            );
            setDistanceFromOffice(dist);
        }, () => setDistanceFromOffice(null), { timeout: 10000 });
    } else {
        setDistanceFromOffice(null);
    }
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
    if (isClockedIn && !isOnBreak && attendanceRecord?.clockIn) {
      timer = setInterval(() => {
        const now = new Date();
        const clockInTime = new Date(attendanceRecord.clockIn);
        const workedSeconds = differenceInSeconds(now, clockInTime) - (attendanceRecord.totalBreak || 0) - (attendanceRecord.idleTime || 0);
        
        const h = String(Math.floor(workedSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((workedSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(workedSeconds % 60)).padStart(2, '0');
        setShiftDuration(`${h}:${m}:${s}`);
        
        const currentProgress = Math.min(100, (workedSeconds / STANDARD_SHIFT_SECONDS) * 100);
        setProgress(currentProgress);
      }, 1000);
    } else {
        setShiftDuration('00:00:00');
        setProgress(0);
    }
    return () => clearInterval(timer);
  }, [isClockedIn, isOnBreak, attendanceRecord]);

  const handleClockIn = async () => {
    if (!userProfile || !firestore) return;
    
    if (systemConfig?.attendance_strict && location === 'OFFICE' && distanceFromOffice !== null && distanceFromOffice > 200) {
        toast({
            variant: "destructive",
            title: "Outside Geofence",
            description: `You are ${Math.round(distanceFromOffice)}m away. You must be within 200m of the office to clock in.`
        });
        return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const newRecord: Omit<Attendance, 'id'> = {
        userId: userProfile.id,
        userName: userProfile.fullName,
        orgId: userProfile.orgId,
        date: today,
        clockIn: now.toISOString(),
        status: 'PENDING',
        location,
        remarks: [],
        idleTime: 0,
        totalBreak: 0,
        onBreak: false,
        breaks: [],
      };
      await addDocumentNonBlocking(collection(firestore, 'attendance'), newRecord);
      toast({ title: 'Shift Started', description: 'Your request is pending HR approval.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBreak = async () => {
      if (!attendanceRecord || !firestore) return;
      setIsSubmitting(true);
      const now = new Date().toISOString();
      const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);

      try {
          if (!isOnBreak) {
              // Starting break
              updateDocumentNonBlocking(attendanceRef, {
                  onBreak: true,
                  breaks: arrayUnion({ start: now })
              });
              toast({ title: 'Break Started', description: 'Enjoy your rest.' });
          } else {
              // Ending break
              const lastBreak = attendanceRecord.breaks?.[attendanceRecord.breaks.length - 1];
              if (lastBreak) {
                  const breakSeconds = differenceInSeconds(new Date(now), new Date(lastBreak.start));
                  const updatedBreaks = [...(attendanceRecord.breaks || [])];
                  updatedBreaks[updatedBreaks.length - 1].end = now;

                  updateDocumentNonBlocking(attendanceRef, {
                      onBreak: false,
                      breaks: updatedBreaks,
                      totalBreak: increment(breakSeconds)
                  });
                  toast({ title: 'Break Ended', description: 'Welcome back to the mission.' });
              }
          }
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleClockOut = async () => {
     if (!userProfile || !attendanceRecord || !firestore) return;
     setIsSubmitting(true);
     try {
       const now = new Date();
       const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);
       
       const updateData: any = {
         clockOut: now.toISOString(),
         status: 'APPROVED',
       };

       if (isOnBreak) {
           updateData.onBreak = false;
           const lastBreak = attendanceRecord.breaks?.[attendanceRecord.breaks.length - 1];
           if (lastBreak) {
              const breakSeconds = differenceInSeconds(now, new Date(lastBreak.start));
              const updatedBreaks = [...(attendanceRecord.breaks || [])];
              updatedBreaks[updatedBreaks.length - 1].end = now.toISOString();
              updateData.breaks = updatedBreaks;
              updateData.totalBreak = increment(breakSeconds);
           }
       }

       updateDocumentNonBlocking(attendanceRef, updateData);
       
       const userRef = doc(firestore, 'users', userProfile.id);
       updateDocumentNonBlocking(userRef, { status: 'OFFLINE', lastSeen: now.toISOString() });

       toast({ title: 'Shift Ended', description: 'Work session logged successfully.' });
     } catch (e: any) {
       toast({ variant: 'destructive', title: 'Error', description: e.message });
     } finally {
       setIsSubmitting(false);
     }
  };

  if (isLoading) return <div className="card-bg rounded-2xl h-80 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <section className={cn("card-bg rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden", className)}>
      {isOnBreak && (
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 animate-pulse" />
      )}
      
      <div className="mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-widest text-[0.625rem] font-bold">
        <Clock className="w-3 h-3" />
        {isClockedIn ? (isOnBreak ? 'On Break' : 'Active Duty') : 'Ready to Start'}
      </div>

      <h3 className="text-5xl font-bold mb-4 font-headline tracking-tighter">
        {isClockedIn ? (isOnBreak ? 'REST' : shiftDuration) : '00:00:00'}
      </h3>
      
      {isClockedIn && (
          <div className="w-full max-w-[200px] mb-8 space-y-1.5">
             <div className="flex justify-between text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
             </div>
             <Progress value={progress} className="h-1.5" indicatorClassName={cn(progress >= 100 ? "bg-emerald-500" : "bg-primary")} />
          </div>
      )}

      <div className={cn("w-full space-y-4 mb-8", !isClockedIn && "mt-4")}>
        {isClockedIn ? (
            <div className="grid grid-cols-2 gap-4">
                <Button 
                    variant={isOnBreak ? 'default' : 'outline'}
                    className={cn(
                        "py-8 rounded-xl text-lg font-bold uppercase transition-all",
                        isOnBreak ? "bg-emerald-600 hover:bg-emerald-700" : "border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                    )}
                    onClick={handleToggleBreak}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (isOnBreak ? <><Play className="mr-2 h-6 w-6" /> Resume</> : <><Coffee className="mr-2 h-6 w-6" /> Break</>)}
                </Button>
                <Button 
                    className="py-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-lg font-bold uppercase"
                    onClick={handleClockOut}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogOut className="mr-2 h-6 w-6" /> End</>}
                </Button>
            </div>
        ) : (
            <Button 
                className="w-full py-8 bg-green-500 hover:bg-green-600 text-white rounded-xl text-2xl font-bold tracking-wider uppercase shadow-xl shadow-green-500/20"
                onClick={handleClockIn}
                disabled={isSubmitting}
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start Shift'}
            </Button>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 w-full pt-4 border-t border-white/5">
        <div className="flex items-center justify-center space-x-8">
            <div 
                onClick={() => !isClockedIn && setLocation('OFFICE')}
                className={cn(
                    "flex flex-col items-center gap-2 cursor-pointer transition-all group",
                    location === 'OFFICE' ? "text-primary scale-110" : "text-gray-500 opacity-50 hover:opacity-100",
                    isClockedIn && "cursor-not-allowed"
                )}
            >
                <Building className="w-6 h-6" />
                <span className="text-[0.625rem] font-bold tracking-widest uppercase">Office</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div 
                onClick={() => !isClockedIn && setLocation('REMOTE')}
                className={cn(
                    "flex flex-col items-center gap-2 cursor-pointer transition-all group",
                    location === 'REMOTE' ? "text-primary scale-110" : "text-gray-500 opacity-50 hover:opacity-100",
                    isClockedIn && "cursor-not-allowed"
                )}
            >
                <Briefcase className="w-6 h-6" />
                <span className="text-[0.625rem] font-bold tracking-widest uppercase">Remote</span>
            </div>
        </div>

        {systemConfig?.attendance_strict && location === 'OFFICE' && (
            <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[0.625rem] font-bold uppercase transition-colors",
                distanceFromOffice === null ? "bg-secondary text-muted-foreground" :
                distanceFromOffice <= 200 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
                {distanceFromOffice === null ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : distanceFromOffice <= 200 ? (
                    <MapPin className="w-3 h-3" />
                ) : (
                    <AlertTriangle className="w-3 h-3" />
                )}
                {distanceFromOffice === null ? 'Locating...' : 
                 distanceFromOffice <= 200 ? 'Within Office Range' : `${Math.round(distanceFromOffice)}m Outside Range`}
            </div>
        )}
      </div>
    </section>
  );
}

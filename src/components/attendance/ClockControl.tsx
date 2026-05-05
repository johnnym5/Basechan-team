'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { format, differenceInSeconds } from 'date-fns';
import {
  Clock,
  Loader2,
  LogIn,
  LogOut,
  ShieldQuestion,
  Building,
  Briefcase,
  Coffee,
  ZapOff,
  Camera,
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
import { collection, query, where, limit, doc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { getDistanceInMeters } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface ClockControlProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
  systemConfig: SystemConfig | null;
  className?: string;
}

export function ClockControl({
  userProfile,
  permissions,
  systemConfig,
  className,
}: ClockControlProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<Attendance | null>(
    null
  );
  const [shiftDuration, setShiftDuration] = useState('00:00:00');
  const [today, setToday] = useState<string>('');
  const [dateDisplay, setDateDisplay] = useState('');
  const [location, setLocation] = useState<AttendanceLocation>('OFFICE');
  const [shiftProgress, setShiftProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Camera & Permission States
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    if (!isClockedIn) {
        getCameraPermission();
    }

    return () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, []);

  useEffect(() => {
    setToday(format(new Date(), 'yyyy-MM-dd'));
    setDateDisplay(format(new Date(), 'PPPP'));
  }, []);

  const attendanceQuery = useMemoFirebase(() => {
    if (!userProfile || !today) return null;
    return query(
      collection(firestore, 'attendance'),
      where('userId', '==', userProfile.id),
      where('date', '==', today),
      where('status', 'in', ['PENDING', 'APPROVED']),
      limit(1)
    );
  }, [firestore, userProfile?.id, today]);

  const { data: attendanceData, isLoading: isAttendanceLoading } =
    useCollection<Attendance>(attendanceQuery);

  useEffect(() => {
    if (!isAttendanceLoading) {
      const record = attendanceData?.[0] || null;
      setAttendanceRecord(record);
      setIsLoading(false);
    }
  }, [attendanceData, isAttendanceLoading]);

  // Derived states
  const isClockedIn = !!attendanceRecord && !attendanceRecord.clockOut;
  const isPending = isClockedIn && attendanceRecord.status === 'PENDING';
  const isApproved = isClockedIn && attendanceRecord.status === 'APPROVED';
  const onBreak = isApproved && !!attendanceRecord?.onBreak;

  const { isIdle } = useIdleTimer(attendanceRecord);

  const formatDuration = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0;
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isApproved && attendanceRecord?.clockIn) {
      timer = setInterval(() => {
        const now = new Date();
        const clockInTime = new Date(attendanceRecord.clockIn);

        const totalBreakSeconds = (attendanceRecord.breaks || []).reduce((acc, br) => {
            if (br.start && br.end) {
                return acc + differenceInSeconds(new Date(br.end), new Date(br.start));
            }
            if (br.start && !br.end) {
                return acc + differenceInSeconds(now, new Date(br.start));
            }
            return acc;
        }, 0);
        
        const rawTotalSeconds = differenceInSeconds(now, clockInTime);
        const secondsWorked = Math.max(0, rawTotalSeconds - totalBreakSeconds - (attendanceRecord.idleTime || 0));
        setShiftDuration(formatDuration(secondsWorked));

        if (systemConfig?.work_hours?.start && systemConfig.work_hours.end) {
            const [startHour, startMinute] = systemConfig.work_hours.start.split(':').map(Number);
            const officeStartTime = new Date(clockInTime);
            officeStartTime.setHours(startHour, startMinute, 0, 0);

            const [endHour, endMinute] = systemConfig.work_hours.end.split(':').map(Number);
            const officeEndTime = new Date(clockInTime);
            officeEndTime.setHours(endHour, endMinute, 0, 0);

            const totalShiftDurationSeconds = differenceInSeconds(officeEndTime, officeStartTime);

            if (totalShiftDurationSeconds > 0) {
                const secondsUntilEnd = differenceInSeconds(officeEndTime, now);
                setTimeRemaining(formatDuration(secondsUntilEnd));

                const progress = Math.min(100, (secondsWorked / totalShiftDurationSeconds) * 100);
                setShiftProgress(progress);
            }
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isApproved, attendanceRecord, systemConfig]);


  const handleClockIn = async () => {
    if (!userProfile) return;
    
    if (hasCameraPermission === false) {
        toast({ variant: 'destructive', title: 'Security Requirement', description: 'Camera access is required for identity verification.' });
        return;
    }

    setIsSubmitting(true);

    if (
      systemConfig?.attendance_strict &&
      location === 'OFFICE' &&
      systemConfig.office_coordinates?.lat &&
      systemConfig.office_coordinates?.lng
    ) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          }
        );

        const { latitude, longitude } = position.coords;
        const distance = getDistanceInMeters(
          latitude,
          longitude,
          systemConfig.office_coordinates.lat,
          systemConfig.office_coordinates.lng
        );

        const GEOFENCE_RADIUS_METERS = 500;

        if (distance > GEOFENCE_RADIUS_METERS) {
          toast({
            variant: 'destructive',
            title: 'Clock-In Failed',
            description:
              'You are not within the required 500m radius to clock in from the office.',
          });
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Location Error',
          description: error.code === 1 ? 'Location permission denied.' : 'Could not get your location.',
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const remarks: Attendance['remarks'] = [];
      const now = new Date();
      const todayDateString = format(now, 'yyyy-MM-dd');

      if (systemConfig?.work_hours?.start) {
        const [startHour, startMinute] = systemConfig.work_hours.start.split(':').map(Number);
        const officeStartTime = new Date(now);
        officeStartTime.setHours(startHour, startMinute, 0, 0);

        if (differenceInSeconds(officeStartTime, now) > 1800) {
          remarks.push('EARLY');
        }

        const lateThreshold = new Date(officeStartTime);
        lateThreshold.setMinutes(officeStartTime.getMinutes() + 30);
        if (now > lateThreshold) {
          remarks.push('LATE');
        }
      }

      const newRecord: Omit<Attendance, 'id'> = {
        userId: userProfile.id,
        userName: userProfile.fullName,
        orgId: userProfile.orgId,
        date: todayDateString,
        clockIn: now.toISOString(),
        status: 'PENDING',
        location,
        remarks,
        idleTime: 0,
      };

      await addDocumentNonBlocking(collection(firestore, 'attendance'), newRecord);
      toast({ title: 'Clock-In Submitted', description: 'Your request is pending HR approval.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartBreak = () => {
    if (!attendanceRecord) return;
    const breakEntry = { start: new Date().toISOString() };
    const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);
    updateDocumentNonBlocking(attendanceRef, {
        onBreak: true,
        breaks: arrayUnion(breakEntry),
    });
  };

  const handleEndBreak = () => {
      if (!attendanceRecord || !attendanceRecord.breaks) return;
      const currentBreaks = [...attendanceRecord.breaks];
      const lastBreakIndex = currentBreaks.length - 1;
      
      if(lastBreakIndex >= 0 && !currentBreaks[lastBreakIndex].end) {
          currentBreaks[lastBreakIndex].end = new Date().toISOString();
          const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);
          updateDocumentNonBlocking(attendanceRef, {
              onBreak: false,
              breaks: currentBreaks,
          });
      }
  };

  const handleClockOut = async () => {
    if (!userProfile || !attendanceRecord) return;
    setIsSubmitting(true);

    try {
      const clockOutTime = new Date();
      const userRef = doc(firestore, 'users', userProfile.id);
      updateDocumentNonBlocking(userRef, {
        status: 'OFFLINE',
        lastSeen: clockOutTime.toISOString(),
      });

      const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);
      const clockInTime = new Date(attendanceRecord.clockIn);
      
      const breaks = [...(attendanceRecord.breaks || [])];
      const lastBreak = breaks[breaks.length - 1];
      if (attendanceRecord.onBreak && lastBreak && !lastBreak.end) {
          lastBreak.end = clockOutTime.toISOString();
      }

      const totalBreakSeconds = breaks.reduce((acc, br) => {
        if (br.start && br.end) return acc + differenceInSeconds(new Date(br.end), new Date(br.start));
        return acc;
      }, 0);
      
      const totalShiftSeconds = differenceInSeconds(clockOutTime, clockInTime);
      const durationInSeconds = totalShiftSeconds - totalBreakSeconds - (attendanceRecord.idleTime || 0);

      let overtime = 0;
      let undertime = 0;
      const remarks = attendanceRecord.remarks || [];

      if (systemConfig?.work_hours?.start && systemConfig?.work_hours?.end) {
        const [sh, sm] = systemConfig.work_hours.start.split(':').map(Number);
        const [eh, em] = systemConfig.work_hours.end.split(':').map(Number);
        const officeStartTime = new Date(clockInTime); officeStartTime.setHours(sh, sm, 0, 0);
        const officeEndTime = new Date(clockOutTime); officeEndTime.setHours(eh, em, 0, 0);
        const expectedSeconds = differenceInSeconds(officeEndTime, officeStartTime);
        const diff = durationInSeconds - expectedSeconds;

        if (diff > 1800) {
          overtime = diff;
          if (!remarks.includes('OVERTIME')) remarks.push('OVERTIME');
        } else if (diff < -1800) {
          undertime = Math.abs(diff);
          if (!remarks.includes('UNDERTIME')) remarks.push('UNDERTIME');
        }
      }

      updateDocumentNonBlocking(attendanceRef, {
        clockOut: clockOutTime.toISOString(),
        duration: durationInSeconds,
        totalBreak: totalBreakSeconds,
        overtime,
        undertime,
        remarks,
        onBreak: false,
        breaks: breaks,
      });

      toast({ title: 'Clocked Out', description: 'Your shift has ended.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!permissions.canClockIn) {
    return (
      <Card className={cn(className)}>
        <CardHeader><CardTitle>Time Clock</CardTitle></CardHeader>
        <CardContent><p className="text-center text-sm text-muted-foreground">Time clock is disabled for your position.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="text-center p-6 pb-2">
        <CardTitle className="text-2xl font-bold tracking-tight">Time Clock</CardTitle>
        <CardDescription className="text-base">
          {dateDisplay || <Skeleton className="h-5 w-32 mx-auto" />}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-center p-6">
        {isClockedIn ? (
          <>
            <div className="grid grid-cols-2 gap-3">
                 <Button
                  variant={onBreak ? 'default' : 'outline'}
                  className="w-full h-12 text-sm gap-2"
                  disabled={isSubmitting || !isApproved}
                  onClick={onBreak ? handleEndBreak : handleStartBreak}
                >
                  <Coffee className="h-4 w-4" />
                  {onBreak ? 'End Break' : 'Start Break'}
                </Button>
                <Button
                  variant="destructive"
                  className="w-full h-12 text-sm gap-2"
                  disabled={isSubmitting || onBreak}
                  onClick={handleClockOut}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Clock Out
                </Button>
            </div>
            {isApproved && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-center gap-8">
                    <div className="text-center relative">
                        {isIdle && (
                            <Badge className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white animate-pulse">
                                STANDBY
                            </Badge>
                        )}
                        <p className="font-mono text-4xl font-bold tracking-widest">{shiftDuration}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Active Time</p>
                    </div>
                    {attendanceRecord?.idleTime && attendanceRecord.idleTime > 0 ? (
                        <div className="text-center text-amber-500 border-l pl-8">
                            <p className="font-mono text-2xl font-bold tracking-widest">{formatDuration(attendanceRecord.idleTime)}</p>
                            <p className="text-[10px] uppercase tracking-widest mt-1">Standby Time</p>
                        </div>
                    ) : null}
                </div>
                {timeRemaining !== null && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <span>Progress ({Math.round(shiftProgress)}%)</span>
                            <span>{timeRemaining} to EOD</span>
                        </div>
                        <Progress value={shiftProgress} className="h-3" indicatorClassName="bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    </div>
                )}
              </div>
            )}
            {isPending && (
              <div className="flex items-center justify-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 animate-pulse">
                <ShieldQuestion className="h-5 w-5" />
                <span className="font-semibold uppercase tracking-wider">Pending HR Approval</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video border-2 border-primary/20 group">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <div className={cn("size-2 rounded-full animate-pulse", hasCameraPermission ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                        {hasCameraPermission ? "Secure Media Feed Active" : "Camera Access Required"}
                    </span>
                </div>
                {!hasCameraPermission && (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-black/40 backdrop-blur-sm">
                        <Alert variant="destructive" className="bg-background/90 border-destructive/50">
                            <Camera className="h-4 w-4" />
                            <AlertTitle>Media Authorization Required</AlertTitle>
                            <AlertDescription>Please allow camera access to initialize the time clock.</AlertDescription>
                        </Alert>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setLocation('OFFICE')}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all duration-200",
                  location === 'OFFICE' 
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_-5px_rgba(var(--primary),0.3)] ring-2 ring-primary/20" 
                    : "border-muted bg-popover text-muted-foreground hover:bg-accent hover:border-muted-foreground/30"
                )}
              >
                <Building className={cn("mb-2 h-8 w-8", location === 'OFFICE' ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-bold uppercase tracking-widest">Office</span>
              </button>
              <button
                type="button"
                onClick={() => setLocation('REMOTE')}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all duration-200",
                  location === 'REMOTE' 
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_-5px_rgba(var(--primary),0.3)] ring-2 ring-primary/20" 
                    : "border-muted bg-popover text-muted-foreground hover:bg-accent hover:border-muted-foreground/30"
                )}
              >
                <Briefcase className={cn("mb-2 h-8 w-8", location === 'REMOTE' ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-bold uppercase tracking-widest">Remote</span>
              </button>
            </div>
            <Button
              className="w-full h-14 text-lg font-bold uppercase tracking-[0.2em] bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-900/20"
              disabled={isSubmitting || !hasCameraPermission}
              onClick={handleClockIn}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <LogIn className="mr-2 h-6 w-6" />}
              Start Shift
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

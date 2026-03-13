'use client';

import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { getDistanceInMeters } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

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

  useEffect(() => {
    // Set date on client side to avoid hydration mismatch
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

  // Derived states from the attendance record
  const isClockedIn = !!attendanceRecord && !attendanceRecord.clockOut;
  const isPending = isClockedIn && attendanceRecord.status === 'PENDING';
  const isApproved = isClockedIn && attendanceRecord.status === 'APPROVED';
  const onBreak = isApproved && !!attendanceRecord?.onBreak;

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
        const secondsWorked = Math.max(0, rawTotalSeconds - totalBreakSeconds);
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
        let errorMessage =
          'Could not get your location. Please ensure location services are enabled.';
        if (error.code === 1) {
          errorMessage =
            'Location permission denied. You must allow location access for office clock-ins.';
        }
        toast({
          variant: 'destructive',
          title: 'Location Error',
          description: errorMessage,
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
        const [startHour, startMinute] = systemConfig.work_hours.start
          .split(':')
          .map(Number);
        const officeStartTime = new Date(now);
        officeStartTime.setHours(startHour, startMinute, 0, 0);

        // Only mark as 'EARLY' if more than 30 minutes before start time
        const secondsUntilStart = differenceInSeconds(officeStartTime, now);
        if (secondsUntilStart > 1800) { // 30 minutes * 60 seconds
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
      };

      await addDocumentNonBlocking(
        collection(firestore, 'attendance'),
        newRecord
      );

      toast({
        title: 'Clock-In Submitted',
        description: 'Your request is pending HR approval.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
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
        if (br.start && br.end) {
            return acc + differenceInSeconds(new Date(br.end), new Date(br.start));
        }
        return acc;
      }, 0);
      
      const totalShiftSeconds = differenceInSeconds(clockOutTime, clockInTime);
      const durationInSeconds = totalShiftSeconds - totalBreakSeconds;

      let overtime = 0;
      let undertime = 0;
      const remarks = attendanceRecord.remarks || [];

      if (systemConfig?.work_hours?.start && systemConfig?.work_hours?.end) {
        const [startHour, startMinute] = systemConfig.work_hours.start
          .split(':')
          .map(Number);
        const [endHour, endMinute] = systemConfig.work_hours.end
          .split(':')
          .map(Number);

        const officeStartTime = new Date(clockInTime);
        officeStartTime.setHours(startHour, startMinute, 0, 0);

        const officeEndTime = new Date(clockOutTime);
        officeEndTime.setHours(endHour, endMinute, 0, 0);

        const expectedDurationInSeconds = differenceInSeconds(
          officeEndTime,
          officeStartTime
        );
        const diff = durationInSeconds - expectedDurationInSeconds;
        const gracePeriodSeconds = 1800; // 30 minutes

        if (diff > gracePeriodSeconds) {
          overtime = diff;
          if (!remarks.includes('OVERTIME')) remarks.push('OVERTIME');
        } else if (diff < -gracePeriodSeconds) {
          undertime = Math.abs(diff);
          if (!remarks.includes('UNDERTIME')) remarks.push('UNDERTIME');
        }
      }

      const updateData = {
        clockOut: clockOutTime.toISOString(),
        duration: durationInSeconds,
        totalBreak: totalBreakSeconds,
        overtime,
        undertime,
        remarks,
        onBreak: false,
        breaks: breaks,
      };

      updateDocumentNonBlocking(attendanceRef, updateData);

      toast({ title: 'Clocked Out', description: 'Your shift has ended.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
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
        <CardHeader>
          <CardTitle>Time Clock</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Time clock is disabled for your position.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="text-center p-3 pb-1">
        <CardTitle>Time Clock</CardTitle>
        <CardDescription>
          {dateDisplay || <Skeleton className="h-5 w-32 mx-auto" />}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-center p-3 pt-0">
        {isClockedIn ? (
          <>
            <div className="grid grid-cols-2 gap-2">
                 <Button
                  variant={onBreak ? 'default' : 'outline'}
                  className="w-full h-10 text-sm flex-col gap-1"
                  disabled={isSubmitting || !isApproved}
                  onClick={onBreak ? handleEndBreak : handleStartBreak}
                >
                  <div className="flex items-center gap-2">
                    <Coffee />
                    {onBreak ? 'End Break' : 'Start Break'}
                  </div>
                </Button>
                <Button
                  variant="destructive"
                  className="w-full h-10 text-sm flex-col gap-1"
                  disabled={isSubmitting || onBreak}
                  onClick={handleClockOut}
                >
                  <div className="flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <LogOut />}
                    Clock Out
                  </div>
                </Button>
            </div>
            {isApproved && (
              <div className="space-y-2 pt-2">
                <div className="text-center">
                    <p className="font-mono text-base tracking-widest">{shiftDuration}</p>
                    <p className="text-xs text-muted-foreground">TIME ELAPSED</p>
                </div>
                {timeRemaining !== null && (
                    <div>
                        <Progress value={shiftProgress} className="h-2" />
                        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                            <span>Shift Progress ({Math.round(shiftProgress)}%)</span>
                            <span>{timeRemaining} remaining</span>
                        </div>
                    </div>
                )}
              </div>
            )}
            {isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-amber-500 animate-pulse">
                <ShieldQuestion className="h-4 w-4" />
                <span>Pending Approval</span>
              </div>
            )}
          </>
        ) : (
          <>
            <RadioGroup
              defaultValue="OFFICE"
              onValueChange={(value: AttendanceLocation) => setLocation(value)}
              className="grid grid-cols-2 gap-4 mb-4"
            >
              <Label
                htmlFor="office"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <RadioGroupItem value="OFFICE" id="office" className="sr-only" />
                <Building className="mb-2 h-5 w-5" />
                In Office
              </Label>
              <Label
                htmlFor="remote"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <RadioGroupItem value="REMOTE" id="remote" className="sr-only" />
                <Briefcase className="mb-2 h-5 w-5" />
                Remote
              </Label>
            </RadioGroup>
            <Button
              className="w-full h-10 text-sm bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting}
              onClick={handleClockIn}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />}
              Clock In
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

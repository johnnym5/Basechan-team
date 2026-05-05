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
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shiftDuration, setShiftDuration] = useState('00:00:00');
  const [location, setLocation] = useState<AttendanceLocation>('OFFICE');
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(format(new Date(), 'yyyy-MM-dd'));
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

  const { data: attendanceData, isLoading } = useCollection<Attendance>(attendanceQuery);
  const attendanceRecord = attendanceData?.[0] || null;

  const isClockedIn = !!attendanceRecord && !attendanceRecord.clockOut;

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isClockedIn && attendanceRecord?.clockIn) {
      timer = setInterval(() => {
        const now = new Date();
        const clockInTime = new Date(attendanceRecord.clockIn);
        const workedSeconds = differenceInSeconds(now, clockInTime) - (attendanceRecord.totalBreak || 0) - (attendanceRecord.idleTime || 0);
        
        const h = String(Math.floor(workedSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((workedSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(workedSeconds % 60)).padStart(2, '0');
        setShiftDuration(`${h}:${m}:${s}`);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isClockedIn, attendanceRecord]);

  const handleClockIn = async () => {
    if (!userProfile || !firestore) return;
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
      };
      await addDocumentNonBlocking(collection(firestore, 'attendance'), newRecord);
      toast({ title: 'Shift Started', description: 'Your request is pending HR approval.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
     if (!userProfile || !attendanceRecord || !firestore) return;
     setIsSubmitting(true);
     try {
       const now = new Date();
       const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);
       updateDocumentNonBlocking(attendanceRef, {
         clockOut: now.toISOString(),
         status: 'APPROVED', // Auto approve for demo
       });
       toast({ title: 'Shift Ended', description: 'Work session logged successfully.' });
     } catch (e: any) {
       toast({ variant: 'destructive', title: 'Error', description: e.message });
     } finally {
       setIsSubmitting(false);
     }
  };

  if (isLoading) return <div className="card-bg rounded-2xl h-80 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <section className={cn("card-bg rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg", className)}>
      <h3 className="text-4xl font-bold mb-8">{isClockedIn ? shiftDuration : 'Time Clock'}</h3>
      
      {isClockedIn ? (
          <Button 
            className="w-full py-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xl font-bold tracking-wider uppercase mb-8"
            onClick={handleClockOut}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <LogOut className="mr-2" />}
            End Shift
          </Button>
      ) : (
          <Button 
            className="w-full py-8 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xl font-bold tracking-wider uppercase mb-8"
            onClick={handleClockIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start Shift'}
          </Button>
      )}

      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-3">
          <Building className={cn("w-5 h-5", location === 'OFFICE' ? "text-primary" : "text-gray-400")} />
          <span className="text-sm font-medium">OFFICE</span>
          <div 
            onClick={() => setLocation('OFFICE')}
            className={cn("w-10 h-5 rounded-full relative cursor-pointer", location === 'OFFICE' ? "bg-primary" : "bg-gray-600")}
          >
            <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", location === 'OFFICE' ? "right-0.5" : "left-0.5")}></div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div 
            onClick={() => setLocation('REMOTE')}
            className={cn("w-10 h-5 rounded-full relative cursor-pointer", location === 'REMOTE' ? "bg-primary" : "bg-gray-600")}
          >
            <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", location === 'REMOTE' ? "right-0.5" : "left-0.5")}></div>
          </div>
          <span className="text-sm font-medium">REMOTE</span>
          <Briefcase className={cn("w-5 h-5", location === 'REMOTE' ? "text-primary" : "text-gray-400")} />
        </div>
      </div>
    </section>
  );
}
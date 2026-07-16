<<<<<<< HEAD
'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { LeaveRequest, LeaveType, UserProfile } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { type DayContentProps } from 'react-day-picker';
import { eachDayOfInterval, format, isSameDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { getHolidayOnDate, PUBLIC_HOLIDAYS } from "@/lib/holidays";
import { cn } from "@/lib/utils";

interface TeamLeaveCalendarProps {
  userProfile: UserProfile;
}

export function TeamLeaveCalendar({ userProfile }: TeamLeaveCalendarProps) {
  const firestore = useFirestore();
  const [month, setMonth] = useState<Date>(new Date());

  const approvedLeaveQuery = useMemoFirebase(() => {
    return query(
      collection(firestore!, 'leave_requests'),
      where('orgId', '==', userProfile.orgId),
      where('status', '==', 'APPROVED')
    );
  }, [firestore, userProfile.orgId]);

  const { data: leaveRequests, isLoading } = useCollection<LeaveRequest>(approvedLeaveQuery);

  const leavesByDay = useMemo(() => {
    const days: Record<string, { userName: string; leaveType: LeaveType }[]> = {};
    if (!leaveRequests) return days;

    leaveRequests.forEach(req => {
      try {
        const interval = eachDayOfInterval({
          start: new Date(req.startDate),
          end: new Date(req.endDate)
        });
        
        interval.forEach(day => {
          const dayString = format(day, 'yyyy-MM-dd');
          if (!days[dayString]) {
            days[dayString] = [];
          }
          days[dayString].push({ userName: req.userName, leaveType: req.leaveType });
        });
      } catch (e) {
        console.error("Invalid date range for leave request:", req.id, e);
      }
    });

    return days;
  }, [leaveRequests]);
  
  const occupiedDays = useMemo(() => Object.keys(leavesByDay).map(dayStr => new Date(dayStr)), [leavesByDay]);
  const holidayDates = useMemo(() => PUBLIC_HOLIDAYS.map(h => new Date(h.date)), []);

  function DayContent(props: DayContentProps) {
    const dayString = format(props.date, 'yyyy-MM-dd');
    const leaves = leavesByDay[dayString];
    const holiday = getHolidayOnDate(props.date);

    if (!leaves && !holiday) return <div className="w-full h-full flex items-center justify-center">{props.date.getDate()}</div>;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn(
            "w-full h-full flex items-center justify-center rounded-lg transition-all interactive-element",
            holiday ? "bg-amber-500/20 text-amber-600 font-bold" : "bg-destructive/10 text-destructive font-bold"
          )}>
            {props.date.getDate()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 apple-glass border-none z-50 animate-pop-in" side="bottom" align="center">
          <div className="space-y-3">
            <p className="font-bold text-sm tracking-tight">{format(props.date, 'PPPP')}</p>
            {holiday && (
               <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Public Holiday</p>
                  <p className="text-sm font-semibold">{holiday.name}</p>
               </div>
            )}
            {leaves?.map((leave, index) => (
              <div key={index} className="text-sm flex justify-between items-center p-3 rounded-xl bg-secondary/50 border border-white/5">
                <span className="font-bold">{leave.userName}</span>
                <Badge variant="secondary" className="capitalize text-[10px] font-bold">{leave.leaveType.toLowerCase()}</Badge>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
  if (isLoading) {
    return (
        <Card className="apple-glass border-none">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="flex justify-center p-8">
                <Skeleton className="h-80 w-[340px] rounded-3xl" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="apple-glass border-none overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight">Availability Calendar</CardTitle>
        <CardDescription>
          Red indicates <span className="text-destructive font-bold">Occupied Dates</span>. Amber indicates <span className="text-amber-600 font-bold">Public Holidays</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <Calendar
          showOutsideDays
          month={month}
          onMonthChange={setMonth}
          className="p-0 mx-auto"
          modifiers={{ 
            occupied: occupiedDays,
            holiday: holidayDates 
          }}
          modifiersClassNames={{ 
            occupied: 'border-destructive/30 text-destructive bg-destructive/5',
            holiday: 'border-amber-500/30 text-amber-600 bg-amber-500/5'
          }}
          components={{ DayContent }}
        />
      </CardContent>
    </Card>
  )
=======
'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { LeaveRequest, LeaveType, UserProfile } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { type DayContentProps } from 'react-day-picker';
import { eachDayOfInterval, format, isSameDay, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { getHolidayOnDate, PUBLIC_HOLIDAYS } from "@/lib/holidays";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock } from "lucide-react";

interface TeamLeaveCalendarProps {
  userProfile: UserProfile;
}

export function TeamLeaveCalendar({ userProfile }: TeamLeaveCalendarProps) {
  const firestore = useFirestore();
  const [month, setMonth] = useState<Date>(new Date());

  const approvedLeaveQuery = useMemoFirebase(() => {
    return query(
      collection(firestore!, 'leave_requests'),
      where('orgId', '==', userProfile.orgId),
      where('status', '==', 'APPROVED')
    );
  }, [firestore, userProfile.orgId]);

  const { data: leaveRequests, isLoading } = useCollection<LeaveRequest>(approvedLeaveQuery);

  const leavesByDay = useMemo(() => {
    const days: Record<string, { userName: string; leaveType: LeaveType }[]> = {};
    if (!leaveRequests) return days;

    leaveRequests.forEach(req => {
      try {
        const interval = eachDayOfInterval({
          start: new Date(req.startDate),
          end: new Date(req.endDate)
        });
        
        interval.forEach(day => {
          const dayString = format(day, 'yyyy-MM-dd');
          if (!days[dayString]) {
            days[dayString] = [];
          }
          days[dayString].push({ userName: req.userName, leaveType: req.leaveType });
        });
      } catch (e) {
        console.error("Invalid date range for leave request:", req.id, e);
      }
    });

    return days;
  }, [leaveRequests]);
  
  const occupiedDays = useMemo(() => Object.keys(leavesByDay).map(dayStr => new Date(dayStr)), [leavesByDay]);
  const holidayDates = useMemo(() => PUBLIC_HOLIDAYS.map(h => new Date(h.date)), []);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLeaves = leavesByDay[todayStr] || [];

  const upcomingLeaves = useMemo(() => {
    if (!leaveRequests) return [];
    const today = startOfDay(new Date());
    const nextMonth = addDays(today, 30);
    
    return leaveRequests
      .filter(req => {
        const startDate = new Date(req.startDate);
        return isAfter(startDate, today) && isBefore(startDate, nextMonth);
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [leaveRequests]);

  function DayContent(props: DayContentProps) {
    const dayString = format(props.date, 'yyyy-MM-dd');
    const leaves = leavesByDay[dayString];
    const holiday = getHolidayOnDate(props.date);

    if (!leaves && !holiday) return <div className="w-full h-full flex items-center justify-center">{props.date.getDate()}</div>;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={cn(
            "w-full h-full flex items-center justify-center rounded-lg transition-all interactive-element cursor-default",
            holiday ? "bg-amber-500/20 text-amber-600 font-bold" : "bg-destructive/10 text-destructive font-bold"
          )}>
            {props.date.getDate()}
          </button>
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3 apple-glass border-none z-50 animate-pop-in" side="bottom" align="center">
          <div className="space-y-3">
            <p className="font-bold text-sm tracking-tight">{format(props.date, 'PPPP')}</p>
            {holiday && (
               <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Public Holiday</p>
                  <p className="text-sm font-semibold">{holiday.name}</p>
               </div>
            )}
            {leaves?.map((leave, index) => (
              <div key={index} className="text-sm flex justify-between items-center p-3 rounded-xl bg-secondary/50 border border-white/5">
                <span className="font-bold">{leave.userName}</span>
                <Badge variant="secondary" className="capitalize text-[10px] font-bold">{leave.leaveType.toLowerCase()}</Badge>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (isLoading) {
    return (
        <Card className="apple-glass border-none">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="flex justify-center p-8">
                <Skeleton className="h-80 w-[340px] rounded-3xl" />
            </CardContent>
        </Card>
    )
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card className="apple-glass border-none overflow-hidden h-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold tracking-tight">Availability Calendar</CardTitle>
              <CardDescription>
                Red indicates <span className="text-destructive font-bold">Occupied Dates</span>. Amber indicates <span className="text-amber-600 font-bold">Public Holidays</span>. Hover to view details.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Calendar
                showOutsideDays
                month={month}
                onMonthChange={setMonth}
                className="p-0 mx-auto w-full max-w-2xl"
                classNames={{
                  day: "h-14 w-14 text-center text-base p-0 relative [&:has([aria-selected])]:bg-transparent focus-within:relative focus-within:z-20",
                  day_button: "h-14 w-14 p-0 font-normal aria-selected:opacity-100 rounded-xl transition-all hover:bg-white/5 active:scale-95",
                  weekday: "text-muted-foreground rounded-md w-14 font-semibold text-[0.625rem] uppercase tracking-widest text-center",
                }}
                modifiers={{ 
                  occupied: occupiedDays,
                  holiday: holidayDates 
                }}
                modifiersClassNames={{ 
                  occupied: 'border-destructive/30 text-destructive bg-destructive/5',
                  holiday: 'border-amber-500/30 text-amber-600 bg-amber-500/5'
                }}
                components={{ DayContent }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="apple-glass border-none h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Currently on Leave
              </CardTitle>
              <CardDescription>Staff absent today</CardDescription>
            </CardHeader>
            <CardContent>
              {todayLeaves.length > 0 ? (
                <div className="space-y-3">
                  {todayLeaves.map((leave, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-secondary/30">
                      <span className="font-semibold text-sm">{leave.userName}</span>
                      <Badge variant="outline" className="text-[10px]">{leave.leaveType}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-xl">
                  Everyone is working today.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="apple-glass border-none h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Upcoming Leaves
              </CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingLeaves.length > 0 ? (
                <div className="space-y-3">
                  {upcomingLeaves.slice(0, 5).map((req, i) => (
                    <div key={i} className="flex flex-col p-3 rounded-xl bg-secondary/30 gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{req.userName}</span>
                        <Badge variant="outline" className="text-[10px]">{req.leaveType}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(req.startDate), 'MMM d')} - {format(new Date(req.endDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                  {upcomingLeaves.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      +{upcomingLeaves.length - 5} more upcoming leaves
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-xl">
                  No upcoming leaves scheduled.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
}
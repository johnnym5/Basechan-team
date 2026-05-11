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
}
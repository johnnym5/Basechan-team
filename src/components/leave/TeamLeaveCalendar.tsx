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
      collection(firestore, 'leave_requests'),
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
            "w-full h-full flex items-center justify-center rounded-md transition-colors",
            holiday ? "bg-amber-500/20 text-amber-600 font-bold" : "bg-destructive/10 text-destructive font-bold"
          )}>
            {props.date.getDate()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2 z-10" side="bottom" align="center">
          <div className="space-y-2">
            <p className="font-semibold text-sm">{format(props.date, 'PPPP')}</p>
            {holiday && (
               <div className="p-2 rounded bg-amber-50 border border-amber-200">
                  <p className="text-xs font-bold text-amber-700">Public Holiday</p>
                  <p className="text-sm font-medium">{holiday.name}</p>
               </div>
            )}
            {leaves?.map((leave, index) => (
              <div key={index} className="text-sm flex justify-between items-center p-2 rounded bg-secondary/30">
                <span className="font-medium">{leave.userName}</span>
                <Badge variant="secondary" className="capitalize text-[10px]">{leave.leaveType.toLowerCase()}</Badge>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="flex justify-center">
                <Skeleton className="h-80 w-[340px]" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Schedule</CardTitle>
        <CardDescription>
          Red indicates occupied dates (max 1 person). Amber indicates public holidays.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            occupied: 'border-destructive text-destructive bg-destructive/5',
            holiday: 'border-amber-500 text-amber-600 bg-amber-500/5'
          }}
          components={{ DayContent }}
        />
      </CardContent>
    </Card>
  )
}

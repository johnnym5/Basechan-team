'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { Attendance, UserProfile } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { format, differenceInSeconds, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Calendar } from "../ui/calendar";
import { useState, useMemo } from "react";
import { ScrollArea } from "../ui/scroll-area";

interface TeamAttendanceHistoryProps {
  userProfile: UserProfile;
}

export function TeamAttendanceHistory({ userProfile }: TeamAttendanceHistoryProps) {
  const firestore = useFirestore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId),
      where('date', '>=', format(start, 'yyyy-MM-dd')),
      where('date', '<=', format(end, 'yyyy-MM-dd')),
      orderBy('date', 'desc')
    );
  }, [firestore, userProfile.orgId, currentMonth]);

  const { data: attendanceHistory, isLoading } = useCollection<Attendance>(attendanceQuery);

  const recordsForSelectedDay = useMemo(() => {
    if (!attendanceHistory || !selectedDate) return [];
    return attendanceHistory.filter(record => isSameDay(new Date(record.date), selectedDate));
  }, [attendanceHistory, selectedDate]);

  const formatDuration = (totalSeconds: number | undefined): string => {
    if (totalSeconds == null || totalSeconds < 0) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const daysWithRecords = useMemo(() => {
      if(!attendanceHistory) return [];
      const dates = new Set(attendanceHistory.map(rec => rec.date));
      return Array.from(dates).map(dateStr => new Date(dateStr + 'T00:00:00')); // Avoid timezone issues
  }, [attendanceHistory]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
            <CardContent className="p-2">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    className="w-full"
                    modifiers={{ withRecords: daysWithRecords }}
                    modifiersClassNames={{ withRecords: 'bg-primary/20 rounded-md font-bold' }}
                />
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Attendance for {selectedDate ? format(selectedDate, 'PPP') : '...'}</CardTitle>
                <CardDescription>Showing all records for the selected day.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Location</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                        ))}
                        {!isLoading && recordsForSelectedDay.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No attendance records for this day.
                            </TableCell>
                        </TableRow>
                        )}
                        {!isLoading && recordsForSelectedDay.map(record => (
                        <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.userName}</TableCell>
                            <TableCell>{format(new Date(record.clockIn), 'p')}</TableCell>
                            <TableCell>{record.clockOut ? format(new Date(record.clockOut), 'p') : '—'}</TableCell>
                            <TableCell className="font-mono">{formatDuration(record.duration)}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">{record.location?.toLowerCase()}</Badge>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    </div>
  );
}

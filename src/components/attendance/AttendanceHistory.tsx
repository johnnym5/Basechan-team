'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { Attendance, UserProfile } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { format, differenceInSeconds } from 'date-fns';
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface AttendanceHistoryProps {
  userProfile: UserProfile | null;
}

export function AttendanceHistory({ userProfile }: AttendanceHistoryProps) {
  const firestore = useFirestore();

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
      collection(firestore, 'attendance'),
      where('userId', '==', userProfile.id),
      orderBy('date', 'desc'),
      limit(15) // Get the last 15 records
    );
  }, [firestore, userProfile]);

  const { data: attendanceHistory, isLoading } = useCollection<Attendance>(attendanceQuery);

  const formatDuration = (totalSeconds: number | undefined): string => {
    if (totalSeconds == null || totalSeconds < 0) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const calculateDuration = (clockIn: string, clockOut?: string): string => {
    if (!clockOut) {
      return "In Progress";
    }
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diffSeconds = differenceInSeconds(end, start);
    
    if (diffSeconds < 0) return "Invalid";

    return formatDuration(diffSeconds);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Attendance History</CardTitle>
        <CardDescription>A log of your recent clock-ins and clock-outs.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Work Time</TableHead>
              <TableHead>Break</TableHead>
              <TableHead className="text-right">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && attendanceHistory?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                      No attendance history found.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && attendanceHistory?.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{format(new Date(record.clockIn), 'PPP')}</TableCell>
                <TableCell>{format(new Date(record.clockIn), 'p')}</TableCell>
                <TableCell>{record.clockOut ? format(new Date(record.clockOut), 'p') : '—'}</TableCell>
                <TableCell className="font-mono">{formatDuration(record.duration)}</TableCell>
                <TableCell className="font-mono">{formatDuration(record.totalBreak)}</TableCell>
                <TableCell className="text-right space-x-1">
                    {record.remarks?.map(remark => (
                        <Badge key={remark} variant="secondary" className={cn(
                            remark === 'LATE' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
                            remark === 'EARLY' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
                            remark === 'OVERTIME' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
                            remark === 'UNDERTIME' && 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
                            "capitalize text-xs"
                        )}>
                            {remark.toLowerCase()}
                        </Badge>
                    ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

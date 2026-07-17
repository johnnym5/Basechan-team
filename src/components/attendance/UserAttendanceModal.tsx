'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { Attendance } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDuration } from '@/lib/formatters';

interface UserAttendanceModalProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserAttendanceModal({ userId, userName, isOpen, onClose }: UserAttendanceModalProps) {
  const firestore = useFirestore();
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const userRecordsQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, 'attendance'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
  }, [firestore, userId]);

  const { data: userRecords, isLoading } = useCollection<Attendance>(userRecordsQuery);

  const remoteDaysList = useMemo(() => {
    if (!userRecords) return [];
    return userRecords
      .filter(r => r.location === 'REMOTE')
      .map(r => new Date(r.date + 'T00:00:00'));
  }, [userRecords]);

  const officeDaysList = useMemo(() => {
    if (!userRecords) return [];
    return userRecords
      .filter(r => r.location === 'OFFICE')
      .map(r => new Date(r.date + 'T00:00:00'));
  }, [userRecords]);

  const absentDaysList = useMemo(() => {
    if (!userRecords) return [];
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let curr = new Date(start);
    while (curr <= end) {
      const d = new Date(curr);
      const dayOfWeek = d.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
      const isPast = d <= today;

      if (isWeekday && isPast) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const hasRecord = userRecords.some(r => r.date === dateStr);
        if (!hasRecord) {
          days.push(d);
        }
      }
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [calendarMonth, userRecords]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-gray-800 bg-[#12131a]/95 backdrop-blur-md text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Attendance Ledger: {userName}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Review detailed timeline metrics and check historical presence.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-4">
          {/* Left: Custom Calendar */}
          <div className="md:col-span-2">
            <Card className="border-gray-800 bg-secondary/10 p-2">
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                className="w-full"
                modifiers={{
                  remoteDays: remoteDaysList,
                  officeDays: officeDaysList,
                  absentDays: absentDaysList
                }}
                modifiersClassNames={{
                  remoteDays: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-bold rounded-lg border border-blue-500/30",
                  officeDays: "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold rounded-lg border border-rose-500/30",
                  absentDays: "bg-rose-900/10 text-rose-500 border border-rose-500/20 hover:bg-rose-900/20 rounded-lg"
                }}
              />
              <div className="mt-4 px-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-md bg-blue-500/20 border border-blue-500/30" />
                  <span className="text-muted-foreground">Remote Work Shift (Blue)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-md bg-rose-500/20 border border-rose-500/30" />
                  <span className="text-muted-foreground">Office Work Shift (Red)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-md bg-rose-900/10 border border-rose-500/20" />
                  <span className="text-muted-foreground">Absent / No Clock-in (Red Border)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: History List */}
          <div className="md:col-span-3">
            <Card className="border-gray-800 bg-secondary/10 h-full flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-gray-800">
                <CardTitle className="text-sm font-semibold">Timeline Activity</CardTitle>
                <CardDescription className="text-[10px]">Chronological ledger records</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[320px]">
                  {isLoading && (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  )}

                  {!isLoading && (!userRecords || userRecords.length === 0) && (
                    <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">
                      No attendance ledger records found.
                    </div>
                  )}

                  {!isLoading && userRecords && userRecords.length > 0 && (
                    <Table>
                      <TableHeader className="bg-secondary/20">
                        <TableRow className="border-gray-800 hover:bg-transparent">
                          <TableHead className="text-xs h-9 py-0">Date</TableHead>
                          <TableHead className="text-xs h-9 py-0">Times</TableHead>
                          <TableHead className="text-xs h-9 py-0">Duration</TableHead>
                          <TableHead className="text-xs h-9 py-0">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userRecords.map((record) => (
                          <TableRow key={record.id} className="border-gray-800 hover:bg-white/5 transition-colors">
                            <TableCell className="text-xs py-2 font-medium">
                              {format(new Date(record.date + 'T00:00:00'), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-xs py-2">
                              <span className="text-emerald-400">{format(new Date(record.clockIn), 'p')}</span>
                              <span className="mx-1 text-muted-foreground">→</span>
                              {record.clockOut ? (
                                <span className="text-rose-400">{format(new Date(record.clockOut), 'p')}</span>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/30 bg-yellow-400/10 animate-pulse">ACTIVE</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-2 font-mono">
                              {record.clockOut ? formatDuration(record.duration) : '—'}
                            </TableCell>
                            <TableCell className="text-xs py-2 space-y-1">
                              <div className="flex gap-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] capitalize border-gray-700 bg-secondary/50">
                                  {record.location?.toLowerCase()}
                                </Badge>
                                {record.remarks?.map((remark) => (
                                  <Badge key={remark} variant="destructive" className="text-[9px] bg-rose-950/20 text-rose-300 border border-rose-500/20">
                                    {remark.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

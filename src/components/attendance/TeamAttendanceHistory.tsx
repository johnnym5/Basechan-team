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
import { Button } from "../ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


interface TeamAttendanceHistoryProps {
  userProfile: UserProfile;
}

export function TeamAttendanceHistory({ userProfile }: TeamAttendanceHistoryProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
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
  
  const groupedRecords = useMemo(() => {
      return recordsForSelectedDay.reduce((acc, record) => {
          (acc[record.userName] = acc[record.userName] || []).push(record);
          return acc;
      }, {} as Record<string, Attendance[]>);
  }, [recordsForSelectedDay]);


  const formatDuration = (totalSeconds: number | undefined): string => {
    if (totalSeconds == null || totalSeconds < 0) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleExport = () => {
    if (!attendanceHistory || attendanceHistory.length === 0) {
        toast({
            variant: "destructive",
            title: "No Data to Export",
            description: "There is no attendance data for the selected month.",
        });
        return;
    }

    const headers = ["Staff Member", "Date", "Clock In", "Clock Out", "Work Time (s)", "Break (s)", "Location", "Remarks"];
    const dataToExport = attendanceHistory.map(record => [
        record.userName,
        record.date,
        format(new Date(record.clockIn), 'p'),
        record.clockOut ? format(new Date(record.clockOut), 'p') : 'N/A',
        record.duration || 0,
        record.totalBreak || 0,
        record.location,
        record.remarks?.join(', ') || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Attendance ${format(currentMonth, 'MMM yyyy')}`);
    XLSX.writeFile(wb, `attendance_${format(currentMonth, 'yyyy-MM')}.xlsx`);
    toast({ title: 'Exporting...', description: 'Your attendance report is being downloaded.' });
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
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Attendance for {selectedDate ? format(selectedDate, 'PPP') : '...'}</CardTitle>
                        <CardDescription>Showing all records for the selected day.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Month
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full mb-2" />
                        ))}

                        {!isLoading && Object.keys(groupedRecords).length === 0 && (
                            <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                                No attendance records for this day.
                            </div>
                        )}

                        {!isLoading && (
                            <Accordion type="multiple" className="w-full space-y-2" defaultValue={Object.keys(groupedRecords)}>
                                {Object.entries(groupedRecords).map(([userName, records]) => (
                                    <AccordionItem key={userName} value={userName} className="border-none bg-secondary/30 rounded-lg">
                                        <AccordionTrigger className="p-3 hover:no-underline hover:bg-secondary/50 rounded-lg text-sm">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>{userName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                                <div className="text-left">
                                                    <h4 className="font-semibold">{userName}</h4>
                                                    <p className="text-xs text-muted-foreground">{records.length} record(s)</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-0 p-2">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="h-8">Clock In</TableHead>
                                                        <TableHead className="h-8">Clock Out</TableHead>
                                                        <TableHead className="h-8">Duration</TableHead>
                                                        <TableHead className="h-8">Location</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {records.map(record => (
                                                        <TableRow key={record.id}>
                                                            <TableCell className="py-2">{format(new Date(record.clockIn), 'p')}</TableCell>
                                                            <TableCell className="py-2">{record.clockOut ? format(new Date(record.clockOut), 'p') : '—'}</TableCell>
                                                            <TableCell className="py-2 font-mono">{formatDuration(record.duration)}</TableCell>
                                                            <TableCell className="py-2">
                                                                <Badge variant="outline" className="capitalize">{record.location?.toLowerCase()}</Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                </ScrollArea>
            </CardContent>
        </Card>
    </div>
  );
}

'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import type { Attendance, UserProfile } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Badge } from "../ui/badge";
import { Calendar } from "../ui/calendar";
import { useState, useMemo } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDuration } from '@/lib/formatters';
import { attendanceService } from "@/services/attendance-service";
import { UserAttendanceModal } from "./UserAttendanceModal";

interface TeamAttendanceHistoryProps {
    userProfile: UserProfile;
}

export function TeamAttendanceHistory({ userProfile }: TeamAttendanceHistoryProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    // State for drilling down into a user's calendar history
    const [modalUserId, setModalUserId] = useState<string | null>(null);
    const [modalUserName, setModalUserName] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // State to track individual button submissions
    const [isSubmittingForceClockout, setIsSubmittingForceClockout] = useState<Record<string, boolean>>({});

    // Fetch all attendance records for the month to highlight calendar dates
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

    const { data: attendanceHistory, isLoading: isAttendanceLoading } = useCollection<Attendance>(attendanceQuery);

    // Fetch all users inside the organization to verify presence / absence
    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'),
            where('orgId', '==', userProfile.orgId)
        );
    }, [firestore, userProfile.orgId]);

    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

    const isDataLoading = isAttendanceLoading || isUsersLoading;

    // Collate all staff records for the selected day
    const staffAttendanceList = useMemo(() => {
        if (!users || !selectedDate) return [];

        return users.map(user => {
            const userRecords = attendanceHistory
                ? attendanceHistory.filter(r => r.userId === user.id && isSameDay(new Date(r.date + 'T00:00:00'), selectedDate))
                : [];
            return {
                user,
                records: userRecords
            };
        }).sort((a, b) => a.user.fullName.localeCompare(b.user.fullName));
    }, [users, attendanceHistory, selectedDate]);

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
        if (!attendanceHistory) return [];
        const dates = new Set(attendanceHistory.map(rec => rec.date));
        return Array.from(dates).map(dateStr => new Date(dateStr + 'T00:00:00')); // Avoid timezone issues
    }, [attendanceHistory]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-gray-800 bg-secondary/10">
                <CardContent className="p-2">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        className="w-full"
                        modifiers={{ withRecords: daysWithRecords }}
                        modifiersClassNames={{ withRecords: 'bg-primary/20 rounded-md font-bold text-primary border border-primary/20' }}
                    />
                </CardContent>
            </Card>
            <Card className="lg:col-span-2 border-gray-800 bg-secondary/10">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Attendance for {selectedDate ? format(selectedDate, 'PPP') : '...'}</CardTitle>
                            <CardDescription>Showing active and completed rosters for this date.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={isDataLoading} className="border-gray-800 hover:bg-white/5 text-xs font-semibold">
                            <Download className="mr-2 h-4 w-4 text-primary" />
                            Export Month
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[450px] pr-2">
                        {isDataLoading && Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full mb-3 bg-secondary/35" />
                        ))}

                        {!isDataLoading && staffAttendanceList.length === 0 && (
                            <div className="h-24 text-center flex items-center justify-center text-muted-foreground text-sm">
                                No registered staff profiles inside this organization.
                            </div>
                        )}

                        {!isDataLoading && staffAttendanceList.length > 0 && (
                            <div className="space-y-3">
                                {staffAttendanceList.map(({ user, records }) => {
                                    const hasRecords = records.length > 0;
                                    const isUserOnline = user.status === 'ONLINE' || user.status === 'PENDING';

                                    return (
                                        <div key={user.id} className="border border-gray-800 bg-secondary/20 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-all">
                                            {/* Left side: User Profile (clickable triggers user modal) */}
                                            <div 
                                                className="flex items-center gap-3 cursor-pointer select-none group flex-1"
                                                onClick={() => {
                                                    setModalUserId(user.id);
                                                    setModalUserName(user.fullName);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                <Avatar className="h-10 w-10 border border-gray-800 group-hover:border-primary/50 transition-colors">
                                                    <AvatarFallback className="bg-secondary text-white font-bold">{user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                                <div className="text-left">
                                                    <h4 className="font-bold group-hover:text-primary transition-colors flex items-center gap-2 text-sm text-white">
                                                        {user.fullName}
                                                        {isUserOnline && (
                                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        )}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>

                                            {/* Right side: Records or Absent badge */}
                                            <div className="flex items-center">
                                                {!hasRecords ? (
                                                    <Badge variant="outline" className="text-rose-500 bg-rose-500/5 border-rose-500/20 py-1 px-2.5 font-bold uppercase text-[9px] tracking-wider rounded-md">
                                                        Absent / No Clock-In
                                                    </Badge>
                                                ) : (
                                                    <div className="flex flex-col gap-2 min-w-[240px]">
                                                        {records.map(record => {
                                                            const isRecordActive = !record.clockOut;
                                                            return (
                                                                <div key={record.id} className="flex items-center justify-between gap-3 bg-secondary/30 rounded-xl p-2.5 text-xs border border-gray-800">
                                                                    <div className="space-y-0.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-emerald-400 font-bold">{format(new Date(record.clockIn), 'p')}</span>
                                                                            <span className="text-muted-foreground text-[10px]">→</span>
                                                                            {record.clockOut ? (
                                                                                <span className="text-rose-400 font-bold">{format(new Date(record.clockOut), 'p')}</span>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-400/30 bg-yellow-400/10 py-0 px-1.5 font-black animate-pulse rounded-md">ACTIVE</Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                                            <span className="capitalize">{record.location?.toLowerCase()}</span>
                                                                            {record.clockOut && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span className="font-mono">{formatDuration(record.duration)}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {isRecordActive && (
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            className="h-7 text-[9px] font-black uppercase rounded-lg px-2.5 transition-all active:scale-95"
                                                                            disabled={!!isSubmittingForceClockout[record.id]}
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                try {
                                                                                    setIsSubmittingForceClockout(prev => ({ ...prev, [record.id]: true }));
                                                                                    await attendanceService.forceClockOut(firestore!, record.id, userProfile);
                                                                                    toast({
                                                                                        title: "Forced Clock Out Success",
                                                                                        description: `Successfully clocked out ${user.fullName} and synchronized operational status.`,
                                                                                    });
                                                                                } catch (err: any) {
                                                                                    toast({
                                                                                        variant: "destructive",
                                                                                        title: "Force Clock Out Failed",
                                                                                        description: err.message || "An unexpected error occurred.",
                                                                                    });
                                                                                } finally {
                                                                                    setIsSubmittingForceClockout(prev => ({ ...prev, [record.id]: false }));
                                                                                }
                                                                            }}
                                                                        >
                                                                            {isSubmittingForceClockout[record.id] ? "Closing..." : "Force Close"}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Drilldown modal showing individual color-coded calendar details */}
            {modalUserId && (
                <UserAttendanceModal
                    userId={modalUserId}
                    userName={modalUserName}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setModalUserId(null);
                    }}
                />
            )}
        </div>
    );
}


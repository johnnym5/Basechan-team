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
import { Download, ArrowRight } from "lucide-react";
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

    const [modalUserId, setModalUserId] = useState<string | null>(null);
    const [modalUserName, setModalUserName] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [isSubmittingForceClockout, setIsSubmittingForceClockout] = useState<Record<string, boolean>>({});

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

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'),
            where('orgId', '==', userProfile.orgId)
        );
    }, [firestore, userProfile.orgId]);

    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

    const isDataLoading = isAttendanceLoading || isUsersLoading;

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
        return Array.from(dates).map(dateStr => new Date(dateStr + 'T00:00:00'));
    }, [attendanceHistory]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
            <Card className="lg:col-span-4 xl:col-span-3 border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm overflow-hidden flex flex-col h-full">
                <CardContent className="p-0 flex-1 flex flex-col justify-center items-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        className="w-full scale-105"
                        modifiers={{ withRecords: daysWithRecords }}
                        modifiersClassNames={{ withRecords: 'bg-primary/20 rounded-2xl font-black text-primary border border-primary/20' }}
                    />
                </CardContent>
            </Card>
            <Card className="lg:col-span-8 xl:col-span-9 border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm overflow-hidden flex flex-col h-full">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-4 shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase">
                                Attendance for {selectedDate ? format(selectedDate, 'PPP') : '...'}
                            </CardTitle>
                            <CardDescription className="text-[9px] font-black uppercase tracking-widest opacity-60">Active and completed rosters for this date.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={isDataLoading} className="h-8 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase tracking-widest">
                            <Download className="mr-2 h-3.5 w-3.5 text-primary" />
                            Export Month
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-3">
                            {isDataLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-20 w-full rounded-[1.5rem]" />
                                ))
                            ) : staffAttendanceList.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2rem] bg-secondary/5">
                                    <p className="text-muted-foreground uppercase font-black text-[9px] tracking-widest opacity-30">No organizational profiles detected</p>
                                </div>
                            ) : (
                                staffAttendanceList.map(({ user, records }) => {
                                    const hasRecords = records.length > 0;
                                    const isUserOnline = user.status === 'ONLINE';

                                    return (
                                        <div key={user.id} className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group">
                                            <div 
                                                className="flex items-center gap-4 cursor-pointer select-none flex-1"
                                                onClick={() => {
                                                    setModalUserId(user.id);
                                                    setModalUserName(user.fullName);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                <Avatar className="h-10 w-10 border border-white/5 group-hover:border-primary/50 transition-colors rounded-2xl">
                                                    <AvatarFallback className="bg-secondary text-white font-black text-xs">{user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                                <div className="text-left">
                                                    <h4 className="font-black text-sm text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                                        {user.fullName}
                                                        {isUserOnline && (
                                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        )}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{user.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {!hasRecords ? (
                                                    <Badge variant="outline" className="text-rose-500 bg-rose-500/5 border-rose-500/20 py-1.5 px-3 font-black uppercase text-[8px] tracking-[0.2em] rounded-xl">
                                                        Absent
                                                    </Badge>
                                                ) : (
                                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                                        {records.map(record => {
                                                            const isRecordActive = !record.clockOut;
                                                            return (
                                                                <div key={record.id} className="flex items-center justify-between gap-4 bg-white/5 rounded-2xl p-2.5 text-xs border border-white/5">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-emerald-400 font-black font-mono">{format(new Date(record.clockIn), 'p')}</span>
                                                                            <span className="text-muted-foreground opacity-30 text-[10px]">→</span>
                                                                            {record.clockOut ? (
                                                                                <span className="text-rose-400 font-black font-mono">{format(new Date(record.clockOut), 'p')}</span>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-[8px] text-primary border-primary/30 bg-primary/10 py-0.5 px-2 font-black animate-pulse rounded-lg">ACTIVE</Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {isRecordActive && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 text-[8px] font-black uppercase tracking-widest rounded-xl px-2.5 hover:bg-rose-500/10 hover:text-rose-500 border border-transparent hover:border-rose-500/10"
                                                                            disabled={!!isSubmittingForceClockout[record.id]}
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                try {
                                                                                    setIsSubmittingForceClockout(prev => ({ ...prev, [record.id]: true }));
                                                                                    await attendanceService.forceClockOut(firestore!, record.id, userProfile);
                                                                                    toast({
                                                                                        title: "Forced Clock Out Success",
                                                                                        description: `Successfully clocked out ${user.fullName}.`,
                                                                                    });
                                                                                } catch (err: any) {
                                                                                    toast({
                                                                                        variant: "destructive",
                                                                                        title: "Force Clock Out Failed",
                                                                                        description: err.message,
                                                                                    });
                                                                                } finally {
                                                                                    setIsSubmittingForceClockout(prev => ({ ...prev, [record.id]: false }));
                                                                                }
                                                                            }}
                                                                        >
                                                                            {isSubmittingForceClockout[record.id] ? "..." : "Force Close"}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

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

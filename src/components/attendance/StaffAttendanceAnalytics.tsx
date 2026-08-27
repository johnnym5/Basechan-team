'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, isSameDay, parseISO, differenceInSeconds } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, CalendarDays, AlertTriangle, Timer, ArrowRight, Settings2, Loader2, Palmtree } from 'lucide-react';
import type { Attendance, AttendanceSession, UserProfile, LeaveRequest } from '@/lib/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { leaveService } from "@/services/leave-service";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDoc } from '@/firebase';
import { doc as firestoreDoc } from 'firebase/firestore';
import { calculateDailyStatus } from '@/lib/attendance-utils';
import { cn } from "@/lib/utils"

interface StaffAttendanceAnalyticsProps {
    staffId: string;
}

export function StaffAttendanceAnalytics({ staffId }: StaffAttendanceAnalyticsProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user: authUser } = useUser();

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    // Balance Adjustment State
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjustmentType, setAdjustmentType] = useState<'ANNUAL' | 'SICK'>('ANNUAL');
    const [adjustmentAmount, setAdjustmentAmount] = useState('1');
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch current user profile to check admin rights
    const userProfileRef = useMemoFirebase(() =>
        firestore && authUser ? firestoreDoc(firestore, "users", authUser.uid) : null
    , [firestore, authUser]);
    const { data: currentUser } = useDoc<UserProfile>(userProfileRef);

    // Fetch Target Staff Profile for balance info
    const targetStaffRef = useMemoFirebase(() =>
        firestore && staffId ? firestoreDoc(firestore, "users", staffId) : null
    , [firestore, staffId]);
    const { data: targetStaff } = useDoc<UserProfile>(targetStaffRef);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !staffId) return null;
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

        return query(
            collection(firestore, 'attendance'),
            where('userId', '==', staffId),
            where('date', '>=', start),
            where('date', '<=', end),
            orderBy('date', 'desc')
        );
    }, [firestore, staffId, currentMonth]);

    const { data: attendanceRecords } = useCollection<Attendance>(attendanceQuery);

    const leaveQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'leave_requests'), where('userId', '==', staffId), where('status', '==', 'APPROVED')) : null
    , [firestore, staffId]);
    const { data: userLeaves } = useCollection<LeaveRequest>(leaveQuery);

    const metrics = useMemo(() => {
        if (!attendanceRecords || attendanceRecords.length === 0) {
            return {
                daysWorked: 0,
                avgHours: 0,
                avgClockIn: '00:00',
            };
        }

        const daysWorked = attendanceRecords.length;
        const totalSeconds = attendanceRecords.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const avgHours = daysWorked > 0 ? (totalSeconds / 3600) / daysWorked : 0;

        let totalClockInSeconds = 0;
        attendanceRecords.forEach(record => {
            const clockInDate = new Date(record.clockIn);
            const secondsFromMidnight = clockInDate.getHours() * 3600 + clockInDate.getMinutes() * 60 + clockInDate.getSeconds();
            totalClockInSeconds += secondsFromMidnight;
        });

        const avgClockInSeconds = totalClockInSeconds / daysWorked;
        const avgH = Math.floor(avgClockInSeconds / 3600);
        const avgM = Math.floor((avgClockInSeconds % 3600) / 60);
        const avgClockIn = `${avgH.toString().padStart(2, '0')}:${avgM.toString().padStart(2, '0')}`;

        return {
            daysWorked,
            avgHours: parseFloat(avgHours.toFixed(1)),
            avgClockIn,
        };
    }, [attendanceRecords]);

    const selectedDayRecord = useMemo(() => {
        if (!attendanceRecords || !selectedDate) return null;
        return attendanceRecords.find(r => isSameDay(parseISO(r.date + 'T00:00:00'), selectedDate));
    }, [attendanceRecords, selectedDate]);

    const calculateDailyTotalHours = (sessions: AttendanceSession[] | undefined, fallbackClockIn?: string, fallbackClockOut?: string) => {
        if (!sessions || sessions.length === 0) {
            if (fallbackClockIn && fallbackClockOut) {
                return {
                    hours: parseFloat((differenceInSeconds(new Date(fallbackClockOut), new Date(fallbackClockIn)) / 3600).toFixed(2)),
                    hasIncomplete: false
                };
            } else if (fallbackClockIn) {
                return { hours: 0, hasIncomplete: true };
            }
            return { hours: 0, hasIncomplete: false };
        }

        let totalSeconds = 0;
        let hasIncomplete = false;

        sessions.forEach(session => {
            if (session.clockIn && session.clockOut) {
                totalSeconds += differenceInSeconds(new Date(session.clockOut), new Date(session.clockIn));
            } else if (session.clockIn && !session.clockOut) {
                hasIncomplete = true;
            }
        });

        return {
            hours: parseFloat((totalSeconds / 3600).toFixed(2)),
            hasIncomplete
        };
    };

    return (
        <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="apple-glass rounded-2xl border-none shadow-sm bg-card/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                            <CalendarDays className="h-3 w-3 text-primary" /> Days Worked
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black font-headline tracking-tighter text-foreground">{metrics.daysWorked}</p>
                    </CardContent>
                </Card>
                <Card className="apple-glass rounded-2xl border-none shadow-sm bg-card/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                            <Timer className="h-3 w-3 text-emerald-500" /> Avg Work Hours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black font-headline tracking-tighter text-foreground">{metrics.avgHours}h</p>
                    </CardContent>
                </Card>
                <Card className="apple-glass rounded-2xl border-none shadow-sm bg-card/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                            <Clock className="h-3 w-3 text-amber-500" /> Avg Clock-in
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black font-headline tracking-tighter text-foreground">{metrics.avgClockIn}</p>
                    </CardContent>
                </Card>
                <Card className="apple-glass rounded-2xl border-none shadow-sm bg-card/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-rose-500" /> Current Month
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black font-headline tracking-tighter text-foreground">{format(currentMonth, 'MMMM')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Leave Balance Overview (Admin Only) */}
            {currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ORG_ADMIN' && targetStaff && (
                <Card className="apple-glass-darker border border-primary/20 bg-primary/5 rounded-[2rem] p-8 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Settings2 className="h-32 w-32 text-primary" />
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="space-y-2">
                            <h3 className="text-xl font-black font-headline tracking-tighter uppercase">Authorized Leave Matrix</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 max-w-md">
                                Current entitlement balance for {targetStaff.fullName}. Manual overrides will be logged in the system audit.
                            </p>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-4xl font-black font-headline text-primary leading-none">{targetStaff.leaveEntitlements?.ANNUAL ?? 0}</p>
                                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mt-2 opacity-50">Annual Days</p>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="text-center">
                                <p className="text-4xl font-black font-headline text-emerald-500 leading-none">{targetStaff.leaveEntitlements?.SICK ?? 0}</p>
                                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mt-2 opacity-50">Sick Days</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAdjusting(true)}
                                className="ml-4 rounded-xl border-primary/40 text-primary hover:bg-primary hover:text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-2xl transition-all active:scale-95"
                            >
                                <Settings2 className="mr-2 h-4 w-4" />
                                Edit Balance
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Bottom Split Layout */}
            <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-6">
                <Card className="apple-glass rounded-[2rem] p-4 border border-border/50 overflow-hidden bg-card/40">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        onMonthChange={setCurrentMonth}
                        className="w-full"
                    />
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black font-headline tracking-tighter uppercase text-foreground">
                            {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a date'}
                        </h3>
                        {selectedDate && (
                            <Badge variant="outline" className={cn(
                                "border-primary/20 font-black text-[10px] uppercase tracking-widest",
                                selectedDayRecord ? "text-primary border-primary/20" :
                                calculateDailyStatus(selectedDate, attendanceRecords || [], userLeaves || []) === 'HOLIDAY' ? "text-slate-400 border-slate-500/20" :
                                calculateDailyStatus(selectedDate, attendanceRecords || [], userLeaves || []) === 'ON_LEAVE' ? "text-blue-400 border-blue-500/20" :
                                "text-muted-foreground"
                            )}>
                                {selectedDayRecord ? selectedDayRecord.status : calculateDailyStatus(selectedDate, attendanceRecords || [], userLeaves || [])}
                            </Badge>
                        )}
                    </div>

                    {!selectedDayRecord ? (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center border border-dashed border-border rounded-[2.5rem] bg-secondary/50 opacity-40">
                            {calculateDailyStatus(selectedDate!, attendanceRecords || [], userLeaves || []) === 'HOLIDAY' ? (
                                <>
                                    <CalendarDays className="h-12 w-12 mb-4 opacity-20 text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Public Holiday Observed</p>
                                </>
                            ) : calculateDailyStatus(selectedDate!, attendanceRecords || [], userLeaves || []) === 'ON_LEAVE' ? (
                                <>
                                    <Palmtree className="h-12 w-12 mb-4 opacity-20 text-blue-400" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Personnel on Approved Leave</p>
                                </>
                            ) : (
                                <>
                                    <Clock className="h-12 w-12 mb-4 opacity-20 text-muted-foreground" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">No attendance logged for this date</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <Accordion collapsible type="single" className="space-y-3">
                            <AccordionItem value="details" className="border-none">
                                <AccordionTrigger className="hover:no-underline rounded-full bg-primary/5 hover:bg-primary/10 border border-border/50 px-6 py-4 group transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                            <CalendarDays className="h-4 w-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 leading-none mb-1 text-muted-foreground">Daily Summary</p>
                                            <p className="text-sm font-black uppercase tracking-tighter leading-none text-foreground">
                                                {calculateDailyTotalHours(selectedDayRecord.sessions, selectedDayRecord.clockIn, selectedDayRecord.clockOut).hours} Total Hours
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-secondary rounded-2xl mt-2 p-6 border border-border/50 space-y-4">
                                    <div className="space-y-4">
                                        {selectedDayRecord.sessions && selectedDayRecord.sessions.length > 0 ? (
                                            selectedDayRecord.sessions.map((session, idx) => (
                                                <div key={idx} className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-foreground">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-muted-foreground">Session {idx + 1}</p>
                                                                <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
                                                                    <span>{format(new Date(session.clockIn), 'hh:mm a')}</span>
                                                                    <ArrowRight className="h-3 w-3 opacity-30" />
                                                                    <span>{session.clockOut ? format(new Date(session.clockOut), 'hh:mm a') : '...'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {session.clockOut ? (
                                                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase">
                                                                {parseFloat((differenceInSeconds(new Date(session.clockOut), new Date(session.clockIn)) / 3600).toFixed(2))}h
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="animate-pulse text-[8px] font-black uppercase">
                                                                ⚠️ Missing Clock-out
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {idx < (selectedDayRecord.sessions!.length - 1) && <Separator className="bg-border" />}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-foreground">
                                                    1
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-muted-foreground">Single Session</p>
                                                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
                                                        <span>{format(new Date(selectedDayRecord.clockIn), 'hh:mm a')}</span>
                                                        <ArrowRight className="h-3 w-3 opacity-30" />
                                                        <span>{selectedDayRecord.clockOut ? format(new Date(selectedDayRecord.clockOut), 'hh:mm a') : '...'}</span>
                                                    </div>
                                                </div>
                                                {!selectedDayRecord.clockOut && (
                                                    <Badge variant="destructive" className="animate-pulse text-[8px] font-black uppercase ml-auto">
                                                        ⚠️ Missing Clock-out
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-border mt-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl bg-muted space-y-1">
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 text-muted-foreground">Daily Duration</p>
                                                    <p className="text-xl font-black font-headline tracking-tighter text-foreground">
                                                        {parseFloat(((selectedDayRecord.duration || 0) / 3600).toFixed(2))}h
                                                    </p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-muted space-y-1">
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 text-muted-foreground">Location</p>
                                                    <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase tracking-widest">
                                                        {selectedDayRecord.location}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>
            </div>

            {/* Adjustment Dialog */}
            <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
                <DialogContent className="apple-glass-darker border-none sm:max-w-md p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Adjust Entitlements</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                            Perform a manual override for {targetStaff?.fullName}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-6">
                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Leave Category</p>
                            <Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
                                <SelectTrigger className="bg-black/20 border-white/5 rounded-xl font-black uppercase text-xs h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="apple-glass-darker border-none rounded-2xl">
                                    <SelectItem value="ANNUAL" className="font-bold text-xs uppercase p-3">Annual Leave</SelectItem>
                                    <SelectItem value="SICK" className="font-bold text-xs uppercase p-3">Sick Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Quantity Adjustment (+/-)</p>
                            <Input
                                type="number"
                                value={adjustmentAmount}
                                onChange={(e) => setAdjustmentAmount(e.target.value)}
                                className="bg-black/20 border-white/5 rounded-xl font-mono h-12 text-lg font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Administrative Reason</p>
                            <Input
                                placeholder="Explain why this change is being made..."
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                className="bg-black/20 border-white/5 rounded-xl h-12 text-sm"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={async () => {
                                if (!firestore || !currentUser || !targetStaff) return;
                                setIsSubmitting(true);
                                try {
                                    await leaveService.adjustLeaveBalance(
                                        firestore,
                                        currentUser,
                                        targetStaff.id,
                                        adjustmentType,
                                        parseInt(adjustmentAmount),
                                        adjustmentReason
                                    );
                                    toast({ title: "Authorized", description: "Balance synchronized successfully." });
                                    setIsAdjusting(false);
                                    setAdjustmentReason('');
                                } catch (e: any) {
                                    toast({ variant: 'destructive', title: "Auth Failed", description: e.message });
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                            disabled={isSubmitting || !adjustmentReason.trim()}
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 m3-interactive"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Authorize Protocol"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { format, differenceInSeconds, isAfter, parse } from 'date-fns';
import {
    Clock,
    Loader2,
    Building,
    Briefcase,
    LogOut,
    Coffee,
    Play,
    MapPin,
    AlertTriangle,
    Hourglass,
    MonitorPlay,
    Lock
} from 'lucide-react';
import type { UserProfile, Attendance, SystemConfig, AttendanceLocation, Permissions } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn, getDistanceInMeters } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { attendanceService } from '@/services/attendance-service';
import { uiEmitter } from '@/lib/ui-emitter';
import { webRTCService } from '@/services/webrtc-service';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "../ui/textarea";
import { ClockOutDebriefModal } from "./ClockOutDebriefModal";
import type { Task } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { useDeviceTrust } from '@/hooks/useDeviceTrust';

interface ClockControlProps {
    userProfile: UserProfile | null;
    permissions: Permissions;
    systemConfig: SystemConfig | null;
    className?: string;
}

const STANDARD_SHIFT_SECONDS = 28800; // 8 hours

export function ClockControl({ userProfile, permissions, systemConfig, className }: ClockControlProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isMobile: isDeviceMobile } = useDeviceTrust();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shiftDuration, setShiftDuration] = useState('00:00:00');
    const [timeRemaining, setTimeRemaining] = useState('00:00:00');
    const [progress, setProgress] = useState(0);
    const [location, setLocation] = useState<AttendanceLocation>('OFFICE');
    const [today, setToday] = useState('');
    const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null);
    const [lateReason, setLateReason] = useState('');
    const [showLateDialog, setShowLateDialog] = useState(false);
    const [isDebriefModalOpen, setIsDebriefModalOpen] = useState(false);

    const isMobileViewport = useMediaQuery("(max-width: 768px)");
    const isAdmin = permissions.canManageStaff;
    const isRestricted = (isMobileViewport || isDeviceMobile) && !isAdmin;

    useEffect(() => { setToday(format(new Date(), 'yyyy-MM-dd')); }, []);

    useEffect(() => {
        const isExempt = permissions.canBypassGeofence;
        const shouldCheckGeofence = systemConfig?.office_coordinates && location === 'OFFICE' && (systemConfig.attendance_strict || !isExempt);

        if (shouldCheckGeofence && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const dist = getDistanceInMeters(pos.coords.latitude, pos.coords.longitude, systemConfig.office_coordinates!.lat, systemConfig.office_coordinates!.lng);
                setDistanceFromOffice(dist);
            }, () => setDistanceFromOffice(null), { timeout: 10000 });
        } else { setDistanceFromOffice(null); }
    }, [location, systemConfig, permissions.canBypassGeofence]);

    const attendanceQuery = useMemoFirebase(() => {
        if (!userProfile?.id || !userProfile?.orgId || !today || !firestore) return null;
        return query(
            collection(firestore, 'attendance'),
            where('orgId', '==', userProfile.orgId),
            where('userId', '==', userProfile.id),
            where('date', '==', today),
            where('status', 'in', ['PENDING', 'APPROVED']),
            orderBy('clockIn', 'desc'),
            limit(1)
        );
    }, [firestore, userProfile?.id, userProfile?.orgId, today]);

    const { data: attendanceData, isLoading } = useCollection<Attendance>(attendanceQuery);
    const attendanceRecord = attendanceData?.[0] || null;

    const tasksQuery = useMemoFirebase(() => {
        if (!userProfile?.id || !userProfile?.orgId || !firestore) return null;
        return query(
            collection(firestore, 'tasks'),
            where('orgId', '==', userProfile.orgId),
            where('assignedTo', '==', userProfile.id),
            where('status', 'in', ['ACTIVE', 'QUEUED'])
        );
    }, [firestore, userProfile?.id, userProfile?.orgId]);

    const { data: activeTasks } = useCollection<Task>(tasksQuery);

    const isClockedIn = !!attendanceRecord && !attendanceRecord.clockOut;
    const isOnBreak = !!attendanceRecord?.onBreak;

    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;

        const updateTime = () => {
            if (!attendanceRecord?.clockIn) return;
            const now = new Date();
            const start = new Date(attendanceRecord.clockIn);

            // Total elapsed time since the start of the shift
            const totalElapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);

            const h = String(Math.floor(totalElapsedSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((totalElapsedSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(Math.floor(totalElapsedSeconds % 60)).padStart(2, '0');

            setShiftDuration(`${h}:${m}:${s}`);
            setProgress(Math.min(100, (totalElapsedSeconds / STANDARD_SHIFT_SECONDS) * 100));

            if (systemConfig?.work_hours?.end) {
                const [endH, endM] = systemConfig.work_hours.end.split(':').map(Number);
                const shiftEndTime = new Date(now);
                shiftEndTime.setHours(endH, endM, 0, 0);

                if (isAfter(shiftEndTime, now)) {
                    const diffSec = differenceInSeconds(shiftEndTime, now);
                    const rh = String(Math.floor(diffSec / 3600)).padStart(2, '0');
                    const rm = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
                    const rs = String(Math.floor(diffSec % 60)).padStart(2, '0');
                    setTimeRemaining(`${rh}:${rm}:${rs}`);
                } else {
                    setTimeRemaining('00:00:00');
                }
            }
        };

        if (isClockedIn && attendanceRecord?.clockIn) {
            updateTime();
            timer = setInterval(updateTime, 1000);
        } else if (!isClockedIn) {
            setShiftDuration('00:00:00');
            setTimeRemaining('00:00:00');
            setProgress(0);
        }

        return () => clearInterval(timer);
    }, [isClockedIn, attendanceRecord, systemConfig]);

    const handleClockIn = async (reason?: string) => {
        if (!userProfile || !firestore) return;

        const now = new Date();
        const threshold = parse('09:15', 'HH:mm', now);

        if (isAfter(now, threshold) && !reason) {
            setShowLateDialog(true);
            return;
        }

        const isExempt = permissions.canBypassGeofence;
        const isOutOfRange = location === 'OFFICE' && systemConfig?.office_coordinates && distanceFromOffice !== null && distanceFromOffice > 200;

        if (!isExempt && isOutOfRange) {
            toast({
                variant: "destructive",
                title: "Out of Range",
                description: `Please ensure you are at the office before clocking in. You are currently ${Math.round(distanceFromOffice!)}m away.`
            });
            return;
        }

        const isPC = !/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(navigator.userAgent);

        let stream: MediaStream | null = null;
        let screenShareActive = false;
        let mediaErrorCaught: any = null;

        // STEP 1: IMMEDIATELY REQUEST SCREEN SHARE TO PRESERVE USER GESTURE CONTEXT
        const requireScreenShare = false;

        if (requireScreenShare && isPC && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            try {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });
                screenShareActive = true;
            } catch (e: any) {
                mediaErrorCaught = e;
            }
        }

        setIsSubmitting(true);

        try {
            if (requireScreenShare && isPC) {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                    toast({ variant: "destructive", title: "Unsupported Environment", description: "Screen sharing API unavailable." });
                } else if (screenShareActive && stream) {
                    toast({ title: "Authorization Granted", description: "Screen share active." });
                    try {
                        await webRTCService.startScreenShare(firestore, userProfile.id, userProfile.orgId, stream);
                        uiEmitter.emit('set-active-stream', { stream });
                    } catch (webrtcError) {
                        console.error("WebRTC Signaling Error:", webrtcError);
                    }
                } else if (mediaErrorCaught) {
                    if (mediaErrorCaught.name === 'NotAllowedError') {
                        toast({ variant: "destructive", title: "Authorization Denied", description: "Screen share denied." });
                    } else {
                        console.error("Screen share error:", mediaErrorCaught);
                        toast({ variant: "destructive", title: "Capture Failed", description: "Could not initialize screen share." });
                    }
                }
            }

            await attendanceService.clockIn(firestore, userProfile, location, today, systemConfig, reason);
            toast({ title: 'Shift Started', description: screenShareActive ? "Workstation linked." : "Clock-in successful." });
            setShowLateDialog(false);
            setLateReason('');
        } catch (error: any) {
            console.error("Clock In Error:", error);
            toast({ variant: "destructive", title: "Clock-In Failed", description: error.message || "An unknown error occurred during clock-in." });
            errorEmitter.emit('firestore-error', error);
        }
        finally { setIsSubmitting(false); }
    };

    const handleToggleBreak = async () => {
        if (!attendanceRecord || !firestore) return;
        setIsSubmitting(true);
        try {
            await attendanceService.toggleBreak(firestore, attendanceRecord);
        } catch (e: any) { errorEmitter.emit('firestore-error', e); }
        finally { setIsSubmitting(false); }
    }

    const handleClockOut = async () => {
        setIsDebriefModalOpen(true);
    };

    const handleConfirmClockOut = async (debriefData: { manualReport: string; attachedTaskId?: string }) => {
        if (!userProfile || !attendanceRecord || !firestore) return;
        setIsSubmitting(true);
        try {
            await attendanceService.clockOut(firestore, userProfile, attendanceRecord, systemConfig, debriefData);
            webRTCService.stopScreenShare();
            toast({ title: 'Shift Ended', description: "Oversight link severed. Debrief submitted." });
            setIsDebriefModalOpen(false);
        } catch (e: any) { errorEmitter.emit('firestore-error', e); }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) return <div className="border border-border/60 bg-muted/30 rounded-xl h-64 flex items-center justify-center shadow-sm"><Loader2 className="animate-spin" /></div>;

    return (
        <>
        <Card className={cn("bg-card border border-border shadow-sm rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden h-full p-8", className)}>
            <CardContent className="p-0 w-full flex flex-col items-center justify-center">
                {isOnBreak && <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500 animate-pulse" />}
                <div className="mb-6 flex items-center gap-2 text-muted-foreground uppercase tracking-[0.3em] text-[10px] font-black opacity-60">
                    <Clock className="w-4 h-4" />
                    {isClockedIn ? (isOnBreak ? 'Resting Phase' : 'Active Duty') : 'Ready for Duty'}
                </div>

                <div className="flex flex-col items-center gap-2 mb-6">
                    <h3 className={cn("text-5xl md:text-6xl font-black font-mono tracking-tighter transition-all", isOnBreak && "text-amber-500 opacity-50")}>
                        {isClockedIn ? (isOnBreak ? 'BREAK' : shiftDuration) : '00:00:00'}
                    </h3>
                    {isClockedIn && !isOnBreak && (
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-white/5 animate-in fade-in">
                            <Hourglass className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] md:text-xs font-black font-mono text-amber-500">{timeRemaining} REMAINING</span>
                        </div>
                    )}
                </div>

                {isClockedIn && (
                    <div className="w-full max-w-xs mb-8 space-y-2">
                        <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                            <span>Daily Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" indicatorClassName={cn(progress >= 100 ? "bg-emerald-500" : "bg-primary")} />
                    </div>
                )}

                <div className={cn("w-full space-y-4 mb-4", !isClockedIn && "mt-2")}>
                    {isRestricted ? (
                        <div className="mt-4 p-4 bg-secondary/20 border border-border/50 rounded-2xl flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in-95">
                            <Lock className="w-6 h-6 text-muted-foreground opacity-50" />
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center leading-tight">
                                Clock-in restricted to<br/>Secure PC Terminals
                            </p>
                        </div>
                    ) : isClockedIn ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            <Button
                                variant={isOnBreak ? 'default' : 'outline'}
                                className={cn("h-16 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all", isOnBreak ? "bg-amber-600 hover:bg-amber-700" : "border-amber-500/30 text-amber-500 hover:bg-amber-500/10")}
                                onClick={handleToggleBreak}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : (isOnBreak ? <><Play className="mr-2 h-5 w-5" /> Resume</> : <><Coffee className="mr-2 h-5 w-5" /> Take Break</>)}
                            </Button>
                            <Button className="h-16 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/20 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all" onClick={handleClockOut} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><LogOut className="mr-2 h-5 w-5" /> End Shift</>}
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full space-y-3">
                            <Button
                                className="w-full h-20 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[2rem] text-xl font-black uppercase tracking-[0.1em] shadow-2xl shadow-primary/30 m3-interactive"
                                onClick={() => handleClockIn()}
                                disabled={isSubmitting || !permissions?.canClockIn}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <><MonitorPlay className="mr-2 h-6 w-6" /> Start Working</>}
                            </Button>
                            {!permissions?.canClockIn && (
                                <p className="text-center text-[10px] text-rose-500 font-bold uppercase tracking-wider bg-rose-500/10 p-2 rounded-xl border border-amber-500/20">
                                    Attendance clock-in is restricted by administrator.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center space-x-8 pt-6 border-t border-white/5 w-full">
                    <div onClick={() => !isClockedIn && !isRestricted && setLocation('OFFICE')} className={cn("flex items-center gap-2 cursor-pointer transition-all", location === 'OFFICE' ? "text-primary" : "text-muted-foreground opacity-50")}>
                        <Building className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest">Office</span>
                    </div>
                    <div className="h-5 w-px bg-white/10" />
                    <div onClick={() => !isClockedIn && !isRestricted && setLocation('REMOTE')} className={cn("flex items-center gap-2 cursor-pointer transition-all", location === 'REMOTE' ? "text-primary" : "text-muted-foreground opacity-50")}>
                        <Briefcase className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest">Remote</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Dialog open={showLateDialog} onOpenChange={setShowLateDialog}>
            <DialogContent className="apple-glass border-none sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Late Authorization Required</DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                        Operational window (09:15) has expired. Please provide a brief explanation for late entry.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="State your reason for late arrival..."
                        className="bg-black/20 border-white/5 rounded-2xl min-h-[100px] text-sm focus-visible:ring-primary/20"
                        value={lateReason}
                        onChange={(e) => setLateReason(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => handleClockIn(lateReason || "No reason provided.")}
                        disabled={isSubmitting || !lateReason.trim()}
                        className="w-full h-12 rounded-xl font-black uppercase tracking-widest"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit & Start Shift"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <ClockOutDebriefModal
            isOpen={isDebriefModalOpen}
            onOpenChange={setIsDebriefModalOpen}
            activeTasks={activeTasks || []}
            onConfirmClockOut={handleConfirmClockOut}
            isSubmitting={isSubmitting}
        />
        </>
    );
}

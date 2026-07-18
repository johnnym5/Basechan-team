'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { Attendance, UserProfile, Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInSeconds } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Timer, Activity, Coffee, LogOut, Loader2, Monitor, Smartphone, MonitorPlay, Camera, History, BarChart2, MessageSquare, Siren, ClipboardList, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../shared/ContextMenu';
import { uiEmitter } from '@/lib/ui-emitter';
import { formatDuration } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { AttendanceHistory } from '@/components/attendance/AttendanceHistory';
import { RequestAssistanceDialog } from '../tasks/RequestAssistanceDialog';
import { ShareTaskDialog } from '../tasks/ShareTaskDialog';

interface LiveStaffMonitorProps {
    userProfile: UserProfile;
}

export function LiveStaffMonitor({ userProfile }: LiveStaffMonitorProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [now, setNow] = useState(new Date());
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const { isOpen, anchorPoint, handleContextMenu, handleTouchStart, handleTouchEnd, closeMenu } = useContextMenu();
    const [contextUser, setContextUser] = useState<UserProfile | null>(null);

    const [popoverState, setPopoverState] = useState<{ top: number, left: number, record: any } | null>(null);
    const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);
    const [assistanceUser, setAssistanceUser] = useState<UserProfile | null>(null);
    const [shareTargetUser, setShareTargetUser] = useState<UserProfile | null>(null);
    const [selectedTaskToShare, setSelectedTaskToShare] = useState<Task | null>(null);

    const adminTasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile.id) return null;
        return query(
            collection(firestore, 'tasks'),
            where('assignedTo', '==', userProfile.id)
        );
    }, [firestore, userProfile.id]);

    const { data: adminTasks, isLoading: isAdminTasksLoading } = useCollection<Task>(adminTasksQuery);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    // Stabilized Attendance Query
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile.orgId) return null;
        return query(
            collection(firestore, 'attendance'),
            where('orgId', '==', userProfile.orgId),
            where('date', '==', today),
            orderBy('clockIn', 'desc')
        );
    }, [firestore, userProfile.orgId, today]);

    // Stabilized Users Query
    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile.orgId) return null;
        return query(
            collection(firestore, 'users'),
            where('orgId', '==', userProfile.orgId)
        );
    }, [firestore, userProfile.orgId]);

    const { data: records, isLoading: isAttLoading } = useCollection<Attendance>(attendanceQuery);
    const { data: orgUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

    const handleRowClick = (e: React.MouseEvent, record: any) => {
        // Do not open if the click is on an interactive element like a button
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        // Prevent opening on right-click, which is for the context menu
        if (e.button === 2 || e.ctrlKey) {
            return;
        }
        if (e.type === 'contextmenu') return;

        e.preventDefault();
        setPopoverState({
            top: e.clientY,
            left: e.clientX,
            record: record
        });
    };

    const handleAction = async (user: UserProfile, type: 'SCREENSHOT' | 'SCREEN_SHARE') => {
        if (!firestore) return;
        if (user.deviceType !== 'PC') {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Screen operations are only available for Desktop users.' });
            return;
        }

        setIsProcessing(user.id);
        try {
            if (type === 'SCREENSHOT') {
                const userRef = doc(firestore, 'users', user.id);
                await updateDoc(userRef, { pendingCommand: type });
                toast({ title: 'Screenshot Requested', description: `Command dispatched to ${user.fullName.split(' ')[0]}.` });
            } else {
                uiEmitter.emit('open-live-monitor-dialog', { targetUserId: user.id, targetUserName: user.fullName });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Command Failed', description: e.message });
        } finally {
            setTimeout(() => setIsProcessing(null), 1000);
        }
    };

    const menuItems = useMemo((): ContextMenuItem[] => {
        if (!contextUser) return [];
        return [
            {
                label: 'View Live Screen',
                icon: <MonitorPlay className="h-4 w-4 text-emerald-500" />,
                action: () => handleAction(contextUser, 'SCREEN_SHARE'),
                className: contextUser.deviceType !== 'PC' || contextUser.status !== 'ONLINE' ? 'opacity-30 pointer-events-none' : ''
            },
            {
                label: 'Capture Screenshot',
                icon: <Camera className="h-4 w-4 text-primary" />,
                action: () => handleAction(contextUser, 'SCREENSHOT'),
                className: contextUser.deviceType !== 'PC' || contextUser.status !== 'ONLINE' ? 'opacity-30 pointer-events-none' : ''
            },
        ];
    }, [contextUser]);

    const monitoringData = useMemo(() => {
        if (!records) return [];

        const userGroups = new Map<string, Attendance[]>();
        records.forEach(r => {
            if (!r.userId) return;
            const list = userGroups.get(r.userId) || [];
            list.push(r);
            userGroups.set(r.userId, list);
        });

        return Array.from(userGroups.values()).map(group => {
            const activeRecord = group.find(r => !r.clockOut);
            const mainRecord = activeRecord || group[0];
            const profile = orgUsers?.find(u => u.id === mainRecord.userId);

            let totalWorkTime = 0;
            let totalIdleTime = 0;
            let totalSessionTime = 0;

            group.forEach(record => {
                const start = new Date(record.clockIn);
                const end = record.clockOut ? new Date(record.clockOut) : now;

                let currentBreakElapsed = 0;
                if (record.onBreak && record.breaks?.length) {
                    const lastBreak = record.breaks[record.breaks.length - 1];
                    if (!lastBreak.end) {
                        currentBreakElapsed = Math.max(0, differenceInSeconds(now, new Date(lastBreak.start)));
                    }
                }

                const totalElapsed = differenceInSeconds(end, start);
                const totalBreak = (record.totalBreak || 0) + currentBreakElapsed;

                totalWorkTime += Math.max(0, totalElapsed - totalBreak - (record.idleTime || 0));
                totalIdleTime += (record.idleTime || 0);
                totalSessionTime += Math.max(0, totalElapsed - totalBreak);
            });

            return {
                ...mainRecord,
                workTime: totalWorkTime,
                idleTime: totalIdleTime,
                totalShiftTime: totalSessionTime,
                productivityRatio: totalSessionTime > 0 ? (totalWorkTime / totalSessionTime) * 100 : 0,
                profile
            };
        }).sort((a, b) => (b.clockOut ? 0 : 1) - (a.clockOut ? 0 : 1));
    }, [records, now, orgUsers]);

    if (isAttLoading || isUsersLoading) return <Skeleton className="h-96 w-full rounded-[2rem]" />;

    return (
        <>
            <Card className="apple-glass border-none shadow-xl overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Activity className="h-5 w-5 text-emerald-500" />
                                Live Personnel Monitor
                            </CardTitle>
                            <CardDescription>Performance metrics and oversight control for the current shift.</CardDescription>
                        </div>
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Timer className="h-5 w-5 text-primary animate-pulse" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-secondary/10">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <ScrollArea className="h-[500px]">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-secondary/10 sticky top-0 z-10">
                                                    <TableRow className="border-white/5 hover:bg-transparent">
                                                        <TableHead className="text-[9px] font-black uppercase tracking-widest pl-6 h-10">Personnel</TableHead>
                                                        <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Status / Node</TableHead>
                                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-right h-10">Work Time</TableHead>
                                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-right h-10">Idle Time</TableHead>
                                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-right h-10">Total Active</TableHead>
                                                        <TableHead className="text-[9px] font-black uppercase tracking-widest pr-6 h-10 text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {monitoringData.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="h-48 text-center text-muted-foreground uppercase font-black text-[9px] tracking-widest opacity-30">
                                                                No personnel detected in current cycle
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        monitoringData.map((record) => (
                                                            <TableRow
                                                                key={record.id}
                                                                className="border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                                                                onClick={(e) => handleRowClick(e, record)}
                                                                onContextMenu={(e) => {
                                                                    if (record.profile) {
                                                                        setContextUser(record.profile);
                                                                        handleContextMenu(e);
                                                                    }
                                                                }}
                                                                onTouchStart={(e) => {
                                                                    if (record.profile) {
                                                                        setContextUser(record.profile);
                                                                        handleTouchStart(e);
                                                                    }
                                                                }}
                                                                onTouchEnd={handleTouchEnd}
                                                            >
                                                                <TableCell className="pl-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                                                                            {record.userName.charAt(0)}
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {monitoringData.length === 0 ? (
                                                                                <TableRow>
                                                                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground uppercase font-black text-[9px] tracking-widest opacity-30">
                                                                                        No personnel detected in current cycle
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ) : (
                                                                                monitoringData.map((record) => (
                                            <TableRow
                                                key={record.id}
                                                className="border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                                                onClick={(e) => handleRowClick(e, record)}
                                                onContextMenu={(e) => {
                                                    if (record.profile) {
                                                        setContextUser(record.profile);
                                                        handleContextMenu(e);
                                                    }
                                                }}
                                                onTouchStart={(e) => {
                                                    if (record.profile) {
                                                        setContextUser(record.profile);
                                                        handleTouchStart(e);
                                                    }
                                                }}
                                                onTouchEnd={handleTouchEnd}
                                            >
                                                <TableCell className="pl-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                                                            {record.userName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm leading-none">{record.userName}</p>
                                                            <p className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground mt-1">First In: {format(new Date(record.clockIn), 'p')}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm leading-none">{record.userName}</p>
                                                        <p className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground mt-1">First In: {format(new Date(record.clockIn), 'p')}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {record.clockOut ? (
                                                            <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-muted/20 text-muted-foreground border-white/5">
                                                                <LogOut className="h-2.5 w-2.5" /> Signed Out
                                                            </Badge>
                                                        ) : record.onBreak ? (
                                                            <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse">
                                                                <Coffee className="h-2.5 w-2.5" /> On Break
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Active
                                                            </Badge>
                                                        )}
                                                        {record.profile?.deviceType === 'PC' ? <Monitor className="h-3 w-3 text-primary opacity-50" /> : <Smartphone className="h-3 w-3 text-amber-500 opacity-50" />}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {record.clockOut ? (
                                                        <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-muted/20 text-muted-foreground border-white/5">
                                                            <LogOut className="h-2.5 w-2.5" /> Signed Out
                                                        </Badge>
                                                    ) : record.onBreak ? (
                                                        <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse">
                                                            <Coffee className="h-2.5 w-2.5" /> On Break
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Active
                                                        </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-primary text-xs">
                                                    {formatDuration(record.workTime)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground text-xs">
                                                    {formatDuration(record.idleTime)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-black text-foreground text-xs">
                                                    {formatDuration(record.totalShiftTime)}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    {!record.clockOut && record.profile?.deviceType === 'PC' && record.status === 'APPROVED' && (
                                                        <div className="flex justify-end gap-1.5">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500"
                                                                            onClick={() => handleAction(record.profile!, 'SCREEN_SHARE')}
                                                                            disabled={isProcessing === record.userId}
                                                                        >
                                                                            {isProcessing === record.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <MonitorPlay className="h-3.5 w-3.5" />}
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="apple-glass-darker border-none text-[8px] font-black uppercase">Monitor Feed</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                                                            onClick={() => handleAction(record.profile!, 'SCREENSHOT')}
                                                                            disabled={isProcessing === record.userId}
                                                                        >
                                                                            {isProcessing === record.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="apple-glass-darker border-none text-[8px] font-black uppercase">Capture Frame</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    )}
                                                    {record.profile?.deviceType === 'PC' ? <Monitor className="h-3 w-3 text-primary opacity-50" /> : <Smartphone className="h-3 w-3 text-amber-500 opacity-50" />}
                                                </div>
                                            </TableCell>
                                                                        <TableCell className="text-right font-mono font-bold text-primary text-xs">
                                                                            {formatDuration(record.workTime)}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-mono text-muted-foreground text-xs">
                                                                            {formatDuration(record.idleTime)}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-mono font-black text-foreground text-xs">
                                                                            {formatDuration(record.totalShiftTime)}
                                                                        </TableCell>
                                                                        <TableCell className="pr-6 text-right">
                                                                            {!record.clockOut && record.profile?.deviceType === 'PC' && record.status === 'APPROVED' && (
                                                                                <div className="flex justify-end gap-1.5">
                                                                                    <TooltipProvider>
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger asChild>
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500"
                                                                                                    onClick={() => handleAction(record.profile!, 'SCREEN_SHARE')}
                                                                                                    disabled={isProcessing === record.userId}
                                                                                                >
                                                                                                    {isProcessing === record.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <MonitorPlay className="h-3.5 w-3.5" />}
                                                                                                </Button>
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent className="apple-glass-darker border-none text-[8px] font-black uppercase">Monitor Feed</TooltipContent>
                                                                                        </Tooltip>
                                                                                    </TooltipProvider>
                                                                                    <TooltipProvider>
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger asChild>
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                                                                                    onClick={() => handleAction(record.profile!, 'SCREENSHOT')}
                                                                                                    disabled={isProcessing === record.userId}
                                                                                                >
                                                                                                    {isProcessing === record.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                                                                </Button>
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent className="apple-glass-darker border-none text-[8px] font-black uppercase">Capture Frame</TooltipContent>
                                                                                        </Tooltip>
                                                                                    </TooltipProvider>
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                    ))
                                )}
                                                                </TableBody>
                                                            </Table>
                    </div>
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    )}
                                    </TableBody>
                                </Table>
                            </div>
                        </ScrollArea>
                </CardContent>
            </Card>
            <ContextMenu isOpen={isOpen} anchorPoint={anchorPoint} items={menuItems} onClose={closeMenu} />

            {popoverState && (
                <Popover open={true} onOpenChange={() => setPopoverState(null)}>
                    <PopoverTrigger asChild>
                        <div style={{ position: 'fixed', top: popoverState.top, left: popoverState.left, width: 0, height: 0 }} />
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-72 apple-glass-darker border-white/10 bg-background/95 p-1 backdrop-blur-md rounded-xl shadow-2xl"
                        onCloseAutoFocus={(e) => e.preventDefault()}
                        align="start"
                        sideOffset={5}
                    >
                        {(() => {
                            const record = popoverState.record;
                            const user = record.profile as UserProfile | undefined;

                            if (!user) return null;

                            const MenuItem = ({ icon, label, onClick, disabled = false, className }: { icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean, className?: string }) => (
                                <button
                                    className={cn(
                                        "w-full flex items-center text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 text-muted-foreground hover:text-white transition-all duration-150 gap-2.5",
                                        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
                                        className
                                    )}
                                    onClick={onClick}
                                    disabled={disabled}
                                >
                                    {icon}
                                    <span>{label}</span>
                                </button>
                            );

                            return (
                                <div className="space-y-1">
                                    <div className="px-3 py-2.5 bg-white/5 rounded-t-lg border-b border-white/5 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="font-bold text-xs text-white truncate">{user.fullName}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground mt-1.5 font-mono">
                                            <div className="p-1 rounded bg-white/5 text-center">
                                                <span className="block text-emerald-400 text-[10px] font-black leading-none mb-1">{formatDuration(record.workTime)}</span>
                                                Work
                                            </div>
                                            <div className="p-1 rounded bg-white/5 text-center">
                                                <span className="block text-amber-400 text-[10px] font-black leading-none mb-1">{formatDuration(record.idleTime)}</span>
                                                Idle
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-1 space-y-0.5">
                                        <MenuItem
                                            icon={<History className="h-3.5 w-3.5 text-blue-400" />}
                                            label="View Attendance History"
                                            onClick={() => { setHistoryUser(user); setPopoverState(null); }}
                                        />
                                        <MenuItem
                                            icon={<BarChart2 className="h-3.5 w-3.5 text-indigo-400" />}
                                            label="View Performance Report"
                                            onClick={() => { uiEmitter.emit('open-reports-dialog', { userId: user.id }); setPopoverState(null); }}
                                        />
                                        <MenuItem
                                            icon={<MessageSquare className="h-3.5 w-3.5 text-emerald-400" />}
                                            label="Send Direct Message"
                                            onClick={() => { uiEmitter.emit('open-chat-dialog', { initialUserId: user.id }); setPopoverState(null); }}
                                        />
                                        <div className="h-px bg-white/5 my-1 mx-1" />
                                        <MenuItem
                                            icon={<ClipboardList className="h-3.5 w-3.5 text-purple-400" />}
                                            label="Push / Assign Task"
                                            onClick={() => { uiEmitter.emit('open-assign-task-dialog', { userId: user.id }); setPopoverState(null); }}
                                        />
                                        <MenuItem
                                            icon={<Share2 className="h-3.5 w-3.5 text-cyan-400" />}
                                            label="Share Task Node"
                                            onClick={() => {
                                                setShareTargetUser(user);
                                                setPopoverState(null);
                                            }}
                                        />
                                        <div className="h-px bg-white/5 my-1 mx-1" />
                                        <MenuItem
                                            icon={<Siren className="h-3.5 w-3.5 text-rose-500" />}
                                            label="Request Assistance"
                                            onClick={() => { setAssistanceUser(user); setPopoverState(null); }}
                                            className="hover:bg-rose-500/10 hover:text-rose-400"
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                    </PopoverContent>
                </Popover>
            )}

            {historyUser && (
                <Dialog open={!!historyUser} onOpenChange={() => setHistoryUser(null)}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Attendance History for {historyUser.fullName}</DialogTitle>
                            <DialogDescription>Reviewing past clock-in/out records.</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[70vh] overflow-y-auto p-1 -mx-1">
                            <AttendanceHistory userProfile={historyUser} />
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {assistanceUser && (
                <RequestAssistanceDialog
                    open={!!assistanceUser}
                    onOpenChange={(open) => !open && setAssistanceUser(null)}
                    targetUser={assistanceUser}
                    currentUserProfile={userProfile}
                />
            )}

            {shareTargetUser && (
                <Dialog open={!!shareTargetUser} onOpenChange={() => setShareTargetUser(null)}>
                    <DialogContent className="max-w-md apple-glass-darker border-white/10 bg-background/95 text-foreground">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <Share2 className="h-5 w-5 text-primary" />
                                Share Task with {shareTargetUser.fullName.split(' ')[0]}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Select one of your active or queued tasks to share with {shareTargetUser.fullName}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {isAdminTasksLoading ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : !adminTasks || adminTasks.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-6">No tasks available to share.</p>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {adminTasks.map((task) => (
                                        <button
                                            key={task.id}
                                            onClick={() => {
                                                setSelectedTaskToShare(task);
                                                setShareTargetUser(null);
                                            }}
                                            className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all flex items-center justify-between group"
                                        >
                                            <div className="space-y-1">
                                                <p className="font-semibold text-sm leading-none text-white group-hover:text-primary transition-colors">{task.title}</p>
                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground truncate max-w-[280px]">{task.description}</p>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-[9px] uppercase font-mono py-0.5 px-1.5 border-white/10 bg-white/5 text-muted-foreground">
                                                {task.status}
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {selectedTaskToShare && (
                <ShareTaskDialog
                    task={selectedTaskToShare}
                    open={!!selectedTaskToShare}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSelectedTaskToShare(null);
                        }
                    }}
                    currentUserProfile={userProfile}
                />
            )}
        </>
    );
}

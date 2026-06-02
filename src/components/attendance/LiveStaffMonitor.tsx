'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { Attendance, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInSeconds } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Timer, Activity, Coffee, LogOut, Loader2, Monitor, Smartphone, MonitorPlay, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../shared/ContextMenu';
import { uiEmitter } from '@/lib/ui-emitter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface LiveStaffMonitorProps {
    userProfile: UserProfile;
}

export function LiveStaffMonitor({ userProfile }: LiveStaffMonitorProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [now, setNow] = useState(new Date());
    const [today, setToday] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const [records, setRecords] = useState<Attendance[]>([]);
    const [orgUsers, setOrgUsers] = useState<UserProfile[]>([]);
    const [isAttLoading, setIsAttLoading] = useState(true);
    const [isUsersLoading, setIsUsersLoading] = useState(true);

    const { isOpen, anchorPoint, handleContextMenu, handleTouchStart, handleTouchEnd, closeMenu } = useContextMenu();
    const [contextUser, setContextUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 1. Attendance Real-time Node with Explicit Cleanup
    useEffect(() => {
        if (!firestore || !today || !userProfile.orgId) return;

        const q = query(
            collection(firestore, 'attendance'),
            where('orgId', '==', userProfile.orgId),
            where('date', '==', today),
            orderBy('clockIn', 'desc')
        );

        setIsAttLoading(true);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance));
            setRecords(data);
            setIsAttLoading(false);
        }, (error) => {
            console.error("Attendance feed error:", error);
            setIsAttLoading(false);
        });

        // Explicitly return the unsubscribe function to prevent ca9 aggregation errors
        return () => unsubscribe();
    }, [firestore, today, userProfile.orgId]);

    // 2. User Directory Real-time Node with Explicit Cleanup
    useEffect(() => {
        if (!firestore || !userProfile.orgId) return;

        const q = query(
            collection(firestore, 'users'), 
            where('orgId', '==', userProfile.orgId)
        );

        setIsUsersLoading(true);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
            setOrgUsers(data);
            setIsUsersLoading(false);
        }, (error) => {
            console.error("Users feed error:", error);
            setIsUsersLoading(false);
        });

        // Explicitly return the unsubscribe function to prevent ca9 aggregation errors
        return () => unsubscribe();
    }, [firestore, userProfile.orgId]);

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
                                        className="border-white/5 hover:bg-white/5 transition-colors group cursor-context-menu"
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
                                                                    {isProcessing === record.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
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
            </CardContent>
        </Card>
        <ContextMenu isOpen={isOpen} anchorPoint={anchorPoint} items={menuItems} onClose={closeMenu} />
        </>
    );
}

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

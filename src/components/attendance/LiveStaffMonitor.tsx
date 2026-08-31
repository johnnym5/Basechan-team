'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { Attendance, UserProfile, Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi
} from '@/components/ui/carousel';
import { format, differenceInSeconds } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Timer, Activity, Coffee, LogOut, Loader2, Monitor, Smartphone, MonitorPlay, Camera, History, BarChart2, MessageSquare, Siren, ClipboardList, Share2, ArrowLeft, ArrowRight, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../shared/ContextMenu';
import { uiEmitter } from '@/lib/ui-emitter';
import { formatDuration } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AttendanceHistory } from '@/components/attendance/AttendanceHistory';
import { EditAttendanceRecordDialog } from './EditAttendanceRecordDialog';
import { RequestAssistanceDialog } from '../tasks/RequestAssistanceDialog';
import { ShareTaskDialog } from '../tasks/ShareTaskDialog';
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";
import { usePermissions } from '@/hooks/usePermissions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LiveStaffMonitorProps {
    userProfile: UserProfile;
    variant?: 'carousel' | 'table';
    selectedDate?: Date;
}

export function LiveStaffMonitor({ userProfile, variant = 'carousel', selectedDate }: LiveStaffMonitorProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const permissions = usePermissions(userProfile);
    const [now, setNow] = useState(new Date());
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [api, setApi] = useState<CarouselApi>();
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const { isOpen, anchorPoint, handleContextMenu, handleTouchStart, handleTouchEnd, closeMenu } = useContextMenu();
    const [contextUser, setContextUser] = useState<UserProfile | null>(null);

    const [popoverState, setPopoverState] = useState<{ top: number, left: number, record: any } | null>(null);
    const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);
    const [assistanceUser, setAssistanceUser] = useState<UserProfile | null>(null);
    const [shareTargetUser, setShareTargetUser] = useState<UserProfile | null>(null);
    const [selectedTaskToShare, setSelectedTaskToShare] = useState<Task | null>(null);

    const [isOverrideOpen, setIsOverrideOpen] = useState(false);
    const [logToEdit, setLogToEdit] = useState<Attendance | null>(null);

    useEffect(() => {
        if (!api) return;
        const onSelect = () => {
            setCanScrollPrev(api.canScrollPrev());
            setCanScrollNext(api.canScrollNext());
        };
        onSelect();
        api.on("select", onSelect);
        api.on("reInit", onSelect);
        return () => { api.off("select", onSelect); };
    }, [api]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const targetDateStr = useMemo(() =>
        format(selectedDate || new Date(), 'yyyy-MM-dd'),
    [selectedDate]);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile.orgId) return null;
        return query(
            collection(firestore, 'attendance'),
            where('orgId', '==', userProfile.orgId),
            where('date', '==', targetDateStr),
            orderBy('clockIn', 'desc')
        );
    }, [firestore, userProfile.orgId, targetDateStr]);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile.orgId) return null;
        return query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId));
    }, [firestore, userProfile.orgId]);

    const { data: records, isLoading: isAttLoading } = useCollection<Attendance>(attendanceQuery);
    const { data: orgUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

    const adminTasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile.id || !userProfile.orgId) return null;
        return query(collection(firestore, 'tasks'), where('orgId', '==', userProfile.orgId), where('assignedTo', '==', userProfile.id));
    }, [firestore, userProfile.id, userProfile.orgId]);
    const { data: adminTasks, isLoading: isAdminTasksLoading } = useCollection<Task>(adminTasksQuery);

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
                    if (!lastBreak.end) currentBreakElapsed = Math.max(0, differenceInSeconds(now, new Date(lastBreak.start)));
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
                profile
            };
        }).sort((a, b) => (b.clockOut ? 0 : 1) - (a.clockOut ? 0 : 1));
    }, [records, now, orgUsers]);

    const handleAction = async (user: UserProfile, type: 'SCREENSHOT' | 'SCREEN_SHARE') => {
        if (!firestore) return;
        if (user.deviceType !== 'PC') {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Screen operations are only available for Desktop users.' });
            return;
        }
        setIsProcessing(user.id);
        try {
            if (type === 'SCREENSHOT') {
                await updateDoc(doc(firestore, 'users', user.id), { pendingCommand: type });
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

    const handleRowClick = (e: React.MouseEvent, record: any) => {
        if ((e.target as HTMLElement).closest('button')) return;
        if (e.button === 2 || e.ctrlKey) return;
        setPopoverState({ top: e.clientY, left: e.clientX, record: record });
    };

    const menuItems = useMemo((): ContextMenuItem[] => {
        if (!contextUser) return [];
        const isOnline = contextUser.status === 'ONLINE' || contextUser.status === 'ACTIVE';
        return [
            {
                label: 'View Live Screen',
                icon: <MonitorPlay className="h-4 w-4 text-emerald-500" />,
                action: () => handleAction(contextUser, 'SCREEN_SHARE'),
                className: contextUser.deviceType !== 'PC' || !isOnline ? 'opacity-30 pointer-events-none' : ''
            },
            {
                label: 'Capture Screenshot',
                icon: <Camera className="h-4 w-4 text-primary" />,
                action: () => handleAction(contextUser, 'SCREENSHOT'),
                className: contextUser.deviceType !== 'PC' || !isOnline ? 'opacity-30 pointer-events-none' : ''
            },
        ];
    }, [contextUser]);

    if (isAttLoading || isUsersLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

    const renderPopoverContent = (record: any) => {
        const user = record.profile as UserProfile | undefined;
        if (!user) return null;
        const isAdmin = permissions.canManageStaff;

        const MenuItem = ({ icon, label, onClick, className }: any) => (
            <button className={cn("w-full flex items-center text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 text-muted-foreground hover:text-white transition-all gap-2.5", className)} onClick={onClick}>
                {icon} <span>{label}</span>
            </button>
        );

        return (
            <div className="space-y-1">
                <div className="px-3 py-2.5 bg-white/5 rounded-t-lg border-b border-white/5 space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="font-bold text-xs text-white truncate">{user.fullName}</p>
                    </div>
                    <div className={cn("grid gap-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground mt-1.5 font-mono", isAdmin ? "grid-cols-2" : "grid-cols-1")}>
                        <div className="p-1 rounded bg-white/5 text-center">
                            <span className="block text-emerald-400 text-[10px] font-black leading-none mb-1">{formatDuration(record.workTime)}</span>
                            Work
                        </div>
                        {isAdmin && (
                            <div className="p-1 rounded bg-white/5 text-center">
                                <span className="block text-amber-400 text-[10px] font-black leading-none mb-1">{formatDuration(record.idleTime)}</span>
                                Idle
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-1 space-y-0.5">
                    <MenuItem icon={<History className="h-3.5 w-3.5 text-blue-400" />} label="View History" onClick={() => { setHistoryUser(user); setPopoverState(null); }} />
                    <MenuItem icon={<BarChart2 className="h-3.5 w-3.5 text-indigo-400" />} label="View Reports" onClick={() => { uiEmitter.emit('open-reports-dialog', { userId: user.id }); setPopoverState(null); }} />
                    <MenuItem icon={<MessageSquare className="h-3.5 w-3.5 text-emerald-400" />} label="Send Message" onClick={() => { uiEmitter.emit('open-chat-dialog', { initialUserId: user.id }); setPopoverState(null); }} />
                    <div className="h-px bg-white/5 my-1 mx-1" />
                    <MenuItem icon={<ClipboardList className="h-3.5 w-3.5 text-purple-400" />} label="Assign Task" onClick={() => { uiEmitter.emit('open-assign-task-dialog', { userId: user.id }); setPopoverState(null); }} />
                    <MenuItem icon={<Share2 className="h-3.5 w-3.5 text-cyan-400" />} label="Share Task" onClick={() => { setShareTargetUser(user); setPopoverState(null); }} />
                    <div className="h-px bg-white/5 my-1 mx-1" />
                    <MenuItem icon={<Siren className="h-3.5 w-3.5 text-rose-500" />} label="SOS Assistance" onClick={() => { setAssistanceUser(user); setPopoverState(null); }} className="hover:bg-rose-500/10 hover:text-rose-400" />
                </div>
            </div>
        );
    };

    if (variant === 'table') {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto border border-white/5 rounded-xl custom-scrollbar flex-1">
                    <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="bg-secondary/50 text-[9px] font-black uppercase tracking-widest sticky top-0 backdrop-blur-md z-10">
                            <tr className="border-b border-white/5">
                                <th className="px-4 py-3">Staff Member</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Clock In</th>
                                <th className="px-4 py-3">Total Time</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {monitoringData.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-20 text-center text-muted-foreground uppercase font-black opacity-30 tracking-widest">No personnel active</td></tr>
                            ) : (
                                monitoringData.map((record) => (
                                    <tr key={record.id} className="hover:bg-primary/5 transition-colors group cursor-pointer" onClick={(e) => handleRowClick(e, record)}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 rounded-lg border border-white/10"><AvatarFallback className="bg-secondary text-[10px] font-black">{record.userName.charAt(0)}</AvatarFallback></Avatar>
                                                <span className="font-bold text-white truncate">{record.userName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.clockOut ? <span className="px-2 py-0.5 bg-muted/20 text-muted-foreground border border-border/50 rounded-sm text-[8px] font-black uppercase">OUT</span> :
                                             record.onBreak ? <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-sm text-[8px] font-black uppercase animate-pulse">BREAK</span> :
                                             <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-sm text-[8px] font-black uppercase">ACTIVE</span>}
                                        </td>
                                        <td className="px-4 py-3 font-mono opacity-60">{format(new Date(record.clockIn), 'HH:mm')}</td>
                                        <td className="px-4 py-3 font-mono font-bold text-primary">{formatDuration(record.totalShiftTime)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!record.clockOut && record.profile?.deviceType === 'PC' && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500" onClick={(e) => { e.stopPropagation(); handleAction(record.profile!, 'SCREEN_SHARE'); }}><MonitorPlay className="h-3.5 w-3.5" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); handleAction(record.profile!, 'SCREENSHOT'); }}><Camera className="h-3.5 w-3.5" /></Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {popoverState && (
                    <Popover open={true} onOpenChange={() => setPopoverState(null)}>
                        <PopoverTrigger asChild><div style={{ position: 'fixed', top: popoverState.top, left: popoverState.left, width: 0, height: 0 }} /></PopoverTrigger>
                        <PopoverContent className="w-72 apple-glass-darker border-white/10 bg-background/95 p-1 backdrop-blur-md rounded-xl shadow-2xl" align="start">{renderPopoverContent(popoverState.record)}</PopoverContent>
                    </Popover>
                )}
                {/* Global Dialogs Placeholder */}
                {historyUser && (
                    <Dialog open={!!historyUser} onOpenChange={() => setHistoryUser(null)}>
                        <DialogContent className="max-w-4xl border-none apple-glass">
                            <DialogHeader><DialogTitle>Attendance History: {historyUser.fullName}</DialogTitle></DialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto">
                            <AttendanceHistory
                                userProfile={historyUser}
                                canEdit={permissions.canManageStaff}
                                onEdit={(log) => {
                                    setLogToEdit(log);
                                    setIsOverrideOpen(true);
                                }}
                            />
                        </div>
                        </DialogContent>
                    </Dialog>
                )}
                {assistanceUser && <RequestAssistanceDialog open={!!assistanceUser} onOpenChange={(open) => !open && setAssistanceUser(null)} targetUser={assistanceUser} currentUserProfile={userProfile} />}
                {shareTargetUser && (
                    <Dialog open={!!shareTargetUser} onOpenChange={() => setShareTargetUser(null)}>
                        <DialogContent className="max-w-md border-none apple-glass text-foreground">
                            <DialogHeader><DialogTitle>Share Task with {shareTargetUser.fullName.split(' ')[0]}</DialogTitle></DialogHeader>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {adminTasks?.map(t => (
                                    <button key={t.id} onClick={() => { setSelectedTaskToShare(t); setShareTargetUser(null); }} className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-between">
                                        <p className="font-semibold text-sm text-white">{t.title}</p>
                                        <Badge variant="outline" className="text-[9px] uppercase font-mono">{t.status}</Badge>
                                    </button>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
                {selectedTaskToShare && <ShareTaskDialog task={selectedTaskToShare} open={!!selectedTaskToShare} onOpenChange={(open) => !open && setSelectedTaskToShare(null)} currentUserProfile={userProfile} />}
            </div>
        );
    }

    return (
        <ModuleContainer
            title="Live Personnel Monitor"
            subtitle="Operations Performance & Oversight"
            actions={
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-muted" onClick={() => api?.scrollPrev()} disabled={!canScrollPrev}><ArrowLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl bg-muted" onClick={() => api?.scrollNext()} disabled={!canScrollNext}><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20"><Timer className="h-5 w-5 text-primary animate-pulse" /></div>
                </div>
            }
        >
            <Carousel setApi={setApi} opts={{ dragFree: true }} className="w-full relative">
                <CarouselContent className="-ml-4">
                    {monitoringData.length === 0 ? (
                        <div className="pl-4 basis-full"><div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/50"><p className="text-muted-foreground uppercase font-black text-[9px] opacity-30">No personnel detected</p></div></div>
                    ) : (
                        monitoringData.map((record) => (
                            <CarouselItem key={record.id} className="pl-4 basis-[90%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                                <Card className="border border-border/50 bg-card rounded-xl p-6 shadow-sm hover:bg-secondary/20 transition-all cursor-pointer group m3-interactive" onClick={(e) => handleRowClick(e, record)}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center font-black text-sm uppercase text-foreground shrink-0">{record.userName.charAt(0)}</div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-sm text-foreground truncate leading-none">{record.userName}</h4>
                                                    {record.clockOut ? <Badge variant="outline" className="h-5 px-1.5 text-[7px] font-black uppercase bg-muted/20">Out</Badge> :
                                                     record.onBreak ? <Badge variant="outline" className="h-5 px-1.5 text-[7px] font-black uppercase bg-amber-500/10 text-amber-500 animate-pulse">Break</Badge> :
                                                     <Badge variant="outline" className="h-5 px-1.5 text-[7px] font-black uppercase bg-emerald-500/10 text-emerald-500">Active</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground opacity-40">{format(new Date(record.clockIn), 'p')}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        <div className="flex flex-col items-center"><span className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Work</span><span className="text-lg font-bold text-emerald-400 leading-none">{formatDuration(record.workTime)}</span></div>
                                        <div className="flex flex-col items-center"><span className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Total</span><span className="text-lg font-bold text-foreground leading-none">{formatDuration(record.totalShiftTime)}</span></div>
                                    </div>
                                    <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {record.profile?.deviceType === 'PC' ? <div className="flex items-center gap-1.5 text-muted-foreground opacity-40"><Monitor className="h-3.5 w-3.5" /><span className="text-[8px] font-black uppercase">Workstation</span></div> :
                                             <div className="flex items-center gap-1.5 text-amber-500/50"><Smartphone className="h-3.5 w-3.5" /><span className="text-[8px] font-black uppercase">Mobile</span></div>}
                                        </div>
                                        {!record.clockOut && record.profile?.deviceType === 'PC' && record.status === 'APPROVED' && (
                                            <div className="flex gap-1.5">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500" onClick={(e) => { e.stopPropagation(); handleAction(record.profile!, 'SCREEN_SHARE'); }} disabled={isProcessing === record.userId}><MonitorPlay className="h-3.5 w-3.5" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); handleAction(record.profile!, 'SCREENSHOT'); }} disabled={isProcessing === record.userId}><Camera className="h-3.5 w-3.5" /></Button>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </CarouselItem>
                        ))
                    )}
                </CarouselContent>
            </Carousel>
            <ContextMenu isOpen={isOpen} anchorPoint={anchorPoint} items={menuItems} onClose={closeMenu} />
            {popoverState && (
                <Popover open={true} onOpenChange={() => setPopoverState(null)}>
                    <PopoverTrigger asChild><div style={{ position: 'fixed', top: popoverState.top, left: popoverState.left, width: 0, height: 0 }} /></PopoverTrigger>
                    <PopoverContent className="w-72 apple-glass-darker border-white/10 bg-background/95 p-1 backdrop-blur-md rounded-xl shadow-2xl" align="start">{renderPopoverContent(popoverState.record)}</PopoverContent>
                </Popover>
            )}
            {historyUser && (
                <Dialog open={!!historyUser} onOpenChange={() => setHistoryUser(null)}>
                    <DialogContent className="max-w-4xl border-none apple-glass">
                        <DialogHeader><DialogTitle>Attendance History: {historyUser.fullName}</DialogTitle></DialogHeader>
                        <div className="max-h-[70vh] overflow-y-auto">
                            <AttendanceHistory
                                userProfile={historyUser}
                                canEdit={permissions.canManageStaff}
                                onEdit={(log) => {
                                    setLogToEdit(log);
                                    setIsOverrideOpen(true);
                                }}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
            {assistanceUser && <RequestAssistanceDialog open={!!assistanceUser} onOpenChange={(open) => !open && setAssistanceUser(null)} targetUser={assistanceUser} currentUserProfile={userProfile} />}
            {shareTargetUser && (
                <Dialog open={!!shareTargetUser} onOpenChange={() => setShareTargetUser(null)}>
                    <DialogContent className="max-w-md border-none apple-glass text-foreground">
                        <DialogHeader><DialogTitle>Share Task with {shareTargetUser.fullName.split(' ')[0]}</DialogTitle></DialogHeader>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {adminTasks?.map(t => (
                                <button key={t.id} onClick={() => { setSelectedTaskToShare(t); setShareTargetUser(null); }} className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-between">
                                    <p className="font-semibold text-sm text-white">{t.title}</p>
                                    <Badge variant="outline" className="text-[9px] uppercase font-mono">{t.status}</Badge>
                                </button>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
            {selectedTaskToShare && <ShareTaskDialog task={selectedTaskToShare} open={!!selectedTaskToShare} onOpenChange={(open) => !open && setSelectedTaskToShare(null)} currentUserProfile={userProfile} />}

            <EditAttendanceRecordDialog
                isOpen={isOverrideOpen}
                onClose={() => { setIsOverrideOpen(false); setLogToEdit(null); }}
                staffList={orgUsers || []}
                existingLog={logToEdit}
                currentUser={userProfile}
            />
        </ModuleContainer>
    );
}

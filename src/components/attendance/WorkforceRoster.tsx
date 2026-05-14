'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import type { Roster, UserProfile, ShiftType, LeaveRequest } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, UserPlus, Clock, Info, ShieldAlert, Zap, Moon, Sun, PhoneCall, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

interface WorkforceRosterProps {
  userProfile: UserProfile;
  permissions: Permissions;
}

const SHIFT_CONFIG: Record<ShiftType, { label: string; icon: any; color: string }> = {
    MORNING: { label: 'Morning', icon: Sun, color: 'text-amber-500 bg-amber-500/10' },
    AFTERNOON: { label: 'Afternoon', icon: Zap, color: 'text-blue-500 bg-blue-500/10' },
    NIGHT: { label: 'Night', icon: Moon, color: 'text-indigo-400 bg-indigo-400/10' },
    ON_CALL: { label: 'On Call', icon: PhoneCall, color: 'text-rose-500 bg-rose-500/10' },
};

export function WorkforceRoster({ userProfile, permissions }: WorkforceRosterProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assignment Form State
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [shiftType, setShiftType] = useState<ShiftType>('MORNING');

  const rostersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'rosters'),
        where('orgId', '==', userProfile.orgId),
        orderBy('date', 'desc')
    );
  }, [firestore, userProfile.orgId]);

  const { data: rosters, isLoading: isRostersLoading } = useCollection<Roster>(rostersQuery);

  const usersQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile.orgId]);
  const { data: orgUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  // Fetch leave requests to prevent conflicts
  const leaveQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'leave_requests'), where('orgId', '==', userProfile.orgId), where('status', '==', 'APPROVED')) : null
  , [firestore, userProfile.orgId]);
  const { data: leaves } = useCollection<LeaveRequest>(leaveQuery);

  const rostersForDay = useMemo(() => {
    if (!rosters || !selectedDate) return [];
    return rosters.filter(r => isSameDay(new Date(r.date), selectedDate));
  }, [rosters, selectedDate]);

  const personnelStatusOnDay = useMemo(() => {
    if (!selectedDate || !leaves || !orgUsers) return {};
    const statusMap: Record<string, 'ON_LEAVE' | 'AVAILABLE'> = {};
    orgUsers.forEach(u => statusMap[u.id] = 'AVAILABLE');
    
    leaves.forEach(l => {
        if (isSameDay(new Date(l.startDate), selectedDate) || 
            (new Date(selectedDate) >= new Date(l.startDate) && new Date(selectedDate) <= new Date(l.endDate))) {
            statusMap[l.userId] = 'ON_LEAVE';
        }
    });
    return statusMap;
  }, [selectedDate, leaves, orgUsers]);

  const handleAssignShift = async () => {
    if (!firestore || !targetUserId || !selectedDate) return;
    const targetUser = orgUsers?.find(u => u.id === targetUserId);
    if (!targetUser) return;

    if (personnelStatusOnDay[targetUserId] === 'ON_LEAVE') {
        toast({ variant: 'destructive', title: 'Conflict Detected', description: `${targetUser.fullName} is on approved leave for this date.` });
        return;
    }

    if (rostersForDay.some(r => r.userId === targetUserId)) {
        toast({ variant: 'destructive', title: 'Already Assigned', description: `${targetUser.fullName} already has a shift assigned for this date.` });
        return;
    }

    setIsSubmitting(true);
    try {
        const newRoster: Omit<Roster, 'id'> = {
            orgId: userProfile.orgId,
            userId: targetUserId,
            userName: targetUser.fullName,
            date: selectedDate.toISOString().split('T')[0],
            shiftType,
            createdAt: new Date().toISOString(),
        };
        await addDocumentNonBlocking(collection(firestore, 'rosters'), newRoster);
        toast({ title: 'Shift Assigned', description: `Successfully added ${targetUser.fullName} to the ${shiftType.toLowerCase()} shift.` });
        setIsAssignOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async (rosterId: string) => {
    if (!firestore || !permissions.canManageStaff) return;
    deleteDocumentNonBlocking(doc(firestore, 'rosters', rosterId));
    toast({ title: 'Shift Removed' });
  };

  if (isRostersLoading || areUsersLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="lg:col-span-4 space-y-6">
            <Card className="apple-glass border-none shadow-xl overflow-hidden">
                <CardContent className="p-3">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="p-0"
                    />
                </CardContent>
            </Card>
            
            {permissions.canManageStaff && (
                <Card className="apple-glass border-none shadow-lg">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Operational Planning</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full h-12 rounded-xl font-bold shadow-lg" onClick={() => setIsAssignOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" /> Assign Personnel
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>

        <div className="lg:col-span-8 space-y-6">
            <Card className="apple-glass border-none shadow-xl h-full flex flex-col">
                <CardHeader className="bg-white/5 border-b border-white/5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">Duty Roster</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-widest font-bold opacity-60">
                            {selectedDate ? format(selectedDate, 'PPPP') : 'Select a date'}
                        </CardDescription>
                    </div>
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 pt-6">
                    <ScrollArea className="h-96">
                        {rostersForDay.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                                <ShieldAlert className="h-12 w-12 mb-4" />
                                <p className="font-black uppercase tracking-[0.2em] text-sm">No Shifts Scheduled</p>
                                <p className="text-xs mt-1">Operational downtime detected for this cycle.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {rostersForDay.map(roster => {
                                    const config = SHIFT_CONFIG[roster.shiftType];
                                    const Icon = config.icon;
                                    return (
                                        <div key={roster.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-10 w-10 border shadow-sm">
                                                    <AvatarFallback className="font-bold text-xs bg-secondary">{roster.userName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">{roster.userName}</p>
                                                    <div className={cn("flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter w-fit", config.color)}>
                                                        <Icon className="h-3 w-3" />
                                                        {config.label}
                                                    </div>
                                                </div>
                                            </div>
                                            {permissions.canManageStaff && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500/50 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg" onClick={() => handleDeleteShift(roster.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* Assignment Dialog */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
            <DialogContent className="sm:max-w-md apple-glass-darker border-none rounded-3xl">
                <DialogHeader>
                    <DialogTitle>Assign Shift</DialogTitle>
                    <DialogDescription>Schedule personnel for {selectedDate && format(selectedDate, 'PPP')}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">Select Personnel</label>
                        <Select value={targetUserId} onValueChange={setTargetUserId}>
                            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-white/5">
                                <SelectValue placeholder="Identify staff member..." />
                            </SelectTrigger>
                            <SelectContent className="apple-glass border-none">
                                {orgUsers?.map(user => (
                                    <SelectItem key={user.id} value={user.id} disabled={personnelStatusOnDay[user.id] === 'ON_LEAVE'}>
                                        <div className="flex items-center gap-2">
                                            {user.fullName}
                                            {personnelStatusOnDay[user.id] === 'ON_LEAVE' && <Badge variant="destructive" className="h-4 text-[8px] px-1 font-black">LEAVE</Badge>}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">Duty Cycle Type</label>
                         <div className="grid grid-cols-2 gap-3">
                             {Object.entries(SHIFT_CONFIG).map(([type, cfg]) => {
                                 const Icon = cfg.icon;
                                 return (
                                     <div 
                                        key={type}
                                        onClick={() => setShiftType(type as ShiftType)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all interactive-element",
                                            shiftType === type ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" : "bg-white/5 border-white/5 hover:bg-white/10"
                                        )}
                                     >
                                        <Icon className={cn("h-4 w-4", shiftType === type ? "text-white" : "text-primary")} />
                                        <span className="text-xs font-bold uppercase tracking-tight">{cfg.label}</span>
                                     </div>
                                 )
                             })}
                         </div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-600">
                        <Info className="h-5 w-5 shrink-0" />
                        <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tighter">
                            System enforces roster integrity. Shifts cannot be assigned to personnel with approved leave requests for this specific cycle.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" className="rounded-xl h-12" onClick={() => setIsAssignOpen(false)}>Abort</Button>
                    <Button className="rounded-xl h-12 px-8 font-black uppercase tracking-widest shadow-xl" onClick={handleAssignShift} disabled={isSubmitting || !targetUserId}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm Assignment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

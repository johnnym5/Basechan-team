
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { query, collection, where, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, Chat, Task, Announcement } from '@/lib/types';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, ListTodo, AlertCircle, Sparkles, Clock, ArrowRight, Megaphone, ChevronRight, LayoutDashboard } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { uiEmitter } from '@/lib/ui-emitter';
import { cn } from '@/lib/utils';

export function DebriefModal({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);
    const [greeting, setGreeting] = useState('Morning');

    // Trigger Logic & Time Context
    useEffect(() => {
        const handleManualOpen = () => setIsOpen(true);
        uiEmitter.on('open-assistant-dialog', handleManualOpen);
        
        // Dynamic Greeting Calculation
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Morning');
        else if (hour < 17) setGreeting('Afternoon');
        else setGreeting('Evening');

        // Auto-open logic for first login of the day
        const lastDebrief = localStorage.getItem(`last-debrief-${userProfile.id}`);
        const today = format(new Date(), 'yyyy-MM-dd');
        const remindLaterTime = localStorage.getItem(`debrief-remind-later-${userProfile.id}`);
        
        const shouldShowNow = lastDebrief !== today && (!remindLaterTime || isAfterOnePM());

        if (shouldShowNow) {
            setTimeout(() => setIsOpen(true), 1500);
        }

        return () => uiEmitter.off('open-assistant-dialog', handleManualOpen);
    }, [userProfile.id]);

    const isAfterOnePM = () => new Date().getHours() >= 13;

    // DATA QUERIES
    const chatsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'chats'), where('participants', 'array-contains', userProfile.id)) : null
    , [firestore, userProfile.id]);
    const { data: chats } = useCollection<Chat>(chatsQuery);

    const unreadCount = useMemo(() => {
        if (!chats) return 0;
        return chats.filter(c => {
            const lastRead = c.readReceipts?.[userProfile.id];
            return !lastRead || (c.lastMessage && new Date(c.lastMessage.timestamp) > new Date(lastRead));
        }).length;
    }, [chats, userProfile.id]);

    const tasksQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'tasks'), where('assignedTo', '==', userProfile.id), where('status', 'in', ['QUEUED', 'ACTIVE'])) : null
    , [firestore, userProfile.id]);
    const { data: tasks } = useCollection<Task>(tasksQuery);

    const taskIntel = useMemo(() => {
        if (!tasks) return { pending: 0, urgent: 0 };
        const urgent = tasks.filter(t => t.dueDate && (isToday(parseISO(t.dueDate)) || isTomorrow(parseISO(t.dueDate)))).length;
        return { pending: tasks.length, urgent };
    }, [tasks]);

    const announcementQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'announcements'), where('orgId', '==', userProfile.orgId), orderBy('createdAt', 'desc'), limit(1)) : null
    , [firestore, userProfile.orgId]);
    const { data: announcements } = useCollection<Announcement>(announcementQuery);
    const latestAnnouncement = announcements?.[0];

    const handleAcknowledge = () => {
        localStorage.setItem(`last-debrief-${userProfile.id}`, format(new Date(), 'yyyy-MM-dd'));
        localStorage.removeItem(`debrief-remind-later-${userProfile.id}`);
        setIsOpen(false);
    };

    const handleRemindLater = () => {
        localStorage.setItem(`debrief-remind-later-${userProfile.id}`, new Date().toISOString());
        setIsOpen(false);
    };

    return (
        <ResponsiveDialog 
            open={isOpen} 
            onOpenChange={setIsOpen} 
            title={`Good ${greeting}, ${userProfile.fullName.split(' ')[0]}`}
            description={format(new Date(), 'PPPP p')}
        >
            <div className="py-4 space-y-6">
                {/* Tactical Status Sector */}
                <div className="p-5 rounded-3xl bg-primary/10 border border-primary/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <LayoutDashboard className="h-20 w-20 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 text-primary mb-3">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Outlook</span>
                    </div>
                    <div className="relative z-10">
                         <p className="text-sm font-medium leading-relaxed italic text-foreground/90">
                            {taskIntel.pending > 0 
                                ? `You have ${taskIntel.pending} active objectives assigned for this cycle. ${taskIntel.urgent > 0 ? `Alert: ${taskIntel.urgent} critical deadlines detected.` : 'No immediate critical threats.'}`
                                : 'All primary objectives are currently cleared. Monitor channels for incoming transmissions.'}
                        </p>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-4">
                    <div 
                        onClick={() => { setIsOpen(false); uiEmitter.emit('open-chat-dialog'); }}
                        className="p-5 rounded-3xl bg-secondary/20 border border-white/5 cursor-pointer hover:bg-secondary/40 hover:border-primary/20 transition-all active:scale-95 group"
                    >
                        <div className="flex items-center justify-between text-primary mb-2">
                            <MessageSquare className="h-5 w-5" />
                            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-3xl font-black font-headline">{unreadCount}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">New Messages</p>
                    </div>
                    <div 
                        onClick={() => { setIsOpen(false); uiEmitter.emit('open-tasks-dialog'); }}
                        className="p-5 rounded-3xl bg-secondary/20 border border-white/5 cursor-pointer hover:bg-secondary/40 hover:border-primary/20 transition-all active:scale-95 group"
                    >
                        <div className="flex items-center justify-between text-foreground mb-2">
                            <ListTodo className="h-5 w-5" />
                            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-3xl font-black font-headline">{taskIntel.pending}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Open Tasks</p>
                    </div>
                </div>

                {/* Deadline Alert */}
                {taskIntel.urgent > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-rose-500 uppercase tracking-tighter">Tasks Due Soon</p>
                            <p className="text-[10px] font-medium leading-tight text-foreground/80">You have {taskIntel.urgent} task(s) that need to be finished within 24 hours.</p>
                        </div>
                    </div>
                )}

                {latestAnnouncement && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                            <Megaphone className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-amber-600 uppercase tracking-tighter">Latest Broadcast</p>
                            <p className="text-[10px] font-medium leading-tight text-foreground/80 truncate">{latestAnnouncement.title}</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                    <Button onClick={handleAcknowledge} className="h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group">
                        Acknowledge & Deploy
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="ghost" onClick={handleRemindLater} className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        Check back later
                    </Button>
                </div>
            </div>
        </ResponsiveDialog>
    );
}

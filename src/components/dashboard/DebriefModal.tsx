
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { query, collection, where, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, Chat, Task, Announcement } from '@/lib/types';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, ListTodo, AlertCircle, Sparkles, Clock, ArrowRight, Megaphone, ChevronRight } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { uiEmitter } from '@/lib/ui-emitter';
import { cn } from '@/lib/utils';

export function DebriefModal({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);

    // Trigger Logic
    useEffect(() => {
        const handleManualOpen = () => setIsOpen(true);
        uiEmitter.on('open-assistant-dialog', handleManualOpen);
        
        // Auto-open logic for first login of the day
        const lastDebrief = localStorage.getItem(`last-debrief-${userProfile.id}`);
        const today = format(new Date(), 'yyyy-MM-dd');
        const remindLaterTime = localStorage.getItem(`debrief-remind-later-${userProfile.id}`);
        
        const shouldShowNow = lastDebrief !== today && (!remindLaterTime || isAfterOnePM());

        if (shouldShowNow) {
            // Small delay to ensure layout is ready
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
            title={`Good ${new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, ${userProfile.fullName.split(' ')[0]}`}
            description={format(new Date(), 'PPPP p')}
        >
            <div className="py-4 space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-4">
                    <div 
                        onClick={() => { setIsOpen(false); uiEmitter.emit('open-chat-dialog'); }}
                        className="p-5 rounded-3xl bg-primary/5 border border-primary/10 cursor-pointer hover:bg-primary/10 transition-all active:scale-95 group"
                    >
                        <div className="flex items-center justify-between text-primary mb-2">
                            <MessageSquare className="h-5 w-5" />
                            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-3xl font-black font-headline">{unreadCount}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unread Comms</p>
                    </div>
                    <div 
                        onClick={() => { setIsOpen(false); uiEmitter.emit('open-tasks-dialog'); }}
                        className="p-5 rounded-3xl bg-secondary/20 border border-white/5 cursor-pointer hover:bg-secondary/40 transition-all active:scale-95 group"
                    >
                        <div className="flex items-center justify-between text-foreground mb-2">
                            <ListTodo className="h-5 w-5" />
                            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-3xl font-black font-headline">{taskIntel.pending}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Missions</p>
                    </div>
                </div>

                {/* Announcement Node */}
                {latestAnnouncement && (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                        <div className="flex items-center gap-2 text-amber-600">
                            <Megaphone className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Global Broadcast</span>
                        </div>
                        <h4 className="font-bold text-sm">{latestAnnouncement.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{latestAnnouncement.content}</p>
                    </div>
                )}

                {/* Critical Deadline Alert */}
                {taskIntel.urgent > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-rose-500 uppercase tracking-tighter">Urgent Deadlines</p>
                            <p className="text-[10px] font-medium leading-tight text-foreground/80">You have {taskIntel.urgent} mission(s) requiring finalization within 24 hours.</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                    <Button onClick={handleAcknowledge} className="h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group">
                        Acknowledge & Start Day
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="ghost" onClick={handleRemindLater} className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        Remind me in the afternoon
                    </Button>
                </div>
            </div>
        </ResponsiveDialog>
    );
}

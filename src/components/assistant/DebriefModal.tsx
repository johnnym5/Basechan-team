'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { query, collection, where, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, Chat, Task, Announcement } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, ListTodo, AlertCircle, Sparkles, Clock, ArrowRight, Megaphone, ChevronRight } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { uiEmitter } from '@/lib/ui-emitter';
import { cn } from '@/lib/utils';

export function DebriefModal({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);

    // Manual Trigger Listener
    useEffect(() => {
        const openAssistant = () => setIsOpen(true);
        uiEmitter.on('open-assistant-dialog', openAssistant);
        return () => uiEmitter.off('open-assistant-dialog', openAssistant);
    }, []);

    // Check if debrief was shown today for auto-popup
    useEffect(() => {
        const lastDebrief = localStorage.getItem(`last-debrief-${userProfile.id}`);
        const today = format(new Date(), 'yyyy-MM-dd');
        
        const remindLater = localStorage.getItem(`debrief-remind-later-${userProfile.id}`);
        const isAfternoon = new Date().getHours() >= 13;

        if (lastDebrief !== today) {
            if (remindLater === today) {
                if (isAfternoon) setIsOpen(true);
            } else {
                setIsOpen(true);
            }
        }
    }, [userProfile.id]);

    // Query Unread Messages
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

    // Query Active Missions
    const tasksQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'tasks'), where('assignedTo', '==', userProfile.id), where('status', 'in', ['QUEUED', 'ACTIVE'])) : null
    , [firestore, userProfile.id]);
    const { data: tasks } = useCollection<Task>(tasksQuery);

    const taskIntel = useMemo(() => {
        if (!tasks) return { pending: 0, urgent: 0 };
        const urgent = tasks.filter(t => t.dueDate && (isToday(parseISO(t.dueDate)) || isTomorrow(parseISO(t.dueDate)))).length;
        return { pending: tasks.length, urgent };
    }, [tasks]);

    // Query Latest Announcement
    const announcementQuery = useMemoFirebase(() => 
        firestore ? query(
            collection(firestore, 'announcements'), 
            where('orgId', '==', userProfile.orgId),
            orderBy('createdAt', 'desc'),
            limit(1)
        ) : null
    , [firestore, userProfile.orgId]);
    const { data: announcements } = useCollection<Announcement>(announcementQuery);
    const latestAnnouncement = announcements?.[0];

    const handleAcknowledge = () => {
        localStorage.setItem(`last-debrief-${userProfile.id}`, format(new Date(), 'yyyy-MM-dd'));
        localStorage.removeItem(`debrief-remind-later-${userProfile.id}`);
        setIsOpen(false);
    };

    const handleRemindLater = () => {
        localStorage.setItem(`debrief-remind-later-${userProfile.id}`, format(new Date(), 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const handleJumpToComms = () => {
        setIsOpen(false);
        uiEmitter.emit('open-chat-dialog');
    };

    const handleJumpToMissions = () => {
        setIsOpen(false);
        uiEmitter.emit('open-tasks-dialog');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md apple-glass-darker border-none rounded-[2.5rem] p-8">
                <DialogHeader className="space-y-4">
                    <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
                        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div className="text-center">
                        <DialogTitle className="text-2xl font-black font-headline tracking-tighter">
                            Good Morning, {userProfile.fullName.split(' ')[0]}
                        </DialogTitle>
                        <DialogDescription className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest mt-2">
                            <Clock className="h-3 w-3" /> {format(new Date(), 'PP p')}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {/* Interactive Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div 
                            onClick={handleJumpToComms}
                            className="p-4 rounded-3xl bg-secondary/20 border border-white/5 flex flex-col gap-1 cursor-pointer hover:bg-secondary/40 hover:border-primary/20 transition-all active:scale-95 group"
                        >
                            <div className="flex items-center justify-between text-primary">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Comms</span>
                                </div>
                                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-2xl font-black font-headline">{unreadCount}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Unread Units</p>
                        </div>
                        <div 
                            onClick={handleJumpToMissions}
                            className="p-4 rounded-3xl bg-secondary/20 border border-white/5 flex flex-col gap-1 cursor-pointer hover:bg-secondary/40 hover:border-primary/20 transition-all active:scale-95 group"
                        >
                            <div className="flex items-center justify-between text-primary">
                                <div className="flex items-center gap-2">
                                    <ListTodo className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Missions</span>
                                </div>
                                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-2xl font-black font-headline">{taskIntel.pending}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Active Tasks</p>
                        </div>
                    </div>

                    {/* Announcement Section */}
                    {latestAnnouncement && (
                        <div 
                            className="p-4 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col gap-2 cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={() => {
                                setIsOpen(false);
                                // Open detailed announcements view if possible, or just home
                                window.location.href = '/';
                            }}
                        >
                            <div className="flex items-center gap-2 text-primary">
                                <Megaphone className="h-3.5 w-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Latest Broadcast</span>
                            </div>
                            <h4 className="text-xs font-bold truncate">{latestAnnouncement.title}</h4>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{latestAnnouncement.content}</p>
                        </div>
                    )}

                    {taskIntel.urgent > 0 && (
                        <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-rose-500 uppercase tracking-tighter">Critical Deadline</p>
                                <p className="text-[10px] font-medium leading-tight">You have {taskIntel.urgent} mission(s) due within the next 24 hours.</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-3">
                    <button 
                        onClick={handleAcknowledge} 
                        className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98]"
                    >
                        Acknowledge & Start Day
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                        onClick={handleRemindLater} 
                        className="w-full h-10 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
                    >
                        Remind me later (Afternoon)
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
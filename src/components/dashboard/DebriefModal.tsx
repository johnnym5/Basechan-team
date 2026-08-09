
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { query, collection, where, orderBy, limit, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile, Chat, Task, Announcement } from '@/lib/types';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, ListTodo, AlertCircle, Sparkles, Clock, ArrowRight, Megaphone, ChevronRight, LayoutDashboard, Edit2, Trash2, Loader2 } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { uiEmitter } from '@/lib/ui-emitter';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export function DebriefModal({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const permissions = usePermissions(userProfile);
    const [isOpen, setIsOpen] = useState(false);
    const [greeting, setGreeting] = useState('Morning');

    // Admin Actions State
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Trigger Logic & Time Context
    useEffect(() => {
        const handleManualOpen = () => setIsOpen(true);
        uiEmitter.on('open-assistant-dialog', handleManualOpen);
        
        // Dynamic Greeting Calculation
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Morning');
        else if (hour < 17) setGreeting('Afternoon');
        else setGreeting('Evening');

        return () => uiEmitter.off('open-assistant-dialog', handleManualOpen);
    }, [userProfile.id]);

    const isAfterOnePM = () => new Date().getHours() >= 13;

    // DATA QUERIES
    const chatsQuery = useMemoFirebase(() => 
        (firestore && userProfile.orgId) ? query(collection(firestore, 'chats'), where('orgId', '==', userProfile.orgId), where('participants', 'array-contains', userProfile.id)) : null
    , [firestore, userProfile.id, userProfile.orgId]);
    const { data: chats } = useCollection<Chat>(chatsQuery);

    const unreadCount = useMemo(() => {
        if (!chats) return 0;
        return chats.filter(c => {
            const lastRead = c.readReceipts?.[userProfile.id];
            return !lastRead || (c.lastMessage && new Date(c.lastMessage.timestamp) > new Date(lastRead));
        }).length;
    }, [chats, userProfile.id]);

    const tasksQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'tasks'), where('orgId', '==', userProfile.orgId), where('assignedTo', '==', userProfile.id), where('status', 'in', ['QUEUED', 'ACTIVE'])) : null
    , [firestore, userProfile.id, userProfile.orgId]);
    const { data: tasks } = useCollection<Task>(tasksQuery);

    const taskIntel = useMemo(() => {
        if (!tasks) return { pending: 0, urgent: 0, highestTask: null };
        const urgent = tasks.filter(t => t.dueDate && (isToday(parseISO(t.dueDate)) || isTomorrow(parseISO(t.dueDate)))).length;

        // Find highest priority task
        const sorted = [...tasks].sort((a, b) => {
            const pMap = { LEVEL_3: 3, LEVEL_2: 2, LEVEL_1: 1 };
            return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
        });

        return { pending: tasks.length, urgent, highestTask: sorted[0] };
    }, [tasks]);

    const announcementQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'announcements'), where('orgId', '==', userProfile.orgId), orderBy('createdAt', 'desc'), limit(1)) : null
    , [firestore, userProfile.orgId]);
    const { data: announcements } = useCollection<Announcement>(announcementQuery);
    const latestAnnouncement = announcements?.[0];

    // Auto-open effect when announcements change
    useEffect(() => {
        if (!latestAnnouncement) return;

        const lastDebrief = localStorage.getItem(`last-debrief-${userProfile.id}`);
        const today = format(new Date(), 'yyyy-MM-dd');
        const remindLaterTime = localStorage.getItem(`debrief-remind-later-${userProfile.id}`);
        const lastReadAnnId = localStorage.getItem(`last-read-announcement-${userProfile.id}`);

        const isNewAnnouncement = latestAnnouncement.id !== lastReadAnnId;
        const shouldShowNow = (lastDebrief !== today || isNewAnnouncement) && (!remindLaterTime || isAfterOnePM());

        if (shouldShowNow && !isOpen) {
            setTimeout(() => setIsOpen(true), 1500);
        }
    }, [latestAnnouncement, userProfile.id, isOpen]);

    const handleAcknowledge = () => {
        localStorage.setItem(`last-debrief-${userProfile.id}`, format(new Date(), 'yyyy-MM-dd'));
        localStorage.removeItem(`debrief-remind-later-${userProfile.id}`);
        if (latestAnnouncement) {
            localStorage.setItem(`last-read-announcement-${userProfile.id}`, latestAnnouncement.id);
        }
        setIsOpen(false);
    };

    const handleRemindLater = () => {
        localStorage.setItem(`debrief-remind-later-${userProfile.id}`, new Date().toISOString());
        setIsOpen(false);
    };

    // ADMIN ACTIONS
    const handleDeleteAnnouncement = async () => {
        if (!firestore || !latestAnnouncement) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'announcements', latestAnnouncement.id));
            toast({ title: 'Announcement Purged', description: 'Broadcast has been removed from system.' });
            setShowDeleteConfirm(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditAnnouncement = () => {
        if (!latestAnnouncement) return;
        setEditTitle(latestAnnouncement.title);
        setEditContent(latestAnnouncement.content);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!firestore || !latestAnnouncement) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(firestore, 'announcements', latestAnnouncement.id), {
                title: editTitle,
                content: editContent,
                updatedAt: new Date().toISOString()
            });
            toast({ title: 'Broadcast Updated', description: 'Transmission has been modified.' });
            setIsEditing(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        <ResponsiveDialog
            open={isOpen} 
            onOpenChange={setIsOpen} 
            title={`Good ${greeting}, ${userProfile.fullName.split(' ')[0]}`}
            description={format(new Date(), 'PPPP p')}
            className="sm:max-w-lg"
        >
            <div className="py-4 space-y-6">
                {/* Tactical Status Sector */}
                <div className="p-5 rounded-3xl bg-primary/10 border border-primary/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <LayoutDashboard className="h-20 w-20 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 text-primary mb-3">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Today's Overview</span>
                    </div>
                    <div className="relative z-10">
                         <p className="text-sm font-medium leading-relaxed italic text-foreground/90">
                            Welcome in! You have {taskIntel.pending} open tasks to focus on today.
                            {taskIntel.urgent > 0 && ` Attention: ${taskIntel.urgent} critical deadlines require your presence.`}
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
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Open Tasks</p>
                            {taskIntel.highestTask && (
                                <p className="text-[9px] text-primary font-black truncate mt-1 animate-in fade-in slide-in-from-left-1">
                                    Focus: {taskIntel.highestTask.title}
                                </p>
                            )}
                        </div>
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
                    <div className="p-5 rounded-2xl bg-secondary/50 border border-border/50 space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-500">
                                <Megaphone className="h-4 w-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Latest Announcement</p>
                            </div>

                            {permissions.canManageAnnouncements && (
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-amber-500/20 text-amber-600" onClick={handleEditAnnouncement}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-rose-500/20 text-rose-600" onClick={() => setShowDeleteConfirm(true)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="font-bold text-sm text-foreground">{latestAnnouncement.title}</p>
                            <div className="max-h-32 overflow-y-auto custom-scrollbar text-sm text-muted-foreground leading-relaxed font-medium bg-secondary p-4 rounded-xl border border-border/50">
                                {latestAnnouncement.content}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                    <Button onClick={handleAcknowledge} className="h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group">
                        Got it, Let's Start
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="ghost" onClick={handleRemindLater} className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        Dismiss for now
                    </Button>
                </div>
            </div>
        </ResponsiveDialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent className="apple-glass border-none rounded-[2rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">Purge Broadcast?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-bold uppercase tracking-widest opacity-60">
                        This will permanently remove the announcement from the system ticker and briefing modals.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest border-white/10">Abort</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAnnouncement} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">
                        {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Purge"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="apple-glass border-none rounded-[2.5rem] p-8 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Edit Broadcast</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Modify the organization-wide transmission.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-40 px-1">Broadcast Title</label>
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="bg-black/20 border-white/5 rounded-xl h-12"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-40 px-1">Broadcast Content</label>
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="bg-black/20 border-white/5 rounded-2xl min-h-[150px] resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest opacity-40">Cancel</Button>
                    <Button onClick={handleSaveEdit} disabled={isSaving} className="h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest">
                        {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Apply Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

"use client"

import React, { useState, useMemo } from "react"
import { useUser, useFirestore, useCollection, updateDocumentNonBlocking, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, arrayUnion } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronLeft, ChevronRight, CheckCircle, Eye, Info, Megaphone, Edit3, Trash2 } from "lucide-react"
import type { Announcement, UserProfile } from "@/lib/types"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EditAnnouncementDialog } from "../dashboard/EditAnnouncementDialog"
import { deleteDocumentNonBlocking } from "@/firebase"
import { useToast } from "@/hooks/use-toast"

interface GlobalBroadcastTickerProps {
    broadcasts: Announcement[];
    userProfile: UserProfile | null;
}

export function GlobalBroadcastTicker({ broadcasts, userProfile }: GlobalBroadcastTickerProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const isAdmin = userProfile?.role === 'ORG_ADMIN' || userProfile?.role === 'MANAGING_DIRECTOR' || userProfile?.role === 'HR_MANAGER' || userProfile?.role === 'SUPERADMIN' || userProfile?.role === 'FINANCE_MANAGER';

    const usersQuery = useMemoFirebase(() => {
        if (!isAdmin || !userProfile?.orgId || !firestore) return null;
        return query(
            collection(firestore, 'users'),
            where('orgId', '==', userProfile.orgId)
        );
    }, [firestore, userProfile?.orgId, isAdmin]);

    const { data: allUsers } = useCollection<UserProfile>(usersQuery);

    const hasNew24h = useMemo(() => {
        if (!userProfile) return false;
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const now = new Date().getTime();
        return broadcasts.some(b =>
            !b.viewedBy?.includes(userProfile.id) &&
            (now - new Date(b.createdAt).getTime() < ONE_DAY)
        );
    }, [broadcasts, userProfile]);

    if (!broadcasts || broadcasts.length === 0) return null;

    const activeBroadcast = broadcasts[currentIndex];
    const isReadByMe = activeBroadcast?.viewedBy?.includes(userProfile?.id || "");

    const handleNext = () => setCurrentIndex(prev => Math.min(prev + 1, broadcasts.length - 1));
    const handlePrev = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

    const handleMarkAsRead = async (id: string) => {
        if (!firestore || !userProfile) return;

        if (!isReadByMe) {
            const annRef = doc(firestore, 'announcements', id);
            await updateDocumentNonBlocking(annRef, {
                viewedBy: arrayUnion(userProfile.id)
            });
        }

        // Find next unread index
        const nextUnreadIndex = broadcasts.findIndex((b, i) => i > currentIndex && !b.viewedBy?.includes(userProfile.id));

        if (nextUnreadIndex !== -1) {
            setCurrentIndex(nextUnreadIndex);
        } else if (currentIndex < broadcasts.length - 1) {
            handleNext();
        }
    };

    const readers = useMemo(() => {
        if (!activeBroadcast?.viewedBy || !allUsers) return [];
        return allUsers.filter(u => activeBroadcast.viewedBy.includes(u.id));
    }, [activeBroadcast?.viewedBy, allUsers]);

    const handleDelete = async () => {
        if (!firestore || !activeBroadcast) return;
        if (!confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) return;

        try {
            await deleteDocumentNonBlocking(doc(firestore, 'announcements', activeBroadcast.id));
            toast({ title: "Announcement Deleted", description: "The broadcast has been removed from the fleet." });
            setIsOpen(false);
            if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Deletion Failed", description: e.message });
        }
    };

    return (
        <>
            {/* TICKER BAR */}
            <div
                onClick={() => setIsOpen(true)}
                className="w-full bg-secondary/10 border-b border-white/5 h-10 flex items-center px-4 cursor-pointer hover:bg-secondary/20 transition-all group overflow-hidden relative"
            >
                <div className="flex items-center gap-3 shrink-0 z-20 bg-background/80 pr-6 backdrop-blur-md h-full border-r border-white/5 shadow-[20px_0_20px_-10px_rgba(0,0,0,0.5)]">
                    <Megaphone className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Intelligence Feed</span>
                    {hasNew24h && (
                         <span className="px-2 py-0.5 text-[8px] font-black bg-primary text-primary-foreground rounded-full animate-pulse shadow-lg shadow-primary/20">
                           NEW
                         </span>
                    )}
                </div>

                <div className="flex-1 overflow-hidden whitespace-nowrap relative h-full flex items-center">
                    <div className="inline-block animate-marquee group-hover:[animation-play-state:paused] text-[11px] font-bold uppercase tracking-widest text-foreground/80">
                        {broadcasts.map((b) => (
                            <span key={b.id} className="mx-12 hover:text-primary transition-colors">
                                {b.title} <span className="opacity-30 mx-4">—</span> <span className="text-muted-foreground font-medium normal-case tracking-normal">{b.content.substring(0, 100)}{b.content.length > 100 ? '...' : ''}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL CAROUSEL */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[650px] apple-glass-darker border-none rounded-[2rem] p-0 overflow-hidden shadow-3xl">
                    <DialogHeader className="p-8 pb-4 border-b border-white/5 bg-white/5">
                        <div className="flex justify-between items-start gap-6">
                            <div className="min-w-0">
                                <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-primary truncate">
                                    {activeBroadcast?.title}
                                </DialogTitle>
                                <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1 flex items-center gap-2">
                                    <Info className="h-3 w-3" />
                                    Transmission Logged: {format(new Date(activeBroadcast?.createdAt || Date.now()), 'PPP p')}
                                </DialogDescription>
                            </div>
                            <Badge variant="secondary" className="rounded-xl px-3 py-1 font-black text-[10px] bg-white/10 border-white/5 text-muted-foreground shrink-0">
                                {currentIndex + 1} / {broadcasts.length}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[50vh]">
                        <div className="p-8 text-sm font-medium leading-relaxed text-foreground/90 whitespace-pre-wrap">
                            {activeBroadcast?.content}
                        </div>
                    </ScrollArea>

                    <div className="px-8 pb-8 space-y-6">
                        {/* ADMIN OVERWATCH - READ RECEIPTS & ACTIONS */}
                        {isAdmin && (
                            <div className="space-y-4">
                                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                            <Eye className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Audit Node</p>
                                            <p className="text-xs font-bold text-muted-foreground">{activeBroadcast?.viewedBy?.length || 0} Personnel Acknowledged</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 rounded-lg border-white/10 bg-white/5 hover:bg-primary hover:text-white transition-all text-[9px] font-black uppercase"
                                            onClick={() => setIsEditOpen(true)}
                                        >
                                            <Edit3 className="w-3 h-3 mr-2" /> Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 rounded-lg border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[9px] font-black uppercase"
                                            onClick={handleDelete}
                                        >
                                            <Trash2 className="w-3 h-3 mr-2" /> Delete
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-4 bg-secondary/5 border border-white/5 rounded-2xl">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="receipts" className="border-none">
                                            <AccordionTrigger className="py-0 hover:no-underline flex gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                View Acknowledged Personnel
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-4 pb-0">
                                                {readers.length > 0 ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {readers.map(user => (
                                                            <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/5">
                                                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                                <span className="text-[10px] font-bold text-muted-foreground truncate">{user.fullName}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-muted-foreground italic opacity-50">No personnel have marked this as read yet.</p>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>
                        )}

                        {/* FOOTER ACTIONS */}
                        <div className="flex justify-between items-center pt-6 border-t border-white/5">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleNext}
                                    disabled={currentIndex === broadcasts.length - 1}
                                    className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                            </div>

                            {(!isAdmin || (isAdmin && userProfile?.id === activeBroadcast?.authorId)) && !isReadByMe ? (
                                <Button
                                    onClick={() => handleMarkAsRead(activeBroadcast.id)}
                                    className="h-12 px-8 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/90 flex items-center gap-2 active:scale-95 transition-all"
                                >
                                    <CheckCircle className="w-4 h-4" /> Acknowledge Broadcast
                                </Button>
                            ) : (
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                                        <CheckCircle className="w-4 h-4" />
                                        {isAdmin ? "Transmission Active" : "Acknowledged"}
                                    </div>
                                    {isAdmin && <span className="text-[8px] font-bold text-muted-foreground mt-1 uppercase opacity-40">System-wide Broadcast</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {isAdmin && activeBroadcast && (
                <EditAnnouncementDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    announcement={activeBroadcast}
                    userProfile={userProfile}
                />
            )}
        </>
    )
}

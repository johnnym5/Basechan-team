'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, Pin, Eye, MoreVertical, Edit, Trash2, Users } from "lucide-react";
import { useUser, useDoc, useMemoFirebase, useCollection, useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { UserProfile, Announcement } from "@/lib/types";
import { collection, doc, query, where, orderBy, arrayUnion, limit } from "firebase/firestore";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "../ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { EditAnnouncementDialog } from "./EditAnnouncementDialog";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";


export function Announcements() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [annToEdit, setAnnToEdit] = useState<Announcement | null>(null);
    const [annToDelete, setAnnToDelete] = useState<Announcement | null>(null);
    const [viewersToDisplay, setViewersToDisplay] = useState<Announcement | null>(null);

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, "users", authUser.uid) : null,
    [firestore, authUser]);
    
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile || !authUser) return null;
        return query(
            collection(firestore, 'announcements'),
            where('orgId', '==', userProfile.orgId),
            where('visibleTo', 'array-contains-any', ['ALL', authUser.uid]),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    }, [firestore, userProfile, authUser]);

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    const usersQuery = useMemoFirebase(() =>
        (firestore && userProfile) ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null,
    [firestore, userProfile]);
    const { data: allUsers } = useCollection<UserProfile>(usersQuery);

    const sortedAnnouncements = useMemo(() => {
        if (!announcements) return [];
        return [...announcements].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [announcements]);

    useEffect(() => {
        if (sortedAnnouncements && authUser && firestore) {
            sortedAnnouncements.forEach(ann => {
                if (ann.isPinned && !ann.viewedBy?.includes(authUser.uid)) {
                    const annRef = doc(firestore, 'announcements', ann.id);
                    updateDocumentNonBlocking(annRef, {
                        viewedBy: arrayUnion(authUser.uid)
                    });
                }
            });
        }
    }, [sortedAnnouncements, authUser, firestore]);
    
    const handleDelete = () => {
        if (!annToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'announcements', annToDelete.id));
        toast({ title: "Announcement Deleted", description: `"${annToDelete.title}" has been removed.` });
        setAnnToDelete(null);
    }
    
    const handlePinToggle = (ann: Announcement) => {
        updateDocumentNonBlocking(doc(firestore, 'announcements', ann.id), {
            isPinned: !ann.isPinned
        });
        toast({ title: "Updated", description: `Announcement has been ${ann.isPinned ? 'unpinned' : 'pinned'}.` });
    }

    const viewers = useMemo(() => {
        if (!viewersToDisplay || !allUsers) return [];
        return allUsers.filter(u => viewersToDisplay.viewedBy?.includes(u.id));
    }, [viewersToDisplay, allUsers]);

    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>The latest broadcasts for your organization.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flow-root">
                    <ul role="list" className="-my-6 divide-y divide-border">
                        {isLoading && Array.from({length: 2}).map((_, i) => (
                            <li key={i} className="py-6">
                                <div className="flex gap-3">
                                    <Skeleton className="h-5 w-5 mt-1 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            </li>
                        ))}
                        {!isLoading && sortedAnnouncements.length === 0 && (
                            <li className="py-6">
                                <p className="text-sm text-muted-foreground text-center py-8">No announcements have been posted yet.</p>
                            </li>
                        )}
                        {!isLoading && sortedAnnouncements.map(announcement => {
                            return (
                            <li key={announcement.id} className="py-6">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{announcement.authorName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-sm">{announcement.title}</p>
                                            {announcement.isPinned && <Pin className="h-4 w-4 text-primary" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                                        <div className="text-xs text-muted-foreground/70 mt-2 flex items-center justify-between">
                                            <span>
                                                {announcement.authorName} - {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                                            </span>
                                            {announcement.isPinned && permissions.canManageAnnouncements && (
                                                <button 
                                                    className="flex items-center gap-1 text-primary/80 hover:text-primary transition-colors cursor-pointer group"
                                                    onClick={() => setViewersToDisplay(announcement)}
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    <span>{announcement.viewedBy?.length || 0}</span>
                                                    <span className="opacity-0 group-hover:opacity-100 text-[10px] ml-1">View List</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {permissions.canManageAnnouncements && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onSelect={() => handlePinToggle(announcement)}>
                                                    <Pin className="mr-2 h-4 w-4" />
                                                    {announcement.isPinned ? 'Unpin' : 'Pin'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setAnnToEdit(announcement)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setAnnToDelete(announcement)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </li>
                        )})}
                    </ul>
                </div>
            </CardContent>
        </Card>
        
        {annToEdit && (
            <EditAnnouncementDialog 
                announcement={annToEdit} 
                open={!!annToEdit} 
                onOpenChange={(isOpen) => !isOpen && setAnnToEdit(null)}
                userProfile={userProfile}
            />
        )}
        
        {annToDelete && (
            <AlertDialog open={!!annToDelete} onOpenChange={(isOpen) => !isOpen && setAnnToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the announcement "{annToDelete.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

        {viewersToDisplay && (
            <Dialog open={!!viewersToDisplay} onOpenChange={(isOpen) => !isOpen && setViewersToDisplay(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Announcement Viewers
                        </DialogTitle>
                        <DialogDescription>
                            Staff members who have seen "{viewersToDisplay.title}"
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-72 mt-4 pr-4">
                        <div className="space-y-4">
                            {viewers.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-8">No views recorded yet.</p>
                            ) : (
                                viewers.map(viewer => (
                                    <div key={viewer.id} className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>{viewer.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-semibold">{viewer.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{viewer.position}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        )}
        </>
    );
}
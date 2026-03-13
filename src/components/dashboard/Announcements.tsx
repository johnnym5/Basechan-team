'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, Pin, Eye, MoreVertical, Edit, Trash2 } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const RecentActivity = ({ announcements }: { announcements: Announcement[] | null }) => {
    if (!announcements) return null;
    return (
        <section className="space-y-4">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <div className="relative pl-4 border-l border-slate-800 space-y-8 py-2">
            {announcements.map((ann, index) => (
                 <div key={ann.id} className="relative">
                    <div className={`absolute -left-[21px] top-0 size-3 rounded-full border-2 border-background ${index === 0 ? 'bg-primary' : 'bg-slate-600'}`}></div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium"><span className="font-bold">{ann.title}</span> by {ann.authorName}</p>
                        <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}</p>
                    </div>
                </div>
            ))}
            </div>
      </section>
    );
};


export function Announcements() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [annToEdit, setAnnToEdit] = useState<Announcement | null>(null);
    const [annToDelete, setAnnToDelete] = useState<Announcement | null>(null);

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

    return (
        <>
        {/* Mobile View */}
        <div className="block md:hidden">
            <RecentActivity announcements={sortedAnnouncements} />
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
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
                                                    <span className="flex items-center gap-1 text-primary/80">
                                                        <Eye className="h-3 w-3" />
                                                        {announcement.viewedBy?.length || 0}
                                                    </span>
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
        </div>
        
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
        </>
    );
}

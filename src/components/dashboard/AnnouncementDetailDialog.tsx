'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Announcement, UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { User, Calendar, Eye, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { useState } from 'react';
import { EditAnnouncementDialog } from './EditAnnouncementDialog';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AnnouncementDetailDialogProps {
  announcement: Announcement;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userProfile: UserProfile;
}

export function AnnouncementDetailDialog({ announcement, isOpen, onOpenChange, userProfile }: AnnouncementDetailDialogProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile.role === 'ORG_ADMIN' || userProfile.role === 'MANAGING_DIRECTOR' || userProfile.role === 'HR_MANAGER' || userProfile.role === 'SUPERADMIN' || userProfile.role === 'FINANCE_MANAGER';
  const isAuthor = announcement.authorId === userProfile.id;
  const canManage = isAdmin || isAuthor;

  const handleDelete = async () => {
    if (!firestore) return;
    if (!confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) return;

    try {
        await deleteDocumentNonBlocking(doc(firestore, 'announcements', announcement.id));
        toast({ title: "Announcement Deleted", description: "The broadcast has been removed." });
        onOpenChange(false);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Deletion Failed", description: e.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
             <div className="flex-1">
                <DialogTitle className="text-2xl font-bold font-headline">{announcement.title}</DialogTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {announcement.authorName}
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(announcement.createdAt), 'PPP')}
                    </div>
                </div>
             </div>
             {announcement.isPinned && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    PINNED
                </Badge>
             )}
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 py-4">
            <ScrollArea className="flex-1 rounded-md border p-4 bg-secondary/10">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {announcement.content}
                    </p>
                </div>
            </ScrollArea>
        </div>

        {canManage && (
            <div className="mt-4 space-y-3">
                <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                            <Eye className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Personnel Acknowledged</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Audit Tracking Active</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black font-headline text-primary">{announcement.viewedBy?.length || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Units</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsEditOpen(true)}
                        className="flex-1 h-12 rounded-xl border-border hover:bg-primary hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"
                    >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Transmission
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleDelete}
                        className="flex-1 h-12 rounded-xl border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Terminate
                    </Button>
                </div>
            </div>
        )}

        <div className="mt-6 flex justify-end">
            <button 
                onClick={() => onOpenChange(false)}
                className="px-8 h-12 rounded-xl bg-secondary hover:bg-secondary/80 transition-all text-xs font-black uppercase tracking-widest"
            >
                Dismiss
            </button>
        </div>

        {canManage && (
            <EditAnnouncementDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                announcement={announcement}
                userProfile={userProfile}
            />
        )}
      </DialogContent>
    </Dialog>
  );
}

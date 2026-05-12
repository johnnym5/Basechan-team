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
import { User, Calendar, Eye } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface AnnouncementDetailDialogProps {
  announcement: Announcement;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userProfile: UserProfile;
}

export function AnnouncementDetailDialog({ announcement, isOpen, onOpenChange, userProfile }: AnnouncementDetailDialogProps) {
  const isAdmin = userProfile.role === 'ORG_ADMIN' || userProfile.role === 'MANAGING_DIRECTOR' || userProfile.role === 'HR_MANAGER';

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

        {isAdmin && (
            <div className="mt-4 p-4 rounded-xl border border-primary/10 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                        <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Audience Reach</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">View Analytics</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold font-headline">{announcement.viewedBy?.length || 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Staff Members</p>
                </div>
            </div>
        )}

        <div className="mt-6 flex justify-end">
            <button 
                onClick={() => onOpenChange(false)}
                className="px-6 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
                Close
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

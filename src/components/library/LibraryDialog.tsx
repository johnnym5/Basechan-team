'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LibraryPageContent } from './LibraryPageContent';

interface LibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LibraryDialog({ open, onOpenChange }: LibraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>Knowledge Base & Library</DialogTitle>
            <DialogDescription>Centralized repository for onboarding documents and policies.</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <LibraryPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

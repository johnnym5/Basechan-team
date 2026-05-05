'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LibraryPageContent } from './LibraryPageContent';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';

interface LibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LibraryDialog({ open, onOpenChange }: LibraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="top" className="flex flex-col p-0">
        <PanelSwitcher />
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Knowledge Base & Library</DialogTitle>
            <DialogDescription>Centralized repository for onboarding documents and policies.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <LibraryPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

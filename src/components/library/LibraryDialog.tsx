'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LibraryPageContent } from './LibraryPageContent';

interface LibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
}

/**
 * Library workstation workstation panel.
 * Provides a high-velocity interface for organizational SOPs and documentation.
 */
export function LibraryDialog({ open, onOpenChange, modal = false }: LibraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position={modal ? "center" : "left"} className="flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Knowledge Base & Library</DialogTitle>
          <DialogDescription>Centralized repository for onboarding documents and policies.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <LibraryPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

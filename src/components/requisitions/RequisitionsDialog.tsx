'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RequisitionsPageContent } from './RequisitionsPageContent';

interface RequisitionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { reqId?: string };
}

export function RequisitionsDialog({ open, onOpenChange, initialPayload }: RequisitionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>Procurement & Requisitions</DialogTitle>
            <DialogDescription>Manage organizational financial requests and external vendor procurement.</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <RequisitionsPageContent initialPayload={initialPayload} />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
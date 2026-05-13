'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReportsPageContent } from './ReportsPageContent';

interface ReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { tab?: string };
}

export function ReportsDialog({ open, onOpenChange, initialPayload }: ReportsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>Organizational Analytics</DialogTitle>
            <DialogDescription>Analyze performance and review team reports.</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <ReportsPageContent initialPayload={initialPayload} />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
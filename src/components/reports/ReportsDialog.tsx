
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReportsPageContent } from './ReportsPageContent';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';


interface ReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportsDialog({ open, onOpenChange }: ReportsDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col p-0">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Reports</DialogTitle>
            <DialogDescription>Analyze performance and review team reports.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <ReportsPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

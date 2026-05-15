'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ReportsPageContent } from './ReportsPageContent';
import { cn } from '@/lib/utils';

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
        {/* Use native high-visibility scrolling for complex report content */}
        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] p-8 pb-32 custom-scrollbar">
            <ReportsPageContent initialPayload={initialPayload} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

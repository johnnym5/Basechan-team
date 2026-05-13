'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AttendancePageContent } from './AttendancePageContent';

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceDialog({ open, onOpenChange }: AttendanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <div className="sr-only">
          <DialogHeader>
              <DialogTitle>Attendance Center</DialogTitle>
              <DialogDescription>Manage your work hours and see who's currently online.</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <AttendancePageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
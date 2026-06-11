'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccountingPageContent } from './AccountingPageContent';

interface AccountingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountingDialog({ open, onOpenChange }: AccountingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <DialogHeader className="sr-only">
            <DialogTitle>Financial Accounting</DialogTitle>
            <DialogDescription>Manage your organization's finances, chart of accounts, and ledgers.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <AccountingPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccountingPageContent } from './AccountingPageContent';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';


interface AccountingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountingDialog({ open, onOpenChange }: AccountingDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <VisuallyHidden>
          <DialogHeader>
              <DialogTitle>Accounting</DialogTitle>
              <DialogDescription>Manage your organization's finances, chart of accounts, and ledgers.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <AccountingPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

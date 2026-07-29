'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { StaffDirectoryTable } from './StaffDirectoryTable';
import { StaffProfileView } from './StaffProfileView';
import type { UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';

interface StaffDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
  permissions: Permissions;
  modal?: boolean;
}

export function StaffDirectoryDialog({
  open,
  onOpenChange,
  currentUserProfile,
  permissions,
  modal = false
}: StaffDirectoryDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setSelectedUserId(null);
    }} modal={modal}>
      <DialogContent position="left" className="flex flex-col p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Staff Directory & Profiles</DialogTitle>
          <DialogDescription>Manage and view organization staff members.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden relative w-full h-full flex flex-col bg-background/20">
          <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar scroll-smooth">
            <div className="p-4 md:p-8 lg:p-10">
              {selectedUserId ? (
                <StaffProfileView
                  userId={selectedUserId}
                  onBack={() => setSelectedUserId(null)}
                  currentUserProfile={currentUserProfile}
                  permissions={permissions}
                />
              ) : (
                <div className="space-y-8">
                   <div>
                    <h1 className="text-4xl font-black font-headline tracking-tighter">Staff Directory</h1>
                    <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold opacity-60">Human Resources & Unit Identification</p>
                  </div>
                  <StaffDirectoryTable
                    orgId={currentUserProfile.orgId}
                    onViewProfile={setSelectedUserId}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

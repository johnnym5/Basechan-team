'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Employee360Profile } from './Employee360Profile';
import { UnifiedStaffDirectory } from './UnifiedStaffDirectory';
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
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <div className="h-full p-4 md:p-8 lg:p-10 flex flex-col min-h-0">
              {selectedUserId ? (
                <Employee360Profile
                  userId={selectedUserId}
                  orgId={currentUserProfile.orgId}
                  onBack={() => setSelectedUserId(null)}
                  currentUserProfile={currentUserProfile}
                  permissions={permissions}
                />
              ) : (
                <div className="space-y-8 h-full flex flex-col">
                   <div className="shrink-0">
                    <h1 className="text-4xl font-black font-headline tracking-tighter uppercase">Command Center: Team</h1>
                    <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold opacity-60">Human Resources & Operational Identifying Nodes</p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <UnifiedStaffDirectory
                      orgId={currentUserProfile.orgId}
                      currentUserProfile={currentUserProfile}
                      canManageStaff={permissions.canManageStaff}
                      onViewEmployee360={setSelectedUserId}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

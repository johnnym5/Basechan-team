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

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

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
      <DialogContent position={modal ? "center" : "left"} className="flex flex-col p-0 overflow-hidden border-none apple-glass">
        <DialogHeader className="sr-only">
          <DialogTitle>Staff Directory & Profiles</DialogTitle>
          <DialogDescription>Manage and view organization staff members.</DialogDescription>
        </DialogHeader>

        <ModuleContainer
            title={selectedUserId ? "Staff Node 360" : "Command Center: Team"}
            subtitle={selectedUserId ? "Deep Personnel Intelligence & Tactical Summary" : "Human Resources & Operational Identifying Nodes"}
        >
            <div className="flex-1 min-h-0 relative w-full h-full flex flex-col">
              {selectedUserId ? (
                <Employee360Profile
                  userId={selectedUserId}
                  orgId={currentUserProfile.orgId}
                  onBack={() => setSelectedUserId(null)}
                  currentUserProfile={currentUserProfile}
                  permissions={permissions}
                />
              ) : (
                <UnifiedStaffDirectory
                  orgId={currentUserProfile.orgId}
                  currentUserProfile={currentUserProfile}
                  canManageStaff={permissions.canManageStaff}
                  onViewEmployee360={setSelectedUserId}
                />
              )}
            </div>
        </ModuleContainer>
      </DialogContent>
    </Dialog>
  );
}

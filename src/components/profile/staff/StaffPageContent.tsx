'use client';

import { useState } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedStaffDirectory } from './UnifiedStaffDirectory';
import { Employee360Profile } from './Employee360Profile';
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export function StaffPageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null
    , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile || null);

  if (isProfileLoading) {
    return (
      <div className="space-y-8 p-10">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <ModuleContainer
        title={selectedUserId ? "Employee Overview" : "Team Directory"}
        subtitle={selectedUserId ? "Comprehensive employee profile & performance summary" : "Human Resources & Team Member Directory"}
    >
        <div className="flex-1 min-h-0 relative w-full h-full flex flex-col">
            {selectedUserId ? (
                <Employee360Profile
                    userId={selectedUserId}
                    orgId={userProfile.orgId}
                    onBack={() => setSelectedUserId(null)}
                    currentUserProfile={userProfile}
                    permissions={permissions}
                />
            ) : (
                <UnifiedStaffDirectory
                    orgId={userProfile.orgId}
                    currentUserProfile={userProfile}
                    canManageStaff={permissions.canManageStaff}
                    onViewEmployee360={setSelectedUserId}
                />
            )}
        </div>
    </ModuleContainer>
  );
}

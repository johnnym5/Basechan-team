'use client';

import { useRouter } from "next/navigation";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedStaffDirectory } from "@/components/profile/staff/UnifiedStaffDirectory";

export default function StaffDirectoryPage() {
    const router = useRouter();
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        firestore && authUser ? doc(firestore, "users", authUser.uid) : null
        , [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile || null);

    if (isProfileLoading) {
        return <Skeleton className="h-full w-full rounded-[2rem]" />;
    }

    if (!userProfile) return null;

    return (
        <div className="flex-1 min-h-0 relative w-full h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
            <UnifiedStaffDirectory
                orgId={userProfile.orgId}
                currentUserProfile={userProfile}
                canManageStaff={permissions.canManageStaff}
                onViewEmployee360={(userId) => router.push(`/staff/profile?id=${userId}`)}
            />
        </div>
    );
}

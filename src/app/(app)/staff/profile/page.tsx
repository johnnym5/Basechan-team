'use client';

import { useSearchParams, useRouter } from "next/navigation";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Employee360Profile } from "@/components/profile/staff/Employee360Profile";

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export default function StaffProfilePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    // Read ID from search params, fallback to current user
    const userId = searchParams.get('id') || authUser?.uid;

    const userProfileRef = useMemoFirebase(() =>
        firestore && authUser ? doc(firestore, "users", authUser.uid) : null
        , [firestore, authUser]);
    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(currentUserProfile || null);

    if (isProfileLoading) {
        return <Skeleton className="h-full w-full rounded-[2rem]" />;
    }

    if (!currentUserProfile || !userId) return null;

    return (
        <ModuleContainer
            title="Personnel Profile"
            subtitle="Detailed Staff Overview & Credentials"
            noScroll={true}
        >
            <div className="flex-1 min-h-0 relative w-full h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
                <Employee360Profile
                    userId={userId}
                    orgId={currentUserProfile.orgId}
                    currentUserProfile={currentUserProfile}
                    permissions={permissions}
                    onBack={() => router.push('/staff')}
                />
            </div>
        </ModuleContainer>
    );
}

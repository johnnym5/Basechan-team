'use client';

import { useParams, useRouter } from "next/navigation";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Employee360Profile } from "@/components/profile/staff/Employee360Profile";

export default function StaffProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;
    const { user: authUser } = useUser();
    const firestore = useFirestore();

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
        <div className="flex-1 min-h-0 relative w-full h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
            <Employee360Profile
                userId={userId}
                orgId={currentUserProfile.orgId}
                currentUserProfile={currentUserProfile}
                permissions={permissions}
                onBack={() => router.push('/staff')}
            />
        </div>
    );
}

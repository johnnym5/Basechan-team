'use client';

import { WebDashboardPageContent } from "@/components/dashboards/WebDashboardPageContent";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

import { useSearchParams } from "next/navigation";

export default function LiveDisplayPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const displayId = searchParams.get('id');

    const userProfileRef = useMemoFirebase(() =>
        firestore && authUser ? doc(firestore, "users", authUser.uid) : null
        , [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile || null);

    if (isProfileLoading) {
        return (
            <div className="p-10 h-full">
                <Skeleton className="h-full w-full rounded-[2.5rem]" />
            </div>
        );
    }

    if (!userProfile || !permissions.canAccessDisplays) {
        return null;
    }

    return (
        <ModuleContainer noScroll={true} className="border-none bg-transparent shadow-none h-full">
            <WebDashboardPageContent initialPayload={displayId ? { displayId } : undefined} />
        </ModuleContainer>
    );
}

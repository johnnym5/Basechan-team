'use client';

import { TasksPageContent } from "@/components/tasks/TasksPageContent";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export default function TasksPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        firestore && authUser ? doc(firestore, "users", authUser.uid) : null
        , [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile || null);

    if (isProfileLoading) {
        return (
            <div className="p-10">
                <Skeleton className="h-[600px] w-full rounded-[2.5rem]" />
            </div>
        );
    }

    return (
        <ModuleContainer noScroll={true} className="border-none bg-transparent shadow-none">
            <TasksPageContent currentUserProfile={userProfile || null} permissions={permissions} />
        </ModuleContainer>
    );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListTodo, FileText, CalendarPlus, BookOpenCheck, UserPlus, Megaphone, MessageSquare } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";
import { uiEmitter } from "@/lib/ui-emitter";
import { Skeleton } from "../ui/skeleton";

export function QuickActions() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        authUser ? doc(firestore, "users", authUser.uid) : null,
        [firestore, authUser]
    );
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    if (isLoading) {
        return <Skeleton className="h-48 w-full" />
    }

    const actions = [
        { label: "New Task", icon: ListTodo, action: () => uiEmitter.emit('open-assign-task-dialog'), permission: true },
        { label: "New Requisition", icon: FileText, action: () => uiEmitter.emit('open-new-requisition-dialog'), permission: permissions.canAccessRequisitions },
        { label: "Request Leave", icon: CalendarPlus, action: () => uiEmitter.emit('open-leave-dialog'), permission: true },
        { label: "New Workbook", icon: BookOpenCheck, action: () => uiEmitter.emit('open-new-workbook-dialog'), permission: true },
        { label: "New Chat", icon: MessageSquare, action: () => uiEmitter.emit('open-chat-dialog'), permission: permissions.canAccessChat },
        { label: "Add Member", icon: UserPlus, action: () => uiEmitter.emit('open-invite-user-dialog'), permission: permissions.canManageStaff },
        { label: "Announcement", icon: Megaphone, action: () => uiEmitter.emit('open-new-announcement-dialog'), permission: permissions.canManageAnnouncements },
    ].filter(a => a.permission);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                {actions.map(({ label, icon: Icon, action }) => (
                    <Button key={label} variant="outline" className="flex flex-col h-auto py-3" onClick={action}>
                        <Icon className="h-5 w-5 mb-1" />
                        <span className="text-xs">{label}</span>
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}

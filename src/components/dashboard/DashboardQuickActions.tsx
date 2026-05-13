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

export function DashboardQuickActions() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        authUser ? doc(firestore!, "users", authUser.uid) : null,
        [firestore, authUser]
    );
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    if (isLoading) {
        return <Skeleton className="h-48 w-full" />
    }

    const actions = [
        { label: "Add Member", icon: UserPlus, action: () => uiEmitter.emit('open-invite-user-dialog'), permission: permissions.canManageStaff },
        { label: "New Task", icon: ListTodo, action: () => uiEmitter.emit('open-assign-task-dialog'), permission: true },
        { label: "New Requisition", icon: FileText, action: () => uiEmitter.emit('open-new-requisition-dialog'), permission: permissions.canAccessRequisitions },
        { label: "Request Leave", icon: CalendarPlus, action: () => uiEmitter.emit('open-leave-dialog'), permission: true },
        { label: "New Workbook", icon: BookOpenCheck, action: () => uiEmitter.emit('open-new-workbook-dialog'), permission: true },
        { label: "New Chat", icon: MessageSquare, action: () => uiEmitter.emit('open-chat-dialog'), permission: permissions.canAccessChat },
        { label: "Announcement", icon: Megaphone, action: () => uiEmitter.emit('open-new-announcement-dialog'), permission: permissions.canManageAnnouncements },
    ].filter(a => a.permission);

    return (
        <Card className="apple-glass border-none shadow-xl h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Mission Quick-start</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
                {actions.map(({ label, icon: Icon, action }) => (
                    <Button 
                        key={label} 
                        variant="outline" 
                        className="flex flex-col h-auto py-4 rounded-2xl bg-background/50 border-white/5 hover:bg-primary/10 hover:border-primary/50 transition-all interactive-element group" 
                        onClick={action}
                    >
                        <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-2">
                            <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}

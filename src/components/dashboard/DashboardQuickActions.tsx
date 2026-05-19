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
        return <Skeleton className="h-32 w-full rounded-2xl" />
    }

    const actions = [
        { label: "Staff", icon: UserPlus, action: () => uiEmitter.emit('open-invite-user-dialog'), permission: permissions.canManageStaff },
        { label: "Task", icon: ListTodo, action: () => uiEmitter.emit('open-assign-task-dialog'), permission: true },
        { label: "Req", icon: FileText, action: () => uiEmitter.emit('open-new-requisition-dialog'), permission: permissions.canAccessRequisitions },
        { label: "Leave", icon: CalendarPlus, action: () => uiEmitter.emit('open-request-leave-dialog'), permission: true },
        { label: "Grid", icon: BookOpenCheck, action: () => uiEmitter.emit('open-new-workbook-dialog'), permission: true },
        { label: "Chat", icon: MessageSquare, action: () => uiEmitter.emit('open-chat-dialog'), permission: permissions.canAccessChat },
        { label: "Announce", icon: Megaphone, action: () => uiEmitter.emit('open-new-announcement-dialog'), permission: permissions.canManageAnnouncements },
    ].filter(a => a.permission);

    return (
        <Card className="apple-glass border-none shadow-xl overflow-hidden">
            <CardHeader className="py-3 px-5">
                <CardTitle className="text-[8px] font-black uppercase tracking-[0.25em] text-primary opacity-70">Mission Quick-start</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 p-4 pt-0">
                {actions.map(({ label, icon: Icon, action }) => (
                    <Button 
                        key={label} 
                        variant="outline" 
                        className="flex items-center justify-start gap-2 h-9 px-2 rounded-xl bg-background/40 border-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all group" 
                        onClick={action}
                    >
                        <div className="p-1 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                            <Icon className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-tight truncate">{label}</span>
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}

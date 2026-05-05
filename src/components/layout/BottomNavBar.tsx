'use client';

import { uiEmitter } from "@/lib/ui-emitter";
import { Plus, LayoutDashboard, CalendarDays, ListTodo, BookOpen, FileText, CalendarPlus, BookOpenCheck, MessageSquare, Megaphone, UserPlus } from 'lucide-react';
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { usePermissions } from "@/hooks/usePermissions";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface BottomNavBarProps {
    onFabClick: () => void;
}

export function BottomNavBar({ onFabClick }: BottomNavBarProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  
  if (!user) {
    return null;
  }

  const handleDialogClick = (dialog: string) => {
    uiEmitter.emit(`open-${dialog}-dialog` as any);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 md:hidden">
      <div className="max-w-md mx-auto glass-dark rounded-3xl px-2 py-2 flex items-center justify-between shadow-2xl shadow-black/50">
        <button onClick={() => { window.location.href = '/'; }} className="flex-1 flex flex-col items-center gap-1 py-2 text-primary transition-transform duration-200 hover:scale-110">
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-[0.625rem] font-bold uppercase tracking-wider">Dashboard</span>
        </button>
        <button onClick={() => handleDialogClick('attendance')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 transition-transform duration-200 hover:scale-110">
            <CalendarDays className="h-6 w-6" />
            <span className="text-[0.625rem] font-bold uppercase tracking-wider">Attendance</span>
        </button>

        <div className="px-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="size-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-110 active:scale-95">
                        <Plus className="h-6 w-6"/>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-4 rounded-2xl p-2 bg-background/95 backdrop-blur-xl border-primary/20 shadow-2xl" align="center" side="top" sideOffset={10}>
                    {permissions.canManageStaff && (
                        <DropdownMenuItem onSelect={() => handleDialogClick('invite-user')} className="rounded-xl py-3">
                            <UserPlus className="mr-3 h-5 w-5 text-primary" />
                            <span className="font-semibold">Add Member</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => handleDialogClick('assign-task')} className="rounded-xl py-3">
                        <ListTodo className="mr-3 h-5 w-5 text-primary" />
                        <span className="font-semibold">New Task</span>
                    </DropdownMenuItem>
                    {permissions.canAccessRequisitions && (
                        <DropdownMenuItem onSelect={() => handleDialogClick('new-requisition')} className="rounded-xl py-3">
                            <FileText className="mr-3 h-5 w-5 text-primary" />
                            <span className="font-semibold">New Requisition</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => handleDialogClick('request-leave')} className="rounded-xl py-3">
                        <CalendarPlus className="mr-3 h-5 w-5 text-primary" />
                        <span className="font-semibold">Request Leave</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleDialogClick('new-workbook')} className="rounded-xl py-3">
                        <BookOpenCheck className="mr-3 h-5 w-5 text-primary" />
                        <span className="font-semibold">New Workbook</span>
                    </DropdownMenuItem>
                    {permissions.canManageAnnouncements && (
                        <DropdownMenuItem onSelect={() => handleDialogClick('new-announcement')} className="rounded-xl py-3">
                            <Megaphone className="mr-3 h-5 w-5 text-primary" />
                            <span className="font-semibold">Announcement</span>
                        </DropdownMenuItem>
                    )}
                    {permissions.canAccessChat && (
                        <DropdownMenuItem onSelect={() => handleDialogClick('chat')} className="rounded-xl py-3">
                            <MessageSquare className="mr-3 h-5 w-5 text-primary" />
                            <span className="font-semibold">New Chat</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <button onClick={() => handleDialogClick('tasks')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 transition-transform duration-200 hover:scale-110">
            <ListTodo className="h-6 w-6" />
            <span className="text-[0.625rem] font-bold uppercase tracking-wider">Tasks</span>
        </button>
        <button onClick={() => handleDialogClick('workbooks')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 transition-transform duration-200 hover:scale-110">
             <BookOpen className="h-6 w-6" />
            <span className="text-[0.625rem] font-bold uppercase tracking-wider">Workbooks</span>
        </button>
      </div>
    </nav>
  );
}

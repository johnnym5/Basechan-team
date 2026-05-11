'use client';

import { uiEmitter } from "@/lib/ui-emitter";
import { Plus, LayoutDashboard, CalendarDays, ListTodo, BookOpen, FileText, CalendarPlus, BookOpenCheck, MessageSquare, Megaphone, UserPlus, Fingerprint } from 'lucide-react';
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
    <nav className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 md:hidden pointer-events-none">
      <div className="max-w-md mx-auto apple-glass-darker rounded-[2.5rem] px-2 py-2 flex items-center justify-between shadow-2xl pointer-events-auto border-white/10 ring-1 ring-white/5">
        <button onClick={() => { window.location.href = '/'; }} className="flex-1 flex flex-col items-center gap-1 py-2 text-primary transition-all duration-300 hover:scale-110 active:scale-90">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Dash</span>
        </button>
        <button onClick={() => handleDialogClick('attendance')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-400 transition-all duration-300 hover:scale-110 active:scale-90">
            <Fingerprint className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Shift</span>
        </button>

        <div className="px-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="size-14 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40 transition-all duration-500 hover:scale-110 active:scale-90 ring-4 ring-background">
                        <Plus className="h-7 w-7"/>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mb-6 rounded-[2rem] p-3 apple-glass-darker border-white/10 shadow-3xl animate-pop-in" align="center" side="top" sideOffset={15}>
                    <div className="grid grid-cols-2 gap-2">
                        {permissions.canManageStaff && (
                            <DropdownMenuItem onSelect={() => handleDialogClick('invite-user')} className="rounded-2xl py-4 flex-col gap-2 h-auto text-center border border-white/5 hover:bg-primary/10">
                                <UserPlus className="h-6 w-6 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Add Personnel</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => handleDialogClick('assign-task')} className="rounded-2xl py-4 flex-col gap-2 h-auto text-center border border-white/5 hover:bg-primary/10">
                            <ListTodo className="h-6 w-6 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">New Mission</span>
                        </DropdownMenuItem>
                        {permissions.canAccessRequisitions && (
                            <DropdownMenuItem onSelect={() => handleDialogClick('new-requisition')} className="rounded-2xl py-4 flex-col gap-2 h-auto text-center border border-white/5 hover:bg-primary/10">
                                <FileText className="h-6 w-6 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Procurement</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => handleDialogClick('request-leave')} className="rounded-2xl py-4 flex-col gap-2 h-auto text-center border border-white/5 hover:bg-primary/10">
                            <CalendarPlus className="h-6 w-6 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Time Off</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDialogClick('new-workbook')} className="rounded-2xl py-4 flex-col gap-2 h-auto text-center border border-white/5 hover:bg-primary/10">
                            <BookOpenCheck className="h-6 w-6 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Data Grid</span>
                        </DropdownMenuItem>
                        {permissions.canAccessChat && (
                            <DropdownMenuItem onSelect={() => handleDialogClick('chat')} className="rounded-2xl py-4 flex-col gap-2 h-auto text-center border border-white/5 hover:bg-primary/10">
                                <MessageSquare className="h-6 w-6 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Secure Comms</span>
                            </DropdownMenuItem>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <button onClick={() => handleDialogClick('tasks')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-400 transition-all duration-300 hover:scale-110 active:scale-90">
            <ListTodo className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Missions</span>
        </button>
        <button onClick={() => handleDialogClick('workbooks')} className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-400 transition-all duration-300 hover:scale-110 active:scale-90">
             <BookOpen className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Storage</span>
        </button>
      </div>
    </nav>
  );
}

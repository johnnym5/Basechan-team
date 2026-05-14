'use client';

import { uiEmitter } from "@/lib/ui-emitter";
import { Plus, LayoutDashboard, CalendarCheck2, ListTodo, BookOpen, Fingerprint, Search, MessageSquare, User } from 'lucide-react';
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { usePermissions } from "@/hooks/usePermissions";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function BottomNavBar() {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  
  if (!user) return null;

  const currentPanel = searchParams.get('panel');
  const isActive = (panel: string) => currentPanel === panel;

  const handleNav = (panel: string | null) => {
    if (!panel) {
        uiEmitter.emit('close-all-dialogs');
        return;
    }
    uiEmitter.emit(`open-${panel}-dialog` as any);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden">
      {/* Tab Bar Background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_32px_0_rgba(0,0,0,0.1)]" />
      
      <div className="relative h-20 max-w-lg mx-auto flex items-center justify-between px-2 pb-safe">
        {/* Dash */}
        <button onClick={() => window.location.href = '/'} className={cn("flex-1 flex flex-col items-center gap-1.5 transition-all duration-300", !currentPanel ? "mobile-tab-active" : "text-muted-foreground opacity-60")}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
        </button>

        {/* Attendance */}
        <button onClick={() => handleNav('attendance')} className={cn("flex-1 flex flex-col items-center gap-1.5 transition-all duration-300", isActive('attendance') ? "mobile-tab-active" : "text-muted-foreground opacity-60")}>
            <Fingerprint className="h-5 w-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Shift</span>
        </button>

        {/* Central Command FAB */}
        <div className="relative -top-6 px-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="size-16 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40 ring-4 ring-background transition-all active:scale-90 active:rotate-45">
                        <Plus className="h-8 w-8"/>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mb-6 rounded-[2.5rem] p-4 apple-glass-darker border-white/10 shadow-3xl animate-pop-in" align="center" side="top" sideOffset={15}>
                    <div className="grid grid-cols-2 gap-3">
                        <DropdownMenuItem onSelect={() => handleNav('assign-task')} className="rounded-2xl py-4 flex-col gap-2 border border-white/5 bg-background/40">
                            <ListTodo className="h-6 w-6 text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Mission</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleNav('chat')} className="rounded-2xl py-4 flex-col gap-2 border border-white/5 bg-background/40">
                            <MessageSquare className="h-6 w-6 text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Message</span>
                        </DropdownMenuItem>
                        {permissions.canManageStaff && (
                            <DropdownMenuItem onSelect={() => handleNav('invite-user')} className="rounded-2xl py-4 flex-col gap-2 border border-white/5 bg-background/40">
                                <User className="h-6 w-6 text-primary" />
                                <span className="text-[9px] font-black uppercase tracking-tighter">Staff</span>
                            </DropdownMenuItem>
                        )}
                         <DropdownMenuItem onSelect={() => handleNav('workbooks')} className="rounded-2xl py-4 flex-col gap-2 border border-white/5 bg-background/40">
                            <BookOpen className="h-6 w-6 text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Grid</span>
                        </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Missions */}
        <button onClick={() => handleNav('tasks')} className={cn("flex-1 flex flex-col items-center gap-1.5 transition-all duration-300", isActive('tasks') ? "mobile-tab-active" : "text-muted-foreground opacity-60")}>
            <ListTodo className="h-5 w-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Tasks</span>
        </button>

        {/* Data */}
        <button onClick={() => handleNav('workbooks')} className={cn("flex-1 flex flex-col items-center gap-1.5 transition-all duration-300", isActive('workbooks') ? "mobile-tab-active" : "text-muted-foreground opacity-60")}>
             <BookOpen className="h-5 w-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Data</span>
        </button>
      </div>
    </nav>
  );
}
'use client';

import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutGrid, User, LayoutDashboard, Users, CalendarCheck2, ListTodo, Landmark, Settings, BarChart, Library, MonitorDot, MessageSquare, PlusCircle, CalendarPlus } from "lucide-react";
import { mainNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { useAuth, useDoc, useMemoFirebase, useFirestore, useUser } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { signOut } from "firebase/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { uiEmitter } from "@/lib/ui-emitter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppNavFAB() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile || null);

  const handleLogout = async () => {
    if (auth && firestore && authUser?.uid) {
        try {
            const userRef = doc(firestore, 'users', authUser.uid);
            await updateDoc(userRef, { activeSessionId: null, status: 'OFFLINE' });
            localStorage.removeItem('basechan-active-session');
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }
  };

  const handleNavClick = (item: any) => {
    setIsOpen(false);
    uiEmitter.emit('close-all-dialogs');

    if (item.href) {
        router.push(item.href);
    } else if (item.dialog) {
        setTimeout(() => {
            uiEmitter.emit(`open-${item.dialog}-dialog` as any);
        }, 50);
    }
  };

  if (!authUser) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[2000]">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className={cn(
                "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 active:scale-95 group",
                isOpen ? "bg-primary text-black" : "bg-black/80 text-white hover:bg-black/90 backdrop-blur-md border border-white/10"
            )}
          >
            <LayoutGrid className={cn("h-6 w-6 transition-transform duration-300", isOpen && "rotate-90")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
            side="top"
            align="end"
            sideOffset={16}
            collisionPadding={20}
            className="w-72 bg-card/90 backdrop-blur-xl border border-border/50 rounded-[2rem] p-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
        >
          <ScrollArea className="max-h-[min(80vh,600px)] w-full">
            <div className="flex flex-col gap-1 p-2">
              <div className="px-4 py-3 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-70">Operational Matrix</p>
              </div>

              <div className="grid grid-cols-1 gap-1">
                  {mainNavItems.map((item: any, idx) => {
                      if (item.isSeparator) return <Separator key={`sep-${idx}`} className="my-2 bg-white/5 mx-2" />;

                      if ('permission' in item && !permissions[item.permission as keyof typeof permissions]) return null;

                      const isActive = pathname === item.href;

                      return (
                          <button
                              key={item.label}
                              onClick={() => handleNavClick(item)}
                              className={cn(
                                  "w-full flex items-center h-12 px-4 rounded-2xl transition-all duration-200 group relative overflow-hidden",
                                  isActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                              )}
                          >
                              <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-active:scale-90", isActive && "text-primary")} />
                              <span className="ml-4 text-[11px] font-black uppercase tracking-widest">
                                  {item.label}
                              </span>
                              {isActive && (
                                  <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(202,179,72,0.6)]" />
                              )}
                          </button>
                      );
                  })}
              </div>

              <Separator className="my-2 bg-white/5 mx-2" />

              <div className="px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 opacity-70">Quick Operations</p>
              </div>

              <div className="grid grid-cols-1 gap-1">
                <button
                    onClick={() => { setIsOpen(false); uiEmitter.emit('open-assign-task-dialog'); }}
                    className="w-full flex items-center h-12 px-4 rounded-2xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                    <PlusCircle className="w-5 h-5 shrink-0" />
                    <span className="ml-4 text-[11px] font-black uppercase tracking-widest">Add New Task</span>
                </button>
                <button
                    onClick={() => { setIsOpen(false); uiEmitter.emit('open-new-requisition-dialog'); }}
                    className="w-full flex items-center h-12 px-4 rounded-2xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                    <Landmark className="w-5 h-5 shrink-0" />
                    <span className="ml-4 text-[11px] font-black uppercase tracking-widest">Submit Requisition</span>
                </button>
                {permissions.canRequestLeave && (
                    <button
                        onClick={() => { setIsOpen(false); uiEmitter.emit('open-request-leave-dialog'); }}
                        className="w-full flex items-center h-12 px-4 rounded-2xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all duration-200"
                    >
                        <CalendarPlus className="w-5 h-5 shrink-0" />
                        <span className="ml-4 text-[11px] font-black uppercase tracking-widest">Request Leave</span>
                    </button>
                )}
              </div>

              <Separator className="my-2 bg-white/5 mx-2" />

              <button
                  onClick={handleLogout}
                  className="w-full flex items-center h-12 px-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all duration-200 group mb-1"
              >
                  <LogOut className="w-5 h-5 shrink-0 transition-transform group-active:translate-x-1" />
                  <span className="ml-4 text-[11px] font-black uppercase tracking-widest">Terminate Session</span>
              </button>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

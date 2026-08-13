'use client';

import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutGrid, User, LayoutDashboard, Users, CalendarCheck2, ListTodo, Settings, BarChart, Library, MonitorDot, MessageSquare, Search } from "lucide-react";
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
                "h-16 w-16 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 active:scale-95 group border-none",
                isOpen
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#0b121e] text-white dark:bg-[#f5d547] dark:text-[#0b121e] hover:opacity-90"
            )}
          >
            <LayoutGrid className={cn("h-7 w-7 transition-transform duration-300", isOpen && "rotate-90")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
            side="top"
            align="end"
            sideOffset={16}
            collisionPadding={20}
            className="w-72 bg-card/95 backdrop-blur-xl border border-border rounded-[2rem] p-0 shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
        >
          <ScrollArea className="max-h-[min(80vh,600px)] w-full">
            <div className="flex flex-col gap-1 p-2">
              <div className="px-4 py-3 mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary opacity-70">Operational Matrix</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/20 text-primary"
                    onClick={() => {
                        setIsOpen(false);
                        uiEmitter.emit('open-command-palette' as any);
                    }}
                  >
                      <Search className="h-4 w-4" />
                  </Button>
              </div>

              <div className="grid grid-cols-1 gap-1">
                  {mainNavItems.filter((item: any) => !['Leave', 'Reports'].includes(item.label)).map((item: any, idx) => {
                      if (item.isSeparator) return <Separator key={`sep-${idx}`} className="my-2 bg-border mx-2" />;

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
                                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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

              <Separator className="my-2 bg-border mx-2" />

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

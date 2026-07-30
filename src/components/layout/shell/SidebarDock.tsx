'use client';

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { LogOut, BookCopy, User, ChevronRight, LayoutDashboard, CalendarCheck2, ListTodo, Landmark, Settings, Users, BarChart } from "lucide-react";
import { mainNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth, useDoc, useMemoFirebase, useFirestore, useUser } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { signOut } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { uiEmitter } from "@/lib/ui-emitter";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarDockProps {
    isLoggedIn: boolean;
    isAuthLoading: boolean;
}

const groups = [
    { label: 'Core Operations', items: ['Dashboard', 'Tasks', 'Workbooks', 'Live Displays'] },
    { label: 'People & HR', items: ['Staff', 'Attendance', 'Leave'] },
    { label: 'Finance & Analytics', items: ['Finance', 'Reports', 'Library'] },
    { label: 'System Admin', items: ['Admin Console', 'Chat'] },
];

export function SidebarDock({ isLoggedIn, isAuthLoading }: SidebarDockProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
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
    const isCurrentPanel = searchParams.get('panel') === item.dialog;
    const isCurrentPath = pathname === item.href;
    const isActive = isCurrentPath || isCurrentPanel;

    uiEmitter.emit('close-all-dialogs');

    if (isActive && item.dialog) {
        router.push(pathname);
        return;
    }

    if (item.href) {
        router.push(item.href);
    } else if (item.dialog) {
        setTimeout(() => {
            uiEmitter.emit(`open-${item.dialog}-dialog` as any);
        }, 50);
    }
  };

  if (!mounted) return <aside className="w-20 bg-black/20 border-r border-white/10" />;

  return (
    <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
            "h-full flex flex-col border-r border-white/5 bg-[#0d0d0d] transition-all duration-500 ease-spring relative z-[100]",
            isExpanded ? "w-72 shadow-2xl" : "w-[72px]"
        )}
    >
      {/* Brand Header */}
      <div className={cn("p-6 flex items-center transition-all duration-300", isExpanded ? "justify-start" : "justify-center")}>
        <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <BookCopy className="h-6 w-6 text-black shrink-0" />
            </div>
            {isExpanded && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <h1 className="text-xl font-black font-headline tracking-tighter text-white uppercase">Basechan</h1>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary opacity-70">Staff Portal</p>
                </div>
            )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-8 mt-6">
            {groups.map((group) => {
                const groupItems = mainNavItems.filter(item => 'label' in item && group.items.includes(item.label as string));

                if (groupItems.length === 0) return null;

                const groupActive = groupItems.some((item: any) => {
                    const isCurrentPanel = searchParams.get('panel') === item.dialog;
                    const isCurrentPath = pathname === item.href;
                    return isCurrentPath || isCurrentPanel;
                });

                return (
                    <div key={group.label} className="space-y-2">
                        {isExpanded && (
                            <h4 className={cn(
                                "px-4 text-[8px] font-black uppercase tracking-[0.25em] transition-colors duration-500",
                                groupActive ? "text-primary opacity-80" : "text-muted-foreground opacity-40"
                            )}>
                                {group.label}
                            </h4>
                        )}
                        <div className="space-y-1">
                            {groupItems.map((item: any) => {
                                if ('permission' in item && !permissions[item.permission as keyof typeof permissions]) return null;

                                const isCurrentPanel = searchParams.get('panel') === item.dialog;
                                const isCurrentPath = pathname === item.href;
                                const isActive = isCurrentPath || isCurrentPanel;

                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => handleNavClick(item)}
                                        className={cn(
                                            "w-full flex items-center rounded-2xl transition-all duration-300 h-12 group relative",
                                            isExpanded ? "px-4" : "justify-center",
                                            isActive
                                                ? "bg-primary text-black shadow-lg shadow-primary/10"
                                                : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <item.icon className={cn("w-5 h-5 transition-all", !isExpanded && "group-hover:scale-110")} />
                                        {isExpanded && (
                                            <span className="ml-4 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300">
                                                {item.label}
                                            </span>
                                        )}
                                        {isActive && !isExpanded && (
                                            <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(202,179,72,0.5)]" />
                                        )}
                                        {!isExpanded && (
                                            <div className="absolute left-full ml-6 px-3 py-2 bg-[#1a1a1a] text-white text-[9px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-[200] shadow-2xl border border-white/5 translate-x-2 group-hover:translate-x-0">
                                                {item.label}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </nav>
      </ScrollArea>

      {/* User Footer */}
      <div className={cn("p-4 border-t border-white/5 transition-all duration-300", !isExpanded && "flex flex-col items-center")}>
        {isAuthLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
        ) : isLoggedIn ? (
            <div className="flex flex-col gap-4 w-full">
                <div className={cn("flex items-center gap-3 p-2 rounded-2xl transition-all duration-300", isExpanded && "hover:bg-white/5", !isExpanded && "justify-center")}>
                    {isProfileLoading ? (
                      <Skeleton className="h-10 w-10 rounded-full" />
                    ) : userProfile ? (
                      <Avatar
                        className="h-10 w-10 rounded-2xl border border-white/10 hover:border-primary transition-all cursor-pointer shadow-lg"
                        onClick={() => handleNavClick({ dialog: 'profile' })}
                      >
                          <AvatarFallback className="text-[10px] font-black bg-secondary">{userProfile?.fullName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    ) : (
                        <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground">
                             <User className="h-5 w-5" />
                        </div>
                    )}
                    {isExpanded && userProfile && (
                        <div className="flex-1 truncate animate-in fade-in slide-in-from-left-2 duration-300">
                            <p className="text-[10px] font-black uppercase tracking-tight text-white truncate">{userProfile?.fullName}</p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em] truncate mt-0.5">{userProfile?.position}</p>
                        </div>
                    )}
                    {isExpanded && (
                         <button onClick={handleLogout} className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all">
                            <LogOut className="h-4 w-4" />
                         </button>
                    )}
                </div>
            </div>
        ) : null}
      </div>
    </aside>
  );
}

'use client';

import { uiEmitter } from "@/lib/ui-emitter";
import { Plus, LayoutDashboard, Fingerprint, LayoutGrid, X, Sparkles, Bell, LogOut } from 'lucide-react';
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection, useAuth } from "@/firebase";
import { usePermissions } from "@/hooks/usePermissions";
import { doc, collection, query, where, orderBy, limit, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import type { UserProfile, Notification } from "@/lib/types";
import { mainNavItems } from "@/lib/nav-items";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from "../ui/scroll-area";
import { useState } from "react";
import { Button } from "../ui/button";

export function BottomNavBar() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  
  const notificationsQuery = useMemoFirebase(() => 
    firestore && user && userProfile?.orgId ? query(
        collection(firestore, 'notifications'), 
        where('orgId', '==', userProfile.orgId),
        where('userId', '==', user.uid), 
        where('isRead', '==', false), 
        limit(1)
    ) : null
  , [firestore, user, userProfile?.orgId]);
  const { data: unreadNotifications } = useCollection<Notification>(notificationsQuery);
  const hasUnread = (unreadNotifications?.length || 0) > 0;

  if (!user || !userProfile) return null;

  const currentPanel = searchParams.get('panel');
  const isActive = (panel: string) => currentPanel === panel;

  const handleNav = (item: any) => {
    setIsMenuOpen(false);
    const wasActive = isActive(item.dialog || '');
    uiEmitter.emit('close-all-dialogs');
    
    if (item.href === '/') {
        window.location.href = '/';
        return;
    }

    if (item.dialog && !wasActive) {
        setTimeout(() => {
            uiEmitter.emit(`open-${item.dialog}-dialog` as any);
        }, 50);
    }
  };

  const handleLogout = async () => {
    if (auth && user?.uid && firestore) {
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, { activeSessionId: null, status: 'OFFLINE' });
            localStorage.removeItem('basechan-active-session');
            await signOut(auth);
            window.location.href = '/';
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }
  };
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[450] md:hidden">
      {/* Tab Bar Background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_32px_0_rgba(0,0,0,0.1)]" />
      
      <div className="relative h-20 max-w-lg mx-auto flex items-center justify-between px-2 pb-safe">
        {/* Assistant */}
        <button 
            onClick={() => handleNav({ dialog: 'assistant' })} 
            className={cn("flex-1 flex flex-col items-center gap-1.5 transition-all duration-300", isActive('assistant') ? "mobile-tab-active" : "text-muted-foreground opacity-60")}
        >
            <Sparkles className="h-5 w-5" />
            <span className="text-[8px] font-black uppercase tracking-widest text-center leading-none">Assistant</span>
        </button>

        {/* Attendance */}
        <button 
            onClick={() => handleNav({ dialog: 'attendance' })} 
            className={cn("flex-1 flex flex-col items-center gap-1.5 transition-all duration-300", isActive('attendance') ? "mobile-tab-active" : "text-muted-foreground opacity-60")}
        >
            <Fingerprint className="h-5 w-5" />
            <span className="text-[8px] font-black uppercase tracking-widest text-center leading-none">Attendance</span>
        </button>

        {/* Main Menu Trigger */}
        <div className="relative -top-6 px-2">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                    <button className="size-16 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40 ring-4 ring-background transition-all active:scale-90">
                        <LayoutGrid className={cn("h-8 w-8 transition-transform duration-500", isMenuOpen && "rotate-90")} />
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[75dvh] rounded-t-[3rem] apple-glass-darker border-none p-0 overflow-hidden flex flex-col">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted/30 rounded-full z-10" />
                    
                    <div className="flex flex-col h-full pt-10">
                        <SheetHeader className="px-8 pb-6 text-left shrink-0">
                            <SheetTitle className="text-3xl font-black font-headline tracking-tighter">Main Menu</SheetTitle>
                            <SheetDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Select a section</SheetDescription>
                        </SheetHeader>
                        
                        <ScrollArea className="flex-1 px-6">
                            <div className="grid grid-cols-3 gap-4 pb-4">
                                {mainNavItems.map((item, idx) => {
                                    if ('isSeparator' in item) return <div key={idx} className="col-span-3 h-px bg-white/5 my-2" />;
                                    if ('permission' in item && !permissions[item.permission as keyof typeof permissions]) return null;

                                    const ActiveIcon = item.icon;
                                    const isItemActive = isActive(item.dialog || '') || (item.href === '/' && !currentPanel);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleNav(item)}
                                            className={cn(
                                                "flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all active:scale-95 group",
                                                isItemActive 
                                                    ? "bg-primary border-primary text-white shadow-xl shadow-primary/20" 
                                                    : "bg-background/40 border-white/5 text-muted-foreground hover:bg-white/5"
                                            )}
                                        >
                                            <ActiveIcon className={cn("h-6 w-6 transition-transform group-hover:scale-110", isItemActive ? "text-white" : "text-primary")} />
                                            <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight">
                                                {item.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                        
                        <div className="p-6 shrink-0 border-t border-white/5 bg-background/50">
                            <Button 
                                variant="ghost" 
                                onClick={handleLogout}
                                className="w-full h-14 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all interactive-element"
                            >
                                <LogOut className="mr-2 h-5 w-5" />
                                <span className="font-black uppercase tracking-widest text-xs">Sign Out</span>
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>

        {/* Alerts */}
        <button 
            onClick={() => handleNav({ dialog: 'notifications' })} 
            className={cn("flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 relative", isActive('notifications') ? "mobile-tab-active" : "text-muted-foreground opacity-60")}
        >
            <Bell className="h-5 w-5" />
            {hasUnread && (
                <span className="absolute top-0 right-1/4 h-2 w-2 rounded-full bg-destructive border-2 border-background animate-pulse" />
            )}
            <span className="text-[8px] font-black uppercase tracking-widest text-center leading-none">Alerts</span>
        </button>

        {/* Profile */}
        <button 
            onClick={() => handleNav({ dialog: 'profile' })} 
            className={cn("flex-1 flex flex-col items-center gap-1.5 transition-all duration-300", isActive('profile') ? "mobile-tab-active" : "text-muted-foreground opacity-60")}
        >
             <div className="h-5 w-5 rounded-full border border-current flex items-center justify-center overflow-hidden">
                <span className="text-[8px] font-black">{userProfile.fullName.charAt(0)}</span>
             </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-center leading-none">Me</span>
        </button>
      </div>
    </nav>
  );
}

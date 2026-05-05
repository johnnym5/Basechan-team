'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, BookCopy } from "lucide-react";
import { mainNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useAuth, useDoc, useMemoFirebase, useFirestore, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { signOut } from "firebase/auth";
import { Skeleton } from "../ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { uiEmitter } from "@/lib/ui-emitter";
import { Button } from "../ui/button";

export default function AppSidebar({ 
    isLoggedIn,
    isAuthLoading,
}: { 
    isLoggedIn: boolean,
    isAuthLoading: boolean,
    isCollapsed: boolean,
    onSignInClick: () => void
}) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  
  const handleLogout = () => {
    signOut(auth!);
  };

  const handleDialogClick = (dialog: string) => {
    uiEmitter.emit(`open-${dialog}-dialog` as any);
  };

  return (
    <aside className="w-64 sidebar-bg flex-shrink-0 flex flex-col border-r border-gray-800 h-screen transition-all duration-300">
      <div className="p-6">
        <div className="flex items-center gap-3">
            <BookCopy className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">StaffPortal</h1>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {isLoggedIn && mainNavItems.map((item, index) => {
          if ('isSeparator' in item) return <div key={index} className="h-px bg-gray-800/50 my-4" />;
          
          if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

          const isActive = pathname === ('href' in item && item.href);
          const Component = 'href' in item ? Link : 'button';
          const action = 'href' in item ? { href: item.href } : { onClick: () => handleDialogClick(item.dialog!) };

          return (
            <Component
              key={item.label}
              {...action as any}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
                isActive 
                  ? "active-nav" 
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Component>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        {isAuthLoading ? (
            <Skeleton className="h-12 w-full" />
        ) : isLoggedIn && userProfile ? (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    {isProfileLoading ? (
                      <Skeleton className="h-10 w-10 rounded-full" />
                    ) : (
                      <Avatar className="h-10 w-10 border border-gray-700">
                          <AvatarFallback>{userProfile?.fullName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 truncate">
                        <p className="font-semibold text-sm truncate">{userProfile?.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{userProfile?.position}</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-gray-400 hover:text-destructive hover:bg-destructive/10 px-4 h-10">
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                </Button>
            </div>
        ) : null}
      </div>
    </aside>
  );
}
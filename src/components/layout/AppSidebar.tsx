'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, BookCopy, ChevronRight, ChevronLeft } from "lucide-react";
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
import { useState, useEffect } from "react";

export default function AppSidebar({ 
    isLoggedIn,
    isAuthLoading,
}: { 
    isLoggedIn: boolean,
    isAuthLoading: boolean,
    isCollapsed?: boolean,
    onSignInClick?: () => void
}) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const [isHovered, setIsHovered] = useState(false);

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

  const isExpanded = isHovered;

  return (
    <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
            "sidebar-bg flex-shrink-0 flex flex-col border-r border-gray-800 h-screen transition-all duration-300 z-50 relative",
            isExpanded ? "w-64 shadow-2xl" : "w-20"
        )}
    >
      <div className={cn("p-6 flex items-center transition-all duration-300", isExpanded ? "justify-start" : "justify-center")}>
        <div className="flex items-center gap-3">
            <BookCopy className="h-8 w-8 text-primary shrink-0" />
            {isExpanded && <h1 className="text-xl font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">StaffPortal</h1>}
        </div>
      </div>
      
      <nav className="flex-1 px-3 space-y-2 mt-4">
        {isLoggedIn && mainNavItems.map((item, index) => {
          if ('isSeparator' in item) return <div key={index} className={cn("h-px bg-gray-800/50 my-4 mx-2", !isExpanded && "opacity-0")} />;
          
          if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

          const isActive = pathname === ('href' in item && item.href);
          const Component = 'href' in item ? Link : 'button';
          const action = 'href' in item ? { href: item.href } : { onClick: () => handleDialogClick(item.dialog!) };

          return (
            <Component
              key={item.label}
              {...action as any}
              className={cn(
                "w-full flex items-center rounded-xl transition-all duration-200 text-sm font-medium h-12 group relative",
                isExpanded ? "px-4" : "justify-center px-0",
                isActive 
                  ? "active-nav" 
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className={cn("w-6 h-6 transition-all", isExpanded ? "mr-3" : "mx-auto group-hover:scale-110")} />
              {isExpanded && (
                  <span className="animate-in fade-in slide-in-from-left-2 duration-300 truncate">
                      {item.label}
                  </span>
              )}
              {!isExpanded && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-primary text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-primary/20">
                      {item.label}
                  </div>
              )}
            </Component>
          );
        })}
      </nav>

      <div className={cn("p-4 border-t border-gray-800 transition-all duration-300", !isExpanded && "flex flex-col items-center")}>
        {isAuthLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
        ) : isLoggedIn && userProfile ? (
            <div className="flex flex-col gap-4 w-full">
                <div className={cn("flex items-center gap-3", !isExpanded && "justify-center")}>
                    {isProfileLoading ? (
                      <Skeleton className="h-10 w-10 rounded-full" />
                    ) : (
                      <Avatar className="h-10 w-10 border border-gray-700 hover:border-primary transition-colors cursor-pointer" onClick={() => handleDialogClick('profile')}>
                          <AvatarFallback>{userProfile?.fullName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    )}
                    {isExpanded && (
                        <div className="flex-1 truncate animate-in fade-in slide-in-from-left-2 duration-300">
                            <p className="font-semibold text-sm truncate">{userProfile?.fullName}</p>
                            <p className="text-[0.625rem] text-gray-500 uppercase tracking-widest truncate">{userProfile?.position}</p>
                        </div>
                    )}
                </div>
                {isExpanded ? (
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-gray-400 hover:text-destructive hover:bg-destructive/10 px-4 h-10 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                    </Button>
                ) : (
                    <button 
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-destructive transition-colors p-2"
                        title="Sign Out"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                )}
            </div>
        ) : null}
      </div>
    </aside>
  );
}


'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, BookCopy, Pin, PinOff, LogIn } from "lucide-react";
import { mainNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useAuth, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { Skeleton } from "../ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { uiEmitter } from "@/lib/ui-emitter";
import { ORG_NAME } from "@/lib/config";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "../ui/button";

export default function AppSidebar({ 
    isMobile = false, 
    isCollapsed, 
    onToggleCollapse,
    isLoggedIn,
    isAuthLoading,
    onSignInClick
}: { 
    isMobile?: boolean, 
    isCollapsed: boolean, 
    onToggleCollapse: () => void,
    isLoggedIn: boolean,
    isAuthLoading: boolean,
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
    signOut(auth);
  };

  const handleDialogClick = (dialog: string) => {
    if (!isLoggedIn) {
        onSignInClick();
        return;
    }
    switch(dialog) {
      case 'chat':
        uiEmitter.emit('open-chat-dialog');
        break;
      case 'settings':
        uiEmitter.emit('open-settings-dialog');
        break;
      case 'tasks':
        uiEmitter.emit('open-tasks-dialog');
        break;
      case 'workbooks':
        uiEmitter.emit('open-workbooks-dialog');
        break;
      case 'requisitions':
        uiEmitter.emit('open-requisitions-dialog');
        break;
      case 'attendance':
        uiEmitter.emit('open-attendance-dialog');
        break;
      case 'leave':
        uiEmitter.emit('open-leave-dialog');
        break;
      case 'reports':
        uiEmitter.emit('open-reports-dialog');
        break;
      case 'profile':
        uiEmitter.emit('open-profile-dialog');
        break;
    }
  };

  return (
    <aside className={cn(
      "flex-col border-r bg-background transition-all duration-300 ease-in-out", 
      isMobile ? "flex w-full" : "hidden md:flex",
      isCollapsed ? "w-20" : "w-72",
      isCollapsed && "group-hover/sidebar:w-72 group-hover/sidebar:shadow-2xl group-hover/sidebar:z-50"
    )}>
      <div className={cn(
          "flex h-16 items-center border-b px-6 transition-all",
          isCollapsed && "px-0 justify-center group-hover/sidebar:px-6 group-hover/sidebar:justify-start"
      )}>
          <h2 className={cn(
              "truncate font-bold text-xl text-foreground transition-all",
              isCollapsed && "w-0 group-hover/sidebar:w-auto"
          )}>{ORG_NAME}</h2>
          <BookCopy className={cn("h-6 w-6 text-primary transition-all", !isCollapsed && "w-0", isCollapsed && "group-hover/sidebar:w-0")} />
      </div>
      <div className="flex flex-1 flex-col justify-between overflow-y-auto overflow-x-hidden">
        <TooltipProvider delayDuration={0}>
          <nav className="grid items-start gap-1 p-2 text-sm font-medium">
            {mainNavItems.map((item, index) => {
              if ('isSeparator' in item) {
                  return <Separator key={`sep-${index}`} className="my-2" />;
              }
              
              const animationStyle = { animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' as const };

              const navContent = (
                <>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className={cn(
                      "transition-opacity duration-200", 
                      isCollapsed && "opacity-0 invisible w-0 group-hover/sidebar:visible group-hover/sidebar:opacity-100 group-hover/sidebar:delay-200 group-hover/sidebar:w-auto"
                  )}>
                    {item.label}
                  </span>
                </>
              );

              const linkClasses = cn(
                "flex items-center gap-4 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary",
                isCollapsed && "justify-center group-hover/sidebar:justify-start group-hover/sidebar:gap-3",
                !isCollapsed && "opacity-0 animate-fade-in-down"
              );

              const action = 'href' in item ? { href: item.href } : { onClick: () => handleDialogClick(item.dialog!) };
              const Component = 'href' in item ? Link : 'button';

              if ('permission' in item && isLoggedIn && !permissions[item.permission as keyof typeof permissions]) {
                return null;
              }
              
              if ('permission' in item && !isLoggedIn && item.permission === 'canManageStaff') {
                return null; // Don't show settings to guests
              }

              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Component {...action} className={cn(linkClasses, pathname === ('href' in item && item.href) && "bg-secondary text-primary")} style={animationStyle}>
                      {navContent}
                    </Component>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>

        <div className="mt-auto border-t p-4">
            {isAuthLoading ? (
                <Skeleton className="h-10 w-full" />
            ) : isLoggedIn && userProfile ? (
                <div className={cn("flex items-center gap-3 transition-all", isCollapsed && "justify-center group-hover/sidebar:justify-start")}>
                    {isProfileLoading ? (
                      <Skeleton className="h-10 w-10 rounded-full" />
                    ) : (
                      <Avatar className="h-10 w-10">
                          <AvatarFallback>{userProfile?.fullName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn("flex-1 truncate transition-opacity", isCollapsed && "opacity-0 invisible w-0 group-hover/sidebar:visible group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto group-hover/sidebar:delay-200")}>
                        <p className="font-semibold">{userProfile?.fullName}</p>
                        <Badge variant="secondary" className="text-xs">{userProfile?.position}</Badge>
                    </div>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onToggleCollapse}>
                            {isCollapsed ? <Pin className="h-5 w-5" /> : <PinOff className="h-5 w-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side={isCollapsed ? "right" : "top"} align="center">
                            {isCollapsed ? "Pin sidebar open" : "Unpin sidebar"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                </div>
            ) : (
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" onClick={onSignInClick} className={cn("w-full", isCollapsed && "group-hover/sidebar:w-full w-10 justify-center group-hover/sidebar:justify-start")}>
                                <LogIn className={cn("h-5 w-5", !isCollapsed && "mr-2", isCollapsed && "group-hover/sidebar:mr-2")}/>
                                <span className={cn("transition-opacity", isCollapsed && "opacity-0 w-0 group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto")}>Sign In</span>
                            </Button>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right">Sign In</TooltipContent>}
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
      </div>
    </aside>
  );
}

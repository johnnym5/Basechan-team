'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
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

export default function AppSidebar({ isMobile = false }: { isMobile?: boolean }) {
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
  
  if (!authUser) return null;

  return (
    <aside className={cn("flex-col border-r bg-background", isMobile ? "flex w-full" : "hidden md:flex md:w-72")}>
      <div className="flex h-16 items-center border-b px-6">
          <h2 className="truncate font-bold text-xl text-foreground">{ORG_NAME}</h2>
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <nav className="grid items-start gap-1 p-4 text-sm font-medium">
          {mainNavItems.map((item, index) => {
            if ('isSeparator' in item) {
                return <Separator key={`sep-${index}`} className="my-2" />;
            }
            
            const animationStyle = { animationDelay: `${index * 75}ms`, animationFillMode: 'forwards' as const };

            if ('href' in item) {
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary opacity-0 animate-fade-in-down",
                        pathname === item.href && "bg-secondary text-primary",
                        isMobile && "text-lg"
                        )}
                        style={animationStyle}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                );
            }
            
            if ('permission' in item && !permissions[item.permission as keyof typeof permissions]) {
                return null;
            }

            return (
                <button
                    key={item.dialog}
                    onClick={() => handleDialogClick(item.dialog)}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-left w-full opacity-0 animate-fade-in-down",
                        isMobile && "text-lg"
                    )}
                    style={animationStyle}
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t p-4">
            <div className="flex items-center gap-3 rounded-lg">
                {isProfileLoading ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <Avatar className="h-10 w-10">
                      <AvatarFallback>{userProfile?.fullName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 truncate">
                    <p className="font-semibold">{userProfile?.fullName}</p>
                    <Badge variant="secondary" className="text-xs">{userProfile?.position}</Badge>
                </div>
                <button onClick={handleLogout} className="ml-auto">
                    <LogOut className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/>
                </button>
            </div>
        </div>
      </div>
    </aside>
  );
}

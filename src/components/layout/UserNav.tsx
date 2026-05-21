import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useAuth } from "@/firebase";
import { LogOut, User as UserIcon, Settings, Eye, Shield } from "lucide-react";
import { signOut } from "firebase/auth";
import { uiEmitter } from "@/lib/ui-emitter";
import type { UserProfile } from "@/lib/types";
import { useImpersonation } from "@/context/ImpersonationProvider";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { cn } from "@/lib/utils";

export function UserNav({ userProfile }: { userProfile: UserProfile | null }) {
  const { user } = useUser();
  const auth = useAuth();
  const { isImpersonating, setIsImpersonating } = useImpersonation();
  const { isSuperAdmin } = useSuperAdmin();

  if (!user) return null;
  
  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        window.location.href = '/';
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  };

  const userInitials = user.displayName?.split(' ').map(n => n[0]).join('') || user.email?.charAt(0).toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full interactive-element focus-visible:ring-0 focus-visible:ring-offset-0">
          <Avatar className={cn("h-10 w-10 border-2 transition-colors", isImpersonating ? "border-amber-500" : "border-primary/20")}>
            <AvatarImage src={userProfile?.avatarUrl || user.photoURL || ''} alt={user.displayName || ''} />
            <AvatarFallback className="font-bold bg-secondary">{userInitials}</AvatarFallback>
          </Avatar>
          {isImpersonating && (
              <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-background shadow-sm">
                  <Eye className="h-2 w-2 text-white" />
              </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 apple-glass border-none shadow-3xl mt-2" align="end">
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-black font-headline leading-none uppercase tracking-tight truncate">
                {user.displayName || userProfile?.fullName || 'Personnel'}
            </p>
            <p className="text-[10px] font-bold leading-none text-muted-foreground uppercase tracking-widest opacity-60 truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />
        
        <DropdownMenuItem className="p-3 cursor-pointer group" onSelect={() => uiEmitter.emit('open-profile-dialog')}>
          <UserIcon className="mr-3 h-4 w-4 text-primary transition-transform group-hover:scale-110" />
          <span className="font-bold text-xs uppercase tracking-widest">My Identity</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="p-3 cursor-pointer group" onSelect={() => uiEmitter.emit('open-settings-dialog')}>
          <Settings className="mr-3 h-4 w-4 text-primary transition-transform group-hover:rotate-45" />
          <span className="font-bold text-xs uppercase tracking-widest">Global Config</span>
        </DropdownMenuItem>
        
        {isSuperAdmin && (
          <>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-4 py-2">Super Admin Access</DropdownMenuLabel>
              <DropdownMenuItem className="p-3 cursor-pointer text-amber-500 group" onSelect={() => uiEmitter.emit('open-superadmin-dialog')}>
                  <Shield className="mr-3 h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="font-bold text-xs uppercase tracking-widest">Master Console</span>
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="p-3 cursor-pointer focus:bg-amber-500/10">
                    <Eye className="mr-3 h-4 w-4 text-amber-500" />
                    <span className="font-bold text-xs uppercase tracking-widest">View Mode</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent className="apple-glass border-none shadow-2xl min-w-[180px]">
                        <DropdownMenuRadioGroup value={isImpersonating ? 'staff' : 'admin'} onValueChange={(v) => setIsImpersonating(v === 'staff')}>
                            <DropdownMenuRadioItem value="admin" className="text-xs font-bold uppercase tracking-widest p-3 cursor-pointer">
                                Administrator
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="staff" className="text-xs font-bold uppercase tracking-widest p-3 cursor-pointer">
                                Normal Staff
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
          </>
        )}

        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem className="p-3 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive group" onSelect={handleLogout}>
          <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
          <span className="font-bold text-xs uppercase tracking-widest">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useAuth } from "@/firebase";
import { LogOut, User as UserIcon, Settings, Eye, EyeOff, Shield } from "lucide-react";
import { signOut } from "firebase/auth";
import { uiEmitter } from "@/lib/ui-emitter";
import { usePermissions } from "@/hooks/usePermissions";
import type { UserProfile, UserPosition } from "@/lib/types";
import { useImpersonation } from "@/context/ImpersonationProvider";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

const getBaseRoleForPermissions = (position: UserPosition): 'Staff' | 'HR Manager' | 'Finance Manager' | 'Managing Director' | 'Organization Administrator' => {
    switch (position) {
        case "CEO / Managing Director":
            return "Managing Director";
        case "Chief Financial Officer (CFO) / Finance Manager":
            return "Finance Manager";
        case "HR Manager / Director":
            return "HR Manager";
        case "Organization Administrator":
            return "Organization Administrator";
        default:
            return "Staff";
    }
}


export function UserNav({ userProfile }: { userProfile: UserProfile | null }) {
  const { user } = useUser();
  const auth = useAuth();
  const permissions = usePermissions(userProfile);
  const { isImpersonating, setIsImpersonating } = useImpersonation();
  const { isSuperAdmin } = useSuperAdmin();

  // Determine if the *actual* user (not the impersonated one) has management rights.
  const actualBaseRole = userProfile ? getBaseRoleForPermissions(userProfile.position) : 'Staff';
  const canActuallyManageStaff = actualBaseRole === 'Organization Administrator' || actualBaseRole === 'HR Manager' || actualBaseRole === 'Managing Director';

  if (!user) {
    return null;
  }
  
  const handleLogout = () => {
    signOut(auth);
  };
  
  const handleToggleImpersonation = () => {
    setIsImpersonating(!isImpersonating);
  };

  const userInitials = user.displayName?.split(' ').map(n => n[0]).join('') || user.email?.charAt(0).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatarUrl || user.photoURL || ''} alt={user.displayName || ''} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
           <DropdownMenuItem onSelect={() => uiEmitter.emit('open-profile-dialog')}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => uiEmitter.emit('open-settings-dialog')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isSuperAdmin && (
            <DropdownMenuItem onSelect={() => uiEmitter.emit('open-superadmin-dialog')}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Super Admin</span>
            </DropdownMenuItem>
          )}
          {canActuallyManageStaff && (
            <DropdownMenuItem onSelect={handleToggleImpersonation}>
              {isImpersonating ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              <span>{isImpersonating ? "Return to Admin View" : "View as Staff"}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

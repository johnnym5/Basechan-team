"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/lib/types';
import { TeamPane } from './TeamPane';
import { SystemPane } from './SystemPane';
import { AuditPane } from './AuditPane';
import { MaintenancePane } from './MaintenancePane';
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldAlert, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { cn } from '@/lib/utils';
import { uiEmitter } from '@/lib/ui-emitter';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function SettingsDialog({ open, onOpenChange, userProfile }: SettingsDialogProps) {
  const permissions = usePermissions(userProfile);
  const { isSuperAdmin } = useSuperAdmin();

  // If the user profile is absolutely missing, we can't show settings.
  // Sidebar handles most of this gating, but we check here for security.
  if (!userProfile) {
    return null;
  }

  // Check if the user has organizational clearance.
  // Note: We use canViewTeam as the primary gate for the console.
  const hasAccess = permissions.canViewTeam || userProfile.role === 'ORG_ADMIN' || isSuperAdmin;

  if (!hasAccess) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent position="left" className="items-center justify-center text-center">
                 <DialogHeader className="items-center">
                    <div className="p-3 rounded-full bg-destructive/10 mb-4">
                        <ShieldAlert className="w-10 h-10 text-destructive" />
                    </div>
                    <DialogTitle className="text-2xl">Access Denied</DialogTitle>
                    <DialogDescription>
                        You do not have permission to access organization settings.
                    </DialogDescription>
                 </DialogHeader>
                 <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} className="w-full">Close Console</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    )
  }

  const handleOpenSuperAdmin = () => {
    onOpenChange(false);
    uiEmitter.emit('open-superadmin-dialog');
  }

  const tabCount = [
    true, // Team
    permissions.canManageCompany, // System
    true, // Maintenance is useful for anyone with team access
    permissions.canViewAudit, // Audit
    isSuperAdmin // SuperAdmin
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Management Console</DialogTitle>
          <DialogDescription>
            Administer personnel, system policies, and inspect the organizational audit trail.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="team" className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="px-6">
            <TabsList className={cn(
                "grid w-full",
                tabCount === 5 ? "grid-cols-5" : tabCount === 4 ? "grid-cols-4" : tabCount === 3 ? "grid-cols-3" : "grid-cols-2"
            )}>
                <TabsTrigger value="team">Team</TabsTrigger>
                {permissions.canManageCompany && <TabsTrigger value="system">System</TabsTrigger>}
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                {permissions.canViewAudit && <TabsTrigger value="audit">Audit Trail</TabsTrigger>}
                {isSuperAdmin && <TabsTrigger value="superadmin">Super Admin</TabsTrigger>}
            </TabsList>
          </div>
          <TabsContent value="team" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
            <TeamPane currentUserProfile={userProfile} permissions={permissions} />
          </TabsContent>
          {permissions.canManageCompany && (
            <TabsContent value="system" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
                <SystemPane currentUserProfile={userProfile} />
            </TabsContent>
          )}
          <TabsContent value="maintenance" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
            <MaintenancePane currentUserProfile={userProfile} />
          </TabsContent>
          {permissions.canViewAudit && (
             <TabsContent value="audit" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
                <AuditPane currentUserProfile={userProfile} />
            </TabsContent>
          )}
          {isSuperAdmin && (
             <TabsContent value="superadmin" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
                <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-[2.5rem] bg-secondary/10">
                    <Shield className="w-16 h-16 text-primary mb-4" />
                    <h2 className="text-xl font-bold">Super Admin Access</h2>
                    <p className="text-muted-foreground mt-2 max-w-sm">You have absolute infrastructure control. Access the master console for global telemetry and disaster recovery.</p>
                    <Button onClick={handleOpenSuperAdmin} className="mt-6 rounded-xl">
                        Go to Master Console
                    </Button>
                </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

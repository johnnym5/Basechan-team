"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/lib/types';
import { TeamPane } from './TeamPane';
import { SystemPane } from './SystemPane';
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

  if (!userProfile) {
    return null;
  }

  if (!permissions.canManageStaff) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                 <DialogHeader className="items-center text-center">
                    <div className="p-3 rounded-full bg-destructive/10 mb-4">
                        <ShieldAlert className="w-10 h-10 text-destructive" />
                    </div>
                    <DialogTitle className="text-2xl">Access Denied</DialogTitle>
                    <DialogDescription>
                        You do not have permission to access organization settings.
                    </DialogDescription>
                 </DialogHeader>
                 <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} className="w-full">Close</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    )
  }

  const handleOpenSuperAdmin = () => {
    onOpenChange(false); // Close current dialog
    uiEmitter.emit('open-superadmin-dialog');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your organization's team members and system configuration.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="team" className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="px-6">
            <TabsList className={cn("grid w-full", isSuperAdmin ? "grid-cols-3" : "grid-cols-2")}>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                {isSuperAdmin && <TabsTrigger value="superadmin">Super Admin</TabsTrigger>}
            </TabsList>
          </div>
          <TabsContent value="team" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
            <TeamPane currentUserProfile={userProfile} />
          </TabsContent>
          <TabsContent value="system" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
            <SystemPane currentUserProfile={userProfile} />
          </TabsContent>
          {isSuperAdmin && (
             <TabsContent value="superadmin" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
                <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-lg">
                    <Shield className="w-16 h-16 text-primary mb-4" />
                    <h2 className="text-xl font-bold">Super Admin Access</h2>
                    <p className="text-muted-foreground mt-2 max-w-sm">You have super administrative privileges. Access the main console for advanced data management and system oversight.</p>
                    <Button onClick={handleOpenSuperAdmin} className="mt-6">
                        Go to Super Admin Console
                    </Button>
                </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/lib/types';
import { TeamPane } from './TeamPane';
import { SystemPane } from './SystemPane';
import { AuditPane } from './AuditPane';
import { MaintenancePane } from './MaintenancePane';
import { ErrorLogViewer } from '../superadmin/ErrorLogViewer';
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldAlert, Shield, Users, Cog, Hammer, Lock, Zap, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { cn } from '@/lib/utils';
import { uiEmitter } from '@/lib/ui-emitter';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function SettingsDialog({ open, onOpenChange, userProfile }: SettingsDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const permissions = usePermissions(userProfile);
  const { isSuperAdmin } = useSuperAdmin();

  if (!userProfile) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0 overflow-hidden bg-background h-full max-h-full">
        <DialogHeader className="p-4 md:p-8 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <Cog className="h-6 w-6" />
              </div>
              <div>
                  <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Management Console</DialogTitle>
                  <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Organizational Root & Infrastructure Control</DialogDescription>
              </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 w-full bg-secondary/20 border-transparent focus-visible:ring-primary"
            />
            {searchTerm && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="team" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 md:px-8 flex-shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="bg-secondary/20 rounded-2xl p-1 flex w-max min-w-full md:w-fit">
                <TabsTrigger value="team" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background">
                    <Users className="h-3 w-3 mr-2" /> Team
                </TabsTrigger>
                {permissions.canManageCompany && (
                    <TabsTrigger value="system" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background">
                        <Zap className="h-3 w-3 mr-2" /> Configuration
                    </TabsTrigger>
                )}
                <TabsTrigger value="maintenance" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background">
                    <Hammer className="h-3 w-3 mr-2" /> Radar
                </TabsTrigger>
                {permissions.canViewAudit && (
                    <TabsTrigger value="audit" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background">
                        <Lock className="h-3 w-3 mr-2" /> Audit
                    </TabsTrigger>
                )}
                {isSuperAdmin && (
                    <TabsTrigger value="superadmin" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background">
                        <Shield className="h-3 w-3 mr-2" /> Root
                    </TabsTrigger>
                )}
            </TabsList>
          </div>

          <div className="flex-1 mt-6 overflow-y-auto custom-scrollbar">
            <div className="px-4 md:px-8 pb-32 max-w-[1600px] mx-auto">
                <TabsContent value="team" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                    <TeamPane currentUserProfile={userProfile} permissions={permissions} searchTerm={searchTerm} />
                </TabsContent>
                {permissions.canManageCompany && (
                    <TabsContent value="system" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                        <SystemPane currentUserProfile={userProfile} searchTerm={searchTerm} />
                    </TabsContent>
                )}
                <TabsContent value="maintenance" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                    <MaintenancePane currentUserProfile={userProfile} searchTerm={searchTerm} />
                </TabsContent>
                {permissions.canViewAudit && (
                    <TabsContent value="audit" className="m-0 space-y-8 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                        <AuditPane currentUserProfile={userProfile} searchTerm={searchTerm} />
                        <ErrorLogViewer />
                    </TabsContent>
                )}
                {isSuperAdmin && (
                    <TabsContent value="superadmin" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                        <div className="flex flex-col items-center justify-center py-32 text-center p-8 border-2 border-dashed rounded-[3rem] bg-secondary/10 opacity-60">
                            <Shield className="w-16 h-16 text-primary mb-4" />
                            <h2 className="text-xl font-bold uppercase tracking-widest">Super Admin Clearance</h2>
                            <p className="text-xs mt-2 max-w-sm font-bold opacity-70">Access the Master Terminal for global telemetry and disaster recovery operations.</p>
                            <Button onClick={handleOpenSuperAdmin} className="mt-8 h-12 px-10 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                                Initialize Master Terminal
                            </Button>
                        </div>
                    </TabsContent>
                )}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

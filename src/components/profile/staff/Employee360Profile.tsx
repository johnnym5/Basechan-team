'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployee360 } from '@/hooks/useEmployee360';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffProfileView } from './StaffProfileView';
import { ActivityTimeline } from './ActivityTimeline';
import { UserAccessEditor } from '@/components/settings/security/UserAccessEditor';
import { Button } from '@/components/ui/button';
import { ChevronLeft, LayoutDashboard, History, ShieldCheck, User, Loader2, KeyRound, LogOut, Camera, MonitorPlay, Trash2, AlertTriangle } from 'lucide-react';
import type { Permissions } from '@/hooks/usePermissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFirestore, useAuth } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { uiEmitter } from '@/lib/ui-emitter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Employee360ProfileProps {
  userId: string;
  orgId: string;
  currentUserProfile: any;
  permissions: Permissions;
  onBack?: () => void;
}

export function Employee360Profile({
  userId,
  orgId,
  currentUserProfile,
  permissions,
  onBack
}: Employee360ProfileProps) {
  console.log("Fetching profile for ID:", userId);
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { data, isLoading, refetch } = useEmployee360(userId, orgId);
  const [activeTab, setActiveTab] = useState('profile');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnProfile = currentUserProfile?.id === userId;
  const isAdmin = permissions.canManageStaff;

  if (isLoading) return <Skeleton className="h-[600px] w-full rounded-xl" />;
  if (!data?.profile) return <div className="p-20 text-center uppercase font-black opacity-20">Profile Not Found (ID: {userId})</div>;

  const { profile, attendance, tasks } = data;

  const handleRemoteCommand = async (type: 'SCREENSHOT' | 'SCREEN_SHARE' | 'FORCE_LOGOUT') => {
    if (!firestore || !profile) return;
    setIsProcessing(type);
    try {
        await updateDoc(doc(firestore, 'users', profile.id), { pendingCommand: type });
        if (type === 'SCREEN_SHARE') {
            uiEmitter.emit('open-live-monitor-dialog', { targetUserId: profile.id, targetUserName: profile.fullName });
        }
        toast({ title: 'Command Dispatched', description: `Authority protocol "${type}" sent to unit.` });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Dispatch Failed', description: e.message });
    } finally {
        setTimeout(() => setIsProcessing(null), 1000);
    }
  };

  const handlePasswordReset = async () => {
    if (!auth || !profile?.email) return;
    setIsProcessing('RESET');
    try {
        await sendPasswordResetEmail(auth, profile.email);
        toast({ title: 'Recovery Dispatched', description: `Secure reset link sent to ${profile.email}.` });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Dispatch Failed', description: e.message });
    } finally {
        setIsProcessing(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!firestore || !profile) return;
    setIsDeleting(true);
    try {
        const token = await auth?.currentUser?.getIdToken();
        const response = await fetch('/api/users/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ targetUserId: profile.id })
        });
        if (!response.ok) throw new Error('Decommissioning sequence failed at API level.');

        toast({ title: 'Unit Purged', description: `${profile.fullName} has been removed from system.` });
        setShowDeleteDialog(false);
        onBack?.();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Purge Failed', description: e.message });
    } finally {
        setIsDeleting(false);
    }
  };

  // PEER VIEW LOGIC: Standard staff viewing another member
  if (!isOwnProfile && !isAdmin) {
    return (
      <div className="space-y-8 h-full flex flex-col">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="rounded-xl gap-2 px-4 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest shrink-0 self-start">
             <ChevronLeft className="h-4 w-4" /> Personnel Directory
          </Button>
        )}
        <div className="border border-border/60 bg-muted/30 rounded-xl p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 rounded-xl border-4 border-white/5 shadow-2xl">
            <AvatarImage src={profile.avatarUrl || ''} />
            <AvatarFallback className="text-4xl font-black bg-secondary">{profile.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left space-y-4">
            <div>
              <h1 className="text-4xl font-black font-headline tracking-tighter uppercase">{profile.fullName}</h1>
              <p className="text-lg font-bold text-primary tracking-tight">{profile.jobTitle || 'Staff Member'}</p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <Badge variant="secondary" className="bg-white/5 text-[9px] font-black uppercase px-3">{profile.departmentName || 'Operations'}</Badge>
              <Badge variant="outline" className="text-primary border-primary/20 text-[9px] font-black uppercase px-3">{profile.role.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{profile.email}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-secondary/5 opacity-40 p-10">
           <div className="text-center">
             <ShieldCheck className="h-10 w-10 mx-auto mb-4 text-primary" />
             <p className="text-xs font-black uppercase tracking-[0.2em]">Detailed History Protected by Authority Protocol</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6 w-full">
      <div className="flex items-center justify-between gap-4 shrink-0">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="rounded-xl gap-2 px-4 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest">
               <ChevronLeft className="h-4 w-4" /> Back to Directory
            </Button>
          )}
          <div className="flex-1">
             <h1 className="text-2xl font-black font-headline tracking-tight uppercase">Operational 360: {profile.fullName.split(' ')[0]}</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-secondary/10 rounded-2xl p-1.5 border border-white/5 w-fit self-center md:self-start mb-6 shrink-0">
            <TabsTrigger value="profile" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary transition-all">
              <User className="h-3.5 w-3.5" /> Identity
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary transition-all">
              <History className="h-3.5 w-3.5" /> Activity History
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="access" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary transition-all">
                <ShieldCheck className="h-3.5 w-3.5" /> Authorization
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
              <StaffProfileView
                userId={userId}
                currentUserProfile={currentUserProfile}
                permissions={permissions}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0 focus-visible:outline-none max-w-4xl mx-auto w-full">
              <div className="space-y-8 py-4">
                 <div>
                    <h3 className="text-xl font-black font-headline tracking-tighter uppercase mb-1">Operational Timeline</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Consolidated Tasks & Attendance Records</p>
                 </div>
                 <ActivityTimeline attendance={attendance} tasks={tasks} />
              </div>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="access" className="mt-0 focus-visible:outline-none">
                <div className="space-y-8 py-4">
                   <div>
                      <h3 className="text-xl font-black font-headline tracking-tighter uppercase mb-1">Authorization Matrix</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Capability Overrides & Functional Clearance</p>
                   </div>
                   <UserAccessEditor userProfile={profile} />
                </div>

                <div className="space-y-6 py-10 border-t border-white/5">
                    <div>
                      <h3 className="text-xl font-black font-headline tracking-tighter uppercase mb-1 text-rose-500">Infrastructure Oversight</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Remote Commands & Lifecycle Management</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* PC Only Commands */}
                        {profile.deviceType === 'PC' && profile.status === 'ONLINE' && (
                          <>
                            <Button
                              variant="outline"
                              className="h-20 rounded-[1.5rem] bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-500 font-black uppercase text-[10px] tracking-widest flex flex-col gap-2"
                              onClick={() => handleRemoteCommand('SCREEN_SHARE')}
                              disabled={!!isProcessing}
                            >
                              {isProcessing === 'SCREEN_SHARE' ? <Loader2 className="h-5 w-5 animate-spin" /> : <MonitorPlay className="h-5 w-5" />}
                              Live Feed
                            </Button>
                            <Button
                              variant="outline"
                              className="h-20 rounded-[1.5rem] bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary font-black uppercase text-[10px] tracking-widest flex flex-col gap-2"
                              onClick={() => handleRemoteCommand('SCREENSHOT')}
                              disabled={!!isProcessing}
                            >
                              {isProcessing === 'SCREENSHOT' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                              Capture
                            </Button>
                          </>
                        )}

                        <Button
                          variant="outline"
                          className="h-20 rounded-[1.5rem] bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 text-amber-500 font-black uppercase text-[10px] tracking-widest flex flex-col gap-2"
                          onClick={handlePasswordReset}
                          disabled={!!isProcessing}
                        >
                          {isProcessing === 'RESET' ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
                          Reset Access
                        </Button>

                        {profile.id !== currentUserProfile.id && (
                          <Button
                            variant="outline"
                            className="h-20 rounded-[1.5rem] bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 text-rose-500 font-black uppercase text-[10px] tracking-widest flex flex-col gap-2"
                            onClick={() => handleRemoteCommand('FORCE_LOGOUT')}
                            disabled={!!isProcessing}
                          >
                            {isProcessing === 'FORCE_LOGOUT' ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                            Sign Out
                          </Button>
                        )}
                    </div>

                    {/* Danger Zone */}
                    {!isOwnProfile && profile.role !== 'ORG_ADMIN' && (
                      <div className="pt-6">
                         <Button
                          variant="destructive"
                          className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-destructive/20 active:scale-95 transition-all"
                          onClick={() => setShowDeleteDialog(true)}
                         >
                           <Trash2 className="mr-2 h-5 w-5" /> Decommission Unit
                         </Button>
                      </div>
                    )}
                </div>

                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent className="m3-surface-high border-none rounded-[2.5rem] p-10 shadow-3xl">
                        <AlertDialogHeader className="space-y-4 text-center">
                            <div className="mx-auto p-5 rounded-full bg-rose-500/10 w-fit text-rose-500">
                                <AlertTriangle className="h-10 w-10" />
                            </div>
                            <AlertDialogTitle className="text-3xl font-black font-headline tracking-tighter uppercase">Purge Protocol</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-bold uppercase tracking-widest opacity-60">
                                Warning: This will permanently remove {profile.fullName} from the organizational matrix. This interaction is final and irreversible.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-col gap-4 mt-8">
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-500/40">
                                {isDeleting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Confirm Purge"}
                            </AlertDialogAction>
                            <AlertDialogCancel className="h-10 border-none font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 hover:bg-transparent transition-all">Abort Protocol</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
  );
}

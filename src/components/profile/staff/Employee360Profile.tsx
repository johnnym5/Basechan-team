'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployee360 } from '@/hooks/useEmployee360';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffProfileView } from './StaffProfileView';
import { ActivityTimeline } from './ActivityTimeline';
import { UserAccessEditor } from '@/components/settings/security/UserAccessEditor';
import { Button } from '@/components/ui/button';
import { ChevronLeft, LayoutDashboard, History, ShieldCheck, User, Loader2, KeyRound, LogOut, Camera, MonitorPlay, Trash2, AlertTriangle, Mail, Phone, MapPin, Calendar, Briefcase, Trophy, AlertCircle, ListTodo, CheckCircle2, Timer, Quote, Languages, Star, Award, GitBranch, ArrowUp, ArrowDown, History as HistoryIcon, Monitor, Cpu, Key, Download, Edit3, ExternalLink, Sparkles, Smartphone, Globe, Clock, ChevronRight, FileText } from 'lucide-react';
import type { Permissions } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFirestore, useAuth, useUser } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { uiEmitter } from '@/lib/ui-emitter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { EditStaffProfileForm } from './EditStaffProfileForm';
import { StaffDocumentUpload } from './StaffDocumentUpload';
import { PerformanceDashboard } from '@/components/reports/PerformanceDashboard';
import { StaffAttendanceAnalytics } from '@/components/attendance/StaffAttendanceAnalytics';
import { PERMISSION_LABELS } from '@/lib/permissions-registry';
import { Switch } from '@/components/ui/switch';
import { useSuperAdminMode } from '@/context/SuperAdminModeProvider';
import { useImpersonation } from '@/context/ImpersonationProvider';

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
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const { isSuperAdminModeActive, setIsSuperAdminModeActive, canEnableMode } = useSuperAdminMode();
  const { setIsImpersonating } = useImpersonation();
  const { data, isLoading, refetch } = useEmployee360(userId, orgId);
  const [activeTab, setActiveTab] = useState('overview');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isOwnProfile = currentUserProfile?.id === userId;
  const isAdmin = permissions.canManageStaff;
  const isSuperAdminIdentity = authUser?.email === 'jegbase@gmail.com';
  const canEnableSuperAdminMode = isSuperAdminIdentity && currentUserProfile?.role === 'SUPERADMIN' && canEnableMode;

  const toggleSuperAdminMode = () => {
    if (!canEnableSuperAdminMode) return;

    const nextModeIsActive = !isSuperAdminModeActive;
    setIsSuperAdminModeActive(nextModeIsActive);
    setIsImpersonating(!nextModeIsActive);
  };

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

  const canEditBasic = isOwnProfile || permissions.canManageStaff;

  return (
    <div className="p-6 m-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-6">
      {/* Edit Profile Modal */}
      <EditStaffProfileForm
        profile={profile}
        open={isEditing}
        onOpenChange={(open) => {
            setIsEditing(open);
            if (!open) refetch();
        }}
        permissions={permissions}
      />

      {/* Header Section */}
      <header className="flex flex-col md:flex-row gap-6 items-start justify-between w-full">
        <div className="flex flex-col md:flex-row gap-6 items-start flex-1 min-w-0">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-border shadow-xl rounded-2xl shrink-0">
            <AvatarImage src={profile.avatarUrl || ''} />
            <AvatarFallback className="bg-secondary text-white text-4xl font-black">{profile.fullName.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="space-y-4 flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-4xl font-black font-headline tracking-tighter uppercase truncate">{profile.fullName}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-lg font-bold text-primary tracking-tight">{profile.jobTitle || 'No Title'}</p>
                <div className="h-4 w-px bg-border" />
                {canEnableSuperAdminMode ? (
                  <button
                    type="button"
                    onClick={toggleSuperAdminMode}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    title={isSuperAdminModeActive ? 'Switch to Staff mode' : 'Switch to Super Admin mode'}
                  >
                    <Badge variant="outline" className="cursor-pointer border-amber-500/40 text-amber-500 text-[9px] font-black uppercase tracking-widest px-3 hover:bg-amber-500/10">
                      {isSuperAdminModeActive ? 'Super Admin' : 'Staff'}
                    </Badge>
                  </button>
                ) : (
                  <Badge variant="outline" className="border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest px-3">
                    {profile.role.replace('_', ' ')}
                  </Badge>
                )}
                <Badge className={cn(
                    "px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl border-none whitespace-nowrap",
                    profile.status === 'ONLINE' ? "bg-emerald-500" : "bg-muted-foreground opacity-50"
                )}>
                    {profile.status || 'OFFLINE'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
               <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-bold truncate">{profile.email}</span>
               </div>
               <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold">{profile.phoneNumber || 'No Phone'}</span>
               </div>
               <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold truncate">{profile.departmentName || 'Operations'}</span>
               </div>
               {profile.location && (
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="text-xs font-bold truncate">{profile.location}</span>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 md:items-end w-full md:w-auto">
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="rounded-xl gap-2 px-4 hover:bg-muted text-[10px] font-black uppercase tracking-widest">
                 <ChevronLeft className="h-4 w-4" /> Back to Directory
              </Button>
            )}
            {canEditBasic && (
              <Button onClick={() => setIsEditing(true)} className="rounded-2xl h-12 px-6 gap-2 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                <Edit3 className="h-4 w-4" /> Edit Profile
              </Button>
            )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <Tabs className="w-full" defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto bg-muted rounded-2xl p-1.5 border border-border">
          <TabsTrigger value="overview" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Overview</TabsTrigger>
          <TabsTrigger value="structure" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Structure</TabsTrigger>
          <TabsTrigger value="assets" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Assets</TabsTrigger>
          <TabsTrigger value="employment" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Employment</TabsTrigger>
          {isAdmin && <TabsTrigger value="attendance" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Attendance</TabsTrigger>}
          <TabsTrigger value="documents" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Documents</TabsTrigger>
          <TabsTrigger value="permissions" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Permissions</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <TabsContent value="overview" className="col-span-full mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.bio && (
                    <Card className="md:col-span-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Quote className="h-20 w-20" /></div>
                        <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Personal Bio</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm font-medium leading-relaxed italic opacity-80 whitespace-pre-wrap">"{profile.bio}"</p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><User className="h-4 w-4" /> Personal Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase opacity-40">Date of Birth</p>
                                <p className="font-bold text-sm">{profile.dateOfBirth ? format(new Date(profile.dateOfBirth), 'MMMM d, yyyy') : '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase opacity-40">Employee ID</p>
                                <p className="font-mono text-sm">{profile.employeeId || '—'}</p>
                            </div>
                        </div>
                        <div className="space-y-1 pt-2 border-t">
                            <p className="text-[10px] font-black uppercase opacity-40">Residential Address</p>
                            <p className="font-bold text-sm leading-relaxed">{profile.address || 'Not provided'}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Expertise & Skills</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {profile.skills && profile.skills.length > 0 ? (
                                profile.skills.map(skill => (
                                    <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-lg px-3 py-1 font-bold text-[10px] uppercase">
                                        {skill}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-xs font-bold opacity-30 italic">No skills listed</p>
                            )}
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-[10px] font-black uppercase opacity-40 mb-2 flex items-center gap-2"><Languages className="h-3 w-3" /> Languages</p>
                            <div className="flex flex-wrap gap-2">
                                {profile.languages && profile.languages.length > 0 ? (
                                    profile.languages.map(lang => (
                                        <Badge key={lang} variant="outline" className="opacity-60 rounded-lg px-2 font-bold text-[9px] uppercase">
                                            {lang}
                                        </Badge>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold opacity-30 italic">Not specified</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Emergency Contact</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {profile.emergencyContact ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase opacity-40">Contact Name</p>
                                    <p className="font-bold text-sm">{profile.emergencyContact.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase opacity-40">Relationship</p>
                                        <p className="font-bold text-sm">{profile.emergencyContact.relationship}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase opacity-40">Phone Number</p>
                                        <p className="font-bold text-sm text-emerald-500">{profile.emergencyContact.phone}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-8 text-center"><p className="text-xs font-bold opacity-30 italic">No emergency contact on file</p></div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><ListTodo className="h-4 w-4" /> Tactical Mission Snapshot</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-2">
                            {tasks && tasks.length > 0 ? (
                                tasks.slice(0, 4).map((task) => (
                                    <div key={task.id} className="p-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between gap-3 group cursor-pointer hover:bg-muted transition-all" onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}>
                                        <div className="min-w-0">
                                            <p className="font-black text-xs tracking-tight truncate group-hover:text-primary transition-colors">{task.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40 h-4">{task.status}</Badge>
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No Due Date'}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs font-bold opacity-30 italic text-center py-4">No active missions</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><History className="h-4 w-4" /> Recent Activity</CardTitle></CardHeader>
                    <CardContent>
                        <ActivityTimeline attendance={attendance} tasks={tasks} />
                    </CardContent>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="structure" className="col-span-full mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><GitBranch className="h-4 w-4" /> Team Structure</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div><p className="text-[10px] font-black uppercase text-muted-foreground">Department</p><p className="mt-1 text-sm font-bold">{profile.departmentName || 'Operations'}</p></div>
                <div><p className="text-[10px] font-black uppercase text-muted-foreground">Manager</p><p className="mt-1 text-sm font-bold">{profile.managerId || 'Not assigned'}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="col-span-full mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Monitor className="h-4 w-4" /> Assigned Assets</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Primary device: <span className="font-bold text-foreground">{profile.deviceType || 'Not recorded'}</span></p></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment" className="col-span-full mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Briefcase className="h-4 w-4" /> Employment Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div><p className="text-[10px] font-black uppercase text-muted-foreground">Job Title</p><p className="mt-1 text-sm font-bold">{profile.jobTitle || 'Not specified'}</p></div>
                <div><p className="text-[10px] font-black uppercase text-muted-foreground">Employee ID</p><p className="mt-1 text-sm font-bold">{profile.employeeId || 'Not assigned'}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="attendance" className="col-span-full mt-0 focus-visible:outline-none">
              <StaffAttendanceAnalytics staffId={userId} />
            </TabsContent>
          )}

          <TabsContent value="documents" className="col-span-full mt-0 focus-visible:outline-none">
            <div className="space-y-6">
                {isAdmin && <StaffDocumentUpload userId={userId} orgId={profile.orgId} />}
                <Card>
                  <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><FileText className="h-4 w-4" /> Archived Documents</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {profile.documents?.length ? profile.documents.map((document: any, index: number) => (
                      <a key={`${document.url}-${index}`} href={document.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-muted">
                        <span className="truncate">{document.name || 'Untitled document'}</span><Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    )) : <p className="text-sm text-muted-foreground">No documents on file.</p>}
                  </CardContent>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="col-span-full mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Permissions</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div><p className="text-[10px] font-black uppercase text-muted-foreground">Assigned role</p><Badge className="mt-2">{profile.role.replace('_', ' ')}</Badge></div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Resolved capabilities</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.resolvedPermissions?.length ? profile.resolvedPermissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-[9px] font-bold">
                        {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS] || permission}
                      </Badge>
                    )) : <p className="text-sm text-muted-foreground">No resolved capabilities.</p>}
                  </div>
                </div>
                {isSuperAdminIdentity && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-wide text-amber-500">Super Admin Mode</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {canEnableSuperAdminMode ? 'Unlock backend tools and user impersonation for this session.' : 'Requires the SUPERADMIN role before this mode can be enabled.'}
                        </p>
                      </div>
                      {canEnableSuperAdminMode && (
                        <Switch
                          checked={isSuperAdminModeActive}
                          onCheckedChange={setIsSuperAdminModeActive}
                          aria-label="Enable Super Admin Mode"
                          className="data-[state=checked]:bg-amber-500"
                        />
                      )}
                    </div>
                    {canEnableSuperAdminMode && isSuperAdminModeActive && (
                      <Button variant="outline" className="mt-4 border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => uiEmitter.emit('open-database-explorer-dialog')}>
                        <ShieldCheck className="mr-2 h-4 w-4" /> Open Database Explorer
                      </Button>
                    )}
                  </div>
                )}
                {isAdmin && <UserAccessEditor userProfile={profile} />}
                {isAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-6">
                    <Button variant="outline" className="h-16 rounded-xl" onClick={handlePasswordReset} disabled={!!isProcessing}>
                      {isProcessing === 'RESET' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />} Reset access
                    </Button>
                    {!isOwnProfile && profile.role !== 'ORG_ADMIN' && (
                      <Button variant="destructive" className="h-16 rounded-xl" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" /> Decommission
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="rounded-[2rem] p-10 shadow-3xl">
              <AlertDialogHeader className="space-y-4 text-center">
                  <div className="mx-auto p-5 rounded-full bg-rose-500/10 w-fit text-rose-500">
                      <AlertTriangle className="h-10 w-10" />
                  </div>
                  <AlertDialogTitle className="text-3xl font-black font-headline tracking-tighter uppercase">Purge Protocol</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-bold uppercase tracking-widest opacity-60">
                      Warning: This will permanently remove {profile.fullName} from the organizational matrix.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-col gap-4 mt-8">
                  <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-[0.2em]">
                      {isDeleting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Confirm Purge"}
                  </AlertDialogAction>
                  <AlertDialogCancel className="h-10 border-none font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 hover:bg-transparent transition-all">Abort</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

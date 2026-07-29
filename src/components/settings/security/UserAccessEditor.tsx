'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import { AppRole, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  X,
  Loader2,
  RefreshCcw,
  Zap,
  KeyRound,
  Shield,
  Ban,
  CheckCircle2,
  Save,
  Database
} from 'lucide-react';
import { authService } from '@/services/auth-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PREDEFINED_DEPARTMENTS, ROLES_BY_DEPARTMENT, getRoleFromPosition } from '@/lib/roles-and-departments';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export function UserAccessEditor({ userProfile }: { userProfile: UserProfile }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for clearances and overrides
  const [selectedDept, setSelectedDept] = useState(userProfile.departmentName || "");
  const [selectedPos, setSelectedPos] = useState(userProfile.position || "");

  // Queries
  const rolesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'roles'), where('orgId', 'in', [userProfile.orgId, 'SYSTEM'])) : null
  , [firestore, userProfile.orgId]);
  const { data: allRoles, isLoading } = useCollection<AppRole>(rolesQuery);

  const currentRoleIds = userProfile.roleIds || [];
  const conflicts = authService.checkSoDConflicts(userProfile.resolvedPermissions || []);

  const rolesForDept = useMemo(() => {
    if (!selectedDept) return [];
    const deptRoles = (ROLES_BY_DEPARTMENT as any)[selectedDept] || [];
    return [...new Set(['Staff', ...deptRoles])];
  }, [selectedDept]);

  const handleToggleRole = async (roleId: string) => {
    if (!firestore) return;
    const newRoleIds = currentRoleIds.includes(roleId)
        ? currentRoleIds.filter(id => id !== roleId)
        : [...currentRoleIds, roleId];

    try {
        const userRef = doc(firestore, 'users', userProfile.id);
        await updateDoc(userRef, { roleIds: newRoleIds });
        await authService.syncUserPermissions(firestore, userProfile.id);
        toast({ title: "Authority Map Updated", description: "Role assignment has been synchronized." });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Assignment Failed", description: e.message });
    }
  };

  const handleSaveClearance = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
        const userRef = doc(firestore, 'users', userProfile.id);
        await updateDoc(userRef, {
            departmentName: selectedDept,
            position: selectedPos,
            role: getRoleFromPosition(selectedPos as any)
        });
        await authService.syncUserPermissions(firestore, userProfile.id);
        toast({ title: "Sector Synchronized", description: "Unit designation has been updated." });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleToggleCapability = async (key: string, val: boolean) => {
      if (!firestore) return;
      try {
          const userRef = doc(firestore, 'users', userProfile.id);
          await updateDoc(userRef, { [`customPermissions.${key}`]: val });
          await authService.syncUserPermissions(firestore, userProfile.id);
          toast({ title: "Capability Overridden", description: "Authority flag updated." });
      } catch (e: any) {
          toast({ variant: "destructive", title: "Override Failed", description: e.message });
      }
  };

  const handleModuleOverride = async (mod: string, state: string) => {
      if (!firestore) return;
      try {
          const userRef = doc(firestore, 'users', userProfile.id);
          await updateDoc(userRef, { [`customPermissions.modules.${mod}`]: state });
          await authService.syncUserPermissions(firestore, userProfile.id);
          toast({ title: "Module Gate Updated", description: "Interaction tier adjusted." });
      } catch (e: any) {
          toast({ variant: "destructive", title: "Update Failed", description: e.message });
      }
  };

  const handleFullSync = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    try {
        await authService.syncUserPermissions(firestore, userProfile.id);
        toast({ title: "Privilege Matrix Rebuilt", description: "Permissions cache is now up-to-date." });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
        setIsSyncing(false);
    }
  };

  const binaryPermissionItems = [
    { name: "canManageAccounting", label: "Accounting Terminal", desc: "Direct access to Chart of Accounts & GL." },
    { name: "canAccessRequisitions", label: "Procurement Hub Toggle", desc: "Alternative direct boolean toggle." },
    { name: "canAccessChat", label: "Secure Messaging Toggle", desc: "Alternative direct boolean toggle." },
    { name: "canManageAnnouncements", label: "Broadcasting", desc: "Permission to post organization-wide updates." },
    { name: "canViewAudit", label: "Infrastructure Audit", desc: "Review system interaction telemetry logs." },
    { name: "canManageDisplays", label: "Live Displays Admin", desc: "Direct node configuration rights." },
    { name: "canManageLibrary", label: "Library Master", desc: "Direct content modification rights." }
  ];

  const modulePermissionItems = [
    { name: "finance", label: "Procurement (Finance)" },
    { name: "chat", label: "Internal Comms (Chat)" },
    { name: "attendance", label: "Time & Attendance" },
    { name: "tasks", label: "Task Management" },
    { name: "workbooks", label: "Dynamic Workbooks" },
    { name: "library", label: "Knowledge Base (Library)" },
    { name: "leave", label: "Leave & Time-Off" },
    { name: "live_displays", label: "Live Displays" },
    { name: "reports", label: "Reports & Analytics" }
  ];

  if (isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;

  return (
    <div className="space-y-8">
      {/* 1. Functional Clearances */}
      <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl overflow-hidden">
         <CardHeader className="bg-amber-500/5 border-b border-amber-500/10">
            <CardTitle className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                Functional Clearance
            </CardTitle>
         </CardHeader>
         <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase opacity-60">Sector Assignment</Label>
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-white/5 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="m3-surface-high border-none rounded-2xl">
                            {PREDEFINED_DEPARTMENTS.map(d => <SelectItem key={d} value={d} className="font-bold text-xs uppercase">{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase opacity-60">Designation Node</Label>
                    <Select value={selectedPos} onValueChange={setSelectedPos} disabled={!selectedDept}>
                        <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-white/5 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="m3-surface-high border-none rounded-2xl">
                            {rolesForDept.map((r: string) => <SelectItem key={r} value={r} className="font-bold text-xs uppercase">{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button
                onClick={handleSaveClearance}
                disabled={isSaving || (selectedDept === userProfile.departmentName && selectedPos === userProfile.position)}
                className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive"
            >
                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Synchronize Designation
            </Button>
         </CardContent>
      </Card>

      {/* 2. Job Roles (Stackable) */}
      <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black font-headline tracking-tighter flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                Aggregated Job Roles
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">Stack multiple functional authorities.</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullSync}
            disabled={isSyncing}
            className="rounded-xl h-10 gap-2 font-black uppercase text-[9px] tracking-widest hover:bg-primary/10"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Flush Cache
          </Button>
        </CardHeader>
        <CardContent className="p-6">
            {conflicts.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-4 animate-in slide-in-from-top">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500"><ShieldAlert className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Compliance Protocol: Toxic Combination Detected</p>
                        {conflicts.map((c, i) => (
                            <p key={i} className="text-[9px] font-bold text-rose-600/80 uppercase leading-relaxed italic mt-1">{c.description}</p>
                        ))}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allRoles?.map(role => {
                    const isActive = currentRoleIds.includes(role.id);
                    return (
                        <div
                            key={role.id}
                            onClick={() => handleToggleRole(role.id)}
                            className={cn(
                                "p-5 rounded-[1.5rem] border transition-all cursor-pointer group flex flex-col justify-between h-32",
                                isActive
                                    ? "bg-primary border-primary text-white shadow-xl shadow-primary/20"
                                    : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            <div>
                                <p className="font-black text-xs uppercase tracking-tight">{role.name}</p>
                                <p className={cn("text-[8px] font-bold uppercase opacity-60 mt-1", isActive ? "text-white" : "text-muted-foreground")}>{role.duties.length} Duties</p>
                            </div>
                            <div className="flex justify-end">
                                {isActive ? <X className="h-4 w-4 opacity-50" /> : <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />}
                            </div>
                        </div>
                    )
                })}
            </div>
        </CardContent>
      </Card>

      {/* 3. Module & Capability Overrides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl p-6 h-fit">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Interaction Tiers
              </CardTitle>
              <div className="space-y-3">
                  {modulePermissionItems.map(mod => (
                      <div key={mod.name} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-tight">{mod.label}</span>
                          <Select
                            value={userProfile.customPermissions?.modules?.[mod.name as keyof typeof userProfile.customPermissions.modules] || 'default'}
                            onValueChange={(val) => handleModuleOverride(mod.name, val)}
                          >
                              <SelectTrigger className="w-32 h-8 rounded-lg bg-background/50 border-none text-[8px] font-black uppercase">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="m3-surface-high border-none rounded-xl">
                                  <SelectItem value="default" className="text-[8px] font-black uppercase">Default</SelectItem>
                                  <SelectItem value="hidden" className="text-[8px] font-black uppercase text-rose-500">Hidden</SelectItem>
                                  <SelectItem value="admin" className="text-[8px] font-black uppercase text-amber-500">Limited</SelectItem>
                                  <SelectItem value="staff" className="text-[8px] font-black uppercase text-emerald-500">Full</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  ))}
              </div>
          </Card>

          <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl p-6 h-fit">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Capability Overrides
              </CardTitle>
              <div className="space-y-4">
                  {binaryPermissionItems.map(perm => (
                      <div key={perm.name} className="flex items-center justify-between gap-6 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/20 transition-all">
                          <div className="space-y-0.5">
                              <p className="text-[10px] font-black uppercase tracking-tight">{perm.label}</p>
                              <p className="text-[8px] font-bold opacity-40 uppercase tracking-tighter">{perm.desc}</p>
                          </div>
                          <Switch
                            checked={!!(userProfile.customPermissions as any)?.[perm.name]}
                            onCheckedChange={(val) => handleToggleCapability(perm.name, val)}
                          />
                      </div>
                  ))}
              </div>
          </Card>
      </div>

      {/* 4. Resolved Matrix Visualization */}
      <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl p-8 border-l-4 border-l-primary">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Resolved privilege Node
            </h3>
        </div>
        <div className="flex flex-wrap gap-2">
            {userProfile.resolvedPermissions?.map(p => (
                <Badge key={p} variant="outline" className="text-[7px] font-mono border-white/10 uppercase tracking-tighter bg-black/20 px-2 py-1">
                    {p}
                </Badge>
            )) || <span className="text-[10px] italic opacity-30">No permissions identified. Unit restricted.</span>}
        </div>
      </Card>
    </div>
  );
}

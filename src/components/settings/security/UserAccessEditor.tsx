'use client';

import { useState } from 'react';
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
  Zap
} from 'lucide-react';
import { authService } from '@/services/auth-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function UserAccessEditor({ userProfile }: { userProfile: UserProfile }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  // Queries
  const rolesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'roles'), where('orgId', 'in', [userProfile.orgId, 'SYSTEM'])) : null
  , [firestore, userProfile.orgId]);
  const { data: allRoles, isLoading } = useCollection<AppRole>(rolesQuery);

  const currentRoleIds = userProfile.roleIds || [];

  const handleToggleRole = async (roleId: string) => {
    if (!firestore) return;
    const newRoleIds = currentRoleIds.includes(roleId)
        ? currentRoleIds.filter(id => id !== roleId)
        : [...currentRoleIds, roleId];

    try {
        const userRef = doc(firestore, 'users', userProfile.id);
        await updateDoc(userRef, { roleIds: newRoleIds });
        toast({ title: "Authority Map Updated", description: "Role assignment has been synchronized." });

        // Auto-sync permissions cache
        setIsSyncing(true);
        await authService.syncUserPermissions(firestore, userProfile.id);
        setIsSyncing(false);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Assignment Failed", description: e.message });
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

  if (isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;

  return (
    <div className="space-y-6">
      <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Active Job Roles
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">Assign functional authorities to this unit.</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullSync}
            disabled={isSyncing}
            className="rounded-xl h-10 gap-2 font-black uppercase text-[9px] tracking-widest hover:bg-primary/10"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Rebuild Cache
          </Button>
        </CardHeader>
        <CardContent className="p-6">
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
                                <p className={cn("text-[8px] font-bold uppercase opacity-60 mt-1", isActive ? "text-white" : "text-muted-foreground")}>{role.duties.length} Duties Assigned</p>
                            </div>
                            <div className="flex justify-end">
                                {isActive ? (
                                    <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center"><X className="h-3 w-3" /></div>
                                ) : (
                                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="h-3 w-3" /></div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </CardContent>
      </Card>

      <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl overflow-hidden border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Resolved Permission Node
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-1.5 opacity-60">
                {userProfile.resolvedPermissions?.map(p => (
                    <Badge key={p} variant="outline" className="text-[7px] font-mono border-white/10 uppercase tracking-tighter">{p}</Badge>
                )) || <span className="text-[10px] italic opacity-30">Awaiting synchronization...</span>}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

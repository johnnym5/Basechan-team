'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { AppRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Plus,
  Trash2,
  Settings2,
  Database,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search
} from 'lucide-react';
import { authService } from '@/services/auth-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PERMISSIONS, DUTIES } from '@/lib/permissions-registry';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function RoleManager({ orgId }: { orgId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);

  // Queries
  const rolesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'roles'), where('orgId', 'in', [orgId, 'SYSTEM'])) : null
  , [firestore, orgId]);
  const { data: roles, isLoading } = useCollection<AppRole>(rolesQuery);

  const handleSeed = async () => {
    if (!firestore) return;
    try {
        await authService.seedSystemRoles(firestore);
        toast({ title: "Infrastructure Ready", description: "Default system roles have been synchronized." });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Seeding Failed", description: e.message });
    }
  };

  const handleSaveRole = async (role: Partial<AppRole>) => {
    if (!firestore) return;
    const roleId = role.id || `role_${Date.now()}`;
    const payload = {
        ...role,
        id: roleId,
        orgId,
        updatedAt: new Date().toISOString(),
        createdAt: role.createdAt || new Date().toISOString(),
    };

    try {
        await setDoc(doc(firestore, 'roles', roleId), payload, { merge: true });
        toast({ title: "Role Optimized", description: `Access policy "${role.name}" has been updated.` });
        setIsCreating(false);
        setEditingRole(null);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Optimization Failed", description: e.message });
    }
  };

  const filteredRoles = roles?.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Find access policy..."
                className="pl-10 h-12 bg-background/50 rounded-2xl border-white/5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleSeed} className="rounded-xl h-12 gap-2 border-white/5 bg-white/5 hover:bg-white/10">
                <Database className="h-4 w-4" /> Seed System
            </Button>
            <Button onClick={() => setIsCreating(true)} className="rounded-xl h-12 gap-2 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                <Plus className="h-4 w-4" /> Create Role
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <Card key={role.id} className="m3-surface-low border-none rounded-[2rem] shadow-xl group hover:shadow-2xl transition-all">
            <CardHeader className="pb-3 flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg font-black font-headline tracking-tighter flex items-center gap-2">
                    {role.isSystem ? <Shield className="h-4 w-4 text-amber-500" /> : <Settings2 className="h-4 w-4 text-primary" />}
                    {role.name}
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">{role.description || 'Custom defined role'}</CardDescription>
              </div>
              {role.isSystem && (
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger><Lock className="h-3 w-3 opacity-20" /></TooltipTrigger>
                        <TooltipContent>System immutable policy</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                    {role.duties.map(duty => (
                        <Badge key={duty} variant="secondary" className="bg-primary/10 text-primary text-[8px] font-black uppercase border-primary/20">
                            {duty.replace(/_/g, ' ')}
                        </Badge>
                    ))}
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase opacity-40">{role.permissions.length} Privilege Points</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setEditingRole(role)}>
                            <Settings2 className="h-4 w-4" />
                        </Button>
                        {!role.isSystem && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10" onClick={async () => {
                                if(confirm('Purge this role?')) await deleteDoc(doc(firestore!, 'roles', role.id));
                            }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(isCreating || editingRole) && (
          <RoleEditor
            role={editingRole || undefined}
            onSave={handleSaveRole}
            onCancel={() => { setIsCreating(false); setEditingRole(null); }}
          />
      )}
    </div>
  );
}

function RoleEditor({ role, onSave, onCancel }: { role?: AppRole, onSave: (r: Partial<AppRole>) => void, onCancel: () => void }) {
    const [name, setName] = useState(role?.name || '');
    const [description, setDescription] = useState(role?.description || '');
    const [selectedDuties, setSelectedDuties] = useState<string[]>(role?.duties || []);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions || []);

    const conflicts = authService.checkSoDConflicts(selectedPermissions);

    const toggleDuty = (dutyId: string) => {
        const duties = selectedDuties.includes(dutyId)
            ? selectedDuties.filter(d => d !== dutyId)
            : [...selectedDuties, dutyId];

        setSelectedDuties(duties);

        // Re-resolve permissions from duties
        const perms = new Set<string>();
        duties.forEach(d => {
            const dutyPerms = (DUTIES as any)[d];
            if (dutyPerms) dutyPerms.forEach((p: string) => perms.add(p));
        });
        setSelectedPermissions(Array.from(perms));
    };

    return (
        <Dialog open onOpenChange={onCancel}>
            <DialogContent className="max-w-2xl m3-surface-high border-none rounded-[2.5rem] p-8 shadow-3xl">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black font-headline tracking-tighter">
                        {role ? 'Edit Policy' : 'Create Access Policy'}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {conflicts.length > 0 && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 animate-in slide-in-from-top duration-500">
                            <div className="flex items-center gap-2 text-amber-500">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">SoD Conflict Detected</span>
                            </div>
                            {conflicts.map((c, i) => (
                                <p key={i} className="text-[9px] font-bold text-amber-600/80 uppercase leading-relaxed italic">
                                    {c.description}
                                </p>
                            ))}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Policy Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl bg-background/50 h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Description</Label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl bg-background/50 h-11" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Module Duties (Standard Sets)</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.keys(DUTIES).map(dutyId => (
                                <div key={dutyId} onClick={() => toggleDuty(dutyId)} className={cn(
                                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                                    selectedDuties.includes(dutyId) ? "bg-primary/10 border-primary shadow-lg" : "bg-white/5 border-white/5 hover:bg-white/10"
                                )}>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{dutyId.replace(/_/g, ' ')}</span>
                                    {selectedDuties.includes(dutyId) && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Resolved Privilege Matrix ({selectedPermissions.length})</Label>
                        <ScrollArea className="h-48 border border-white/5 rounded-2xl p-4 bg-black/20">
                            <div className="grid grid-cols-2 gap-2">
                                {Object.values(PERMISSIONS).map(p => (
                                    <div key={p} className="flex items-center gap-2 opacity-60 group">
                                        <div className={cn("h-1.5 w-1.5 rounded-full", selectedPermissions.includes(p) ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                                        <span className="text-[8px] font-mono uppercase tracking-tighter truncate">{p}</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onCancel} className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest border-white/10 hover:bg-white/5">Cancel</Button>
                        <Button onClick={() => onSave({ ...role, name, description, duties: selectedDuties, permissions: selectedPermissions })} className="flex-[2] rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive">
                            Optimize Access Policy
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Sub-components need to be imported or defined... I'll assume they exist or use local ones
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

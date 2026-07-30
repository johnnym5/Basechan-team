'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, MoreHorizontal, Eye, Filter, ShieldCheck, Users, PlusCircle } from 'lucide-react';
import { useOrganizationStaff } from '@/hooks/useStaff';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { InviteUserDialog } from '@/components/settings/InviteUserDialog';

interface UnifiedStaffDirectoryProps {
  orgId: string;
  currentUserProfile: UserProfile;
  canManageStaff: boolean;
  onViewEmployee360: (userId: string) => void;
}

export function UnifiedStaffDirectory({ orgId, currentUserProfile, canManageStaff, onViewEmployee360 }: UnifiedStaffDirectoryProps) {
  const { data: staff, isLoading, refetch } = useOrganizationStaff(orgId);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [deptFilter, setDepartmentFilter] = useState<string>('ALL');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return staff.filter(person => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = person.fullName.toLowerCase().includes(searchStr) ||
                           person.email.toLowerCase().includes(searchStr) ||
                           person.employeeId?.toLowerCase().includes(searchStr);

      const matchesRole = roleFilter === 'ALL' || person.role === roleFilter;
      const matchesDept = deptFilter === 'ALL' || person.departmentName === deptFilter;

      return matchesSearch && matchesRole && matchesDept;
    });
  }, [staff, searchTerm, roleFilter, deptFilter]);

  const departments = useMemo(() => {
    if (!staff) return [];
    const depts = new Set(staff.map(s => s.departmentName).filter(Boolean));
    return Array.from(depts);
  }, [staff]);

  if (isLoading) return <Skeleton className="h-[500px] w-full rounded-[2.5rem]" />;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Search & Global Filter Shell */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
          <Input
            placeholder="Identify unit by name, email, or serial..."
            className="pl-12 rounded-2xl bg-background/50 border-white/5 h-12 text-sm font-medium"
            value={searchTerm ?? ""}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {canManageStaff && (
              <Button onClick={() => setIsInviteOpen(true)} className="rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Unit
              </Button>
          )}

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px] rounded-xl bg-background/50 border-white/5 h-12 text-[10px] font-black uppercase tracking-widest">
              <SelectValue placeholder="System Role" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl m3-surface-high border-none">
              <SelectItem value="ALL">All Authority</SelectItem>
              <SelectItem value="ORG_ADMIN">Administrators</SelectItem>
              <SelectItem value="HR_MANAGER">HR Command</SelectItem>
              <SelectItem value="FINANCE_MANAGER">Finance Ops</SelectItem>
              <SelectItem value="STAFF">Regular Staff</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px] rounded-xl bg-background/50 border-white/5 h-12 text-[10px] font-black uppercase tracking-widest">
              <SelectValue placeholder="Sector/Dept" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl m3-surface-high border-none">
              <SelectItem value="ALL">All Sectors</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Directory Table */}
      <div className="flex-1 overflow-hidden border border-border/60 bg-muted/30 rounded-xl p-0 shadow-sm relative">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-secondary/20 sticky top-0 z-20 backdrop-blur-md">
              <TableRow className="border-white/5 hover:bg-transparent h-14">
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] pl-8">Personnel Asset</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em]">Sector / Designation</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em]">Live Status</TableHead>
                <TableHead className="w-[100px] pr-8 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-96 text-center">
                     <div className="flex flex-col items-center gap-3 opacity-20">
                        <Users className="h-12 w-12" />
                        <p className="font-black uppercase text-[10px] tracking-[0.3em]">Zero Personnel Identified</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((person) => {
                  const isOnline = person.status === 'ONLINE' || person.status === 'ACTIVE';
                  const onLeave = person.status === 'ON_LEAVE';

                  return (
                    <TableRow
                      key={person.id}
                      className="border-white/5 hover:bg-primary/5 transition-all cursor-pointer group h-20"
                      onClick={() => onViewEmployee360(person.id)}
                    >
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                             <Avatar className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/50 transition-all rounded-2xl shadow-lg">
                               <AvatarImage src={person.avatarUrl || ''} />
                               <AvatarFallback className="bg-secondary text-white font-black text-xs">{person.fullName.charAt(0)}</AvatarFallback>
                             </Avatar>
                             {isOnline && <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-black text-sm tracking-tight text-white">{person.fullName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{person.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                           <p className="text-xs font-black text-primary uppercase tracking-tight">{person.jobTitle || 'Unit Staff'}</p>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">{person.departmentName || 'Operations'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                         <Badge variant="outline" className={cn(
                           "text-[8px] font-black uppercase border-none px-3 py-1 rounded-lg",
                           isOnline ? "bg-emerald-500/10 text-emerald-500" :
                           onLeave ? "bg-amber-500/10 text-amber-500" :
                           "bg-rose-500/10 text-rose-500"
                         )}>
                           {person.status || 'OFFLINE'}
                         </Badge>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100">
                            <Eye className="h-5 w-5 text-primary" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <InviteUserDialog
          open={isInviteOpen}
          onOpenChange={(open) => {
              setIsInviteOpen(open);
              if (!open) refetch();
          }}
          currentUserProfile={currentUserProfile}
      />
    </div>
  );
}

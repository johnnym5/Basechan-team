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
import { Search, MoreHorizontal, Eye, Filter, ShieldCheck, Users, PlusCircle, FileText } from 'lucide-react';
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
import { StaffQuickViewSheet } from './StaffQuickViewSheet';

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
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border border-border bg-muted/50 rounded-xl p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
          <Input
            placeholder="Search employees by name, email, or ID..."
            className="pl-12 rounded-2xl bg-background/50 border-border/50 h-12 text-sm font-medium text-foreground"
            value={searchTerm ?? ""}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {canManageStaff && (
              <Button onClick={() => setIsInviteOpen(true)} className="rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Staff
              </Button>
          )}

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px] rounded-xl bg-background/50 border-border/50 h-12 text-[10px] font-black uppercase tracking-widest text-foreground">
              <SelectValue placeholder="User Role" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl m3-surface-high border-none">
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ORG_ADMIN">Administrators</SelectItem>
              <SelectItem value="HR_MANAGER">HR Team</SelectItem>
              <SelectItem value="FINANCE_MANAGER">Finance Team</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px] rounded-xl bg-background/50 border-border/50 h-12 text-[10px] font-black uppercase tracking-widest text-foreground">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl m3-surface-high border-none">
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Directory Table */}
      <div className="flex-1 overflow-hidden border border-border bg-muted/50 rounded-xl p-0 shadow-sm relative">
        <div className="h-full overflow-y-auto custom-scrollbar overflow-x-auto w-full">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-secondary sticky top-0 z-20 backdrop-blur-md">
              <TableRow className="border-border/50 hover:bg-transparent h-14">
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] pl-8 text-muted-foreground">Team Member</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Department / Job Title</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Daily Reports</TableHead>
                <TableHead className="w-[100px] pr-8 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-96 text-center">
                     <div className="flex flex-col items-center gap-3 opacity-20">
                        <Users className="h-12 w-12 text-muted-foreground" />
                        <p className="font-black uppercase text-[10px] tracking-[0.3em] text-muted-foreground">No Employees Found</p>
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
                      className="border-border/50 hover:bg-primary/5 transition-all cursor-pointer group h-20"
                      onClick={() => {
                        setSelectedStaffId(person.id);
                        setIsQuickViewOpen(true);
                      }}
                    >
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                             <Avatar className="h-12 w-12 border-2 border-border group-hover:border-primary/50 transition-all rounded-2xl shadow-lg">
                               <AvatarImage src={person.avatarUrl || ''} />
                               <AvatarFallback className="bg-secondary text-foreground font-black text-xs">{person.fullName.charAt(0)}</AvatarFallback>
                             </Avatar>
                             {isOnline && <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-black text-sm tracking-tight text-white truncate">{person.fullName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">{person.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 min-w-0">
                           <p className="text-xs font-black text-primary uppercase tracking-tight truncate">{person.jobTitle || 'Unit Staff'}</p>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50 truncate">{person.departmentName || 'Operations'}</p>
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
                      <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-9 px-4 gap-2 border border-border/50 bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all text-[9px] font-black uppercase tracking-widest"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStaffId(person.id);
                                setIsQuickViewOpen(true);
                            }}
                          >
                             <FileText className="h-3.5 w-3.5" /> Reports
                          </Button>
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

      <StaffQuickViewSheet
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setSelectedStaffId(null);
        }}
        userId={selectedStaffId}
        orgId={orgId}
        onViewFullProfile={onViewEmployee360}
      />
    </div>
  );
}

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
import { Search, MoreHorizontal, Eye } from 'lucide-react';
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

interface StaffDirectoryTableProps {
  orgId: string;
  onViewProfile: (userId: string) => void;
}

export function StaffDirectoryTable({ orgId, onViewProfile }: StaffDirectoryTableProps) {
  const { data: staff, isLoading } = useOrganizationStaff(orgId);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [deptFilter, setDepartmentFilter] = useState<string>('ALL');

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return staff.filter(person => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = person.fullName.toLowerCase().includes(searchStr) ||
                           person.email.toLowerCase().includes(searchStr) ||
                           (person.employeeId && person.employeeId.toLowerCase().includes(searchStr)) ||
                           (person.skills && person.skills.some(skill => skill.toLowerCase().includes(searchStr))) ||
                           (person.languages && person.languages.some(lang => lang.toLowerCase().includes(searchStr)));

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-2xl border border-white/5 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or ID..."
            className="pl-10 rounded-xl bg-background/50 border-white/5 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px] rounded-xl bg-background/50 border-white/5 h-11">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl m3-surface-high border-none">
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ORG_ADMIN">Admin</SelectItem>
              <SelectItem value="HR_MANAGER">HR</SelectItem>
              <SelectItem value="FINANCE_MANAGER">Finance</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px] rounded-xl bg-background/50 border-white/5 h-11">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="rounded-xl m3-surface-high border-none">
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept as string}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-white/5 rounded-[2rem] bg-card/30 backdrop-blur-md shadow-xl">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-secondary/20 sticky top-0 z-10">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-black uppercase text-[10px] tracking-widest pl-6">Staff Member</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">ID</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Department</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Role</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                <TableHead className="w-[80px] pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-muted-foreground uppercase font-black text-[10px] tracking-widest opacity-30">
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((person) => (
                  <TableRow key={person.id} className="border-white/5 hover:bg-primary/5 transition-colors cursor-pointer group" onClick={() => onViewProfile(person.id)}>
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-white/10 group-hover:border-primary/50 transition-all rounded-2xl">
                          <AvatarImage src={person.avatarUrl || ''} />
                          <AvatarFallback className="bg-secondary text-white font-black text-xs">{person.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-black text-sm tracking-tight">{person.fullName}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{person.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs opacity-60">{person.employeeId || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold uppercase tracking-wider">{person.departmentName || 'General'}</span>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="text-[8px] font-black uppercase border-white/10 bg-white/5">
                        {person.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[8px] font-black uppercase border-none",
                        person.status === 'ACTIVE' || person.status === 'ONLINE' ? "bg-emerald-500/10 text-emerald-500" :
                        person.status === 'ON_LEAVE' ? "bg-amber-500/10 text-amber-500" :
                        "bg-rose-500/10 text-rose-500"
                      )}>
                        {person.status || 'OFFLINE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-all">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="m3-surface-high border-none rounded-2xl p-1 shadow-3xl">
                          <DropdownMenuItem onClick={() => onViewProfile(person.id)} className="rounded-xl h-10 gap-3 font-black uppercase text-[10px] tracking-widest">
                            <Eye className="h-4 w-4 text-primary" /> View Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

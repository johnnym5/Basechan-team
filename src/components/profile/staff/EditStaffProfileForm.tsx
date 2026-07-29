'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffProfileSchema, type StaffProfileFormValues } from '@/lib/validations/staff';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateStaffProfile } from '@/hooks/useStaff';
import { Loader2, Save, X } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';

interface EditStaffProfileFormProps {
  profile: UserProfile;
  onCancel: () => void;
  permissions: Permissions;
}

export function EditStaffProfileForm({ profile, onCancel, permissions }: EditStaffProfileFormProps) {
  const updateMutation = useUpdateStaffProfile();

  const form = useForm<StaffProfileFormValues>({
    resolver: zodResolver(staffProfileSchema),
    defaultValues: {
      firstName: profile.firstName || profile.fullName.split(' ')[0] || '',
      lastName: profile.lastName || profile.fullName.split(' ').slice(1).join(' ') || '',
      email: profile.email,
      phoneNumber: profile.phoneNumber || '',
      dateOfBirth: profile.dateOfBirth || '',
      address: profile.address || '',
      employeeId: profile.employeeId || '',
      jobTitle: profile.jobTitle || '',
      departmentName: profile.departmentName || '',
      role: profile.role,
      employmentType: profile.employmentType || 'FULL_TIME',
      managerId: profile.managerId || '',
      joinDate: profile.joinDate || '',
      status: profile.status || 'ACTIVE',
      emergencyContact: profile.emergencyContact || { name: '', relationship: '', phone: '' },
      orgId: profile.orgId,
      id: profile.id,
    },
  });

  const onSubmit = async (values: StaffProfileFormValues) => {
    // Re-construct fullName if names changed
    const fullName = `${values.firstName} ${values.lastName}`.trim();
    await updateMutation.mutateAsync({
      userId: profile.id,
      data: { ...values, fullName },
    });
    onCancel();
  };

  const isHR = permissions.canManageStaff;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section 1: Personal Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl">
              <CardHeader><CardTitle className="text-sm uppercase tracking-widest opacity-50">Personal Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Corporate Email</FormLabel><FormControl><Input {...field} disabled={!isHR} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} value={field.value || ''} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Residential Address</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="m3-surface-low border-none rounded-[2rem] shadow-xl">
              <CardHeader><CardTitle className="text-sm uppercase tracking-widest opacity-50">Emergency Contact</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="emergencyContact.name" render={({ field }) => (
                  <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="emergencyContact.relationship" render={({ field }) => (
                  <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="emergencyContact.phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          {/* Section 2: Employment Details (HR Restricted) */}
          <div className="space-y-6">
            <Card className={cn("m3-surface-low border-none rounded-[2rem] shadow-xl overflow-hidden", !isHR && "opacity-60 grayscale pointer-events-none")}>
              <CardHeader className="bg-primary/5 border-b border-primary/10"><CardTitle className="text-sm uppercase tracking-widest text-primary">Employment (HR ONLY)</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-6">
                <FormField control={form.control} name="employeeId" render={({ field }) => (
                  <FormItem><FormLabel>Employee ID</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50 font-mono" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="jobTitle" render={({ field }) => (
                  <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="departmentName" render={({ field }) => (
                  <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} className="rounded-xl bg-background/50" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="employmentType" render={({ field }) => (
                  <FormItem><FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl bg-background/50"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-xl border-none m3-surface-high">
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                        <SelectItem value="INTERN">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>System Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl bg-background/50"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-xl border-none m3-surface-high">
                        <SelectItem value="STAFF">Staff</SelectItem>
                        <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                        <SelectItem value="FINANCE_MANAGER">Finance Manager</SelectItem>
                        <SelectItem value="MANAGING_DIRECTOR">Managing Director</SelectItem>
                        <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Profile Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl bg-background/50"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-xl border-none m3-surface-high">
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest border-white/10 hover:bg-white/5">
                <X className="mr-2 h-4 w-4" /> Discard
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="flex-[2] rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive">
                {updateMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

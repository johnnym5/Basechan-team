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
  FormMessage,
  FormDescription
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
import { Textarea } from '@/components/ui/textarea';
import { useUpdateStaffProfile } from '@/hooks/useStaff';
import { Loader2, Save, X } from 'lucide-react';
import type { UserProfile, Permissions } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface EditStaffProfileFormProps {
  profile: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: Permissions;
}

export function EditStaffProfileForm({ profile, open, onOpenChange, permissions }: EditStaffProfileFormProps) {
  const updateMutation = useUpdateStaffProfile();

  const form = useForm<StaffProfileFormValues>({
    resolver: zodResolver(staffProfileSchema),
    defaultValues: {
      firstName: profile.firstName || profile.fullName?.split(' ')[0] || '',
      lastName: profile.lastName || profile.fullName?.split(' ').slice(1).join(' ') || '',
      email: profile.email || '',
      phoneNumber: profile.phoneNumber || '',
      dateOfBirth: profile.dateOfBirth || '',
      address: profile.address || '',
      employeeId: profile.employeeId || '',
      jobTitle: profile.jobTitle || '',
      departmentName: profile.departmentName || '',
      role: profile.role || 'STAFF',
      employmentType: profile.employmentType || 'FULL_TIME',
      managerId: profile.managerId || '',
      joinDate: profile.joinDate || '',
      status: profile.status || 'ACTIVE',
      employmentHistory: profile.employmentHistory || [],
      workSchedule: profile.workSchedule || { days: ['MON', 'TUE', 'WED', 'THU', 'FRI'], hours: '09:00 - 17:00' },
      assignedEquipment: profile.assignedEquipment || [],
      softwareLicenses: profile.softwareLicenses || [],
      emergencyContact: {
        name: profile.emergencyContact?.name || '',
        relationship: profile.emergencyContact?.relationship || '',
        phone: profile.emergencyContact?.phone || '',
      },
      preferredName: profile.preferredName || '',
      pronouns: profile.pronouns || '',
      bio: profile.bio || '',
      timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: profile.location || '',
      orgId: profile.orgId || '',
      id: profile.id || '',
    },
  });

  const onSubmit = async (values: StaffProfileFormValues) => {
    const fullName = `${values.firstName} ${values.lastName}`.trim();
    await updateMutation.mutateAsync({
      userId: profile.id,
      data: { ...values, fullName },
    });
    onOpenChange(false);
  };

  const isHR = permissions.canManageStaff;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl sm:rounded-xl">

        {/* 1. FIXED HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="text-xl font-black font-headline tracking-tighter uppercase">Modify Staff Profile</DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
            Update personnel identity, contact details, and credentials.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0">

            {/* 2. SCROLLABLE BODY */}
            <div className="overflow-y-auto max-h-[65vh] p-6 space-y-8 scroll-smooth custom-scrollbar">

              {/* SECTION: Identity & Bio */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Identity & Mission Bio</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="preferredName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Preferred Name</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} placeholder="Callsign" className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="pronouns" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Pronouns</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} placeholder="e.g. He/Him" className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bio" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Professional Bio</FormLabel>
                        <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Describe operational expertise..." className="rounded-xl bg-background/50 min-h-[100px] resize-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="location" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Work Location</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} placeholder="e.g. Remote" className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="timezone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger className="rounded-xl bg-background/50 h-11 font-medium"><SelectValue placeholder="Select Timezone" /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl border-none m3-surface-high max-h-[300px]">
                            {Intl.supportedValuesOf('timeZone').map(tz => (
                              <SelectItem key={tz} value={tz} className="text-xs font-bold uppercase">{tz.replace(/_/g, ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="skills" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Expertise Tags</FormLabel>
                        <FormControl><Input placeholder="React, Python, etc." value={field.value?.join(', ') || ''} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="languages" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Languages</FormLabel>
                        <FormControl><Input placeholder="English, French, etc." value={field.value?.join(', ') || ''} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
              </div>

              {/* SECTION: Personal Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">First Name</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Last Name</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Phone Number</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Date of Birth</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Residential Address</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
              </div>

              {/* SECTION: Emergency Contact */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-amber-500 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Emergency Contact</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="emergencyContact.name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Contact Name</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="emergencyContact.relationship" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Relationship</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="emergencyContact.phone" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Emergency Phone</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
              </div>

              {/* SECTION: Employment */}
              <div className={cn("space-y-6", !isHR && "opacity-60")}>
                <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-rose-500 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Employment & Clearance</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Corporate Email</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} readOnly className="rounded-xl bg-muted h-11 font-bold cursor-not-allowed" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="employeeId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Employee ID</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} readOnly className="rounded-xl bg-muted h-11 font-mono cursor-not-allowed" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="jobTitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Job Title</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} disabled={!isHR} className="rounded-xl bg-background/50 h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="departmentName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Department</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} readOnly className="rounded-xl bg-muted h-11 cursor-not-allowed font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="employmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Employment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!isHR}>
                          <FormControl><SelectTrigger className="rounded-xl bg-background/50 h-11 font-medium"><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl border-none m3-surface-high">
                            <SelectItem value="FULL_TIME" className="text-xs font-bold uppercase">Full Time</SelectItem>
                            <SelectItem value="PART_TIME" className="text-xs font-bold uppercase">Part Time</SelectItem>
                            <SelectItem value="CONTRACT" className="text-xs font-bold uppercase">Contract</SelectItem>
                            <SelectItem value="INTERN" className="text-xs font-bold uppercase">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">System Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!isHR}>
                          <FormControl><SelectTrigger className="rounded-xl bg-background/50 h-11 font-medium"><SelectValue placeholder="Select Role" /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl border-none m3-surface-high">
                            <SelectItem value="STAFF" className="text-xs font-bold uppercase">Staff</SelectItem>
                            <SelectItem value="HR_MANAGER" className="text-xs font-bold uppercase">HR Manager</SelectItem>
                            <SelectItem value="FINANCE_MANAGER" className="text-xs font-bold uppercase">Finance Manager</SelectItem>
                            <SelectItem value="MANAGING_DIRECTOR" className="text-xs font-bold uppercase">Managing Director</SelectItem>
                            <SelectItem value="ORG_ADMIN" className="text-xs font-bold uppercase">Org Admin</SelectItem>
                            <SelectItem value="SUPERADMIN" className="text-xs font-bold uppercase">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Profile Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!isHR}>
                          <FormControl><SelectTrigger className="rounded-xl bg-background/50 h-11 font-medium"><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl border-none m3-surface-high">
                            <SelectItem value="ACTIVE" className="text-xs font-bold uppercase">Active</SelectItem>
                            <SelectItem value="ON_LEAVE" className="text-xs font-bold uppercase">On Leave</SelectItem>
                            <SelectItem value="SUSPENDED" className="text-xs font-bold uppercase">Suspended</SelectItem>
                            <SelectItem value="TERMINATED" className="text-xs font-bold uppercase text-rose-500">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
              </div>

            </div>

            {/* 3. FIXED ACTION FOOTER */}
            <div className="flex justify-end items-center gap-4 border-t border-border bg-muted/30 px-6 py-4 shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest border-white/10 hover:bg-white/5">
                <X className="mr-2 h-4 w-4" /> Discard Changes
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive bg-primary text-primary-foreground">
                {updateMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Authorize Update
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, KeyRound, ShieldCheck, Ban, CheckCircle2, Save } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, UserPosition } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getRoleFromPosition, PREDEFINED_DEPARTMENTS, ROLES_BY_DEPARTMENT } from "@/lib/roles-and-departments";
import { sanitizeInput } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { ScrollArea } from "../ui/scroll-area";

const formSchema = z.object({
  fullName: z.string().min(1, "Identity name is required."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  email: z.string().email("Invalid email format."),
  phoneNumber: z.string().optional().nullable(),
  position: z.string().min(1, "Position is required."),
  departmentName: z.string().min(1, "Department is required."),
  customPermissions: z.object({
    canAccessRequisitions: z.boolean().optional(),
    canAccessChat: z.boolean().optional(),
    canManageAccounting: z.boolean().optional(),
    canAccessLibrary: z.boolean().optional(),
    canManageAnnouncements: z.boolean().optional(),
    canViewAudit: z.boolean().optional(),
  }).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: UserProfile;
}

export function EditUserDialog({ open, onOpenChange, userToEdit }: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const prevDeptRef = useRef<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      username: "",
      phoneNumber: "",
      position: "",
      departmentName: "",
      customPermissions: {
        canAccessRequisitions: false,
        canAccessChat: false,
        canManageAccounting: false,
        canAccessLibrary: false,
        canManageAnnouncements: false,
        canViewAudit: false,
      },
    }
  });

  const selectedDepartment = form.watch('departmentName');

  useEffect(() => {
    if (userToEdit && open) {
      form.reset({
        fullName: userToEdit.fullName || "",
        email: userToEdit.email || "",
        username: userToEdit.username || "",
        phoneNumber: userToEdit.phoneNumber || "",
        position: userToEdit.position || "",
        departmentName: userToEdit.departmentName || "",
        customPermissions: {
            canAccessRequisitions: !!userToEdit.customPermissions?.canAccessRequisitions,
            canAccessChat: !!userToEdit.customPermissions?.canAccessChat,
            canManageAccounting: !!userToEdit.customPermissions?.canManageAccounting,
            canAccessLibrary: !!userToEdit.customPermissions?.canAccessLibrary,
            canManageAnnouncements: !!userToEdit.customPermissions?.canManageAnnouncements,
            canViewAudit: !!userToEdit.customPermissions?.canViewAudit,
        },
      });
      prevDeptRef.current = userToEdit.departmentName || null;
    }
  }, [userToEdit, form, open]);
  
  useEffect(() => {
    if (prevDeptRef.current && prevDeptRef.current !== selectedDepartment && selectedDepartment !== "" && prevDeptRef.current !== "") {
        form.setValue('position', '');
    }
    prevDeptRef.current = selectedDepartment || null;
  }, [selectedDepartment, form]);

  const rolesForSelectedDepartment = useMemo(() => {
    if (!selectedDepartment) return [];
    const departmentRoles = ROLES_BY_DEPARTMENT[selectedDepartment as keyof typeof ROLES_BY_DEPARTMENT] || [];
    const rolesToShow = [...new Set(['Staff', ...departmentRoles])];
    
    if (userToEdit && userToEdit.position && !rolesToShow.includes(userToEdit.position)) {
        rolesToShow.push(userToEdit.position);
    }
    return rolesToShow;
  }, [selectedDepartment, userToEdit]);


  async function onSubmit(values: FormData) {
    if (!firestore || !userToEdit) return;
    setIsLoading(true);

    try {
      const userRef = doc(firestore, 'users', userToEdit.id);
      
      // Explicitly sanitize permissions to ensure no 'undefined' values reach Firestore
      const sanitizedPermissions = {
        canAccessRequisitions: !!values.customPermissions?.canAccessRequisitions,
        canAccessChat: !!values.customPermissions?.canAccessChat,
        canManageAccounting: !!values.customPermissions?.canManageAccounting,
        canAccessLibrary: !!values.customPermissions?.canAccessLibrary,
        canManageAnnouncements: !!values.customPermissions?.canManageAnnouncements,
        canViewAudit: !!values.customPermissions?.canViewAudit,
      };

      await updateDoc(userRef, {
        fullName: sanitizeInput(values.fullName),
        email: sanitizeInput(values.email.toLowerCase()),
        username: sanitizeInput(values.username.toLowerCase()),
        phoneNumber: values.phoneNumber ? sanitizeInput(values.phoneNumber) : null,
        position: values.position,
        departmentName: values.departmentName,
        role: getRoleFromPosition(values.position as UserPosition),
        customPermissions: sanitizedPermissions,
      });

      toast({
        title: "User Synchronized",
        description: `Personnel records for ${userToEdit.fullName} have been updated.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Administrative Sync Failure:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to commit system updates.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const onValidationError = (errors: any) => {
    console.error("Authorization Profile Validation Failure Details:", JSON.stringify(errors, null, 2));
    toast({
        variant: "destructive",
        title: "Deployment Blocked",
        description: "Please ensure all required identity fields are correctly populated.",
    });
  };

  const PermissionToggle = ({ name, label, description }: { name: keyof NonNullable<FormData['customPermissions']>, label: string, description: string }) => (
    <FormField
        control={form.control}
        name={`customPermissions.${name}`}
        render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-white/5 p-4 bg-black/20 group hover:border-primary/20 transition-all">
                <div className="space-y-0.5">
                    <FormLabel className="text-xs font-black uppercase tracking-widest leading-none flex items-center gap-2">
                        {field.value === false ? <Ban className="h-3 w-3 text-destructive" /> : field.value === true ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <ShieldCheck className="h-3 w-3 opacity-30" />}
                        {label}
                    </FormLabel>
                    <FormDescription className="text-[9px] font-bold uppercase tracking-tight opacity-50">{description}</FormDescription>
                </div>
                <FormControl>
                    <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                    />
                </FormControl>
            </FormItem>
        )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Authorization Override</DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Identity Ref: {userToEdit.id}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-background/20">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="p-8 pt-0 space-y-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><KeyRound className="h-3.5 w-3.5" /></div>
                            <h3 className="text-xs font-black uppercase tracking-widest">Base Identity</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50">Legal Name</FormLabel><FormControl><Input {...field} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="username" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50">Username</FormLabel><FormControl><Input {...field} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50">Auth Email</FormLabel><FormControl><Input type="email" {...field} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50">Emergency Comms</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ""} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </div>
                    
                    <Separator className="bg-white/5" />

                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><ShieldCheck className="h-3.5 w-3.5" /></div>
                            <h3 className="text-xs font-black uppercase tracking-widest">Functional Clearances</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="departmentName" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50">Sector</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="rounded-xl h-11 bg-background/50 border-white/5"><SelectValue placeholder="Select Sector" /></SelectTrigger></FormControl>
                                    <SelectContent className="apple-glass-darker border-none">{PREDEFINED_DEPARTMENTS.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="position" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50">Designation</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartment || selectedDepartment === ""}>
                                    <FormControl><SelectTrigger className="rounded-xl h-11 bg-background/50 border-white/5"><SelectValue placeholder="Select Designation" /></SelectTrigger></FormControl>
                                    <SelectContent className="apple-glass-darker border-none">{rolesForSelectedDepartment.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )}/>
                        </div>
                        
                        <div className="mt-8 space-y-4">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">Override Matrix</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <PermissionToggle name="canManageAccounting" label="Accounting Terminal" description="Direct access to Chart of Accounts & GL." />
                                <PermissionToggle name="canAccessRequisitions" label="Procurement Hub" description="Submit and review financial requisitions." />
                                <PermissionToggle name="canAccessChat" label="Secure Messaging" description="Authorization to transmit in encrypted channels." />
                                <PermissionToggle name="canAccessLibrary" label="Knowledge Base" description="View Standard Operating Procedures (SOPs)." />
                                <PermissionToggle name="canManageAnnouncements" label="Broadcasting" description="Permission to post organization-wide updates." />
                                <PermissionToggle name="canViewAudit" label="Infrastructure Audit" description="Review system interaction telemetry logs." />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 interactive-element" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

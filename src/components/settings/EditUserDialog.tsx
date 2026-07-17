"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, KeyRound, ShieldCheck, Ban, CheckCircle2, Save, X } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, UserPosition } from "@/lib/types";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { getRoleFromPosition, PREDEFINED_DEPARTMENTS, ROLES_BY_DEPARTMENT } from "@/lib/roles-and-departments";
import { sanitizeInput } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";

const formSchema = z.object({
  fullName: z.string().min(1, "Identity name is required."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  email: z.string().email("Invalid email format."),
  phoneNumber: z.string().optional().nullable(),
  position: z.string().min(1, "Position is required."),
  departmentName: z.string().min(1, "Department is required."),
  customPermissions: z.object({
    canAccessRequisitions: z.boolean().default(false),
    canAccessChat: z.boolean().default(false),
    canManageAccounting: z.boolean().default(false),
    canAccessLibrary: z.boolean().default(false),
    canManageAnnouncements: z.boolean().default(false),
    canViewAudit: z.boolean().default(false),
    canManageDisplays: z.boolean().default(false),
    canManageLibrary: z.boolean().default(false),
    modules: z.object({
      finance: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
      chat: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
      attendance: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
      tasks: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
      workbooks: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
      library: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
      leave: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
      live_displays: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
      reports: z.enum(['default', 'hidden', 'admin', 'staff']).default('default'),
    }).default({}),
  }).default({}),
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
        canManageDisplays: false,
        canManageLibrary: false,
        modules: {
          finance: 'default',
          chat: 'default',
          attendance: 'default',
          tasks: 'default',
          workbooks: 'default',
          library: 'default',
          leave: 'default',
          live_displays: 'default',
          reports: 'default',
        }
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
            canManageDisplays: !!userToEdit.customPermissions?.canManageDisplays,
            canManageLibrary: !!userToEdit.customPermissions?.canManageLibrary,
            modules: {
              finance: userToEdit.customPermissions?.modules?.finance || 'default',
              chat: userToEdit.customPermissions?.modules?.chat || 'default',
              attendance: userToEdit.customPermissions?.modules?.attendance || 'default',
              tasks: userToEdit.customPermissions?.modules?.tasks || 'default',
              workbooks: userToEdit.customPermissions?.modules?.workbooks || 'default',
              library: userToEdit.customPermissions?.modules?.library || 'default',
              leave: userToEdit.customPermissions?.modules?.leave || 'default',
              live_displays: userToEdit.customPermissions?.modules?.live_displays || 'default',
              reports: userToEdit.customPermissions?.modules?.reports || 'default',
            }
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
      
      const sanitizedPermissions = {
        canAccessRequisitions: Boolean(values.customPermissions?.canAccessRequisitions),
        canAccessChat: Boolean(values.customPermissions?.canAccessChat),
        canManageAccounting: Boolean(values.customPermissions?.canManageAccounting),
        canAccessLibrary: Boolean(values.customPermissions?.canAccessLibrary),
        canManageAnnouncements: Boolean(values.customPermissions?.canManageAnnouncements),
        canViewAudit: Boolean(values.customPermissions?.canViewAudit),
        canManageDisplays: Boolean(values.customPermissions?.canManageDisplays),
        canManageLibrary: Boolean(values.customPermissions?.canManageLibrary),
        modules: {
          finance: values.customPermissions?.modules?.finance || 'default',
          chat: values.customPermissions?.modules?.chat || 'default',
          attendance: values.customPermissions?.modules?.attendance || 'default',
          tasks: values.customPermissions?.modules?.tasks || 'default',
          workbooks: values.customPermissions?.modules?.workbooks || 'default',
          library: values.customPermissions?.modules?.library || 'default',
          leave: values.customPermissions?.modules?.leave || 'default',
          live_displays: values.customPermissions?.modules?.live_displays || 'default',
          reports: values.customPermissions?.modules?.reports || 'default',
        }
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
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to commit system updates.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const binaryPermissionItems = [
    { name: "canManageAccounting", label: "Accounting Terminal", desc: "Direct access to Chart of Accounts & GL." },
    { name: "canAccessRequisitions", label: "Procurement Hub Toggle", desc: "Alternative fallback direct boolean toggle." },
    { name: "canAccessChat", label: "Secure Messaging Toggle", desc: "Alternative fallback direct boolean toggle." },
    { name: "canAccessLibrary", label: "Knowledge Base Toggle", desc: "Alternative fallback direct boolean toggle." },
    { name: "canManageAnnouncements", label: "Broadcasting", desc: "Permission to post organization-wide updates." },
    { name: "canViewAudit", label: "Infrastructure Audit", desc: "Review system interaction telemetry logs." },
    { name: "canManageDisplays", label: "Live Displays Admin", desc: "Direct node configuration rights." },
    { name: "canManageLibrary", label: "Library Master", desc: "Direct content modification rights." }
  ];

  const modulePermissionItems = [
    { name: "finance", label: "Procurement (Finance)", desc: "Requisitions, vendors, and disbursements." },
    { name: "chat", label: "Internal Comms (Chat)", desc: "Encrypted real-time team collaboration." },
    { name: "attendance", label: "Time & Attendance", desc: "Enforce clock-in, geofence, and hours." },
    { name: "tasks", label: "Task Management", desc: "Team workloads, task states, and reviews." },
    { name: "workbooks", label: "Dynamic Workbooks", desc: "Spreadsheets and collaborative sheets." },
    { name: "library", label: "Knowledge Base (Library)", desc: "Documents and folder repository." },
    { name: "leave", label: "Leave & Time-Off", desc: "Requests, balances, and calendars." },
    { name: "live_displays", label: "Live Displays", desc: "External web tools and telemetry feeds." },
    { name: "reports", label: "Reports & Analytics", desc: "EOD logs, metrics, and master exports." }
  ];

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-300 data-[state=open]:duration-500" />
        
        {/* Content sheet */}
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] w-full max-w-3xl h-[85vh] max-h-[850px] bg-[#0c0d12]/98 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          
          {/* Header */}
          <div className="p-8 pb-4 flex-shrink-0 flex items-center justify-between relative border-b border-white/5">
            <div>
              <DialogPrimitive.Title className="text-2xl font-black font-headline tracking-tighter uppercase text-white">Authorization Override</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-[10px] font-black uppercase tracking-widest opacity-60 text-muted-foreground">Identity Ref: {userToEdit.id}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="absolute right-8 top-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white opacity-70 hover:opacity-100 transition-all hover:scale-105 active:scale-95 focus:outline-none border border-white/10">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-background/20 scrollbar-thin scrollbar-thumb-white/10 scroll-smooth">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
                    
                    {/* Section 1: Base Identity */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><KeyRound className="h-3.5 w-3.5" /></div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">Base Identity</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50 text-white">Legal Name</FormLabel><FormControl><Input {...field} className="rounded-xl h-11 bg-background/50 border-white/5 text-white" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="username" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50 text-white">Username</FormLabel><FormControl><Input {...field} className="rounded-xl h-11 bg-background/50 border-white/5 text-white" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50 text-white">Auth Email</FormLabel><FormControl><Input type="email" {...field} className="rounded-xl h-11 bg-background/50 border-white/5 text-white" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50 text-white">Emergency Comms</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ""} className="rounded-xl h-11 bg-background/50 border-white/5 text-white" /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </div>
                    
                    <Separator className="bg-white/5" />

                    {/* Section 2: Functional Clearances */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><ShieldCheck className="h-3.5 w-3.5" /></div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">Functional Clearances</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="departmentName" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50 text-white">Sector</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="rounded-xl h-11 bg-background/50 border-white/5 text-white"><SelectValue placeholder="Select Sector" /></SelectTrigger></FormControl>
                                    <SelectContent className="apple-glass-darker border-white/10 text-white">{PREDEFINED_DEPARTMENTS.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="position" render={({ field }) => (
                                <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-50 text-white">Designation</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartment || selectedDepartment === ""}>
                                    <FormControl><SelectTrigger className="rounded-xl h-11 bg-background/50 border-white/5 text-white"><SelectValue placeholder="Select Designation" /></SelectTrigger></FormControl>
                                    <SelectContent className="apple-glass-darker border-white/10 text-white">{rolesForSelectedDepartment.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )}/>
                        </div>
                        
                        {/* Section 3: Module Level Overrides Matrix */}
                        <div className="mt-8 space-y-6">
                            <div className="border-t border-white/5 pt-6">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Module Access overrides (3-State Level)</h4>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1 mb-4">Set user-specific views and interaction tiers for each individual platform module.</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {modulePermissionItems.map((mod) => (
                                      <FormField
                                          key={mod.name}
                                          control={form.control}
                                          name={`customPermissions.modules.${mod.name}` as any}
                                          render={({ field }) => (
                                              <FormItem className="flex flex-col justify-between rounded-2xl border border-white/5 p-4 bg-black/40 group hover:border-primary/20 transition-all gap-3 min-h-[140px]">
                                                  <div className="space-y-1">
                                                      <FormLabel className="text-[10px] font-black uppercase tracking-wider text-white">
                                                          {mod.label}
                                                      </FormLabel>
                                                      <FormDescription className="text-[8px] font-bold uppercase tracking-tight opacity-50 text-muted-foreground leading-normal">
                                                          {mod.desc}
                                                      </FormDescription>
                                                  </div>
                                                  <FormControl>
                                                      <Select value={field.value || 'default'} onValueChange={field.onChange}>
                                                          <SelectTrigger className="w-full bg-background/50 border-white/10 rounded-xl h-9 font-black uppercase text-[9px] tracking-widest text-white">
                                                              <SelectValue />
                                                          </SelectTrigger>
                                                          <SelectContent className="apple-glass-darker border-white/10 text-white z-[600]">
                                                              <SelectItem value="default" className="uppercase font-black text-[9px] tracking-widest text-muted-foreground">Follow System Policy</SelectItem>
                                                              <SelectItem value="hidden" className="uppercase font-black text-[9px] tracking-widest text-rose-500">Hidden for Staff</SelectItem>
                                                              <SelectItem value="admin" className="uppercase font-black text-[9px] tracking-widest text-amber-500">Restricted (Admin/Read)</SelectItem>
                                                              <SelectItem value="staff" className="uppercase font-black text-[9px] tracking-widest text-emerald-500">Unlocked (Full Access)</SelectItem>
                                                          </SelectContent>
                                                      </Select>
                                                  </FormControl>
                                              </FormItem>
                                          )}
                                      />
                                  ))}
                              </div>
                            </div>
                            
                            {/* Section 4: System Binary Toggles Override */}
                            <div className="border-t border-white/5 pt-6">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">Direct Capability Overrides</h4>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1 mb-4">Direct authorization flags to force override specific system gates.</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {binaryPermissionItems.map((perm) => (
                                      <FormField
                                          key={perm.name}
                                          control={form.control}
                                          name={`customPermissions.${perm.name}` as any}
                                          render={({ field }) => (
                                              <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-white/5 p-4 bg-black/40 group hover:border-amber-500/20 transition-all gap-4">
                                                  <div className="space-y-0.5">
                                                      <FormLabel className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2 text-white">
                                                          {field.value ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Ban className="h-3 w-3 text-rose-500" />}
                                                          {perm.label}
                                                      </FormLabel>
                                                      <FormDescription className="text-[8px] font-bold uppercase tracking-tight opacity-50 text-muted-foreground leading-normal">{perm.desc}</FormDescription>
                                                  </div>
                                                  <FormControl>
                                                      <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                                  </FormControl>
                                              </FormItem>
                                          )}
                                      />
                                  ))}
                              </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="pt-4 pb-4">
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 interactive-element bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
              </form>
            </Form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

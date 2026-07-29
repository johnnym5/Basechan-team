"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useFirestore, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, UserPosition } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getRoleFromPosition, PREDEFINED_DEPARTMENTS, ROLES_BY_DEPARTMENT } from "@/lib/roles-and-departments";
import { sanitizeInput } from "@/lib/utils";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { ORG_ID } from "@/lib/config";


const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phoneNumber: z.string().optional(),
  departmentName: z.string({ required_error: "Please select a department."}),
  position: z.string().min(1, "Position is required."),
});

type FormData = z.infer<typeof formSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile?: UserProfile;
}

export function InviteUserDialog({ open, onOpenChange, currentUserProfile }: InviteUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      phoneNumber: "",
      departmentName: "",
      position: "",
    },
  });
  
  const selectedDepartment = form.watch('departmentName');

  useEffect(() => {
      // When department changes, reset the position field
      form.resetField('position');
  }, [selectedDepartment, form]);

  const rolesForSelectedDepartment = useMemo(() => {
    if (!selectedDepartment) return [];
    const departmentRoles = ROLES_BY_DEPARTMENT[selectedDepartment as keyof typeof ROLES_BY_DEPARTMENT] || [];
    const genericRoles = ["Staff"];
    return [...new Set([...departmentRoles, ...genericRoles])];
  }, [selectedDepartment]);


  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  }

  async function onSubmit(values: FormData) {
    const orgId = currentUserProfile?.orgId || ORG_ID;
    if (!firestore || !orgId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Organization ID is missing.' });
        return;
    }
    setIsSubmitting(true);
    
    const tempAppName = `temp-user-creation-app-${Date.now()}`;
    let secondaryApp;

    try {
      secondaryApp = initializeApp(firebaseConfig, tempAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
      const newAuthUser = userCredential.user;
      
      const userDocRef = doc(firestore, "users", newAuthUser.uid);

      const newUserProfile: Omit<UserProfile, 'id'> = {
        orgId: orgId,
        email: values.email.toLowerCase(),
        username: sanitizeInput(values.username.toLowerCase()),
        password: values.password,
        fullName: sanitizeInput(values.fullName),
        phoneNumber: sanitizeInput(values.phoneNumber) || null,
        position: values.position as UserProfile['position'],
        role: getRoleFromPosition(values.position as UserPosition),
        departmentName: values.departmentName,
        joinedDate: new Date().toISOString(),
        status: 'OFFLINE',
      };
      
      setDocumentNonBlocking(userDocRef, newUserProfile, { merge: false });

      toast({
        title: "User Account Created",
        description: `${values.fullName}'s authentication and database records have been created.`,
      });
      
      handleOpenChange(false);

    } catch (error: any) {
        let errorMessage = "An unexpected error occurred.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use by another account.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        toast({
            variant: "destructive",
            title: "Failed to Create User",
            description: errorMessage,
        });
    } finally {
        setIsSubmitting(false);
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md m3-surface-high border-none rounded-[2.5rem] p-8 shadow-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Invite New Unit</DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">
            Provision authentication and personnel record.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] uppercase font-black opacity-50">Full Name</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] uppercase font-black opacity-50">Username</FormLabel>
                  <FormControl><Input placeholder="e.g., jdoe" {...field} value={field.value ?? ""} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] uppercase font-black opacity-50">Email</FormLabel>
                  <FormControl><Input type="email" {...field} value={field.value ?? ""} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] uppercase font-black opacity-50">Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Min. 8 characters" {...field} value={field.value ?? ""} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] uppercase font-black opacity-50">Phone Number (Optional)</FormLabel>
                  <FormControl><Input type="tel" {...field} value={field.value ?? ""} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="departmentName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] uppercase font-black opacity-50">Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger className="rounded-xl h-11 bg-background/50 border-white/5"><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-xl border-none m3-surface-high">
                            {PREDEFINED_DEPARTMENTS.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="position" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] uppercase font-black opacity-50">Position</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!selectedDepartment}>
                        <FormControl><SelectTrigger className="rounded-xl h-11 bg-background/50 border-white/5"><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-xl border-none m3-surface-high">
                            {rolesForSelectedDepartment.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
            )}/>
            <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 m3-interactive" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Provision Account
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

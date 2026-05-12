'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Vendor, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "Vendor name is required."),
  contactPerson: z.string().min(2, "Contact person is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(5, "Valid phone number is required."),
  address: z.string().min(5, "Full address is required."),
  category: z.string().min(2, "Category is required (e.g. IT, Logistics)."),
});

type FormData = z.infer<typeof formSchema>;

interface AddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function AddVendorDialog({ open, onOpenChange, userProfile }: AddVendorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      category: "",
    },
  });

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
        const newVendor: Omit<Vendor, 'id'> = {
            orgId: userProfile.orgId,
            name: sanitizeInput(values.name),
            contactPerson: sanitizeInput(values.contactPerson),
            email: sanitizeInput(values.email.toLowerCase()),
            phone: sanitizeInput(values.phone),
            address: sanitizeInput(values.address),
            category: sanitizeInput(values.category),
            rating: 5.0, // Default rating for new vendors
            isActive: true,
            createdAt: new Date().toISOString(),
        };

        await addDocumentNonBlocking(collection(firestore, 'vendors'), newVendor);

        toast({ title: "Vendor Registered", description: `"${values.name}" is now in your directory.` });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Registration Failed", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register Supplier</DialogTitle>
          <DialogDescription>Add a new vendor to the organization's procurement network.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Vendor Legal Name</FormLabel><FormControl><Input placeholder="Acme Corp" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="contactPerson" render={({ field }) => (
                        <FormItem><FormLabel>Point of Contact</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="Office Supplies" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="sales@acme.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1..." {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Office Address</FormLabel><FormControl><Input placeholder="123 Supply Lane..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Registration
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

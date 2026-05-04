
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Account, AccountType, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(3, "Account name is required."),
  code: z.string().min(3, "Account code is required."),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  category: z.string().min(1, "Category is required."),
  description: z.string().optional(),
  isDebitNormal: z.boolean(),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
  accountToEdit?: Account | null;
}

const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

export function AddAccountDialog({ open, onOpenChange, userProfile, accountToEdit }: AddAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      type: "ASSET",
      category: "",
      description: "",
      isDebitNormal: true,
      isActive: true,
    },
  });

  useEffect(() => {
    if (accountToEdit) {
      form.reset({
        name: accountToEdit.name,
        code: accountToEdit.code,
        type: accountToEdit.type,
        category: accountToEdit.category,
        description: accountToEdit.description || "",
        isDebitNormal: accountToEdit.isDebitNormal,
        isActive: accountToEdit.isActive,
      });
    } else {
        form.reset({
            name: "",
            code: "",
            type: "ASSET",
            category: "",
            description: "",
            isDebitNormal: true,
            isActive: true,
        });
    }
  }, [accountToEdit, form, open]);

  // Suggest normal balance based on account type
  useEffect(() => {
      const type = form.watch('type');
      if (!accountToEdit) {
        if (type === 'ASSET' || type === 'EXPENSE') {
            form.setValue('isDebitNormal', true);
        } else {
            form.setValue('isDebitNormal', false);
        }
      }
  }, [form.watch('type'), accountToEdit]);

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
      if (accountToEdit) {
        const accountRef = doc(firestore, 'accounts', accountToEdit.id);
        await updateDocumentNonBlocking(accountRef, {
            ...values,
            name: sanitizeInput(values.name),
            code: sanitizeInput(values.code),
            category: sanitizeInput(values.category),
            description: sanitizeInput(values.description),
        });
        toast({ title: "Account Updated", description: `"${values.name}" has been updated.` });
      } else {
        const newAccount: Omit<Account, 'id'> = {
            orgId: userProfile.orgId,
            ...values,
            balance: 0,
            name: sanitizeInput(values.name),
            code: sanitizeInput(values.code),
            category: sanitizeInput(values.category),
            description: sanitizeInput(values.description),
        };
        await addDocumentNonBlocking(collection(firestore, 'accounts'), newAccount);
        toast({ title: "Account Created", description: `"${values.name}" is now active in your CoA.` });
      }
      onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{accountToEdit ? 'Edit Account' : 'Add New Account'}</DialogTitle>
          <DialogDescription>
            Configure a financial account for your organization's General Ledger.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                    <FormField control={form.control} name="code" render={({ field }) => (
                        <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="10100" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div className="col-span-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Account Name</FormLabel><FormControl><Input placeholder="Cash at Bank" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="Current Asset" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Purpose of this account..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>

            <div className="flex items-center justify-between gap-4 pt-2">
                <FormField control={form.control} name="isDebitNormal" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                        <div className="space-y-0.5"><FormLabel className="text-xs">Debit Normal</FormLabel><FormDescription className="text-[10px]">Increases on Debit</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                        <div className="space-y-0.5"><FormLabel className="text-xs">Active</FormLabel><FormDescription className="text-[10px]">Allow entries</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                    </FormItem>
                )}/>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accountToEdit ? 'Save Changes' : 'Create Account'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntry, JournalEntryLine, UserProfile, Account } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { sanitizeInput, cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const lineSchema = z.object({
    accountId: z.string().min(1, "Account is required"),
    debit: z.coerce.number().min(0),
    credit: z.coerce.number().min(0),
});

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(5, "Description is required"),
  reference: z.string().optional(),
  lines: z.array(lineSchema).min(2, "At least two lines are required (debit and credit)"),
}).refine((data) => {
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
}, {
    message: "Total Debits must equal Total Credits",
    path: ["lines"],
});

type FormData = z.infer<typeof formSchema>;

interface NewJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function NewJournalEntryDialog({ open, onOpenChange, userProfile }: NewJournalEntryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const accountsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'accounts'), where('orgId', '==', userProfile.orgId), where('isActive', '==', true), orderBy('code', 'asc'));
  }, [firestore, userProfile.orgId]);
  const { data: accounts } = useCollection<Account>(accountsQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: "",
      reference: "",
      lines: [
          { accountId: "", debit: 0, credit: 0 },
          { accountId: "", debit: 0, credit: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchLines = form.watch("lines");
  const totals = useMemo(() => {
    return watchLines.reduce((acc, line) => ({
        debit: acc.debit + (line.debit || 0),
        credit: acc.credit + (line.credit || 0),
    }), { debit: 0, credit: 0 });
  }, [watchLines]);

  const difference = Math.abs(totals.debit - totals.credit);
  const isBalanced = difference < 0.01 && totals.debit > 0;

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
        const enrichedLines: JournalEntryLine[] = values.lines.map(line => {
            const account = accounts?.find(a => a.id === line.accountId);
            return {
                ...line,
                accountName: account?.name || "Unknown Account",
            };
        });

        const newEntry: Omit<JournalEntry, 'id'> = {
            orgId: userProfile.orgId,
            date: new Date(values.date).toISOString(),
            description: sanitizeInput(values.description),
            reference: sanitizeInput(values.reference || ""),
            status: 'DRAFT',
            createdBy: userProfile.id,
            creatorName: userProfile.fullName,
            createdAt: new Date().toISOString(),
            lines: enrichedLines,
        };

        await addDocumentNonBlocking(collection(firestore, 'journal_entries'), newEntry);
        toast({ title: "Draft Entry Saved", description: "The journal entry has been saved for review." });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Journal Entry</DialogTitle>
          <DialogDescription>Record a manual transaction in the General Ledger.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Transaction Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="reference" render={({ field }) => (
                    <FormItem><FormLabel>Reference #</FormLabel><FormControl><Input placeholder="INV-2024-001" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Brief explanation of the transaction" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>

            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Lines</h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: "", debit: 0, credit: 0 })}>
                        <Plus className="h-4 w-4 mr-1" /> Add Line
                    </Button>
                </div>
                
                <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/20">
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-6">
                                    <FormField control={form.control} name={`lines.${index}.accountId`} render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel>Account</FormLabel>}
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="col-span-2">
                                    <FormField control={form.control} name={`lines.${index}.debit`} render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel>Debit</FormLabel>}
                                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="col-span-2">
                                    <FormField control={form.control} name={`lines.${index}.credit`} render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel>Credit</FormLabel>}
                                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="col-span-2 pb-1">
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)} disabled={fields.length <= 2}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="flex-shrink-0 space-y-4 border-t pt-4">
                <div className="grid grid-cols-12 gap-2 text-sm font-mono px-4">
                    <div className="col-span-6 text-right font-semibold">TOTALS:</div>
                    <div className="col-span-2 text-right border-b-2 border-double border-primary">{totals.debit.toFixed(2)}</div>
                    <div className="col-span-2 text-right border-b-2 border-double border-primary">{totals.credit.toFixed(2)}</div>
                    <div className="col-span-2"></div>
                </div>

                {!isBalanced && totals.debit > 0 && (
                    <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-xs">Out of Balance</AlertTitle>
                        <AlertDescription className="text-[10px]">Difference: {difference.toFixed(2)}</AlertDescription>
                    </Alert>
                )}
            </div>

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading || !isBalanced}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Draft Entry
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

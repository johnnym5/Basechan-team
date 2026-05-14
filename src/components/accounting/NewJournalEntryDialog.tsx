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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntryLine, UserProfile, Account } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { accountingService } from "@/services/accounting-service";
import { ScrollArea } from "../ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { cn } from "@/lib/utils";

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
    const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
}, {
    message: "Total Debits must equal Total Credits and be greater than zero.",
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
      return query(
        collection(firestore, 'accounts'), 
        where('orgId', '==', userProfile.orgId), 
        where('isActive', '==', true), 
        orderBy('code', 'asc')
      );
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

        await accountingService.createJournalEntry(firestore, userProfile, {
            ...values,
            lines: enrichedLines,
        });

        toast({ title: "Draft Saved", description: "Journal entry stored for review." });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>New Journal Entry</DialogTitle>
          <DialogDescription>Record a manual transaction in the double-entry General Ledger.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-4 space-y-4 flex-shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem><FormLabel>Transaction Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="reference" render={({ field }) => (
                        <FormItem><FormLabel>Reference #</FormLabel><FormControl><Input placeholder="GJ-001" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem className="sm:col-span-1"><FormLabel>Entry Memo</FormLabel><FormControl><Input placeholder="Brief description..." {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 border-y bg-muted/10">
                <div className="px-6 py-3 flex items-center justify-between bg-background">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Transaction Lines</h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: "", debit: 0, credit: 0 })}>
                        <Plus className="h-3 w-3 mr-1" /> Add Line
                    </Button>
                </div>
                
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-3 items-start animate-in fade-in duration-300">
                                <div className="col-span-12 sm:col-span-6">
                                    <FormField control={form.control} name={`lines.${index}.accountId`} render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel className="text-[10px] uppercase text-muted-foreground">Account</FormLabel>}
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select account..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="col-span-5 sm:col-span-2">
                                    <FormField control={form.control} name={`lines.${index}.debit`} render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel className="text-[10px] uppercase text-muted-foreground">Debit</FormLabel>}
                                            <FormControl><Input type="number" step="0.01" className="h-10 font-mono text-right" {...field} /></FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="col-span-5 sm:col-span-2">
                                    <FormField control={form.control} name={`lines.${index}.credit`} render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel className="text-[10px] uppercase text-muted-foreground">Credit</FormLabel>}
                                            <FormControl><Input type="number" step="0.01" className="h-10 font-mono text-right" {...field} /></FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="col-span-2 sm:col-span-2 pt-2 sm:pt-0">
                                    <Button type="button" variant="ghost" size="icon" className={cn("mt-4 text-muted-foreground hover:text-destructive", index === 0 && "sm:mt-8")} onClick={() => remove(index)} disabled={fields.length <= 2}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="px-6 py-6 space-y-4 flex-shrink-0">
                <div className="grid grid-cols-12 gap-3 text-sm font-mono items-center">
                    <div className="col-span-6 text-right font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Trial Balance Total:</div>
                    <div className="col-span-2 text-right border-b-2 border-primary/20 pb-1 font-bold text-base">{totals.debit.toFixed(2)}</div>
                    <div className="col-span-2 text-right border-b-2 border-primary/20 pb-1 font-bold text-base">{totals.credit.toFixed(2)}</div>
                    <div className="col-span-2"></div>
                </div>

                {!isBalanced && totals.debit > 0 && (
                    <Alert variant="destructive" className="py-2 animate-pulse">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-xs">Out of Balance</AlertTitle>
                        <AlertDescription className="text-[10px]">The transaction total debits must equal total credits. Current Difference: {difference.toFixed(2)}</AlertDescription>
                    </Alert>
                )}

                <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isLoading || !isBalanced} className="min-w-[140px]">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Draft Entry
                    </Button>
                </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, Workbook, Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().optional(),
  priority: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3"]),
  dueDate: z.date().optional(),
  workbookId: z.string().optional(),
  sheetId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
});

const DateDropdowns = ({ value, onChange }: { value?: Date, onChange: (date?: Date) => void }) => {
    const selectedDate = value;
    const day = selectedDate ? selectedDate.getDate() : undefined;
    const month = selectedDate ? selectedDate.getMonth() : undefined;
    const year = selectedDate ? selectedDate.getFullYear() : undefined;

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
    const daysInMonth = (year !== undefined && month !== undefined) ? new Date(year, month + 1, 0).getDate() : 31;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleDateChange = (part: 'day' | 'month' | 'year', valueStr: string) => {
        const value = parseInt(valueStr, 10);
        if (isNaN(value)) {
            onChange(undefined);
            return;
        }

        const d = selectedDate || new Date();
        const newYear = part === 'year' ? value : d.getFullYear();
        const newMonth = part === 'month' ? value : d.getMonth();
        let newDay = part === 'day' ? value : d.getDate();

        const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
        if (newDay > daysInNewMonth) {
            newDay = daysInNewMonth;
        }

        onChange(new Date(newYear, newMonth, newDay));
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            <Select value={day?.toString()} onValueChange={(val) => handleDateChange('day', val)}>
                <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent>{days.map(d => <SelectItem key={d} value={d.toString()}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={month?.toString()} onValueChange={(val) => handleDateChange('month', val)}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year?.toString()} onValueChange={(val) => handleDateChange('year', val)}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
        </div>
    );
};

type FormData = z.infer<typeof formSchema>;

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
}

export function EditTaskDialog({ task, open, onOpenChange, currentUserProfile }: EditTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const workbooksQuery = useMemoFirebase(() => 
    currentUserProfile ? query(collection(firestore, 'workbooks'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: workbooks, isLoading: areWorkbooksLoading } = useCollection<Workbook>(workbooksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });
  
  const selectedWorkbookId = form.watch('workbookId');

  const sheetsQuery = useMemoFirebase(() =>
      selectedWorkbookId ? query(collection(firestore, `workbooks/${selectedWorkbookId}/sheets`)) : null
  , [firestore, selectedWorkbookId]);
  const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);

  useEffect(() => {
    form.reset({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      workbookId: task.workbookId || undefined,
      sheetId: task.sheetId || undefined,
      estimatedHours: task.estimatedHours,
    });
  }, [task, form]);


  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    const dueDateISO = values.dueDate ? values.dueDate.toISOString() : null;

    try {
        const updateData = {
            title: sanitizeInput(values.title),
            description: sanitizeInput(values.description),
            priority: values.priority,
            dueDate: dueDateISO,
            workbookId: values.workbookId || null,
            sheetId: values.sheetId || null,
            estimatedHours: values.estimatedHours,
        }

        const taskRef = doc(firestore, 'tasks', task.id);
        updateDocumentNonBlocking(taskRef, updateData);
        
        toast({ title: "Task Updated", description: `"${values.title}" has been saved.`});
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
          <DialogTitle>Edit Mission</DialogTitle>
          <DialogDescription>
            Update the details for this mission.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                 <div className="space-y-2">
                    <FormField control={form.control} name="workbookId" render={({ field }) => (
                        <FormItem><FormLabel>Attached Workbook</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger disabled={areWorkbooksLoading}><SelectValue placeholder="Select a workbook" /></SelectTrigger></FormControl>
                            <SelectContent>{workbooks?.map(wb => <SelectItem key={wb.id} value={wb.id}>{wb.title}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                    {selectedWorkbookId && (
                         <FormField control={form.control} name="sheetId" render={({ field }) => (
                            <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger disabled={areSheetsLoading}><SelectValue placeholder="Select a sheet" /></SelectTrigger></FormControl>
                                <SelectContent>{sheets?.map(sh => <SelectItem key={sh.id} value={sh.id}>{sh.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage /></FormItem>
                        )} />
                    )}
                 </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                         <FormItem><FormLabel>Priority</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="LEVEL_1">Low</SelectItem>
                                <SelectItem value="LEVEL_2">Medium</SelectItem>
                                <SelectItem value="LEVEL_3">High</SelectItem>
                            </SelectContent>
                         </Select>
                         <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="estimatedHours" render={({ field }) => (
                        <FormItem><FormLabel>Estimated Hours</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 8" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                </div>

                <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                            <DateDropdowns value={field.value ? new Date(field.value) : undefined} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

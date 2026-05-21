'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Paperclip, CalendarIcon, Save, History } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, arrayUnion } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, Workbook, Sheet, ActivityEntry } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { sanitizeInput, cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Progress } from "../ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().optional(),
  priority: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3"]),
  dueDate: z.date().optional().nullable(),
  workbookId: z.string().optional().nullable(),
  sheetId: z.string().optional().nullable(),
  estimatedHours: z.coerce.number().optional().nullable(),
  attachment: z.custom<File>().optional(),
});

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
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const [fileName, setFileName] = useState<string | null>(task.attachmentName || null);

  const isBusy = isLoading || isUploading;

  const workbooksQuery = useMemoFirebase(() => 
    currentUserProfile ? query(collection(firestore!, 'workbooks'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: workbooks, isLoading: areWorkbooksLoading } = useCollection<Workbook>(workbooksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      workbookId: task.workbookId || null,
      sheetId: task.sheetId || null,
      estimatedHours: task.estimatedHours || null,
    },
  });
  
  const selectedWorkbookId = form.watch('workbookId');

  const sheetsQuery = useMemoFirebase(() =>
      selectedWorkbookId ? query(collection(firestore!, `workbooks/${selectedWorkbookId}/sheets`)) : null
  , [firestore, selectedWorkbookId]);
  const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);

  // Sync form with task data ONLY when dialog opens or task ID changes
  // This prevents losing typed data if a background sync happens while editing
  useEffect(() => {
    if (open) {
        form.reset({
            title: task.title,
            description: task.description || "",
            priority: task.priority,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            workbookId: task.workbookId || null,
            sheetId: task.sheetId || null,
            estimatedHours: task.estimatedHours || null,
        });
        setFileName(task.attachmentName || null);
    }
  }, [task.id, open, form, task.title, task.description, task.priority, task.dueDate, task.workbookId, task.sheetId, task.estimatedHours, task.attachmentName]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('attachment', file);
      setFileName(file.name);
    }
  };

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    const now = new Date().toISOString();
    const dueDateISO = values.dueDate ? values.dueDate.toISOString() : null;

    try {
        const updateData: Partial<Task> = {
            title: sanitizeInput(values.title),
            description: sanitizeInput(values.description || ""),
            priority: values.priority,
            dueDate: dueDateISO,
            workbookId: values.workbookId || null,
            sheetId: values.sheetId || null,
            estimatedHours: values.estimatedHours || null,
        };

        if (values.attachment) {
            const filePath = `tasks/${currentUserProfile.orgId}/${Date.now()}_${values.attachment.name}`;
            updateData.attachmentUrl = await uploadFile(values.attachment, filePath);
            updateData.attachmentName = values.attachment.name;
        }

        // Add Activity Log for the modification
        const logEntry: ActivityEntry = {
            type: 'LOG',
            actorId: currentUserProfile.id,
            actorName: currentUserProfile.fullName,
            timestamp: now,
            text: `updated the mission parameters.`,
        };
        updateData.activity = arrayUnion(logEntry);

        const taskRef = doc(firestore, 'tasks', task.id);
        updateDocumentNonBlocking(taskRef, updateData);
        
        toast({ title: "Mission Synchronized", description: `Updated parameters for ${task.serialNo} have been deployed.`});
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md apple-glass-darker border-none rounded-3xl p-6">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <History className="h-5 w-5" />
             </div>
             <div>
                <DialogTitle className="text-xl font-black font-headline tracking-tighter">Edit Mission Parameters</DialogTitle>
                <DialogDescription className="text-[9px] font-black uppercase tracking-widest opacity-50">Log ID: {task.serialNo}</DialogDescription>
             </div>
          </div>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Mission Identity</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="rounded-xl h-11 bg-background/50 border-white/5" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Objective Context</FormLabel>
                        <FormControl><Textarea {...field} value={field.value ?? ""} rows={3} className="rounded-xl bg-background/50 border-white/5" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="workbookId" render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Resource Node</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                            <FormControl><SelectTrigger className="rounded-xl h-10 bg-background/50 border-white/5"><SelectValue placeholder="Link Workbook" /></SelectTrigger></FormControl>
                            <SelectContent className="apple-glass-darker border-none">
                                <SelectItem value="none">No Link</SelectItem>
                                {workbooks?.map(wb => <SelectItem key={wb.id} value={wb.id}>{wb.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="sheetId" render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Data Sheet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"} disabled={!selectedWorkbookId || areSheetsLoading}>
                            <FormControl><SelectTrigger className="rounded-xl h-10 bg-background/50 border-white/5"><SelectValue placeholder="Select Sheet" /></SelectTrigger></FormControl>
                            <SelectContent className="apple-glass-darker border-none">
                                <SelectItem value="none">Unlinked</SelectItem>
                                {sheets?.map(sh => <SelectItem key={sh.id} value={sh.id}>{sh.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                         <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Threat Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="rounded-xl h-10 bg-background/50 border-white/5"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent className="apple-glass-darker border-none">
                                    <SelectItem value="LEVEL_1">Level 1 (Standard)</SelectItem>
                                    <SelectItem value="LEVEL_2">Level 2 (Priority)</SelectItem>
                                    <SelectItem value="LEVEL_3">Level 3 (Critical)</SelectItem>
                                </SelectContent>
                            </Select>
                         <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="estimatedHours" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Est. Man-Hours</FormLabel>
                            <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} className="rounded-xl h-10 bg-background/50 border-white/5" /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Deadline Node</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal rounded-xl h-10 bg-background/50 border-white/5", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : <span>Set Deadline</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 apple-glass border-none" align="start">
                                    <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Evidence / Files</FormLabel>
                        <div className="relative">
                            <Input id="edit-task-attachment-file" type="file" className="hidden" onChange={handleFileChange} disabled={isBusy} />
                            <label htmlFor="edit-task-attachment-file" className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer border border-white/5 h-10 px-3 rounded-xl bg-background/50 hover:bg-white/5 transition-all truncate">
                                <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                                <span className="truncate">{fileName || 'Attach Telemetry'}</span>
                            </label>
                        </div>
                    </div>
                </div>

                {isUploading && (
                    <div className="space-y-1.5">
                         <div className="flex justify-between text-[8px] font-black uppercase text-primary">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-1" />
                    </div>
                )}

                <DialogFooter className="pt-4 mt-2 border-t border-white/5">
                    <Button type="button" variant="ghost" className="rounded-xl h-12" onClick={() => onOpenChange(false)}>Abort</Button>
                    <Button type="submit" className="h-12 px-8 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex-1" disabled={isBusy}>
                        {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

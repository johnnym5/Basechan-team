'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Paperclip, CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, Workbook, Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  dueDate: z.date().optional(),
  workbookId: z.string().optional(),
  sheetId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
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
  const [fileName, setFileName] = useState<string | null>(null);

  const isBusy = isLoading || isUploading;

  const workbooksQuery = useMemoFirebase(() => 
    currentUserProfile ? query(collection(firestore!, 'workbooks'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: workbooks, isLoading: areWorkbooksLoading } = useCollection<Workbook>(workbooksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });
  
  const selectedWorkbookId = form.watch('workbookId');

  const sheetsQuery = useMemoFirebase(() =>
      selectedWorkbookId ? query(collection(firestore!, `workbooks/${selectedWorkbookId}/sheets`)) : null
  , [firestore, selectedWorkbookId]);
  const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);

  useEffect(() => {
    form.reset({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      workbookId: task.workbookId || "",
      sheetId: task.sheetId || "",
      estimatedHours: task.estimatedHours,
    });
    setFileName(task.attachmentName || null);
  }, [task, form]);

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

    const dueDateISO = values.dueDate ? values.dueDate.toISOString() : null;

    try {
        const updateData: Partial<Task> = {
            title: sanitizeInput(values.title),
            description: sanitizeInput(values.description),
            priority: values.priority,
            dueDate: dueDateISO,
            workbookId: values.workbookId || null,
            sheetId: values.sheetId || null,
            estimatedHours: values.estimatedHours,
        };

        if (values.attachment) {
            const filePath = `tasks/${currentUserProfile.orgId}/${Date.now()}_${values.attachment.name}`;
            updateData.attachmentUrl = await uploadFile(values.attachment, filePath);
            updateData.attachmentName = values.attachment.name;
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
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                
                 <div className="space-y-2">
                    <FormField control={form.control} name="workbookId" render={({ field }) => (
                        <FormItem><FormLabel>Attached Workbook</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger disabled={areWorkbooksLoading}><SelectValue placeholder="Select a workbook" /></SelectTrigger></FormControl>
                            <SelectContent>{workbooks?.map(wb => <SelectItem key={wb.id} value={wb.id}>{wb.title}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                    {selectedWorkbookId && (
                         <FormField control={form.control} name="sheetId" render={({ field }) => (
                            <FormItem>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger disabled={areSheetsLoading}><SelectValue placeholder="Select a sheet" /></SelectTrigger></FormControl>
                                <SelectContent>{sheets?.map(sh => <SelectItem key={sh.id} value={sh.id}>{sh.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage /></FormItem>
                        )} />
                    )}
                 </div>
                 
                 <FormField
                    control={form.control}
                    name="attachment"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Attachment (Optional)</FormLabel>
                            <FormControl>
                                <Input id="edit-task-attachment-file" type="file" className="hidden" onChange={handleFileChange} disabled={isBusy} />
                            </FormControl>
                            <label htmlFor="edit-task-attachment-file" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer border p-2 rounded-md hover:bg-accent transition-colors">
                                <Paperclip className="h-4 w-4" />
                                <span className="truncate">{fileName || 'Upload a file'}</span>
                            </label>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                 {isUploading && <Progress value={uploadProgress} className="w-full h-2" />}

                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                         <FormItem><FormLabel>Priority</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
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
                        <FormControl><Input type="number" placeholder="e.g., 8" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                </div>

                <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={isBusy}>
                    {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, Permissions, Workbook, Sheet, TaskPriority } from "@/lib/types";
import { ResponsiveDialog } from "@/components/shared/ResponsiveDialog";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { taskService } from "@/services/task-service";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3"]),
  dueDate: z.date().optional(),
  workbookId: z.string().optional(),
  sheetId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  attachment: z.custom<File>().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
      title?: string;
      description?: string;
      workbookId?: string;
      sheetId?: string | null;
      priority?: TaskPriority;
      dueDate?: Date;
  } | null;
  currentUserProfile: UserProfile;
  permissions: Permissions;
}

export function AssignTaskDialog({ open, onOpenChange, initialData, currentUserProfile, permissions }: AssignTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const [fileName, setFileName] = useState<string | null>(null);

  const isBusy = isLoading || isUploading;

  const usersQuery = useMemoFirebase(() => 
    currentUserProfile ? query(collection(firestore!, 'users'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const workbooksQuery = useMemoFirebase(() => 
    currentUserProfile ? query(collection(firestore!, 'workbooks'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: workbooks, isLoading: areWorkbooksLoading } = useCollection<Workbook>(workbooksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "LEVEL_1",
      estimatedHours: undefined,
    },
  });

  const selectedWorkbookId = form.watch('workbookId');

  const sheetsQuery = useMemoFirebase(() =>
      selectedWorkbookId ? query(collection(firestore!, `workbooks/${selectedWorkbookId}/sheets`)) : null
  , [firestore, selectedWorkbookId]);
  const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);

  useEffect(() => {
    if (open) {
        form.reset({
            title: initialData?.title || "",
            description: initialData?.description || "",
            priority: initialData?.priority || "LEVEL_1",
            assignedTo: "",
            dueDate: initialData?.dueDate || undefined,
            workbookId: initialData?.workbookId || "",
            sheetId: initialData?.sheetId || "",
            estimatedHours: undefined,
        });
        setFileName(null);
    }
  }, [initialData, open, form]);

  async function onSubmit(values: FormData) {
    const assigneeId = permissions.canManageStaff && values.assignedTo ? values.assignedTo : currentUserProfile.id;
    if (!firestore || !currentUserProfile || !assigneeId) return;
    
    const assignedUser = users?.find(u => u.id === assigneeId);
    if (!assignedUser) {
        toast({ variant: "destructive", title: "Error", description: "Selected user not found." });
        return;
    }

    setIsLoading(true);

    try {
        let attachmentUrl: string | undefined;
        if (values.attachment) {
            const filePath = `tasks/${currentUserProfile.orgId}/${Date.now()}_${values.attachment.name}`;
            attachmentUrl = await uploadFile(values.attachment, filePath);
        }

        await taskService.createTask(firestore, currentUserProfile, assignedUser, values, attachmentUrl);
        
        toast({ title: "Task Assigned", description: `"${values.title}" has been assigned successfully.`});
        onOpenChange(false);
        form.reset();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <ResponsiveDialog 
        open={open} 
        onOpenChange={onOpenChange} 
        title="Deploy Mission" 
        description="Assign a new operational unit to the team grid."
    >
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Mission Identity</FormLabel>
                        <FormControl><Input placeholder="Brief title..." {...field} value={field.value ?? ""} className="h-12 rounded-xl bg-background/50 border-white/5" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Objective Context</FormLabel>
                        <FormControl><Textarea placeholder="Details and parameters..." {...field} value={field.value ?? ""} className="rounded-xl bg-background/50 border-white/5" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {permissions.canManageStaff && (
                      <FormField control={form.control} name="assignedTo" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Assigned Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger disabled={areUsersLoading} className="h-12 rounded-xl bg-background/50 border-white/5"><SelectValue placeholder="Identify Staff" /></SelectTrigger></FormControl>
                                <SelectContent className="apple-glass-darker border-none">{users?.map(user => <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                      )} />
                    )}
                    <FormField control={form.control} name="priority" render={({ field }) => (
                         <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Threat Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-12 rounded-xl bg-background/50 border-white/5"><SelectValue placeholder="Priority" /></SelectTrigger></FormControl>
                                <SelectContent className="apple-glass-darker border-none">
                                    <SelectItem value="LEVEL_1">Level 1 (Standard)</SelectItem>
                                    <SelectItem value="LEVEL_2">Level 2 (Priority)</SelectItem>
                                    <SelectItem value="LEVEL_3">Level 3 (Critical)</SelectItem>
                                </SelectContent>
                            </Select>
                         <FormMessage />
                         </FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Deadline Node</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("w-full h-12 pl-3 text-left font-normal rounded-xl bg-background/50 border-white/5", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Set Deadline</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 apple-glass border-none" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="estimatedHours" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Est. Man-Hours</FormLabel>
                            <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ""} className="h-12 rounded-xl bg-background/50 border-white/5" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all" disabled={isBusy}>
                    {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {permissions.canManageStaff ? 'Deploy Mission' : 'Confirm Assignment'}
                </Button>
            </form>
        </Form>
    </ResponsiveDialog>
  );
}
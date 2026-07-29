'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { taskService } from '@/services/task-service';
import type { UserProfile, Permissions, Workbook, Sheet, TaskPriority } from '@/lib/types';

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

export type AssignTaskFormData = z.infer<typeof formSchema>;

interface UseAssignTaskFormProps {
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

export function useAssignTaskForm({
  open,
  onOpenChange,
  initialData,
  currentUserProfile,
  permissions
}: UseAssignTaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const [fileName, setFileName] = useState<string | null>(null);

  const isBusy = isLoading || isUploading;

  // Data Fetching
  const usersQuery = useMemoFirebase(() =>
    currentUserProfile ? query(collection(firestore!, 'users'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const workbooksQuery = useMemoFirebase(() =>
    currentUserProfile ? query(collection(firestore!, 'workbooks'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: workbooks, isLoading: areWorkbooksLoading } = useCollection<Workbook>(workbooksQuery);

  const form = useForm<AssignTaskFormData>({
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

  // Sync initial data when dialog opens
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

  const handleFileChange = (file: File | undefined) => {
    if (file) {
      form.setValue('attachment', file);
      setFileName(file.name);
    } else {
      form.setValue('attachment', undefined);
      setFileName(null);
    }
  };

  async function onSubmit(values: AssignTaskFormData) {
    const assigneeId = permissions.canManageStaff && values.assignedTo ? values.assignedTo : currentUserProfile.id;
    if (!firestore || !currentUserProfile || !assigneeId) return;

    const assignedUser = users?.find(u => u.id === assigneeId);
    if (!assignedUser) {
      toast({ variant: "destructive", title: "Error", description: "Selected member not found." });
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

  return {
    form,
    onSubmit,
    isBusy,
    uploadProgress,
    users,
    areUsersLoading,
    workbooks,
    areWorkbooksLoading,
    sheets,
    areSheetsLoading,
    fileName,
    handleFileChange,
  };
}

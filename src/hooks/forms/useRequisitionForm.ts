'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { useFileUpload } from '@/hooks/useFileUpload';
import { procurementService } from '@/services/procurement';
import type { UserProfile, Vendor } from '@/lib/types';

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  amount: z.coerce.number().min(1, { message: "Amount must be greater than 0." }),
  vendorId: z.string().min(1, "Please select a vendor."),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  attachment: z.custom<File>().optional(),
});

export type RequisitionFormData = z.infer<typeof formSchema>;

interface UseRequisitionFormProps {
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function useRequisitionForm({ onOpenChange, userProfile }: UseRequisitionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { config: systemConfig } = useSystemConfig(userProfile?.orgId);
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const [fileName, setFileName] = useState<string | null>(null);

  const isBusy = isLoading || isUploading;

  const vendorsQuery = useMemoFirebase(() =>
    firestore && userProfile ? query(collection(firestore, 'vendors'), where('orgId', '==', userProfile.orgId), where('isActive', '==', true)) : null
  , [firestore, userProfile]);
  const { data: vendors } = useCollection<Vendor>(vendorsQuery);

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", amount: 0, vendorId: "", description: "" },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('attachment', file);
      setFileName(file.name);
    }
  };

  async function onSubmit(values: RequisitionFormData) {
    if (!firestore || !userProfile) return;
    setIsLoading(true);

    try {
        let attachmentUrl: string | undefined;
        if (values.attachment) {
            const filePath = `requisitions/${userProfile.orgId}/${Date.now()}_${values.attachment.name}`;
            attachmentUrl = await uploadFile(values.attachment, filePath);
        }

        const vendor = vendors?.find(v => v.id === values.vendorId);
        await procurementService.createRequisition(firestore, userProfile, { ...values, vendorName: vendor?.name }, attachmentUrl);

        toast({ title: "Requisition Submitted", description: "Pending HR approval." });
        onOpenChange(false);
        form.reset();
        setFileName(null);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return {
    form,
    onSubmit,
    isBusy,
    uploadProgress,
    isUploading,
    vendors,
    systemConfig,
    fileName,
    handleFileChange,
  };
}

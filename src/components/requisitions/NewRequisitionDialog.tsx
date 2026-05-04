
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Paperclip } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Requisition, UserProfile, ActivityEntry, Vendor } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Progress } from "@/components/ui/progress";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  amount: z.coerce.number().min(1, { message: "Amount must be greater than 0." }),
  vendorId: z.string().min(1, "Please select a vendor."),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  attachment: z.custom<File>().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function NewRequisitionDialog({ open, onOpenChange, userProfile }: NewRequisitionDialogProps) {
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: 0,
      vendorId: "",
      description: "",
      attachment: undefined,
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('attachment', file);
      setFileName(file.name);
    }
  };

  const handleDialogClose = () => {
    form.reset();
    setFileName(null);
    onOpenChange(false);
  }

  async function onSubmit(values: FormData) {
    if (!firestore || !userProfile) return;
    setIsLoading(true);

    try {
        let attachmentUrl: string | undefined = undefined;
        if (values.attachment) {
            const filePath = `requisitions/${userProfile.orgId}/${Date.now()}_${values.attachment.name}`;
            attachmentUrl = await uploadFile(values.attachment, filePath);
        }

        const vendor = vendors?.find(v => v.id === values.vendorId);
        const reqsCollection = collection(firestore, 'requisitions');
        
        const q = query(reqsCollection, where('orgId', '==', userProfile.orgId));
        const orgReqsSnapshot = await getDocs(q);
        const newSerialNo = `REQ-${String(orgReqsSnapshot.size + 1).padStart(4, '0')}`;

        const now = new Date().toISOString();
        const nextStatus = 'PENDING_HR';

        const initialActivity: ActivityEntry = {
            type: 'LOG',
            actorId: userProfile.id,
            actorName: userProfile.fullName,
            timestamp: now,
            text: `created the requisition and sent for HR approval.`,
            fromStatus: 'N/A',
            toStatus: nextStatus,
        };

        const newRequisition: Omit<Requisition, 'id'> = {
            serialNo: newSerialNo,
            orgId: userProfile.orgId,
            createdBy: userProfile.id,
            creatorName: userProfile.fullName,
            title: sanitizeInput(values.title),
            amount: values.amount,
            vendorId: values.vendorId,
            vendorName: vendor?.name || 'Unknown Vendor',
            description: sanitizeInput(values.description),
            status: nextStatus,
            createdAt: now,
            activity: [initialActivity],
            attachmentUrl: attachmentUrl || null,
            attachmentName: values.attachment ? values.attachment.name : null,
        };

        await addDocumentNonBlocking(reqsCollection, newRequisition);
        toast({ title: "Requisition Submitted", description: `Request ${newSerialNo} is pending approval.` });
        handleDialogClose();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Requisition</DialogTitle>
          <DialogDescription>Submit a new financial request for procurement.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Office Hardware Upgrade" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>Amount ({systemConfig?.currency_symbol || '$'})</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="vendorId" render={({ field }) => (
                        <FormItem><FormLabel>Vendor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Business Justification</FormLabel><FormControl><Textarea placeholder="Detailed reason for this expenditure..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="attachment" render={({ field }) => (
                    <FormItem><FormLabel>Supporting Documents</FormLabel>
                        <FormControl><Input id="req-attachment" type="file" className="hidden" onChange={handleFileChange} disabled={isBusy} /></FormControl>
                        <label htmlFor="req-attachment" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer border p-2 rounded-md hover:bg-accent transition-colors">
                            <Paperclip className="h-4 w-4" /><span className="truncate">{fileName || 'Upload Quote/Invoice'}</span>
                        </label>
                    <FormMessage /></FormItem>
                )}/>
                 {isUploading && <Progress value={uploadProgress} className="w-full h-2" />}
                <Button type="submit" className="w-full" disabled={isBusy}>
                    {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Confirm & Submit
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

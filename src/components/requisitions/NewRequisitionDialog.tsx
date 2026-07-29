"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Paperclip, PlusCircle } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { ResponsiveDialog } from "@/components/shared/ResponsiveDialog";
import { Progress } from "@/components/ui/progress";
import { useRequisitionForm } from "@/hooks/forms/useRequisitionForm";

interface NewRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function NewRequisitionDialog({ open, onOpenChange, userProfile }: NewRequisitionDialogProps) {
  const {
    form,
    onSubmit,
    isBusy,
    uploadProgress,
    isUploading,
    vendors,
    systemConfig,
    fileName,
    handleFileChange,
  } = useRequisitionForm({ onOpenChange, userProfile });

  return (
    <ResponsiveDialog 
        open={open} 
        onOpenChange={onOpenChange} 
        title="New Requisition" 
        description="Submit a new financial request for procurement."
    >
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                <SelectContent>{vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Business Justification</FormLabel><FormControl><Textarea placeholder="Detailed reason..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="attachment" render={({ field }) => (
                    <FormItem><FormLabel>Supporting Documents</FormLabel>
                        <FormControl><Input id="req-attachment" type="file" className="hidden" onChange={handleFileChange} disabled={isBusy} /></FormControl>
                        <label htmlFor="req-attachment" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer border p-2 rounded-md hover:bg-accent">
                            <Paperclip className="h-4 w-4" /><span className="truncate">{fileName || 'Upload Quote'}</span>
                        </label>
                    <FormMessage /></FormItem>
                )}/>
                 {isUploading && <Progress value={uploadProgress} className="w-full h-2" />}
                <Button type="submit" className="w-full" disabled={isBusy}>
                    {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Submit Requisition
                </Button>
            </form>
        </Form>
    </ResponsiveDialog>
  );
}

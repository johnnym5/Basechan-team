"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Paperclip, PlusCircle } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { useRequisitionForm } from "@/hooks/forms/useRequisitionForm";

interface NewRequisitionFormProps {
  onSuccess?: () => void;
  userProfile: UserProfile | null;
}

export function NewRequisitionForm({ onSuccess, userProfile }: NewRequisitionFormProps) {
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
  } = useRequisitionForm({
      onOpenChange: (open) => {
          if (!open && onSuccess) onSuccess();
      },
      userProfile
  });

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Request Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Office Hardware Upgrade" {...field} className="h-10 rounded-xl" /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Amount ({systemConfig?.currency_symbol || '$'})</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} className="h-10 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="vendorId" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Vendor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select Supplier" /></SelectTrigger></FormControl>
                            <SelectContent className="apple-glass-darker border-none">{vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>
             <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Justification</FormLabel>
                    <FormControl><Textarea placeholder="Detailed reason..." {...field} className="rounded-xl min-h-[80px]" /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="attachment" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Support Docs</FormLabel>
                    <FormControl><Input id="req-attachment" type="file" className="hidden" onChange={handleFileChange} disabled={isBusy} /></FormControl>
                    <label htmlFor="req-attachment" className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground cursor-pointer border-2 border-dashed border-border p-3 rounded-xl hover:bg-accent transition-all">
                        <Paperclip className="h-4 w-4 text-primary" /><span className="truncate">{fileName || 'Upload Invoice/Quote'}</span>
                    </label>
                    <FormMessage />
                </FormItem>
            )}/>
             {isUploading && <Progress value={uploadProgress} className="w-full h-1" />}
            <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest" disabled={isBusy}>
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Submit Request
            </Button>
        </form>
    </Form>
  );
}

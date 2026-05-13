
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MonitorDot, Info } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { ExternalDisplay, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";
import { auditService } from "@/services/audit-service";

const formSchema = z.object({
  title: z.string().min(3, "Identify the display (min 3 chars)."),
  url: z.string().url("Must be a valid secure URL (https).").refine(u => u.startsWith('https://'), "Only secure (HTTPS) links are permitted for security."),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function AddDashboardDialog({ open, onOpenChange, userProfile }: { open: boolean, onOpenChange: (open: boolean) => void, userProfile: UserProfile }) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", url: "", description: "" },
  });

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
        const newDisplay: Omit<ExternalDisplay, 'id'> = {
            orgId: userProfile.orgId,
            title: sanitizeInput(values.title),
            url: values.url, // Do not sanitize URL to avoid breaking parameters
            description: sanitizeInput(values.description),
            createdBy: userProfile.id,
            createdAt: new Date().toISOString(),
        };

        const docRef = await addDocumentNonBlocking(collection(firestore, 'external_displays'), newDisplay);
        
        if (docRef) {
            await auditService.logAction(firestore, userProfile, 'DISPLAY_INTEGRATE', `Integrated external feed: ${values.title}`, { id: docRef.id, type: 'DISPLAY' });
        }

        toast({ title: "Feed Integrated", description: `"${values.title}" is now active in the Mission Control center.` });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Integration Failed", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md apple-glass-darker border-none rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorDot className="h-5 w-5 text-primary" />
            Integrate External Feed
          </DialogTitle>
          <DialogDescription>
            Input the secure embed URL for any dashboard, document, or web tool.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Display Identity</FormLabel>
                        <FormControl><Input placeholder="e.g., Q4 Word Strategy or Excel Pipeline" {...field} className="rounded-xl h-12 bg-background/50 border-white/5" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="url" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Transmission Node (URL)</FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} className="rounded-xl h-12 bg-background/50 border-white/5 font-mono text-xs" /></FormControl>
                        <FormDescription className="text-[9px] leading-tight">Drop the link from Word Online, Excel, PowerBI, or any secure web dashboard.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Contextual Memo</FormLabel>
                        <FormControl><Textarea placeholder="What data or tool does this feed provide?" {...field} className="rounded-xl bg-background/50 border-white/5" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 text-primary">
                    <Info className="h-5 w-5 shrink-0" />
                    <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tighter">
                        Ensure the target platform has granted 'Public View' or 'Anyone with link' access to allow the iframe to bypass authentication barriers.
                    </p>
                </div>

                <DialogFooter>
                    <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Integration'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MonitorDot, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { ExternalDisplay, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";
import { auditService } from "@/services/audit-service";
import { usePermissions } from "@/hooks/usePermissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  title: z.string().min(3, "Identify the display (min 3 chars)."),
  url: z.string().url("Must be a valid secure URL (https).").refine(u => u.startsWith('https://'), "Only secure (HTTPS) links are permitted for security."),
  description: z.string().optional(),
  displayMode: z.enum(['GLOBAL', 'PRIVATE']),
});

type FormData = z.infer<typeof formSchema>;

interface AddDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
  editDisplay?: ExternalDisplay | null;
}

export function AddDashboardDialog({ open, onOpenChange, userProfile, editDisplay }: AddDashboardDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const permissions = usePermissions(userProfile);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", url: "", description: "", displayMode: permissions.canManageDisplays ? "GLOBAL" : "PRIVATE" },
  });

  useEffect(() => {
    if (open) {
      if (editDisplay) {
        form.reset({
          title: editDisplay.title,
          url: editDisplay.url,
          description: editDisplay.description || "",
          displayMode: editDisplay.displayMode || 'GLOBAL',
        });
      } else {
        form.reset({ title: "", url: "", description: "", displayMode: permissions.canManageDisplays ? "GLOBAL" : "PRIVATE" });
      }
    }
  }, [open, editDisplay, form, permissions.canManageDisplays]);

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
        if (editDisplay) {
            await updateDocumentNonBlocking(doc(firestore, 'external_displays', editDisplay.id), {
                title: sanitizeInput(values.title),
                url: values.url,
                description: sanitizeInput(values.description),
                displayMode: values.displayMode,
            });
            await auditService.logAction(firestore, userProfile, 'DISPLAY_UPDATE', `Updated external feed: ${values.title}`, { id: editDisplay.id, type: 'DISPLAY' });
            toast({ title: "Feed Updated", description: `"${values.title}" has been updated.` });
        } else {
            const newDisplay: Omit<ExternalDisplay, 'id'> = {
                orgId: userProfile.orgId,
                title: sanitizeInput(values.title),
                url: values.url,
                description: sanitizeInput(values.description),
                displayMode: values.displayMode,
                createdBy: userProfile.id,
                createdAt: new Date().toISOString(),
            };

            const docRef = await addDocumentNonBlocking(collection(firestore, 'external_displays'), newDisplay);
            
            if (docRef) {
                await auditService.logAction(firestore, userProfile, 'DISPLAY_INTEGRATE', `Integrated external feed: ${values.title}`, { id: docRef.id, type: 'DISPLAY' });
            }
            toast({ title: "Feed Integrated", description: `"${values.title}" is now active.` });
        }

        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Action Failed", description: error.message });
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
            {editDisplay ? 'Update External Feed' : 'Integrate External Feed'}
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
                        <FormDescription className="text-[9px] leading-tight">Drop the link from Word Online, Excel, PowerBI, WhatsApp Web, or any secure web dashboard.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="displayMode" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Visibility</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!permissions.canManageDisplays}>
                            <FormControl>
                                <SelectTrigger className="rounded-xl h-12 bg-background/50 border-white/5">
                                    <SelectValue placeholder="Select visibility" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="GLOBAL">Global (Everyone in Organization)</SelectItem>
                                <SelectItem value="PRIVATE">Private (Only You)</SelectItem>
                            </SelectContent>
                        </Select>
                        {!permissions.canManageDisplays && (
                            <FormDescription className="text-[9px] text-muted-foreground leading-tight">You only have permission to create Private displays.</FormDescription>
                        )}
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
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editDisplay ? 'Update Configuration' : 'Confirm Integration')}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

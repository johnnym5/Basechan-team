"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useUser, useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wrench } from "lucide-react";
import type { UserProfile } from "@/lib/types";

interface ITSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function ITSupportDialog({ open, onOpenChange, userProfile }: ITSupportDialogProps) {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userProfile) return;

    setIsSubmitting(true);

    // STRICT HARDCODED ROUTING PAYLOAD
    const ticketPayload = {
      type: "IT_SUPPORT_TICKET",
      title: `[IT-SUPPORT] ${title}`,
      description: description,
      urgency: urgency,
      reportedPath: pathname, // Captures where the error happened
      status: "QUEUED",
      orgId: userProfile.orgId,
      createdBy: userProfile.id,
      creatorName: userProfile.fullName,
      assignedToEmails: ["Jegbase@gmail.com", "ithub@basechaninternational.com"],
      createdAt: new Date().toISOString(),
    };

    try {
      await addDocumentNonBlocking(collection(firestore, 'tasks'), ticketPayload);

      toast({
          title: "Ticket Dispatched",
          description: "IT Command has been notified of your request."
      });

      onOpenChange(false);
      setTitle("");
      setDescription("");
      setUrgency("MEDIUM");
    } catch (error: any) {
      toast({
          variant: "destructive",
          title: "Dispatch Failed",
          description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card rounded-[2rem] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary font-black uppercase tracking-widest flex items-center gap-2">
            <Wrench className="h-5 w-5" /> IT Support Request
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-tighter opacity-70">
            Report system bugs, access issues, or hardware requests directly to the IT Command team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Issue Title</label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl bg-background/50 border-white/5"
              placeholder="e.g., Cannot access Finance Module"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Detailed Description</label>
            <Textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] p-4 rounded-2xl bg-background/50 border-white/5 resize-none text-sm"
              placeholder="Please explain the issue and steps to reproduce..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Urgency Level</label>
            <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-white/5">
                    <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent className="apple-glass border-none">
                    <SelectItem value="LOW" className="text-xs font-bold uppercase">Low (Cosmetic/Minor)</SelectItem>
                    <SelectItem value="MEDIUM" className="text-xs font-bold uppercase">Medium (Impedes workflow)</SelectItem>
                    <SelectItem value="CRITICAL" className="text-xs font-bold uppercase text-rose-500">Critical (System down/Data risk)</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl">
             <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter leading-relaxed">
                <span className="text-primary font-black">Diagnostic Context:</span> {pathname}
             </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="h-12 px-8 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-primary/20">
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {isSubmitting ? "Routing..." : "Submit Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

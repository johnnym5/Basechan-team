
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trophy, Users, Star, Heart, Zap, Sparkles } from "lucide-react";
import { useState } from "react";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, BadgeType } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { kudosService } from "@/services/kudos-service";
import { cn } from "@/lib/utils";

const BADGES: { type: BadgeType; label: string; icon: any; color: string; description: string }[] = [
    { type: "TEAM_PLAYER", label: "Team Player", icon: Users, color: "text-blue-500 bg-blue-500/10", description: "Excellent collaboration and support." },
    { type: "PROBLEM_SOLVER", label: "Problem Solver", icon: Zap, color: "text-amber-500 bg-amber-500/10", description: "Creative solutions to tough obstacles." },
    { type: "INNOVATOR", label: "Innovator", icon: Sparkles, color: "text-emerald-500 bg-emerald-500/10", description: "Fresh ideas that improve the node." },
    { type: "RELENTLESS", label: "Relentless", icon: Heart, color: "text-rose-500 bg-rose-500/10", description: "Incredible work ethic and grit." },
];

const formSchema = z.object({
  badgeType: z.enum(["TEAM_PLAYER", "PROBLEM_SOLVER", "INNOVATOR", "RELENTLESS"]),
  message: z.string().min(5, "Include a brief memo for the peer review."),
});

type FormData = z.infer<typeof formSchema>;

interface AwardKudosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserProfile;
  currentUserProfile: UserProfile;
}

export function AwardKudosDialog({ open, onOpenChange, targetUser, currentUserProfile }: AwardKudosDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { badgeType: "TEAM_PLAYER", message: "" },
  });

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
        await kudosService.awardBadge(
            firestore, 
            currentUserProfile, 
            targetUser.id, 
            targetUser.fullName, 
            values.badgeType, 
            values.message
        );
        
        toast({ title: "Recognition Deployed", description: `You've recognized ${targetUser.fullName.split(' ')[0]} as a ${values.badgeType.replace('_', ' ')}.`});
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Deployment Blocked", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md apple-glass-darker border-none rounded-[2rem] p-8">
        <DialogHeader className="space-y-4">
            <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
                <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
                <DialogTitle className="text-2xl font-black font-headline tracking-tighter">Recognize Excellence</DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-widest font-bold mt-1">Personnel: {targetUser.fullName}</DialogDescription>
            </div>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                    {BADGES.map(badge => {
                        const Icon = badge.icon;
                        const isSelected = form.watch("badgeType") === badge.type;
                        return (
                            <div 
                                key={badge.type}
                                onClick={() => form.setValue("badgeType", badge.type)}
                                className={cn(
                                    "p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center gap-1 group",
                                    isSelected ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-white/5 border-white/5 hover:bg-white/10"
                                )}
                            >
                                <Icon className={cn("h-5 w-5 mb-1", isSelected ? "text-white" : "text-primary group-hover:scale-110 transition-transform")} />
                                <p className="text-[10px] font-black uppercase tracking-tighter">{badge.label}</p>
                                <p className="text-[7px] opacity-60 leading-tight uppercase font-bold">{badge.description}</p>
                            </div>
                        );
                    })}
                </div>

                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">Peer Review Memo</FormLabel>
                        <FormControl>
                            <Textarea placeholder="What impact did their work have on this week's mission?" {...field} rows={3} className="rounded-2xl bg-background/40 border-white/5 focus-visible:ring-primary/20" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <DialogFooter>
                    <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy Recognition"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, PulseMood } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Smile, AlertCircle, Frown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PulseCheckFormProps {
    userProfile: UserProfile;
    onSuccess?: () => void;
}

export function PulseCheckForm({ userProfile, onSuccess }: PulseCheckFormProps) {
    const [mood, setMood] = useState<PulseMood | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!mood || !firestore) return;
        setIsSubmitting(true);

        try {
            await addDocumentNonBlocking(collection(firestore, 'pulse_checks'), {
                orgId: userProfile.orgId,
                userId: userProfile.id,
                userName: userProfile.fullName,
                date: new Date().toISOString().split('T')[0],
                mood,
                timestamp: new Date().toISOString(),
            });

            toast({ title: "Pulse Recorded", description: "Your feedback helps us maintain team health." });
            if (onSuccess) onSuccess();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 py-4">
            <div className="text-center space-y-2">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary">How is your workload today?</h4>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">Anonymous patterns are shared with leadership.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[
                    { id: 'SMOOTH', label: 'Smooth', icon: Smile, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
                    { id: 'HEAVY', label: 'Heavy', icon: AlertCircle, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
                    { id: 'OVERWHELMED', label: 'Burnt Out', icon: Frown, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setMood(item.id as PulseMood)}
                        className={cn(
                            "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95",
                            mood === item.id ? item.color + " ring-4 ring-primary/20 scale-105" : "bg-muted/30 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                        )}
                    >
                        <item.icon className="h-8 w-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    </button>
                ))}
            </div>

            <Button
                onClick={handleSubmit}
                disabled={!mood || isSubmitting}
                className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Pulse"}
            </Button>
        </div>
    );
}

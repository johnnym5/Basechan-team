
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smile, Frown, AlertCircle, Loader2, Thermometer } from 'lucide-react';
import { uiEmitter } from '@/lib/ui-emitter';
import { useFirestore } from '@/firebase';
import { pulseService } from '@/services/pulse-service';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, PulseMood } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PulseCheckDialog({ userProfile }: { userProfile: UserProfile }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        const trigger = () => setIsOpen(true);
        uiEmitter.on('open-pulse-check' as any, trigger);
        return () => uiEmitter.off('open-pulse-check' as any, trigger);
    }, []);

    const handleMoodSelect = async (mood: PulseMood) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            await pulseService.logPulse(firestore, userProfile, mood);
            toast({ title: "Feedback Sent", description: "Your daily check-in has been recorded." });
            setIsOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md apple-glass-darker border-none rounded-[2.5rem] p-8 text-center">
                <DialogHeader className="space-y-4">
                    <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
                        <Thermometer className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black font-headline tracking-tighter">Daily Check-in</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2">
                            How was your workload during this shift?
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 py-8">
                    {[
                        { mood: 'SMOOTH', label: 'Great', icon: Smile, color: 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white', desc: 'Workload was manageable and smooth.' },
                        { mood: 'HEAVY', label: 'Busy', icon: AlertCircle, color: 'text-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-white', desc: 'High volume, but keeping up.' },
                        { mood: 'OVERWHELMED', label: 'Overwhelmed', icon: Frown, color: 'text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white', desc: 'Feeling exhausted or overloaded today.' },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.mood}
                                onClick={() => handleMoodSelect(item.mood as PulseMood)}
                                disabled={isSubmitting}
                                className={cn(
                                    "p-4 rounded-3xl border border-white/5 transition-all flex items-center gap-4 group text-left",
                                    item.color
                                )}
                            >
                                <div className="p-3 rounded-2xl bg-white/10 group-hover:bg-black/10 transition-colors">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black uppercase tracking-widest text-xs leading-none">{item.label}</p>
                                    <p className="text-[10px] opacity-60 mt-1 uppercase font-bold leading-tight">{item.desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {isSubmitting && (
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

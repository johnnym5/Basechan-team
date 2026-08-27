"use client"

import React, { useState } from 'react';
import { Send, Info, CheckCircle2, ChevronRight, Zap, Star, Users, Heart, Lightbulb, Compass, GraduationCap, Loader2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useSystemConfigs } from '@/hooks/useSystemConfigs';

interface PeerNominationFormProps {
    currentUser: UserProfile;
    staffList: { id: string; name: string }[];
}

export function PeerNominationForm({ currentUser, staffList }: PeerNominationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, { nomineeId: string; reason: string }>>({});
  const [additionalComments, setAdditionalComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Dynamic Award Categories
  const { data: dynamicCategories, loading: isCategoriesLoading } = useSystemConfigs('award_categories', currentUser.orgId);

  // Legacy Collection Fetching (Migration Support)
  const legacyCategoriesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'accolade_categories'), where('orgId', '==', currentUser.orgId), where('isActive', '==', true)) : null
  , [firestore, currentUser.orgId]);
  const { data: legacyCategories } = useCollection<any>(legacyCategoriesQuery);

  const CATEGORIES = useMemo(() => {
    const dynamic = (dynamicCategories || []).map(c => ({ id: c.id, title: c.name, emoji: c.emoji, desc: c.description }));
    const legacy = (legacyCategories || []).map(c => ({ id: c.id, title: c.title, emoji: c.icon, desc: c.description }));
    return [...dynamic, ...legacy];
  }, [dynamicCategories, legacyCategories]);

  const toggleCategory = (id: string) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const updateFormData = (catId: string, field: 'nomineeId' | 'reason', value: string) => {
    setFormData(prev => ({
      ...prev,
      [catId]: { ...prev[catId], [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || selectedCats.length === 0) return;

    setIsSubmitting(true);
    try {
      const nominations = selectedCats.map(catId => {
        const cat = CATEGORIES.find(c => c.id === catId);
        return {
          categoryId: catId,
          categoryTitle: cat?.name || (cat as any).title,
          nomineeId: formData[catId]?.nomineeId || '',
          nomineeName: staffList.find(s => s.id === formData[catId]?.nomineeId)?.name || "Unknown",
          reason: formData[catId]?.reason || '',
          status: 'PENDING', // Awaiting manager review
          orgId: currentUser.orgId,
          nominatorId: currentUser.id,
          nominatorName: currentUser.fullName,
          timestamp: new Date().toISOString()
        };
      });

      // 1. Save individual nomination records for easier aggregation
      const promises = nominations.map(nom => addDoc(collection(firestore, 'nominations'), nom));

      // 2. Fire ANONYMOUS notifications
      nominations.forEach(nom => {
        if (nom.nomineeId) {
          addDoc(collection(firestore, 'notifications'), {
            orgId: currentUser.orgId,
            userId: nom.nomineeId,
            type: 'nomination_alert',
            title: 'New Award Nomination!',
            description: `🎉 Someone nominated you for the ${nom.categoryTitle} award! Keep up the great work.`,
            href: '/reports?tab=recognition',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      });

      await Promise.all(promises);

      toast({
        title: "Nominations Dispatched",
        description: "Thank you for recognizing your teammates! Your submissions are being reviewed."
      });

      // Reset
      setSelectedCats([]);
      setFormData({});
      setAdditionalComments('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-700">

      {/* Step 1: Selection */}
      <div className="space-y-6 bg-white/5 border border-white/5 p-8 rounded-[2rem] shadow-2xl">
        <div>
            <h2 className="text-xl font-black font-headline tracking-tighter uppercase text-white mb-2">Award Selection</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Select the categories for which you wish to nominate your colleagues.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isCategoriesLoading ? (
            <div className="col-span-full py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary opacity-20" />
            </div>
          ) : CATEGORIES.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-3xl opacity-20 italic text-xs uppercase tracking-widest">
                No award categories identified.
            </div>
          ) : CATEGORIES.map(cat => {
            const Icon = (cat as any).icon || Star;
            const isSelected = selectedCats.includes(cat.id);
            return (
                <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                        "p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-3 h-full",
                        isSelected
                            ? 'bg-primary/10 border-primary text-white shadow-xl shadow-primary/10'
                            : 'bg-black/20 border-white/5 hover:border-white/20 text-muted-foreground'
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div className={cn("p-2 rounded-xl bg-white/5", isSelected ? "text-primary" : "text-muted-foreground group-hover:text-white")}>
                            {typeof Icon === 'string' ? <span className="text-xl">{Icon}</span> : <Icon className="w-5 h-5" />}
                        </div>
                        <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-white/10"
                        )}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                    </div>
                    <div>
                        <span className={cn("font-black text-xs uppercase tracking-tight", isSelected ? "text-white" : "text-slate-400 group-hover:text-slate-200")}>{(cat as any).emoji} {cat.name || (cat as any).title}</span>
                        <p className="text-[9px] font-medium leading-relaxed opacity-60 mt-1 line-clamp-2">{cat.description || (cat as any).desc}</p>
                    </div>
                </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Dynamic Form Fields */}
      {selectedCats.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {selectedCats.map(catId => {
            const cat = CATEGORIES.find(c => c.id === catId);
            const Icon = (cat as any).icon || Star;
            return (
              <div key={catId} className="bg-white/5 border border-white/5 p-8 rounded-[2rem] shadow-xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    {cat && typeof Icon !== 'string' && <Icon className="w-32 h-32" />}
                </div>

                <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Nomination for {cat?.name || (cat as any).title}</h3>
                </div>

                <div className="grid grid-cols-1 gap-6 relative z-10">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Identify Personnel</label>
                    <Select
                      required
                      value={formData[catId]?.nomineeId || ''}
                      onValueChange={(val) => updateFormData(catId, 'nomineeId', val)}
                    >
                        <SelectTrigger className="h-12 rounded-xl bg-black/20 border-white/10 text-xs font-bold uppercase tracking-tight">
                            <SelectValue placeholder="Select a teammate..." />
                        </SelectTrigger>
                        <SelectContent className="apple-glass-darker border-none rounded-2xl">
                            {staffList.filter(s => s.id !== currentUser.id).map(staff => (
                                <SelectItem key={staff.id} value={staff.id} className="text-xs font-bold uppercase p-3">{staff.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Justification Memo (Specific Examples Required)</label>
                    <Textarea
                      required
                      value={formData[catId]?.reason || ''}
                      onChange={(e) => updateFormData(catId, 'reason', e.target.value)}
                      className="min-h-[120px] rounded-2xl bg-black/20 border-white/10 text-sm font-medium leading-relaxed p-4 focus:border-primary/50 transition-all resize-none italic"
                      placeholder="e.g., During the project launch on Tuesday, they stayed late to ensure all system nodes were operational..."
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 3: Final Thoughts */}
      <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem] shadow-xl space-y-4">
        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Additional Operational Feedback (Optional)</label>
        <Textarea
          value={additionalComments}
          onChange={(e) => setAdditionalComments(e.target.value)}
          className="min-h-[80px] rounded-2xl bg-black/20 border-white/10 text-sm font-medium leading-relaxed p-4 focus:border-primary/50 transition-all resize-none opacity-60 focus:opacity-100"
          placeholder="Any other observations regarding team culture or recognition?"
        />
      </div>

      <div className="flex justify-end pb-12">
        <Button
          type="submit"
          disabled={isSubmitting || selectedCats.length === 0}
          className="h-14 px-10 bg-primary text-primary-foreground font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all group"
        >
          {isSubmitting ? (
              <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> DISPATCHING...</div>
          ) : (
              <div className="flex items-center gap-2">SUBMIT NOMINATIONS <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></div>
          )}
        </Button>
      </div>

    </form>
  );
}

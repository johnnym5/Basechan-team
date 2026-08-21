"use client"

import React, { useState } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AccoladeCategory, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface CategoryManagerProps {
    userProfile: UserProfile;
}

export function CategoryManager({ userProfile }: CategoryManagerProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newTitle, setNewTitle] = useState('');
    const [newIcon, setNewIcon] = useState('⭐');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categoriesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'accolade_categories'), where('orgId', '==', userProfile.orgId)) : null
    , [firestore, userProfile.orgId]);
    const { data: categories } = useCollection<AccoladeCategory>(categoriesQuery);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !newTitle.trim()) return;

        setIsSubmitting(true);
        try {
            const category: Omit<AccoladeCategory, 'id'> = {
                orgId: userProfile.orgId,
                title: newTitle.trim(),
                description: "Tactical performance category",
                icon: newIcon,
                isActive: true,
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(firestore, 'accolade_categories'), category);
            setNewTitle('');
            toast({ title: "Category Created", description: "The new accolade is now active for daily voting." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Creation Failed", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (id: string, current: boolean) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'accolade_categories', id), { isActive: !current });
            toast({ title: "Status Synchronized", description: "Category visibility has been updated." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message });
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* 1. ADD NEW CATEGORY */}
            <Card className="apple-glass border-none shadow-xl overflow-hidden rounded-[2rem]">
                <CardHeader className="bg-primary/5 p-8 border-b border-white/5">
                    <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-3">
                        <Zap className="w-6 h-6 text-primary" /> Define Tactical Accolade
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Accolade Title</label>
                            <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="e.g. Master Communicator"
                                className="h-12 rounded-xl bg-black/20 border-white/10 text-sm font-bold"
                            />
                        </div>
                        <div className="w-full sm:w-24 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Icon/Emoji</label>
                            <Input
                                value={newIcon}
                                onChange={(e) => setNewIcon(e.target.value)}
                                className="h-12 rounded-xl bg-black/20 border-white/10 text-center text-xl"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !newTitle.trim()}
                            className="h-12 sm:mt-6 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                        >
                            Deploy Category
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* 2. ACTIVE CATEGORIES LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories?.map(cat => (
                    <div key={cat.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-secondary/30 flex items-center justify-center text-2xl shadow-inner">
                                {cat.icon}
                            </div>
                            <div>
                                <p className="text-sm font-black text-white uppercase tracking-tight">{cat.title}</p>
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest",
                                    cat.isActive ? "text-emerald-500" : "text-muted-foreground opacity-40"
                                )}>{cat.isActive ? 'Active Stream' : 'Disabled'}</span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(cat.id, cat.isActive)}
                            className={cn(
                                "h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all",
                                cat.isActive ? "text-rose-500 hover:bg-rose-500/10" : "text-emerald-500 hover:bg-emerald-500/10"
                            )}
                        >
                            {cat.isActive ? 'Deactivate' : 'Enable'}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Trash2,
  Trophy,
  UserPlus,
  Plus,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  BadgeCheck
} from "lucide-react";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, query, where, orderBy, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";

interface NominationCategory {
    id: string;
    title: string;
    description: string;
    isActive: boolean;
}

interface NominationManagerProps {
    isAdmin: boolean;
    userProfile: UserProfile;
}

export function NominationManager({ isAdmin, userProfile }: NominationManagerProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedPeer, setSelectedPeer] = useState<string>("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newCategoryTitle, setNewCategoryTitle] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    // Fetch Categories
    const categoriesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'recognition_categories'), orderBy('title', 'asc')) : null
    , [firestore]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<NominationCategory>(categoriesQuery);

    // Fetch Staff Directory
    const staffQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
    , [firestore, userProfile.orgId]);
    const { data: staffList, isLoading: isStaffLoading } = useCollection<UserProfile>(staffQuery);

    const otherStaff = useMemo(() =>
        staffList?.filter(s => s.id !== userProfile.id) || []
    , [staffList, userProfile.id]);

    const handleAddCategory = async () => {
        if (!newCategoryTitle.trim() || !firestore) return;
        setIsAddingCategory(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'recognition_categories'), {
                title: newCategoryTitle.trim(),
                description: "Peer recognition category",
                isActive: true,
                createdAt: new Date().toISOString()
            });
            setNewCategoryTitle("");
            toast({ title: "Category Added", description: `"${newCategoryTitle}" is now available for nominations.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleDeleteCategory = (id: string) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'recognition_categories', id));
        toast({ title: "Category Removed", description: "The nomination category has been deleted." });
    };

    const handleSubmitNomination = async () => {
        if (!selectedCategory || !selectedPeer || !reason.trim() || !firestore) return;
        setIsSubmitting(true);
        try {
            const category = categories?.find(c => c.id === selectedCategory);
            const nominee = staffList?.find(s => s.id === selectedPeer);

            await addDocumentNonBlocking(collection(firestore, 'nominations'), {
                orgId: userProfile.orgId,
                categoryId: selectedCategory,
                categoryTitle: category?.title,
                nomineeId: selectedPeer,
                nomineeName: nominee?.fullName,
                nominatorId: userProfile.id,
                nominatorName: userProfile.fullName,
                reason: reason.trim(),
                timestamp: new Date().toISOString(),
                status: 'PENDING'
            });

            setReason("");
            setSelectedCategory("");
            setSelectedPeer("");
            toast({
                title: "Nomination Submitted",
                description: `Your nomination for ${nominee?.fullName} has been recorded.`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* STAFF VIEW: SUBMIT NOMINATION */}
            <Card className="apple-glass border-none shadow-xl overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-white/5">
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Nominate a Peer
                    </CardTitle>
                    <CardDescription>Acknowledge exceptional contributions from your teammates.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Recognition Category</label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="h-12 bg-background/50 border-white/5 rounded-xl">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent className="apple-glass-darker border-none">
                                        {categories?.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id} className="text-xs font-bold">{cat.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nominate Colleague</label>
                                <Select value={selectedPeer} onValueChange={setSelectedPeer}>
                                    <SelectTrigger className="h-12 bg-background/50 border-white/5 rounded-xl">
                                        <SelectValue placeholder="Select Peer" />
                                    </SelectTrigger>
                                    <SelectContent className="apple-glass-darker border-none">
                                        {otherStaff.map(staff => (
                                            <SelectItem key={staff.id} value={staff.id} className="text-xs font-bold">{staff.fullName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Reason for Excellence</label>
                                <Textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Explain why this unit deserves recognition..."
                                    className="min-h-[120px] bg-background/50 border-white/5 rounded-2xl resize-none text-sm font-medium"
                                />
                            </div>
                            <Button
                                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                                onClick={handleSubmitNomination}
                                disabled={isSubmitting || !selectedCategory || !selectedPeer || reason.length < 10}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <BadgeCheck className="h-5 w-5 mr-2" />}
                                Submit Nomination
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ADMIN VIEW: MANAGE CATEGORIES */}
            {isAdmin && (
                <Card className="border border-amber-500/20 bg-amber-500/5 rounded-[2rem] overflow-hidden">
                    <CardHeader className="border-b border-amber-500/10">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-amber-600" />
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-700">Admin: Category Management</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex gap-3 mb-8">
                            <Input
                                value={newCategoryTitle}
                                onChange={(e) => setNewCategoryTitle(e.target.value)}
                                placeholder="E.g., Innovator of the Month"
                                className="h-12 bg-background/50 border-white/10 rounded-xl"
                            />
                            <Button
                                onClick={handleAddCategory}
                                disabled={isAddingCategory || !newCategoryTitle.trim()}
                                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest"
                            >
                                {isAddingCategory ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
                                Add Category
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categories?.map(category => (
                                <div key={category.id} className="flex justify-between items-center p-4 bg-background/40 border border-white/5 rounded-2xl group hover:bg-background/60 transition-all">
                                    <span className="text-xs font-bold uppercase tracking-tight">{category.title}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {categories?.length === 0 && !areCategoriesLoading && (
                                <p className="col-span-full text-center text-[10px] font-black uppercase tracking-widest opacity-30 py-8">No active categories</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

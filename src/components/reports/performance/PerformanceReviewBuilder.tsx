"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    Trophy,
    Plus,
    Trash2,
    Save,
    ShieldCheck,
    Star,
    Zap,
    FileText,
    Users,
    Heart,
    Target,
    ChevronRight,
    Loader2
} from "lucide-react"
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, PerformanceReview, ReviewTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ReviewTemplateSelector } from './ReviewTemplateSelector';
import { useToast } from '@/hooks/use-toast';

interface PerformanceReviewBuilderProps {
    userProfile: UserProfile;
    staffList: UserProfile[];
}

export function PerformanceReviewBuilder({ userProfile, staffList }: PerformanceReviewBuilderProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FORM STATE ---
  const [employeeId, setEmployeeId] = useState("");
  const [cycle, setCycle] = useState<PerformanceReview['cycle']>("MONTHLY");
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [templateName, setTemplateName] = useState<string | undefined>(undefined);

  // Dynamic Metric Arrays
  const [businessTargets, setBusinessTargets] = useState<{ metricName: string; score: number }[]>([]);
  const [interpersonalSkills, setInterpersonalSkills] = useState<{ skillName: string; score: number }[]>([]);

  // Qualitative Fields
  const [qualitative, setQualitative] = useState<PerformanceReview['qualitative']>({
    successAreas: "",
    areasForImprovement: "",
    focusAreasNextReview: "",
    overallAchievements: "",
    agreedActionPlan: ""
  });

  // --- ENGINE ---
  const handleAddMetric = (type: 'business' | 'interpersonal') => {
    if (type === 'business') {
        setBusinessTargets([...businessTargets, { metricName: "", score: 3 }]);
    } else {
        setInterpersonalSkills([...interpersonalSkills, { skillName: "", score: 3 }]);
    }
  };

  const handleRemoveMetric = (type: 'business' | 'interpersonal', index: number) => {
    if (type === 'business') {
        setBusinessTargets(businessTargets.filter((_, i) => i !== index));
    } else {
        setInterpersonalSkills(interpersonalSkills.filter((_, i) => i !== index));
    }
  };

  const updateMetric = (type: 'business' | 'interpersonal', index: number, field: string, value: any) => {
    if (type === 'business') {
        const next = [...businessTargets];
        (next[index] as any)[field] = value;
        setBusinessTargets(next);
    } else {
        const next = [...interpersonalSkills];
        (next[index] as any)[field] = value;
        setInterpersonalSkills(next);
    }
  };

  const handleTemplateSelected = (template: ReviewTemplate) => {
    if (!template || (template as any) === 'blank') {
        setBusinessTargets([]);
        setInterpersonalSkills([]);
        setTemplateId(undefined);
        setTemplateName(undefined);
        return;
    }
    setBusinessTargets(template.businessTargets.map(name => ({ metricName: name, score: 3 })));
    setInterpersonalSkills(template.interpersonalSkills.map(name => ({ skillName: name, score: 3 })));
    setTemplateId(template.id);
    setTemplateName(template.templateName);
    toast({ title: "Template Hydrated", description: `Performance matrix loaded from '${template.templateName}'.` });
  };

  const handleSubmit = async () => {
    if (!firestore || !employeeId) return;
    setIsSubmitting(true);

    try {
        const selectedStaff = staffList.find(s => s.id === employeeId);

        const reviewData: Omit<PerformanceReview, 'id'> = {
            orgId: userProfile.orgId,
            userId: employeeId,
            userName: selectedStaff?.fullName || "Unknown",
            reviewerId: userProfile.id,
            reviewerName: userProfile.fullName,
            cycle,
            templateId,
            templateName,
            reviewDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            qualitative,
            businessTargets,
            interpersonalSkills,
            signatures: {},
            status: 'PUBLISHED'
        };

        await addDocumentNonBlocking(collection(firestore, 'performance_reviews'), reviewData);
        toast({ title: "Review Published", description: "The performance record has been finalized." });

        // Reset
        setEmployeeId("");
        setBusinessTargets([]);
        setInterpersonalSkills([]);
        setQualitative({ successAreas: "", areasForImprovement: "", focusAreasNextReview: "", overallAchievements: "", agreedActionPlan: "" });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Submission Failed", description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!firestore || (businessTargets.length === 0 && interpersonalSkills.length === 0)) return;
    const templateName = prompt("Enter a unique name for this review template:");
    if (!templateName) return;

    try {
        const templateData: Omit<ReviewTemplate, 'id'> = {
            orgId: userProfile.orgId,
            templateName,
            businessTargets: businessTargets.map(t => t.metricName),
            interpersonalSkills: interpersonalSkills.map(s => s.skillName),
            createdBy: userProfile.id,
            createdAt: new Date().toISOString()
        };

        await addDocumentNonBlocking(collection(firestore, 'review_templates'), templateData);
        toast({ title: "Template Saved", description: `'${templateName}' is now available for future reviews.` });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Template Save Failed", description: e.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-20">

      {/* 1. HEADER & GLOBAL CONTROLS */}
      <Card className="apple-glass border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="p-8 pb-4 border-b border-white/5 bg-white/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-black font-headline tracking-tighter uppercase flex items-center gap-3">
                        <Trophy className="w-7 h-7 text-primary" /> Performance Review Builder
                    </CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Generate dynamic tactical evaluations and growth plans.</CardDescription>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Select value={cycle} onValueChange={(v: any) => setCycle(v)}>
                        <SelectTrigger className="w-full md:w-[140px] h-12 rounded-xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="apple-glass-darker border-none">
                            <SelectItem value="WEEKLY" className="text-[10px] font-bold uppercase p-3">Weekly</SelectItem>
                            <SelectItem value="MONTHLY" className="text-[10px] font-bold uppercase p-3">Monthly</SelectItem>
                            <SelectItem value="QUARTERLY" className="text-[10px] font-bold uppercase p-3">Quarterly</SelectItem>
                            <SelectItem value="YEARLY" className="text-[10px] font-bold uppercase p-3">Yearly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Target Personnel</label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                        <SelectTrigger className="h-14 rounded-2xl bg-black/20 border-white/10 text-xs font-bold uppercase tracking-widest">
                            <SelectValue placeholder="Identify Personnel..." />
                        </SelectTrigger>
                        <SelectContent className="apple-glass-darker border-none rounded-2xl">
                            {staffList.filter(s => s.id !== userProfile.id).map(staff => (
                                <SelectItem key={staff.id} value={staff.id} className="text-xs font-bold uppercase p-3">{staff.fullName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col justify-end">
                    <ReviewTemplateSelector orgId={userProfile.orgId} onTemplateSelected={handleTemplateSelected} />
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 2. QUANTITATIVE MATRIX (DYNAMIC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Business Targets */}
        <Card className="apple-glass border-none shadow-xl rounded-[2rem] overflow-hidden flex flex-col min-h-[400px]">
            <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-primary/5 px-8 pt-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                        <Target className="w-4 h-4" /> Operational Targets
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => handleAddMetric('business')} className="h-8 w-8 rounded-lg hover:bg-primary/20 text-primary">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                {businessTargets.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-20 italic">
                        <p className="text-[9px] font-black uppercase tracking-widest text-center px-10">Add specific business metrics or select a template to initialize the matrix.</p>
                    </div>
                ) : businessTargets.map((item, idx) => (
                    <div key={idx} className="space-y-3 animate-in slide-in-from-left-4 duration-300">
                        <div className="flex items-center justify-between gap-3">
                            <input
                                value={item.metricName}
                                onChange={(e) => updateMetric('business', idx, 'metricName', e.target.value)}
                                placeholder="Metric Name (e.g. Sales, Tickets)"
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-tight text-white flex-1 p-0"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMetric('business', idx)} className="h-6 w-6 text-rose-500 hover:bg-rose-500/10">
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(score => (
                                    <button
                                        key={score}
                                        onClick={() => updateMetric('business', idx, 'score', score)}
                                        className={cn(
                                            "w-10 h-10 rounded-xl font-black text-xs transition-all border",
                                            item.score === score
                                                ? "bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/30"
                                                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                                        )}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary opacity-60">Score</span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>

        {/* Interpersonal Skills */}
        <Card className="apple-glass border-none shadow-xl rounded-[2rem] overflow-hidden flex flex-col min-h-[400px]">
            <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-emerald-500/5 px-8 pt-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Professional Integrity
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => handleAddMetric('interpersonal')} className="h-8 w-8 rounded-lg hover:bg-emerald-500/20 text-emerald-500">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                {interpersonalSkills.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-20 italic">
                        <p className="text-[9px] font-black uppercase tracking-widest text-center px-10">Define soft-skill benchmarks or load from departmental presets.</p>
                    </div>
                ) : interpersonalSkills.map((item, idx) => (
                    <div key={idx} className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between gap-3">
                            <input
                                value={item.skillName}
                                onChange={(e) => updateMetric('interpersonal', idx, 'skillName', e.target.value)}
                                placeholder="Skill Name (e.g. Communication)"
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-tight text-white flex-1 p-0"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMetric('interpersonal', idx)} className="h-6 w-6 text-rose-500 hover:bg-rose-500/10">
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(score => (
                                    <button
                                        key={score}
                                        onClick={() => updateMetric('interpersonal', idx, 'score', score)}
                                        className={cn(
                                            "w-10 h-10 rounded-xl font-black text-xs transition-all border",
                                            item.score === score
                                                ? "bg-emerald-500 border-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30"
                                                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                                        )}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-60">Level</span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
      </div>

      {/* 3. QUALITATIVE NARRATIVE */}
      <Card className="apple-glass border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 pb-4 border-b border-white/5 bg-white/5">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Situational Analysis & Action Plan
            </CardTitle>
        </CardHeader>
        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Success Areas</label>
                <Textarea
                    value={qualitative.successAreas}
                    onChange={(e) => setQualitative({...qualitative, successAreas: e.target.value})}
                    placeholder="Identify major tactical wins..."
                    className="min-h-[120px] rounded-2xl bg-black/20 border-white/5 resize-none focus:border-primary/50 transition-all text-sm font-medium leading-relaxed italic"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-rose-500/60 ml-1">Areas for Improvement</label>
                <Textarea
                    value={qualitative.areasForImprovement}
                    onChange={(e) => setQualitative({...qualitative, areasForImprovement: e.target.value})}
                    placeholder="Surface operational frictions..."
                    className="min-h-[120px] rounded-2xl bg-black/20 border-white/5 resize-none focus:border-rose-500/50 transition-all text-sm font-medium leading-relaxed"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 ml-1">Overall Achievements</label>
                <Textarea
                    value={qualitative.overallAchievements}
                    onChange={(e) => setQualitative({...qualitative, overallAchievements: e.target.value})}
                    placeholder="Summary of performance value..."
                    className="min-h-[120px] rounded-2xl bg-black/20 border-white/5 resize-none focus:border-emerald-500/50 transition-all text-sm font-medium leading-relaxed"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-amber-500/60 ml-1">Agreed Action Plan</label>
                <Textarea
                    value={qualitative.agreedActionPlan}
                    onChange={(e) => setQualitative({...qualitative, agreedActionPlan: e.target.value})}
                    placeholder="Define clear objectives for next cycle..."
                    className="min-h-[120px] rounded-2xl bg-black/20 border-white/5 resize-none focus:border-amber-500/50 transition-all text-sm font-medium leading-relaxed"
                />
            </div>
            <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Next Review Focus</label>
                <Textarea
                    value={qualitative.focusAreasNextReview}
                    onChange={(e) => setQualitative({...qualitative, focusAreasNextReview: e.target.value})}
                    placeholder="Primary concentration for the upcoming period..."
                    className="min-h-[100px] rounded-2xl bg-black/20 border-white/5 resize-none focus:border-primary/50 transition-all text-sm font-medium leading-relaxed"
                />
            </div>
        </CardContent>

        {/* 4. FOOTER ACTIONS */}
        <div className="p-8 border-t border-white/5 bg-black/20 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 text-rose-500/60">
                <ShieldCheck className="w-5 h-5" />
                <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed max-w-xs">
                    This evaluation will be immutable once published. Authorized personnel must sign-off digitally to confirm validity.
                </p>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
                <Button
                    variant="outline"
                    onClick={handleSaveAsTemplate}
                    disabled={businessTargets.length === 0 && interpersonalSkills.length === 0}
                    className="h-14 px-8 rounded-2xl border-white/10 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 flex-1 sm:flex-none"
                >
                    <Save className="mr-2 h-4 w-4 text-primary" /> Save as Template
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !employeeId}
                    className="h-14 px-12 rounded-2xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 m3-interactive flex-1 sm:flex-none"
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    Authorize & Publish
                </Button>
            </div>
        </div>
      </Card>

    </div>
  )
}

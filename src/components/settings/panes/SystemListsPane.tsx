"use client"

import React, { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, parseISO } from "date-fns"
import { useSystemConfigs } from "@/hooks/useSystemConfigs"
import { AddConfigDialog } from "../AddConfigDialog"
import { AddHolidayDialog } from "../AddHolidayDialog"
import { Trash2, ListTree, Calendar, Trophy, Zap, Boxes, FileText, LayoutDashboard, Check, X, Plus, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PerformanceReviewBuilder } from "../../reports/performance/PerformanceReviewBuilder"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { collection, query, where } from "firebase/firestore"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import type { UserProfile, ReviewTemplate } from "@/lib/types"

interface SystemListsPaneProps {
    userProfile: UserProfile;
}

export function SystemListsPane({ userProfile }: SystemListsPaneProps) {
  const [activeTab, setActiveTab] = useState("reviews")
  const [itemToDelete, setItemToDelete] = useState<{ item: any, onRemove: (item: any) => void, label: string } | null>(null)
  const firestore = useFirestore();

  const staffQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile.orgId]);
  const { data: staffList } = useCollection<UserProfile>(staffQuery);

  // Fetch REAL data from Firestore using the new real-time hook
  const { data: reviewTemplates, loading: loadingReviews, removeItem: removeReview } = useSystemConfigs('review_templates', userProfile.orgId)
  const { data: leaveTypes, loading: loadingLeave, removeItem: removeLeave } = useSystemConfigs('leave_types', userProfile.orgId)
  const { data: awardCategories, loading: loadingAwards, removeItem: removeAward } = useSystemConfigs('award_categories', userProfile.orgId)
  const { data: assetCategories, loading: loadingAssets, removeItem: removeAsset } = useSystemConfigs('asset_categories', userProfile.orgId)
  const { data: holidays, loading: loadingHolidays, removeItem: removeHoliday } = useSystemConfigs('global_holidays', userProfile.orgId)

  // Legacy Collection Fetching (Migration Support)
  const accoladeQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'accolade_categories'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile.orgId]);
  const { data: legacyAccolades } = useCollection<any>(accoladeQuery);

  const combinedAwards = useMemo(() => {
    const dynamic = awardCategories || [];
    const legacy = (legacyAccolades || []).map(a => ({
        id: a.id,
        name: a.title,
        description: a.description,
        emoji: a.icon || '⭐',
        isActive: a.isActive,
        isLegacy: true
    }));
    return [...dynamic, ...legacy];
  }, [awardCategories, legacyAccolades]);

  const renderList = (data: any[], loading: boolean, onRemove: (item: any) => void, label: string, configId: any) => (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/5 shadow-inner">
         <div>
           <h3 className="text-sm font-black uppercase tracking-widest text-primary">{label} Definitions</h3>
           <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Manage the global list of {label.toLowerCase()} available across the system.</p>
         </div>
         <AddConfigDialog configId={configId} label={label} orgId={userProfile.orgId} />
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-white/10 rounded-[2rem] opacity-30 italic text-xs uppercase tracking-widest">
            No {label.toLowerCase()} configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-5 border border-white/5 rounded-2xl bg-black/20 hover:border-primary/30 transition-all group shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                {item.emoji && (
                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">
                        {item.emoji}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight truncate">{item.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed line-clamp-1 opacity-60">{item.description || 'No description provided.'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setItemToDelete({ item, onRemove, label })}
                className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in duration-700">
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-white">Dropdowns & Forms</h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Manage global dropdown values and form settings.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-secondary/20 rounded-2xl p-1 w-full grid grid-cols-2 md:grid-cols-5 border border-white/5 mb-8">
          <TabsTrigger value="reviews" className="rounded-xl px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="leave" className="rounded-xl px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Leave
          </TabsTrigger>
          <TabsTrigger value="awards" className="rounded-xl px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" /> Awards
          </TabsTrigger>
          <TabsTrigger value="holidays" className="rounded-xl px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <Landmark className="w-3.5 h-3.5" /> Holidays
          </TabsTrigger>
          <TabsTrigger value="assets" className="rounded-xl px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <Boxes className="w-3.5 h-3.5" /> Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-0 outline-none">
          <Accordion type="single" collapsible defaultValue="builder" className="space-y-4">
                {/* 1. THE BUILDER */}
                <AccordionItem value="builder" className="border-none">
                    <div className="bg-primary/5 border border-primary/20 rounded-[2rem] overflow-hidden">
                        <AccordionTrigger className="px-8 py-6 hover:no-underline group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                    <Zap className="w-5 h-5 animate-pulse" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-black uppercase tracking-widest text-primary">Live Performance Review Builder</span>
                                    <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">Generate performance evaluations for staff</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 border-t border-white/5">
                            <div className="bg-black/20 p-8">
                                <PerformanceReviewBuilder
                                    userProfile={userProfile}
                                    staffList={staffList || []}
                                />
                            </div>
                        </AccordionContent>
                    </div>
                </AccordionItem>

                {/* 2. TEMPLATE MANAGEMENT (Existing) */}
                <AccordionItem value="templates" className="border-none">
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
                        <AccordionTrigger className="px-8 py-6 hover:no-underline group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl text-white group-hover:scale-110 transition-transform">
                                    <LayoutDashboard className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-black uppercase tracking-widest text-white">Performance Review Blueprints</span>
                                    <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">Manage reusable assessment templates</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 border-t border-white/5">
                            {renderList(reviewTemplates, loadingReviews, removeReview, "Review Blueprint", "review_templates")}
                        </AccordionContent>
                    </div>
                </AccordionItem>
            </Accordion>
        </TabsContent>

        <TabsContent value="leave" className="mt-0 outline-none">
          {renderList(leaveTypes, loadingLeave, removeLeave, "Leave Type", "leave_types")}
        </TabsContent>

        <TabsContent value="awards" className="mt-0 outline-none">
          {renderList(combinedAwards, loadingAwards, removeAward, "Award Category", "award_categories")}
        </TabsContent>

        <TabsContent value="holidays" className="mt-0 outline-none">
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/5 shadow-inner">
               <div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-primary">Global Holidays</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Days listed here are exempt from attendance penalties.</p>
               </div>
               <AddHolidayDialog />
            </div>

            {loadingHolidays ? (
              <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-[2rem] opacity-30 italic text-xs uppercase tracking-widest">
                  No upcoming holidays configured.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-5 border border-white/5 rounded-2xl bg-black/20 hover:border-primary/30 transition-all group shadow-sm">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white uppercase tracking-tight truncate">{holiday.name}</p>
                      <p className="text-[10px] font-bold text-primary tracking-widest uppercase mt-1 opacity-80">
                        {format(parseISO(holiday.date), "EEEE, MMMM do, yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setItemToDelete({ item: holiday, onRemove: removeHoliday, label: "Global Holiday" })}
                      className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assets" className="mt-0 outline-none">
          {renderList(assetCategories, loadingAssets, removeAsset, "Asset Category", "asset_categories")}
        </TabsContent>
      </Tabs>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="apple-glass-darker border-none rounded-[2rem] p-8 shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black font-headline tracking-tighter uppercase text-white">
                Authorize Purge: {itemToDelete?.label}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-400 leading-relaxed">
              Are you sure you want to remove <span className="text-white font-bold">{itemToDelete?.item.name || itemToDelete?.item.templateName}</span> from the system matrix? This action will impact linked operational nodes and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                    itemToDelete.onRemove(itemToDelete.item);
                    setItemToDelete(null);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20"
            >
              Permanently Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import React from "react"
import { PerformanceReviewBuilder } from "../performance/PerformanceReviewBuilder"
import { PerformanceReviewList } from "../performance/PerformanceReviewList"
import { PerformanceAnalyticsView } from "./PerformanceAnalyticsView"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Archive, Zap, BarChart3 } from "lucide-react"
import type { UserProfile, PerformanceReview, ReviewTemplate } from "@/lib/types"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"

export function ManagementTools({ currentUser, staffList }: { currentUser: UserProfile, staffList: UserProfile[] }) {
  const firestore = useFirestore();

  // Fetch Reviews for Analytics
  const reviewsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'performance_reviews'), where('orgId', '==', currentUser.orgId)) : null
  , [firestore, currentUser.orgId]);
  const { data: reviews } = useCollection<PerformanceReview>(reviewsQuery);

  // Fetch Templates for Analytics
  const templatesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'review_templates'), where('orgId', '==', currentUser.orgId)) : null
  , [firestore, currentUser.orgId]);
  const { data: templates } = useCollection<ReviewTemplate>(templatesQuery);

  // System Presets for Analytics (Matching ReviewTemplateSelector)
  const SYSTEM_TEMPLATES: ReviewTemplate[] = [
    { id: 'monthly_sync', orgId: 'SYSTEM', templateName: 'Standard Monthly Sync', businessTargets: [], interpersonalSkills: [], createdBy: 'SYSTEM', createdAt: '' },
    { id: 'probationary', orgId: 'SYSTEM', templateName: 'New Hire Probationary Review', businessTargets: [], interpersonalSkills: [], createdBy: 'SYSTEM', createdAt: '' },
    { id: 'pip', orgId: 'SYSTEM', templateName: 'Performance Improvement Plan (PIP)', businessTargets: [], interpersonalSkills: [], createdBy: 'SYSTEM', createdAt: '' },
    { id: 'leadership', orgId: 'SYSTEM', templateName: 'Leadership & Management Evaluation', businessTargets: [], interpersonalSkills: [], createdBy: 'SYSTEM', createdAt: '' },
    { id: 'post_project', orgId: 'SYSTEM', templateName: 'Post-Project / Peak Season Debrief', businessTargets: [], interpersonalSkills: [], createdBy: 'SYSTEM', createdAt: '' }
  ];

  const allTemplates = [...SYSTEM_TEMPLATES, ...(templates || [])];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="bg-secondary/20 rounded-2xl p-1 w-fit border border-white/5 flex gap-1 mb-8">
          <TabsTrigger value="builder" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <Zap className="w-4 h-4" /> Review Builder
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="archives" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <Archive className="w-4 h-4" /> Archives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="m-0 animate-in fade-in duration-500 outline-none">
            <div className="bg-black/20 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl">
                <PerformanceReviewBuilder userProfile={currentUser} staffList={staffList} />
            </div>
        </TabsContent>

        <TabsContent value="analytics" className="m-0 animate-in fade-in duration-500 outline-none">
            <PerformanceAnalyticsView
                reviewSubmissions={reviews || []}
                templates={allTemplates}
                staffList={staffList}
            />
        </TabsContent>

        <TabsContent value="archives" className="m-0 animate-in fade-in duration-500 outline-none">
            <div className="bg-black/20 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl">
                <PerformanceReviewList userProfile={currentUser} isAdmin={true} />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

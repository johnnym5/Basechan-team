"use client"

import React from "react"
import { CategoryManager } from "../recognition/CategoryManager"
import { PerformanceReviewBuilder } from "../performance/PerformanceReviewBuilder"
import { PerformanceReviewList } from "../performance/PerformanceReviewList"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, FilePlus, Archive } from "lucide-react"
import type { UserProfile } from "@/lib/types"

export function ManagementTools({ currentUser, staffList }: { currentUser: UserProfile, staffList: UserProfile[] }) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="bg-secondary/20 rounded-2xl p-1 w-fit border border-white/5 flex gap-1 mb-6">
          <TabsTrigger value="builder" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
            <FilePlus className="w-4 h-4 mr-2 text-primary" /> Builder
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
            <Settings className="w-4 h-4 mr-2 text-amber-500" /> Categories
          </TabsTrigger>
          <TabsTrigger value="archives" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
            <Archive className="w-4 h-4 mr-2 text-blue-500" /> Archives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="m-0">
          <PerformanceReviewBuilder userProfile={currentUser} staffList={staffList} />
        </TabsContent>

        <TabsContent value="categories" className="m-0">
          <CategoryManager userProfile={currentUser} />
        </TabsContent>

        <TabsContent value="archives" className="m-0">
          <PerformanceReviewList userProfile={currentUser} isAdmin={true} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import React from "react"
import { PerformanceReviewBuilder } from "../performance/PerformanceReviewBuilder"
import { PerformanceReviewList } from "../performance/PerformanceReviewList"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Archive, Zap } from "lucide-react"
import type { UserProfile } from "@/lib/types"

export function ManagementTools({ currentUser, staffList }: { currentUser: UserProfile, staffList: UserProfile[] }) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="bg-secondary/20 rounded-2xl p-1 w-fit border border-white/5 flex gap-1 mb-8">
          <TabsTrigger value="builder" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all flex items-center gap-2">
            <Zap className="w-4 h-4" /> Review Builder
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

        <TabsContent value="archives" className="m-0 animate-in fade-in duration-500 outline-none">
            <div className="bg-black/20 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl">
                <PerformanceReviewList userProfile={currentUser} isAdmin={true} />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

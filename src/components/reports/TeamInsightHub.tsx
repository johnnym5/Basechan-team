"use client"

import React, { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdvancedTimeFilter, type TimeFilterState } from "../shared/AdvancedTimeFilter"
import { Activity, Trophy, Download, FileSpreadsheet, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OperationalHealthView } from "./views/OperationalHealthView"
import { RecognitionCultureView } from "./views/RecognitionCultureView"
import type { UserProfile, Attendance, Task, LeaveRequest, Nomination, PulseCheck } from "@/lib/types"

interface TeamInsightHubProps {
    userProfile: UserProfile;
    staffList: UserProfile[];
    attendanceLogs: Attendance[];
    tasks: Task[];
    leaveRequests: LeaveRequest[];
    nominations: Nomination[];
    pulseFeed: PulseCheck[];
    onExport: () => void;
    onSubmitNomination: (payload: any) => void;
    isExporting?: boolean;
}

/**
 * Unified Team Insight Hub.
 * Merges Operational Analytics and Cultural Recognition into a high-fidelity tabbed interface.
 */
export function TeamInsightHub({
    userProfile,
    staffList,
    attendanceLogs,
    tasks,
    leaveRequests,
    nominations,
    pulseFeed,
    onExport,
    onSubmitNomination,
    isExporting = false
}: TeamInsightHubProps) {
  // 1. Master Time Filter controls ALL tabs
  const [timeFilter, setTimeFilter] = useState<TimeFilterState>({
    mode: 'WEEK',
    referenceDate: new Date(),
    weekIndex: Math.min(5, Math.ceil(new Date().getDate() / 7))
  })

  const [activeTab, setActiveTab] = useState("operations")
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(() =>
    staffList.filter(s => !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(s.role)).map(s => s.id)
  )

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500 overflow-x-hidden">

      {/* ROW 1: MASTER CONTROLS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Trophy className="w-32 h-32 text-primary" />
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white font-headline">Operations Hub</h2>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 ml-5">Unified Tactical & Cultural Intelligence</p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary ml-1 opacity-50 text-right mr-2">Cycle Control</span>
              <AdvancedTimeFilter value={timeFilter} onChange={setTimeFilter} />
          </div>

          <Button
            variant="outline"
            onClick={onExport}
            disabled={isExporting}
            className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest border-primary/20 hover:bg-primary/10 hover:border-primary transition-all self-end shadow-xl shadow-primary/10"
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2 text-primary" />}
            Export Intelligence
          </Button>
        </div>
      </div>

      {/* ROW 2: THE INNER NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">

        <div className="w-full overflow-x-auto no-scrollbar mb-6 shrink-0">
            <TabsList className="bg-secondary/20 rounded-2xl p-1 w-fit border border-white/5 flex gap-1">
                <TabsTrigger value="operations" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                    <Activity className="w-4 h-4 mr-2 text-primary" /> Operational Health
                </TabsTrigger>
                <TabsTrigger value="culture" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                    <Trophy className="w-4 h-4 mr-2 text-amber-500" /> Recognition & Culture
                </TabsTrigger>
            </TabsList>
        </div>

        {/* TAB 1: OPERATIONS */}
        <TabsContent value="operations" className="mt-0 flex-1 focus-visible:outline-none">
          <OperationalHealthView
            timeFilter={timeFilter}
            staffList={staffList}
            attendanceLogs={attendanceLogs}
            tasks={tasks}
            leaveRequests={leaveRequests}
            pulseFeed={pulseFeed}
            selectedStaffIds={selectedStaffIds}
          />
        </TabsContent>

        {/* TAB 2: CULTURE */}
        <TabsContent value="culture" className="mt-0 flex-1 focus-visible:outline-none">
          <RecognitionCultureView
            timeFilter={timeFilter}
            staffList={staffList}
            nominations={nominations}
            currentUser={userProfile}
            onSubmitNomination={onSubmitNomination}
            selectedStaffIds={selectedStaffIds}
          />
        </TabsContent>

      </Tabs>

    </div>
  )
}

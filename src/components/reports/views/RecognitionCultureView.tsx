"use client"

import React, { useMemo } from "react"
import type { UserProfile, Nomination } from "@/lib/types"
import { type ViewScope } from "@/components/shared/DateScopePicker"
import { startOfMonth, endOfMonth, addDays, isAfter, startOfDay, endOfDay, isWithinInterval, parseISO, startOfWeek, endOfWeek } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

// BLUEPRINT COMPONENTS
import { NominationStation } from "../recognition/NominationStation"
import { MyTrophies } from "../recognition/MyTrophies"
import { MonthlyLeaderboard } from "../recognition/MonthlyLeaderboard"
import { PerformanceReviewList } from "../performance/PerformanceReviewList"

interface RecognitionCultureViewProps {
    timeFilter: { mode: ViewScope, referenceDate: Date };
    staffList: UserProfile[];
    nominations: Nomination[];
    currentUser: UserProfile;
    onSubmitNomination: (payload: any) => void;
    selectedStaffIds: string[];
}

/**
 * RECOGNITION / CULTURE VIEW
 * Refactored to match the Principal Architect's blueprint.
 * Fixes mounting and visual collapse issues.
 */
export function RecognitionCultureView({
    timeFilter,
    staffList,
    nominations,
    currentUser,
    selectedStaffIds
}: RecognitionCultureViewProps) {

  // 1. Calculate the active interval based on the time filter
  const filterInterval = useMemo(() => {
    let startDate: Date
    let endDate: Date

    if (timeFilter.mode === 'MONTH') {
      startDate = startOfMonth(timeFilter.referenceDate)
      endDate = endOfMonth(timeFilter.referenceDate)
    } else if (timeFilter.mode === 'WEEK') {
      startDate = startOfWeek(timeFilter.referenceDate, { weekStartsOn: 1 })
      endDate = endOfWeek(timeFilter.referenceDate, { weekStartsOn: 1 })
    } else {
      startDate = startOfDay(timeFilter.referenceDate)
      endDate = endOfDay(timeFilter.referenceDate)
    }

    return { start: startOfDay(startDate), end: endOfDay(endDate) }
  }, [timeFilter])

  // 2. Filter nominations for the current period
  const filteredLogs = useMemo(() => {
    return nominations.filter(n =>
        isWithinInterval(parseISO(n.timestamp), filterInterval)
    )
  }, [nominations, filterInterval])

  return (
    <div className="mt-4 flex-1 min-h-[500px] outline-none animate-in fade-in duration-500">

      {/* The Grid Layout as per blueprint to force components to show */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

        {/* LEFT COLUMN: The Form (Give an Award) */}
        <div className="lg:col-span-1 h-full">
          <NominationStation
            currentUser={currentUser}
            staffList={staffList}
            recognitionLogs={nominations}
          />
        </div>

        {/* RIGHT COLUMN: The Performance Leaderboard & Trophies */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">

          {/* Trophies Display */}
          <MyTrophies
            currentUser={currentUser}
            recognitionLogs={nominations}
          />

          {/* Monthly / Periodic Leaderboard */}
          <MonthlyLeaderboard
            staffList={staffList}
            filteredLogs={filteredLogs}
            currentUser={currentUser}
            timeFilter={timeFilter}
          />

          {/* My Performance Reviews Section */}
          <Card className="apple-glass-darker border-white/5 shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4 border-b border-white/5 bg-primary/5">
                <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-3">
                    <FileText className="w-6 h-6 text-primary" /> My Performance Reviews
                </CardTitle>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Formal feedback and evaluations from management</p>
            </CardHeader>
            <CardContent className="p-6">
                <PerformanceReviewList
                    userProfile={currentUser}
                    isAdmin={false}
                    hideHeader={true}
                />
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  )
}

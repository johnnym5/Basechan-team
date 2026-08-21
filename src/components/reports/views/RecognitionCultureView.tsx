"use client"

import React, { useMemo } from "react"
import type { UserProfile, Nomination } from "@/lib/types"
import { type TimeFilterState } from "@/components/shared/AdvancedTimeFilter"
import { startOfMonth, endOfMonth, addDays, isAfter, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns"

// BLUEPRINT COMPONENTS
import { NominationStation } from "../recognition/NominationStation"
import { MyTrophies } from "../recognition/MyTrophies"
import { MonthlyLeaderboard } from "../recognition/MonthlyLeaderboard"

interface RecognitionCultureViewProps {
    timeFilter: TimeFilterState;
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
      const monthStart = startOfMonth(timeFilter.referenceDate)
      startDate = addDays(monthStart, (timeFilter.weekIndex! - 1) * 7)
      endDate = endOfDay(addDays(startDate, 6))
      if (isAfter(endDate, endOfMonth(timeFilter.referenceDate))) {
        endDate = endOfMonth(timeFilter.referenceDate)
      }
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

        {/* LEFT COLUMN: The Form (Nomination Station) */}
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

        </div>

      </div>

    </div>
  )
}

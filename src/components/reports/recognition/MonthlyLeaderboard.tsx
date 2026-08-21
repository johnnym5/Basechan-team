"use client"

import React from "react"
import { RecognitionLeaderboard } from "./RecognitionLeaderboard"
import type { UserProfile, Nomination } from "@/lib/types"

interface MonthlyLeaderboardProps {
    staffList: UserProfile[];
    filteredLogs: Nomination[];
    currentUser: UserProfile;
    timeFilter: any;
}

export function MonthlyLeaderboard({ staffList, filteredLogs, currentUser, timeFilter }: MonthlyLeaderboardProps) {
  return (
    <div className="flex-1 min-h-[300px]">
      <RecognitionLeaderboard
        currentUser={currentUser}
        staffList={staffList}
        timeFilter={timeFilter}
      />
    </div>
  )
}

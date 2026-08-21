"use client"

import React from "react"
import { PeerNominationForm } from "./PeerNominationForm"
import type { UserProfile, Nomination } from "@/lib/types"

interface NominationStationProps {
    currentUser: UserProfile;
    staffList: UserProfile[];
    recognitionLogs: Nomination[];
}

export function NominationStation({ currentUser, staffList, recognitionLogs }: NominationStationProps) {
  // Mapping the staffList to the expected format for PeerNominationForm
  const mappedStaff = staffList.map(s => ({ id: s.id, name: s.fullName }));

  return (
    <div className="h-full">
      <PeerNominationForm
        currentUser={currentUser}
        staffList={mappedStaff}
      />
    </div>
  )
}

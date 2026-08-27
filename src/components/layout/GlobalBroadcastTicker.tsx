"use client"

import React from "react"
import type { Announcement, UserProfile } from "@/lib/types"
import { BroadcastSystem } from "./BroadcastSheet"

interface GlobalBroadcastTickerProps {
    broadcasts: Announcement[];
    userProfile: UserProfile | null;
}

/**
 * Global Ticker Bar that integrates with the Refactored Broadcast System.
 * Displays a marquee of recent announcements and acts as the trigger for the full broadcast feed.
 */
export function GlobalBroadcastTicker({ broadcasts = [], userProfile }: GlobalBroadcastTickerProps) {
    return (
        <div className="w-full bg-secondary/10 border-b border-white/5 h-10 flex items-center cursor-pointer hover:bg-secondary/20 transition-all group overflow-hidden relative">
            {/* THE REFACTORED BROADCAST SYSTEM WITH RBAC SHEET */}
            <BroadcastSystem currentUser={userProfile} broadcasts={broadcasts} />

            <div className="flex-1 overflow-hidden whitespace-nowrap relative h-full flex items-center pointer-events-none">
                {broadcasts.length > 0 ? (
                    <div className="inline-block animate-marquee group-hover:[animation-play-state:paused] text-[11px] font-bold uppercase tracking-widest text-foreground/80">
                        {broadcasts.map((b) => (
                            <span key={b.id} className="mx-12">
                                {b.title} <span className="opacity-30 mx-4">—</span> <span className="text-muted-foreground font-medium normal-case tracking-normal">{b.content.substring(0, 100)}{b.content.length > 100 ? '...' : ''}</span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="px-12 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-20">
                        No active system updates...
                    </div>
                )}
            </div>
        </div>
    );
}

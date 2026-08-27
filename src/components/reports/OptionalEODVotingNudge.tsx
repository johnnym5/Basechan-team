"use client"
import React from "react"
import Link from "next/link"
import { Award, ArrowRight, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/button"

export function OptionalEODVotingNudge({ onCloseModal }: { onCloseModal?: () => void }) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 my-3 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary mt-0.5">
          <Award className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            Before you log off today...
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Did someone make your shift easier? You can cast a quick vote or nominate a teammate for this month's recognition awards. Completely optional!
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-2.5 mt-1">
        <Link href="/staff/reports?tab=recognition" onClick={onCloseModal}>
          <Button size="sm" variant="ghost" className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 h-8 gap-1.5 rounded-lg px-3 transition-all">
            <HeartHandshake className="w-3.5 h-3.5" /> Cast a Vote / Give Kudos <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

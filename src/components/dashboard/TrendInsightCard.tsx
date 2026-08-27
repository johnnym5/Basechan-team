"use client"
import React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrendInsightCardProps {
  title: string
  metric: string
  description: string
  trendPercentage?: number // e.g., 5.2 or -2.1
  status?: 'success' | 'warning' | 'danger' | 'info'
}

export function TrendInsightCard({ title, metric, description, trendPercentage, status = 'info' }: TrendInsightCardProps) {
  const isPositive = trendPercentage !== undefined && trendPercentage >= 0
  const isNegative = trendPercentage !== undefined && trendPercentage < 0

  const statusColors = {
      success: "text-emerald-500",
      warning: "text-amber-500",
      danger: "text-rose-500",
      info: "text-primary"
  }

  return (
    <div className="flex items-center justify-between p-5 bg-black/20 rounded-[1.5rem] border border-white/5 group hover:border-primary/30 transition-all shadow-inner">

      {/* LEFT: TEXT & METRICS */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
          {title}
        </h4>
        <div className="flex items-end gap-3 mt-1">
          <span className="text-2xl font-black font-headline tracking-tighter text-white">{metric}</span>

          {trendPercentage !== undefined && (
            <div className={cn(
                "flex items-center text-[10px] font-black uppercase tracking-tight mb-1 bg-white/5 px-2 py-0.5 rounded-full",
                isPositive ? "text-emerald-500" : isNegative ? "text-rose-500" : "text-muted-foreground"
            )}>
                {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : isNegative ? <TrendingDown className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                {Math.abs(trendPercentage)}%
            </div>
          )}
        </div>
        <p className="text-[10px] font-medium text-muted-foreground mt-1 truncate">
          {description}
        </p>
      </div>

    </div>
  )
}

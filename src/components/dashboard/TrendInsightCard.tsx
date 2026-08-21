"use client"
import React from "react"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

interface TrendInsightCardProps {
  title: string
  metric: string
  description: string
  trendPercentage: number // e.g., 5.2 or -2.1
  sparklineData: { value: number }[]
}

export function TrendInsightCard({ title, metric, description, trendPercentage, sparklineData }: TrendInsightCardProps) {
  const isPositive = trendPercentage >= 0
  const colorClass = isPositive ? "text-emerald-500" : "text-rose-500"
  const strokeColor = isPositive ? "#10b981" : "#f43f5e" // Tailwind emerald-500 / rose-500

  return (
    <div className="flex items-center justify-between p-5 bg-black/20 rounded-[1.5rem] border border-white/5 group hover:border-primary/30 transition-all shadow-inner">

      {/* LEFT: TEXT & METRICS */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
          {title}
        </h4>
        <div className="flex items-end gap-3 mt-1">
          <span className="text-2xl font-black font-headline tracking-tighter text-white">{metric}</span>
          <div className={`flex items-center text-[10px] font-black uppercase tracking-tight ${colorClass} mb-1 bg-current/10 px-2 py-0.5 rounded-full`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(trendPercentage)}%
          </div>
        </div>
        <p className="text-[10px] font-medium text-muted-foreground mt-1 truncate">
          {description}
        </p>
      </div>

      {/* RIGHT: THE SPARKLINE */}
      <div className="h-[45px] w-[110px] shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}

"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface TrendInsightCardProps {
    title: string
    metric: string
    description: string
    trendPercentage?: number
    sparklineData?: { value: number }[]
    status?: 'success' | 'warning' | 'danger' | 'info'
}

export function TrendInsightCard({
    title,
    metric,
    description,
    trendPercentage,
    sparklineData,
    status = 'info'
}: TrendInsightCardProps) {
    const isPositive = trendPercentage && trendPercentage > 0
    const isNegative = trendPercentage && trendPercentage < 0

    const statusColors = {
        success: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        danger: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        info: "text-primary bg-primary/10 border-primary/20"
    }

    return (
        <Card className="apple-glass border-none shadow-xl overflow-hidden group">
            <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                            {title}
                        </p>
                        <h4 className="text-2xl font-black font-headline tracking-tighter text-white">
                            {metric}
                        </h4>
                    </div>

                    {trendPercentage !== undefined && (
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black",
                            isPositive ? "bg-emerald-500/20 text-emerald-500" :
                            isNegative ? "bg-rose-500/20 text-rose-500" :
                            "bg-white/10 text-muted-foreground"
                        )}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> :
                             isNegative ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {Math.abs(trendPercentage)}%
                        </div>
                    )}
                </div>

                <div className="flex-1 min-h-[40px] w-full mb-3">
                    {sparklineData && (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparklineData}>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={status === 'success' ? '#10b981' : status === 'danger' ? '#f43f5e' : status === 'warning' ? '#f59e0b' : 'hsl(var(--primary))'}
                                    fill={status === 'success' ? '#10b981' : status === 'danger' ? '#f43f5e' : status === 'warning' ? '#f59e0b' : 'hsl(var(--primary))'}
                                    fillOpacity={0.1}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className={cn(
                    "mt-auto p-2 rounded-lg border text-[8px] font-black uppercase tracking-widest",
                    statusColors[status]
                )}>
                    {description}
                </div>
            </CardContent>
        </Card>
    )
}

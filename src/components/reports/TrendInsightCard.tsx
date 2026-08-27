"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface TrendInsightCardProps {
    title: string
    metric: string
    description: string
    delta?: string // e.g. "+2" or "-1"
    deltaType?: 'positive' | 'negative' | 'neutral'
    type?: 'percentage' | 'number'
    status?: 'success' | 'warning' | 'danger' | 'info'
    onClick?: () => void
}

export function TrendInsightCard({
    title,
    metric,
    description,
    delta,
    deltaType = 'neutral',
    type = 'number',
    status = 'info',
    onClick
}: TrendInsightCardProps) {
    const statusColors = {
        success: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        danger: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        info: "text-primary bg-primary/10 border-primary/20"
    }

    const value = parseFloat(metric)

    return (
        <Card
            className={cn(
                "apple-glass border-none shadow-xl overflow-hidden group transition-all duration-300 flex flex-col justify-between",
                onClick && "cursor-pointer hover:bg-white/5 active:scale-[0.98]"
            )}
            onClick={onClick}
        >
            <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-4xl font-black font-headline tracking-tighter text-white">
                            {metric}
                        </h4>

                        {delta && (
                            <span className={cn(
                                "text-[10px] font-black flex items-center gap-1",
                                deltaType === 'positive' ? "text-emerald-500" :
                                deltaType === 'negative' ? "text-rose-500" :
                                "text-muted-foreground"
                            )}>
                                {deltaType === 'positive' && <TrendingUp className="w-3.5 h-3.5" />}
                                {deltaType === 'negative' && <TrendingDown className="w-3.5 h-3.5" />}
                                {deltaType === 'neutral' && <Minus className="w-3.5 h-3.5" />}
                                {delta}
                            </span>
                        )}
                    </div>
                </div>

                {/* VISUAL DATA LAYER */}
                <div className="min-h-[1.5px] w-full">
                    {type === 'percentage' && (
                        <Progress
                            value={value}
                            className="h-1.5 w-full bg-white/5"
                            indicatorClassName={cn(
                                status === 'success' ? "bg-emerald-500" :
                                status === 'danger' ? "bg-rose-500" :
                                status === 'warning' ? "bg-amber-500" : "bg-primary"
                            )}
                        />
                    )}
                </div>

                <div className={cn(
                    "p-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest text-center mt-auto",
                    statusColors[status]
                )}>
                    {description}
                </div>
            </CardContent>
        </Card>
    )
}

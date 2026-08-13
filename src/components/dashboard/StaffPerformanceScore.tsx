"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Star, TrendingUp, ShieldCheck, ShieldAlert, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/lib/types"

interface StaffPerformanceScoreProps {
    userProfile: UserProfile;
}

export function StaffPerformanceScore({ userProfile }: StaffPerformanceScoreProps) {
    const score = userProfile.performanceScore ?? 50
    const rating = userProfile.performanceRating ?? 'C'
    const status = userProfile.performanceStatus ?? 'STABLE'

    return (
        <Card className="apple-glass border-none shadow-2xl flex flex-col h-full overflow-hidden m3-interactive">
            <CardHeader className="border-b border-white/5 pb-4 bg-white/5 shrink-0 px-6 pt-5">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" /> Performance Standing
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center bg-black/10">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                        <p className="text-4xl font-black font-headline tracking-tighter text-white">{score}<span className="text-lg opacity-30">/100</span></p>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Current Standing</p>
                    </div>
                    <div className={cn(
                        "h-16 w-16 rounded-[1.5rem] flex items-center justify-center border-4 shadow-2xl transition-all duration-700",
                        rating === 'S' ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-amber-500/20 rotate-3" :
                        rating === 'A' ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-emerald-500/20" :
                        rating === 'F' ? "bg-rose-500/10 border-rose-500 text-rose-500 shadow-rose-500/20 -rotate-3" :
                        "bg-white/5 border-white/10 text-white"
                    )}>
                        <span className="font-black text-3xl font-headline">{rating}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                            <span className="text-muted-foreground">Progress to Tier {rating === 'S' ? 'S' : 'Up'}</span>
                            <span className="text-primary">{score}%</span>
                        </div>
                        <Progress value={score} className="h-2 bg-white/5" />
                    </div>

                    <div className={cn(
                        "p-3 rounded-2xl border flex items-center gap-3 transition-colors",
                        status === 'EXCELLING' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                        status === 'FLAGGED' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                        "bg-white/5 border-white/10 text-muted-foreground"
                    )}>
                        {status === 'EXCELLING' ? <TrendingUp className="w-4 h-4" /> :
                         status === 'FLAGGED' ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

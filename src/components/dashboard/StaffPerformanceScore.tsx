"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Star, TrendingUp, ShieldCheck, ShieldAlert, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/lib/types"

interface StaffPerformanceScoreProps {
    userProfile: UserProfile;
    isAdmin?: boolean;
}

export function StaffPerformanceScore({ userProfile, isAdmin = false }: StaffPerformanceScoreProps) {
    const score = userProfile.performanceScore ?? 50
    const rating = userProfile.performanceRating ?? 'C'
    const status = userProfile.performanceStatus ?? 'STABLE'

    const getHRFeedback = (currentScore: number) => {
        if (currentScore >= 95) return "Absolute top tier. Flawless execution and operational excellence!"
        if (currentScore >= 90) return "Incredible impact. You are leading the charge."
        if (currentScore >= 85) return "You're a standout employee!!"
        if (currentScore >= 80) return "Exceptional performance. Exceeding expectations."
        if (currentScore >= 75) return "Excellent work! Highly dependable execution."
        if (currentScore >= 70) return "Strong performance. You are an asset to the team."
        if (currentScore >= 65) return "Above average effort. Keep up the momentum."
        if (currentScore >= 60) return "Good work. Consistent and reliable."
        if (currentScore >= 55) return "Solid effort. Keeping pace with requirements."
        if (currentScore >= 50) return "Meeting baseline expectations. Stable."
        if (currentScore >= 45) return "Approaching baseline, but needs more effort."
        if (currentScore >= 40) return "Slightly below baseline. Let's aim higher."
        if (currentScore >= 35) return "Underperforming. We need to see more consistency."
        if (currentScore >= 30) return "Noticeable gaps in performance. Re-evaluate your workflow."
        if (currentScore >= 25) return "Below average performance. Needs immediate attention."
        if (currentScore >= 20) return "Struggling to meet basic requirements. Let's course correct."
        if (currentScore >= 15) return "Performance is significantly below expectations."
        if (currentScore >= 10) return "Critical performance issues detected. Improvement needed immediately."
        if (currentScore >= 5) return "You're on the verge of being fired."
        return "Immediate action required. Employment at severe risk."
    }

    return (
        <Card className="apple-glass border-none shadow-2xl flex flex-col h-full overflow-hidden m3-interactive">
            <CardHeader className="border-b border-white/5 pb-4 bg-white/5 shrink-0 px-6 pt-5">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" /> Performance Standing
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center bg-black/10">
                {isAdmin ? (
                    <>
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
                                    <span className="text-primary">{score % 10}0%</span>
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

                            <div className="mt-2 p-3 rounded-xl border border-white/5 bg-background/50">
                                <p className="text-[9px] text-muted-foreground font-medium italic">Staff sees: "{getHRFeedback(score)}"</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 h-full py-4">
                        <div className={cn(
                            "p-5 rounded-full shadow-2xl animate-in zoom-in duration-700",
                            score >= 50 ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'
                        )}>
                            <Star className="w-10 h-10" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">HR Feedback</h3>
                            <p className="text-lg font-bold font-headline leading-tight text-white max-w-[280px] mx-auto uppercase tracking-tighter">
                                "{getHRFeedback(score)}"
                            </p>
                        </div>
                        {status === 'FLAGGED' && (
                             <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Administrative Attention Required</span>
                             </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, TrendingUp, ShieldCheck, ShieldAlert, Award, Plus, Minus, Save, Loader2, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/lib/types"
import { useFirestore } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface StaffPerformanceScoreProps {
    userProfile: UserProfile;
    staffList?: UserProfile[];
    isAdmin?: boolean;
}

export function StaffPerformanceScore({ userProfile, staffList = [], isAdmin = false }: StaffPerformanceScoreProps) {
    const firestore = useFirestore()
    const { toast } = useToast()

    const [selectedStaffId, setSelectedStaffId] = useState<string>(userProfile?.id || "")

    const activeStaffOptions = useMemo(() => {
        if (staffList.length > 0) return staffList.filter(s => s.status !== 'DISABLED' && s.status !== 'TERMINATED');
        return [userProfile];
    }, [staffList, userProfile])

    const targetStaff = useMemo(() => {
        return activeStaffOptions.find(s => s.id === selectedStaffId) || activeStaffOptions[0] || userProfile;
    }, [activeStaffOptions, selectedStaffId, userProfile])

    const [score, setScore] = useState<number>(targetStaff.performanceScore ?? 50)
    const [rating, setRating] = useState<string>(targetStaff.performanceRating ?? 'C')
    const [status, setStatus] = useState<string>(targetStaff.performanceStatus ?? 'STABLE')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (targetStaff) {
            setScore(targetStaff.performanceScore ?? 50)
            setRating(targetStaff.performanceRating ?? 'C')
            setStatus(targetStaff.performanceStatus ?? 'STABLE')
        }
    }, [targetStaff])

    const handleScoreChange = (delta: number) => {
        setScore(prev => {
            const next = Math.max(0, Math.min(100, prev + delta))
            if (next >= 90) setRating('S')
            else if (next >= 80) setRating('A')
            else if (next >= 65) setRating('B')
            else if (next >= 50) setRating('C')
            else if (next >= 35) setRating('D')
            else setRating('F')
            return next
        })
    }

    const handleRatingSelect = (newRating: string) => {
        setRating(newRating)
        if (newRating === 'S') setScore(95)
        else if (newRating === 'A') setScore(85)
        else if (newRating === 'B') setScore(70)
        else if (newRating === 'C') setScore(55)
        else if (newRating === 'D') setScore(40)
        else setScore(20)
    }

    const handleSaveRating = async () => {
        if (!firestore || !targetStaff?.id) return
        setIsSaving(true)
        try {
            const userRef = doc(firestore, 'users', targetStaff.id)
            await updateDoc(userRef, {
                performanceScore: score,
                performanceRating: rating,
                performanceStatus: status,
                updatedAt: new Date().toISOString()
            })
            toast({
                title: "Rating Updated Successfully",
                description: `Updated ${targetStaff.fullName}'s score to ${score}/100 (Tier ${rating}).`
            })
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message })
        } finally {
            setIsSaving(false)
        }
    }

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
            <CardHeader className="border-b border-white/5 pb-3 bg-white/5 shrink-0 px-6 pt-4 flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" /> Performance Standing
                </CardTitle>

                {/* Admin Staff Selector */}
                {isAdmin && activeStaffOptions.length > 0 && (
                    <Select value={selectedStaffId || targetStaff?.id} onValueChange={setSelectedStaffId}>
                        <SelectTrigger className="w-[180px] h-8 bg-black/40 border-white/10 text-[10px] font-black uppercase text-white rounded-xl">
                            <SelectValue placeholder="Select Staff..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl">
                            {activeStaffOptions.map(staff => (
                                <SelectItem key={staff.id} value={staff.id} className="text-xs font-bold uppercase">
                                    {staff.fullName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </CardHeader>

            <CardContent className="p-5 flex-1 flex flex-col justify-between bg-black/10">
                {isAdmin ? (
                    <div className="space-y-4">
                        {/* Score Gauge & Tier Badge */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-3xl md:text-4xl font-black font-headline tracking-tighter text-white">
                                    {score}<span className="text-sm opacity-40">/100</span>
                                </p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                                    Target: <span className="text-white">{targetStaff?.fullName}</span>
                                </p>
                            </div>

                            {/* Rating Tier Selector Buttons */}
                            <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-2xl">
                                {['S', 'A', 'B', 'C', 'D', 'F'].map(tier => (
                                    <button
                                        key={tier}
                                        onClick={() => handleRatingSelect(tier)}
                                        className={cn(
                                            "w-7 h-7 rounded-xl text-xs font-black font-headline transition-all",
                                            rating === tier ? "bg-amber-500 text-black shadow-lg scale-105" : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Interactive Score Adjustment Buttons */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                <span>Adjust Rating Score</span>
                                <span className="text-primary font-mono">{score}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleScoreChange(-10)} className="h-8 px-2.5 rounded-xl border-white/10 bg-black/40 text-xs font-black text-rose-400 hover:bg-rose-500/20">-10</Button>
                                <Button size="sm" variant="outline" onClick={() => handleScoreChange(-5)} className="h-8 px-2.5 rounded-xl border-white/10 bg-black/40 text-xs font-black text-amber-400 hover:bg-amber-500/20">-5</Button>
                                <Progress value={score} className="h-2 flex-1 bg-white/5" />
                                <Button size="sm" variant="outline" onClick={() => handleScoreChange(5)} className="h-8 px-2.5 rounded-xl border-white/10 bg-black/40 text-xs font-black text-emerald-400 hover:bg-emerald-500/20">+5</Button>
                                <Button size="sm" variant="outline" onClick={() => handleScoreChange(10)} className="h-8 px-2.5 rounded-xl border-white/10 bg-black/40 text-xs font-black text-primary hover:bg-primary/20">+10</Button>
                            </div>
                        </div>

                        {/* Status Toggle & Save CTA */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
                                {(['EXCELLING', 'STABLE', 'FLAGGED'] as const).map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setStatus(st)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                            status === st && st === 'EXCELLING' && "bg-emerald-500 text-black",
                                            status === st && st === 'STABLE' && "bg-blue-500 text-white",
                                            status === st && st === 'FLAGGED' && "bg-rose-500 text-white",
                                            status !== st && "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>

                            <Button
                                size="sm"
                                disabled={isSaving}
                                onClick={handleSaveRating}
                                className="h-9 px-4 rounded-xl bg-primary text-white hover:bg-primary/90 text-[9px] font-black uppercase tracking-widest gap-1.5 shadow-lg shadow-primary/20"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save Rating
                            </Button>
                        </div>

                        {/* Live HR Feedback Preview */}
                        <div className="p-2.5 rounded-xl border border-white/5 bg-black/30">
                            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Staff Feedback Output:</p>
                            <p className="text-[10px] text-slate-200 font-medium italic mt-0.5">"{getHRFeedback(score)}"</p>
                        </div>
                    </div>
                ) : (
                    /* STAFF VIEW */
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

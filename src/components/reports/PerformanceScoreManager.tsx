"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Plus,
    Minus,
    TrendingUp,
    TrendingDown,
    ShieldCheck,
    ShieldAlert,
    User,
    ChevronRight,
    Star,
    AlertCircle,
    Save,
    RefreshCw,
    Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/lib/types"
import { useFirestore, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface PerformanceScoreManagerProps {
    staffList: UserProfile[];
    isAdmin: boolean;
}

export function PerformanceScoreManager({ staffList, isAdmin }: PerformanceScoreManagerProps) {
    const firestore = useFirestore()
    const { toast } = useToast()
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const filteredStaff = useMemo(() => {
        if (!searchQuery.trim()) return staffList
        const q = searchQuery.toLowerCase().trim()
        return staffList.filter(s =>
            s.fullName?.toLowerCase().includes(q) ||
            s.position?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q)
        )
    }, [staffList, searchQuery])

    const calculateRating = (score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' => {
        if (score >= 90) return 'S'
        if (score >= 80) return 'A'
        if (score >= 70) return 'B'
        if (score >= 50) return 'C'
        if (score >= 40) return 'D'
        if (score >= 30) return 'E'
        return 'F'
    }

    const getAutoStatus = (score: number): 'EXCELLING' | 'STABLE' | 'NEEDS_IMPROVEMENT' | 'FLAGGED' => {
        if (score >= 70) return 'EXCELLING'
        if (score >= 50) return 'STABLE'
        if (score >= 30) return 'NEEDS_IMPROVEMENT'
        return 'FLAGGED'
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

    const handleUpdateScore = async (staff: UserProfile, delta: number) => {
        if (!firestore || !isAdmin) return
        setUpdatingId(staff.id)

        const currentScore = staff.performanceScore ?? 50
        const newScore = Math.max(0, Math.min(100, currentScore + delta))
        const newRating = calculateRating(newScore)
        const newStatus = getAutoStatus(newScore)

        try {
            const staffRef = doc(firestore, 'users', staff.id)
            await updateDocumentNonBlocking(staffRef, {
                performanceScore: newScore,
                performanceRating: newRating,
                performanceStatus: newStatus
            })
            toast({ title: "Score Updated", description: `${staff.fullName}'s performance standing updated to ${newScore} points (${newRating}-Tier).` })
        } catch (e: any) {
            toast({ variant: "destructive", title: "Sync Failed", description: e.message })
        } finally {
            setUpdatingId(null)
        }
    }

    const handleManualStatus = async (staff: UserProfile, status: any) => {
        if (!firestore || !isAdmin) return
        try {
            const staffRef = doc(firestore, 'users', staff.id)
            await updateDocumentNonBlocking(staffRef, { performanceStatus: status })
            toast({ title: "Status Overridden", description: `${staff.fullName} status updated to ${status}.` })
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message })
        }
    }

    return (
        <Card className="apple-glass border-none shadow-2xl flex flex-col h-full overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4 bg-white/5 shrink-0 px-6 md:px-8 pt-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" /> Performance Standing Manager
                        </CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase opacity-50 mt-1">Direct HR point adjustment, tier ranking & feedback matrix</CardDescription>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search personnel..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-[10px] uppercase font-bold bg-background/50 border-white/10 rounded-xl"
                            />
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 shrink-0">
                            Baseline: 50.0
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
                {filteredStaff.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
                        <User className="w-12 h-12 mb-3 text-muted-foreground" />
                        <p className="text-xs font-black uppercase tracking-widest">No matching staff members found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredStaff.map(staff => {
                            const score = staff.performanceScore ?? 50
                            const rating = staff.performanceRating ?? 'C'
                            const status = staff.performanceStatus ?? 'STABLE'

                            return (
                                <div key={staff.id} className="p-6 hover:bg-white/5 transition-all group">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                        {/* Staff Info */}
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                                                <span className="font-black text-base text-foreground">{staff.fullName.charAt(0)}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-sm text-foreground uppercase truncate">{staff.fullName}</p>
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{staff.position}</p>
                                                <p className="text-[8px] font-medium text-amber-500/80 italic mt-1 truncate">
                                                    HR Note: "{getHRFeedback(score)}"
                                                </p>
                                            </div>
                                        </div>

                                        {/* Score Display */}
                                        <div className="flex items-center gap-6 shrink-0">
                                            <div className="flex flex-col items-center">
                                                <span className={cn(
                                                    "text-3xl font-black font-headline tracking-tighter leading-none",
                                                    score >= 70 ? "text-emerald-500" : score < 40 ? "text-rose-500" : "text-amber-500"
                                                )}>{score}</span>
                                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Points</span>
                                            </div>

                                            <div className="flex flex-col items-center">
                                                <div className={cn(
                                                    "h-11 w-11 rounded-2xl flex items-center justify-center border-2 shadow-lg",
                                                    rating === 'S' ? "bg-amber-500/10 border-amber-500 text-amber-500" :
                                                    rating === 'A' ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" :
                                                    rating === 'F' ? "bg-rose-500/10 border-rose-500 text-rose-500" :
                                                    "bg-white/5 border-white/10 text-foreground"
                                                )}>
                                                    <span className="font-black text-xl font-headline">{rating}</span>
                                                </div>
                                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Tier</span>
                                            </div>
                                        </div>

                                        {/* Admin Controls */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                                                <div className="flex items-center gap-1.5 bg-background/40 p-1.5 rounded-2xl border border-white/10">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2.5 rounded-xl font-black text-[10px] text-emerald-500 hover:bg-emerald-500/20 transition-all"
                                                        onClick={() => handleUpdateScore(staff, 5)}
                                                        disabled={updatingId === staff.id || score >= 100}
                                                        title="Add 5 Points"
                                                    >
                                                        +5
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2.5 rounded-xl font-black text-[10px] text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                                        onClick={() => handleUpdateScore(staff, 1)}
                                                        disabled={updatingId === staff.id || score >= 100}
                                                        title="Add 1 Point"
                                                    >
                                                        +1
                                                    </Button>
                                                    <div className="w-px h-4 bg-white/10 mx-0.5" />
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2.5 rounded-xl font-black text-[10px] text-rose-400 hover:bg-rose-500/20 transition-all"
                                                        onClick={() => handleUpdateScore(staff, -1)}
                                                        disabled={updatingId === staff.id || score <= 0}
                                                        title="Deduct 1 Point"
                                                    >
                                                        -1
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2.5 rounded-xl font-black text-[10px] text-rose-500 hover:bg-rose-500/20 transition-all"
                                                        onClick={() => handleUpdateScore(staff, -5)}
                                                        disabled={updatingId === staff.id || score <= 0}
                                                        title="Deduct 5 Points"
                                                    >
                                                        -5
                                                    </Button>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <select
                                                        className="bg-background/60 border border-white/10 rounded-xl text-[9px] font-black uppercase p-2 focus:outline-none focus:ring-1 focus:ring-primary w-28 text-foreground"
                                                        value={status}
                                                        onChange={(e) => handleManualStatus(staff, e.target.value)}
                                                    >
                                                        <option value="EXCELLING">Excelling</option>
                                                        <option value="STABLE">Stable</option>
                                                        <option value="NEEDS_IMPROVEMENT">Improving</option>
                                                        <option value="FLAGGED">Flagged</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

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
    RefreshCw
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
            toast({ title: "Score Updated", description: `${staff.fullName}'s performance profile synchronized.` })
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
            toast({ title: "Status Overridden", description: `${staff.fullName} marked as ${status}.` })
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message })
        }
    }

    return (
        <Card className="apple-glass border-none shadow-2xl flex flex-col h-full overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4 bg-white/5 shrink-0 px-8 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" /> Performance Standing System
                        </CardTitle>
                        <CardDescription className="text-[8px] font-bold uppercase opacity-40 mt-1">Manual point adjustment & tier ranking</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase">Company Baseline: 50.0</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
                <div className="divide-y divide-white/5">
                    {staffList.map(staff => {
                        const score = staff.performanceScore ?? 50
                        const rating = staff.performanceRating ?? 'C'
                        const status = staff.performanceStatus ?? 'STABLE'

                        return (
                            <div key={staff.id} className="p-6 hover:bg-white/5 transition-all group">
                                <div className="flex items-center justify-between gap-6">
                                    {/* Staff Info */}
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                                            <span className="font-black text-sm">{staff.fullName.charAt(0)}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-sm text-white uppercase truncate">{staff.fullName}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{staff.position}</p>
                                        </div>
                                    </div>

                                    {/* Score Display */}
                                    <div className="flex items-center gap-8 shrink-0">
                                        <div className="flex flex-col items-center">
                                            <span className={cn(
                                                "text-2xl font-black font-headline tracking-tighter leading-none",
                                                score >= 70 ? "text-emerald-500" : score < 40 ? "text-rose-500" : "text-amber-500"
                                            )}>{score}</span>
                                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Points</span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center border-2 shadow-lg",
                                                rating === 'S' ? "bg-amber-500/10 border-amber-500 text-amber-500" :
                                                rating === 'A' ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" :
                                                rating === 'F' ? "bg-rose-500/10 border-rose-500 text-rose-500" :
                                                "bg-white/5 border-white/10 text-white"
                                            )}>
                                                <span className="font-black text-xl">{rating}</span>
                                            </div>
                                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Tier</span>
                                        </div>
                                    </div>

                                    {/* Admin Controls */}
                                    {isAdmin && (
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex flex-col gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 rounded-lg border-white/5 hover:bg-emerald-500/20 hover:text-emerald-500 transition-all"
                                                    onClick={() => handleUpdateScore(staff, 5)}
                                                    disabled={updatingId === staff.id || score >= 100}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 rounded-lg border-white/5 hover:bg-rose-500/20 hover:text-rose-500 transition-all"
                                                    onClick={() => handleUpdateScore(staff, -5)}
                                                    disabled={updatingId === staff.id || score <= 0}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <select
                                                    className="bg-black/40 border border-white/10 rounded-lg text-[8px] font-black uppercase p-1.5 focus:outline-none focus:ring-1 focus:ring-primary w-24"
                                                    value={status}
                                                    onChange={(e) => handleManualStatus(staff, e.target.value)}
                                                >
                                                    <option value="EXCELLING">Excelling</option>
                                                    <option value="STABLE">Stable</option>
                                                    <option value="NEEDS_IMPROVEMENT">Improving</option>
                                                    <option value="FLAGGED">Flagged</option>
                                                </select>
                                                <div className={cn(
                                                    "text-[7px] font-black uppercase px-2 py-0.5 rounded-full text-center tracking-tighter",
                                                    status === 'EXCELLING' ? "bg-emerald-500/20 text-emerald-500" :
                                                    status === 'FLAGGED' ? "bg-rose-500/20 text-rose-500" :
                                                    "bg-white/10 text-muted-foreground"
                                                )}>
                                                    {status}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

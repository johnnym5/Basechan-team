"use client"

import React, { useMemo } from "react"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import type { UserProfile, Nomination, PerformanceReview } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Star, MessageSquare, ShieldCheck, Target, Zap, Users, Sparkles, Heart, Medal, FileText, TrendingUp, Calendar } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const BADGE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    TEAM_PLAYER: { icon: Users, color: "text-blue-500 bg-blue-500/10", label: "Team Player" },
    PROBLEM_SOLVER: { icon: Zap, color: "text-amber-500 bg-amber-500/10", label: "Problem Solver" },
    INNOVATOR: { icon: Sparkles, color: "text-emerald-500 bg-emerald-500/10", label: "Innovator" },
    RELENTLESS: { icon: Heart, color: "text-rose-500 bg-rose-500/10", label: "Relentless" },
}

const RATING_LABELS: Record<number, string> = {
    1: "Unsatisfactory",
    2: "Needs Improvement",
    3: "Meets Expectations",
    4: "Exceeds Expectations",
}

const RATING_COLORS: Record<number, string> = {
    1: "bg-rose-500",
    2: "bg-amber-500",
    3: "bg-blue-500",
    4: "bg-emerald-500",
}

export function MyAwardsAndReviews({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore()

    // 1. Fetch received nominations
    const nominationsQuery = useMemoFirebase(() =>
        query(
            collection(firestore!, 'nominations'),
            where('orgId', '==', userProfile.orgId),
            where('nomineeId', '==', userProfile.id),
            where('status', '==', 'APPROVED')
        )
    , [firestore, userProfile.id, userProfile.orgId])

    // 2. Fetch formal performance reviews
    const reviewsQuery = useMemoFirebase(() =>
        query(
            collection(firestore!, 'performance_reviews'),
            where('orgId', '==', userProfile.orgId),
            where('userId', '==', userProfile.id),
            orderBy('reviewDate', 'desc')
        )
    , [firestore, userProfile.id, userProfile.orgId])

    const { data: nominations, isLoading: isNominationsLoading } = useCollection<Nomination>(nominationsQuery)
    const { data: reviews, isLoading: isReviewsLoading } = useCollection<PerformanceReview>(reviewsQuery)

    const stats = useMemo(() => {
        if (!nominations) return null
        const badgeCounts = nominations.reduce((acc, n) => {
            acc[n.categoryTitle] = (acc[n.categoryTitle] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        return {
            totalNominations: nominations.length,
            badgeCounts,
            recentFeedback: [...nominations].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
        }
    }, [nominations])

    if (isNominationsLoading || isReviewsLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full rounded-3xl" />
                <Skeleton className="h-96 w-full rounded-3xl" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Identity & Awards Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    <h3 className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Mission Medals
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(stats?.badgeCounts || {}).length === 0 ? (
                            <div className="col-span-full py-12 text-center text-muted-foreground opacity-30 italic text-sm bg-white/5 rounded-3xl border border-dashed border-white/10">
                                No medals earned yet. Keep striving for excellence.
                            </div>
                        ) : (
                            Object.entries(stats?.badgeCounts || {}).map(([title, count]) => {
                                const config = BADGE_CONFIG[title.toUpperCase().replace(/\s+/g, '_')] || { icon: Medal, color: "text-primary bg-primary/10", label: title }
                                const Icon = config.icon
                                return (
                                    <Card key={title} className="apple-glass border-none transition-all hover:bg-white/5">
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className={cn("p-3 rounded-2xl shadow-inner", config.color)}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-widest leading-none">{config.label}</p>
                                                <p className="text-2xl font-black font-mono mt-1">{count}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </div>

                    <Card className="apple-glass border-none">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-primary" />
                                Recent Comms Feedback
                            </CardTitle>
                            <CardDescription>Recognition comments from your fellow units.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats?.recentFeedback.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground opacity-30 italic text-sm">
                                        No peer feedback recorded yet.
                                    </div>
                                ) : (
                                    stats?.recentFeedback.map(n => (
                                        <div key={n.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4">
                                            <div className="shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                                                {n.nominatorName.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm">{n.nominatorName}</span>
                                                        <Badge variant="secondary" className="text-[8px] font-black uppercase bg-primary/10 text-primary border-none px-2">
                                                            {n.categoryTitle}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                        {format(new Date(n.timestamp), 'PP')}
                                                    </span>
                                                </div>
                                                <p className="text-xs italic text-muted-foreground leading-relaxed">"{n.reason}"</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side Info */}
                <div className="lg:col-span-4 space-y-6">
                    <h3 className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Node Authority
                    </h3>
                    <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/20 space-y-4 shadow-xl">
                        <div className="flex items-center gap-3 text-primary mb-2">
                            <Target className="h-5 w-5 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-tighter">Strategic Influence</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-muted-foreground uppercase font-bold italic opacity-80">
                            Awards and nominations are a reflection of your integration within the organizational matrix. High-frequency positive feedback unlocks administrative trust tiers and operational bonuses.
                        </p>
                    </div>

                    <Card className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                            <TrendingUp className="h-24 w-24" />
                        </div>
                        <CardContent className="p-6 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Global Peer Ranking</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-4xl font-black font-mono">TOP 15%</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-2 uppercase font-medium">Based on {stats?.totalNominations} approved nominations</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Formal Performance Reviews Section */}
            <div className="space-y-6 pt-4">
                <h3 className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    Formal Performance Reviews
                </h3>

                {reviews?.length === 0 ? (
                    <Card className="apple-glass border-none">
                        <CardContent className="py-20 text-center text-muted-foreground">
                            <div className="rounded-full bg-secondary/30 p-8 w-fit mx-auto mb-4 opacity-20">
                                <ShieldCheck className="h-12 w-12" />
                            </div>
                            <p className="font-black uppercase text-xs tracking-widest opacity-40">No formal reviews finalized on record.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Accordion type="single" collapsible className="space-y-4 w-full">
                        {reviews?.map((review) => (
                            <AccordionItem key={review.id} value={review.id} className="border-none bg-white/[0.02] rounded-[2rem] overflow-hidden px-2">
                                <AccordionTrigger className="hover:no-underline px-6 py-6 transition-all group">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform shadow-inner">
                                            <Calendar className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg tracking-tight uppercase">{review.cycle} Final Review</h4>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                Conducted by {review.reviewerName} on {format(new Date(review.reviewDate), 'PP')}
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-8 pt-2">
                                    <div className="space-y-10">
                                        {/* Business Targets Grid */}
                                        <div className="space-y-6">
                                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/80 border-b border-white/5 pb-2">Business Target Nodes</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                                {review.businessTargets.map((target, idx) => (
                                                    <MetricBar key={idx} label={target.metricName} value={target.score} />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Interpersonal Skills Grid */}
                                        <div className="space-y-6">
                                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/80 border-b border-white/5 pb-2">Interpersonal Matrix</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                                {review.interpersonalSkills.map((skill, idx) => (
                                                    <MetricBar key={idx} label={skill.skillName} value={skill.score} />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Summaries */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                            <SummaryBox title="Success Areas" content={review.qualitative.successAreas} color="border-emerald-500/20 bg-emerald-500/5" textColor="text-emerald-400" />
                                            <SummaryBox title="Areas for Improvement" content={review.qualitative.areasForImprovement} color="border-rose-500/20 bg-rose-500/5" textColor="text-rose-400" />
                                            <SummaryBox title="Focus for Next Review" content={review.qualitative.focusAreasNextReview} color="border-blue-500/20 bg-blue-500/5" textColor="text-blue-400" />
                                            <SummaryBox title="Overall achievements" content={review.qualitative.overallAchievements} color="border-amber-500/20 bg-amber-500/5" textColor="text-amber-400" />
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </div>
    )
}

function MetricBar({ label, value }: { label: string, value: number }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-tight opacity-70">{label}</span>
                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest text-white shadow-sm", RATING_COLORS[value])}>
                    {RATING_LABELS[value]}
                </span>
            </div>
            <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                    className={cn("absolute h-full left-0 top-0 transition-all duration-1000", RATING_COLORS[value])}
                    style={{ width: `${(value / 4) * 100}%` }}
                />
            </div>
        </div>
    )
}

function SummaryBox({ title, content, color, textColor }: { title: string, content: string, color: string, textColor: string }) {
    return (
        <div className={cn("p-6 rounded-[1.5rem] border space-y-3 shadow-inner", color)}>
            <h6 className={cn("text-[9px] font-black uppercase tracking-[0.2em]", textColor)}>{title}</h6>
            <p className="text-xs font-medium leading-relaxed opacity-80 italic whitespace-pre-wrap">"{content}"</p>
        </div>
    )
}

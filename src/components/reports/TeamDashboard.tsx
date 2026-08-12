"use client"

import React, { useState, useMemo } from "react"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import type { UserProfile, Task, Attendance, Nomination, UserRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    Trophy,
    Users,
    Zap,
    Star,
    AlertTriangle,
    Timer,
    ShieldAlert,
    TrendingUp,
    CheckCircle2,
    CalendarDays
} from "lucide-react"
import {
    startOfWeek,
    startOfMonth,
    startOfYear,
    format,
    isAfter,
    parseISO
} from "date-fns"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ComplianceWatchlist } from "./ComplianceWatchlist"

type Timeframe = 'WEEK' | 'MONTH' | 'YEAR'

export function TeamDashboard({ currentUser }: { currentUser: UserProfile }) {
    const firestore = useFirestore()
    const [timeframe, setTimeframe] = useState<Timeframe>('WEEK')

    const isAdmin = currentUser.role === 'ORG_ADMIN' || currentUser.role === 'MANAGING_DIRECTOR' || currentUser.role === 'HR_MANAGER' || currentUser.role === 'SUPERADMIN'

    // 1. Fetch all data needed for leaderboards
    const usersQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'users'), where('orgId', '==', currentUser.orgId))
    , [firestore, currentUser.orgId])

    const attendanceQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'attendance'), where('orgId', '==', currentUser.orgId))
    , [firestore, currentUser.orgId])

    const tasksQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'tasks'), where('orgId', '==', currentUser.orgId), where('status', '==', 'ARCHIVED'))
    , [firestore, currentUser.orgId])

    const nominationsQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'nominations'), where('orgId', '==', currentUser.orgId), where('status', '==', 'APPROVED'))
    , [firestore, currentUser.orgId])

    const { data: allUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery)
    const { data: allAttendance, isLoading: isAttLoading } = useCollection<Attendance>(attendanceQuery)
    const { data: archivedTasks, isLoading: isTasksLoading } = useCollection<Task>(tasksQuery)
    const { data: nominations, isLoading: isNominationsLoading } = useCollection<Nomination>(nominationsQuery)

    const analytics = useMemo(() => {
        if (!allUsers || !allAttendance || !archivedTasks || !nominations) return null

        const now = new Date()
        let startDate: Date
        switch (timeframe) {
            case 'WEEK': startDate = startOfWeek(now); break
            case 'MONTH': startDate = startOfMonth(now); break
            case 'YEAR': startDate = startOfYear(now); break
        }

        // Filter data by timeframe
        const filteredTasks = archivedTasks.filter(t => isAfter(new Date(t.createdAt), startDate))
        const filteredAttendance = allAttendance.filter(a => isAfter(parseISO(a.date), startDate))
        const filteredNominations = nominations.filter(n => isAfter(new Date(n.timestamp), startDate))

        // Process Rankings
        const rankings = allUsers.map(user => {
            const userTasks = filteredTasks.filter(t => t.assignedTo === user.id).length
            const userKudos = filteredNominations.filter(n => n.nomineeId === user.id).length
            const userAtt = filteredAttendance.filter(a => a.userId === user.id)

            const perfectClockIns = userAtt.filter(a => a.status === 'APPROVED' && !a.remarks?.includes('LATE')).length
            const lateIns = userAtt.filter(a => a.remarks?.includes('LATE')).length
            const earlyOuts = userAtt.filter(a => a.remarks?.includes('UNDERTIME')).length
            const missedOuts = userAtt.filter(a => a.clockIn && !a.clockOut).length

            return {
                id: user.id,
                name: user.fullName,
                tasksCompleted: userTasks,
                kudosReceived: userKudos,
                perfectClockIns,
                lateIns,
                earlyOuts,
                missedOuts
            }
        })

        const taskChampions = [...rankings].sort((a, b) => b.tasksCompleted - a.tasksCompleted).slice(0, 5)
        const peerFavorites = [...rankings].sort((a, b) => b.kudosReceived - a.kudosReceived).slice(0, 5)
        const punctualityPros = [...rankings].sort((a, b) => b.perfectClockIns - a.perfectClockIns).slice(0, 5)
        const watchlist = [...rankings].filter(r => r.lateIns > 0 || r.earlyOuts > 0 || r.missedOuts > 0)
            .sort((a, b) => (b.lateIns + b.earlyOuts + b.missedOuts) - (a.lateIns + a.earlyOuts + a.missedOuts))

        return { taskChampions, peerFavorites, punctualityPros, watchlist }
    }, [allUsers, allAttendance, archivedTasks, nominations, timeframe])

    if (isUsersLoading || isAttLoading || isTasksLoading || isNominationsLoading) {
        return <div className="space-y-8"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-2xl font-black font-headline tracking-tighter uppercase flex items-center gap-3">
                        <TrendingUp className="h-6 w-6 text-primary" /> Team Impact Matrix
                    </h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Live performance analytics & compliance oversight</p>
                </div>
                <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
                    <SelectTrigger className="w-[180px] rounded-xl border-white/10 bg-background/50 backdrop-blur-md">
                        <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                        <SelectValue placeholder="Select Timeframe" />
                    </SelectTrigger>
                    <SelectContent className="apple-glass-darker border-white/10">
                        <SelectItem value="WEEK">This Week</SelectItem>
                        <SelectItem value="MONTH">This Month</SelectItem>
                        <SelectItem value="YEAR">This Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Tabs defaultValue="leaderboards" className="w-full">
                <TabsList className="bg-secondary/20 rounded-2xl p-1 mb-8 w-fit border border-white/5">
                    <TabsTrigger value="leaderboards" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                        <Trophy className="h-3.5 w-3.5 mr-2 text-amber-500" /> Positive Leaderboards
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="compliance" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                            <ShieldAlert className="h-3.5 w-3.5 mr-2 text-rose-500" /> Compliance Watchlist
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="leaderboards" className="m-0 space-y-8 focus-visible:ring-0 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <RankingCard
                            title="Task Champions"
                            description="Highest volume of finalized missions"
                            icon={Zap}
                            color="text-emerald-500"
                            data={analytics?.taskChampions || []}
                            valueKey="tasksCompleted"
                            valueLabel="Missions"
                        />
                        <RankingCard
                            title="Peer Favorites"
                            description="Most approved kudos received"
                            icon={Star}
                            color="text-amber-500"
                            data={analytics?.peerFavorites || []}
                            valueKey="kudosReceived"
                            valueLabel="Awards"
                        />
                        <RankingCard
                            title="Punctuality Pros"
                            description="Most perfect operational entries"
                            icon={CheckCircle2}
                            color="text-blue-500"
                            data={analytics?.punctualityPros || []}
                            valueKey="perfectClockIns"
                            valueLabel="Shifts"
                        />
                    </div>
                </TabsContent>

                {isAdmin && (
                    <TabsContent value="compliance" className="m-0 focus-visible:ring-0 outline-none animate-in slide-in-from-right-4 duration-500">
                        {allUsers && allAttendance && (
                            <ComplianceWatchlist staffList={allUsers} attendanceData={allAttendance} />
                        )}
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}

function RankingCard({ title, description, icon: Icon, color, data, valueKey, valueLabel }: any) {
    return (
        <Card className="apple-glass border-none shadow-xl overflow-hidden flex flex-col">
            <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl bg-background/50 shadow-inner", color)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-tight">{title}</CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase opacity-50 tracking-tighter">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <div className="divide-y divide-white/5">
                    {data.map((user: any, idx: number) => (
                        <div key={user.id} className="flex items-center justify-between p-4 group hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "text-xs font-black w-5 text-center",
                                    idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-600" : "text-muted-foreground opacity-30"
                                )}>
                                    {idx + 1}
                                </span>
                                <span className="text-sm font-bold truncate max-w-[120px]">{user.name}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={cn("text-lg font-black font-mono leading-none", color)}>{user[valueKey]}</span>
                                <span className="text-[8px] font-black uppercase opacity-40">{valueLabel}</span>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground opacity-20 italic text-xs uppercase font-black tracking-widest">
                            Scanning Data...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

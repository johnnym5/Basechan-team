"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trophy, Star, Send, Zap, Users, Heart, Crown, ChevronRight, FileSearch } from "lucide-react"
import type { UserProfile, Nomination } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, isSameMonth, isToday, parseISO, subMonths, startOfMonth, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isAfter, endOfMonth } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { type TimeFilterState } from "@/components/shared/AdvancedTimeFilter"
import { PerformanceReviewBuilder } from "../performance/PerformanceReviewBuilder"
import { PerformanceReviewList } from "../performance/PerformanceReviewList"
import { PeerNominationForm } from "../recognition/PeerNominationForm"

const medalIcons: Record<string, React.ReactNode> = {
  "TEAM_PLAYER": <Users className="w-5 h-5 text-blue-500" />,
  "INNOVATOR": <Zap className="w-5 h-5 text-yellow-500" />,
  "PROBLEM_SOLVER": <Star className="w-5 h-5 text-purple-500" />,
  "RELENTLESS": <Heart className="w-5 h-5 text-red-500" />,
  "DEFAULT": <Trophy className="w-5 h-5 text-primary" />
}

interface RecognitionCultureViewProps {
    timeFilter: TimeFilterState;
    staffList: UserProfile[];
    nominations: Nomination[];
    currentUser: UserProfile;
    onSubmitNomination: (payload: any) => void;
    selectedStaffIds: string[];
}

export function RecognitionCultureView({
    timeFilter,
    staffList,
    nominations,
    currentUser,
    onSubmitNomination,
    selectedStaffIds
}: RecognitionCultureViewProps) {

  const [activeTab, setActiveTab] = useState("leaderboard")
  const [nomineeId, setNomineeId] = useState("")
  const [category, setCategory] = useState("")
  const [reason, setReason] = useState("")

  const filterInterval = useMemo(() => {
    let startDate: Date
    let endDate: Date

    if (timeFilter.mode === 'MONTH') {
      startDate = startOfMonth(timeFilter.referenceDate)
      endDate = endOfMonth(timeFilter.referenceDate)
    } else if (timeFilter.mode === 'WEEK') {
      const monthStart = startOfMonth(timeFilter.referenceDate)
      startDate = addDays(monthStart, (timeFilter.weekIndex! - 1) * 7)
      endDate = endOfDay(addDays(startDate, 6))
      if (isAfter(endDate, endOfMonth(timeFilter.referenceDate))) {
        endDate = endOfMonth(timeFilter.referenceDate)
      }
    } else {
      startDate = startOfDay(timeFilter.referenceDate)
      endDate = endOfDay(timeFilter.referenceDate)
    }

    return { start: startOfDay(startDate), end: endOfDay(endDate) }
  }, [timeFilter])

  const leaderboardData = useMemo(() => {
    const filteredStaff = staffList.filter(s => selectedStaffIds.includes(s.id))
    const periodNominations = nominations.filter(n =>
        n.status === 'APPROVED' &&
        isWithinInterval(parseISO(n.timestamp), filterInterval)
    )

    return filteredStaff.map(staff => {
      const staffAwards = periodNominations.filter(n => n.nomineeId === staff.id)
      return {
        id: staff.id,
        name: staff.fullName,
        points: staffAwards.length,
        totalPoints: nominations.filter(n => n.nomineeId === staff.id && n.status === 'APPROVED').length
      }
    }).sort((a, b) => b.points - a.points)
  }, [staffList, nominations, filterInterval, selectedStaffIds])

  const recentNominations = useMemo(() => {
    return nominations
        .filter(n => isWithinInterval(parseISO(n.timestamp), filterInterval))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [nominations, filterInterval])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomineeId || !category || !reason) return;

    const selectedStaff = staffList.find(s => s.id === nomineeId)
    const categoryTitle = category.replace('_', ' ')

    onSubmitNomination({
      nominatorId: currentUser?.id,
      nominatorName: currentUser?.fullName,
      date: new Date().toISOString(),
      nominations: [
        {
          nomineeId,
          nomineeName: selectedStaff?.fullName || "Unknown",
          categoryId: category,
          categoryTitle: categoryTitle,
          reason: reason,
        }
      ]
    })

    setNomineeId("")
    setCategory("")
    setReason("")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-500">

      {/* LEFT: LEADERBOARD & FEED */}
      <Card className="lg:col-span-7 apple-glass border-none shadow-2xl h-[700px] flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
            <CardHeader className="border-b border-white/5 pb-4 bg-white/5 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-8 pt-6">
                <div>
                    <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-primary" /> Cultural Pulse
                    </CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-widest opacity-60">Recognition and reward metrics</CardDescription>
                </div>
                <TabsList className="bg-background/40 border border-white/5 p-1 rounded-xl">
                    <TabsTrigger value="leaderboard" className="text-[10px] font-black uppercase tracking-widest px-4 data-[state=active]:bg-primary">Leaderboard</TabsTrigger>
                    <TabsTrigger value="feed" className="text-[10px] font-black uppercase tracking-widest px-4 data-[state=active]:bg-primary">Live Feed</TabsTrigger>
                    <TabsTrigger value="nominate" className="text-[10px] font-black uppercase tracking-widest px-4 data-[state=active]:bg-primary">Nominate Teammates</TabsTrigger>
                    {(!['STAFF'].includes(currentUser.role)) && (
                        <TabsTrigger value="builder" className="text-[10px] font-black uppercase tracking-widest px-4 data-[state=active]:bg-primary">Builder</TabsTrigger>
                    )}
                    <TabsTrigger value="archives" className="text-[10px] font-black uppercase tracking-widest px-4 data-[state=active]:bg-primary">Archives</TabsTrigger>
                </TabsList>
            </CardHeader>

            <CardContent className="p-0 overflow-hidden flex-1 relative bg-black/10">
                <TabsContent value="leaderboard" className="m-0 h-full flex flex-col">
                    {/* ... (Existing Leaderboard code) */}
                    {/* ... Existing Leaderboard table ... */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-secondary sticky top-0 z-20 backdrop-blur-md">
                                <tr className="border-b border-white/5">
                                    <th className="px-8 py-4 font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Rank & Personnel</th>
                                    <th className="px-8 py-4 text-center font-black uppercase text-[10px] tracking-[0.2em] text-primary">Period Points</th>
                                    <th className="px-8 py-4 text-right font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">All-Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {leaderboardData.map((staff, idx) => (
                                    <tr key={staff.id} className="hover:bg-white/5 transition-all group h-16">
                                        <td className="px-8 py-4 flex items-center gap-4">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner",
                                                idx === 0 ? 'bg-yellow-500 text-black' : idx < 3 ? 'bg-primary text-white' : 'bg-secondary/30 text-muted-foreground'
                                            )}>
                                                {idx === 0 ? <Crown className="w-4 h-4" /> : idx + 1}
                                            </div>
                                            <span className="font-bold text-sm text-white uppercase truncate">{staff.name}</span>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <span className="text-xl font-black font-mono text-primary group-hover:scale-110 transition-transform inline-block">
                                                {staff.points}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className="text-xs font-mono font-bold text-muted-foreground opacity-60">
                                                {staff.totalPoints} PTS
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                <TabsContent value="feed" className="m-0 h-full overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {/* ... Existing Feed content ... */}
                    {recentNominations.length === 0 ? (
                        <div className="py-20 text-center opacity-20 flex flex-col items-center justify-center h-full">
                            <Send className="w-12 h-12 mb-4" />
                            <p className="font-black uppercase text-[10px] tracking-[0.3em]">No recognition logged in this period.</p>
                        </div>
                    ) : (
                        recentNominations.map(award => (
                            <div key={award.id} className="p-4 rounded-2xl border border-white/5 bg-card/40 hover:border-primary/30 transition-all group">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-secondary/30 flex items-center justify-center shadow-inner">
                                            {medalIcons[award.categoryId] || medalIcons["DEFAULT"]}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{award.categoryTitle}</p>
                                            <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">{format(new Date(award.timestamp), 'MMM dd, HH:mm')}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[8px] font-black uppercase bg-primary/5 text-primary border-primary/20">CONFIRMED</Badge>
                                </div>
                                <p className="text-xs font-bold leading-relaxed text-white italic">"{award.reason}"</p>
                                <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
                                        <span className="opacity-40">To:</span> <span className="text-white">{award.nomineeName}</span>
                                    </p>
                                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
                                        <span className="opacity-40">From:</span> <span className="text-white/60">{award.nominatorName}</span>
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="nominate" className="m-0 h-full overflow-y-auto p-8 custom-scrollbar">
                    <PeerNominationForm currentUser={currentUser} staffList={staffList.map(s => ({ id: s.id, name: s.fullName }))} />
                </TabsContent>

                <TabsContent value="builder" className="m-0 h-full overflow-y-auto p-0 custom-scrollbar">
                    <div className="p-8">
                        <PerformanceReviewBuilder userProfile={currentUser} staffList={staffList} />
                    </div>
                </TabsContent>

                <TabsContent value="archives" className="m-0 h-full overflow-y-auto p-8 custom-scrollbar">
                    <PerformanceReviewList userProfile={currentUser} isAdmin={!['STAFF'].includes(currentUser.role)} />
                </TabsContent>
            </CardContent>
        </Tabs>
      </Card>

      {/* RIGHT: NOMINATION STATION */}
      <Card className="lg:col-span-5 apple-glass border-none shadow-2xl h-[700px] flex flex-col overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-6 bg-primary/5 shrink-0 px-8 pt-6">
            <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2 text-primary">
                <Send className="w-6 h-6" /> Nomination Station
            </CardTitle>
            <CardDescription className="text-[9px] font-bold uppercase tracking-widest opacity-60">Authorize recognition for exceptional performance.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 flex-1 bg-black/5">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 ml-1">Select Teammate</label>
                    <Select value={nomineeId} onValueChange={setNomineeId}>
                        <SelectTrigger className="h-12 rounded-xl bg-background/50 border-white/10 text-xs font-bold uppercase tracking-tight"><SelectValue placeholder="Identify Personnel..." /></SelectTrigger>
                        <SelectContent className="apple-glass-darker border-none">
                            {staffList.filter(s => s.id !== currentUser.id).map(staff => (
                                <SelectItem key={staff.id} value={staff.id} className="text-xs font-bold uppercase p-3">{staff.fullName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 ml-1">Medal Category</label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-12 rounded-xl bg-background/50 border-white/10 text-xs font-bold uppercase tracking-tight"><SelectValue placeholder="Select Achievement..." /></SelectTrigger>
                        <SelectContent className="apple-glass-darker border-none">
                            <SelectItem value="TEAM_PLAYER" className="text-xs font-bold uppercase p-3">Team Player (Support)</SelectItem>
                            <SelectItem value="INNOVATOR" className="text-xs font-bold uppercase p-3">Innovator (Process)</SelectItem>
                            <SelectItem value="PROBLEM_SOLVER" className="text-xs font-bold uppercase p-3">Problem Solver (Blockers)</SelectItem>
                            <SelectItem value="RELENTLESS" className="text-xs font-bold uppercase p-3">Relentless (Consistency)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 ml-1">Mission Justification</label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Provide context for this recognition..."
                        className="min-h-[180px] rounded-2xl bg-background/50 border-white/10 text-sm font-medium leading-relaxed resize-none p-4 focus:border-primary/50 transition-all"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={!nomineeId || !category || !reason}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 group overflow-hidden relative mt-4"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative flex items-center gap-2">
                        <Zap className="w-4 h-4 fill-current" />
                        Dispatch Nomination
                    </span>
                </Button>
            </form>
        </CardContent>
      </Card>

    </div>
  )
}

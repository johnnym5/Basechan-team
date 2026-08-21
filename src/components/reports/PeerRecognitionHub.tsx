"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trophy, Star, Send, Zap, Users, Heart, Crown, Globe, MessageSquare, ShieldCheck, ChevronRight } from "lucide-react"
import type { UserProfile, Nomination } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, isSameMonth, isToday, parseISO, subMonths, startOfMonth } from "date-fns"
import { Badge } from "@/components/ui/badge"

// Medal Icons mapping based on categoryId
const medalIcons: Record<string, React.ReactNode> = {
  "TEAM_PLAYER": <Users className="w-5 h-5 text-blue-500" />,
  "INNOVATOR": <Zap className="w-5 h-5 text-yellow-500" />,
  "PROBLEM_SOLVER": <Star className="w-5 h-5 text-purple-500" />,
  "RELENTLESS": <Heart className="w-5 h-5 text-red-500" />,
  "DEFAULT": <Trophy className="w-5 h-5 text-primary" />
}

interface PeerRecognitionHubProps {
    currentUser: UserProfile;
    staffList: { id: string; name: string }[];
    recognitionData: Nomination[];
    onSubmitNomination: (payload: any) => void;
}

export function PeerRecognitionHub({
    currentUser,
    staffList = [],
    recognitionData = [],
    onSubmitNomination
}: PeerRecognitionHubProps) {

  // --- LEADERBOARD STATE ---
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()).toISOString())
  const [optimisticNominationId, setOptimisticNominationId] = useState<string | null>(null)

  // Form State
  const [nomineeId, setNomineeId] = useState("")
  const [category, setCategory] = useState("")
  const [reason, setReason] = useState("")

  // --- DATA ENGINE ---

  // 1. Month Selector Data
  const availableMonths = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(new Date(), i)
        return {
            label: format(d, 'MMMM yyyy'),
            value: startOfMonth(d).toISOString()
        }
    })
  }, [])

  // 2. My Awards (Approved only)
  const myAwards = useMemo(() =>
    recognitionData.filter(award => award.nomineeId === currentUser?.id && award.status === 'APPROVED')
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  [recognitionData, currentUser])

  // 4. Enhanced Leaderboard Logic
  const leaderboardData = useMemo(() => {
    const targetMonth = parseISO(selectedMonth)
    // We count APPROVED awards, plus our own local optimistic one if applicable
    const baseData = recognitionData.filter(award => award.status === 'APPROVED');

    const aggregated = staffList.map(staff => {
      // Find all awards received by this staff
      const staffAwards = baseData.filter(log => log.nomineeId === staff.id)

      // Filter for this specific month
      let monthlyPoints = staffAwards.filter(log => isSameMonth(new Date(log.timestamp), targetMonth)).length
      let totalPoints = staffAwards.length

      // Apply optimistic update for the person just liked
      if (optimisticNominationId === staff.id && isSameMonth(new Date(), targetMonth)) {
          monthlyPoints += 1
          totalPoints += 1
      }

      return {
        id: staff.id,
        name: staff.name,
        totalPoints,
        monthlyPoints
      }
    })

    // Sort by monthly points for the "Employee of the Month" race
    return aggregated.sort((a, b) => b.monthlyPoints - a.monthlyPoints)
  }, [staffList, recognitionData, selectedMonth, optimisticNominationId])

  // 5. Nomination Daily Limit Logic
  // Check if current user sent an award today (any status counts towards limit)
  const hasNominatedToday = useMemo(() => {
    return !!optimisticNominationId || recognitionData.some(log =>
      log.nominatorId === currentUser?.id && isToday(new Date(log.timestamp))
    )
  }, [recognitionData, currentUser, optimisticNominationId])

  const eligibleTeammates = useMemo(() =>
    staffList.filter(staff => staff.id !== currentUser?.id),
  [staffList, currentUser])

  const handleQuickVote = (staffId: string, staffName: string) => {
    if (hasNominatedToday) return;

    // Optimistically hide/update
    setOptimisticNominationId(staffId)

    onSubmitNomination({
      nominatorId: currentUser?.id,
      nominatorName: currentUser?.fullName,
      date: new Date().toISOString(),
      nominations: [
        {
          nomineeId: staffId,
          nomineeName: staffName,
          categoryId: "TEAM_PLAYER",
          categoryTitle: "Team Player",
          reason: "Quick tactical vote for exceptional daily contribution.",
          status: "APPROVED"
        }
      ]
    })
  }

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
          nomineeName: selectedStaff?.name || "Unknown",
          categoryId: category,
          categoryTitle: categoryTitle,
          reason: reason,
        }
      ]
    })

    // Reset form
    setNomineeId("")
    setCategory("")
    setReason("")
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-700">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT: RECOGNITION HUB (Span 7) */}
        <Card className="lg:col-span-7 apple-glass border-none shadow-2xl h-[650px] flex flex-col overflow-hidden">
          <Tabs defaultValue="my_trophies" className="flex flex-col h-full w-full">

            <CardHeader className="border-b border-white/5 pb-4 bg-white/5 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-8">
              <div>
                <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-primary" /> Recognition Center
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verified accolades and organizational feed.</CardDescription>
              </div>
              <TabsList className="bg-background/40 border border-white/5 p-1 rounded-xl">
                <TabsTrigger value="my_trophies" className="text-[10px] font-black uppercase tracking-widest px-4 data-[state=active]:bg-primary data-[state=active]:text-white">My Trophies</TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-[10px] font-black uppercase tracking-widest px-4 data-[state=active]:bg-primary data-[state=active]:text-white">Leaderboard</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-0 overflow-hidden flex-1 relative bg-black/10">

              {/* TAB 1: MY TROPHIES */}
              <TabsContent value="my_trophies" className="m-0 h-full overflow-y-auto p-0 custom-scrollbar">
                {myAwards.length === 0 ? (
                  <div className="text-center p-20 opacity-20 flex flex-col items-center justify-center h-full">
                    <Trophy className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase text-xs tracking-widest">No medals earned yet. Keep striving!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {myAwards.map(award => (
                      <AwardCard key={award.id} award={award} isMine={true} />
                    ))}
                  </div>
                )}
              </TabsContent>


              {/* TAB 3: MONTHLY LEADERBOARD */}
              <TabsContent value="leaderboard" className="m-0 h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Monthly Standing</span>
                    </div>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px] h-9 rounded-xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="apple-glass-darker border-none">
                            {availableMonths.map(m => (
                                <SelectItem key={m.value} value={m.value} className="text-[10px] font-bold uppercase p-3">{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-secondary sticky top-0 z-20 backdrop-blur-md">
                        <tr className="border-b border-white/5">
                        <th className="px-8 py-4 font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Rank & Personnel</th>
                        <th className="px-8 py-4 text-center font-black uppercase text-[10px] tracking-[0.2em] text-primary">Monthly Points</th>
                        <th className="px-8 py-4 text-center font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">All-Time</th>
                        <th className="px-8 py-4 text-right font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {leaderboardData.map((staff, idx) => (
                        <tr key={staff.id} className="hover:bg-white/5 transition-all group h-16">
                            <td className="px-8 py-4 flex items-center gap-4">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner",
                                idx === 0 ? 'bg-yellow-500 text-black' :
                                idx < 3 ? 'bg-primary text-primary-foreground' :
                                'bg-secondary/30 text-muted-foreground border border-white/5'
                            )}>
                                {idx === 0 ? <Crown className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span className="font-bold text-sm text-white uppercase tracking-tight truncate">
                                {staff.name} {staff.id === currentUser?.id && <span className="text-primary font-black ml-1">(YOU)</span>}
                            </span>
                            </td>
                            <td className="px-8 py-4 text-center">
                                <span className="text-xl font-black font-mono text-primary group-hover:scale-110 transition-transform inline-block">
                                    {staff.monthlyPoints}
                                </span>
                            </td>
                            <td className="px-8 py-4 text-center">
                                <span className="text-xs font-mono font-bold text-muted-foreground opacity-60">
                                    {staff.totalPoints} PTS
                                </span>
                            </td>
                            <td className="px-8 py-4 text-right">
                                {staff.id !== currentUser?.id && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={hasNominatedToday}
                                        onClick={() => handleQuickVote(staff.id, staff.name)}
                                        className={cn(
                                            "h-10 w-10 rounded-xl transition-all",
                                            hasNominatedToday
                                                ? "opacity-20 grayscale cursor-not-allowed"
                                                : "hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground group-hover:scale-110 active:scale-95"
                                        )}
                                        title={hasNominatedToday ? "Daily star already used" : "Daily Recognition Vote"}
                                    >
                                        <Heart className={cn("w-5 h-5", !hasNominatedToday && "group-hover:fill-rose-500")} />
                                    </Button>
                                )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
              </TabsContent>

            </CardContent>
          </Tabs>
        </Card>

        {/* RIGHT: NOMINATION STATION (Span 5) */}
        <Card className="lg:col-span-5 apple-glass border-none shadow-2xl h-full flex flex-col overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-6 bg-primary/5 shrink-0 px-8">
            <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2 text-primary">
              <Send className="w-6 h-6" /> Nomination Station
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Authorize recognition for exceptional performance.</CardDescription>
          </CardHeader>

          <CardContent className="p-8 flex-1 bg-black/5 flex flex-col">
            {hasNominatedToday ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center border border-dashed border-primary/30 rounded-3xl bg-primary/5 space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="p-6 bg-primary/20 rounded-full shadow-2xl">
                        <Star className="w-12 h-12 text-primary fill-current animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-black text-2xl uppercase tracking-tighter text-white">Daily Star Dispatched!</h3>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-xs mx-auto italic">
                            You've exhausted your recognition quota for today. Your teammate appreciates the tactical boost! Come back tomorrow to honor another colleague.
                        </p>
                    </div>
                    <div className="h-px w-20 bg-white/10" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary opacity-60">Limit: 1 Star Per 24h Cycle</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 ml-1">Select Teammate</label>
                        <Select value={nomineeId} onValueChange={setNomineeId}>
                        <SelectTrigger className="h-12 rounded-xl bg-background/50 border-white/10 text-xs font-bold uppercase tracking-tight"><SelectValue placeholder="Identify Personnel..." /></SelectTrigger>
                        <SelectContent className="apple-glass-darker border-none">
                            {eligibleTeammates.map(staff => (
                                <SelectItem key={staff.id} value={staff.id} className="text-xs font-bold uppercase p-3">{staff.name}</SelectItem>
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
                        className="min-h-[150px] rounded-2xl bg-background/50 border-white/10 text-sm font-medium leading-relaxed resize-none p-4 focus:border-primary/50 transition-all"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={!nomineeId || !category || !reason}
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative flex items-center gap-2">
                            <Zap className="w-4 h-4 fill-current" />
                            Dispatch Nomination
                        </span>
                    </Button>
                </form>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

// Reusable Sub-component for rendering an Award
function AwardCard({ award, isMine }: { award: Nomination; isMine: boolean }) {
  return (
    <div className={cn(
        "p-6 flex gap-6 transition-all group",
        isMine ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-white/5"
    )}>
      <div className="shrink-0 h-14 w-14 rounded-2xl bg-secondary/30 border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
        {medalIcons[award.categoryId] || medalIcons["DEFAULT"]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-black text-sm uppercase tracking-tight text-white">{award.categoryTitle}</h4>
          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">{format(new Date(award.timestamp), 'MMM dd, yyyy')}</span>
        </div>
        <p className="text-sm font-medium text-foreground/80 leading-relaxed italic">"{award.reason}"</p>

        <div className="mt-4 flex justify-between items-center border-t border-white/5 pt-3">
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
            <span className="opacity-40">From:</span>
            <span className="text-foreground">{award.nominatorName}</span>
          </p>
          {!isMine && (
             <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
               <span className="opacity-40">To:</span>
               <span className="text-primary font-bold">{award.nomineeName}</span>
             </p>
          )}
        </div>
      </div>
    </div>
  )
}

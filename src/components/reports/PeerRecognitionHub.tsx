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
import { format } from "date-fns"
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

  // Form State
  const [nomineeId, setNomineeId] = useState("")
  const [category, setCategory] = useState("")
  const [reason, setReason] = useState("")

  // --- DATA ENGINE ---

  // 1. My Awards (Approved only)
  const myAwards = useMemo(() =>
    recognitionData.filter(award => award.nomineeId === currentUser?.id && award.status === 'APPROVED')
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  [recognitionData, currentUser])

  // 2. Company Feed (All approved nominations)
  const companyFeed = useMemo(() =>
    recognitionData.filter(award => award.status === 'APPROVED')
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  [recognitionData])

  // 3. Leaderboard (Top 10 based on approved kudos)
  const leaderboard = useMemo(() => {
    const approvedData = recognitionData.filter(award => award.status === 'APPROVED');
    const counts = approvedData.reduce((acc, award) => {
      acc[award.nomineeId] = (acc[award.nomineeId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([id, count]) => ({
        staff: staffList.find(s => s.id === id) || { id, name: 'Unknown Personnel' },
        kudos: count
      }))
      .sort((a, b) => b.kudos - a.kudos)
      .slice(0, 10);
  }, [recognitionData, staffList])

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
                <TabsTrigger value="company_feed" className="text-[10px] font-black uppercase tracking-widest px-4 data-[state=active]:bg-primary data-[state=active]:text-white">Live Feed</TabsTrigger>
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

              {/* TAB 2: COMPANY FEED */}
              <TabsContent value="company_feed" className="m-0 h-full overflow-y-auto p-0 custom-scrollbar">
                {companyFeed.length === 0 ? (
                  <div className="text-center p-20 opacity-20 flex flex-col items-center justify-center h-full">
                    <Globe className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase text-xs tracking-widest">Feed is quiet. Be the first to nominate!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {companyFeed.map(award => (
                      <AwardCard key={award.id} award={award} isMine={award.nomineeId === currentUser?.id} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: LEADERBOARD */}
              <TabsContent value="leaderboard" className="m-0 h-full overflow-y-auto p-0 custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-secondary sticky top-0 z-20 backdrop-blur-md">
                    <tr className="border-b border-white/5">
                      <th className="px-8 py-4 font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Rank & Personnel</th>
                      <th className="px-8 py-4 text-right font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground">Total Kudos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leaderboard.map((user, idx) => (
                      <tr key={user.staff.id} className="hover:bg-white/5 transition-all group h-16">
                        <td className="px-8 py-4 flex items-center gap-4">
                          <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner",
                              idx === 0 ? 'bg-yellow-500 text-black' :
                              idx < 3 ? 'bg-primary text-primary-foreground' :
                              'bg-secondary/30 text-muted-foreground border border-white/5'
                          )}>
                            {idx === 0 ? <Crown className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span className="font-bold text-sm text-white uppercase tracking-tight">
                              {user.staff.name} {user.staff.id === currentUser?.id && <span className="text-primary font-black ml-1">(YOU)</span>}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                            <span className="text-xl font-black font-mono text-primary group-hover:scale-110 transition-transform inline-block">
                                {user.kudos}
                            </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

          <CardContent className="p-8 flex-1 bg-black/5">
            <form onSubmit={handleSubmit} className="space-y-6">

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 ml-1">Select Teammate</label>
                <Select value={nomineeId} onValueChange={setNomineeId}>
                  <SelectTrigger className="h-12 rounded-xl bg-background/50 border-white/10 text-xs font-bold uppercase tracking-tight"><SelectValue placeholder="Identify Personnel..." /></SelectTrigger>
                  <SelectContent className="apple-glass-darker border-none">
                    {staffList.filter(s => s.id !== currentUser?.id).map(staff => (
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

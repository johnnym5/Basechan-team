"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Award, Users, Zap, Star, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UserProfile, Nomination } from "@/lib/types"
import { format } from "date-fns"

const medalIcons: Record<string, React.ReactNode> = {
  "TEAM_PLAYER": <Users className="w-5 h-5 text-blue-500" />,
  "INNOVATOR": <Zap className="w-5 h-5 text-yellow-500" />,
  "PROBLEM_SOLVER": <Star className="w-5 h-5 text-purple-500" />,
  "RELENTLESS": <Heart className="w-5 h-5 text-red-500" />,
  "DEFAULT": <Trophy className="w-5 h-5 text-primary" />
}

interface MyTrophiesProps {
    currentUser: UserProfile;
    recognitionLogs: Nomination[];
}

export function MyTrophies({ currentUser, recognitionLogs }: MyTrophiesProps) {
  const myAwards = recognitionLogs.filter(n => n.nomineeId === currentUser.id && n.status === 'APPROVED');

  return (
    <Card className="apple-glass border-none shadow-2xl flex flex-col overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4 shrink-0 bg-white/5 px-8 pt-5 flex flex-row justify-between items-center">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                <Award className="w-4 h-4" /> My Trophy Cabinet
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/10 min-h-[200px]">
            <div className="divide-y divide-white/5">
                {myAwards.length === 0 ? (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center justify-center">
                        <Trophy className="w-12 h-12 mb-4" />
                        <p className="font-black uppercase text-[10px] tracking-[0.3em]">No medals earned yet.</p>
                    </div>
                ) : myAwards.map(award => (
                    <div key={award.id} className="p-5 flex gap-4 hover:bg-white/5 transition-all group">
                        <div className="shrink-0 h-12 w-12 rounded-xl bg-secondary/30 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {medalIcons[award.categoryId] || medalIcons["DEFAULT"]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-black text-[10px] uppercase tracking-tight text-white">{award.categoryTitle}</h4>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">{format(new Date(award.timestamp), 'MMM dd')}</span>
                            </div>
                            <p className="text-[11px] font-medium text-foreground/80 leading-relaxed italic line-clamp-2">"{award.reason}"</p>
                            <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-2">
                                <span className="opacity-40">From:</span> <span className="text-foreground">{award.nominatorName}</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  )
}

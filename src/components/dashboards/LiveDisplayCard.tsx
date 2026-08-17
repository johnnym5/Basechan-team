"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreVertical, Edit2, Trash2, PauseCircle, PlayCircle, Radio } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

// Tactical Live Display Data Model
export type LiveDisplay = {
  id: string
  userId: string
  userName: string
  content: string
  visibility: 'ALL' | 'INDIVIDUAL'
  status: 'ACTIVE' | 'PAUSED'
  createdAt: string
}

interface LiveDisplayCardProps {
    display: LiveDisplay;
    currentUser: UserProfile | null;
    onAction?: (action: string, displayId: string) => void;
}

/**
 * Intelligent Live Display Card with RBAC-protected actions.
 * Centralizes organizational broadcasts and personnel messaging.
 */
export function LiveDisplayCard({ display, currentUser, onAction }: LiveDisplayCardProps) {
  // --- STRICT RBAC LOGIC ---
  const isOwner = currentUser?.id === display.userId
  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'MANAGING_DIRECTOR'

  const canEdit = isOwner
  const canDelete = isOwner || isAdmin
  const canPause = isAdmin

  const isPaused = display.status === 'PAUSED'

  const handleAction = (action: string) => {
    if (onAction) {
        onAction(action, display.id);
    } else {
        console.log(`[RBAC System] Executing ${action} on display ${display.id}`);
    }
  }

  return (
    <Card className={`relative overflow-hidden transition-all duration-500 rounded-2xl shadow-xl ${isPaused ? 'opacity-60 bg-secondary/10 grayscale' : 'bg-card border-white/5 hover:border-primary/30 group'}`}>

      <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-colors ${isPaused ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}`}>
            <Radio className={cn("w-4 h-4", !isPaused && "animate-pulse")} />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-black uppercase tracking-tight truncate">{display.userName}</CardTitle>
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
              {display.visibility === 'ALL' ? 'Company Broadcast' : 'Direct Target'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {/* STATUS BADGE */}
            {isPaused && (
                <Badge variant="destructive" className="text-[8px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-500 border-none px-2 py-0.5">
                    Paused by Admin
                </Badge>
            )}

            {/* RBAC ACTION MENU */}
            {(canEdit || canDelete || canPause) && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-secondary transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 apple-glass-darker border-white/5 shadow-2xl rounded-2xl p-1.5 z-[1000]">

                  {canEdit && !isPaused && (
                    <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); handleAction('EDIT'); }}
                        className="flex items-center px-3 py-2.5 text-xs font-bold rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-3 opacity-40" /> Edit Display
                    </DropdownMenuItem>
                  )}

                  {canPause && (
                    <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); handleAction(isPaused ? 'RESUME' : 'PAUSE'); }}
                        className={cn(
                            "flex items-center px-3 py-2.5 text-xs font-bold rounded-xl transition-colors",
                            isPaused ? "text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10" : "text-orange-500 focus:text-orange-500 focus:bg-orange-500/10"
                        )}
                    >
                      {isPaused ? <PlayCircle className="w-4 h-4 mr-3" /> : <PauseCircle className="w-4 h-4 mr-3" />}
                      {isPaused ? 'Resume Display' : 'Pause Display'}
                    </DropdownMenuItem>
                  )}

                  {canDelete && (
                    <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); handleAction('DELETE'); }}
                        className="flex items-center px-3 py-2.5 text-xs font-bold text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-3" /> Delete Permanent
                    </DropdownMenuItem>
                  )}

                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2">
        <div className="p-5 rounded-2xl bg-black/20 border border-white/5 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 rounded-full" />
            <p className={cn(
                "text-sm font-medium leading-relaxed",
                isPaused ? 'line-through text-muted-foreground opacity-40' : 'text-foreground'
            )}>
              {display.content}
            </p>
        </div>
        <div className="mt-4 flex items-center justify-between opacity-30">
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">{display.id.slice(0,8)}</span>
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">{format(new Date(display.createdAt), 'HH:mm:ss')}</span>
        </div>
      </CardContent>
    </Card>
  )
}

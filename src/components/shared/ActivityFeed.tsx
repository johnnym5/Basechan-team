'use client'

import { useState, useRef, useEffect } from 'react'
import type { ActivityEntry, UserProfile } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, MessageSquare, History, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn, sanitizeInput } from '@/lib/utils'

interface ActivityFeedProps {
  activity: ActivityEntry[]
  currentUserProfile: UserProfile
  onAddComment: (commentText: string) => void
  isLoading: boolean
}

export function ActivityFeed({
  activity,
  currentUserProfile,
  onAddComment,
  isLoading,
}: ActivityFeedProps) {
  const [newComment, setNewComment] = useState('')
  const [showAll, setShowAll] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'auto',
      })
    }
  }, [activity, showAll])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    onAddComment(sanitizeInput(newComment))
    setNewComment('')
  }

  const hasHiddenActivity = (activity?.length || 0) > 5 && !showAll
  const displayedActivity = hasHiddenActivity ? activity.slice(-5) : (activity || [])

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {hasHiddenActivity && (
              <div className="flex justify-center pb-4 border-b border-dashed border-white/5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAll(true)}
                    className="rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all"
                  >
                      <ChevronDown className="h-3 w-3 mr-2" />
                      Show Full Audit History ({activity.length - 5} older events)
                  </Button>
              </div>
          )}
          {displayedActivity.map((entry, index) => {
             return (
            <div key={index} className="flex items-start gap-3 animate-slide-up-fade" style={{ animationDelay: `${index * 50}ms` }}>
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="text-[10px] font-bold">
                  {entry.actorName
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{entry.actorName}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                    {formatDistanceToNow(new Date(entry.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div
                  className={cn(
                    'mt-1 rounded-2xl p-2.5 text-sm shadow-sm',
                    entry.type === 'COMMENT'
                      ? 'bg-secondary/40 border border-white/5'
                      : 'border-l-2 border-primary/20 pl-3 text-muted-foreground italic text-xs'
                  )}
                >
                  <p className="leading-relaxed">{entry.text}</p>
                </div>
              </div>
            </div>
          )})}
          {(!activity || activity.length === 0) && !isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground opacity-30 italic">
                <History className="h-8 w-8 mx-auto mb-2" />
                No telemetry recorded for this mission yet.
            </div>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 border-t border-white/5 pt-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-[10px] font-bold">
            {currentUserProfile.fullName
              .split(' ')
              .map(n => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
        <Input
          placeholder="Dispatch a comment..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          disabled={isLoading}
          className="rounded-xl bg-background/50 border-white/5 focus-visible:ring-primary/20 h-10 text-sm"
        />
        <Button type="submit" size="icon" disabled={isLoading || !newComment.trim()} className="rounded-xl h-10 w-10">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

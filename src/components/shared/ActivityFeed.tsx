'use client'

import { useState, useRef, useEffect } from 'react'
import type { ActivityEntry, UserProfile } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, MessageSquare, History } from 'lucide-react'
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
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'auto',
      })
    }
  }, [activity])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    onAddComment(sanitizeInput(newComment))
    setNewComment('')
  }

  const renderIcon = (type: ActivityEntry['type']) => {
    if (type === 'COMMENT') {
      return <MessageSquare className="h-4 w-4 text-muted-foreground" />
    }
    return <History className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {(activity || []).map((entry, index) => {
             return (
            <div key={index} className="flex items-start gap-3">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback>
                  {entry.actorName
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{entry.actorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div
                  className={cn(
                    'mt-1 rounded-md p-2 text-sm',
                    entry.type === 'COMMENT'
                      ? 'bg-secondary'
                      : 'border-l-2 border-border pl-3 text-muted-foreground'
                  )}
                >
                  <p>{entry.text}</p>
                </div>
              </div>
            </div>
          )})}
          {(!activity || activity.length === 0) && !isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No activity yet.
            </div>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 border-t pt-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {currentUserProfile.fullName
              .split(' ')
              .map(n => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
        <Input
          placeholder="Add a comment..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !newComment.trim()}>
          <Send />
        </Button>
      </form>
    </div>
  )
}

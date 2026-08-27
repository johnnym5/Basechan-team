"use client"

import React, { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Megaphone, Eye, Trash2, Edit2, Plus, Info, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Announcement, UserProfile } from "@/lib/types"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useFirestore, deleteDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { uiEmitter } from "@/lib/ui-emitter"
import { EditAnnouncementDialog } from "../dashboard/EditAnnouncementDialog"
import { NewAnnouncementDialog } from "../dashboard/NewAnnouncementDialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface BroadcastSystemProps {
  currentUser: UserProfile | null
  broadcasts: Announcement[]
}

/**
 * Organizational Announcements & Updates System.
 * Implements strict RBAC for creation limits, moderation, and viewership analytics.
 */
export function BroadcastSystem({ currentUser, broadcasts = [] }: BroadcastSystemProps) {
  const firestore = useFirestore()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [editingBroadcast, setEditingBroadcast] = useState<Announcement | null>(null)

  // External Trigger Listener
  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    uiEmitter.on('open-broadcast-system', handleOpen);
    return () => uiEmitter.off('open-broadcast-system', handleOpen);
  }, []);

  // Resolve Personnel Names for Read Receipts
  const usersQuery = useMemoFirebase(() =>
    firestore && currentUser?.orgId ? query(collection(firestore, 'users'), where('orgId', '==', currentUser.orgId)) : null
  , [firestore, currentUser?.orgId]);
  const { data: allPersonnel } = useCollection<UserProfile>(usersQuery);

  const isAdmin = currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'MANAGING_DIRECTOR' || currentUser?.role === 'HR_MANAGER' || currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'FINANCE_MANAGER'

  // Creation Limit Logic: Staff can only have 1 active broadcast at a time
  const myActiveBroadcasts = broadcasts.filter(b => b.authorId === currentUser?.id).length
  const canCreateNew = isAdmin || myActiveBroadcasts === 0

  const handleDelete = async (id: string) => {
    if (!firestore) return
    if (!confirm("Are you sure you want to delete this broadcast? This action cannot be undone.")) return

    try {
      await deleteDocumentNonBlocking(doc(firestore, 'announcements', id))
      toast({ title: "Announcement Deleted", description: "The message has been removed from the organizational feed." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: e.message })
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* THE TOP BAR TICKER (Trigger) */}
      <SheetTrigger asChild>
        <div className="flex items-center gap-3 shrink-0 z-20 bg-background/80 pr-6 backdrop-blur-md h-full border-r border-white/5 shadow-[20px_0_20px_-10px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-secondary/10 transition-colors group">
            <Megaphone className="h-3.5 w-3.5 text-primary group-hover:animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground">
                Announcement
            </span>
        </div>
      </SheetTrigger>

      {/* THE SIDE PANEL FEED */}
      <SheetContent side="right" className="w-full sm:max-w-md apple-glass-darker border-l border-white/10 p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-8 pb-4 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center justify-between mt-2">
            <div className="space-y-1">
                <SheetTitle className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-3">
                    <Megaphone className="w-5 h-5 text-primary" /> Company Feed
                </SheetTitle>
                <SheetDescription className="text-[9px] font-black uppercase tracking-widest opacity-40">System Announcements & Updates</SheetDescription>
            </div>

            {/* Create Button with RBAC */}
            {canCreateNew ? (
                <Button
                    size="sm"
                    onClick={() => setIsNewOpen(true)}
                    className="rounded-xl h-10 px-4 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive"
                >
                    <Plus className="w-3.5 h-3.5 mr-2" /> New Post
                </Button>
            ) : (
                <Badge variant="outline" className="h-10 px-4 rounded-xl border-white/10 text-[9px] font-black uppercase tracking-widest bg-white/5 opacity-50">
                    Slot Reached
                </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-4 pb-20">
          {broadcasts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                <Info className="h-12 w-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No announcements at this time.</p>
            </div>
          ) : (
            broadcasts.map((msg) => {
              // Item-Level RBAC Logic
              const isOwner = currentUser?.id === msg.authorId
              const canViewAnalytics = isOwner || isAdmin
              const canModerate = isOwner || isAdmin

              return (
                <Card key={msg.id} className={cn(
                    "bg-white/5 border-white/5 shadow-sm rounded-2xl overflow-hidden transition-all hover:bg-white/[0.08]",
                    msg.isPinned && "border-primary/20 ring-1 ring-primary/10"
                )}>
                  <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-black uppercase tracking-tight truncate">{msg.authorName}</CardTitle>
                        {msg.isPinned && <Badge className="bg-primary/20 text-primary text-[7px] font-black border-none px-1.5 py-0.5">PINNED</Badge>}
                      </div>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-50">
                        {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                      </p>
                    </div>

                    {/* Moderation Actions Menu */}
                    {canModerate && (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-secondary">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 apple-glass-darker border-white/5 shadow-2xl rounded-xl p-1.5 z-[1000]">
                          <DropdownMenuItem
                            onSelect={(e) => { e.preventDefault(); setEditingBroadcast(msg); }}
                            className="flex items-center px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-4 h-4 mr-3 opacity-40" /> Edit Message
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => { e.preventDefault(); handleDelete(msg.id); }}
                            className="flex items-center px-3 py-2 text-xs font-bold text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-3" /> Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardHeader>

                  <CardContent className="pb-4 px-5 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-tight text-primary leading-tight">{msg.title}</h4>
                    <p className="text-xs font-medium leading-relaxed text-foreground/80 whitespace-pre-wrap italic">
                      "{msg.content}"
                    </p>
                  </CardContent>

                  {/* Viewership Tracking (Only visible to Owner or Admin) */}
                  <CardFooter className="p-0 border-t border-white/5 bg-black/20">
                    {canViewAnalytics ? (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="receipts" className="border-none">
                          <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-white/5 transition-all group/receipt">
                             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary group-hover/receipt:text-primary">
                               <Eye className="w-3 h-3" /> {msg.viewedBy?.length || 0} Read Receipts
                             </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pb-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                             {msg.viewedBy && msg.viewedBy.length > 0 ? (
                                msg.viewedBy.map(userId => {
                                    const user = allPersonnel?.find(u => u.id === userId);
                                    return (
                                        <div key={userId} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Avatar className="h-5 w-5 rounded-md border border-white/10">
                                                    <AvatarFallback className="text-[8px] font-black">{user?.fullName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] font-bold text-muted-foreground truncate">{user?.fullName || "User"}</span>
                                            </div>
                                            <span className="text-[8px] font-black uppercase opacity-30">Viewed</span>
                                        </div>
                                    )
                                })
                             ) : (
                                <p className="text-[8px] font-black uppercase opacity-20 text-center py-2">No views recorded yet</p>
                             )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ) : (
                      <div className="px-5 py-3 flex justify-between items-center w-full">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-30 italic">Analytics Restricted</span>
                        {isOwner && <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Author</span>}
                      </div>
                    )}
                  </CardFooter>
                </Card>
              )
            })
          )}
        </div>

        {/* DIALOG PORTALS */}
        {currentUser && (
            <NewAnnouncementDialog
                open={isNewOpen}
                onOpenChange={setIsNewOpen}
                userProfile={currentUser}
            />
        )}
        {currentUser && editingBroadcast && (
            <EditAnnouncementDialog
                open={!!editingBroadcast}
                onOpenChange={(open) => !open && setEditingBroadcast(null)}
                announcement={editingBroadcast}
                userProfile={currentUser}
            />
        )}
      </SheetContent>
    </Sheet>
  )
}


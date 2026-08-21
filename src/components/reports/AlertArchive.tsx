"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFirestore, useUser } from "@/firebase"
import { collection, query, where, orderBy, getDocs, writeBatch } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2, Clock, Loader2, User, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { format, subDays } from "date-fns"
import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function AlertArchive() {
  const firestore = useFirestore()
  const { user } = useUser()
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // 1. Fetch History Query
  const { data: archivedAlerts = [], isLoading } = useQuery({
    queryKey: ['acknowledgedAlertsHistory', user?.uid],
    queryFn: async () => {
      if (!firestore || !user?.uid) return []
      const q = query(
        collection(firestore, 'acknowledged_alerts'),
        orderBy('acknowledgedAt', 'desc')
      )
      const snap = await getDocs(q)
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        acknowledgedAt: doc.data().acknowledgedAt?.toDate()
      }))
    },
    enabled: !!firestore && !!user?.uid
  })

  // 2. Destructive Cleanup Mutation
  const { mutate: clearOldRecords, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!firestore) return
      const cutoffDate = subDays(new Date(), 30)
      const q = query(
        collection(firestore, 'acknowledged_alerts'),
        where('acknowledgedAt', '<', cutoffDate)
      )
      const snap = await getDocs(q)
      const batch = writeBatch(firestore)
      snap.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgedAlertsHistory'] })
      setIsDeleteDialogOpen(false)
    }
  })

  // 3. Pagination Logic
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5
  const totalPages = Math.max(1, Math.ceil(archivedAlerts.length / ITEMS_PER_PAGE))
  const paginatedAlerts = archivedAlerts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="archive" className="border-none">
        <Card className="apple-glass border-none shadow-2xl flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4 bg-white/5 shrink-0 px-8 pt-6 flex flex-row items-center justify-between">
            <AccordionTrigger className="hover:no-underline p-0 flex-1 flex flex-row justify-start gap-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Acknowledged Alerts Archive
              </CardTitle>
              {archivedAlerts.length > 0 && <Badge variant="outline" className="text-[8px] font-black opacity-40">{archivedAlerts.length} RECORDS</Badge>}
            </AccordionTrigger>

            {/* CLEANUP PORTAL */}
            <div className="flex items-center gap-4">
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 rounded-xl border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest">
                    <Trash2 className="w-3 h-3 mr-2" /> Clear {">"} 30 Days
                    </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[400px] apple-glass-darker border-none rounded-[2rem] p-8 shadow-3xl">
                    <DialogHeader>
                    <DialogTitle className="text-rose-500 flex items-center gap-2 font-black uppercase tracking-tighter">
                        <AlertTriangle className="w-5 h-5" /> Purge Old Records
                    </DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                        This will permanently delete all acknowledged alerts older than 30 days. This action cannot be reversed.
                    </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-8 flex gap-3">
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting} className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest border-white/10">Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={() => clearOldRecords()}
                        disabled={isDeleting}
                        className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-500/20"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirm Purge"}
                    </Button>
                    </DialogFooter>
                </DialogContent>
                </Dialog>
            </div>
          </CardHeader>

          <AccordionContent className="p-0 border-t border-white/5">
            <CardContent className="p-0 flex-1 bg-black/10 overflow-hidden">
                {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-20 h-full">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Retrieving archives...</p>
                </div>
                ) : archivedAlerts.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-20 h-full">
                    <AlertTriangle className="w-10 h-10 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">No acknowledged alerts on record.</p>
                </div>
                ) : (
                <div className="divide-y divide-white/5">
                    {paginatedAlerts.map((log: any) => (
                    <div key={log.id} className="p-6 flex items-start justify-between hover:bg-white/5 transition-all group">
                        <div className="flex items-start gap-4">
                        <div className="p-2 bg-white/5 rounded-xl mt-0.5 group-hover:bg-primary/10 transition-colors">
                            <AlertTriangle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase tracking-tight text-white">{log.title}</p>
                            <p className="text-xs font-medium text-muted-foreground mt-1 leading-relaxed italic">"{log.text}"</p>
                        </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3 text-primary" />
                            {log.acknowledgedAt ? format(log.acknowledgedAt, 'MMM dd, HH:mm') : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                            <User className="w-3 h-3 text-primary" />
                            Admin ID: {log.acknowledgedBy?.slice(0, 8)}
                        </span>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </CardContent>

            {/* PAGINATION FOOTER */}
            {archivedAlerts.length > 0 && (
                <CardFooter className="border-t border-white/5 p-4 flex justify-between items-center bg-white/5 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); }}
                    disabled={currentPage === 1}
                    className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-primary/10 hover:text-primary transition-all gap-2"
                >
                    <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Page {currentPage} of {totalPages}
                    </span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">
                        {archivedAlerts.length} Records Total
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                    disabled={currentPage === totalPages}
                    className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-primary/10 hover:text-primary transition-all gap-2"
                >
                    Next <ChevronRight className="w-4 h-4" />
                </Button>
                </CardFooter>
            )}
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  )
}

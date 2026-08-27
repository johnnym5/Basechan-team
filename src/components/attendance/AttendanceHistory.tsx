'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { Attendance, UserProfile } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { format, differenceInSeconds } from 'date-fns';
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/formatters";

import { useState } from "react";
import { Download, History, ArrowRight, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface AttendanceHistoryProps {
  userProfile: UserProfile | null;
}

const ITEMS_PER_PAGE = 5;

export function AttendanceHistory({ userProfile }: AttendanceHistoryProps) {
  const firestore = useFirestore();
  const [currentPage, setCurrentPage] = useState(1);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.id || !userProfile?.orgId) return null;
    return query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId),
      where('userId', '==', userProfile.id),
      orderBy('date', 'desc'),
      limit(50) // Fetch more for client-side pagination
    );
  }, [firestore, userProfile?.id, userProfile?.orgId]);

  const { data: records, isLoading } = useCollection<Attendance>(attendanceQuery);

  const totalPages = Math.ceil((records?.length || 0) / ITEMS_PER_PAGE);
  const paginatedRecords = records?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Card className="border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
      <CardHeader className="bg-white/5 border-b border-white/5 pb-4 shrink-0 px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Attendance History
            </CardTitle>
            <CardDescription className="text-[9px] font-black uppercase tracking-widest opacity-60">Chronological Shift Records</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-xl text-[8px] font-black uppercase tracking-widest border-white/5 bg-white/5 hover:bg-white/10">
            <Download className="mr-2 h-3.5 w-3.5" /> Export Month
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-[1.5rem]" />
              ))
            ) : paginatedRecords?.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2rem] bg-secondary/5">
                <p className="text-muted-foreground uppercase font-black text-[9px] tracking-widest opacity-30">No history available for this cycle</p>
              </div>
            ) : (
              paginatedRecords?.map(record => (
                <div key={record.id} className="p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-sm text-primary shadow-inner">
                      {format(new Date(record.date + 'T00:00:00'), 'dd')}
                    </div>
                    <div>
                       <p className="font-black text-sm text-white">{format(new Date(record.date + 'T00:00:00'), 'MMMM do, yyyy')}</p>
                       <div className="flex flex-wrap items-center gap-2 mt-1.5">
                         <Badge variant="outline" className={cn(
                             "text-[8px] font-black uppercase px-2 py-0 border-none",
                             record.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                         )}>
                             {record.status}
                         </Badge>
                         <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 flex items-center gap-1">
                             <Clock className="h-2.5 w-2.5" /> {record.location}
                         </span>
                         {record.location === 'OFFICE' ? (
                           <span className="text-[9px] font-black flex items-center gap-1 text-emerald-500">
                             <MapPin className="h-2.5 w-2.5" />
                             {record.branchName || record.branchLocation ? `Working from ${record.branchName || record.branchLocation}` : 'Office'}
                           </span>
                         ) : (
                           <span className="text-[9px] font-black flex items-center gap-1 text-orange-400">
                             <MapPin className="h-2.5 w-2.5" /> Remote / Off-Site
                           </span>
                         )}
                       </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block font-mono">
                      <div className="flex items-center gap-2 justify-end text-[11px] font-black">
                        <span className="text-emerald-400">IN: {format(new Date(record.clockIn), 'HH:mm')}</span>
                        <span className="text-muted-foreground opacity-20">|</span>
                        <span className={cn(record.clockOut ? "text-rose-400" : "text-primary animate-pulse")}>
                            OUT: {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : 'ACTIVE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1.5">
                        {record.lateReason && <Badge variant="outline" className="h-4 text-[7px] bg-amber-500/10 text-amber-500 border-none font-black px-1.5 uppercase tracking-tighter">Lateness Case</Badge>}
                        {record.eodReport && <Badge variant="outline" className="h-4 text-[7px] bg-primary/10 text-primary border-none font-black px-1.5 uppercase tracking-tighter">Report Filed</Badge>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 font-black text-[9px] uppercase tracking-widest px-4 transition-all opacity-0 group-hover:opacity-100">
                      Force Close
                    </Button>
                  </div>
                </div>
              ))
            )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="p-4 px-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                    Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-white/5 border-white/5 hover:bg-white/10"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-white/5 border-white/5 hover:bg-white/10"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

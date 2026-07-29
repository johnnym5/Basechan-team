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

import { Download, History, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface AttendanceHistoryProps {
  userProfile: UserProfile | null;
}

export function AttendanceHistory({ userProfile }: AttendanceHistoryProps) {
  const firestore = useFirestore();

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.id || !userProfile?.orgId) return null;
    return query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId),
      where('userId', '==', userProfile.id),
      orderBy('date', 'desc'),
      limit(20)
    );
  }, [firestore, userProfile?.id, userProfile?.orgId]);

  const { data: records, isLoading } = useCollection<Attendance>(attendanceQuery);

  return (
    <Card className="m3-surface-low border-none shadow-xl overflow-hidden rounded-[2.5rem] flex flex-col h-full">
      <CardHeader className="bg-white/5 border-b border-white/5 pb-4 px-6 pt-6 shrink-0">
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
      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-[1.5rem]" />
              ))
            ) : records?.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2rem] bg-secondary/5">
                <p className="text-muted-foreground uppercase font-black text-[9px] tracking-widest opacity-30">No history available for this cycle</p>
              </div>
            ) : (
              records?.map(record => (
                <div key={record.id} className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-xs text-primary">
                      {format(new Date(record.date), 'dd')}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">Attendance for {format(new Date(record.date), 'MMMM do, yyyy')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Showing active and completed rosters for this date.</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-xs font-black text-emerald-400 font-mono">{format(new Date(record.clockIn), 'h:mm a')}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-black text-primary font-mono">{record.status}</span>
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mt-0.5">{record.location}</div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 font-black text-[9px] uppercase tracking-widest">
                      Force Close
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

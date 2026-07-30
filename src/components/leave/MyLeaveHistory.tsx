'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { LeaveRequest, UserProfile } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { format } from 'date-fns';
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface MyLeaveHistoryProps {
  userProfile: UserProfile;
}

export function MyLeaveHistory({ userProfile }: MyLeaveHistoryProps) {
  const firestore = useFirestore();

  const leaveQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.orgId) return null;
    return query(
      collection(firestore, 'leave_requests'),
      where('orgId', '==', userProfile.orgId),
      where('userId', '==', userProfile.id),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, userProfile]);

  const { data: leaveHistory, isLoading } = useCollection<LeaveRequest>(leaveQuery);
  
  const statusStyles: Record<LeaveRequest['status'], string> = {
    PENDING: "bg-amber-500/20 text-amber-500 border border-amber-500/30",
    APPROVED: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    REJECTED: "bg-rose-500/20 text-rose-500 border border-rose-500/30",
  };

  return (
    <Card className="border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase">My Leave History</CardTitle>
        <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">A log of your recent leave requests.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5">
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Start Date</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">End Date</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Reason</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && leaveHistory?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                      You haven't requested any leave yet.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && leaveHistory?.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-medium capitalize">{record.leaveType.toLowerCase()}</TableCell>
                <TableCell>{format(new Date(record.startDate), 'PPP')}</TableCell>
                <TableCell>{format(new Date(record.endDate), 'PPP')}</TableCell>
                <TableCell className="max-w-xs truncate">{record.reason}</TableCell>
                <TableCell className="text-right">
                    <Badge variant="outline" className={cn("font-medium", statusStyles[record.status])}>
                        {record.status}
                    </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

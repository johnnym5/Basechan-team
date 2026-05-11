'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { Attendance, UserProfile, Notification } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { format } from 'date-fns';
import { Button } from "../ui/button";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";

interface PendingApprovalsProps {
  userProfile: UserProfile;
}

export function PendingApprovals({ userProfile }: PendingApprovalsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const pendingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId),
      where('status', '==', 'PENDING')
    );
  }, [firestore, userProfile.orgId]);

  const { data: pendingRecords, isLoading } = useCollection<Attendance>(pendingQuery);

  const handleDecision = (record: Attendance, decision: 'APPROVED' | 'REJECTED') => {
    if (!firestore) return;
    const attendanceRef = doc(firestore, 'attendance', record.id);
    const now = new Date().toISOString();
    
    const approvalData = {
        status: decision,
        approvedBy: userProfile.id,
        approvedAt: now,
    };

    updateDocumentNonBlocking(attendanceRef, approvalData);

    if (decision === 'APPROVED') {
        const userRef = doc(firestore, 'users', record.userId);
        updateDocumentNonBlocking(userRef, { status: 'ONLINE', lastSeen: now });
    }

    // Workflow Notification
    const notification: Omit<Notification, 'id'> = {
        orgId: userProfile.orgId,
        userId: record.userId,
        title: `Shift Start ${decision === 'APPROVED' ? 'Verified' : 'Declined'}`,
        description: `Your clock-in for ${format(new Date(record.clockIn), 'PP')} has been ${decision.toLowerCase()}.`,
        href: '/?panel=attendance',
        isRead: false,
        createdAt: now,
    };
    addDocumentNonBlocking(collection(firestore, 'notifications'), notification);

    toast({
        title: `Clock-in ${decision.toLowerCase()}`,
        description: `The request for ${record.userName} has been updated.`
    });
  };

  return (
    <Card className="apple-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle>Pending Clock-In Approvals</CardTitle>
        <CardDescription>Review and approve or reject clock-in requests from staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-white/5">
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Staff Member</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Clock-In Time</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Location</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i} className="border-white/5">
                <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && pendingRecords?.length === 0 && (
              <TableRow className="border-none">
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic text-xs uppercase tracking-widest">
                      Zero pending shift verifications.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && pendingRecords?.map(record => (
              <TableRow key={record.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="font-bold text-sm">{record.userName}</TableCell>
                <TableCell className="text-xs font-mono">{format(new Date(record.clockIn), 'PPP, p')}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-[10px] font-black tracking-widest">{record.location?.toLowerCase()}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive rounded-lg hover:bg-destructive/10" onClick={() => handleDecision(record, 'REJECTED')}>
                        <X className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500/80 hover:text-emerald-500 rounded-lg hover:bg-emerald-500/10" onClick={() => handleDecision(record, 'APPROVED')}>
                        <Check className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { Attendance, UserProfile } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
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
    const attendanceRef = doc(firestore, 'attendance', record.id);
    
    const approvalData = {
        status: decision,
        approvedBy: userProfile.id,
        approvedAt: new Date().toISOString(),
    };

    updateDocumentNonBlocking(attendanceRef, approvalData);

    if (decision === 'APPROVED') {
        const userRef = doc(firestore, 'users', record.userId);
        updateDocumentNonBlocking(userRef, { status: 'ONLINE', lastSeen: new Date().toISOString() });
    }

    toast({
        title: `Clock-in ${decision.toLowerCase()}`,
        description: `The request for ${record.userName} has been updated.`
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Clock-In Approvals</CardTitle>
        <CardDescription>Review and approve or reject clock-in requests from staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Clock-In Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && pendingRecords?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                      No pending approvals.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && pendingRecords?.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.userName}</TableCell>
                <TableCell>{format(new Date(record.clockIn), 'PPP, p')}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">{record.location?.toLowerCase()}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive" onClick={() => handleDecision(record, 'REJECTED')}>
                        <X className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-emerald-500/80 hover:text-emerald-500" onClick={() => handleDecision(record, 'APPROVED')}>
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

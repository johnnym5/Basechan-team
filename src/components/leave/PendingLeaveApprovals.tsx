<<<<<<< HEAD
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { LeaveRequest, UserProfile, Notification } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { format } from 'date-fns';
import { Button } from "../ui/button";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";

interface PendingLeaveApprovalsProps {
  userProfile: UserProfile;
}

export function PendingLeaveApprovals({ userProfile }: PendingLeaveApprovalsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const pendingQuery = useMemoFirebase(() => {
    return query(
      collection(firestore, 'leave_requests'),
      where('orgId', '==', userProfile.orgId),
      where('status', '==', 'PENDING')
    );
  }, [firestore, userProfile.orgId]);

  const { data: pendingRecords, isLoading } = useCollection<LeaveRequest>(pendingQuery);

  const handleDecision = (record: LeaveRequest, decision: 'APPROVED' | 'REJECTED') => {
    if (!firestore) return;
    const leaveRef = doc(firestore, 'leave_requests', record.id);
    
    const approvalData = {
        status: decision,
        approvedBy: userProfile.id,
        approvedAt: new Date().toISOString(),
    };

    updateDocumentNonBlocking(leaveRef, approvalData);

    const notification: Omit<Notification, 'id'> = {
        orgId: userProfile.orgId,
        userId: record.userId,
        title: `Leave Request ${decision.charAt(0) + decision.slice(1).toLowerCase()}`,
        description: `Your request for ${record.leaveType.toLowerCase()} leave for ${format(new Date(record.startDate), 'PP')} to ${format(new Date(record.endDate), 'PP')} has been ${decision.toLowerCase()}.`,
        href: `/`, // Points to dashboard for now, user can open leave dialog from there
        isRead: false,
        createdAt: new Date().toISOString(),
    };
    addDocumentNonBlocking(collection(firestore, 'notifications'), notification);

    toast({
        title: `Leave Request ${decision.toLowerCase()}`,
        description: `The request for ${record.userName} has been updated.`
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Leave Approvals</CardTitle>
        <CardDescription>Review and approve or reject leave requests from staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && pendingRecords?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                      No pending approvals.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && pendingRecords?.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.userName}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{record.leaveType.toLowerCase()}</Badge></TableCell>
                <TableCell>{format(new Date(record.startDate), 'PP')} - {format(new Date(record.endDate), 'PP')}</TableCell>
                <TableCell className="max-w-xs truncate">{record.reason}</TableCell>
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
=======
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { LeaveRequest, UserProfile, Notification } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { format } from 'date-fns';
import { Button } from "../ui/button";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";

interface PendingLeaveApprovalsProps {
  userProfile: UserProfile;
}

export function PendingLeaveApprovals({ userProfile }: PendingLeaveApprovalsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const pendingQuery = useMemoFirebase(() => {
    return query(
      collection(firestore, 'leave_requests'),
      where('orgId', '==', userProfile.orgId),
      where('status', '==', 'PENDING')
    );
  }, [firestore, userProfile.orgId]);

  const { data: pendingRecords, isLoading } = useCollection<LeaveRequest>(pendingQuery);

  const handleDecision = (record: LeaveRequest, decision: 'APPROVED' | 'REJECTED') => {
    if (!firestore) return;
    const leaveRef = doc(firestore, 'leave_requests', record.id);
    
    const approvalData = {
        status: decision,
        approvedBy: userProfile.id,
        approvedAt: new Date().toISOString(),
    };

    updateDocumentNonBlocking(leaveRef, approvalData);

    const notification: Omit<Notification, 'id'> = {
        orgId: userProfile.orgId,
        userId: record.userId,
        title: `Leave Request ${decision.charAt(0) + decision.slice(1).toLowerCase()}`,
        description: `Your request for ${record.leaveType.toLowerCase()} leave for ${format(new Date(record.startDate), 'PP')} to ${format(new Date(record.endDate), 'PP')} has been ${decision.toLowerCase()}.`,
        href: `/`, // Points to dashboard for now, user can open leave dialog from there
        isRead: false,
        createdAt: new Date().toISOString(),
    };
    addDocumentNonBlocking(collection(firestore, 'notifications'), notification);

    toast({
        title: `Leave Request ${decision.toLowerCase()}`,
        description: `The request for ${record.userName} has been updated.`
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Leave Approvals</CardTitle>
        <CardDescription>Review and approve or reject leave requests from staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && pendingRecords?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                      No pending approvals.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && pendingRecords?.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.userName}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{record.leaveType.toLowerCase()}</Badge></TableCell>
                <TableCell>{format(new Date(record.startDate), 'PP')} - {format(new Date(record.endDate), 'PP')}</TableCell>
                <TableCell className="max-w-xs truncate">{record.reason}</TableCell>
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
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a

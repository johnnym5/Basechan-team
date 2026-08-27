'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { Attendance, UserProfile, Notification } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { format } from 'date-fns';
import { Button } from "../ui/button";
import { Check, X, MonitorPlay, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { uiEmitter } from "@/lib/ui-emitter";

interface PendingApprovalsProps {
  userProfile: UserProfile;
}

interface PendingApprovalsProps {
  userProfile: UserProfile;
  variant?: 'full' | 'compact';
}

export function PendingApprovals({ userProfile, variant = 'full' }: PendingApprovalsProps) {
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
        
        toast({
            title: `Clock-in Approved`,
            description: `${record.userName} is now online.`,
            action: (
                <Button size="sm" variant="outline" className="h-7 rounded-lg text-[8px] font-black uppercase" onClick={() => uiEmitter.emit('open-live-monitor-dialog', { targetUserId: record.userId, targetUserName: record.userName })}>
                    View Monitor
                </Button>
            )
        });
    } else {
        toast({
            title: `Clock-in rejected`,
            description: `The request for ${record.userName} has been updated.`
        });
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
  };

  if (variant === 'compact') {
      return (
          <div className="space-y-3">
              {isLoading ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
              ) : !pendingRecords || pendingRecords.length === 0 ? (
                  <div className="text-center p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-dashed border-white/10 rounded-xl opacity-30">
                      No pending approvals.
                  </div>
              ) : (
                  pendingRecords.map(req => (
                      <div key={req.id} className="p-4 border border-white/5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all space-y-3">
                          <div className="flex items-center justify-between">
                              <div>
                                  <p className="font-bold text-xs text-white">{req.userName}</p>
                                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-tighter mt-0.5">
                                      {format(new Date(req.clockIn), 'HH:mm')} • {req.location}
                                  </p>
                                  {req.location === 'OFFICE' ? (
                                      <span className="text-[8px] font-black flex items-center gap-1 mt-0.5 text-emerald-500">
                                          <MapPin className="h-2.5 w-2.5" />
                                          {req.branchName || req.branchLocation
                                              ? `Working from ${req.branchName || req.branchLocation}`
                                              : 'Office'}
                                      </span>
                                  ) : (
                                      <span className="text-[8px] font-black flex items-center gap-1 mt-0.5 text-orange-400">
                                          <MapPin className="h-2.5 w-2.5" /> Remote / Off-Site
                                      </span>
                                  )}
                              </div>
                              <Badge variant="outline" className="text-[8px] font-black border-amber-500/20 text-amber-500 bg-amber-500/5 uppercase">Pending</Badge>
                          </div>
                          <div className="flex gap-2">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white text-[9px] font-black uppercase tracking-widest"
                                  onClick={() => handleDecision(req, 'APPROVED')}
                              >
                                  Approve
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1 h-8 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-[9px] font-black uppercase tracking-widest"
                                  onClick={() => handleDecision(req, 'REJECTED')}
                              >
                                  Deny
                              </Button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      );
  }

  return (
    <Card className="border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase">Pending Clock-In Approvals</CardTitle>
        <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Review and verify staff clock-in requests.</CardDescription>
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
                      No pending clock-in approvals.
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

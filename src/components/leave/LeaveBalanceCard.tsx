'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import type { UserProfile, LeaveRequest } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { differenceInBusinessDays, startOfYear, endOfYear } from 'date-fns';
import { useMemo, useState } from 'react';
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "../ui/button";
import { Settings2, Plus, Minus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { leaveService } from "@/services/leave-service";
import { useToast } from "@/hooks/use-toast";

// Default entitlements if not set in profile
const DEFAULT_ANNUAL_LEAVE = 20;
const DEFAULT_SICK_LEAVE = 15;

interface LeaveBalanceCardProps {
  userProfile: UserProfile;
}

export function LeaveBalanceCard({ userProfile }: LeaveBalanceCardProps) {
  const firestore = useFirestore();
  const permissions = usePermissions(userProfile);
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'ANNUAL' | 'SICK'>('ANNUAL');
  const [adjustmentAmount, setAdjustmentAmount] = useState('1');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = permissions.canManageStaff;

  const entitlements = {
    ANNUAL: userProfile.leaveEntitlements?.ANNUAL ?? DEFAULT_ANNUAL_LEAVE,
    SICK: userProfile.leaveEntitlements?.SICK ?? DEFAULT_SICK_LEAVE
  };

  const leaveQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const yearStart = startOfYear(new Date());
    
    return query(
      collection(firestore, 'leave_requests'),
      where('userId', '==', userProfile.id),
      where('status', '==', 'APPROVED'),
      where('startDate', '>=', yearStart.toISOString()),
    );
  }, [firestore, userProfile.id]);

  const { data: approvedLeave, isLoading } = useCollection<LeaveRequest>(leaveQuery);
  
  const balances = useMemo(() => {
    const used = {
        ANNUAL: 0,
        SICK: 0,
        UNPAID: 0,
        MATERNITY: 0,
        PATERNITY: 0,
    };

    if (approvedLeave) {
        const yearStart = startOfYear(new Date());
        const yearEnd = endOfYear(new Date());
        
        approvedLeave.forEach(req => {
            const startDate = new Date(req.startDate);
            const endDate = new Date(req.endDate);

            // Only count days within the current year for requests that span years
            const relevantStartDate = startDate < yearStart ? yearStart : startDate;
            const relevantEndDate = endDate > yearEnd ? yearEnd : endDate;
            
            if (relevantEndDate < relevantStartDate) return;

            const days = differenceInBusinessDays(relevantEndDate, relevantStartDate) + 1;
            
            if (used[req.leaveType] !== undefined) {
                used[req.leaveType] += days;
            }
        });
    }

    return {
        annual: entitlements.ANNUAL - used.ANNUAL,
        sick: entitlements.SICK - used.SICK,
        unpaid: used.UNPAID,
    }
  }, [approvedLeave, entitlements]);

  const totalBalance = balances.annual + balances.sick;

  const handleAdjustBalance = async () => {
      if (!firestore || !userProfile) return;
      setIsSubmitting(true);
      try {
          await leaveService.adjustLeaveBalance(
              firestore,
              userProfile, // Acting as admin
              userProfile.id, // Targeting self for this demo, but should work for any targetUserId
              adjustmentType,
              parseInt(adjustmentAmount),
              adjustmentReason
          );
          toast({ title: "Balance Adjusted", description: "The leave entitlement has been updated." });
          setIsAdjusting(false);
          setAdjustmentReason('');
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Adjustment Failed", description: e.message });
      } finally {
          setIsSubmitting(false);
      }
  };

  if (isLoading) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>My Leave Balance</CardTitle>
                <CardDescription>Your available days for the current year.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </CardContent>
        </Card>
      )
  }

  return (
    <>
    <Card className="border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between space-y-0">
        <div>
            <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase">My Leave Balance</CardTitle>
            <CardDescription className="text-[9px] font-black uppercase tracking-widest opacity-60">Your available days for {currentYear}.</CardDescription>
        </div>
        {isAdmin && (
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdjusting(true)}
                className="h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white border border-transparent hover:border-primary/20 transition-all font-black text-[9px] uppercase tracking-widest px-3"
            >
                <Settings2 className="mr-2 h-3.5 w-3.5" /> Adjust Balance
            </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-secondary/30 border border-white/5 rounded-xl">
                <p className="text-3xl font-black font-headline text-primary">{balances.annual}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Annual</p>
            </div>
            <div className="p-4 bg-secondary/30 border border-white/5 rounded-xl">
                <p className="text-3xl font-black font-headline text-emerald-500">{balances.sick}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Sick</p>
            </div>
            <div className="p-4 bg-secondary/30 border border-white/5 rounded-xl">
                <p className="text-3xl font-black font-headline text-rose-500">{balances.unpaid}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Unpaid</p>
            </div>
             <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                <p className="text-3xl font-black font-headline text-primary">{totalBalance}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">Total Paid</p>
            </div>
        </div>
      </CardContent>
    </Card>

    <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
        <DialogContent className="apple-glass-darker border-none sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Adjust Leave Entitlements</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Manually override allocated leave days for this unit.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Leave Type</p>
                    <Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
                        <SelectTrigger className="bg-black/20 border-white/5 rounded-xl font-black uppercase text-[10px] tracking-widest">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="apple-glass-darker border-none">
                            <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                            <SelectItem value="SICK">Sick Leave</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Days Adjustment (+/-)</p>
                    <Input
                        type="number"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                        className="bg-black/20 border-white/5 rounded-xl font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Internal Memo / Reason</p>
                    <Input
                        placeholder="State reason for manual adjustment..."
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        className="bg-black/20 border-white/5 rounded-xl text-xs"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button
                    onClick={handleAdjustBalance}
                    disabled={isSubmitting || !adjustmentReason.trim()}
                    className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize Adjustment"}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

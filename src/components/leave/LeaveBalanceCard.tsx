'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import type { UserProfile, LeaveRequest } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { differenceInBusinessDays, startOfYear, endOfYear } from 'date-fns';
import { useMemo } from 'react';

// Let's assume these are company-wide policies for now.
// A future enhancement would be to store these in SystemConfig.
const ANNUAL_LEAVE_ENTITLEMENT = 20;
const SICK_LEAVE_ENTITLEMENT = 15;

interface LeaveBalanceCardProps {
  userProfile: UserProfile;
}

export function LeaveBalanceCard({ userProfile }: LeaveBalanceCardProps) {
  const firestore = useFirestore();
  const currentYear = new Date().getFullYear();

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
        annual: ANNUAL_LEAVE_ENTITLEMENT - used.ANNUAL,
        sick: SICK_LEAVE_ENTITLEMENT - used.SICK,
        unpaid: used.UNPAID,
    }
  }, [approvedLeave]);

  const totalBalance = balances.annual + balances.sick;

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
    <Card className="border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase">My Leave Balance</CardTitle>
        <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Your available days for {currentYear}.</CardDescription>
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
  );
}

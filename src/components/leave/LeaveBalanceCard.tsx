<<<<<<< HEAD
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
    <Card>
      <CardHeader>
        <CardTitle>My Leave Balance</CardTitle>
        <CardDescription>Your available days for {currentYear}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">{balances.annual}</p>
                <p className="text-sm text-muted-foreground">Annual</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">{balances.sick}</p>
                <p className="text-sm text-muted-foreground">Sick</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">{balances.unpaid}</p>
                <p className="text-sm text-muted-foreground">Unpaid</p>
            </div>
             <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">{totalBalance}</p>
                <p className="text-sm text-muted-foreground">Total Paid</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
=======
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
    <Card>
      <CardHeader>
        <CardTitle>My Leave Balance</CardTitle>
        <CardDescription>Your available days for {currentYear}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">{balances.annual}</p>
                <p className="text-sm text-muted-foreground">Annual</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">{balances.sick}</p>
                <p className="text-sm text-muted-foreground">Sick</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">{balances.unpaid}</p>
                <p className="text-sm text-muted-foreground">Unpaid</p>
            </div>
             <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">{totalBalance}</p>
                <p className="text-sm text-muted-foreground">Total Paid</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a

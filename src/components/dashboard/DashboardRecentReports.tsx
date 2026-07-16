'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import type { UserProfile, DailyReport } from "@/lib/types";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { uiEmitter } from "@/lib/ui-emitter";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { ORG_ID } from "@/lib/config";

export function DashboardRecentReports() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        authUser ? doc(firestore, "users", authUser.uid) : null,
        [firestore, authUser]
    );
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const orgId = userProfile?.orgId || ORG_ID;

    const reportsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.orgId) return null;
        return query(
            collection(firestore, 'daily_reports'),
            where('orgId', '==', userProfile.orgId),
            orderBy('createdAt', 'desc'),
            limit(4)
        );
    }, [firestore, userProfile?.orgId]);

    const { data: reports, isLoading } = useCollection<DailyReport>(reportsQuery);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daily Reports</CardTitle>
                <Button variant="link" size="sm" className="text-primary" onClick={() => uiEmitter.emit('open-reports-dialog')}>View All</Button>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                )}
                {!isLoading && (!reports || reports.length === 0) && (
                    <p className="text-sm text-center text-muted-foreground py-8">No reports submitted yet.</p>
                )}
                {!isLoading && reports && (
                    <div className="space-y-4">
                        {reports.map(report => (
                            <div key={report.id} className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>{report.userName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{report.userName}</p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</p>
                                </div>
                                <p className="text-sm text-muted-foreground truncate max-w-[120px]">{report.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}